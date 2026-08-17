from __future__ import annotations

import base64
import hashlib
from collections.abc import Iterator
from pathlib import Path
from unittest.mock import patch

import pytest
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey,
    X25519PublicKey,
)
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.test import override_settings

from lx_annotate.hub.hub_export_envelope import (
    HubExportEnvelopeConfig,
    PreparedHubExportEnvelope,
    prepare_hub_export_envelope,
    resolve_hub_export_envelope_config,
)


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


class _MemoryStorage:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload

    def get_plaintext_size(self, name: str) -> int:
        del name
        return len(self.payload)

    def iter_decrypted_range(
        self,
        name: str,
        *,
        start: int,
        end: int,
        chunk_size: int,
    ) -> Iterator[bytes]:
        del name
        for offset in range(start, end + 1, chunk_size):
            yield self.payload[offset : min(offset + chunk_size, end + 1)]


class _MemoryFieldFile:
    name = "processed/report.pdf"

    def __init__(self, payload: bytes) -> None:
        self.storage = _MemoryStorage(payload)


def _key_pair(root: Path) -> tuple[Path, X25519PrivateKey]:
    root.mkdir(parents=True, exist_ok=True)
    private_key = X25519PrivateKey.generate()
    public_path = root / "hub-recipient.pem"
    public_path.write_bytes(
        private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    return public_path, private_key


def _prepare(
    *,
    root: Path,
    payload: bytes,
    transfer_key: str = "site-01:report:0001",
) -> tuple[PreparedHubExportEnvelope, X25519PrivateKey, _MemoryFieldFile]:
    public_path, private_key = _key_pair(root)
    field_file = _MemoryFieldFile(payload)
    prepared = prepare_hub_export_envelope(
        field_file=field_file,
        config=HubExportEnvelopeConfig(
            recipient_public_key_file=public_path,
            staging_directory=root / "staging",
        ),
        transfer_key=transfer_key,
        source_node_key="site-01",
        source_center_key="center-01",
        target_node_key="hub-01",
        resource_kind="report",
        resource_hash="report-resource-01",
        processed_media_hash=hashlib.sha256(payload).hexdigest(),
    )
    return prepared, private_key, field_file


def _decrypt(
    prepared: PreparedHubExportEnvelope,
    private_key: X25519PrivateKey,
) -> bytes:
    metadata = prepared.envelope
    ephemeral = X25519PublicKey.from_public_bytes(
        _decode(metadata.ephemeral_public_key),
    )
    wrapping_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_decode(metadata.wrap_salt),
        info=b"lx-hub-media-envelope-wrap-v1",
    ).derive(private_key.exchange(ephemeral))
    data_encryption_key = AESGCM(wrapping_key).decrypt(
        _decode(metadata.wrap_nonce),
        _decode(metadata.wrapped_data_encryption_key),
        metadata.authenticated_data(),
    )
    decryptor = Cipher(
        algorithms.AES(data_encryption_key),
        modes.GCM(
            _decode(metadata.payload_nonce),
            _decode(metadata.payload_tag),
        ),
    ).decryptor()
    decryptor.authenticate_additional_data(metadata.authenticated_data())
    return (
        decryptor.update(prepared.ciphertext_path.read_bytes()) + decryptor.finalize()
    )


def test_envelope_streams_ciphertext_and_exactly_replays(tmp_path: Path) -> None:
    payload = b"anonymized processed report" * 100
    prepared, private_key, field_file = _prepare(root=tmp_path, payload=payload)
    replay = prepare_hub_export_envelope(
        field_file=field_file,
        config=HubExportEnvelopeConfig(
            recipient_public_key_file=tmp_path / "hub-recipient.pem",
            staging_directory=tmp_path / "staging",
        ),
        transfer_key=prepared.envelope.transfer_key,
        source_node_key=prepared.envelope.source_node_key,
        source_center_key=prepared.envelope.source_center_key,
        target_node_key=prepared.envelope.target_node_key,
        resource_kind="report",
        resource_hash=prepared.envelope.resource_hash,
        processed_media_hash=prepared.envelope.processed_media_hash,
    )

    assert replay == prepared
    assert prepared.ciphertext_path.read_bytes() != payload
    assert _decrypt(prepared, private_key) == payload
    assert prepared.ciphertext_path.stat().st_mode & 0o777 == 0o600
    assert prepared.metadata_path.stat().st_mode & 0o777 == 0o600
    assert {path.suffix for path in (tmp_path / "staging").iterdir()} == {
        ".ciphertext",
        ".json",
    }


