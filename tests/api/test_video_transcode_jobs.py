"""Mounted transcode admission and bounded center-scoped observation."""

from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

import pytest
from django.contrib.auth.models import Group, User
from django.core.files.base import ContentFile
from django.utils import timezone
from endoreg_db.models import Center, PortalUserInfo, VideoFile
from endoreg_db.utils.encryption.encrypted import EncryptedStorage
from rest_framework.test import APIClient

from lx_annotate.models import VideoTranscodeJob

pytestmark = pytest.mark.django_db
LIST_URL = "/api/media/videos/transcode-jobs/"


@pytest.fixture
def operator(tmp_path, master_key, monkeypatch):
    user = User.objects.create_user(username="transcode-api-operator")
    user.groups.add(Group.objects.get_or_create(name="data:write")[0])
    center = Center.objects.create(name="Transcode API center")
    PortalUserInfo.objects.get_or_create(user=user)[0].centers.add(center)
    storage = EncryptedStorage(location=str(tmp_path))
    monkeypatch.setattr(VideoFile._meta.get_field("processed_file"), "storage", storage)
    video = VideoFile.objects.create(
        center=center,
        video_hash="api-transcode-source",
        processed_video_hash="a" * 64,
        original_file_name="processed.mp4",
    )
    video.processed_file.save(
        "processed.mp4", ContentFile(b"encrypted processed source")
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user, video


def url(video):
    return f"/api/media/videos/{video.pk}/transcode-jobs/"


def payload(**overrides):
    return {"option": "replace_processed", "idempotency_key": str(uuid4())} | overrides


def test_runtime_rejects_backend_with_copy_mode_default(monkeypatch):
    from endoreg_db.services import video_processed_transcode

    from lx_annotate.services.video_transcode_jobs import (
        TranscodeSubmissionError,
        transcode_runtime,
    )

    def old_backend(
        video,
        *,
        mode="playback_copy",
        transcode_claim=None,
        expected_processed_name=None,
        expected_processed_hash=None,
        progress_callback=None,
    ):
        pytest.fail("An incompatible encoder must never be called")

    monkeypatch.setattr(
        video_processed_transcode,
        "transcode_processed_video_for_storage_pressure",
        old_backend,
    )
    with pytest.raises(TranscodeSubmissionError) as error:
        transcode_runtime()
    assert error.value.code == "transcode_dependency_unavailable"
    assert error.value.status == 503


@pytest.mark.parametrize("option", ["replace_processed"])
def test_post_persists_option_and_replays_one_job(operator, option):
    client, user, video = operator
    body = payload(option=option)
    first = client.post(url(video), body, format="json")
    assert first.status_code == 202
    replay = client.post(url(video), body, format="json")
    assert replay.status_code == 200
    assert first.json()["job"]["id"] == replay.json()["job"]["id"]
    assert first.json()["created"] is True and replay.json()["created"] is False
    job = VideoTranscodeJob.objects.get()
    assert job.option == option
    assert job.actor.pk == user.pk and job.video.pk == video.pk
    assert job.status == "queued" and job.stage == "queued"
    assert job.before_bytes is None and job.after_bytes is None


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"option": "playback_copy"},
        {"idempotency_key": str(uuid4())},
        payload(option="raw"),
        payload(option="playback_copy"),
        payload(option=1),
        payload(option=True),
        payload(idempotency_key="invalid"),
        payload(actor_id=1),
        payload(force=True),
        payload(quality_mode="unbounded"),
        [],
        None,
    ],
)
def test_strict_submission_rejects_unknown_or_invalid_fields(operator, body):
    client, _, video = operator
    response = client.post(url(video), body, format="json")
    assert response.status_code == 400
    assert not VideoTranscodeJob.objects.exists()


