from __future__ import annotations

import builtins
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from django.core.files.base import ContentFile
from django.core.management import call_command

from lx_annotate.management.commands.run_filewatcher import (
    extract_frames_with_ffmpeg,
    process_intake_file,
    stream_managed_file_chunks,
)
from lx_annotate.storage.encrypted import EncryptedStorage


@pytest.fixture
def intake_dir(tmp_path):
    directory = tmp_path / "intake"
    directory.mkdir()
    return directory


@pytest.fixture
def managed_vault(tmp_path):
    directory = tmp_path / "secure_data"
    directory.mkdir()
    return directory


@pytest.fixture
def mock_storage(managed_vault):
    return EncryptedStorage(
        location=str(managed_vault),
        master_key=b"test-master-key-32-bytes-long-!!",
    )


def test_guardrail_no_raw_reads_in_vault(intake_dir, mock_storage):
    """
    Managed-vault ingestion should not raw-read ciphertext back from disk.
    """
    intake_file = intake_dir / "patient_video.mp4"
    intake_file.write_bytes(b"dummy video data")

    original_open = builtins.open

    def guarded_open(file, *args, **kwargs):
        mode = args[0] if args else kwargs.get("mode", "r")
        file_str = str(file)
        if str(mock_storage.location) in file_str and "r" in mode:
            pytest.fail(
                f"CRITICAL: Watcher attempted a raw filesystem read on managed media: {file_str}"
            )
        return original_open(file, *args, **kwargs)

    with patch("builtins.open", guarded_open):
        process_intake_file(intake_file, storage_backend=mock_storage)


def test_guardrail_memory_exhaustion_prevention(mock_storage):
    """
    Managed reads must stream via chunks, not with an unbounded .read().
    """
    saved_name = mock_storage.save("massive_file.mp4", ContentFile(b"A" * 1024))

    with patch.object(
        mock_storage.__class__, "open", wraps=mock_storage.open
    ) as mock_open:
        payload = b"".join(
            stream_managed_file_chunks(
                saved_name, storage_backend=mock_storage, chunk_size=128
            )
        )

    assert payload == b"A" * 1024
    assert mock_open.called


def test_guardrail_tempfile_escape_hatch_cleanup(mock_storage):
    """
    A crashing FFmpeg call must not leave decrypted temp files behind.
    """
    saved_name = mock_storage.save("processing_target.mp4", ContentFile(b"video data"))

    with patch("subprocess.run") as mock_subprocess:
        mock_subprocess.side_effect = Exception("FFmpeg segfaulted!")

        with pytest.raises(Exception, match="FFmpeg segfaulted!"):
            extract_frames_with_ffmpeg(saved_name, storage_backend=mock_storage)

    temp_dir = Path(tempfile.gettempdir())
    orphans = list(temp_dir.glob("lx_annotate_tmp_*"))
    assert orphans == []


def test_acceptance_intake_to_vault_handoff(intake_dir, mock_storage):
    """
    Plaintext intake must end up encrypted in managed storage and disappear from intake.
    """
    plaintext = b"CONFIDENTIAL_MEDICAL_DATA"
    intake_file = intake_dir / "incoming_scan.raw"
    intake_file.write_bytes(plaintext)

    saved_name = process_intake_file(intake_file, storage_backend=mock_storage)

    assert not intake_file.exists()

    vault_file = Path(mock_storage.path(saved_name))
    assert vault_file.exists()
    assert plaintext not in vault_file.read_bytes()


def test_acceptance_watcher_runs_without_http_context():
    """
    The management command must boot in headless systemd-style mode.
    """
    try:
        call_command("run_filewatcher", "--iterations=1", "--dry-run")
    except Exception as exc:  # pragma: no cover - explicit acceptance failure path
        pytest.fail(f"File watcher failed to run in headless systemd mode: {exc}")


def test_acceptance_watcher_can_process_existing_files_once(monkeypatch):
    """
    Timer/maintenance mode should drain existing intake files without starting
    the resident observer loop.
    """
    calls = []

    def fake_run_file_watcher(*, process_existing_once=False):
        calls.append(process_existing_once)

    monkeypatch.setattr(
        "lx_annotate.management.commands.run_filewatcher.run_file_watcher",
        fake_run_file_watcher,
        raising=False,
    )
    monkeypatch.setattr(
        "lx_annotate.file_watcher.run_file_watcher",
        fake_run_file_watcher,
    )

    call_command("run_filewatcher", "--process-existing-once")

    assert calls == [True]
