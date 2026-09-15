"""Typed mTLS client for envelope-encrypted storage-node transfers."""

from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import os
import re
from collections.abc import Iterator, Mapping
from enum import StrEnum
from pathlib import Path
from typing import BinaryIO, Literal
from urllib.parse import urljoin, urlparse

import requests
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey,
    X25519PublicKey,
)
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from endoreg_db.utils.filesystem.file_operations import (
    atomic_create_file,
    atomic_write_file,
    safe_unlink_file,
)
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .transfer_transport import TransferTransportConfig

ENVELOPE_PROFILE = "x25519-hkdf-sha256-aes256gcm-v1"
ENVELOPE_HEADER = "X-Envelope-Metadata"
WIRE_CONTRACT_HEADER = "X-LX-Storage-Contract"
WIRE_CONTRACT_VERSION = "lx-hub-storage-v1"
_CHUNK_SIZE = 1024 * 1024
_OPERATION_KEY = re.compile(r"^[A-Za-z0-9._:-]{16,128}$")
_SHA256 = re.compile(r"^[0-9a-f]{64}$")


class StorageTransferArtifactKind(StrEnum):
    ANONYMIZED_VIDEO = "anonymized_video"
    PROCESSED_REPORT = "processed_report"
    VIDEO_HLS = "video_hls"
    STREAMABLE_VIDEO = "streamable_video"
    SIDECAR = "sidecar"
    MANIFEST = "manifest"


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str, *, expected_size: int, field_name: str) -> bytes:
    try:
        decoded = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except (ValueError, TypeError) as exc:
        raise ValueError(f"{field_name} must be base64url encoded") from exc
    if len(decoded) != expected_size:
        raise ValueError(f"{field_name} must decode to {expected_size} bytes")
    return decoded


class StorageEnvelopeMetadata(BaseModel):
    schema_version: Literal[1] = 1
    profile: Literal["x25519-hkdf-sha256-aes256gcm-v1"] = (
        "x25519-hkdf-sha256-aes256gcm-v1"
    )
    node_id: str = Field(min_length=1, max_length=253)
    artifact_kind: StorageTransferArtifactKind
    recipient_key_id: str = Field(pattern=r"^[0-9a-f]{64}$")
    plaintext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    plaintext_size: int = Field(gt=0)
    ephemeral_public_key: str
    wrap_salt: str
    wrap_nonce: str
    wrapped_data_encryption_key: str
    payload_nonce: str
    payload_tag: str

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    @field_validator("ephemeral_public_key")
    @classmethod
    def validate_ephemeral_key(cls, value: str) -> str:
        _decode(value, expected_size=32, field_name="ephemeral_public_key")
        return value

    @field_validator("wrap_salt")
    @classmethod
    def validate_wrap_salt(cls, value: str) -> str:
        _decode(value, expected_size=16, field_name="wrap_salt")
        return value

    @field_validator("wrap_nonce", "payload_nonce")
    @classmethod
    def validate_nonce(cls, value: str) -> str:
        _decode(value, expected_size=12, field_name="nonce")
        return value

    @field_validator("wrapped_data_encryption_key")
    @classmethod
    def validate_wrapped_key(cls, value: str) -> str:
        _decode(value, expected_size=48, field_name="wrapped_data_encryption_key")
        return value

    @field_validator("payload_tag")
    @classmethod
    def validate_payload_tag(cls, value: str) -> str:
        _decode(value, expected_size=16, field_name="payload_tag")
        return value

    def authenticated_context(self) -> bytes:
        return _authenticated_context(
            node_id=self.node_id,
            artifact_kind=self.artifact_kind.value,
            recipient_key_id=self.recipient_key_id,
            plaintext_sha256=self.plaintext_sha256,
            plaintext_size=self.plaintext_size,
            ephemeral_public_key=self.ephemeral_public_key,
            wrap_salt=self.wrap_salt,
            payload_nonce=self.payload_nonce,
        )

    def to_header(self) -> str:
        return _b64(self.model_dump_json().encode("utf-8"))


