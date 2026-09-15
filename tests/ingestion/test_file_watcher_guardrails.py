from __future__ import annotations

import builtins
import tempfile
from pathlib import Path
from types import SimpleNamespace
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


def test_guardrail_tempfile_escape_hatch_cleanup(mock_storage, monkeypatch):
    """
    A crashing FFmpeg call must not leave decrypted temp files behind.
    """
    import lx_annotate.management.commands.run_filewatcher as watcher_command

    saved_name = mock_storage.save("processing_target.mp4", ContentFile(b"video data"))
    cleaned_paths = []
    real_safe_unlink_file = watcher_command.safe_unlink_file

    def record_safe_unlink(path, *, missing_ok=True):
        cleaned_paths.append((path, missing_ok))
        real_safe_unlink_file(path, missing_ok=missing_ok)

    monkeypatch.setattr(watcher_command, "safe_unlink_file", record_safe_unlink)

    with patch("subprocess.run") as mock_subprocess:
        mock_subprocess.side_effect = Exception("FFmpeg segfaulted!")

        with pytest.raises(Exception, match="FFmpeg segfaulted!"):
            extract_frames_with_ffmpeg(saved_name, storage_backend=mock_storage)

    temp_dir = Path(tempfile.gettempdir())
    orphans = list(temp_dir.glob("lx_annotate_tmp_*"))
    assert orphans == []
    assert len(cleaned_paths) == 1
    assert cleaned_paths[0][1] is True


def test_intake_cleanup_failure_is_not_suppressed(monkeypatch, tmp_path):
    import lx_annotate.management.commands.run_filewatcher as watcher_command

    intake_file = tmp_path / "patient_video.mp4"
    intake_file.write_bytes(b"plaintext")

    class RecordingStorage:
        saved_names = []

        def save(self, name, content):
            self.saved_names.append(name)
            assert content.read() == b"plaintext"
            return name

    storage = RecordingStorage()

    def fail_unlink(path, *, missing_ok=True):
        assert path == intake_file
        assert missing_ok is False
        raise PermissionError("intake cleanup denied")

    monkeypatch.setattr(watcher_command, "safe_unlink_file", fail_unlink)

    with pytest.raises(PermissionError, match="intake cleanup denied"):
        process_intake_file(intake_file, storage_backend=storage)

    assert storage.saved_names == ["patient_video.mp4"]
    assert intake_file.read_bytes() == b"plaintext"


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


def test_acceptance_watcher_dry_run_imports_runtime_module(monkeypatch):
    """
    Dry-run must exercise the production watcher import path.
    """
    original_import = builtins.__import__

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "lx_annotate.file_watcher":
            raise ModuleNotFoundError("sentinel watcher import failure")
        return original_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", guarded_import)

    with pytest.raises(ModuleNotFoundError, match="sentinel watcher import failure"):
        call_command("run_filewatcher", "--dry-run")


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


def test_run_file_watcher_preloads_processing_stack_before_processing(monkeypatch):
    import lx_annotate.file_watcher as watcher

    events = []

    class FakeFileWatcherService:
        def __init__(self):
            events.append("service")

        def process_existing_once(self):
            events.append("process-existing")
            return 0

        def start(self):
            events.append("start")

    monkeypatch.setattr(
        watcher,
        "_preload_processing_stack",
        lambda: events.append("preload"),
    )
    monkeypatch.setattr(watcher, "FileWatcherService", FakeFileWatcherService)

    watcher.run_file_watcher(process_existing_once=True)

    assert events == ["preload", "service", "process-existing"]


def test_file_watcher_service_accepts_preprovisioned_intake(monkeypatch, tmp_path):
    import lx_annotate.file_watcher as watcher

    video_dir = tmp_path / "video"
    report_dir = tmp_path / "report"
    pseudonymized_dir = tmp_path / "pseudonymized"
    video_dir.mkdir()
    report_dir.mkdir()
    pseudonymized_dir.mkdir()

    class FakeHandler:
        def __init__(self):
            self.pseudonymized_dir = pseudonymized_dir

    monkeypatch.setattr(watcher, "Observer", object)
    monkeypatch.setattr(watcher, "AutoProcessingHandler", FakeHandler)
    monkeypatch.setattr(watcher, "INTAKE_VIDEO_DIR", video_dir)
    monkeypatch.setattr(watcher, "INTAKE_REPORT_DIR", report_dir)

    service = watcher.FileWatcherService()

    assert service.video_dir == video_dir
    assert service.report_dir == report_dir
    assert service.pseudonymized_dir == pseudonymized_dir


