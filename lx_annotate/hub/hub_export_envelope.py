"""Replay-safe envelope encryption for site-to-hub processed media."""

from __future__ import annotations

import base64
import hashlib
import os
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey,
    X25519PublicKey,
)
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.conf import settings
from endoreg_db.utils.filesystem.file_operations import (
    atomic_create_file,
    safe_unlink_file,
)
from endoreg_db.utils.storage_streaming import field_file_size, iter_field_file_bytes
from lx_dtypes.models.contracts.hub_media_envelope import HubMediaEnvelopeMetadata
from pydantic import BaseModel, ConfigDict, Field

_CHUNK_SIZE = 1024 * 1024
_HKDF_INFO = b"lx-hub-media-envelope-wrap-v1"
_PLACEHOLDER_WRAPPED_KEY = bytes(48)
_PLACEHOLDER_TAG = bytes(16)


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _hash_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as source:
        while chunk := source.read(_CHUNK_SIZE):
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def _hash_field_file(field_file: Any, plaintext_size: int) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    for chunk in iter_field_file_bytes(
        field_file,
        start=0,
        end=plaintext_size - 1,
        chunk_size=_CHUNK_SIZE,
    ):
        digest.update(chunk)
        size += len(chunk)
    return digest.hexdigest(), size


def load_hub_recipient_public_key(path: Path) -> X25519PublicKey:
    """Load only a regular, non-symlink X25519 public identity."""

    if not path.is_absolute() or path.is_symlink() or not path.is_file():
        raise ValueError(
            "Hub envelope recipient key must be an absolute regular non-symlink file.",
        )
    key = serialization.load_pem_public_key(path.read_bytes())
    if not isinstance(key, X25519PublicKey):
        raise ValueError("Hub envelope recipient key must be an X25519 PEM public key.")
    return key


def recipient_key_id(public_key: X25519PublicKey) -> str:
    raw = public_key.public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    return hashlib.sha256(raw).hexdigest()


@dataclass(frozen=True, slots=True)
class HubExportEnvelopeConfig:
    recipient_public_key_file: Path
    staging_directory: Path


def resolve_hub_export_envelope_config() -> HubExportEnvelopeConfig:
    protected_root = Path(
        str(getattr(settings, "LX_ANNOTATE_ENCRYPTED_DATA_DIR", "") or ""),
    ).expanduser()
    configured_staging = Path(
        str(getattr(settings, "LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR", "") or ""),
    ).expanduser()
    recipient = Path(
        str(
            getattr(
                settings,
                "LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE",
                "",
            )
            or "",
        ),
    ).expanduser()
    if not protected_root.is_absolute() or not configured_staging.is_absolute():
        raise ValueError("Hub envelope staging requires absolute protected paths.")
    current = configured_staging
    while current != current.parent:
        if current.exists() and current.is_symlink():
            raise ValueError("Hub envelope staging path must not contain symlinks.")
        current = current.parent
    protected_root = protected_root.resolve()
    staging = configured_staging.resolve()
    try:
        staging.relative_to(protected_root)
    except ValueError as exc:
        raise ValueError(
            "Hub envelope staging directory must be inside "
            "LX_ANNOTATE_ENCRYPTED_DATA_DIR.",
        ) from exc
    if staging.exists() and (staging.is_symlink() or not staging.is_dir()):
        raise ValueError("Hub envelope staging path must be a non-symlink directory.")
    staging.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(staging, 0o700)
    load_hub_recipient_public_key(recipient)
    return HubExportEnvelopeConfig(
        recipient_public_key_file=recipient,
        staging_directory=staging,
    )


@dataclass(frozen=True, slots=True)
class PreparedHubExportEnvelope:
    envelope: HubMediaEnvelopeMetadata
    ciphertext_path: Path
    metadata_path: Path
    ciphertext_sha256: str
    ciphertext_size: int

    def cleanup(self) -> None:
        safe_unlink_file(self.metadata_path, missing_ok=True)
        safe_unlink_file(self.ciphertext_path, missing_ok=True)


class PersistedHubExportEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    envelope: HubMediaEnvelopeMetadata
    ciphertext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    ciphertext_size: int = Field(gt=0)