class StorageTransferPeer(BaseModel):
    node_key: str = Field(min_length=1, max_length=253)
    display_name: str = Field(min_length=1, max_length=253)
    failure_domain: str = Field(min_length=1, max_length=128)
    residency_key: str = Field(min_length=1, max_length=128)
    placement_weight: int = Field(gt=0)
    artifact_kinds: set[StorageTransferArtifactKind] = Field(min_length=1)
    endpoint: str
    ca_certificate_file: Path
    client_certificate_file: Path
    client_key_file: Path
    recipient_public_key_file: Path

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    @model_validator(mode="after")
    def validate_transport(self) -> StorageTransferPeer:
        parsed = urlparse(self.endpoint)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.port is None
            or parsed.username is not None
            or parsed.password is not None
            or parsed.query
            or parsed.fragment
            or parsed.path not in {"", "/"}
        ):
            raise ValueError("storage endpoint must be a host-only HTTPS URL")
        try:
            endpoint_ip = ipaddress.ip_address(parsed.hostname)
        except ValueError:
            if not parsed.hostname.endswith((".intern", ".internal", ".aglnet")):
                raise ValueError(
                    "storage endpoint hostname must use an approved private suffix",
                ) from None
        else:
            if not endpoint_ip.is_private or endpoint_ip.is_unspecified:
                raise ValueError("storage endpoint must use a private IP address")
        for path in (
            self.ca_certificate_file,
            self.client_certificate_file,
            self.client_key_file,
            self.recipient_public_key_file,
        ):
            if not path.is_absolute():
                raise ValueError("storage transfer identity paths must be absolute")
        return self

    def recipient_key_id(self) -> str:
        public_key = _load_public_key(self.recipient_public_key_file)
        raw = public_key.public_bytes(
            serialization.Encoding.Raw,
            serialization.PublicFormat.Raw,
        )
        return hashlib.sha256(raw).hexdigest()


class StorageTransferClientContract(BaseModel):
    schema_version: Literal[1] = 1
    deployment_role: Literal["central_hub"] = "central_hub"
    nodes: list[StorageTransferPeer] = Field(min_length=1)

    model_config = ConfigDict(extra="forbid", frozen=True)

    @model_validator(mode="after")
    def validate_unique_peers(self) -> StorageTransferClientContract:
        node_keys = [node.node_key for node in self.nodes]
        endpoints = [node.endpoint.rstrip("/") for node in self.nodes]
        if len(node_keys) != len(set(node_keys)):
            raise ValueError("storage peer node_key values must be unique")
        if len(endpoints) != len(set(endpoints)):
            raise ValueError("storage peer endpoints must be unique")
        return self

    @classmethod
    def load_file(cls, path: Path) -> StorageTransferClientContract:
        return cls.model_validate_json(path.read_bytes())

    def peer(self, node_key: str) -> StorageTransferPeer:
        matches = [node for node in self.nodes if node.node_key == node_key]
        if len(matches) != 1:
            raise ValueError(f"exactly one storage peer is required for {node_key!r}")
        return matches[0]


class PreparedStorageEnvelope(BaseModel):
    idempotency_key: str = Field(pattern=r"^[A-Za-z0-9._:-]{16,128}$")
    ciphertext_path: Path
    ciphertext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    ciphertext_size: int = Field(gt=0)
    metadata_path: Path
    envelope: StorageEnvelopeMetadata

    model_config = ConfigDict(extra="forbid", frozen=True)


class StorageWriteReceipt(BaseModel):
    ciphertext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    ciphertext_size: int = Field(gt=0)
    plaintext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    plaintext_size: int = Field(gt=0)
    recipient_key_id: str = Field(pattern=r"^[0-9a-f]{64}$")
    created: bool

    model_config = ConfigDict(extra="forbid", frozen=True)


class StorageCapacity(BaseModel):
    total_bytes: int = Field(gt=0)
    free_bytes: int = Field(ge=0)
    available_bytes: int = Field(ge=0)
    used_percent: int = Field(ge=0, le=100)
    accepting_writes: bool

    model_config = ConfigDict(extra="forbid", frozen=True)


class StorageHealth(BaseModel):
    contract_version: Literal["lx-hub-storage-v1"]
    node_id: str
    status: Literal["ready", "read_only"]
    accepting_writes: bool
    used_percent: int = Field(ge=0, le=100)
    available_bytes: int = Field(ge=0)
    recipient_key_ids: list[str] = Field(min_length=1, max_length=3)

    model_config = ConfigDict(extra="forbid", frozen=True)

    @field_validator("recipient_key_ids")
    @classmethod
    def validate_recipient_key_ids(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)) or any(
            not _SHA256.fullmatch(key_id) for key_id in value
        ):
            raise ValueError("recipient key IDs must be distinct lowercase digests")
        return value

    @model_validator(mode="after")
    def validate_status(self) -> StorageHealth:
        if self.accepting_writes != (self.status == "ready"):
            raise ValueError("storage health status and write admission disagree")
        return self


