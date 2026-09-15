"""Bounded repair batches preserve import failures and explicit transcode intent."""

from __future__ import annotations

from uuid import uuid4

import pytest
from django.contrib.auth.models import Group, User
from django.core.files.base import ContentFile
from endoreg_db.models import Center, PortalUserInfo, UploadJob, VideoFile
from endoreg_db.utils.encryption.encrypted import EncryptedStorage
from rest_framework.test import APIClient

from lx_annotate.models import VideoTranscodeJob
from lx_annotate.services import video_transcode_jobs as jobs

pytestmark = pytest.mark.django_db
URL = "/api/runtime/videos/repair/"


@pytest.fixture
def repair_operator(tmp_path, master_key, monkeypatch):
    user = User.objects.create_user(username="bulk-repair-operator")
    user.groups.add(Group.objects.get_or_create(name="data:write")[0])
    center = Center.objects.create(name="bulk repair center")
    PortalUserInfo.objects.get_or_create(user=user)[0].centers.add(center)
    storage = EncryptedStorage(location=str(tmp_path))
    monkeypatch.setattr(VideoFile._meta.get_field("processed_file"), "storage", storage)
    client = APIClient()
    client.force_authenticate(user=user)

    def create_video(target_center=center):
        video = VideoFile.objects.create(
            center=target_center,
            video_hash=str(uuid4()),
            processed_video_hash=uuid4().hex + uuid4().hex,
            original_file_name="repair.mp4",
        )
        video.processed_file.save("repair.mp4", ContentFile(b"encrypted source"))
        return video

    return client, user, center, create_video


def body(option="replace_processed", **kwargs):
    return {
        "transcode": {"option": option, "idempotency_key": str(uuid4())},
        **kwargs,
    }


@pytest.mark.parametrize("option", ["replace_processed"])
def test_bulk_batches_are_scoped_bounded_and_idempotent(repair_operator, option):
    client, _, _, create = repair_operator
    first, second = create(), create()
    other = Center.objects.create(name="other bulk repair center")
    create(other)
    payload = body(option, batch_size=1)
    response = client.post(URL, payload, format="json")
    assert response.status_code == 200
    batch = response.json()["transcodes"]
    assert batch["queued"] == 1 and batch["count"] == 1
    assert batch["next_after_video_id"] == first.pk
    assert batch["items"][0]["video_id"] == first.pk
    replay = client.post(URL, payload, format="json").json()["transcodes"]
    assert replay["existing"] == 1 and replay["queued"] == 0
    next_batch = client.post(
        URL, payload | {"after_video_id": first.pk}, format="json"
    ).json()["transcodes"]
    assert next_batch["next_after_video_id"] is None
    assert next_batch["items"][0]["video_id"] == second.pk
    assert VideoTranscodeJob.objects.count() == 2
    assert set(VideoTranscodeJob.objects.values_list("option", flat=True)) == {option}


@pytest.mark.parametrize(
    "payload",
    [
        body(dry_run=True),
        body(batch_size=101),
        body(after_video_id=-1),
        body(batch_size=True),
        body("raw"),
        body("playback_copy"),
        {"after_video_id": 1},
        {"dry_run": "false"},
        {"force": True},
    ],
)
def test_invalid_intent_does_not_repair_or_submit(repair_operator, payload):
    client, _, _, create = repair_operator
    video = create()
    assert client.post(URL, payload, format="json").status_code == 400
    video.refresh_from_db()
    assert not video.state.anonymized
    assert not VideoTranscodeJob.objects.exists()


def test_unavailable_transcode_fails_before_repair(repair_operator, monkeypatch):
    client, _, _, create = repair_operator
    video = create()

    def unavailable():
        raise jobs.TranscodeSubmissionError("transcode_dependency_unavailable", 503)

    monkeypatch.setattr(jobs, "assert_transcode_supported", unavailable)
    response = client.post(URL, body(), format="json")
    assert response.status_code == 503
    video.refresh_from_db()
    assert not video.state.anonymized


def test_failed_import_is_preserved_and_active_import_rejected(repair_operator):
    client, _, center, create = repair_operator
    failed_video, active_video = create(), create()
    failed = UploadJob.objects.create(
        source_center=center,
        content_hash=failed_video.video_hash,
        status="error",
        error_code="processing_failed",
        error_detail="OCR deadline",
    )
    UploadJob.objects.create(
        source_center=center,
        content_hash=active_video.video_hash,
        status="processing",
    )
    response = client.post(URL, body(), format="json")
    assert response.status_code == 200
    batch = response.json()["transcodes"]
    assert batch["queued"] == 1 and batch["rejected"] == 1
    rejected = next(item for item in batch["items"] if item["status"] == "rejected")
    assert rejected["video_id"] == active_video.pk
    assert rejected["error_code"] == "video_import_active"
    failed.refresh_from_db()
    assert (failed.status, failed.error_code, failed.error_detail) == (
        "error",
        "processing_failed",
        "OCR deadline",
    )


def test_dispatch_failure_is_not_counted_as_queued(repair_operator, monkeypatch):
    client, _, _, create = repair_operator
    create()
    real_submit = jobs.submit_video_transcode

    def failed_submit(**kwargs):
        job, created = real_submit(**kwargs)
        job.status = "failed"
        job.error_code = "broker_dispatch_failed"
        job.save(update_fields=["status", "error_code"])
        return job, created

    monkeypatch.setattr(jobs, "submit_video_transcode", failed_submit)
    batch = client.post(URL, body(), format="json").json()["transcodes"]
    assert batch["queued"] == 0 and batch["rejected"] == 1
    assert batch["items"][0]["error_code"] == "broker_dispatch_failed"


def test_read_only_user_cannot_bulk_repair(repair_operator):
    client, user, _, create = repair_operator
    create()
    user.groups.clear()
    user.groups.add(Group.objects.get_or_create(name="data:read")[0])
    assert client.post(URL, body(), format="json").status_code == 403
    assert not VideoTranscodeJob.objects.exists()


def test_active_transcode_blocks_repair_without_mutating_state(repair_operator):
    from endoreg_db.services.media_operation_gate import (
        acquire_video_transcode_lease,
        release_video_transcode_lease,
    )

    client, _, _, create = repair_operator
    video = create()
    claim = acquire_video_transcode_lease(video_id=video.pk)
    try:
        response = client.post(URL, body(), format="json")
        assert response.status_code == 200
        result = response.json()
        assert result["summary"]["blocked"] == 1
        assert result["items"][0]["changes"] == []
        assert result["transcodes"]["rejected"] == 1
        assert result["transcodes"]["items"][0]["error_code"] == "active_transcode"
        video.refresh_from_db()
        assert not video.state.anonymized
        assert not VideoTranscodeJob.objects.exists()
    finally:
        release_video_transcode_lease(claim)
