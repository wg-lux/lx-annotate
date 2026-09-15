"""Compatibility exports for the endoreg-db encryption implementation.

The ciphertext format and encrypted-storage primitives are owned by
``endoreg_db.utils.encryption``.  Keep this module as a stable lx-annotate
import path only.
"""

from __future__ import annotations

from endoreg_db.utils.encryption.encryption import (  # noqa: F401
    CHUNK_COUNTER_SIZE,
    CHUNK_LENGTH_STRUCT,
    DEFAULT_CHUNK_SIZE,
    DEK_SIZE,
    HEADER_LENGTH_STRUCT,
    MAGIC,
    NONCE_PREFIX_SIZE,
    WRAP_AAD,
    WRAP_NONCE_SIZE,
    DecryptedStream,
    EncryptedChunkIndexEntry,
    EncryptedFileHeader,
    build_chunk_index,
    build_file_header,
    encrypt_stream,
    iter_decrypted_byte_range,
    iter_decrypted_chunks,
    load_master_key,
    read_header,
    unwrap_file_dek,
    write_header,
)

__all__ = [
    "CHUNK_COUNTER_SIZE",
    "CHUNK_LENGTH_STRUCT",
    "DEFAULT_CHUNK_SIZE",
    "DEK_SIZE",
    "HEADER_LENGTH_STRUCT",
    "MAGIC",
    "NONCE_PREFIX_SIZE",
    "WRAP_AAD",
    "WRAP_NONCE_SIZE",
    "DecryptedStream",
    "EncryptedChunkIndexEntry",
    "EncryptedFileHeader",
    "build_chunk_index",
    "build_file_header",
    "encrypt_stream",
    "iter_decrypted_byte_range",
    "iter_decrypted_chunks",
    "load_master_key",
    "read_header",
    "unwrap_file_dek",
    "write_header",
]
