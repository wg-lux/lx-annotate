"""Mounted lifecycle regressions: scoped recovery and truthful import state."""

from __future__ import annotations

from uuid import uuid4

import pytest
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.utils import timezone
from endoreg_db.models import Center, PortalUserInfo, UploadJob, VideoFile, VideoState
from rest_framework.authentication import SessionAuthentication
from rest_framework.views import APIView

from tests.hub_payload_helpers import create_hub_sensitive_meta

pytestmark = pytest.mark.django_db


@pytest.fixture
def operator(client, django_user_model, monkeypatch):
    monkeypatch.setattr(APIView, "authentication_classes", [SessionAuthentication])
    user = django_user_model.objects.create_user(username="lifecycle-operator")
    user.groups.add(Group.objects.get_or_create(name="data:write")[0])
    center = Center.objects.create(
        name="lifecycle-center", center_key="lifecycle-center"
    )
    PortalUserInfo.objects.get_or_create(user=user)[0].centers.add(center)
    client.force_login(user)
    return user, center


def test_mounted_import_dismissal_hides_only_the_row_and_preserves_source(
    client, operator, master_key
):
    user, center = operator
    job = UploadJob.objects.create(
        source_center=center,
        status="error",
        error_code="processing_failed",
        original_filename="before-video-id.mp4",
        content_type="video/mp4",
        file=ContentFile(b"retained encrypted source", name="before-video-id.mp4"),
    )
    response = client.get("/api/anonymization/items/overview/")
    rows = response.json()
    row = next(
        item for item in rows if item.get("upload_job", {}).get("id") == str(job.pk)
    )
    assert row["can_dismiss_import"] is True
    assert row["import_only"] is True
    endpoint = f"/api/anonymization/upload-jobs/{job.pk}/dismiss/"
    assert client.post(endpoint).status_code == 204
    assert client.post(endpoint).status_code == 204
    job.refresh_from_db()
    assert job.overview_dismissed_by_id == user.pk
    assert job.file.storage.exists(job.file.name)
    assert client.get("/api/anonymization/items/overview/").json() == []


def test_mounted_import_dismissal_rejects_read_only_user_even_in_debug(
    client, operator
):
    user, center = operator
    job = UploadJob.objects.create(
        source_center=center, status="lost", error_code="source_missing"
    )
    user.groups.clear()
    user.groups.add(Group.objects.get_or_create(name="data:read")[0])
    assert (
        client.post(f"/api/anonymization/upload-jobs/{job.pk}/dismiss/").status_code
        == 403
    )
    job.refresh_from_db()
    assert job.overview_dismissed_at is None


@pytest.mark.parametrize(
    "boundary",
    [
        "runtime/videos/repair/",
        "hub-export/mark/",
        "hub-export/unmark/",
        "hub-export/offload-eligible-videos/",
        f"hub-export/jobs/{uuid4()}/retry/",
        f"anonymization/upload-jobs/{uuid4()}/retry/",
    ],
)
@pytest.mark.parametrize("missing", ["role", "center"])
def test_mutations_deny_missing_capability_or_center(
    client, operator, boundary, missing
):
    user, _ = operator
    if missing == "role":
        user.groups.clear()
    else:
        PortalUserInfo.objects.get(user=user).centers.clear()
    response = client.post(f"/api/{boundary}", data={}, content_type="application/json")
    # Retry checks its object before scope; use a real job for center denial below.
    if missing == "center" and boundary.startswith("anonymization/upload-jobs/"):
        assert response.status_code == 404
    else:
        assert response.status_code == 403


def test_repair_filters_bulk_and_hides_wrong_center_target(client, operator):
    _, center = operator
    other = Center.objects.create(name="other", center_key="other")
    own_video = VideoFile.objects.create(
        center=center, video_hash="own", state=VideoState.objects.create()
    )
    other_video = VideoFile.objects.create(center=other, video_hash="other")
    denied = client.post(
        f"/api/runtime/videos/{other_video.pk}/repair/",
        {},
        content_type="application/json",
    )
    assert denied.status_code == 404
    response = client.post(
        "/api/runtime/videos/repair/", {}, content_type="application/json"
    )
    assert response.status_code == 200
    assert [item["video_id"] for item in response.json()["items"]] == [own_video.pk]
    other_video.refresh_from_db()
    assert other_video.state_id is None


