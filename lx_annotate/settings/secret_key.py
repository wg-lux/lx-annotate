from __future__ import annotations

import os
from pathlib import Path

from django.core.management.utils import get_random_secret_key
from endoreg_db.utils.file_operations import atomic_write_file

HOME_DIR = Path(os.getenv("HOME_DIR", str(Path.home())))


def get_or_create_development_secret_key() -> str:
    """
    Return a persistent local key for an explicitly configured development setup.

    Production settings never call this helper: their key must be supplied through
    DJANGO_SECRET_KEY or DJANGO_SECRET_KEY_FILE.
    """
    if os.getenv("DJANGO_SECRET_KEY_FILE"):
        return ""
    secret_file = HOME_DIR / "secret.key"

    if secret_file.exists():
        key = secret_file.read_text(encoding="utf-8").strip()
        if len(key) >= 32:
            return key

    new_key = get_random_secret_key()
    encoded_key = new_key.encode("utf-8")
    atomic_write_file(
        destination=secret_file,
        content=(encoded_key,),
        required_bytes=len(encoded_key),
        file_mode=0o600,
        dir_mode=0o700,
    )
    return new_key
