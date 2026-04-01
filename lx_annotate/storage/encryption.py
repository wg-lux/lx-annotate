from __future__ import annotations

import base64
import io
import json
import os
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO, Iterator

MAGIC = b"LXENC01\n"
HEADER_LENGTH_STRUCT = struct.Struct(">I")
CHUNK_LENGTH_STRUCT = struct.Struct(">I")
DEFAULT_CHUNK_SIZE = 1024 * 1024
DEK_SIZE = 32
NONCE_PREFIX_SIZE = 8
WRAP_NONCE_SIZE = 12
CHUNK_COUNTER_SIZE = 4
WRAP_AAD = b"lx-annotate:dek-wrap:v1"


def _require_cryptography():
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "Encrypted storage requires the 'cryptography' package to be installed."
        ) from exc
    return AESGCM


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value.encode("ascii"))


def _read_key_from_file(path: str) -> str:
    return Path(path).read_text(encoding="utf-8").strip()


def load_master_key() -> bytes:
    key_text = os.getenv("LX_ANNOTATE_MASTER_KEY", "").strip()
    key_file = os.getenv("LX_ANNOTATE_MASTER_KEY_FILE", "").strip()
    if not key_text and key_file:
        key_text = _read_key_from_file(key_file)
    if not key_text:
        raise RuntimeError(
            "LX_ANNOTATE_MASTER_KEY or LX_ANNOTATE_MASTER_KEY_FILE must be set when "
            "encrypted storage is enabled."
        )

    try:
        key_bytes = _b64decode(key_text)
    except Exception as exc:
        raise RuntimeError(
            "LX_ANNOTATE_MASTER_KEY must be urlsafe-base64 encoded raw key material."
        ) from exc

    if len(key_bytes) not in {16, 24, 32}:
        raise RuntimeError(
            "LX_ANNOTATE_MASTER_KEY must decode to 16, 24, or 32 bytes for AES-GCM."
        )
    return key_bytes


@dataclass(frozen=True)
class EncryptedFileHeader:
    version: int
    algorithm: str
    chunk_size: int
    wrapped_dek: bytes
    wrap_nonce: bytes
    nonce_prefix: bytes

    def to_bytes(self) -> bytes:
        payload = {
            "version": self.version,
            "algorithm": self.algorithm,
            "chunk_size": self.chunk_size,
            "wrapped_dek": _b64encode(self.wrapped_dek),
            "wrap_nonce": _b64encode(self.wrap_nonce),
            "nonce_prefix": _b64encode(self.nonce_prefix),
        }
        return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )

    @classmethod
    def from_bytes(cls, data: bytes) -> "EncryptedFileHeader":
        payload = json.loads(data.decode("utf-8"))
        return cls(
            version=int(payload["version"]),
            algorithm=str(payload["algorithm"]),
            chunk_size=int(payload["chunk_size"]),
            wrapped_dek=_b64decode(payload["wrapped_dek"]),
            wrap_nonce=_b64decode(payload["wrap_nonce"]),
            nonce_prefix=_b64decode(payload["nonce_prefix"]),
        )


@dataclass(frozen=True)
class EncryptedChunkIndexEntry:
    counter: int
    ciphertext_offset: int
    ciphertext_length: int
    plaintext_offset: int
    plaintext_length: int


def build_file_header(
    *, master_key: bytes, chunk_size: int = DEFAULT_CHUNK_SIZE
) -> EncryptedFileHeader:
    AESGCM = _require_cryptography()
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    dek = os.urandom(DEK_SIZE)
    wrap_nonce = os.urandom(WRAP_NONCE_SIZE)
    wrapped_dek = AESGCM(master_key).encrypt(wrap_nonce, dek, WRAP_AAD)
    return EncryptedFileHeader(
        version=1,
        algorithm="AESGCM-chunked-v1",
        chunk_size=chunk_size,
        wrapped_dek=wrapped_dek,
        wrap_nonce=wrap_nonce,
        nonce_prefix=os.urandom(NONCE_PREFIX_SIZE),
    )


def unwrap_file_dek(header: EncryptedFileHeader, master_key: bytes) -> bytes:
    AESGCM = _require_cryptography()
    return AESGCM(master_key).decrypt(header.wrap_nonce, header.wrapped_dek, WRAP_AAD)


def write_header(stream: BinaryIO, header: EncryptedFileHeader) -> bytes:
    encoded = header.to_bytes()
    stream.write(MAGIC)
    stream.write(HEADER_LENGTH_STRUCT.pack(len(encoded)))
    stream.write(encoded)
    return encoded


def read_header(stream: BinaryIO) -> tuple[EncryptedFileHeader, bytes]:
    magic = stream.read(len(MAGIC))
    if magic != MAGIC:
        raise ValueError("Unsupported encrypted file format")
    header_length_bytes = stream.read(HEADER_LENGTH_STRUCT.size)
    if len(header_length_bytes) != HEADER_LENGTH_STRUCT.size:
        raise ValueError("Encrypted file header length is truncated")
    (header_length,) = HEADER_LENGTH_STRUCT.unpack(header_length_bytes)
    encoded = stream.read(header_length)
    if len(encoded) != header_length:
        raise ValueError("Encrypted file header is truncated")
    return EncryptedFileHeader.from_bytes(encoded), encoded


