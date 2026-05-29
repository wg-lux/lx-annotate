"""
File watcher service packaged with the lx_annotate Django app.
"""

from __future__ import annotations

import glob
import logging
import os
import shutil
import threading
import time
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Iterator, Set

import requests
from django.core.exceptions import ObjectDoesNotExist
from watchdog.events import (
    DirCreatedEvent,
    FileCreatedEvent,
    FileMovedEvent,
    FileSystemEventHandler,
    DirMovedEvent,
)
from watchdog.observers import Observer
from django.db.models import Q
from django.db.models.fields.files import FieldFile
from endoreg_db.models import Center, EndoscopyProcessor, LabelVideoSegment, VideoFile
from endoreg_db.services.environment_readiness import assert_environment_readiness
from endoreg_db.services.hub.ingest import (
    process_preanonymized_watcher_file,
    process_watcher_file,
    UploadProvenance,
)
import endoreg_db.utils.filesystem.paths as path_utils
from endoreg_db.utils.storage import ensure_local_file
from endoreg_db.exceptions import InsufficientStorageError
from endoreg_db.models.media.video.create_from_file import (
    check_storage_capacity,
)

LOG_DIR = path_utils.LOG_DIR
LOG_DIR.mkdir(parents=True, exist_ok=True)
MANAGED_VAULT_ROOT = path_utils.STORAGE_DIR.resolve()

INTAKE_VIDEO_DIR = path_utils.WATCHER_VIDEO_DROP_DIR
INTAKE_REPORT_DIR = path_utils.WATCHER_REPORT_DROP_DIR
INTAKE_PREANONYMIZED_DIR = path_utils.WATCHER_PREANONYMIZED_DROP_DIR


storage_root_global = path_utils.STORAGE_DIR
storage_root_report_sensitive = path_utils.SENSITIVE_REPORT_DIR
storage_root_video_sensitive = path_utils.SENSITIVE_VIDEO_DIR


def _setup_ffmpeg() -> None:
    """Ensure FFmpeg binaries are available in PATH."""
    for binary in ("ffmpeg", "ffprobe"):
        if shutil.which(binary):
            continue

        for pattern in (
            f"/nix/store/*/bin/{binary}",
            f"/usr/bin/{binary}",
            f"/usr/local/bin/{binary}",
        ):
            matches = glob.glob(pattern)
            if not matches:
                continue

            bin_dir = Path(matches[0]).parent
            current_path = os.environ.get("PATH", "")
            if str(bin_dir) not in current_path:
                os.environ["PATH"] = f"{bin_dir}:{current_path}"
            break


_setup_ffmpeg()

