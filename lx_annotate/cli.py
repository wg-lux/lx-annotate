from __future__ import annotations

import os
import shlex
import sys
from collections.abc import Callable, Sequence

DEFAULT_DJANGO_SETTINGS_MODULE = "lx_annotate.settings.settings_prod"
CELERY_APP = "lx_annotate.celery:app"
ASGI_APPLICATION = "lx_annotate.asgi:application"


def _command_args(argv: Sequence[str] | None = None) -> list[str]:
    return list(sys.argv[1:] if argv is None else argv)


def _set_default_django_settings() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", DEFAULT_DJANGO_SETTINGS_MODULE)


def _run_with_argv(
    program_name: str,
    args: Sequence[str],
    main: Callable[[], int | None],
) -> int:
    original_argv = sys.argv
    sys.argv = [program_name, *args]
    try:
        return int(main() or 0)
    finally:
        sys.argv = original_argv


def _normalise_worker_args(args: Sequence[str]) -> list[str]:
    normalised: list[str] = []
    for arg in args:
        if arg == "--queue":
            normalised.append("--queues")
        elif arg.startswith("--queue="):
            normalised.append("--queues=" + arg.split("=", 1)[1])
        else:
            normalised.append(arg)
    return normalised


def _normalise_watch_args(args: Sequence[str]) -> list[str]:
    return ["--process-existing-once" if arg == "--once" else arg for arg in args]


def web(argv: Sequence[str] | None = None) -> int:
    _set_default_django_settings()

    from daphne.cli import CommandLineInterface  # type: ignore[import-not-found]

    args = _command_args(argv)
    daphne_args = [
        "-b",
        os.environ.get("DJANGO_HOST", "0.0.0.0"),
        "-p",
        os.environ.get("DJANGO_PORT", "8000"),
        *args,
        ASGI_APPLICATION,
    ]
    CommandLineInterface().run(daphne_args)
    return 0


def manage(argv: Sequence[str] | None = None) -> int:
    _set_default_django_settings()

    from django.core.management import execute_from_command_line

    execute_from_command_line(["lx-annotate-manage", *_command_args(argv)])
    return 0


def migrate(argv: Sequence[str] | None = None) -> int:
    args = _command_args(argv)
    if "--noinput" not in args and "--no-input" not in args:
        args = ["--noinput", *args]
    return manage(["migrate", *args])


def load_base_data(argv: Sequence[str] | None = None) -> int:
    return manage(["load_base_db_data", *_command_args(argv)])


def export_frames(argv: Sequence[str] | None = None) -> int:
    args = _command_args(argv)
    has_output_path = any(
        arg == "--output-path" or arg.startswith("--output-path=") for arg in args
    )
    if not has_output_path:
        storage_dir = os.environ.get("STORAGE_DIR") or os.path.join(
            os.environ.get("LX_ANNOTATE_ENCRYPTED_DATA_DIR", "data"),
            "storage",
        )
        output_dir = os.environ.get(
            "LX_ANNOTATE_EXPORT_FRAMES_OUTPUT_DIR",
            os.path.join(storage_dir, "export", "frames"),
        )
        os.makedirs(output_dir, exist_ok=True)
        args = ["--output-path", output_dir, *args]
    return manage(["export_frame_annot", *args])


def import_sap(argv: Sequence[str] | None = None) -> int:
    return manage(["import_sap_ish_zip", *_command_args(argv)])


def _run_celery(program_name: str, args: Sequence[str]) -> int:
    _set_default_django_settings()

    from celery.bin.celery import main as celery_main

    return _run_with_argv(
        program_name,
        ["-A", CELERY_APP, *args],
        celery_main,
    )


def celery(argv: Sequence[str] | None = None) -> int:
    return _run_celery("lx-annotate-celery", _command_args(argv))


def worker(argv: Sequence[str] | None = None) -> int:
    args = _normalise_worker_args(_command_args(argv))
    if not any(
        arg == "-l" or arg == "--loglevel" or arg.startswith("--loglevel=")
        for arg in args
    ):
        args = [f"--loglevel={os.environ.get('CELERY_LOG_LEVEL', 'INFO')}", *args]
    return _run_celery("lx-annotate-worker", ["worker", *args])


def watch(argv: Sequence[str] | None = None) -> int:
    env_args = shlex.split(os.environ.get("LX_ANNOTATE_FILEWATCHER_ARGS", ""))
    args = _normalise_watch_args([*env_args, *_command_args(argv)])
    return manage(["run_filewatcher", *args])