def encrypt_stream(
    source: BinaryIO,
    destination: BinaryIO,
    *,
    master_key: bytes,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
) -> EncryptedFileHeader:
    AESGCM = _require_cryptography()
    header = build_file_header(master_key=master_key, chunk_size=chunk_size)
    header_bytes = write_header(destination, header)
    dek = unwrap_file_dek(header, master_key)
    cipher = AESGCM(dek)
    counter = 0

    while True:
        chunk = source.read(chunk_size)
        if not chunk:
            break
        nonce = header.nonce_prefix + counter.to_bytes(CHUNK_COUNTER_SIZE, "big")
        ciphertext = cipher.encrypt(nonce, chunk, header_bytes)
        destination.write(CHUNK_LENGTH_STRUCT.pack(len(ciphertext)))
        destination.write(ciphertext)
        counter += 1

    return header


def iter_decrypted_chunks(
    source: BinaryIO,
    *,
    master_key: bytes,
) -> Iterator[bytes]:
    AESGCM = _require_cryptography()
    header, header_bytes = read_header(source)
    dek = unwrap_file_dek(header, master_key)
    cipher = AESGCM(dek)
    counter = 0

    while True:
        chunk_length_bytes = source.read(CHUNK_LENGTH_STRUCT.size)
        if not chunk_length_bytes:
            return
        if len(chunk_length_bytes) != CHUNK_LENGTH_STRUCT.size:
            raise ValueError("Encrypted chunk length is truncated")
        (chunk_length,) = CHUNK_LENGTH_STRUCT.unpack(chunk_length_bytes)
        ciphertext = source.read(chunk_length)
        if len(ciphertext) != chunk_length:
            raise ValueError("Encrypted chunk payload is truncated")
        nonce = header.nonce_prefix + counter.to_bytes(CHUNK_COUNTER_SIZE, "big")
        yield cipher.decrypt(nonce, ciphertext, header_bytes)
        counter += 1


def build_chunk_index(
    source: BinaryIO,
) -> tuple[EncryptedFileHeader, bytes, list[EncryptedChunkIndexEntry], int]:
    header, header_bytes = read_header(source)
    index: list[EncryptedChunkIndexEntry] = []
    plaintext_offset = 0
    counter = 0

    while True:
        chunk_length_bytes = source.read(CHUNK_LENGTH_STRUCT.size)
        if not chunk_length_bytes:
            return header, header_bytes, index, plaintext_offset
        if len(chunk_length_bytes) != CHUNK_LENGTH_STRUCT.size:
            raise ValueError("Encrypted chunk length is truncated")
        (ciphertext_length,) = CHUNK_LENGTH_STRUCT.unpack(chunk_length_bytes)
        ciphertext_offset = source.tell()
        plaintext_length = ciphertext_length - 16  # AES-GCM tag length
        if plaintext_length < 0:
            raise ValueError("Encrypted chunk payload is invalid")
        index.append(
            EncryptedChunkIndexEntry(
                counter=counter,
                ciphertext_offset=ciphertext_offset,
                ciphertext_length=ciphertext_length,
                plaintext_offset=plaintext_offset,
                plaintext_length=plaintext_length,
            )
        )
        source.seek(ciphertext_length, io.SEEK_CUR)
        plaintext_offset += plaintext_length
        counter += 1


def iter_decrypted_byte_range(
    source: BinaryIO,
    *,
    master_key: bytes,
    start: int,
    end: int,
    output_chunk_size: int = 64 * 1024,
) -> Iterator[bytes]:
    if start < 0 or end < start:
        raise ValueError(f"Invalid byte range: {start}-{end}")

    AESGCM = _require_cryptography()
    header, header_bytes, index, plaintext_size = build_chunk_index(source)
    if end >= plaintext_size:
        raise ValueError(
            f"Requested byte range {start}-{end} exceeds plaintext size {plaintext_size}"
        )

    dek = unwrap_file_dek(header, master_key)
    cipher = AESGCM(dek)

    for entry in index:
        chunk_start = entry.plaintext_offset
        chunk_end = entry.plaintext_offset + entry.plaintext_length - 1
        if chunk_end < start:
            continue
        if chunk_start > end:
            break

        source.seek(entry.ciphertext_offset)
        ciphertext = source.read(entry.ciphertext_length)
        if len(ciphertext) != entry.ciphertext_length:
            raise ValueError("Encrypted chunk payload is truncated")
        nonce = header.nonce_prefix + entry.counter.to_bytes(CHUNK_COUNTER_SIZE, "big")
        plaintext = cipher.decrypt(nonce, ciphertext, header_bytes)

        slice_start = max(start - chunk_start, 0)
        slice_end = min(end - chunk_start + 1, entry.plaintext_length)
        selected = plaintext[slice_start:slice_end]
        for offset in range(0, len(selected), output_chunk_size):
            yield selected[offset : offset + output_chunk_size]


class DecryptedStream(io.RawIOBase):
    def __init__(self, source: BinaryIO, *, master_key: bytes):
        self._source = source
        self._chunks = iter_decrypted_chunks(source, master_key=master_key)
        self._buffer = bytearray()
        self._closed = False

    def readable(self) -> bool:
        return True

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._source.close()
        super().close()

    def readinto(self, b) -> int | None:
        if self._closed:
            return 0
        target = memoryview(b)
        while len(self._buffer) < len(target):
            try:
                self._buffer.extend(next(self._chunks))
            except StopIteration:
                break
        if not self._buffer:
            return 0
        size = min(len(target), len(self._buffer))
        target[:size] = self._buffer[:size]
        del self._buffer[:size]
        return size
