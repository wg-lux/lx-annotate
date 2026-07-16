from __future__ import annotations

from django.test import override_settings
from rest_framework import status


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    DEBUG=True,
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
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
    assert "path" not in file_payload
    assert str(tmp_path) not in str(file_payload)
