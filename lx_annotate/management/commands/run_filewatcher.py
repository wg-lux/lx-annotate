from __future__ import annotations

import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile

from django.core.files import File
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError


def process_intake_file(
    intake_file: str | Path,
    *,
    storage_backend=None,
    target_name: str | None = None,
) -> str:
    """
    Move a plaintext intake file into managed storage.

    The intake file is allowed to be a raw filesystem path because it lives in the
    plaintext intake zone. Once saved through Django storage, the original intake
    file is deleted.
    """
    storage = storage_backend or default_storage
    intake_path = Path(intake_file)
    if not intake_path.exists():
        raise FileNotFoundError(f"Intake file not found: {intake_path}")

    destination_name = target_name or intake_path.name
    with intake_path.open("rb") as handle:
        saved_name = storage.save(destination_name, File(handle, name=destination_name))

    intake_path.unlink(missing_ok=False)
    return saved_name


def stream_managed_file_chunks(
    storage_name: str,
    *,
    storage_backend=None,
    chunk_size: int = 1024 * 1024,
):
    """
    Yield decrypted managed-media chunks without performing unbounded reads.
    """
    storage = storage_backend or default_storage
    with storage.open(storage_name, "rb") as handle:
        for chunk in handle.chunks(chunk_size):
            yield chunk


def extract_frames_with_ffmpeg(
    storage_name: str,
    *,
    storage_backend=None,
    ffmpeg_args: list[str] | None = None,
) -> None:
    """
    Materialize managed media into a short-lived temp file for FFmpeg.
    """
    storage = storage_backend or default_storage
    suffix = Path(storage_name).suffix or ".bin"
    with NamedTemporaryFile(
        prefix="lx_annotate_tmp_",
        suffix=suffix,
        delete=False,
    ) as tmp_file:
        tmp_path = Path(tmp_file.name)
        try:
            for chunk in stream_managed_file_chunks(
                storage_name,
                storage_backend=storage,
            ):
                tmp_file.write(chunk)
            tmp_file.flush()

            command = ["ffmpeg", "-i", str(tmp_path)]
            if ffmpeg_args:
                command.extend(ffmpeg_args)
            subprocess.run(command, check=True)
        finally:
            tmp_path.unlink(missing_ok=True)


class Command(BaseCommand):
    help = "Run the lx-annotate file watcher service."

    def add_arguments(self, parser):
        parser.add_argument(
            "--log-level",
            dest="log_level",
            default=None,
            help="Override WATCHER_LOG_LEVEL for this process.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate watcher bootstrap in headless mode without starting the observer loop.",
        )
        parser.add_argument(
            "--iterations",
            type=int,
            default=None,
            help="Compatibility flag for test-mode headless execution.",
        )
        parser.add_argument(
            "--process-existing-once",
            action="store_true",
            help=(
                "Process files already present in the watcher intake directories "
                "and exit instead of running the resident observer loop."
            ),
        )

    def handle(self, *args, **options):
        log_level = options.get("log_level")
        if log_level:
            import os

            os.environ["WATCHER_LOG_LEVEL"] = str(log_level)

        from lx_annotate.file_watcher import run_file_watcher

        if options.get("dry_run"):
            self.stdout.write(self.style.SUCCESS("File watcher dry-run completed"))
            return

        process_existing_once = bool(options.get("process_existing_once"))
        if process_existing_once:
            self.stdout.write(
                self.style.SUCCESS("Processing existing watcher files once")
            )
        else:
            self.stdout.write(self.style.SUCCESS("Starting file watcher service"))
        try:
            run_file_watcher(process_existing_once=process_existing_once)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("File watcher interrupted"))
        except Exception as exc:
            raise CommandError(str(exc)) from exc
