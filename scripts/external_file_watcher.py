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
    VIDEO_DIR,
    RAW_PDF_DIR,
    ANONYM_VIDEO_DIR,
    PDF_DIR,
)

CHECK_INTERVAL = 2  # seconds between done checks


class WatchHandler(FileSystemEventHandler):
    def __init__(self, source_dir, processing_dir, done_dir, label):
        super().__init__()
        self.source_dir = source_dir
        self.processing_dir = processing_dir
        self.done_dir = done_dir
        self.label = label
        self.current_file = None

    def on_created(self, event):
        if event.is_directory:
            return
        self._try_start_next()

    def _try_start_next(self):
        """Move next file if nothing is currently processing."""
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
        """Poll the DONE folder to detect when the current file is done."""
        if not self.current_file:
            return

        done_files = set(os.listdir(self.done_dir))
        if self.current_file in done_files:
            print(f"[{self.label}] {self.current_file} is done. Moving next...")
            self.current_file = None
            self._try_start_next()


def run_watcher(source_dir, processing_dir, done_dir, label):
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
    video_source = os.path.join(IMPORT_DIR, "videos")
    video_processing = RAW_VIDEO_DIR  # or os.path.join(STORAGE_DIR, "processing_videos")
    video_done = ANONYM_VIDEO_DIR

    # PDF watcher
    pdf_source = os.path.join(IMPORT_DIR, "pdfs")
    pdf_processing = RAW_PDF_DIR
    # TODO: CHANGE TO ANONYMIZED PDF DIRECTORY WHEN AVAILABLE
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
