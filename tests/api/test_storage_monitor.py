from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from endoreg_db.utils.file_operations import atomic_write_file
from endoreg_db.utils.paths import clear_runtime_paths_cache, get_runtime_paths
from rest_framework.test import APIClient

from lx_annotate.services import storage_monitor as service

pytestmark = pytest.mark.django_db
URL = "/endoreg-api/media/storage-monitor/"


@pytest.fixture
def runtime(tmp_path, monkeypatch, settings):
    monkeypatch.setenv("LX_RUNTIME_ROOT", str(tmp_path))
    clear_runtime_paths_cache()
    paths = get_runtime_paths()
    settings.MEDIA_ROOT = str(paths.storage)
    settings.PROTECTED_MEDIA_ROOT = str(paths.storage)
    paths.import_report.mkdir(parents=True)
    paths.storage.mkdir(parents=True)
    yield paths
    clear_runtime_paths_cache()


def client_for(role):
    client = APIClient()
    if role != "anonymous":
        user = get_user_model().objects.create_user(
            username=role, is_superuser=role == "admin"
        )
        if role == "monitor":
            user.groups.add(Group.objects.create(name="storage:monitor"))
        client.force_authenticate(user)
    return client


@pytest.mark.parametrize(
    "role,status", [("anonymous", 403), ("user", 403), ("monitor", 200), ("admin", 200)]
)
def test_permissions_and_unindexed_import(runtime, role, status):
    path = runtime.import_report / "report.txt"
    atomic_write_file(destination=path, content=[b"report"])
    client = client_for(role)
    response = client.get(URL)
    assert response.status_code == status
    if status == 200:
        row = next(row for row in response.json()["items"] if row["name"] == path.name)
        assert row["size"] == 6
        assert row["status"] == "ohne Datenbankzuordnung"
        assert bool(row["token"]) == (role == "admin")
        assert response["Cache-Control"] == "private, no-store"
    if role != "admin":
        assert (
            client.delete(URL, {"token": "invalid"}, format="json").status_code == 403
        )
    assert path.exists()


@pytest.mark.parametrize(
    "change", ["unchanged", "replaced", "symlink", "referenced", "invalid"]
)
def test_observation_rechecked_before_deleting(runtime, monkeypatch, change):
    path = runtime.import_report / "report.txt"
    atomic_write_file(destination=path, content=[b"report"])
    client = client_for("admin")
    row = next(
        row for row in client.get(URL).json()["items"] if row["name"] == path.name
    )
    if change == "replaced":
        atomic_write_file(destination=path, content=[b"replacement"])
    elif change == "symlink":
        destination = runtime.import_report / "other.txt"
        atomic_write_file(destination=destination, content=[b"other"])
        path.unlink()
        path.symlink_to(destination)
    elif change == "referenced":
        monkeypatch.setattr(
            service, "references", lambda: ({path: ["uploadjob:1"]}, {})
        )
    elif change == "invalid":
        row["token"] += "tampered"
    response = client.delete(URL, {"token": row["token"]}, format="json")
    assert response.status_code == (200 if change == "unchanged" else 409)
    assert path.exists() == (change != "unchanged")


def test_symlinks_and_missing_references_are_visible(runtime, monkeypatch):
    outside = runtime.runtime_root / "outside.txt"
    atomic_write_file(destination=outside, content=[b"outside"])
    link = runtime.import_report / "link.txt"
    link.symlink_to(outside)
    missing = runtime.storage / "missing.mp4"
    monkeypatch.setattr(service, "references", lambda: ({missing: ["videofile:4"]}, {}))
    items = client_for("admin").get(URL).json()["items"]
    assert (
        next(row for row in items if row["name"] == "missing.mp4")["status"]
        == "Datei fehlt"
    )
    assert not next(row for row in items if row["name"] == "link.txt")["token"]
    assert outside.exists()


def test_filter_and_pagination(runtime):
    for name in ("one.pdf", "two.mp4"):
        atomic_write_file(
            destination=runtime.import_report / name, content=[b"content"]
        )
    client = client_for("admin")
    response = client.get(URL, {"search": "one", "kind": "artifact", "limit": 1}).json()
    assert response["total"] == 1
    assert response["items"][0]["name"] == "one.pdf"
    assert response["bytes"] == 14
    assert client.get(URL, {"offset": -1}).status_code == 409


def test_video_report_rows_include_missing_media(runtime):
    from endoreg_db.models import Center, RawPdfFile, VideoFile

    center = Center.objects.create(name="storage-monitor-test")
    video = VideoFile.objects.create(center=center, raw_video_hash="a" * 64)
    report = RawPdfFile.objects.create(center=center, pdf_hash="b" * 64)
    items = client_for("admin").get(URL).json()["items"]
    assert {row["kind"] for row in items} >= {"video", "report"}
    assert any(row["id"] == f"videofile:{video.pk}" for row in items)
    assert any(row["id"] == f"rawpdffile:{report.pk}" for row in items)


