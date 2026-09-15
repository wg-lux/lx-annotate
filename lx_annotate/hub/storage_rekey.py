"""Online recipient-key rotation for committed protected-storage placements."""

from __future__ import annotations

import hashlib
from collections.abc import Callable
from dataclasses import dataclass
from uuid import UUID

from django.utils import timezone

from .storage_balance_worker import (
    StorageBalanceWorkerConfig,
    StorageTransferPeerClient,
)
from .storage_transfer_client import StorageTransferArtifactKind


@dataclass(frozen=True, slots=True)
class StorageRekeyRequest:
    placement_id: UUID
    idempotency_key: str

    def __post_init__(self) -> None:
        if len(self.idempotency_key.strip()) < 16:
            raise ValueError("idempotency_key must contain at least 16 characters")


@dataclass(frozen=True, slots=True)
class StorageRekeyResult:
    placement_id: UUID
    prior_evidence_id: UUID
    replacement_evidence_id: UUID
    recipient_key_id: str


@dataclass(frozen=True, slots=True)
class StorageRekeyCleanupResult:
    evidence_id: UUID
    deleted: bool


def _key(request_key: str, action: str) -> str:
    return f"rekey:{hashlib.sha256(request_key.encode()).hexdigest()}:{action}"


def rekey_storage_placement(
    *,
    request: StorageRekeyRequest,
    worker_config: StorageBalanceWorkerConfig | None = None,
    client_factory: Callable[[str], StorageTransferPeerClient],
) -> StorageRekeyResult:
    from endoreg_db.models import StorageArtifactPlacement, StorageTransferEvidence
    from endoreg_db.services.hub.storage_transfer import (
        ReplacementTransferEvidenceRequest,
        StoredTransferEvidenceRequest,
        VerifiedTransferEvidenceRequest,
        get_verified_transfer_evidence_for_placement,
        record_stored_transfer_evidence,
        replace_verified_transfer_evidence,
    )

    config = worker_config or StorageBalanceWorkerConfig.from_environment()
    placement = StorageArtifactPlacement.objects.select_related(
        "storage_node__node",
    ).get(pk=request.placement_id)
    if placement.state != StorageArtifactPlacement.State.COMMITTED:
        raise ValueError("only a committed placement can rotate its recipient key")
    replacement = StorageTransferEvidence.objects.filter(
        placement=placement,
        store_idempotency_key=_key(request.idempotency_key, "store-evidence"),
    ).first()
    if (
        replacement is not None
        and replacement.state == StorageTransferEvidence.State.VERIFIED
    ):
        prior = StorageTransferEvidence.objects.get(
            placement=placement,
            retire_idempotency_key=_key(request.idempotency_key, "retire-prior"),
        )
        return StorageRekeyResult(
            placement_id=placement.pk,
            prior_evidence_id=prior.pk,
            replacement_evidence_id=replacement.pk,
            recipient_key_id=replacement.recipient_key_id,
        )
    prior = get_verified_transfer_evidence_for_placement(placement_id=placement.pk)
    plaintext_path = config.staging_directory / (
        hashlib.sha256(str(placement.pk).encode()).hexdigest() + ".rekey-plaintext"
    )
    prepared = None
    client = client_factory(prior.node_key)
    if replacement is None:
        client.fetch_plaintext(
            ciphertext_sha256=prior.ciphertext_sha256,
            expected_plaintext_sha256=placement.sha256,
            expected_plaintext_size=placement.expected_size_bytes,
            destination=plaintext_path,
        )
        prepared, receipt = client.prepare_and_store(
            source_path=plaintext_path,
            staging_directory=config.staging_directory,
            idempotency_key=_key(request.idempotency_key, "store"),
            artifact_kind=StorageTransferArtifactKind(placement.artifact_kind),
        )
        if receipt.recipient_key_id == prior.recipient_key_id:
            raise ValueError("recipient key rotation did not select a new key")
        replacement = record_stored_transfer_evidence(
            request=StoredTransferEvidenceRequest(
                placement_id=placement.pk,
                rotation_id=None,
                node_key=prior.node_key,
                artifact_kind=placement.artifact_kind,
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
    if replacement.state == StorageTransferEvidence.State.STORED:
        verification = client.verify(replacement.ciphertext_sha256)
        if (
            not verification.valid
            or verification.ciphertext_sha256 != replacement.ciphertext_sha256
            or verification.plaintext_sha256 != placement.sha256
            or verification.plaintext_size != placement.expected_size_bytes
        ):
            raise ValueError("replacement envelope failed storage-node verification")
        verified_at = timezone.now()
        replacement = replace_verified_transfer_evidence(
            request=ReplacementTransferEvidenceRequest(
                prior_evidence_id=prior.pk,
                verification=VerifiedTransferEvidenceRequest(
                    evidence_id=replacement.pk,
                    ciphertext_sha256=replacement.ciphertext_sha256,
                    plaintext_sha256=replacement.plaintext_sha256,
                    plaintext_size=replacement.plaintext_size,
                    verifier="lx-storage-rekey:v1",
                    evidence_reference=(f"node-verify:{replacement.ciphertext_sha256}"),
                    verified_at=verified_at,
                    idempotency_key=_key(request.idempotency_key, "verify-evidence"),
                ),
                retired_at=verified_at,
                retirement_idempotency_key=_key(
                    request.idempotency_key,
                    "retire-prior",
                ),
            ),
        )
    plaintext_path.unlink(missing_ok=True)
    if prepared is not None:
        prepared.ciphertext_path.unlink(missing_ok=True)
        prepared.metadata_path.unlink(missing_ok=True)
    return StorageRekeyResult(
        placement_id=placement.pk,
        prior_evidence_id=prior.pk,
        replacement_evidence_id=replacement.pk,
        recipient_key_id=replacement.recipient_key_id,
    )


def cleanup_retired_rekey_evidence(
    *,
    evidence_id: UUID,
    client_factory: Callable[[str], StorageTransferPeerClient],
) -> StorageRekeyCleanupResult:
    from endoreg_db.models import (
        MediaOperationLease,
        StorageArtifactKind,
        StorageTransferEvidence,
    )
    from endoreg_db.services.hub.storage_transfer import (
        DeletedTransferEvidenceRequest,
        record_deleted_transfer_evidence,
    )

    evidence = StorageTransferEvidence.objects.select_related("placement").get(
        pk=evidence_id,
    )
    if evidence.state == StorageTransferEvidence.State.DELETED:
        return StorageRekeyCleanupResult(evidence_id=evidence.pk, deleted=False)
    if evidence.state != StorageTransferEvidence.State.RETIRED:
        raise ValueError("only retired recipient-key evidence can be cleaned")
    placement = evidence.placement
    replacement_exists = (
        StorageTransferEvidence.objects.filter(
            placement=placement,
            state=StorageTransferEvidence.State.VERIFIED,
            plaintext_sha256=evidence.plaintext_sha256,
            plaintext_size=evidence.plaintext_size,
        )
        .exclude(pk=evidence.pk)
        .exists()
    )
    if not replacement_exists:
        raise ValueError("retired envelope has no verified replacement")
    lease_aware = {
        StorageArtifactKind.ANONYMIZED_VIDEO,
        StorageArtifactKind.VIDEO_HLS,
        StorageArtifactKind.STREAMABLE_VIDEO,
    }
    if (
        placement.artifact_kind in lease_aware
        and placement.media_lease_video_id is None
    ):
        raise ValueError("lease-aware rekey cleanup has no authoritative video")
    if (
        placement.media_lease_video_id is not None
        and MediaOperationLease.objects.filter(
            video_id=placement.media_lease_video_id,
            expires_at__gt=timezone.now(),
        ).exists()
    ):
        raise ValueError("active media lease blocks retired envelope cleanup")
    receipt = client_factory(evidence.node_key).delete(
        evidence.ciphertext_sha256,
        idempotency_key=f"rekey-cleanup:{evidence.pk}:delete",
    )
    if receipt.digest != evidence.ciphertext_sha256:
        raise ValueError("retired envelope deletion receipt has the wrong digest")
    record_deleted_transfer_evidence(
        request=DeletedTransferEvidenceRequest(
            evidence_id=evidence.pk,
            ciphertext_sha256=evidence.ciphertext_sha256,
            node_key=evidence.node_key,
            deleted_at=timezone.now(),
            idempotency_key=f"rekey-cleanup:{evidence.pk}:evidence",
        ),
    )
    return StorageRekeyCleanupResult(evidence_id=evidence.pk, deleted=receipt.deleted)


__all__ = [
    "StorageRekeyCleanupResult",
    "StorageRekeyRequest",
    "StorageRekeyResult",
    "cleanup_retired_rekey_evidence",
    "rekey_storage_placement",
]