class StorageInventoryItem(BaseModel):
    ciphertext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    ciphertext_size: int = Field(ge=0)
    plaintext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    plaintext_size: int = Field(gt=0)
    recipient_key_id: str = Field(pattern=r"^[0-9a-f]{64}$")
    artifact_kind: StorageTransferArtifactKind

    model_config = ConfigDict(extra="forbid", frozen=True)


class StorageInventoryPage(BaseModel):
    contract_version: Literal["lx-hub-storage-v1"]
    node_id: str = Field(min_length=1, max_length=253)
    items: list[StorageInventoryItem] = Field(max_length=1000)
    next_cursor: str | None

    model_config = ConfigDict(extra="forbid", frozen=True)

    @field_validator("next_cursor")
    @classmethod
    def validate_next_cursor(cls, value: str | None) -> str | None:
        if value is not None:
            _decode(value, expected_size=32, field_name="next_cursor")
        return value

    @model_validator(mode="after")
    def validate_page_order(self) -> StorageInventoryPage:
        digests = [item.ciphertext_sha256 for item in self.items]
        if digests != sorted(set(digests)):
            raise ValueError("storage inventory items must be unique and ordered")
        if self.next_cursor is not None:
            if not digests:
                raise ValueError("a continuing inventory page must not be empty")
            if _decode(
                self.next_cursor,
                expected_size=32,
                field_name="next_cursor",
            ) != bytes.fromhex(digests[-1]):
                raise ValueError("inventory cursor must identify the final item")
        return self


class StorageVerifyResult(BaseModel):
    ciphertext_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    plaintext_sha256: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    plaintext_size: int | None = Field(default=None, gt=0)
    valid: bool

    model_config = ConfigDict(extra="forbid", frozen=True)

    @model_validator(mode="after")
    def validate_evidence(self) -> StorageVerifyResult:
        complete = self.plaintext_sha256 is not None and self.plaintext_size is not None
        if self.valid != complete:
            raise ValueError("valid verification requires plaintext evidence")
        return self


class StorageDeleteResult(BaseModel):
    deleted: bool
    digest: str = Field(pattern=r"^[0-9a-f]{64}$")

    model_config = ConfigDict(extra="forbid", frozen=True)