def test_retired_option_rejected_without_mutating_existing_job(operator):
    client, _, video = operator
    body = payload()
    assert client.post(url(video), body, format="json").status_code == 202
    job = VideoTranscodeJob.objects.get()
    updated_at = job.updated_at
    response = client.post(
        url(video), body | {"option": "playback_copy"}, format="json"
    )
    assert response.status_code == 400
    job.refresh_from_db()
    assert job.option == "replace_processed" and job.status == "queued"
    assert job.updated_at == updated_at
    assert VideoTranscodeJob.objects.count() == 1


def test_distinct_request_cannot_overlap_active_job(operator):
    client, _, video = operator
    assert client.post(url(video), payload(), format="json").status_code == 202
    response = client.post(
        url(video), payload(option="replace_processed"), format="json"
    )
    assert response.status_code == 409
    assert response.json()["code"] == "transcode_already_active"
    assert VideoTranscodeJob.objects.count() == 1


def test_post_requires_authentication_and_write_capability(operator):
    client, user, video = operator
    anonymous = APIClient()
    assert anonymous.post(url(video), payload(), format="json").status_code in (
        401,
        403,
    )
    user.groups.clear()
    user.groups.add(Group.objects.get_or_create(name="data:read")[0])
    assert client.post(url(video), payload(), format="json").status_code == 403
    assert not VideoTranscodeJob.objects.exists()


def test_other_center_is_invisible_and_not_mutable(operator):
    client, user, video = operator
    foreign = Center.objects.create(name="Foreign transcode center")
    video.center = foreign
    video.save(update_fields=["center"])
    VideoTranscodeJob.objects.create(
        video=video,
        actor=user,
        idempotency_key=uuid4(),
        option="replace_processed",
        source_name=video.processed_file.name,
        source_sha256=video.processed_video_hash,
    )
    assert client.post(url(video), payload(), format="json").status_code == 404
    assert client.get(url(video)).status_code == 404
    response = client.get(LIST_URL)
    assert response.status_code == 200
    assert response.json()["jobs"] == []
    assert response.json()["candidates"] == []


@pytest.mark.parametrize(
    "query", ["limit=0", "limit=201", "limit=1.5", "limit=no", "actor_id=1", "offset=2"]
)
def test_list_rejects_unbounded_or_unsupported_query(operator, query):
    client, _, _ = operator
    assert client.get(f"{LIST_URL}?{query}").status_code == 400


def test_list_limit_applies_to_jobs_and_candidates_and_redacts_sources(operator):
    client, user, video = operator
    for index in range(3):
        VideoTranscodeJob.objects.create(
            video=video,
            actor=user,
            idempotency_key=uuid4(),
            option="replace_processed",
            status="completed",
            stage="completed",
            source_name=f"protected/private-{index}.mp4",
            source_sha256=str(index) * 64,
            before_bytes=1000,
            after_bytes=500,
            saved_bytes=0,
        )
    response = client.get(f"{LIST_URL}?limit=2")
    assert response.status_code == 200
    body = response.json()
    assert len(body["jobs"]) == 2
    assert len(body["candidates"]) <= 2
    assert body["options"] == ["replace_processed"]
    assert all(item["options"] == ["replace_processed"] for item in body["candidates"])
    for job in body["jobs"]:
        assert job["option"] == "replace_processed"
        assert job["saved_bytes"] == 0
        assert "source_name" not in job and "source_sha256" not in job
        assert "claim_token" not in job
    assert response["Cache-Control"] == "private, no-store"


def test_observation_does_not_mutate_old_worker_state(operator):
    client, user, video = operator
    job = VideoTranscodeJob.objects.create(
        video=video,
        actor=user,
        idempotency_key=uuid4(),
        option="replace_processed",
        status="running",
        stage="encoding",
        claim_token=uuid4(),
        heartbeat_at=timezone.now() - timedelta(hours=1),
        source_name=video.processed_file.name,
        source_sha256=video.processed_video_hash,
    )
    updated_at = job.updated_at
    assert client.get(LIST_URL).status_code == 200
    assert client.get(url(video)).status_code == 200
    job.refresh_from_db()
    assert job.status == "running" and job.stage == "encoding"
    assert job.updated_at == updated_at and job.finished_at is None
