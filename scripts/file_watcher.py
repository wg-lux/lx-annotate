#!/usr/bin/env python3
"""
File Watcher Service for Automatic Video and PDF Processing

This service monitors directories for new files and automatically triggers:
- Video anonymization and segmentation for files in data/raw_videos/
- PDF anonymization for files in data/raw_pdfs/

Usage:
    python scripts/file_watcher.py

Environment Variables:
    DJANGO_SETTINGS_MODULE: Django settings module (default: lx_annotate.settings.dev)
    WATCHER_LOG_LEVEL: Logging level (default: INFO)
"""

import os
import sys
import time
import logging
import subprocess
import shutil
from pathlib import Path
from typing import Set, Optional
from concurrent.futures import ThreadPoolExecutor

from torch.utils import data
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent, FileMovedEvent

try:
    from endoreg_db.utils import data_paths
    project_root = data_paths["project_root"]
except (ImportError, ModuleNotFoundError, KeyError):
    # Fallback to determining project root from file location
    project_root = Path(__file__).parent.parent

PROJECT_ROOT = project_root

# Ensure core directories exist before configuring logging or imports
LOG_DIR = PROJECT_ROOT / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Add project root to Python path
sys.path.insert(0, str(PROJECT_ROOT))

# Set Django settings before importing Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings_dev')

# Configure Django
import django
django.setup()

# Import Django models and services after setup
from django.core.management import call_command
from endoreg_db.models import VideoFile, Center, EndoscopyProcessor
from endoreg_db.services.video_import import VideoImportService
from endoreg_db.services.pdf_import import PdfImportService

video_import_service = VideoImportService()
pdf_import_service = PdfImportService()
# Ensure FFmpeg is available
def _setup_ffmpeg():
    """Ensure FFmpeg binaries are available in PATH."""
    # Common FFmpeg binary names
    ffmpeg_binaries = ['ffmpeg', 'ffprobe']
    
    for binary in ffmpeg_binaries:
        if not shutil.which(binary):
            # Try to find FFmpeg in common NixOS locations
            possible_paths = [
                f'/nix/store/*/bin/{binary}',
                f'/usr/bin/{binary}',
                f'/usr/local/bin/{binary}'
            ]
            
            for pattern in possible_paths:
                import glob
                matches = glob.glob(pattern)
                if matches:
                    # Add the directory to PATH
                    bin_dir = Path(matches[0]).parent
                    current_path = os.environ.get('PATH', '')
                    if str(bin_dir) not in current_path:
                        os.environ['PATH'] = f"{bin_dir}:{current_path}"
                        print(f"Added {bin_dir} to PATH for {binary}")
                    break
            else:
                print(f"Warning: Could not find {binary} binary")

# Setup FFmpeg before other imports
_setup_ffmpeg()

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv('WATCHER_LOG_LEVEL', 'INFO')),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / 'file_watcher.log')
    ]
)

# ⭐ FIX: Reduce watchdog logging to prevent CPU overload
logging.getLogger("watchdog").setLevel(logging.WARNING)
logging.getLogger("watchdog.observers").setLevel(logging.WARNING)
logging.getLogger("watchdog.observers.inotify_buffer").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

def should_ignore_file(file_path: str | Path) -> bool:
    """
    Central ignore helper to skip internal/temporary files and quarantine paths
    Args:
        file_path (str | Path): The file path to check.#
    """

    p = Path(file_path)
    # Ignore lock files created by import services
    if p.suffix == '.lock':
        return True
    # Ignore any files within quarantine/processing directories (PDFs and Videos)
    # e.g., data/pdfs/_processing or data/videos/_processing
    if any(part == '_processing' for part in p.parts):
        return True
    # Ignore hidden and temp files
    if p.name.startswith('.') or p.name.startswith('~'):
        return True
    return False

