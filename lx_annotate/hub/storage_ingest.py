"""Typed admission of processed artifacts into protected hub storage."""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from django.utils import timezone

from .storage_balance_worker import (
    StorageBalanceWorkerConfig,
    StorageBalancingRuntimeConfig,
    StorageTransferPeerClient,
)
from .storage_transfer_client import StorageTransferArtifactKind


@dataclass(frozen=True, slots=True)
class ProcessedStorageIngestRequest:
    artifact_key: str
    artifact_kind: StorageTransferArtifactKind
    source_path: Path
    residency_key: str
    idempotency_key: str
    media_lease_video_id: int | None = None
    excluded_failure_domains: frozenset[str] = frozenset()

    def __post_init__(self) -> None:
        if not self.artifact_key.strip() or not self.residency_key.strip():
            raise ValueError("artifact_key and residency_key must not be blank")
        if len(self.idempotency_key.strip()) < 16:
            raise ValueError("idempotency_key must contain at least 16 characters")
        if not self.source_path.is_absolute():
            raise ValueError("processed storage source path must be absolute")
        if (
            self.artifact_kind
            in {
                StorageTransferArtifactKind.ANONYMIZED_VIDEO,
                StorageTransferArtifactKind.VIDEO_HLS,
                StorageTransferArtifactKind.STREAMABLE_VIDEO,
            }
            and self.media_lease_video_id is None
        ):
            raise ValueError(
                "streamable storage artifacts require a media lease video id",
            )


@dataclass(frozen=True, slots=True)
class ProcessedStorageIngestResult:
    placement_id: UUID
    transfer_evidence_id: UUID
    node_key: str
    committed: bool


def _hash_file(path: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    size = 0
    if path.is_symlink() or not path.is_file():
        raise ValueError("processed storage source must be a regular non-symlink file")
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
            size += len(chunk)
    if size <= 0:
        raise ValueError("empty storage artifacts are unsupported")
    return digest.hexdigest(), size


def _key(request_key: str, action: str) -> str:
    digest = hashlib.sha256(request_key.encode()).hexdigest()
    return f"ingest:{digest}:{action}"


def ingest_processed_storage_artifact(
    *,
    request: ProcessedStorageIngestRequest,
    runtime: StorageBalancingRuntimeConfig | None = None,
    worker_config: StorageBalanceWorkerConfig | None = None,
    client_factory: Callable[[str], StorageTransferPeerClient],
) -> ProcessedStorageIngestResult:
    from endoreg_db.models import (
        StorageArtifactKind,
        StoragePlacementCommitReceipt,
        StorageReservation,
        StorageTransferEvidence,
    )
    from endoreg_db.services.hub.storage_placement import (
        PlacementRequest,
        ReservationTransitionRequest,
        reserve_storage_placement,
        transition_storage_reservation,
    )
    from endoreg_db.services.hub.storage_transfer import (
        PlacementCommitRequest,
        StoredTransferEvidenceRequest,
        VerifiedTransferEvidenceRequest,
        commit_verified_storage_placement,
        record_stored_transfer_evidence,
        record_verified_transfer_evidence,
    )

    active_runtime = runtime or StorageBalancingRuntimeConfig.from_environment()
    active_worker = worker_config or StorageBalanceWorkerConfig.from_environment()
    digest, size = _hash_file(request.source_path)
    reservation = reserve_storage_placement(
        request=PlacementRequest(
            artifact_key=request.artifact_key,
            artifact_kind=StorageArtifactKind(request.artifact_kind.value),
            expected_size_bytes=size,
            sha256=digest,
            residency_key=request.residency_key,
            excluded_failure_domains=request.excluded_failure_domains,
            idempotency_key=_key(request.idempotency_key, "reservation"),
            media_lease_video_id=request.media_lease_video_id,
        ),
        policy=active_runtime.balancing_policy().placement_policy,
    )
    placement = reservation.placement
    committed = StoragePlacementCommitReceipt.objects.filter(
        placement=placement,
    ).first()
    if committed is not None:
        return ProcessedStorageIngestResult(
            placement_id=placement.pk,
            transfer_evidence_id=committed.transfer_evidence_id,
            node_key=placement.storage_node.node.node_key,
            committed=True,
        )
    node_key = placement.storage_node.node.node_key
    evidence = StorageTransferEvidence.objects.filter(
        placement=placement,
        state__in=[
            StorageTransferEvidence.State.STORED,
            StorageTransferEvidence.State.VERIFIED,
        ],
    ).first()
    prepared = None
    client = client_factory(node_key)
    if evidence is None:
        prepared, receipt = client.prepare_and_store(
            source_path=request.source_path,
            staging_directory=active_worker.staging_directory,
            idempotency_key=_key(request.idempotency_key, "store"),
            artifact_kind=request.artifact_kind,
        )
        evidence = record_stored_transfer_evidence(
            request=StoredTransferEvidenceRequest(
                placement_id=placement.pk,
                rotation_id=None,
                node_key=node_key,
                artifact_kind=request.artifact_kind.value,
                envelope_profile=prepared.envelope.profile,
                recipient_key_id=receipt.recipient_key_id,
                plaintext_sha256=receipt.plaintext_sha256,
                plaintext_size=receipt.plaintext_size,
                ciphertext_sha256=receipt.ciphertext_sha256,
                ciphertext_size=receipt.ciphertext_size,
                stored_at=timezone.now(),
                idempotency_key=_key(request.idempotency_key, "store-evidence"),
            ),
        )
    if evidence.state == StorageTransferEvidence.State.STORED:
        verification = client.verify(evidence.ciphertext_sha256)
        if (
            not verification.valid
            or verification.plaintext_sha256 != digest
            or verification.plaintext_size != size
            or verification.ciphertext_sha256 != evidence.ciphertext_sha256
        ):
            raise ValueError("storage-node verification does not match ingest source")
        evidence = record_verified_transfer_evidence(
            request=VerifiedTransferEvidenceRequest(
                evidence_id=evidence.pk,
                ciphertext_sha256=evidence.ciphertext_sha256,
                plaintext_sha256=digest,
                plaintext_size=size,
                verifier="lx-storage-ingest:v1",
                evidence_reference=f"node-verify:{evidence.ciphertext_sha256}",
                verified_at=timezone.now(),
                idempotency_key=_key(request.idempotency_key, "verify-evidence"),
            ),
        )
    transition_storage_reservation(
        request=ReservationTransitionRequest(
            reservation_id=reservation.pk,
            target_status=StorageReservation.Status.CONSUMED,
            idempotency_key=_key(request.idempotency_key, "reservation-consumed"),
        ),
    )
    commit_verified_storage_placement(
        request=PlacementCommitRequest(
            placement_id=placement.pk,
            transfer_evidence_id=evidence.pk,
            committed_at=timezone.now(),
            idempotency_key=_key(request.idempotency_key, "committed"),
        ),
    )
    if prepared is not None:
        prepared.ciphertext_path.unlink(missing_ok=True)
        prepared.metadata_path.unlink(missing_ok=True)
    return ProcessedStorageIngestResult(
        placement_id=placement.pk,
        transfer_evidence_id=evidence.pk,
        node_key=node_key,
        committed=True,
    )


__all__ = [
    "ProcessedStorageIngestRequest",
    "ProcessedStorageIngestResult",
    "ingest_processed_storage_artifact",
]
