# pyright: reportAttributeAccessIssue=false, reportArgumentType=false, reportOptionalMemberAccess=false
from __future__ import annotations

import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.test import override_settings
from endoreg_db.models import (
    Center,
    UploadJob,
)
from endoreg_db.services.hub.ingest import process_watcher_file
from endoreg_db.utils.file_operations import atomic_write_file
from watchdog.events import (  # type: ignore[import-not-found]
    FileCreatedEvent,
    FileMovedEvent,
)

from lx_annotate import file_watcher


class RecordingExecutor:
    def __init__(self):
        self.submissions = []

    def submit(self, fn, *args, **kwargs):
        self.submissions.append((fn, args, kwargs))
        return None


def make_handler(monkeypatch):
    handler = file_watcher.AutoProcessingHandler()
    executor = RecordingExecutor()
    monkeypatch.setattr(handler, "executor", executor)
    return handler, executor


@pytest.mark.django_db
def test_watcher_provisions_configured_center_without_study(monkeypatch):
    with override_settings(
        LX_ANNOTATE_DEFAULT_CENTER="standalone", CENTER_NAME="Local Site"
    ):
        handler, _ = make_handler(monkeypatch)
        assert not Center.objects.filter(center_key="standalone").exists()
        center = handler._resolve_default_center()
        assert center.center_key == "standalone"
        assert center.name == "Local Site"
        assert handler._resolve_default_center() == center