class AutoProcessingHandler(FileSystemEventHandler):
    """
    Handles file system events for automatic processing of videos and PDFs.
    """
    
    def __init__(self):
        super().__init__()
        self.processed_files: Set[str] = set()
        self.video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v'}
        self.pdf_extensions = {'.pdf'}
        
        self.default_center = "university_hospital_wuerzburg"
        self.default_processor = "olympus_cv_1500"
        self.default_model = "image_multilabel_classification_colonoscopy_default"
        
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="FileProcessor")
        
        logger.info("AutoProcessingHandler initialized")
        logger.info(f"Monitoring video extensions: {self.video_extensions}")
        logger.info(f"Monitoring PDF extensions: {self.pdf_extensions}")

    def dispatch(self, event):
        """⭐ FIX: Filter out noisy events to reduce CPU load."""
        # Skip directory events
        if event.is_directory:
            return
        
        # Skip opened/closed events that don't indicate actual file completion
        if hasattr(event, 'event_type') and event.event_type in {'opened', 'closed'}:
            return
            
        # Skip temp files and FFmpeg intermediate files
        if hasattr(event, 'src_path'):
            if should_ignore_file(event.src_path):
                return
            path = Path(event.src_path)
            if (path.name.startswith('.') or 
                path.name.startswith('~') or
                'tmp' in str(path) or
                'transcoding' in str(path)):
                return
        # Also check destination path for move events
        if hasattr(event, 'dest_path'):
            if should_ignore_file(event.dest_path):
                return
        
        # Continue with normal dispatch
        super().dispatch(event)

    def on_created(self, event):
        """Handle file creation events."""
        if isinstance(event, FileCreatedEvent) and not event.is_directory:
            # ⭐ FIX: Offload to thread pool instead of blocking inotify thread
            self.executor.submit(self._process_file, event.src_path)

    def on_moved(self, event) -> None:
        """Handle file move events (useful for files moved into watched directories)."""
        if isinstance(event, FileMovedEvent) and not event.is_directory:
            # ⭐ FIX: Offload to thread pool instead of blocking inotify thread
            self.executor.submit(self._process_file, event.dest_path)

    def _process_file(self, file_path: str):
        """
        Process a new file based on its location and type.
        
        Args:
            file_path: Absolute path to the file
        """
        try:
            path = Path(file_path)
            
            # NEW: Ignore internal or quarantine files early
            if should_ignore_file(path):
                logger.debug(f"Skipping ignored file: {path}")
                return
            
            # Skip if already processed
            if str(path) in self.processed_files:
                logger.debug(f"File already processed: {path}")
                return
            
            # Skip temporary or hidden files
            if path.name.startswith('.') or path.name.startswith('~'):
                logger.debug(f"Skipping temporary/hidden file: {path}")
                return
            
            # Wait for file to be completely written
            if not self._wait_for_file_stable(path):
                logger.warning(f"File not stable after waiting: {path}")
                return
            
            # Determine file type and parent directory
            file_extension = path.suffix.lower()
            parent_dir = path.parent.name
            
            if parent_dir == 'raw_videos' and file_extension in self.video_extensions:
                logger.info(f"New video detected: {path}")
                
                self._process_video(path)
            elif parent_dir == 'raw_pdfs' and file_extension in self.pdf_extensions:
                logger.info(f"New PDF detected: {path}")
                self._process_pdf(path)
            else:
                logger.debug(f"Ignoring file (wrong type/location): {path}")
                
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}", exc_info=True)

    def _wait_for_file_stable(self, path: Path, timeout: int = 30) -> bool:
        """
        Wait for a file to be completely written (stable size).
        
        Args:
            path: Path to the file
            timeout: Maximum time to wait in seconds
            
        Returns:
            True if file is stable, False if timeout reached
        """
        if not path.exists():
            return False
        
        # NEW: Ignore quarantine and lock files immediately
        if should_ignore_file(path):
            return False
            
        initial_size = -1
        stable_checks = 0
        required_stable_checks = 3  # File must be stable for 3 consecutive checks
        
        for _ in range(timeout):
            try:
                current_size = path.stat().st_size
                
                if current_size == initial_size:
                    stable_checks += 1
                    if stable_checks >= required_stable_checks:
                        logger.debug(f"File stable: {path} ({current_size} bytes)")
                        return True
                else:
                    stable_checks = 0
                    initial_size = current_size
                    logger.debug(f"File still changing: {path} ({current_size} bytes)")
                
                time.sleep(1)
                
            except (OSError, IOError) as e:
                logger.debug(f"Error checking file size: {e}")
                time.sleep(1)
        
        return False

    def _process_video(self, video_path: Path):
        """
        Process a video file: import, anonymize, and segment with improved error handling.
        
        Args:
            video_path: Path to the video file
        """
        try:
            logger.info(f"Starting video processing: {video_path}")
            
            # Mark as processed to avoid duplicate processing
            self.processed_files.add(str(video_path))
            
            # Early storage capacity check
            try:
                from endoreg_db.exceptions import InsufficientStorageError
                from endoreg_db.models.media.video.create_from_file import check_storage_capacity
                storage_root = os.getenv('DJANGO_DATA_DIR', str(PROJECT_ROOT / 'data' / 'videos'))
                check_storage_capacity(video_path, storage_root)
            except InsufficientStorageError as storage_error:
                logger.error(f"Insufficient storage space for {video_path}: {storage_error}")
                # Don't mark as processed - allow retry when space is available
                self.processed_files.discard(str(video_path))
                # Set status to indicate storage issue
                return
            except Exception as storage_error:
                logger.warning(f"Storage check failed, proceeding anyway: {storage_error}")
            
            # Import and anonymize video
            try:
                video_file = video_import_service.import_and_anonymize(
                    file_path=video_path,
                    center_name=self.default_center,
                    processor_name=self.default_processor,
                    save_video=True,
                    delete_source=False,
                )
                
                if not video_file.sensitive_meta:
                    logger.warning(f"Video imported but no SensitiveMeta created: {video_file.uuid}")
                

                logger.info(f"Video imported successfully: {video_file.uuid}")
                
            except Exception as import_error:
                error_msg = str(import_error)
                
                # Handle specific error types
                if "Insufficient storage" in error_msg or "No space left on device" in error_msg:
                    logger.error(f"Storage error during import for {video_path}: {import_error}")
                    self.processed_files.discard(str(video_path))
                    return
                elif "already exists" in error_msg:
                    logger.info(f"Video {video_path} already exists in database, skipping")
                    return
                else:
                    logger.error(f"Import failed for {video_path}: {import_error}")
                    self.processed_files.discard(str(video_path))
                    return
            
            # Run segmentation if video was imported successfully
            if video_file and video_file.pk:
                try:
                    if not Path("./data/model_weights").exists():
                        Path("./data/model_weights").mkdir(parents=True, exist_ok=True)
                    if not Path("./data/model_weights/colo_segmentation_RegNetX800MF_6.ckpt").exists():
                        subprocess.run(['cp', './libs/endoreg-db/tests/assets/colo_segmentation_RegNetX800MF_6.ckpt', './data/model_weights/'])

                    success = video_file.pipe_1(
                        model_name=self.default_model,
                        delete_frames_after=True
                    )
                    
                    if success:
                        logger.info(f"Video segmentation completed: {video_file.uuid}")

                    else:
                        logger.error(f"Video segmentation failed: {video_file.uuid}")
                        
                except Exception as e:
                    logger.error(f"Error during video segmentation: {str(e)}", exc_info=True)
            
            logger.info(f"Video processing completed: {video_path}")
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error processing video {video_path}: {error_msg}", exc_info=True)
            
            # Handle specific error types
            if any(phrase in error_msg.lower() for phrase in ["insufficient storage", "no space left", "disk full"]):
                logger.warning(f"Storage error for {video_path}, will retry when space is available")
                # Don't mark as processed - allow retry
                self.processed_files.discard(str(video_path))
                # TODO: Implement exponential backoff retry mechanism
                return
            else:
                # For other errors, remove from processed set to allow retry
                logger.warning(f"Removing {video_path} from processed set due to error")
                self.processed_files.discard(str(video_path))
    
    def _process_pdf(self, pdf_path: Path):
        """
        Process a PDF file: import and anonymize with improved error handling.
        
        Args:
            pdf_path: Path to the PDF file
        """
        try:
            logger.info(f"Starting PDF processing: {pdf_path}")
            
            # Mark as processed to avoid duplicate processing
            self.processed_files.add(str(pdf_path))
            
            
            # Early storage capacity check
            try:
                from endoreg_db.exceptions import InsufficientStorageError
                storage_root = os.getenv('PDF_STORAGE_ROOT', str(PROJECT_ROOT / 'data' / 'pdfs'))
                storage_root = Path(storage_root)
                if not storage_root.is_absolute():
                    storage_root = PROJECT_ROOT / storage_root
                if not storage_root.exists():
                    storage_root.mkdir(parents=True, exist_ok=True)
                # Check if storage root exists and has enough space
                MIN_REQUIRED_SPACE = 100 * 1024 * 1024  # 100 MB minimum
                if not storage_root.exists():
                    raise InsufficientStorageError(f"Storage root does not exist: {storage_root}")
                
                pdf_import_service.check_storage_capacity(pdf_path, storage_root, MIN_REQUIRED_SPACE)
                
                # Import and anonymize PDF
                raw_pdf = pdf_import_service.import_and_anonymize(
                    file_path=pdf_path,
                    center_name=self.default_center,
                    delete_source=False
                )
                
                if raw_pdf:
                    logger.info(f"PDF imported successfully: {raw_pdf.pdf_hash}")
                else:
                    logger.info(f"PDF import skipped (already being processed): {pdf_path}")
                    # Remove from our local processed set since it was handled elsewhere
                    self.processed_files.discard(str(pdf_path))
                    return
                
            except InsufficientStorageError as storage_error:
                logger.error(f"Insufficient storage space for {pdf_path}: {storage_error}")
                # Don't mark as processed - allow retry when space is available
                self.processed_files.discard(str(pdf_path))
                return
            except Exception as import_error:
                logger.error(f"PDF import failed for {pdf_path}: {import_error}")
                self.processed_files.discard(str(pdf_path))
                return
            
        except Exception as e:
            logger.error(f"Error processing pdf {pdf_path}: {str(e)}", exc_info=True)
            self.processed_files.discard(str(pdf_path))
            return
                
    def shutdown(self):
        """Shutdown the thread pool executor."""
        logger.info("Shutting down file processor threads...")
        self.executor.shutdown(wait=True)
        logger.info("File processor threads shut down")