def test_replay_rejects_changed_source(tmp_path: Path) -> None:
    payload = b"approved immutable payload"
    prepared, _private_key, field_file = _prepare(root=tmp_path, payload=payload)
    field_file.storage.payload = b"changed immutable payload!"[: len(payload)]

    with pytest.raises(ValueError, match="approved hash"):
        prepare_hub_export_envelope(
            field_file=field_file,
            config=HubExportEnvelopeConfig(
                recipient_public_key_file=tmp_path / "hub-recipient.pem",
                staging_directory=tmp_path / "staging",
            ),
            transfer_key=prepared.envelope.transfer_key,
            source_node_key=prepared.envelope.source_node_key,
            source_center_key=prepared.envelope.source_center_key,
            target_node_key=prepared.envelope.target_node_key,
            resource_kind="report",
            resource_hash=prepared.envelope.resource_hash,
            processed_media_hash=prepared.envelope.processed_media_hash,
        )


def test_metadata_publication_failure_removes_ciphertext(tmp_path: Path) -> None:
    payload = b"atomic envelope"
    public_path, _private_key = _key_pair(tmp_path)
    field_file = _MemoryFieldFile(payload)
    from lx_annotate.hub import hub_export_envelope as envelope_module

    real_atomic_create = envelope_module.atomic_create_file
    calls = 0

    def fail_metadata(**kwargs: object) -> Path:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("metadata publication failed")
        return real_atomic_create(**kwargs)  # type: ignore[arg-type]

    with patch.object(envelope_module, "atomic_create_file", side_effect=fail_metadata):
        with pytest.raises(OSError, match="metadata publication"):
            prepare_hub_export_envelope(
                field_file=field_file,
                config=HubExportEnvelopeConfig(
                    recipient_public_key_file=public_path,
                    staging_directory=tmp_path / "staging",
                ),
                transfer_key="site-01:report:atomic",
                source_node_key="site-01",
                source_center_key="center-01",
                target_node_key="hub-01",
                resource_kind="report",
                resource_hash="report-resource-atomic",
                processed_media_hash=hashlib.sha256(payload).hexdigest(),
            )

    assert list((tmp_path / "staging").glob("*")) == []


def test_replay_uses_prior_recipient_during_key_rotation(tmp_path: Path) -> None:
    payload = b"recipient rotation replay"
    prepared, _private_key, field_file = _prepare(root=tmp_path, payload=payload)
    prior_recipient = prepared.envelope.recipient_key_id
    replacement_public, _replacement_private = _key_pair(tmp_path / "replacement")

    replay = prepare_hub_export_envelope(
        field_file=field_file,
        config=HubExportEnvelopeConfig(
            recipient_public_key_file=replacement_public,
            staging_directory=tmp_path / "staging",
        ),
        transfer_key=prepared.envelope.transfer_key,
        source_node_key=prepared.envelope.source_node_key,
        source_center_key=prepared.envelope.source_center_key,
        target_node_key=prepared.envelope.target_node_key,
        resource_kind="report",
        resource_hash=prepared.envelope.resource_hash,
        processed_media_hash=prepared.envelope.processed_media_hash,
    )

    assert replay == prepared
    assert replay.envelope.recipient_key_id == prior_recipient


def test_replay_rejects_corrupt_staged_ciphertext(tmp_path: Path) -> None:
    payload = b"corruption must fail closed"
    prepared, _private_key, field_file = _prepare(root=tmp_path, payload=payload)
    prepared.ciphertext_path.write_bytes(b"x" * len(payload))

    with pytest.raises(ValueError, match="does not match"):
        prepare_hub_export_envelope(
            field_file=field_file,
            config=HubExportEnvelopeConfig(
                recipient_public_key_file=tmp_path / "hub-recipient.pem",
                staging_directory=tmp_path / "staging",
            ),
            transfer_key=prepared.envelope.transfer_key,
            source_node_key=prepared.envelope.source_node_key,
            source_center_key=prepared.envelope.source_center_key,
            target_node_key=prepared.envelope.target_node_key,
            resource_kind="report",
            resource_hash=prepared.envelope.resource_hash,
            processed_media_hash=prepared.envelope.processed_media_hash,
        )


def test_config_rejects_symlinked_staging_ancestor(tmp_path: Path) -> None:
    protected_root = tmp_path / "protected"
    actual_staging_parent = protected_root / "actual"
    actual_staging_parent.mkdir(parents=True)
    symlink_parent = protected_root / "linked"
    symlink_parent.symlink_to(actual_staging_parent, target_is_directory=True)
    public_path, _private_key = _key_pair(protected_root)

    with override_settings(
        LX_ANNOTATE_ENCRYPTED_DATA_DIR=str(protected_root),
        LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR=str(symlink_parent / "envelopes"),
        LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE=str(public_path),
    ):
        with pytest.raises(ValueError, match="must not contain symlinks"):
            resolve_hub_export_envelope_config()