def _staging_paths(*, staging_directory: Path, transfer_key: str) -> tuple[Path, Path]:
    staging_key = hashlib.sha256(transfer_key.encode("utf-8")).hexdigest()
    return (
        staging_directory / f"{staging_key}.ciphertext",
        staging_directory / f"{staging_key}.json",
    )


def cleanup_persisted_hub_export_envelope(
    *,
    config: HubExportEnvelopeConfig,
    transfer_key: str,
) -> None:
    ciphertext_path, metadata_path = _staging_paths(
        staging_directory=config.staging_directory,
        transfer_key=transfer_key,
    )
    safe_unlink_file(metadata_path, missing_ok=True)
    safe_unlink_file(ciphertext_path, missing_ok=True)


def _metadata(
    *,
    transfer_key: str,
    source_node_key: str,
    source_center_key: str,
    target_node_key: str,
    resource_kind: Literal["video", "report"],
    resource_hash: str,
    processed_media_hash: str,
    plaintext_size: int,
    recipient_key_id_value: str,
    ephemeral_public_key: bytes,
    wrap_salt: bytes,
    wrap_nonce: bytes,
    wrapped_data_encryption_key: bytes,
    payload_nonce: bytes,
    payload_tag: bytes,
) -> HubMediaEnvelopeMetadata:
    return HubMediaEnvelopeMetadata(
        transfer_key=transfer_key,
        source_node_key=source_node_key,
        source_center_key=source_center_key,
        target_node_key=target_node_key,
        resource_kind=resource_kind,
        resource_hash=resource_hash,
        processed_media_hash=processed_media_hash,
        plaintext_sha256=processed_media_hash,
        plaintext_size=plaintext_size,
        recipient_key_id=recipient_key_id_value,
        ephemeral_public_key=_b64(ephemeral_public_key),
        wrap_salt=_b64(wrap_salt),
        wrap_nonce=_b64(wrap_nonce),
        wrapped_data_encryption_key=_b64(wrapped_data_encryption_key),
        payload_nonce=_b64(payload_nonce),
        payload_tag=_b64(payload_tag),
    )