logging.basicConfig(
    level=getattr(logging, os.getenv("WATCHER_LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / "file_watcher.log"),
    ],
)

logging.getLogger("watchdog").setLevel(logging.WARNING)
logging.getLogger("watchdog.observers").setLevel(logging.WARNING)
logging.getLogger("watchdog.observers.inotify_buffer").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

processing_stack_preloaded = False


def _preload_processing_stack() -> None:
    """
    Import signal-sensitive modules before watcher workers run.

    tesserocr imports cysignals, which installs Python signal handlers during
    module initialization. That import must happen on the main interpreter
    thread; otherwise OCR processing fails later inside FileProcessor.
    """
    global processing_stack_preloaded
    if processing_stack_preloaded:
        return
    if threading.current_thread() is not threading.main_thread():
        raise RuntimeError("Processing stack must be initialized from the main thread.")

    try:
        from lx_anonymizer.frame_cleaner import FrameCleaner
        from lx_anonymizer.report_reader import ReportReader
        import tesserocr
    except ImportError as exc:
        logger.warning(
            "Report OCR dependency could not be preloaded: %s. "
            "Report imports may fail until lx-anonymizer dependencies are available.",
            exc,
        )
        return

    _ = (FrameCleaner, ReportReader, tesserocr)
    processing_stack_preloaded = True
    logger.info("Report OCR dependencies initialized on main thread")


def _is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        return False
    return True


def is_intake_path(path: str | Path) -> bool:
    candidate = Path(path).resolve()
    return any(
        _is_relative_to(candidate, root)
        for root in (
            INTAKE_VIDEO_DIR,
            INTAKE_REPORT_DIR,
            INTAKE_PREANONYMIZED_DIR,
        )
    )


def is_managed_vault_path(path: str | Path) -> bool:
    candidate = Path(path).resolve()
    if is_intake_path(candidate):
        return False
    return _is_relative_to(candidate, MANAGED_VAULT_ROOT)


def iter_storage_chunks(
    field_file: FieldFile, *, chunk_size: int = 1024 * 1024
) -> Iterator[bytes]:
    """
    Yield managed-media bytes through Django's storage API.

    This must be used for vault media instead of raw ``open()`` so encrypted
    storage backends can transparently decrypt.
    """
    field_file.open("rb")
    try:
        for chunk in field_file.chunks(chunk_size=chunk_size):
            yield chunk
    finally:
        field_file.close()


@contextmanager
def managed_media_temp_path(
    field_file: FieldFile, *, suffix: str | None = None
) -> Iterator[Path]:
    """
    Materialize managed media into a short-lived plaintext temp file.

    Use this only for legacy binaries that require an on-disk path. The source
    bytes are read via the storage backend, not with raw filesystem I/O.
    """
    with ensure_local_file(field_file, suffix=suffix) as local_path:
        yield local_path


def _has_prediction_segments(video_file: VideoFile) -> bool:
    video_pk = getattr(video_file, "pk", None)
    if video_pk is None:
        return False

    try:
        return (
            LabelVideoSegment.objects.filter(video_file=video_file)
            .filter(Q(prediction_meta__isnull=False) | Q(source__name="prediction"))
            .exists()
        )
    except Exception as exc:
        logger.warning(
            "Could not check prediction segments for video %s: %s",
            getattr(video_file, "video_hash", video_pk),
            exc,
        )
        return False


def _prediction_sequences_have_ranges(video_file: VideoFile) -> bool | None:
    sequences = getattr(video_file, "sequences", None)
    if not isinstance(sequences, dict):
        return None
    return any(bool(sequence_list) for sequence_list in sequences.values())


def _prediction_pipeline_complete(video_file: VideoFile) -> bool:
    try:
        state = getattr(video_file, "state", None)
    except Exception:
        state = None

    if state is None:
        get_state = getattr(video_file, "get_or_create_state", None)
        if callable(get_state):
            try:
                state = get_state()
            except Exception as exc:
                logger.warning(
                    "Could not resolve video state for %s: %s",
                    getattr(video_file, "video_hash", "<unknown>"),
                    exc,
                )
                return False

    initial_prediction_completed = getattr(state, "initial_prediction_completed", False)
    lvs_created = getattr(state, "lvs_created", False)
    has_prediction_segments = _has_prediction_segments(video_file)

    if not (initial_prediction_completed and lvs_created):
        return False

    if has_prediction_segments:
        return True

    has_prediction_ranges = _prediction_sequences_have_ranges(video_file)
    if has_prediction_ranges is False:
        logger.info(
            "Video %s completed prediction with no segment ranges to materialize.",
            getattr(video_file, "video_hash", getattr(video_file, "pk", "<unknown>")),
        )
        return True

    logger.warning(
        "Video %s has lvs_created=True but no prediction LabelVideoSegment rows. "
        "Treating prediction pipeline as incomplete so pipe_1 can materialize rows for the KI segment view.",
        getattr(video_file, "video_hash", getattr(video_file, "pk", "<unknown>")),
    )
    return False


def _resolve_center_by_key(center_key: str) -> Center:
    center = Center.objects.filter(center_key=center_key).first()
    if center is None:
        raise ValueError(f"Unknown center_key for watcher ingest: {center_key}")
    return center


def _resolve_center_reference(center_reference: str) -> Center:
    normalized_reference = str(center_reference or "").strip()
    if not normalized_reference:
        raise ValueError("Watcher default center reference must not be empty")

    center = Center.objects.filter(center_key=normalized_reference).first()
    if center is not None:
        return center

    center = Center.objects.filter(name=normalized_reference).first()
    if center is not None:
        logger.warning(
            "Resolved LX_ANNOTATE_DEFAULT_CENTER via center name fallback; prefer center_key: %s",
            normalized_reference,
        )
        return center

    raise ValueError(
        "Unknown LX_ANNOTATE_DEFAULT_CENTER value for watcher ingest: "
        f"{normalized_reference}"
    )


def _normalize_center_reference(center_reference: str) -> str:
    normalized_reference = str(center_reference or "").strip()
    if not normalized_reference:
        raise ValueError("Watcher default center reference must not be empty")
    return normalized_reference


def _video_has_sensitive_meta(video_file: VideoFile) -> bool:
    if getattr(video_file, "sensitive_meta_id", None) is not None:
        return True
    try:
        return getattr(video_file, "sensitive_meta", None) is not None
    except ObjectDoesNotExist:
        return False


class IntakeVideoImportService:
    """
    Compatibility shim for tests and legacy callers.

    The actual watcher path now delegates to the shared hub ingest service.
    """

    def import_from_intake(
        self,
        *,
        file_path: Path,
        center_key: str,
        processor_name: str,
        retry: bool = False,
    ):
        if retry:
            logger.debug(
                "Retry flag ignored by watcher compatibility shim for %s", file_path
            )
        if not is_intake_path(file_path):
            raise ValueError(f"Refusing to import non-intake video path: {file_path}")
        center = _resolve_center_by_key(center_key)
        return process_watcher_file(
            file_path=file_path,
            file_type="video",
            center=center,
            processor_name=processor_name,
            source_system="watcher",
        )


class IntakeReportImportService:
    """
    Compatibility shim for tests and legacy callers.
    """

    def import_from_intake(
        self,
        *,
        file_path: Path,
        center_key: str,
        retry: bool = False,
    ):
        if retry:
            logger.debug(
                "Retry flag ignored by watcher compatibility shim for %s", file_path
            )
        if not is_intake_path(file_path):
            raise ValueError(f"Refusing to import non-intake report path: {file_path}")
        center = _resolve_center_by_key(center_key)
        return process_watcher_file(
            file_path=file_path,
            file_type="report",
            center=center,
            source_system="watcher",
        )


intake_video_import_service = IntakeVideoImportService()
intake_report_import_service = IntakeReportImportService()


def unload_ollama_model(model_name: str = "llama3.2:1b") -> None:
    """Request Ollama to unload the model immediately."""
    try:
        requests.post(
            "http://localhost:11434/api/chat",
            json={"model": model_name, "keep_alive": 0},
            timeout=2,
        )
        logger.info("Requested immediate VRAM release for model: %s", model_name)
    except Exception as exc:
        logger.warning(
            "Failed to unload Ollama model (VRAM might not be freed): %s", exc
        )


def should_ignore_file(file_path: str | Path) -> bool:
    """Skip internal/temporary files and quarantine paths."""
    p = Path(file_path)
    if p.suffix == ".lock":
        return True
    if any(part == "_processing" for part in p.parts):
        return True
    if p.name.startswith(".") or p.name.startswith("~"):
        return True
    return False


class AutoProcessingHandler(FileSystemEventHandler):
    """Handle file-system events for automatic processing of videos and reports."""

    def __init__(self) -> None:
        super().__init__()
        self.processed_files: Set[str] = set()
        self.in_flight_files: Set[str] = set()
        self.files_lock = threading.Lock()
        self.video_extensions = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"}
        self.report_extensions = {".pdf"}
        self.pseudonymized_extensions = {".pdf", ".mp4"}

        configured_default_center = os.getenv(
            "LX_ANNOTATE_DEFAULT_CENTER",
            "university_hospital_wuerzburg",
        )
        # Keep handler construction side-effect free for file watcher tests and
        # lazy service wiring. Resolve the configured center only at ingest time.
        self.default_center_reference = _normalize_center_reference(
            configured_default_center
        )
        self.default_center_key = self.default_center_reference
        self.default_processor = "olympus_cv_1500"
        self.default_model = "image_multilabel_classification_colonoscopy_default"

        self.executor = ThreadPoolExecutor(
            max_workers=1, thread_name_prefix="FileProcessor"
        )
        self.pseudonymized_dir = INTAKE_PREANONYMIZED_DIR

        logger.info("AutoProcessingHandler initialized")
        logger.info("Monitoring video extensions: %s", self.video_extensions)
        logger.info("Monitoring report extensions: %s", self.report_extensions)
        logger.info(
            "Monitoring pseudonymized extensions: %s", self.pseudonymized_extensions
        )
        logger.info(
            "Default watcher center reference: %s", self.default_center_reference
        )
        logger.info("Pseudonymized intake directory: %s", self.pseudonymized_dir)

    def _resolve_default_center(self) -> Center:
        try:
            return _resolve_center_by_key(self.default_center_key)
        except ValueError:
            return _resolve_center_reference(self.default_center_reference)

    def dispatch(self, event):  # type: ignore[override]
        if event.is_directory:
            return
        if hasattr(event, "event_type") and event.event_type in {"opened", "closed"}:
            return

        src_path = str(event.src_path)
        dest_path = getattr(event, "dest_path", None)
        if should_ignore_file(src_path):
            return
        if dest_path and should_ignore_file(dest_path):
            return

        path = Path(src_path)
        if (
            path.name.startswith(".")
            or path.name.startswith("~")
            or "tmp" in str(path)
            or "transcoding" in str(path)
        ):
            return

        super().dispatch(event)

    def on_created(self, event: DirCreatedEvent | FileCreatedEvent):
        if isinstance(event, FileCreatedEvent) and not event.is_directory:
            self._submit_file(str(event.src_path))

    def on_moved(self, event: DirMovedEvent | FileMovedEvent) -> None:
        if isinstance(event, FileMovedEvent) and not event.is_directory:
            self._submit_file(str(event.dest_path))

    def _ensure_processing_slot(self, file_path: str) -> bool:
        with self.files_lock:
            if file_path in self.processed_files or file_path in self.in_flight_files:
                return False
            self.in_flight_files.add(file_path)
            return True

    def _release_processing_slot(self, file_path: str) -> None:
        with self.files_lock:
            self.in_flight_files.discard(file_path)

    def _mark_processed(self, file_path: str) -> None:
        with self.files_lock:
            self.processed_files.add(file_path)

    def _unmark_processed(self, file_path: str) -> None:
        with self.files_lock:
            self.processed_files.discard(file_path)

    def _submit_file(self, file_path: str) -> None:
        if not self._ensure_processing_slot(file_path):
            logger.debug("Skipping duplicate file event: %s", file_path)
            return
        self.executor.submit(self._process_file, file_path)

    def _process_file(self, file_path: str) -> None:
        path_key = str(Path(file_path))
        path = Path(file_path)

        try:
            with self.files_lock:
                if path_key in self.processed_files:
                    logger.debug("File already processed: %s", path_key)
                    return
                if path_key not in self.in_flight_files:
                    self.in_flight_files.add(path_key)

            if should_ignore_file(path):
                logger.debug("Skipping ignored file: %s", path)
                return

            if not self._wait_for_file_stable(path):
                logger.warning("File not stable after waiting: %s", path)
                return

            file_extension = path.suffix.lower()
            parent_dir = path.parent.resolve()
            logger.debug("Parent: %s", parent_dir)

            if (
                parent_dir == INTAKE_VIDEO_DIR
                and file_extension in self.video_extensions
            ):
                logger.info("New video detected: %s", path)
                self._process_video(path)
            elif (
                parent_dir == INTAKE_REPORT_DIR
                and file_extension in self.report_extensions
            ):
                logger.info("New report detected: %s", path)
                self._process_report(path)
            elif (
                parent_dir == self.pseudonymized_dir
                and file_extension in self.pseudonymized_extensions
            ):
                logger.info("New pseudonymized file detected: %s", path)
                self._process_pseudonymized(path)
            else:
                logger.debug("Ignoring file (wrong type/location): %s", path)
        except Exception as exc:
            logger.error("Error processing file %s: %s", file_path, exc, exc_info=True)
        finally:
            self._release_processing_slot(path_key)

    def _wait_for_file_stable(
        self,
        path: Path,
        timeout: int = 900,
        stable_checks_required: int = 10,
        interval: float = 2.0,
    ) -> bool:
        if not path.exists() or should_ignore_file(path):
            return False

        last_size = -1
        stable_checks = 0
        deadline = time.monotonic() + timeout

        while time.monotonic() < deadline:
            try:
                current_size = path.stat().st_size
            except OSError as exc:
                logger.debug("Error checking file size for %s: %s", path, exc)
                time.sleep(interval)
                continue

            if current_size <= 0:
                stable_checks = 0
            elif current_size == last_size:
                stable_checks += 1
                if stable_checks >= stable_checks_required:
                    logger.info("File stable: %s (%s bytes)", path, current_size)
                    return True
            else:
                stable_checks = 0
                last_size = current_size
                logger.debug("File still changing: %s (%s bytes)", path, current_size)

            time.sleep(interval)

        logger.warning("Timed out waiting for stable file: %s", path)
        return False

    def _process_video(self, video_path: Path) -> None:
        try:
            logger.info("Starting video processing: %s", video_path)
            self._mark_processed(str(video_path))
            if not is_intake_path(video_path):
                raise ValueError(
                    f"Video path is outside plaintext intake zone: {video_path}"
                )

            try:
                check_storage_capacity(video_path, Path(storage_root_global))
            except InsufficientStorageError as storage_error:
                logger.error(
                    "Insufficient storage space for %s: %s",
                    video_path,
                    storage_error,
                )
                self._unmark_processed(str(video_path))
                return
            except Exception as storage_error:
                logger.warning(
                    "Storage check failed, proceeding anyway: %s", storage_error
                )

            try:
                source_center = self._resolve_default_center()
                upload_job = process_watcher_file(
                    file_path=video_path,
                    file_type="video",
                    center=source_center,
                    processor_name=self.default_processor,
                    prediction_model_name=self.default_model,
                    source_system="watcher",
                )
                upload_job.refresh_from_db(
                    fields=[
                        "status",
                        "sensitive_meta",
                        "content_hash",
                        "processing_provenance",
                        "error_detail",
                    ]
                )
                if not upload_job.is_complete:
                    logger.info(
                        "Watcher upload job handed off for async ingest: %s status=%s",
                        upload_job.id,
                        upload_job.status,
                    )
                    return
                if not upload_job.is_successful:
                    logger.warning(
                        "Watcher upload job did not complete successfully for %s: "
                        "job=%s status=%s error=%s",
                        video_path,
                        upload_job.id,
                        upload_job.status,
                        upload_job.error_detail,
                    )
                    return

                video_hash = str(getattr(upload_job, "content_hash", "") or "").strip()
                if not video_hash:
                    provenance: UploadProvenance = (
                        getattr(upload_job, "processing_provenance", None) or {}
                    )
                    video_hash = str(provenance.get("content_hash", "")).strip()
                video_file = (
                    VideoFile.objects.filter(video_hash=video_hash).first()
                    if video_hash
                    else None
                )
                if video_file is None:
                    logger.warning(
                        "Watcher upload job completed but no VideoFile could be resolved for %s",
                        video_path,
                    )
                    return
                if not _video_has_sensitive_meta(video_file):
                    if getattr(upload_job, "sensitive_meta_id", None) is not None:
                        logger.warning(
                            "SensitiveMeta was created for upload job %s but is not "
                            "linked to VideoFile %s",
                            upload_job.id,
                            video_file.video_hash,
                        )
                    else:
                        logger.warning(
                            "Video imported but no SensitiveMeta created: %s",
                            video_file.video_hash,
                        )
                logger.info(
                    "Video imported through shared hub ingest: %s",
                    video_file.video_hash,
                )
            except Exception as import_error:
                error_msg = str(import_error)
                if (
                    "Insufficient storage" in error_msg
                    or "No space left on device" in error_msg
                ):
                    logger.error(
                        "Storage error during import for %s: %s",
                        video_path,
                        import_error,
                    )
                    self._unmark_processed(str(video_path))
                    return
                logger.error("Import failed for %s: %s", video_path, import_error)
                self._unmark_processed(str(video_path))
                return
            if video_file and getattr(video_file, "pk", None):
                if not video_path.exists():
                    if _prediction_pipeline_complete(video_file):
                        logger.info(
                            "Video %s already has completed prediction segments. "
                            "Bypassing AI pipeline.",
                            video_hash,
                        )
                        return
                    logger.info(
                        "Watcher source for video %s was cleaned up after ingest; "
                        "queuing AI pipeline.",
                        video_hash,
                    )
                try:
                    from endoreg_db.models import AiModel
                    from endoreg_db.services.video_temporal_inference import (
                        dispatch_video_temporal_inference,
                    )

                    ai_model = AiModel.objects.get(name=self.default_model)
                    model_meta = ai_model.get_latest_version()
                    dispatch_result = dispatch_video_temporal_inference(
                        video_id=video_file.pk,
                        model_meta_id=model_meta.pk,
                        replace_prediction_segments=True,
                        delete_frames_after=True,
                    )
                    logger.info(
                        "Video segmentation queued for %s on %s queue: "
                        "task=%s history=%s status=%s",
                        video_file.video_hash,
                        dispatch_result.queue,
                        dispatch_result.task_id,
                        dispatch_result.history_id,
                        dispatch_result.status,
                    )
                except Exception as exc:
                    logger.error(
                        "Error queuing video segmentation: %s", exc, exc_info=True
                    )

            logger.info("Video processing completed: %s", video_path)
            if video_path.exists():
                logger.info("Source video still exists: %s", video_path)
                video_path.unlink()
        except Exception as exc:
            error_msg = str(exc)
            logger.error(
                "Error processing video %s: %s", video_path, error_msg, exc_info=True
            )
            if any(
                phrase in error_msg.lower()
                for phrase in ["insufficient storage", "no space left", "disk full"]
            ):
                logger.warning(
                    "Storage error for %s, will retry when space is available",
                    video_path,
                )
                self._unmark_processed(str(video_path))
                return
            logger.warning("Removing %s from processed set due to error", video_path)
            self._unmark_processed(str(video_path))

    def _process_report(self, report_path: Path) -> None:
        try:
            logger.info("Starting report processing: %s", report_path)
            self._mark_processed(str(report_path))
            if not is_intake_path(report_path):
                raise ValueError(
                    f"Report path is outside plaintext intake zone: {report_path}"
                )

            try:
                storage_root_path = storage_root_report_sensitive
                storage_root_path.mkdir(parents=True, exist_ok=True)
                if not storage_root_path.exists():
                    raise InsufficientStorageError(
                        f"Storage root does not exist: {storage_root_path}"
                    )

                source_center = self._resolve_default_center()
                upload_job = process_watcher_file(
                    file_path=report_path,
                    file_type="report",
                    center=source_center,
                    source_system="watcher",
                )
                if upload_job.is_complete:
                    logger.info(
                        "Report imported through shared hub ingest: %s",
                        upload_job.id,
                    )
                    try:
                        if report_path.exists():
                            report_path.unlink()
                    except Exception as exc:
                        logger.error(
                            "Error removing report file %s: %s", report_path, exc
                        )
                else:
                    logger.info(
                        "Report import skipped (already being processed): %s",
                        report_path,
                    )
                    self._unmark_processed(str(report_path))
            except InsufficientStorageError as storage_error:
                logger.error(
                    "Insufficient storage space for %s: %s", report_path, storage_error
                )
                self._unmark_processed(str(report_path))
            except Exception as import_error:
                logger.error(
                    "report import failed for %s: %s", report_path, import_error
                )
                self._unmark_processed(str(report_path))
        except Exception as exc:
            logger.error(
                "Error processing report %s: %s", report_path, exc, exc_info=True
            )
            self._unmark_processed(str(report_path))

    def _process_pseudonymized(self, file_path: Path) -> None:
        try:
            logger.info("Starting pseudonymized processing: %s", file_path)
            self._mark_processed(str(file_path))
            if not is_intake_path(file_path):
                raise ValueError(
                    f"Pseudonymized path is outside plaintext intake zone: {file_path}"
                )
            process_preanonymized_watcher_file(file_path=file_path)
            logger.info("Pseudonymized processing completed: %s", file_path)
        except Exception as exc:
            logger.error(
                "Error processing pseudonymized file %s: %s",
                file_path,
                exc,
                exc_info=True,
            )
            self._unmark_processed(str(file_path))

    def shutdown(self) -> None:
        logger.info("Shutting down file processor threads...")
        self.executor.shutdown(wait=True)
        logger.info("File processor threads shut down")


class FileWatcherService:
    """Main service class for file watching and automatic processing."""

    def __init__(self) -> None:
        self.observer = Observer()
        self.handler = AutoProcessingHandler()
        self.video_dir = INTAKE_VIDEO_DIR
        self.report_dir = INTAKE_REPORT_DIR
        self.pseudonymized_dir = self.handler.pseudonymized_dir

        self.video_dir.mkdir(parents=True, exist_ok=True)
        self.report_dir.mkdir(parents=True, exist_ok=True)
        self.pseudonymized_dir.mkdir(parents=True, exist_ok=True)

        logger.info("Video directory: %s", self.video_dir)
        logger.info("report directory: %s", self.report_dir)
        logger.info("Pseudonymized directory: %s", self.pseudonymized_dir)
        logger.info("Using observer: %s", type(self.observer).__name__)

    def start(self) -> None:
        try:
            self._validate_django_setup()
            self.observer.schedule(self.handler, str(self.video_dir), recursive=False)
            self.observer.schedule(self.handler, str(self.report_dir), recursive=False)
            self.observer.schedule(
                self.handler, str(self.pseudonymized_dir), recursive=False
            )
            self.observer.start()
            logger.info("File watcher service started successfully")
            logger.info("Monitoring: %s", self.video_dir)
            logger.info("Monitoring: %s", self.report_dir)
            logger.info("Monitoring: %s", self.pseudonymized_dir)
            self.handler.executor.submit(self._process_existing_files)

            try:
                while True:
                    time.sleep(10)
                    self._health_check()
                    self._process_existing_files()
            except KeyboardInterrupt:
                logger.info("Received shutdown signal")
        except Exception as exc:
            logger.error("Error starting file watcher service: %s", exc, exc_info=True)
            raise
        finally:
            self.stop()

    def process_existing_once(self) -> int:
        """
        Drain files already present in the intake directories, then exit.

        This mode is intended for maintenance/timer execution: any file left in
        the plaintext intake directories is retried on the next run, while the
        main web service does not have to compete with a resident watcher.
        """
        try:
            self._validate_django_setup()
            return self._process_existing_files()
        except Exception as exc:
            logger.error(
                "Error processing existing watcher files: %s", exc, exc_info=True
            )
            raise
        finally:
            self.handler.shutdown()

    def stop(self) -> None:
        if self.observer.is_alive():
            self.observer.stop()
            self.observer.join()
            logger.info("File watcher service stopped")
        self.handler.shutdown()

    def _validate_django_setup(self) -> None:
        from django.db import connection

        connection.ensure_connection()
        assert_environment_readiness()
        Center.objects.first()
        EndoscopyProcessor.objects.first()
        logger.info("Django setup validation successful")

    def _process_existing_files(self) -> int:
        # Only log if we actually find files we haven't seen yet
        new_files_found = False
        submitted_count = 0

        for video_file in self.video_dir.glob("*"):
            if (
                video_file.is_file()
                and video_file.suffix.lower() in self.handler.video_extensions
            ):
                path_str = str(video_file)
                if (
                    path_str in self.handler.processed_files
                    or path_str in self.handler.in_flight_files
                ):
                    continue

                if not new_files_found:
                    logger.info("Processing existing files...")
                    new_files_found = True

                logger.info("Processing existing video: %s", video_file)
                self.handler._submit_file(path_str)
                submitted_count += 1

        for report_file in self.report_dir.glob("*"):
            if (
                report_file.is_file()
                and report_file.suffix.lower() in self.handler.report_extensions
            ):
                path_str = str(report_file)
                if (
                    path_str in self.handler.processed_files
                    or path_str in self.handler.in_flight_files
                ):
                    continue

                if not new_files_found:
                    logger.info("Processing existing files...")
                    new_files_found = True

                logger.info("Processing existing report: %s", report_file)
                self.handler._submit_file(path_str)
                submitted_count += 1

        for pseudonymized_file in self.pseudonymized_dir.glob("*"):
            if (
                pseudonymized_file.is_file()
                and pseudonymized_file.suffix.lower()
                in self.handler.pseudonymized_extensions
            ):
                path_str = str(pseudonymized_file)
                if (
                    path_str in self.handler.processed_files
                    or path_str in self.handler.in_flight_files
                ):
                    continue

                if not new_files_found:
                    logger.info("Processing existing files...")
                    new_files_found = True

                logger.info(
                    "Processing existing pseudonymized file: %s", pseudonymized_file
                )
                self.handler._submit_file(path_str)
                submitted_count += 1

        if new_files_found:
            logger.info("Existing files processing completed")

        return submitted_count

    def _health_check(self) -> None:
        if not self.observer.is_alive():
            logger.error("Observer thread died, restarting...")
            self.observer = Observer()
            self.observer.schedule(self.handler, str(self.video_dir), recursive=False)
            self.observer.schedule(self.handler, str(self.report_dir), recursive=False)
            self.observer.schedule(
                self.handler, str(self.pseudonymized_dir), recursive=False
            )
            self.observer.start()

        try:
            storage_root = storage_root_global
            if storage_root.exists():
                total, used, free = shutil.disk_usage(storage_root)
                free_gb = free / (1024**3)
                total_gb = total / (1024**3)
                usage_percent = (used / total) * 100
                logger.debug(
                    "Storage: %.1f GB free of %.1f GB (%.1f%% used)",
                    free_gb,
                    total_gb,
                    usage_percent,
                )
                if free_gb < 5.0:
                    logger.warning("Storage space running low: %.1f GB free", free_gb)
                elif usage_percent > 90:
                    logger.warning("Storage usage high: %.1f%% used", usage_percent)
        except Exception as exc:
            logger.debug("Storage check failed: %s", exc)


def run_file_watcher(*, process_existing_once: bool = False) -> None:
    logger.info("Starting File Watcher Service")
    logger.info("Django settings: %s", os.environ.get("DJANGO_SETTINGS_MODULE"))
    _preload_processing_stack()
    service = FileWatcherService()
    if process_existing_once:
        submitted_count = service.process_existing_once()
        logger.info(
            "File watcher processed existing intake files once: submitted=%s",
            submitted_count,
        )
        return
    service.start()