@pytest.mark.parametrize("alias", [False, True])
def test_failed_upload_provenance_is_not_an_orphan(runtime, alias):
    from endoreg_db.models import Center, UploadJob

    center = Center.objects.create(name="upload-monitor")
    path = runtime.import_report / "failed.pdf"
    atomic_write_file(destination=path, content=[b"source"])
    watched = path
    if alias:
        watched = path.with_name("alias.pdf")
        watched.symlink_to(path)
    job = UploadJob.objects.create(
        source_center=center,
        content_type="application/pdf",
        original_filename="failed.pdf",
        content_hash="c" * 64,
        status="error",
        error_code="processing_failed",
        processing_provenance={"watched_path": str(watched)},
    )
    payload = client_for("admin").get(URL).json()
    row = next(row for row in payload["items"] if row["id"] == f"uploadjob:{job.pk}")
    assert row["status"] == "error"
    assert row["size"] == 6 + (watched.lstat().st_size if alias else 0)
    artifact = next(
        row
        for row in payload["items"]
        if row["kind"] == "artifact" and row["name"] == "failed.pdf"
    )
    assert artifact["owners"] == [row["id"]]
    assert not artifact["token"]
    assert payload["bytes"] == row["size"]


@pytest.mark.parametrize("case", ["changed_report", "active_video"])
def test_media_deletion_rechecks_current_state(runtime, case):
    from datetime import timedelta

    from django.utils import timezone
    from endoreg_db.models import Center, MediaOperationLease, RawPdfFile, VideoFile

    center = Center.objects.create(name="guard-monitor")
    media = (
        RawPdfFile.objects.create(center=center, pdf_hash="d" * 64)
        if case == "changed_report"
        else VideoFile.objects.create(center=center, raw_video_hash="e" * 64)
    )
    client = client_for("admin")
    row = next(
        row
        for row in client.get(URL).json()["items"]
        if row["kind"] in {"report", "video"}
    )
    if case == "changed_report":
        media.save()
    else:
        MediaOperationLease.objects.create(
            video=media,
            lease_type="stream",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
    response = client.delete(URL, {"token": row["token"]}, format="json")
    assert response.status_code == 409
    assert type(media).objects.filter(pk=media.pk).exists()


@pytest.mark.parametrize("shared", [False, True])
def test_report_deletion_uses_owner_service_and_preserves_shared_files(
    runtime, master_key, shared
):
    from django.core.files.base import ContentFile
    from endoreg_db.models import Center, RawPdfFile

    center = Center.objects.create(name="report-delete-monitor")
    report = RawPdfFile.objects.create(center=center, pdf_hash="f" * 64)
    report.file.save("original.pdf", ContentFile(b"original-report"), save=True)
    report.processed_file.save(
        "processed.pdf", ContentFile(b"processed-report"), save=True
    )
    original = report.file.name
    processed = report.processed_file.name
    storage = report.file.storage
    from pathlib import Path

    assert Path(storage.path(original)).is_relative_to(runtime.storage)
    if shared:
        RawPdfFile.objects.create(center=center, pdf_hash="a" * 64, file=original)
    client = client_for("admin")
    row = next(
        row
        for row in client.get(URL).json()["items"]
        if row["id"] == f"rawpdffile:{report.pk}"
    )
    response = client.delete(URL, {"token": row["token"]}, format="json")
    assert response.status_code == (409 if shared else 200)
    assert RawPdfFile.objects.filter(pk=report.pk).exists() == shared
    assert storage.exists(original) == shared
    assert storage.exists(processed) == shared


def test_expired_observation_preserves_file(runtime, monkeypatch):
    import time

    path = runtime.import_report / "expired.txt"
    atomic_write_file(destination=path, content=[b"report"])
    client = client_for("admin")
    row = next(
        row for row in client.get(URL).json()["items"] if row["name"] == path.name
    )
    future = time.time() + 360
    monkeypatch.setattr("django.core.signing.time.time", lambda: future)
    response = client.delete(URL, {"token": row["token"]}, format="json")
    assert response.status_code == 409
    assert path.exists()


@pytest.mark.parametrize("case", ["valid", "wrong_hash", "active", "shared"])
def test_terminal_upload_source_deletion(runtime, master_key, case):
    from endoreg_db.models import Center, RawPdfFile, UploadJob
    from endoreg_db.utils.hashs import get_file_hash

    center = Center.objects.create(name="source-delete-monitor")
    path = runtime.import_report / "source.pdf"
    atomic_write_file(destination=path, content=[b"report-source"])
    digest = get_file_hash(path)
    job = UploadJob.objects.create(
        source_center=center,
        content_hash=digest,
        content_type="application/pdf",
        status="error",
        error_code="processing_failed",
        processing_provenance={"watched_path": str(path)},
    )
    client = client_for("admin")
    row = next(
        row
        for row in client.get(URL).json()["items"]
        if row["id"] == f"uploadjob:{job.pk}"
    )
    assert row["token"]
    if case == "wrong_hash":
        atomic_write_file(destination=path, content=[b"changed"])
    elif case == "active":
        job.status = "pending"
        job.error_code = ""
        job.save()
    elif case == "shared":
        RawPdfFile.objects.create(center=center, pdf_hash=digest)
    response = client.delete(URL, {"token": row["token"]}, format="json")
    assert response.status_code == (200 if case == "valid" else 409)
    assert path.exists() == (case != "valid")
    job.refresh_from_db()
    if case == "valid":
        assert job.status == "error"
        assert job.cleanup_status == "completed"
        assert not job.source_file_persisted