def prepare_hub_export_envelope(
    *,
    field_file: Any,
    config: HubExportEnvelopeConfig,
    transfer_key: str,
    source_node_key: str,
    source_center_key: str,
    target_node_key: str,
    resource_kind: Literal["video", "report"],
    resource_hash: str,
    processed_media_hash: str,
) -> PreparedHubExportEnvelope:
    """Create or exactly replay one ciphertext envelope without plaintext staging."""

    plaintext_size = field_file_size(field_file)
    if plaintext_size <= 0:
        raise ValueError("Hub export processed media must not be empty.")
    observed_hash, observed_size = _hash_field_file(field_file, plaintext_size)
    if observed_size != plaintext_size or observed_hash != processed_media_hash:
        raise ValueError("Processed media does not match its approved hash and size.")
    recipient = load_hub_recipient_public_key(config.recipient_public_key_file)
    key_id = recipient_key_id(recipient)
    ciphertext_path, metadata_path = _staging_paths(
        staging_directory=config.staging_directory,
        transfer_key=transfer_key,
    )
    if ciphertext_path.exists() or metadata_path.exists():
        if not ciphertext_path.is_file() or not metadata_path.is_file():
            raise ValueError("Persisted Hub envelope replay is incomplete.")
        persisted = PersistedHubExportEnvelope.model_validate_json(
            metadata_path.read_bytes(),
        )
        envelope = persisted.envelope
        actual_digest, actual_size = _hash_file(ciphertext_path)
        expected_identity = (
            transfer_key,
            source_node_key,
            source_center_key,
            target_node_key,
            resource_kind,
            resource_hash,
            processed_media_hash,
            plaintext_size,
        )
        actual_identity = (
            envelope.transfer_key,
            envelope.source_node_key,
            envelope.source_center_key,
            envelope.target_node_key,
            envelope.resource_kind,
            envelope.resource_hash,
            envelope.processed_media_hash,
            envelope.plaintext_size,
        )
        if (
            actual_identity != expected_identity
            or actual_digest != persisted.ciphertext_sha256
            or actual_size != persisted.ciphertext_size
            or actual_size != plaintext_size
        ):
            raise ValueError(
                "Persisted Hub envelope replay does not match this transfer.",
            )
        return PreparedHubExportEnvelope(
            envelope=envelope,
            ciphertext_path=ciphertext_path,
            metadata_path=metadata_path,
            ciphertext_sha256=actual_digest,
            ciphertext_size=actual_size,
        )

    ephemeral_private = X25519PrivateKey.generate()
    ephemeral_public = ephemeral_private.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    data_encryption_key = os.urandom(32)
    wrap_salt = os.urandom(16)
    wrap_nonce = os.urandom(12)
    payload_nonce = os.urandom(12)
    aad_metadata = _metadata(
        transfer_key=transfer_key,
        source_node_key=source_node_key,
        source_center_key=source_center_key,
        target_node_key=target_node_key,
        resource_kind=resource_kind,
        resource_hash=resource_hash,
        processed_media_hash=processed_media_hash,
        plaintext_size=plaintext_size,
        recipient_key_id_value=key_id,
        ephemeral_public_key=ephemeral_public,
        wrap_salt=wrap_salt,
        wrap_nonce=wrap_nonce,
        wrapped_data_encryption_key=_PLACEHOLDER_WRAPPED_KEY,
        payload_nonce=payload_nonce,
        payload_tag=_PLACEHOLDER_TAG,
    )
    authenticated_data = aad_metadata.authenticated_data()
    wrapping_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=wrap_salt,
        info=_HKDF_INFO,
    ).derive(ephemeral_private.exchange(recipient))
    wrapped_key = AESGCM(wrapping_key).encrypt(
        wrap_nonce,
        data_encryption_key,
        authenticated_data,
    )
    encryptor = Cipher(
        algorithms.AES(data_encryption_key),
        modes.GCM(payload_nonce),
    ).encryptor()
    encryptor.authenticate_additional_data(authenticated_data)

    def ciphertext_chunks() -> Iterator[bytes]:
        digest = hashlib.sha256()
        observed_size = 0
        for chunk in iter_field_file_bytes(
            field_file,
            start=0,
            end=plaintext_size - 1,
            chunk_size=_CHUNK_SIZE,
        ):
            digest.update(chunk)
            observed_size += len(chunk)
            encrypted = encryptor.update(chunk)
            if encrypted:
                yield encrypted
        if (
            observed_size != plaintext_size
            or digest.hexdigest() != processed_media_hash
        ):
            raise ValueError(
                "Processed media changed while preparing its Hub envelope.",
            )
        final = encryptor.finalize()
        if final:
            yield final

    atomic_create_file(
        destination=ciphertext_path,
        content=ciphertext_chunks(),
        required_bytes=plaintext_size,
        file_mode=0o600,
        dir_mode=0o700,
    )
    envelope = _metadata(
        transfer_key=transfer_key,
        source_node_key=source_node_key,
        source_center_key=source_center_key,
        target_node_key=target_node_key,
        resource_kind=resource_kind,
        resource_hash=resource_hash,
        processed_media_hash=processed_media_hash,
        plaintext_size=plaintext_size,
        recipient_key_id_value=key_id,
        ephemeral_public_key=ephemeral_public,
        wrap_salt=wrap_salt,
        wrap_nonce=wrap_nonce,
        wrapped_data_encryption_key=wrapped_key,
        payload_nonce=payload_nonce,
        payload_tag=encryptor.tag,
    )
    ciphertext_sha256, ciphertext_size = _hash_file(ciphertext_path)
    persisted = PersistedHubExportEnvelope(
        envelope=envelope,
        ciphertext_sha256=ciphertext_sha256,
        ciphertext_size=ciphertext_size,
    )
    try:
        atomic_create_file(
            destination=metadata_path,
            content=[persisted.model_dump_json().encode("utf-8")],
            required_bytes=4096,
            file_mode=0o600,
            dir_mode=0o700,
        )
    except Exception:
        safe_unlink_file(ciphertext_path, missing_ok=True)
        raise
    return PreparedHubExportEnvelope(
        envelope=envelope,
        ciphertext_path=ciphertext_path,
        metadata_path=metadata_path,
        ciphertext_sha256=ciphertext_sha256,
        ciphertext_size=ciphertext_size,
    )


__all__ = [
    "HubExportEnvelopeConfig",
    "PreparedHubExportEnvelope",
    "PersistedHubExportEnvelope",
    "cleanup_persisted_hub_export_envelope",
    "load_hub_recipient_public_key",
    "prepare_hub_export_envelope",
    "recipient_key_id",
    "resolve_hub_export_envelope_config",
]
