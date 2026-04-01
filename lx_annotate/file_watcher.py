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
from watchdog.events import FileCreatedEvent, FileMovedEvent, FileSystemEventHandler
from watchdog.observers import Observer

from endoreg_db.models import Center, EndoscopyProcessor
from endoreg_db.services.hub import process_preanonymized_watcher_file
from endoreg_db.services.report_import import ReportImportService
from endoreg_db.services.video_import import VideoImportService
from endoreg_db.utils.paths import data_paths
from endoreg_db.utils.storage import ensure_local_file

try:
    from endoreg_db.utils import data_paths as root_data_paths

    project_root = root_data_paths["project_root"]
except (ImportError, ModuleNotFoundError, KeyError):
    project_root = Path(__file__).resolve().parent.parent

PROJECT_ROOT = Path(project_root)
RUNTIME_DATA_DIR = Path(
    os.getenv(
        "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
        os.getenv(
            "LX_ANNOTATE_DATA_DIR",
            os.getenv("DATA_DIR", "/var/lib/lx-annotate/data"),
        ),
    )
)
LOG_DIR = RUNTIME_DATA_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)


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

video_import_service = VideoImportService()
report_import_service = ReportImportService()

INTAKE_VIDEO_DIR = data_paths["import_video"].resolve()
INTAKE_REPORT_DIR = data_paths["import_report"].resolve()
INTAKE_PREANONYMIZED_DIR = data_paths["import_preanonymized"].resolve()
MANAGED_VAULT_ROOT = RUNTIME_DATA_DIR.resolve()


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
    field_file, *, chunk_size: int = 1024 * 1024
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
def managed_media_temp_path(field_file, *, suffix: str | None = None) -> Iterator[Path]:
    """
    Materialize managed media into a short-lived plaintext temp file.

    Use this only for legacy binaries that require an on-disk path. The source
    bytes are read via the storage backend, not with raw filesystem I/O.
    """
    with ensure_local_file(field_file, suffix=suffix) as local_path:
        yield local_path


class IntakeVideoImportService:
    """
    Bridge from plaintext intake into the managed vault.

    Intake files are allowed to be addressed by path because they are not yet
    part of managed encrypted storage. As soon as the Django model is created,
    all further managed-media access must go through storage-backed FieldFiles.
    """

    def __init__(self, service: VideoImportService):
        self.service = service

    def import_from_intake(
        self,
        *,
        file_path: Path,
        center_name: str,
        processor_name: str,
        retry: bool = False,
    ):
        if not is_intake_path(file_path):
            raise ValueError(f"Refusing to import non-intake video path: {file_path}")
        return self.service.import_and_anonymize(
            file_path=file_path,
            center_name=center_name,
            processor_name=processor_name,
            retry=retry,
            delete_source=False,
        )


class IntakeReportImportService:
    """
    Bridge from plaintext report intake into the managed vault.
    """

    def __init__(self, service: ReportImportService):
        self.service = service

    def import_from_intake(
        self,
        *,
        file_path: Path,
        center_name: str,
        retry: bool = False,
    ):
        if not is_intake_path(file_path):
            raise ValueError(f"Refusing to import non-intake report path: {file_path}")
        return self.service.import_and_anonymize(
            file_path=file_path,
            center_name=center_name,
            retry=retry,
            delete_source=False,
        )


