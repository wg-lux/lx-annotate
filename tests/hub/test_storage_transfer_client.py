from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, cast

import pytest
import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from lx_annotate.hub.storage_transfer_client import (
    ENVELOPE_HEADER,
    WIRE_CONTRACT_HEADER,
    WIRE_CONTRACT_VERSION,
    StorageEnvelopeMetadata,
    StorageTransferArtifactKind,
    StorageTransferClient,
    StorageTransferClientContract,
    StorageTransferPeer,
    prepare_storage_envelope,
)


def _key_pair(root: Path) -> tuple[Path, X25519PrivateKey]:
    private = X25519PrivateKey.generate()
    public_path = root / "recipient-public.pem"
    public_path.write_bytes(
        private.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    return public_path, private


def _peer(root: Path) -> tuple[StorageTransferPeer, X25519PrivateKey]:
    public_path, private = _key_pair(root)
    peer = StorageTransferPeer(
        node_key="storage-01",
        display_name="Storage 01",
        failure_domain="rack-a",
        residency_key="de",
        placement_weight=100,
        artifact_kinds={StorageTransferArtifactKind.ANONYMIZED_VIDEO},
        endpoint="https://storage-01.internal:9443",
        ca_certificate_file=Path("/run/ca.pem"),
        client_certificate_file=Path("/run/client.pem"),
        client_key_file=Path("/run/client-key.pem"),
        recipient_public_key_file=public_path,
    )
    return peer, private


def test_peer_accepts_deployed_intern_suffix_and_rejects_public_dns(
    tmp_path: Path,
) -> None:
    peer, _private = _peer(tmp_path)
    deployed = peer.model_copy(update={"endpoint": "https://gs-01.intern:9443"})
    assert StorageTransferPeer.model_validate(deployed.model_dump()).endpoint == (
        "https://gs-01.intern:9443"
    )

    with pytest.raises(ValueError, match="private suffix"):
        StorageTransferPeer.model_validate(
            {**peer.model_dump(), "endpoint": "https://storage.example.com:9443"},
        )

    with pytest.raises(ValueError, match="node_key values must be unique"):
        StorageTransferClientContract(nodes=[peer, peer])
    with pytest.raises(ValueError, match="endpoints must be unique"):
        StorageTransferClientContract(
            nodes=[peer, peer.model_copy(update={"node_key": "storage-02"})],
        )


def _decrypt(prepared, private: X25519PrivateKey) -> bytes:
    metadata = prepared.envelope
    ephemeral = serialization.load_der_public_key(
        private.public_key().public_bytes(
            serialization.Encoding.DER,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    # Replace the round-trip key above with the actual raw ephemeral key after
    # exercising cryptography's strict X25519 type boundary.
    import base64

    from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PublicKey

    assert isinstance(ephemeral, X25519PublicKey)
    ephemeral = X25519PublicKey.from_public_bytes(
        base64.urlsafe_b64decode(
            metadata.ephemeral_public_key
            + "=" * (-len(metadata.ephemeral_public_key) % 4),
        ),
    )

    def decode(value):
        return base64.urlsafe_b64decode(  # noqa: E731
            value + "=" * (-len(value) % 4),
        )

    wrapping_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=decode(metadata.wrap_salt),
        info=b"lx-hub-storage-envelope-wrap-v1",
    ).derive(private.exchange(ephemeral))
    data_key = AESGCM(wrapping_key).decrypt(
        decode(metadata.wrap_nonce),
        decode(metadata.wrapped_data_encryption_key),
        metadata.authenticated_context(),
    )
    decryptor = Cipher(
        algorithms.AES(data_key),
        modes.GCM(decode(metadata.payload_nonce), decode(metadata.payload_tag)),
    ).decryptor()
    decryptor.authenticate_additional_data(metadata.authenticated_context())
    ciphertext = prepared.ciphertext_path.read_bytes()
    return decryptor.update(ciphertext) + decryptor.finalize()


def test_prepared_envelope_encrypts_with_fresh_dek_and_replays_exactly(
    tmp_path: Path,
) -> None:
    peer, private = _peer(tmp_path)
    source = tmp_path / "processed-media.bin"
    source.write_bytes(b"anonymized processed media" * 100)

    first = prepare_storage_envelope(
        peer=peer,
        source_path=source,
        staging_directory=tmp_path / "staging",
        idempotency_key="storage-transfer-0001",
        artifact_kind=StorageTransferArtifactKind.ANONYMIZED_VIDEO,
    )
    replay = prepare_storage_envelope(
        peer=peer,
        source_path=source,
        staging_directory=tmp_path / "staging",
        idempotency_key="storage-transfer-0001",
        artifact_kind=StorageTransferArtifactKind.ANONYMIZED_VIDEO,
    )

    assert replay == first
    assert first.ciphertext_path.read_bytes() != source.read_bytes()
    assert _decrypt(first, private) == source.read_bytes()
    assert (
        StorageEnvelopeMetadata.model_validate_json(first.envelope.model_dump_json())
        == first.envelope
    )


def test_envelope_replay_rejects_changed_plaintext(tmp_path: Path) -> None:
    peer, _private = _peer(tmp_path)
    source = tmp_path / "artifact.bin"
    source.write_bytes(b"first artifact")
    prepare_storage_envelope(
        peer=peer,
        source_path=source,
        staging_directory=tmp_path / "staging",
        idempotency_key="storage-transfer-0002",
        artifact_kind=StorageTransferArtifactKind.PROCESSED_REPORT,
    )
    source.write_bytes(b"changed artifact")

    with pytest.raises(ValueError, match="does not match"):
        prepare_storage_envelope(
            peer=peer,
            source_path=source,
            staging_directory=tmp_path / "staging",
            idempotency_key="storage-transfer-0002",
            artifact_kind=StorageTransferArtifactKind.PROCESSED_REPORT,
        )


class _Response:
    def __init__(self, payload: dict[str, Any], *, content: bytes = b"") -> None:
        self.status_code = 200
        self._payload = payload
        self._content = content
        self.headers: dict[str, str] = {WIRE_CONTRACT_HEADER: WIRE_CONTRACT_VERSION}
        self.closed = False

    def raise_for_status(self) -> None:
        return

    def json(self) -> dict[str, Any]:
        return self._payload

    def iter_content(self, *, chunk_size: int) -> Any:
        del chunk_size
        yield self._content

    def close(self) -> None:
        self.closed = True


class _Session:
    def __init__(self, response: _Response) -> None:
        self.response = response
        self.calls: list[tuple[str, str, dict[str, object]]] = []
        self.trust_env = True

    def request(self, method: str, url: str, **kwargs: object) -> _Response:
        self.calls.append((method, url, kwargs))
        return self.response


def test_typed_client_store_matches_server_wire_contract(tmp_path: Path) -> None:
    peer, _private = _peer(tmp_path)
    source = tmp_path / "artifact.bin"
    source.write_bytes(b"cipher me")
    prepared = prepare_storage_envelope(
        peer=peer,
        source_path=source,
        staging_directory=tmp_path / "staging",
        idempotency_key="storage-transfer-0003",
        artifact_kind=StorageTransferArtifactKind.PROCESSED_REPORT,
    )
    response = _Response(
        {
            "ciphertext_sha256": prepared.ciphertext_sha256,
            "ciphertext_size": prepared.ciphertext_size,
            "plaintext_sha256": prepared.envelope.plaintext_sha256,
            "plaintext_size": prepared.envelope.plaintext_size,
            "recipient_key_id": prepared.envelope.recipient_key_id,
            "created": True,
        },
    )
    session = _Session(response)
    client = StorageTransferClient(peer, session=cast(requests.Session, session))
    assert session.trust_env is False

    with pytest.raises(ValueError, match="idempotency key"):
        client.store(prepared, idempotency_key="storage-transfer-wrong")
    assert session.calls == []

    replay, receipt = client.prepare_and_store(
        source_path=source,
        staging_directory=tmp_path / "staging",
        idempotency_key="storage-transfer-0003",
        artifact_kind=StorageTransferArtifactKind.PROCESSED_REPORT,
    )

    assert replay == prepared
    assert receipt.created
    method, url, kwargs = session.calls[0]
    assert method == "PUT"
    assert url.endswith(f"/v1/objects/{prepared.ciphertext_sha256}")
    headers = cast(dict[str, str], kwargs["headers"])
    assert (
        StorageEnvelopeMetadata.model_validate_json(
            __import__("base64").urlsafe_b64decode(
                headers[ENVELOPE_HEADER] + "=" * (-len(headers[ENVELOPE_HEADER]) % 4),
            ),
        )
        == prepared.envelope
    )
    assert kwargs["allow_redirects"] is False
    assert kwargs["cert"] == ("/run/client.pem", "/run/client-key.pem")
    assert kwargs["verify"] == "/run/ca.pem"


def test_client_loads_the_exact_nix_contract_from_environment(tmp_path: Path) -> None:
    peer, _private = _peer(tmp_path)
    contract_path = tmp_path / "nodes.json"
    contract_path.write_text(
        __import__("json").dumps(
            {
                "schema_version": 1,
                "deployment_role": "central_hub",
                "nodes": [peer.model_dump(mode="json")],
            },
        ),
        encoding="utf-8",
    )
    session = _Session(
        _Response(
            {
                "contract_version": WIRE_CONTRACT_VERSION,
                "node_id": "storage-01",
                "status": "ready",
                "accepting_writes": True,
                "used_percent": 20,
                "available_bytes": 1024,
                "recipient_key_ids": ["a" * 64],
            },
        ),
    )

    client = StorageTransferClient.from_environment(
        "storage-01",
        {
            "HUB_STORAGE_SCHEMA_VERSION": "1",
            "HUB_STORAGE_DEPLOYMENT_ROLE": "central_hub",
            "HUB_STORAGE_NODES_FILE": str(contract_path),
        },
        session=cast(requests.Session, session),
    )

    assert client.peer == peer
    assert client.health().node_id == "storage-01"


def test_client_rejects_identity_path_and_receipt_confusion(tmp_path: Path) -> None:
    peer, _private = _peer(tmp_path)
    session = _Session(
        _Response(
            {
                "contract_version": WIRE_CONTRACT_VERSION,
                "node_id": "other-node",
                "status": "ready",
                "accepting_writes": True,
                "used_percent": 20,
                "available_bytes": 1024,
                "recipient_key_ids": ["a" * 64],
            },
        ),
    )
    client = StorageTransferClient(peer, session=cast(requests.Session, session))
    with pytest.raises(ValueError, match="health identity"):
        client.health()

    session.response = _Response(
        {
            "ciphertext_sha256": "b" * 64,
            "plaintext_sha256": "c" * 64,
            "plaintext_size": 1,
            "valid": True,
        },
    )
    with pytest.raises(ValueError, match="another object"):
        client.verify("a" * 64)
    with pytest.raises(ValueError, match="lowercase SHA-256"):
        client.verify("../object")

    session.response = _Response({"deleted": True, "digest": "b" * 64})
    with pytest.raises(ValueError, match="another object"):
        client.delete("a" * 64, idempotency_key="storage-delete-0001")
    with pytest.raises(ValueError, match="idempotency key"):
        client.delete("a" * 64, idempotency_key="short")

    session.response = _Response(
        {
            "contract_version": WIRE_CONTRACT_VERSION,
            "node_id": "storage-01",
            "status": "ready",
            "accepting_writes": True,
            "used_percent": 20,
            "available_bytes": 1024,
            "recipient_key_ids": ["a" * 64],
        },
    )
    session.response.headers = {}
    with pytest.raises(ValueError, match="wire contract"):
        client.health()


def test_fetch_plaintext_is_atomic_and_validated(tmp_path: Path) -> None:
    peer, _private = _peer(tmp_path)
    plaintext = b"authenticated plaintext"
    digest = hashlib.sha256(plaintext).hexdigest()
    response = _Response({}, content=plaintext)
    response.headers = {
        WIRE_CONTRACT_HEADER: WIRE_CONTRACT_VERSION,
        "X-Plaintext-SHA256": digest,
        "Content-Length": str(len(plaintext)),
    }
    session = _Session(response)
    client = StorageTransferClient(peer, session=cast(requests.Session, session))
    destination = tmp_path / "download" / "artifact.bin"

    assert (
        client.fetch_plaintext(
            ciphertext_sha256="a" * 64,
            expected_plaintext_sha256=digest,
            expected_plaintext_size=len(plaintext),
            destination=destination,
        )
        == destination
    )
    assert destination.read_bytes() == plaintext
    assert response.closed
