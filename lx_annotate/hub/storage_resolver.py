"""Fail-closed resolution and retrieval of committed protected artifacts."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from uuid import UUID

from django.utils import timezone

from .storage_balance_worker import StorageTransferPeerClient


@dataclass(frozen=True, slots=True)
class ResolvedStorageArtifact:
    placement_id: UUID
    artifact_key: str
    artifact_kind: str
    node_key: str
    ciphertext_sha256: str
    plaintext_sha256: str
    plaintext_size: int
    media_lease_video_id: int | None


def resolve_committed_storage_artifact(
    *,
    placement_id: UUID,
) -> ResolvedStorageArtifact:
    from endoreg_db.models import StorageArtifactPlacement, StorageTransferEvidence

    placement = (
        StorageArtifactPlacement.objects.select_related("storage_node__node")
        .filter(
            pk=placement_id,
            state=StorageArtifactPlacement.State.COMMITTED,
            role=StorageArtifactPlacement.Role.PRIMARY,
        )
        .first()
    )
    if placement is None:
        raise ValueError("committed primary storage placement was not found")
    evidence = StorageTransferEvidence.objects.filter(
        placement=placement,
        state=StorageTransferEvidence.State.VERIFIED,
        node_key=placement.storage_node.node.node_key,
        plaintext_sha256=placement.sha256,
        plaintext_size=placement.expected_size_bytes,
    ).first()
    if evidence is None:
        raise ValueError("committed placement has no exact verified envelope")
    return ResolvedStorageArtifact(
        placement_id=placement.pk,
        artifact_key=placement.artifact_key,
        artifact_kind=placement.artifact_kind,
        node_key=evidence.node_key,
        ciphertext_sha256=evidence.ciphertext_sha256,
        plaintext_sha256=evidence.plaintext_sha256,
        plaintext_size=evidence.plaintext_size,
        media_lease_video_id=placement.media_lease_video_id,
    )


def _resolved_current_artifact(descriptor: object) -> ResolvedStorageArtifact:
    from endoreg_db.services.hub.storage_artifact_resolution import (
        STORAGE_ARTIFACT_RESOLUTION_CONTRACT_VERSION,
    )

    if (
        STORAGE_ARTIFACT_RESOLUTION_CONTRACT_VERSION
        != "hub-storage-artifact-resolution-v1"
        or getattr(descriptor, "contract_version", None)
        != STORAGE_ARTIFACT_RESOLUTION_CONTRACT_VERSION
    ):
        raise ValueError("storage artifact resolution contract is incompatible")
    return ResolvedStorageArtifact(
        placement_id=UUID(str(getattr(descriptor, "placement_id"))),
        artifact_key=str(getattr(descriptor, "artifact_key")),
        artifact_kind=str(getattr(descriptor, "artifact_kind")),
        node_key=str(getattr(descriptor, "node_key")),
        ciphertext_sha256=str(getattr(descriptor, "ciphertext_sha256")),
        plaintext_sha256=str(getattr(descriptor, "plaintext_sha256")),
        plaintext_size=int(getattr(descriptor, "plaintext_size")),
        media_lease_video_id=getattr(descriptor, "media_lease_video_id"),
    )


def resolve_current_processed_video_artifact(
    *,
    video_id: int,
) -> ResolvedStorageArtifact:
    from endoreg_db.services.hub.storage_artifact_resolution import (
        resolve_current_processed_video_storage,
    )

    return _resolved_current_artifact(
        resolve_current_processed_video_storage(video_id=video_id),
    )


def resolve_current_processed_report_artifact(
    *,
    report_id: int,
) -> ResolvedStorageArtifact:
    from endoreg_db.services.hub.storage_artifact_resolution import (
        resolve_current_processed_report_storage,
    )

    return _resolved_current_artifact(
        resolve_current_processed_report_storage(report_id=report_id),
    )


def fetch_committed_storage_artifact(
    *,
    resolution: ResolvedStorageArtifact,
    destination: Path,
    client_factory: Callable[[str], StorageTransferPeerClient],
    lease_seconds: int = 300,
) -> Path:
    from endoreg_db.services.media_operation_gate import (
        MediaOperationDeferred,
        MediaOperationLeaseAcquisition,
        MediaOperationLeaseType,
        acquire_media_operation_lease,
    )

    if lease_seconds <= 0:
        raise ValueError("lease_seconds must be positive")
    if resolution.media_lease_video_id is not None:
        try:
            acquire_media_operation_lease(
                request=MediaOperationLeaseAcquisition(
                    video_id=resolution.media_lease_video_id,
                    lease_type=MediaOperationLeaseType.STREAM,
                    expires_at=timezone.now() + timedelta(seconds=lease_seconds),
                    metadata={"storage_placement_id": str(resolution.placement_id)},
                    renew_matching=True,
                ),
            )
        except MediaOperationDeferred as exc:
            raise ValueError(
                "storage artifact cleanup authorization blocks a new playback lease",
            ) from exc
    return client_factory(resolution.node_key).fetch_plaintext(
        ciphertext_sha256=resolution.ciphertext_sha256,
        expected_plaintext_sha256=resolution.plaintext_sha256,
        expected_plaintext_size=resolution.plaintext_size,
        destination=destination,
    )


__all__ = [
    "ResolvedStorageArtifact",
    "fetch_committed_storage_artifact",
    "resolve_committed_storage_artifact",
    "resolve_current_processed_report_artifact",
    "resolve_current_processed_video_artifact",
]