def test_file_watcher_service_fails_when_intake_directory_is_missing(
    monkeypatch, tmp_path
):
    import lx_annotate.file_watcher as watcher

    class FakeHandler:
        pseudonymized_dir = tmp_path / "pseudonymized"

    monkeypatch.setattr(watcher, "Observer", object)
    monkeypatch.setattr(watcher, "AutoProcessingHandler", FakeHandler)
    monkeypatch.setattr(watcher, "INTAKE_VIDEO_DIR", tmp_path / "video")
    monkeypatch.setattr(watcher, "INTAKE_REPORT_DIR", tmp_path / "report")

    with pytest.raises(
        FileNotFoundError,
        match="Video intake directory is not provisioned",
    ):
        watcher.FileWatcherService()


def test_file_watcher_service_fails_when_intake_path_is_not_directory(
    monkeypatch, tmp_path
):
    import lx_annotate.file_watcher as watcher

    video_path = tmp_path / "video"
    video_path.write_bytes(b"not-a-directory")

    class FakeHandler:
        pseudonymized_dir = tmp_path / "pseudonymized"

    monkeypatch.setattr(watcher, "Observer", object)
    monkeypatch.setattr(watcher, "AutoProcessingHandler", FakeHandler)
    monkeypatch.setattr(watcher, "INTAKE_VIDEO_DIR", video_path)
    monkeypatch.setattr(watcher, "INTAKE_REPORT_DIR", tmp_path / "report")

    with pytest.raises(
        NotADirectoryError,
        match="Video intake path is not a directory",
    ):
        watcher.FileWatcherService()


def test_completed_report_cleanup_uses_typed_wrapper(monkeypatch, tmp_path):
    import lx_annotate.file_watcher as watcher

    report_path = tmp_path / "report.pdf"
    report_path.write_bytes(b"%PDF")
    deleted = []
    handler = watcher.AutoProcessingHandler()

    monkeypatch.setattr(watcher, "is_intake_path", lambda _path: True)
    monkeypatch.setattr(watcher, "ensure_directory", lambda path: path)
    monkeypatch.setattr(handler, "_resolve_default_center", lambda: object())
    monkeypatch.setattr(
        watcher,
        "process_watcher_file",
        lambda **_kwargs: SimpleNamespace(
            is_complete=True,
            id="completed-report",
        ),
    )
    monkeypatch.setattr(
        watcher,
        "safe_unlink_file",
        lambda path: deleted.append(path),
    )

    try:
        handler._process_report(report_path)
    finally:
        handler.shutdown()

    assert deleted == [report_path]


def test_completed_video_cleanup_uses_typed_wrapper(monkeypatch, tmp_path):
    import lx_annotate.file_watcher as watcher

    video_path = tmp_path / "video.mp4"
    video_path.write_bytes(b"video")
    deleted = []
    handler = watcher.AutoProcessingHandler()
    video = SimpleNamespace(
        video_hash="video-hash",
        pk=None,
        sensitive_meta=None,
        active_raw_file=None,
    )
    upload_job = SimpleNamespace(
        id="completed-video",
        status="done",
        error_detail="",
        is_complete=True,
        is_successful=True,
        content_hash="video-hash",
        processing_provenance={},
        sensitive_meta_id=None,
        refresh_from_db=lambda **_kwargs: None,
    )
    video_manager = SimpleNamespace(
        filter=lambda **_kwargs: SimpleNamespace(first=lambda: video)
    )

    monkeypatch.setattr(watcher, "is_intake_path", lambda _path: True)
    monkeypatch.setattr(watcher, "check_storage_capacity", lambda *_args: None)
    monkeypatch.setattr(handler, "_resolve_default_center", lambda: object())
    monkeypatch.setattr(
        watcher,
        "process_watcher_file",
        lambda **_kwargs: upload_job,
    )
    monkeypatch.setattr(
        watcher,
        "VideoFile",
        SimpleNamespace(objects=video_manager),
    )
    monkeypatch.setattr(
        watcher,
        "safe_unlink_file",
        lambda path: deleted.append(path),
    )

    try:
        handler._process_video(video_path)
    finally:
        handler.shutdown()

    assert deleted == [video_path]


def test_file_watcher_has_no_raw_filesystem_mutations():
    watcher_source = (
        Path(__file__).parents[2] / "lx_annotate" / "file_watcher.py"
    ).read_text(encoding="utf-8")

    assert ".mkdir(" not in watcher_source
    assert ".unlink(" not in watcher_source