intake_video_import_service = IntakeVideoImportService(video_import_service)
intake_report_import_service = IntakeReportImportService(report_import_service)


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

        self.default_center = "university_hospital_wuerzburg"
        self.default_processor = "olympus_cv_1500"
        self.default_model = "image_multilabel_classification_colonoscopy_default"

        self.executor = ThreadPoolExecutor(
            max_workers=2, thread_name_prefix="FileProcessor"
        )
        self.pseudonymized_dir = INTAKE_PREANONYMIZED_DIR

        logger.info("AutoProcessingHandler initialized")
        logger.info("Monitoring video extensions: %s", self.video_extensions)
        logger.info("Monitoring report extensions: %s", self.report_extensions)
        logger.info(
            "Monitoring pseudonymized extensions: %s", self.pseudonymized_extensions
        )
        logger.info("Pseudonymized intake directory: %s", self.pseudonymized_dir)

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

    def on_created(self, event):
        if isinstance(event, FileCreatedEvent) and not event.is_directory:
            self._submit_file(str(event.src_path))

    def on_moved(self, event) -> None:
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
                parent_dir == data_paths["import_video"].resolve()
                and parent_dir == INTAKE_VIDEO_DIR
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

    def _wait_for_file_stable(self, path: Path, timeout: int = 30) -> bool:
        if not path.exists() or should_ignore_file(path):
            return False

        initial_size = -1
        stable_checks = 0
        for _ in range(timeout):
            try:
                current_size = path.stat().st_size
                if current_size == initial_size:
                    stable_checks += 1
                    if stable_checks >= 3:
                        logger.debug("File stable: %s (%s bytes)", path, current_size)
                        return True
                else:
                    stable_checks = 0
                    initial_size = current_size
                    logger.debug(
                        "File still changing: %s (%s bytes)", path, current_size
                    )
                time.sleep(1)
            except (OSError, IOError) as exc:
                logger.debug("Error checking file size: %s", exc)
                time.sleep(1)

        return False

    def _process_video(self, video_path: Path) -> None:
        try:
            logger.info("Starting video processing: %s", video_path)
            video_file = None
            self._mark_processed(str(video_path))
            if not is_intake_path(video_path):
                raise ValueError(
                    f"Video path is outside plaintext intake zone: {video_path}"
                )

            try:
                from endoreg_db.exceptions import InsufficientStorageError
                from endoreg_db.models.media.video.create_from_file import (
                    check_storage_capacity,
                )

                storage_root = os.getenv(
                    "DJANGO_DATA_DIR", str(RUNTIME_DATA_DIR / "videos")
                )
                check_storage_capacity(video_path, Path(storage_root))
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
                video_file = intake_video_import_service.import_from_intake(
                    file_path=video_path,
                    center_name=self.default_center,
                    processor_name=self.default_processor,
                    retry=False,
                )
                if video_file is None:
                    logger.info(
                        "Video import skipped (already being processed): %s", video_path
                    )
                    return
                if not video_file.sensitive_meta:
                    logger.warning(
                        "Video imported but no SensitiveMeta created: %s",
                        video_file.video_hash,
                    )
                logger.info("Video imported successfully: %s", video_file.video_hash)
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
                if "already exists" in error_msg:
                    logger.info(
                        "Video %s already exists in database, skipping", video_path
                    )
                    return
                logger.error("Import failed for %s: %s", video_path, import_error)
                self._unmark_processed(str(video_path))
                return

            if video_file and getattr(video_file, "pk", None):
                try:
                    unload_ollama_model(model_name=self.default_model)
                    active_file = getattr(video_file, "active_raw_file", None)
                    if active_file is not None:
                        with managed_media_temp_path(active_file) as _local_media_path:
                            logger.debug(
                                "Managed video staged to local temp path for legacy path-based tooling: %s",
                                _local_media_path,
                            )
                            success = video_file.pipe_1(
                                model_name=self.default_model,
                                delete_frames_after=True,
                            )
                    else:
                        success = video_file.pipe_1(
                            model_name=self.default_model, delete_frames_after=True
                        )
                    if success:
                        logger.info(
                            "Video segmentation completed: %s", video_file.video_hash
                        )
                    else:
                        logger.error(
                            "Video segmentation failed: %s", video_file.video_hash
                        )
                except Exception as exc:
                    logger.error(
                        "Error during video segmentation: %s", exc, exc_info=True
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
                from endoreg_db.exceptions import InsufficientStorageError

                storage_root = os.getenv(
                    "report_STORAGE_ROOT", str(RUNTIME_DATA_DIR / "reports")
                )
                storage_root_path = Path(storage_root)
                if not storage_root_path.is_absolute():
                    storage_root_path = PROJECT_ROOT / storage_root_path
                storage_root_path.mkdir(parents=True, exist_ok=True)
                if not storage_root_path.exists():
                    raise InsufficientStorageError(
                        f"Storage root does not exist: {storage_root_path}"
                    )

                raw_report = intake_report_import_service.import_from_intake(
                    file_path=report_path,
                    center_name=self.default_center,
                )
                if raw_report:
                    logger.info("report imported successfully: %s", raw_report.pdf_hash)
                    try:
                        if report_path.exists():
                            report_path.unlink()
                    except Exception as exc:
                        logger.error(
                            "Error removing report file %s: %s", report_path, exc
                        )
                else:
                    logger.info(
                        "report import skipped (already being processed): %s",
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
            except KeyboardInterrupt:
                logger.info("Received shutdown signal")
        except Exception as exc:
            logger.error("Error starting file watcher service: %s", exc, exc_info=True)
            raise
        finally:
            self.stop()

    def stop(self) -> None:
        if self.observer.is_alive():
            self.observer.stop()
            self.observer.join()
            logger.info("File watcher service stopped")
        self.handler.shutdown()

    def _validate_django_setup(self) -> None:
        from django.db import connection

        connection.ensure_connection()
        Center.objects.first()
        EndoscopyProcessor.objects.first()
        logger.info("Django setup validation successful")

    def _process_existing_files(self) -> None:
        logger.info("Processing existing files...")
        for video_file in self.video_dir.glob("*"):
            if (
                video_file.is_file()
                and video_file.suffix.lower() in self.handler.video_extensions
            ):
                logger.info("Processing existing video: %s", video_file)
                self.handler._process_file(str(video_file))

        for report_file in self.report_dir.glob("*"):
            if (
                report_file.is_file()
                and report_file.suffix.lower() in self.handler.report_extensions
            ):
                logger.info("Processing existing report: %s", report_file)
                self.handler._process_file(str(report_file))

        for pseudonymized_file in self.pseudonymized_dir.glob("*"):
            if (
                pseudonymized_file.is_file()
                and pseudonymized_file.suffix.lower()
                in self.handler.pseudonymized_extensions
            ):
                logger.info(
                    "Processing existing pseudonymized file: %s", pseudonymized_file
                )
                self.handler._process_file(str(pseudonymized_file))

        logger.info("Existing files processing completed")

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
            storage_root = RUNTIME_DATA_DIR / "storage" / "videos"
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


def run_file_watcher() -> None:
    logger.info("Starting File Watcher Service")
    logger.info("Project root: %s", PROJECT_ROOT)
    logger.info("Django settings: %s", os.environ.get("DJANGO_SETTINGS_MODULE"))
    FileWatcherService().start()
