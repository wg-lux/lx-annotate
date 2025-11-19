#!/usr/bin/env python3
import os
import time
import shutil
import threading
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from endoreg_db.utils.paths import (
    IMPORT_DIR,
    RAW_VIDEO_DIR,
    RAW_PDF_DIR,
    ANONYM_VIDEO_DIR,
    PDF_DIR,
)

CHECK_INTERVAL = 2  # seconds between done checks


class WatchHandler(FileSystemEventHandler):
    def __init__(
        self,
        source_dir: str,
        processing_dir: str,
        done_dir: str,
        label: str
    ):
        """
        Initialize a WatchHandler to coordinate moving files from a source directory into processing and to detect when processing is completed.
        
        Parameters:
            source_dir (str): Path to the directory where new files appear to be picked up.
            processing_dir (str): Path to the directory where files are moved for processing.
            done_dir (str): Path to the directory checked to determine when a file's processing is complete.
            label (str): Short label used in log messages to identify this watcher.
        
        Initial state:
            current_file is set to None to indicate no file is currently being processed.
        """
        super().__init__()
        self.source_dir = source_dir
        self.processing_dir = processing_dir
        self.done_dir = done_dir
        self.label = label
        self.current_file = None

    def on_created(self, event):
        """
        Handle a filesystem creation event by initiating processing of the next available file when the event is for a file.
        
        Parameters:
            event: The filesystem event object (e.g., from watchdog). If `event.is_directory` is True, the event is ignored.
        """
        if event.is_directory:
            return
        self._try_start_next()

    def _try_start_next(self):
        """
        Move the next available file from the source directory into the processing directory and mark it as the current file.
        
        If a file is already marked as processing or there are no regular files in the source directory, this method does nothing. On success, the first file (sorted by name) found in the source directory is moved to the processing directory and stored in `self.current_file`.
        """
        if self.current_file is not None:
            return  # still processing

        files = sorted(
            f for f in os.listdir(self.source_dir)
            if os.path.isfile(os.path.join(self.source_dir, f))
        )
        if not files:
            return

        next_file = files[0]
        src_path = os.path.join(self.source_dir, next_file)
        dst_path = os.path.join(self.processing_dir, next_file)

        print(f"[{self.label}] Moving {next_file} → processing...")
        shutil.move(src_path, dst_path)
        self.current_file = next_file

    def check_done(self):
        """
        Check whether the handler's current file is present in the done directory and, if so, mark it complete and begin processing the next file.
        
        If a current file exists and a file with the same name is found in the done directory, this method resets the handler's `current_file` to None and attempts to start the next available file.
        """
        if not self.current_file:
            return

        done_files = set(os.listdir(self.done_dir))
        if self.current_file in done_files:
            print(f"[{self.label}] {self.current_file} is done. Moving next...")
            self.current_file = None
            self._try_start_next()


def run_watcher(source_dir: str, processing_dir: str, done_dir: str, label: str):
    """
    Start a filesystem watcher that processes files from a source directory one at a time.
    
    Ensures the source, processing, and done directories exist, starts a non-recursive observer on source_dir, and repeatedly checks the done directory at CHECK_INTERVAL to advance to the next file. The watcher runs until interrupted (KeyboardInterrupt), at which point the observer is stopped and joined.
    
    Parameters:
        source_dir (str): Directory to monitor for newly arrived files.
        processing_dir (str): Directory where the watcher moves a file to be processed.
        done_dir (str): Directory whose contents indicate completed processing of a file.
        label (str): Short label used in log/output messages to identify this watcher.
    """
    os.makedirs(source_dir, exist_ok=True)
    os.makedirs(processing_dir, exist_ok=True)
    os.makedirs(done_dir, exist_ok=True)

    handler = WatchHandler(source_dir, processing_dir, done_dir, label)
    observer = Observer()
    observer.schedule(handler, source_dir, recursive=False)
    observer.start()

    print(f"[WATCHING] {label}: {source_dir} → processing one file at a time.")
    try:
        while True:
            handler.check_done()
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


def main():
    # Video watcher
    """
    Start two filesystem watchers (video and PDF) in background threads and block until interrupted.
    
    The function configures source, processing, and done directories for videos and PDFs, starts a daemon watcher thread for each using run_watcher, prints a status message, and keeps the main thread sleeping until a KeyboardInterrupt triggers shutdown logging.
    """
    video_source = os.path.join(IMPORT_DIR, "videos")
    video_processing = RAW_VIDEO_DIR  # or os.path.join(STORAGE_DIR, "processing_videos")
    video_done = ANONYM_VIDEO_DIR

    # PDF watcher
    pdf_source = os.path.join(IMPORT_DIR, "pdfs")
    pdf_processing = RAW_PDF_DIR
    #TODO: CHANGE TO ANONYMIZED PDF DIRECTORY WHEN AVAILABLE
    pdf_done = PDF_DIR

    # Run both watchers concurrently
    threads = [
        threading.Thread(
            target=run_watcher,
            args=(video_source, video_processing, video_done, "VIDEO"),
            daemon=True,
        ),
        threading.Thread(
            target=run_watcher,
            args=(pdf_source, pdf_processing, pdf_done, "PDF"),
            daemon=True,
        ),
    ]

    for t in threads:
        t.start()

    print("[INFO] Watching both video and PDF directories.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[EXIT] Stopping all watchers...")


if __name__ == "__main__":
    main()