def test_metadata_only_repair_never_completes_failed_upload(client, operator):
    _, center = operator
    metadata = create_hub_sensitive_meta(center=center)
    video = VideoFile.objects.create(
        center=center,
        video_hash="partial",
        sensitive_meta=metadata,
        state=VideoState.objects.create(),
    )
    job = UploadJob.objects.create(
        source_center=center,
        content_hash="partial",
        status=UploadJob.Status.ERROR,
        error_code="processing_failed",
    )
    response = client.post(
        f"/api/runtime/videos/{video.pk}/repair/", {}, content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json()["items"][0]["status"] == "reimport_required"
    video.state.refresh_from_db()
    job.refresh_from_db()
    assert not video.state.anonymized
    assert job.status == UploadJob.Status.ERROR


def test_raw_media_does_not_hide_missing_metadata(client, operator, master_key):
    _, center = operator
    video = VideoFile.objects.create(
        center=center,
        video_hash="raw-only",
        raw_file=ContentFile(b"raw", name="raw.mp4"),
    )
    response = client.post(
        f"/api/runtime/videos/{video.pk}/repair/", {}, content_type="application/json"
    )
    item = response.json()["items"][0]
    assert item["status"] == "reimport_required"
    assert item["missing"] == ["technical_metadata", "sensitive_metadata"]


@pytest.mark.parametrize(
    "job_status", ["pending", "processing", "retrying", "error", "lost"]
)
def test_unattached_import_remains_visible_through_lifecycle(
    client, operator, job_status
):
    _, center = operator
    job = create_upload_job(center, job_status)
    other = Center.objects.create(name="other-import", center_key="other-import")
    hidden = create_upload_job(other, job_status)
    response = client.get("/api/anonymization/items/overview/")
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert rows[0]["upload_job"]["id"] == str(job.pk)
    assert str(hidden.pk) not in str(rows)
    assert rows[0]["import_only"] is True
    if job_status in {"error", "lost"}:
        assert "safe_reimport" not in rows[0]["upload_job"]["allowed_actions"]
    assert rows[0]["anonymization_status"] == (
        "failed" if job_status in {"error", "lost"} else "processing_anonymization"
    )


def test_retry_denies_wrong_center_and_centerless_users(client, operator):
    user, center = operator
    job = create_upload_job(center, "retrying")
    info = PortalUserInfo.objects.get(user=user)
    info.centers.clear()
    url = f"/api/anonymization/upload-jobs/{job.pk}/retry/"
    assert client.post(url, {}, content_type="application/json").status_code == 403
    other = Center.objects.create(name="retry-other", center_key="retry-other")
    info.centers.add(other)
    assert client.post(url, {}, content_type="application/json").status_code == 403


def create_upload_job(center, status):
    return UploadJob.objects.create(
        source_center=center,
        status=status,
        content_type="video/mp4",
        error_code="processing_failed"
        if status in {"retrying", "error", "lost"}
        else "",
        retryable=status == "retrying",
        retry_count=1 if status == "retrying" else 0,
        next_retry_at=timezone.now() if status == "retrying" else None,
    )


@pytest.mark.parametrize("dry_run", [False, True])
def test_processed_repair_preserves_approval_and_other_center_jobs(
    client, operator, master_key, dry_run
):
    _, center = operator
    other = Center.objects.create(name="same-hash-other", center_key="same-hash-other")
    video = VideoFile.objects.create(
        center=center,
        video_hash="processed",
        state=VideoState.objects.create(),
        processed_file=ContentFile(b"processed", name="processed.mp4"),
    )
    jobs = [
        UploadJob.objects.create(
            source_center=source_center,
            content_hash=video.video_hash,
            status="error",
            error_code="processing_failed",
        )
        for source_center in (center, other)
    ]
    response = client.post(
        f"/api/runtime/videos/{video.pk}/repair/",
        {"dry_run": dry_run},
        content_type="application/json",
    )
    assert response.status_code == 200
    video.state.refresh_from_db()
    assert not video.state.anonymization_validated
    assert bool(video.state.anonymized) is (not dry_run)
    for job in jobs:
        job.refresh_from_db()
    assert jobs[0].status == ("error" if dry_run else "anonymized")
    assert jobs[1].status == "error"