class FileWatcherService:
    """
    Main service class for file watching and automatic processing.
    """
    
    def __init__(self) -> None:
        self.observer = Observer()
        self.handler = AutoProcessingHandler()
        
        # Define watched directories
        self.video_dir = PROJECT_ROOT / 'data' / 'raw_videos'
        self.pdf_dir = PROJECT_ROOT / 'data' / 'raw_pdfs'
        
        # Ensure directories exist
        self.video_dir.mkdir(parents=True, exist_ok=True)
        self.pdf_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Video directory: {self.video_dir}")
        logger.info(f"PDF directory: {self.pdf_dir}")
        logger.info(f"Using observer: {type(self.observer).__name__}")

    def start(self):
        """Start the file watcher service."""
        try:
            # Validate Django setup
            self._validate_django_setup()
            
            # Schedule without ignore_patterns (not supported by watchdog)
            self.observer.schedule(
                self.handler,
                str(self.video_dir),
                recursive=False
            )
            
            self.observer.schedule(
                self.handler,
                str(self.pdf_dir),
                recursive=False
            )
            
            # Start observer
            self.observer.start()
            logger.info("File watcher service started successfully")
            logger.info(f"Monitoring: {self.video_dir}")
            logger.info(f"Monitoring: {self.pdf_dir}")
            
            # Process any existing files on startup (in background)
            self.handler.executor.submit(self._process_existing_files)
            
            # Keep service running
            try:
                while True:
                    time.sleep(10)
                    self._health_check()
            except KeyboardInterrupt:
                logger.info("Received shutdown signal")
            
        except Exception as e:
            logger.error(f"Error starting file watcher service: {str(e)}", exc_info=True)
            raise
        finally:
            self.stop()

    def stop(self):
        """Stop the file watcher service."""
        if self.observer.is_alive():
            self.observer.stop()
            self.observer.join()
            logger.info("File watcher service stopped")
        
        # ⭐ FIX: Shutdown thread pool
        self.handler.shutdown()

    def _validate_django_setup(self):
        """Validate that Django is properly configured."""
        try:
            # Test database connection
            from django.db import connection
            connection.ensure_connection()
            
            # Validate required models exist
            Center.objects.first()
            EndoscopyProcessor.objects.first()
            
            logger.info("Django setup validation successful")
            
        except Exception as e:
            logger.error(f"Django setup validation failed: {str(e)}")
            raise

    def _process_existing_files(self):
        """Process any files that already exist in the watched directories."""
        logger.info("Processing existing files...")
        
        # Process existing videos
        for video_file in self.video_dir.glob('*'):
            if video_file.is_file() and video_file.suffix.lower() in self.handler.video_extensions:
                logger.info(f"Processing existing video: {video_file}")
                self.handler._process_file(str(video_file))
        
        # Process existing PDFs
        for pdf_file in self.pdf_dir.glob('*'):
            if pdf_file.is_file() and pdf_file.suffix.lower() in self.handler.pdf_extensions:
                logger.info(f"Processing existing PDF: {pdf_file}")
                self.handler._process_file(str(pdf_file))
        
        logger.info("Existing files processing completed")

    def _health_check(self):
        """Perform periodic health checks."""
        if not self.observer.is_alive():
            logger.error("Observer thread died, restarting...")
            self.observer = Observer()
            # Re-schedule monitoring
            self.observer.schedule(
                self.handler,
                str(self.video_dir),
                recursive=False
            )
            self.observer.schedule(
                self.handler,
                str(self.pdf_dir),
                recursive=False
            )
            self.observer.start()
        
        # Check storage space periodically
        try:
            import shutil
            storage_root = PROJECT_ROOT / 'storage' / 'videos'
            if storage_root.exists():
                total, used, free = shutil.disk_usage(storage_root)
                free_gb = free / (1024**3)
                total_gb = total / (1024**3)
                usage_percent = (used / total) * 100
                
                logger.debug(f"Storage: {free_gb:.1f} GB free of {total_gb:.1f} GB ({usage_percent:.1f}% used)")
                
                # Warning thresholds
                if free_gb < 5.0:  # Less than 5GB free
                    logger.warning(f"Storage space running low: {free_gb:.1f} GB free")
                elif usage_percent > 90:  # More than 90% used
                    logger.warning(f"Storage usage high: {usage_percent:.1f}% used")
                    
        except Exception as e:
            logger.debug(f"Storage check failed: {e}")

    # ...existing code...
def main():
    """Main entry point for the file watcher service."""
    logger.info("Starting File Watcher Service")
    logger.info(f"Project root: {PROJECT_ROOT}")
    logger.info(f"Django settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    
    try:
        service = FileWatcherService()
        service.start()
    except Exception as e:
        logger.error(f"Service failed: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()