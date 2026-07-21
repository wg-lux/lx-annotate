from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from endoreg_db.models import Center, QuarantineItem, UploadJob


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    DEBUG=True,
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_quarantine_overview_returns_empty_state_for_missing_directory(
    client,
    monkeypatch,
    tmp_path,
):
    monkeypatch.delenv("LX_ANNOTATE_QUARANTINE_DIR", raising=False)

    with override_settings(APP_DATA_DIR=tmp_path):
        response = client.get("/api/runtime/quarantine/", secure=True)

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 0
    assert payload["files"] == []
    assert payload["directories"][0]["key"] == "lx_annotate_quarantine"
    assert payload["directories"][0]["exists"] is False


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    DEBUG=True,
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_quarantine_overview_lists_file_metadata_without_absolute_paths(
    client,
    monkeypatch,
    tmp_path,
):
    monkeypatch.delenv("LX_ANNOTATE_QUARANTINE_DIR", raising=False)

    quarantine_dir = tmp_path / "quarantine"
    quarantine_dir.mkdir()
    quarantined_file = quarantine_dir / "NINJAU_S001_S001_T016.MOV"
    quarantined_file.write_bytes(b"partial video")

    with override_settings(APP_DATA_DIR=tmp_path):
        response = client.get("/api/runtime/quarantine/", secure=True)

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 1
    assert payload["total_size"] == len(b"partial video")

    file_payload = payload["files"][0]
    assert file_payload["id"] == "lx_annotate_quarantine:NINJAU_S001_S001_T016.MOV"
    assert file_payload["filename"] == "NINJAU_S001_S001_T016.MOV"
    assert file_payload["media_type"] == "video"
    assert file_payload["size"] == len(b"partial video")
    assert file_payload["review_status"] == "unindexed"
    assert file_payload["next_action"] == "ledger_reconciliation_required"
    assert file_payload["source_upload_job_id"] is None
    assert file_payload["orphaned"] is True
    assert "path" not in file_payload
    assert str(tmp_path) not in str(file_payload)


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    DEBUG=True,
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_quarantine_overview_enforces_center_scope(
    client,
    monkeypatch,
    tmp_path,
):
    quarantine_dir = tmp_path / "quarantine"
    quarantine_dir.mkdir()
    own_file = quarantine_dir / "own.mp4"
    foreign_file = quarantine_dir / "foreign.mp4"
    own_file.write_bytes(b"own")
    foreign_file.write_bytes(b"foreign")
    own_center = Center.objects.create(name="Own center")
    foreign_center = Center.objects.create(name="Foreign center")

    def create_item(path, center):
        upload_job = UploadJob.objects.create(
            file=SimpleUploadedFile(path.name, path.read_bytes()),
            content_type="video/mp4",
            source_center=center,
        )
        stat_result = path.stat()
        return QuarantineItem.objects.create(
            path=str(path),
            relative_path=path.name,
            original_filename=path.name,
            size_bytes=stat_result.st_size,
            file_mtime_ns=stat_result.st_mtime_ns,
            quarantined_at=timezone.now(),
            last_seen_at=timezone.now(),
            source_upload_job=upload_job,
        )

    own_item = create_item(own_file, own_center)
    create_item(foreign_file, foreign_center)
    monkeypatch.setattr(
        "lx_annotate.views.quarantine.resolve_allowed_center_id",
        lambda _user: own_center.pk,
    )

    with override_settings(APP_DATA_DIR=tmp_path):
        response = client.get("/api/runtime/quarantine/", secure=True)

    assert response.status_code == status.HTTP_200_OK
    payload = response.json()
    assert payload["count"] == 1
    assert payload["files"][0]["filename"] == "own.mp4"
    assert payload["files"][0]["source_upload_job_id"] == str(
        own_item.source_upload_job_id
    )
