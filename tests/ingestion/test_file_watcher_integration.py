# pyright: reportAttributeAccessIssue=false, reportArgumentType=false, reportOptionalMemberAccess=false
from watchdog.events import FileCreatedEvent, FileMovedEvent  # type: ignore[import-not-found]

import scripts.file_watcher as file_watcher
import tempfile
from pathlib import Path
from types import SimpleNamespace

import pytest
from endoreg_db.models import (
    Center,
    InformationSource,
    Label,
    LabelType,
    LabelVideoSegment,
    UploadJob,
    VideoFile,
)
from endoreg_db.services.hub.ingest import process_watcher_file
from endoreg_db.utils.file_operations import atomic_write_file


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

    monkeypatch.setattr(handler, "_wait_for_file_stable", lambda path: False)

    handler.on_created(FileCreatedEvent(str(video_path)))
    assert len(executor.submissions) == 1
    assert str(video_path) in handler.in_flight_files

    fn, args, kwargs = executor.submissions.pop()
    fn(*args, **kwargs)

    assert str(video_path) not in handler.in_flight_files

    handler.on_moved(FileMovedEvent(str(tmp_path / "renamed.mp4"), str(video_path)))

    assert len(executor.submissions) == 1
    assert str(video_path) in handler.in_flight_files


def test_processed_file_is_not_submitted_again(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    video_path = tmp_path / "video.mp4"
    handler.processed_files.add(str(video_path))

    handler.on_created(FileCreatedEvent(str(video_path)))

    assert executor.submissions == []
    assert str(video_path) not in handler.in_flight_files


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
    upload_job = SimpleNamespace(is_successful=True, id="job-1")

    monkeypatch.setattr(file_watcher, "_resolve_center_by_key", lambda key: center)
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
    finally:
        report_path.unlink(missing_ok=True)


def test_handler_process_report_defers_not_ready_source(monkeypatch):
    handler = file_watcher.AutoProcessingHandler()
    report_path = file_watcher.INTAKE_REPORT_DIR / "not-ready-report.pdf"
    report_path.write_bytes(b"%PDF-1.4 partial report")
    center = SimpleNamespace(center_key=handler.default_center_key)

    monkeypatch.setattr(file_watcher, "_resolve_center_by_key", lambda key: center)
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


def test_handler_process_video_delegates_to_shared_hub_ingest(monkeypatch, tmp_path):
    handler = file_watcher.AutoProcessingHandler()
    video_path = file_watcher.INTAKE_VIDEO_DIR / "delegated-video.mp4"
    video_path.write_bytes(b"video-bytes")

    center = SimpleNamespace(center_key=handler.default_center_key)
    upload_job = SimpleNamespace(
        content_hash="video-hash",
        processing_provenance={"content_hash": "video-hash"},
    )
    video_file = SimpleNamespace(
        video_hash="video-hash",
        sensitive_meta=None,
        active_raw_file=None,
        pipe_1=lambda **kwargs: True,
    )

    monkeypatch.setattr(file_watcher, "_resolve_center_by_key", lambda key: center)
    monkeypatch.setattr(
        file_watcher,
        "process_watcher_file",
        lambda **kwargs: (
            kwargs["file_path"] == video_path
            and kwargs["file_type"] == "video"
            and kwargs["center"] is center
            and kwargs["processor_name"] == handler.default_processor
            and kwargs["source_system"] == "watcher"
            and upload_job
        ),
    )
    monkeypatch.setattr(
        file_watcher.VideoFile.objects,
        "filter",
        lambda **kwargs: SimpleNamespace(first=lambda: video_file),
    )
    monkeypatch.setattr(file_watcher, "unload_ollama_model", lambda model_name: None)

    try:
        handler._process_video(video_path)
    finally:
        video_path.unlink(missing_ok=True)


def test_scripts_file_watcher_compatibility_exports_handoff_helpers():
    assert file_watcher.is_in_progress_handoff_path("video.mp4.part.123")
    assert file_watcher.WatcherFileNotReadyError is not None


@pytest.mark.django_db
def test_prediction_pipeline_complete_requires_materialized_prediction_segments():
    center = Center.objects.create(name="Watcher Prediction Center")
    video = VideoFile.objects.create(center=center, video_hash="watcher-pred-ranges")
    state = video.get_or_create_state()
    state.initial_prediction_completed = True
    state.lvs_created = True
    state.save(update_fields=["initial_prediction_completed", "lvs_created"])
    video.sequences = {"outside": [(1, 4)]}
    video.save(update_fields=["sequences"])

    assert file_watcher._prediction_pipeline_complete(video) is False

    label_type = LabelType.objects.create(name="watcher-video")
    label = Label.objects.create(name="outside", label_type=label_type)
    prediction_source, _ = InformationSource.objects.get_or_create(name="prediction")
    LabelVideoSegment.objects.create(
        video_file=video,
        label=label,
        start_frame_number=1,
        end_frame_number=4,
        source=prediction_source,
    )

    assert file_watcher._prediction_pipeline_complete(video) is True


@pytest.mark.django_db
def test_prediction_pipeline_complete_allows_empty_prediction_result():
    center = Center.objects.create(name="Watcher Empty Prediction Center")
    video = VideoFile.objects.create(center=center, video_hash="watcher-pred-empty")
    state = video.get_or_create_state()
    state.initial_prediction_completed = True
    state.lvs_created = True
    state.save(update_fields=["initial_prediction_completed", "lvs_created"])
    video.sequences = {}
    video.save(update_fields=["sequences"])

    assert file_watcher._prediction_pipeline_complete(video) is True


@pytest.mark.django_db
def test_process_watcher_file_creates_upload_job_for_report(monkeypatch, tmp_path):
    center = Center.objects.create(name="Watcher Test Center")
    report_path = tmp_path / "watcher-report.pdf"
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
