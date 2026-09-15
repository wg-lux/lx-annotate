"""Compatibility exports for the endoreg-db encrypted storage backend.

``endoreg_db.utils.encryption.encrypted`` is the source of truth.  This module
keeps the historical ``lx_annotate.storage.encrypted`` import path usable for
settings, migrations, commands, and tests.
"""

from __future__ import annotations

from endoreg_db.utils.encryption.encrypted import (  # noqa: F401
    MAGIC,
    EncryptedStorage,
    IndexCacheKey,
    IndexCacheValue,
)

__all__ = [
    "MAGIC",
    "EncryptedStorage",
    "IndexCacheKey",
    "IndexCacheValue",
]