def test_duplicate_create_and_move_events_submit_only_once(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    video_path = tmp_path / "video.mp4"

    handler.on_created(FileCreatedEvent(str(video_path)))
    handler.on_moved(FileMovedEvent(str(tmp_path / "incoming.mp4"), str(video_path)))

    assert len(executor.submissions) == 1
    assert handler.in_flight_files == {str(video_path)}


def test_temp_handoff_create_event_is_not_submitted(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    temp_path = tmp_path / "video.mp4.part.123"

    handler.dispatch(FileCreatedEvent(str(temp_path)))

    assert executor.submissions == []
    assert handler.in_flight_files == set()


def test_temp_to_final_move_event_submits_final_path(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    temp_path = tmp_path / "video.mp4.part.123"
    final_path = tmp_path / "video.mp4"

    handler.dispatch(FileMovedEvent(str(temp_path), str(final_path)))

    assert len(executor.submissions) == 1
    assert executor.submissions[0][1] == (str(final_path),)
    assert handler.in_flight_files == {str(final_path)}


def test_inflight_slot_is_released_after_processing_finishes(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    video_path = tmp_path / "video.mp4"
    video_path.write_bytes(b"test")

    handler.on_created(FileCreatedEvent(str(video_path)))
    assert len(executor.submissions) == 1
    assert str(video_path) in handler.in_flight_files

    fn, args, kwargs = executor.submissions.pop()
    fn(*args, **kwargs)

    assert str(video_path) not in handler.in_flight_files

    handler.on_moved(FileMovedEvent(str(tmp_path / "renamed.mp4"), str(video_path)))

    assert len(executor.submissions) == 1
    assert str(video_path) in handler.in_flight_files


def test_process_existing_files_skips_temp_handoff_files(monkeypatch, tmp_path):
    service = file_watcher.FileWatcherService()
    service.handler.shutdown()
    handler, executor = make_handler(monkeypatch)
    service.handler = handler
    service.video_dir = tmp_path / "video_import"
    service.report_dir = tmp_path / "report_import"
    service.pseudonymized_dir = tmp_path / "preanonymized_import"
    service.video_dir.mkdir()
    service.report_dir.mkdir()
    service.pseudonymized_dir.mkdir()
    final_video = service.video_dir / "ready.mp4"
    temp_video = service.video_dir / "ignore.tmp.mp4"
    final_report = service.report_dir / "ready.pdf"
    temp_report = service.report_dir / "ignore.part.pdf"
    final_video.write_bytes(b"video")
    temp_video.write_bytes(b"partial-video")
    final_report.write_bytes(b"%PDF")
    temp_report.write_bytes(b"partial-report")

    submitted_count = service._process_existing_files()

    assert submitted_count == 2
    assert executor.submissions[0][1] == (str(final_report),)
    submitted_paths = {args[0] for _fn, args, _kwargs in executor.submissions}
    assert submitted_paths == {str(final_video), str(final_report)}


def test_intake_zone_helpers_classify_paths():
    assert file_watcher.is_intake_path(file_watcher.INTAKE_VIDEO_DIR / "clip.mp4")
    assert file_watcher.is_intake_path(file_watcher.INTAKE_REPORT_DIR / "report.pdf")
    assert file_watcher.is_intake_path(
        file_watcher.INTAKE_PREANONYMIZED_DIR / "pseudo.mp4"
    )
    assert not file_watcher.is_intake_path(
        file_watcher.MANAGED_VAULT_ROOT / "videos" / "vault.mp4"
    )


@pytest.mark.parametrize(
    ("root_name", "suffix", "processor"),
    [
        ("INTAKE_REPORT_DIR", suffix, "_process_report")
        for suffix in ("pdf", "txt", "TXT")
    ]
    + [
        ("INTAKE_VIDEO_DIR", suffix, "_process_video")
        for suffix in ("mp4", "avi", "mov", "mkv", "webm", "m4v")
    ]
    + [
        ("INTAKE_PREANONYMIZED_DIR", suffix, "_process_pseudonymized")
        for suffix in ("pdf", "txt", "mp4")
    ],
)
def test_nested_format_scan_and_dispatch(
    monkeypatch, tmp_path, root_name, suffix, processor
):
    root = tmp_path / root_name
    monkeypatch.setattr(file_watcher, root_name, root)
    handler, executor = make_handler(monkeypatch)
    path = root / suffix.lower() / "batch" / f"document.{suffix}"
    path.parent.mkdir(parents=True)
    path.write_bytes(b"input")
    calls = []
    monkeypatch.setattr(handler, processor, calls.append)
    service = file_watcher.FileWatcherService.__new__(file_watcher.FileWatcherService)
    service.handler = handler
    assert list(service._iter_unprocessed_files(root, {f".{suffix.lower()}"})) == [path]
    handler._submit_file(str(path))
    handler._submit_file(str(path))
    assert len(executor.submissions) == 1
    fn, args, kwargs = executor.submissions.pop()
    fn(*args, **kwargs)
    assert calls == [path]
    assert handler.in_flight_files == set()


@pytest.mark.parametrize(
    "directory", [".staging", "batch.part", "_processing", "~backup"]
)
def test_nested_unpublished_reports_are_ignored(monkeypatch, tmp_path, directory):
    handler, _ = make_handler(monkeypatch)
    path = tmp_path / directory / "report.txt"
    path.parent.mkdir()
    path.write_text("input")
    service = file_watcher.FileWatcherService.__new__(file_watcher.FileWatcherService)
    service.handler = handler
    assert (
        list(service._iter_unprocessed_files(tmp_path, handler.report_extensions)) == []
    )


def test_nested_symlink_directory_is_not_processed(monkeypatch, tmp_path):
    root = tmp_path / "reports"
    root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    (outside / "report.txt").write_text("input")
    (root / "txt").symlink_to(outside, target_is_directory=True)
    monkeypatch.setattr(file_watcher, "INTAKE_REPORT_DIR", root)
    handler, _ = make_handler(monkeypatch)
    calls = []
    monkeypatch.setattr(handler, "_process_report", calls.append)
    handler._process_file(str(root / "txt" / "report.txt"))
    assert calls == []


def test_managed_vault_helper_classifies_paths():
    assert file_watcher.is_managed_vault_path(
        file_watcher.MANAGED_VAULT_ROOT / "videos" / "vault.mp4"
    )
    assert not file_watcher.is_managed_vault_path(
        file_watcher.INTAKE_VIDEO_DIR / "clip.mp4"
    )


class StubFieldFile:
    def __init__(self, payload: bytes, suffix: str = ".bin"):
        self.payload = payload
        self.name = f"managed{suffix}"
        self._opened = False

    def open(self, mode="rb"):
        assert mode == "rb"
        self._opened = True
        return self

    def chunks(self, chunk_size=1024 * 1024):
        for idx in range(0, len(self.payload), chunk_size):
            yield self.payload[idx : idx + chunk_size]

    def close(self):
        self._opened = False


def test_iter_storage_chunks_reads_via_fieldfile_api():
    field_file = StubFieldFile(b"abcdef" * 1000)
    chunks = list(file_watcher.iter_storage_chunks(field_file, chunk_size=1024))
    assert b"".join(chunks) == b"abcdef" * 1000


def test_managed_media_temp_path_uses_storage_localizer(monkeypatch, tmp_path):
    managed_path = tmp_path / "managed.mp4"
    managed_path.write_bytes(b"ciphertext-placeholder")
    field_file = StubFieldFile(b"payload", suffix=".mp4")

    class _Localizer:
        def __init__(self, path: Path):
            self.path = path

        def __enter__(self):
            return self.path

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(
        file_watcher,
        "ensure_local_file",
        lambda _field_file, suffix=None: _Localizer(managed_path),
    )

    with file_watcher.managed_media_temp_path(field_file, suffix=".mp4") as local_path:
        assert local_path == managed_path


def test_intake_import_services_reject_non_intake_paths(tmp_path):
    outside_path = tmp_path / "outside.mp4"
    with tempfile.TemporaryDirectory() as _:
        try:
            file_watcher.intake_video_import_service.import_from_intake(
                file_path=outside_path,
                center_key="center",
                processor_name="processor",
            )
        except ValueError as exc:
            assert "non-intake video path" in str(exc)
        else:
            raise AssertionError("expected intake video import to reject outside path")

        try:
            file_watcher.intake_report_import_service.import_from_intake(
                file_path=outside_path.with_suffix(".pdf"),
                center_key="center",
            )
        except ValueError as exc:
            assert "non-intake report path" in str(exc)
        else:
            raise AssertionError("expected intake report import to reject outside path")


def test_handler_process_report_delegates_to_shared_hub_ingest(monkeypatch, tmp_path):
    handler = file_watcher.AutoProcessingHandler()
    report_path = file_watcher.INTAKE_REPORT_DIR / "delegated-report.pdf"
    report_path.write_bytes(b"%PDF-1.4 delegated report")

    center = SimpleNamespace(center_key=handler.default_center_key)
    upload_job = SimpleNamespace(is_complete=True, id="job-1")

    monkeypatch.setattr(handler, "_resolve_default_center", lambda: center)
    monkeypatch.setattr(
        file_watcher,
        "process_watcher_file",
        lambda **kwargs: (
            kwargs["file_path"] == report_path
            and kwargs["file_type"] == "report"
            and kwargs["center"] is center
            and kwargs["source_system"] == "watcher"
            and upload_job
        ),
    )

    try:
        handler._process_report(report_path)
        # Hub ingest owns source cleanup. A file now at this path could be a
        # new arrival and must not be deleted again by the watcher.
        assert report_path.exists()
        assert str(report_path) in handler.processed_files
    finally:
        report_path.unlink(missing_ok=True)


def test_handler_process_report_defers_not_ready_source(monkeypatch):
    handler = file_watcher.AutoProcessingHandler()
    report_path = file_watcher.INTAKE_REPORT_DIR / "not-ready-report.pdf"
    report_path.write_bytes(b"%PDF-1.4 partial report")
    center = SimpleNamespace(center_key=handler.default_center_key)

    monkeypatch.setattr(handler, "_resolve_default_center", lambda: center)
    monkeypatch.setattr(
        file_watcher,
        "process_watcher_file",
        lambda **kwargs: (_ for _ in ()).throw(
            file_watcher.WatcherFileNotReadyError("not stable")
        ),
    )

    try:
        handler._process_report(report_path)
        assert report_path.exists()
        assert str(report_path) not in handler.processed_files
        assert str(report_path) not in handler.in_flight_files
    finally:
        report_path.unlink(missing_ok=True)


@pytest.mark.parametrize("complete", [False, True])
def test_handler_process_video_delegates_to_shared_hub_ingest(
    monkeypatch, tmp_path, complete
):
    handler, _ = make_handler(monkeypatch)
    monkeypatch.setattr(file_watcher, "INTAKE_VIDEO_DIR", tmp_path)
    video_path = tmp_path / "delegated-video.mp4"
    video_path.write_bytes(b"original input")
    center = SimpleNamespace(center_key=handler.default_center_key)
    calls = []

    def ingest_video(**kwargs):
        calls.append(kwargs)
        # A new arrival after backend handoff belongs to the next import.
        video_path.write_bytes(b"next input")
        return SimpleNamespace(
            is_complete=complete,
            is_successful=complete,
            id="job-1",
            status="anonymized" if complete else "processing",
            refresh_from_db=lambda **kwargs: None,
        )

    monkeypatch.setattr(handler, "_resolve_default_center", lambda: center)
    monkeypatch.setattr(handler, "_check_video_storage_capacity", lambda path: True)
    monkeypatch.setattr(file_watcher, "process_watcher_file", ingest_video)
    with patch(
        "endoreg_db.services.video_files.temporal_inference.dispatch_video_temporal_inference"
    ) as dispatch:
        handler._process_file(str(video_path))
    dispatch.assert_not_called()
    assert calls == [
        {
            "file_path": video_path,
            "file_type": "video",
            "center": center,
            "processor_name": handler.default_processor,
            "prediction_model_name": handler.default_model,
            "source_system": "watcher",
        }
    ]
    assert video_path.read_bytes() == b"next input"
    assert handler.in_flight_files == set()


@pytest.mark.parametrize("kind", ["report", "video", "preanonymized"])
def test_not_ready_source_can_be_scanned_again(monkeypatch, tmp_path, kind):
    root_name = {
        "report": "INTAKE_REPORT_DIR",
        "video": "INTAKE_VIDEO_DIR",
        "preanonymized": "INTAKE_PREANONYMIZED_DIR",
    }[kind]
    monkeypatch.setattr(file_watcher, root_name, tmp_path)
    handler, _ = make_handler(monkeypatch)
    source = tmp_path / ("input.mp4" if kind == "video" else "input.txt")
    source.write_bytes(b"partial input")
    monkeypatch.setattr(handler, "_resolve_default_center", lambda: object())
    monkeypatch.setattr(handler, "_check_video_storage_capacity", lambda path: True)

    def not_ready(**kwargs):
        raise file_watcher.WatcherFileNotReadyError("still writing")

    monkeypatch.setattr(file_watcher, "process_watcher_file", not_ready)
    monkeypatch.setattr(file_watcher, "process_preanonymized_watcher_file", not_ready)
    handler._process_file(str(source))
    assert source.read_bytes() == b"partial input"
    assert str(source) not in handler.processed_files
    assert handler.in_flight_files == set()


def test_scripts_file_watcher_compatibility_exports_handoff_helpers():
    assert file_watcher.is_in_progress_handoff_path("video.mp4.part.123")
    assert file_watcher.WatcherFileNotReadyError is not None


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("suffix", "content_type"), [("pdf", "application/pdf"), ("txt", "text/plain")]
)
def test_process_watcher_file_creates_upload_job_for_report(
    monkeypatch, tmp_path, suffix, content_type
):
    center = Center.objects.create(name="Watcher Test Center")
    report_path = tmp_path / f"watcher-report.{suffix}"
    report_path.write_bytes(b"%PDF-1.4 watcher report")

    monkeypatch.setattr(
        "endoreg_db.tasks.process_upload_job.apply_async",
        lambda *args, **kwargs: SimpleNamespace(id="watcher-report-task"),
    )

    upload_job = process_watcher_file(
        file_path=report_path,
        file_type="report",
        center=center,
    )

    db_job = UploadJob.objects.get(id=upload_job.pk)
    assert db_job.content_type == content_type
    assert db_job.source_center_id == center.pk
    assert db_job.ingest_mode == UploadJob.IngestMode.WATCHER
    assert db_job.source_system == "watcher"
    assert db_job.storage_tier == UploadJob.StorageTier.UPLOAD_WATCHER
    assert db_job.status == UploadJob.Status.PROCESSING
    assert db_job.processing_provenance["entrypoint"] == "watcher"
    assert db_job.processing_provenance["file_type"] == "report"
    assert db_job.processing_provenance["watcher_processing_path"] == str(report_path)
    assert db_job.processing_provenance["processing_handoff"] == "celery"
    assert report_path.exists() is False


@pytest.mark.django_db
def test_watcher_and_api_upload_jobs_share_core_ingest_expectations(
    monkeypatch, tmp_path
):
    center = Center.objects.create(name="Shared Center")
    report_path = tmp_path / "shared-report.pdf"
    report_path.write_bytes(b"%PDF-1.4 watcher shared report")

    monkeypatch.setattr(
        "endoreg_db.tasks.process_upload_job.apply_async",
        lambda *args, **kwargs: SimpleNamespace(id="watcher-shared-task"),
    )

    watcher_job = process_watcher_file(
        file_path=report_path,
        file_type="report",
        center=center,
    )

    api_job = UploadJob.objects.create(
        file="upload_api/test.pdf",
        content_type="application/pdf",
        source_center=center,
        source_system="api-test",
        ingest_mode=UploadJob.IngestMode.API,
        storage_class=UploadJob.StorageClass.INGEST,
        storage_tier=UploadJob.StorageTier.UPLOAD_API,
        retention_policy=UploadJob.RetentionPolicy.PRESERVE_SOURCE,
        processing_provenance={"entrypoint": "api"},
    )

    assert watcher_job.source_center_id == api_job.source_center_id
    assert (
        watcher_job.storage_class
        == api_job.storage_class
        == UploadJob.StorageClass.INGEST
    )
    assert watcher_job.source_center.center_key == api_job.source_center.center_key
    assert watcher_job.processing_provenance["entrypoint"] == "watcher"
    assert api_job.processing_provenance["entrypoint"] == "api"


@pytest.mark.django_db
def test_process_watcher_file_reuses_completed_job_for_same_video_content(
    monkeypatch, tmp_path, master_key
):
    center = Center.objects.create(name="Dedup Center")
    first_path = tmp_path / "first.mp4"
    second_path = tmp_path / "renamed.mp4"
    payload = b"same-video-content"
    atomic_write_file(
        destination=first_path,
        content=(payload,),
        required_bytes=len(payload),
    )
    atomic_write_file(
        destination=second_path,
        content=(payload,),
        required_bytes=len(payload),
    )
    monkeypatch.setattr(
        "endoreg_db.tasks.process_upload_job.apply_async",
        lambda *args, **kwargs: SimpleNamespace(id="watcher-video-task"),
    )

    first_job = process_watcher_file(
        file_path=first_path,
        file_type="video",
        center=center,
        processor_name="processor",
    )
    second_job = process_watcher_file(
        file_path=second_path,
        file_type="video",
        center=center,
        processor_name="processor",
    )

    assert first_job.pk == second_job.pk
    assert UploadJob.objects.count() == 1
    assert second_path.exists() is False
