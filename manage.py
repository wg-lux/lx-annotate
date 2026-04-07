#!/usr/bin/env python3
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

sys.path.insert(0, "/home/admin/dev/lx-annotate/libs/endoreg-db")

DEV_SETTINGS_MODULE = "lx_annotate.settings.settings_dev"
PROD_SETTINGS_MODULE = "lx_annotate.settings.settings_prod"


def _requested_management_command(argv: list[str]) -> str:
    if len(argv) >= 2:
        return argv[1]
    return ""


def _is_truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _select_settings_module(argv: list[str]) -> str:
    """
    Keep production defaults for service/runtime, but make local runserver
    reliably use dev settings unless explicitly forced to production.
    """
    current = os.getenv("DJANGO_SETTINGS_MODULE", "").strip()
    command = _requested_management_command(argv)
    force_prod_for_runserver = _is_truthy(os.getenv("LX_ANNOTATE_RUNSERVER_USE_PROD"))
    is_production_env = os.getenv("DJANGO_ENV", "").strip().lower() == "production"

    if command == "runserver" and not force_prod_for_runserver and not is_production_env:
        if not current or current == PROD_SETTINGS_MODULE:
            return DEV_SETTINGS_MODULE

    if current:
        return current

    return PROD_SETTINGS_MODULE


os.environ["DJANGO_SETTINGS_MODULE"] = _select_settings_module(sys.argv)

from lx_annotate.settings.settings_base import BASE_DIR

default_data_dir = os.environ.get(
    "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
    os.environ.get("LX_ANNOTATE_DATA_DIR", os.environ.get("DATA_DIR", "")),
)
if not default_data_dir:
    default_data_dir = str(Path(BASE_DIR) / "data")
default_storage_dir = os.environ.get("STORAGE_DIR", str(Path(default_data_dir) / "storage"))
default_io_dir = os.environ.get("IO_DIR", default_data_dir)
os.environ.setdefault("LX_ANNOTATE_ENCRYPTED_DATA_DIR", default_data_dir)
os.environ.setdefault("LX_ANNOTATE_DATA_DIR", default_data_dir)
os.environ.setdefault("DATA_DIR", default_data_dir)
os.environ.setdefault("STORAGE_DIR", default_storage_dir)
os.environ.setdefault("IO_DIR", default_io_dir)


def main():
    """Run administrative tasks."""
    try:
        from django.core.management import execute_from_command_line

    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
