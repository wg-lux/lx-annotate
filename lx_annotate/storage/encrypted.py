from __future__ import annotations

import io
import os
import tempfile
from pathlib import Path
from typing import Iterator, TypeAlias

from django.core.exceptions import ImproperlyConfigured
from django.core.files.base import File
from django.core.files.storage import FileSystemStorage

from endoreg_db.utils.file_operations import atomic_move_file, safe_unlink_file

from .encryption import (
    DEFAULT_CHUNK_SIZE,
    DecryptedStream,
    EncryptedChunkIndexEntry,
    EncryptedFileHeader,
    MAGIC,
    build_chunk_index,
    encrypt_stream,
    iter_decrypted_byte_range,
    load_master_key,
)


IndexCacheKey: TypeAlias = tuple[str, int, int]
IndexCacheValue: TypeAlias = tuple[
    EncryptedFileHeader,
    bytes,
    list[EncryptedChunkIndexEntry],
    int,
]


class EncryptedStorage(FileSystemStorage):
    """
    File-system-backed storage that persists only ciphertext on disk.
    """

    def __init__(
        self,
        *args,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        master_key: bytes | None = None,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.chunk_size = chunk_size
        self._master_key = self._resolve_master_key(master_key)
        self._index_cache: dict[IndexCacheKey, IndexCacheValue] = {}

    @staticmethod
    def _resolve_master_key(master_key: bytes | None) -> bytes:
        if master_key is None:
            try:
                return load_master_key()
            except RuntimeError as exc:
                raise ImproperlyConfigured(str(exc)) from exc

        if len(master_key) not in {16, 24, 32}:
            raise ValueError("master_key must be 16, 24, or 32 bytes for AES-GCM.")
        return master_key

    def _open(self, name: str, mode: str = "rb") -> File:
        if any(flag in mode for flag in ("w", "a", "+")):
            raise ValueError("EncryptedStorage only supports read-only open()")
        full_path = Path(self.path(name))
        stream = open(full_path, "rb")
        decrypted = DecryptedStream(stream, master_key=self._master_key)
        buffered = io.BufferedReader(decrypted)
        return File(buffered, name)

    def open_encrypted(self, name: str):
        full_path = Path(self.path(name))
        return open(full_path, "rb")

    def is_encrypted(self, name: str) -> bool:
        with self.open_encrypted(name) as source:
            return source.read(len(MAGIC)) == MAGIC

    def _get_cached_index(self, name: str) -> IndexCacheValue:
        full_path = Path(self.path(name))
        stat = full_path.stat()
        cache_key = (str(full_path), stat.st_mtime_ns, stat.st_size)
        cached = self._index_cache.get(cache_key)
        if cached is not None:
            return cached

        with self.open_encrypted(name) as source:
            index_payload: IndexCacheValue = build_chunk_index(source)
        self._index_cache.clear()
        self._index_cache[cache_key] = index_payload
        return index_payload

    def get_plaintext_size(self, name: str) -> int:
        return self._get_cached_index(name)[3]

    def iter_decrypted_range(
        self,
        name: str,
        *,
        start: int,
        end: int,
        chunk_size: int = 64 * 1024,
    ) -> Iterator[bytes]:
        plaintext_size = self.get_plaintext_size(name)
        if start < 0 or end < start or end >= plaintext_size:
            raise ValueError(
                f"Requested byte range {start}-{end} exceeds plaintext size {plaintext_size}"
            )

        with self.open_encrypted(name) as source:
            yield from iter_decrypted_byte_range(
                source,
                master_key=self._master_key,
                start=start,
                end=end,
                output_chunk_size=chunk_size,
            )

    def _save(self, name: str, content) -> str:
        clean_name = self.get_available_name(name)
        full_path = Path(self.path(clean_name))
        full_path.parent.mkdir(parents=True, exist_ok=True)

        fd, tmp_path_str = tempfile.mkstemp(
            prefix=f".{full_path.name}.",
            suffix=".tmp",
            dir=str(full_path.parent),
        )
        tmp_path = Path(tmp_path_str)
        try:
            source = content.file if hasattr(content, "file") else content
            with os.fdopen(fd, "wb") as tmp_handle:
                encrypt_stream(
                    source,
                    tmp_handle,
                    master_key=self._master_key,
                    chunk_size=self.chunk_size,
                )
                tmp_handle.flush()
                os.fsync(tmp_handle.fileno())

            atomic_move_file(source=tmp_path, destination=full_path)
        except Exception:
            safe_unlink_file(tmp_path, missing_ok=True)
            raise

        return str(Path(clean_name).as_posix())

    def repair_plaintext_file(self, name: str) -> bool:
        """
        Re-encrypt a raw plaintext file in managed storage in place.

        Returns True when a plaintext file was rewritten, False when the file
        already appeared to be encrypted.
        """

        if self.is_encrypted(name):
            return False

        full_path = Path(self.path(name))
        original_stat = full_path.stat()
        fd, tmp_path_str = tempfile.mkstemp(
            prefix=f".{full_path.name}.",
            suffix=".tmp",
            dir=str(full_path.parent),
        )
        tmp_path = Path(tmp_path_str)

        try:
            with open(full_path, "rb") as source, os.fdopen(fd, "wb") as destination:
                encrypt_stream(
                    source,
                    destination,
                    master_key=self._master_key,
                    chunk_size=self.chunk_size,
                )
                destination.flush()
                os.fsync(destination.fileno())

            os.chmod(tmp_path, original_stat.st_mode)
            atomic_move_file(source=tmp_path, destination=full_path)
            self._index_cache.clear()
        except Exception:
            safe_unlink_file(tmp_path, missing_ok=True)
            raise

        return True