def _authenticated_context(
    *,
    node_id: str,
    artifact_kind: str,
    recipient_key_id: str,
    plaintext_sha256: str,
    plaintext_size: int,
    ephemeral_public_key: str,
    wrap_salt: str,
    payload_nonce: str,
) -> bytes:
    return json.dumps(
        {
            "schema_version": 1,
            "profile": ENVELOPE_PROFILE,
            "node_id": node_id,
            "artifact_kind": artifact_kind,
            "recipient_key_id": recipient_key_id,
            "plaintext_sha256": plaintext_sha256,
            "plaintext_size": plaintext_size,
            "ephemeral_public_key": ephemeral_public_key,
            "wrap_salt": wrap_salt,
            "payload_nonce": payload_nonce,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _hash_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as source:
        while chunk := source.read(_CHUNK_SIZE):
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def _validated_digest(value: str) -> str:
    if not _SHA256.fullmatch(value):
        raise ValueError("ciphertext_sha256 must be a lowercase SHA-256 digest")
    return value


def _load_public_key(path: Path) -> X25519PublicKey:
    if path.is_symlink() or not path.is_file():
        raise ValueError("recipient key must be a regular non-symlink file")
    key = serialization.load_pem_public_key(path.read_bytes())
    if not isinstance(key, X25519PublicKey):
        raise ValueError("recipient key must be an X25519 PEM public key")
    return key


def prepare_storage_envelope(
    *,
    peer: StorageTransferPeer,
    source_path: Path,
    staging_directory: Path,
    idempotency_key: str,
    artifact_kind: StorageTransferArtifactKind,
) -> PreparedStorageEnvelope:
    """Create or exactly replay one persisted per-transfer envelope."""

    if not _OPERATION_KEY.fullmatch(idempotency_key):
        raise ValueError("invalid idempotency key")
    if not source_path.is_file() or source_path.is_symlink():
        raise ValueError("source must be a regular non-symlink file")
    plaintext_sha256, plaintext_size = _hash_file(source_path)
    if plaintext_size <= 0:
        raise ValueError("empty storage artifacts are not supported")
    staging_key = hashlib.sha256(idempotency_key.encode("utf-8")).hexdigest()
    ciphertext_path = staging_directory / f"{staging_key}.ciphertext"
    metadata_path = staging_directory / f"{staging_key}.json"
    if ciphertext_path.exists() or metadata_path.exists():
        if not ciphertext_path.is_file() or not metadata_path.is_file():
            raise ValueError("persisted envelope replay is incomplete")
        prepared = PreparedStorageEnvelope.model_validate_json(
            metadata_path.read_bytes(),
        )
        actual_digest, actual_size = _hash_file(ciphertext_path)
        if (
            prepared.ciphertext_path != ciphertext_path
            or prepared.metadata_path != metadata_path
            or prepared.idempotency_key != idempotency_key
            or actual_digest != prepared.ciphertext_sha256
            or actual_size != prepared.ciphertext_size
            or prepared.envelope.node_id != peer.node_key
            or prepared.envelope.artifact_kind != artifact_kind
            or prepared.envelope.plaintext_sha256 != plaintext_sha256
            or prepared.envelope.plaintext_size != plaintext_size
        ):
            raise ValueError("persisted envelope replay does not match this request")
        return prepared

    recipient = _load_public_key(peer.recipient_public_key_file)
    recipient_public = recipient.public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    key_id = hashlib.sha256(recipient_public).hexdigest()
    ephemeral_private = X25519PrivateKey.generate()
    ephemeral_public = ephemeral_private.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    data_encryption_key = os.urandom(32)
    wrap_salt = os.urandom(16)
    wrap_nonce = os.urandom(12)
    payload_nonce = os.urandom(12)
    context = _authenticated_context(
        node_id=peer.node_key,
        artifact_kind=artifact_kind.value,
        recipient_key_id=key_id,
        plaintext_sha256=plaintext_sha256,
        plaintext_size=plaintext_size,
        ephemeral_public_key=_b64(ephemeral_public),
        wrap_salt=_b64(wrap_salt),
        payload_nonce=_b64(payload_nonce),
    )
    wrapping_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=wrap_salt,
        info=b"lx-hub-storage-envelope-wrap-v1",
    ).derive(ephemeral_private.exchange(recipient))
    wrapped_key = AESGCM(wrapping_key).encrypt(wrap_nonce, data_encryption_key, context)
    encryptor = Cipher(
        algorithms.AES(data_encryption_key),
        modes.GCM(payload_nonce),
    ).encryptor()
    encryptor.authenticate_additional_data(context)

    def ciphertext_chunks() -> Iterator[bytes]:
        observed_digest = hashlib.sha256()
        observed_size = 0
        with source_path.open("rb") as source:
            while chunk := source.read(_CHUNK_SIZE):
                observed_digest.update(chunk)
                observed_size += len(chunk)
                encrypted = encryptor.update(chunk)
                if encrypted:
                    yield encrypted
        if (
            observed_size != plaintext_size
            or observed_digest.hexdigest() != plaintext_sha256
        ):
            raise ValueError("source changed while preparing the storage envelope")
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
    ciphertext_sha256, ciphertext_size = _hash_file(ciphertext_path)
    envelope = StorageEnvelopeMetadata(
        node_id=peer.node_key,
        artifact_kind=artifact_kind,
        recipient_key_id=key_id,
        plaintext_sha256=plaintext_sha256,
        plaintext_size=plaintext_size,
        ephemeral_public_key=_b64(ephemeral_public),
        wrap_salt=_b64(wrap_salt),
        wrap_nonce=_b64(wrap_nonce),
        wrapped_data_encryption_key=_b64(wrapped_key),
        payload_nonce=_b64(payload_nonce),
        payload_tag=_b64(encryptor.tag),
    )
    prepared = PreparedStorageEnvelope(
        idempotency_key=idempotency_key,
        ciphertext_path=ciphertext_path,
        ciphertext_sha256=ciphertext_sha256,
        ciphertext_size=ciphertext_size,
        metadata_path=metadata_path,
        envelope=envelope,
    )
    try:
        atomic_create_file(
            destination=metadata_path,
            content=[prepared.model_dump_json().encode("utf-8")],
            required_bytes=4096,
            file_mode=0o600,
            dir_mode=0o700,
        )
    except Exception:
        safe_unlink_file(ciphertext_path, missing_ok=True)
        raise
    return prepared


class StorageTransferClient:
    def __init__(
        self,
        peer: StorageTransferPeer,
        *,
        timeout_seconds: int = 60,
        session: requests.Session | None = None,
    ) -> None:
        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        self.peer = peer
        self.timeout_seconds = timeout_seconds
        self.session = session or requests.Session()
        # Storage identity must come only from the explicit contract, never ambient
        # proxy/netrc configuration inherited from the service account.
        self.session.trust_env = False
        self.transport = TransferTransportConfig(
            cert=(
                str(peer.client_certificate_file),
                str(peer.client_key_file),
            ),
            verify=str(peer.ca_certificate_file),
        )

    @classmethod
    def from_environment(
        cls,
        node_key: str,
        environment: Mapping[str, str] | None = None,
        *,
        timeout_seconds: int = 60,
        session: requests.Session | None = None,
    ) -> StorageTransferClient:
        values = os.environ if environment is None else environment
        if str(values.get("HUB_STORAGE_DEPLOYMENT_ROLE", "")).strip() != "central_hub":
            raise ValueError("storage transfer client requires central_hub role")
        if str(values.get("HUB_STORAGE_SCHEMA_VERSION", "")).strip() != "1":
            raise ValueError("unsupported hub storage client schema")
        contract_path = Path(str(values.get("HUB_STORAGE_NODES_FILE", "")).strip())
        if not contract_path.is_absolute() or not contract_path.is_file():
            raise ValueError("HUB_STORAGE_NODES_FILE must be a readable absolute file")
        contract = StorageTransferClientContract.load_file(contract_path)
        return cls(
            contract.peer(node_key),
            timeout_seconds=timeout_seconds,
            session=session,
        )

    def prepare_and_store(
        self,
        *,
        source_path: Path,
        staging_directory: Path,
        idempotency_key: str,
        artifact_kind: StorageTransferArtifactKind,
    ) -> tuple[PreparedStorageEnvelope, StorageWriteReceipt]:
        """Persist a replayable envelope and upload its ciphertext over mTLS."""

        prepared = prepare_storage_envelope(
            peer=self.peer,
            source_path=source_path,
            staging_directory=staging_directory,
            idempotency_key=idempotency_key,
            artifact_kind=artifact_kind,
        )
        return prepared, self.store(prepared, idempotency_key=idempotency_key)

    def _url(self, path: str) -> str:
        return urljoin(self.peer.endpoint.rstrip("/") + "/", path.lstrip("/"))

    def _request(
        self,
        method: str,
        path: str,
        *,
        data: BinaryIO | None = None,
        headers: Mapping[str, str] | None = None,
        params: Mapping[str, str | int] | None = None,
        stream: bool = False,
    ) -> requests.Response:
        response = self.session.request(
            method,
            self._url(path),
            timeout=self.timeout_seconds,
            data=data,
            headers=headers,
            params=params,
            stream=stream,
            **self.transport.request_kwargs(),
        )
        if response.headers.get(WIRE_CONTRACT_HEADER) != WIRE_CONTRACT_VERSION:
            response.close()
            raise ValueError("storage-node wire contract is missing or incompatible")
        if 300 <= response.status_code < 400:
            raise requests.RequestException("storage-node redirects are prohibited")
        response.raise_for_status()
        return response

    def health(self) -> StorageHealth:
        health = StorageHealth.model_validate(self._request("GET", "/v1/health").json())
        if health.node_id != self.peer.node_key:
            raise ValueError("storage-node health identity does not match the peer")
        return health

    def capacity(self) -> StorageCapacity:
        return StorageCapacity.model_validate(
            self._request("GET", "/v1/capacity").json(),
        )

    def inventory(
        self,
        *,
        cursor: str | None = None,
        limit: int = 100,
    ) -> StorageInventoryPage:
        """Read one bounded, opaque-cursor inventory page over authenticated mTLS."""

        if not 1 <= limit <= 1000:
            raise ValueError("storage inventory limit must be between 1 and 1000")
        if cursor is not None:
            _decode(cursor, expected_size=32, field_name="cursor")
        params: dict[str, str | int] = {"limit": limit}
        if cursor is not None:
            params["cursor"] = cursor
        page = StorageInventoryPage.model_validate(
            self._request("GET", "/v1/inventory", params=params).json(),
        )
        if page.node_id != self.peer.node_key:
            raise ValueError("storage-node inventory identity does not match the peer")
        if len(page.items) > limit:
            raise ValueError("storage-node inventory exceeded the requested limit")
        if cursor is not None and page.next_cursor == cursor:
            raise ValueError("storage-node inventory cursor did not advance")
        return page

    def store(
        self,
        prepared: PreparedStorageEnvelope,
        *,
        idempotency_key: str,
    ) -> StorageWriteReceipt:
        if idempotency_key != prepared.idempotency_key:
            raise ValueError("upload idempotency key does not match prepared envelope")
        with prepared.ciphertext_path.open("rb") as source:
            response = self._request(
                "PUT",
                f"/v1/objects/{prepared.ciphertext_sha256}",
                data=source,
                headers={
                    "Content-Length": str(prepared.ciphertext_size),
                    "X-Content-SHA256": prepared.ciphertext_sha256,
                    "Idempotency-Key": idempotency_key,
                    ENVELOPE_HEADER: prepared.envelope.to_header(),
                },
            )
        receipt = StorageWriteReceipt.model_validate(response.json())
        if (
            receipt.ciphertext_sha256 != prepared.ciphertext_sha256
            or receipt.ciphertext_size != prepared.ciphertext_size
            or receipt.plaintext_sha256 != prepared.envelope.plaintext_sha256
            or receipt.plaintext_size != prepared.envelope.plaintext_size
            or receipt.recipient_key_id != prepared.envelope.recipient_key_id
        ):
            raise ValueError("storage-node write receipt does not match the envelope")
        return receipt

    def verify(self, ciphertext_sha256: str) -> StorageVerifyResult:
        digest = _validated_digest(ciphertext_sha256)
        result = StorageVerifyResult.model_validate(
            self._request("POST", f"/v1/objects/{digest}/verify").json(),
        )
        if result.ciphertext_sha256 != digest:
            raise ValueError(
                "storage-node verification receipt identifies another object",
            )
        return result

    def fetch_plaintext(
        self,
        *,
        ciphertext_sha256: str,
        expected_plaintext_sha256: str,
        expected_plaintext_size: int,
        destination: Path,
    ) -> Path:
        ciphertext_sha256 = _validated_digest(ciphertext_sha256)
        if not _SHA256.fullmatch(expected_plaintext_sha256):
            raise ValueError("expected_plaintext_sha256 must be a lowercase digest")
        if expected_plaintext_size <= 0:
            raise ValueError("expected_plaintext_size must be positive")
        response = self._request(
            "GET",
            f"/v1/objects/{ciphertext_sha256}/plaintext",
            stream=True,
        )
        if (
            response.headers.get("X-Plaintext-SHA256") != expected_plaintext_sha256
            or int(response.headers.get("Content-Length", "-1"))
            != expected_plaintext_size
        ):
            response.close()
            raise ValueError("storage-node plaintext headers do not match placement")
        digest = hashlib.sha256()
        size = 0

        def chunks() -> Iterator[bytes]:
            nonlocal size
            try:
                for chunk in response.iter_content(chunk_size=_CHUNK_SIZE):
                    if chunk:
                        digest.update(chunk)
                        size += len(chunk)
                        yield chunk
                if (
                    size != expected_plaintext_size
                    or digest.hexdigest() != expected_plaintext_sha256
                ):
                    raise ValueError(
                        "fetched plaintext failed size or digest validation",
                    )
            finally:
                response.close()

        return atomic_write_file(
            destination=destination,
            content=chunks(),
            required_bytes=expected_plaintext_size,
            file_mode=0o600,
            dir_mode=0o700,
        )

    def delete(
        self,
        ciphertext_sha256: str,
        *,
        idempotency_key: str,
    ) -> StorageDeleteResult:
        digest = _validated_digest(ciphertext_sha256)
        if not _OPERATION_KEY.fullmatch(idempotency_key):
            raise ValueError("invalid idempotency key")
        result = StorageDeleteResult.model_validate(
            self._request(
                "DELETE",
                f"/v1/objects/{digest}",
                headers={
                    "If-Match": f'"{digest}"',
                    "Idempotency-Key": idempotency_key,
                },
            ).json(),
        )
        if result.digest != digest:
            raise ValueError("storage-node delete receipt identifies another object")
        return result


__all__ = [
    "ENVELOPE_HEADER",
    "ENVELOPE_PROFILE",
    "PreparedStorageEnvelope",
    "StorageCapacity",
    "StorageDeleteResult",
    "StorageEnvelopeMetadata",
    "StorageHealth",
    "StorageInventoryItem",
    "StorageInventoryPage",
    "StorageTransferClient",
    "StorageTransferArtifactKind",
    "StorageTransferClientContract",
    "StorageTransferPeer",
    "StorageVerifyResult",
    "StorageWriteReceipt",
    "WIRE_CONTRACT_HEADER",
    "WIRE_CONTRACT_VERSION",
    "prepare_storage_envelope",
]
