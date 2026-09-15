"""Restart-safe execution of persisted hub storage balancing work."""

from __future__ import annotations

import hashlib
import os
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Protocol
from uuid import UUID

from django.utils import timezone

from .storage_transfer_client import (
    PreparedStorageEnvelope,
    StorageDeleteResult,
    StorageTransferArtifactKind,
    StorageTransferClient,
    StorageVerifyResult,
    StorageWriteReceipt,
)

if TYPE_CHECKING:
    from endoreg_db.services.hub.storage_balancing import BalancingPolicy


class StorageTransferPeerClient(Protocol):
    def fetch_plaintext(
        self,
        *,
        ciphertext_sha256: str,
        expected_plaintext_sha256: str,
        expected_plaintext_size: int,
        destination: Path,
    ) -> Path: ...

    def prepare_and_store(
        self,
        *,
        source_path: Path,
        staging_directory: Path,
        idempotency_key: str,
        artifact_kind: StorageTransferArtifactKind,
    ) -> tuple[PreparedStorageEnvelope, StorageWriteReceipt]: ...

    def verify(self, ciphertext_sha256: str) -> StorageVerifyResult: ...

    def delete(
        self,
        ciphertext_sha256: str,
        *,
        idempotency_key: str,
    ) -> StorageDeleteResult: ...


StorageClientFactory = Callable[[str], StorageTransferPeerClient]


@dataclass(frozen=True, slots=True)
class StorageBalanceWorkerConfig:
    staging_directory: Path

    @classmethod
    def from_environment(
        cls,
        environment: Mapping[str, str] | None = None,
    ) -> StorageBalanceWorkerConfig:
        values = os.environ if environment is None else environment
        staging = Path(str(values.get("HUB_STORAGE_STAGING_DIRECTORY", "")).strip())
        if not staging.is_absolute():
            raise ValueError("HUB_STORAGE_STAGING_DIRECTORY must be absolute")
        staging.mkdir(parents=True, exist_ok=True, mode=0o700)
        if staging.is_symlink() or not staging.is_dir():
            raise ValueError("hub storage staging must be a non-symlink directory")
        os.chmod(staging, 0o700)
        return cls(staging_directory=staging)


class StorageBalanceWorkCancelled(RuntimeError):
    """A persisted operator cancellation won the race before byte copying."""


@dataclass(frozen=True, slots=True)
class StorageBalancingRuntimeConfig:
    policy_version: str
    telemetry_max_age_seconds: int
    safety_margin_bytes: int
    reservation_ttl_seconds: int
    capacity_pressure_basis_points: int
    capacity_target_basis_points: int
    minimum_filesystem_headroom_bytes: int
    max_work_items: int

    @classmethod
    def from_environment(
        cls,
        environment: Mapping[str, str] | None = None,
    ) -> StorageBalancingRuntimeConfig:
        values = os.environ if environment is None else environment

        def positive(name: str) -> int:
            value = int(str(values.get(name, "")).strip())
            if value <= 0:
                raise ValueError(f"{name} must be positive")
            return value

        version = str(values.get("HUB_STORAGE_POLICY_VERSION", "")).strip()
        if not version:
            raise ValueError("HUB_STORAGE_POLICY_VERSION must not be blank")
        pressure = positive("HUB_STORAGE_CAPACITY_PRESSURE_BASIS_POINTS")
        target = positive("HUB_STORAGE_CAPACITY_TARGET_BASIS_POINTS")
        if pressure > 10_000 or target >= pressure:
            raise ValueError(
                "storage capacity targets must satisfy target < pressure <= 10000",
            )
        return cls(
            policy_version=version,
            telemetry_max_age_seconds=positive("HUB_STORAGE_TELEMETRY_MAX_AGE_SECONDS"),
            safety_margin_bytes=positive("HUB_STORAGE_SAFETY_MARGIN_BYTES"),
            reservation_ttl_seconds=positive("HUB_STORAGE_RESERVATION_TTL_SECONDS"),
            capacity_pressure_basis_points=pressure,
            capacity_target_basis_points=target,
            minimum_filesystem_headroom_bytes=positive(
                "HUB_STORAGE_MINIMUM_FILESYSTEM_HEADROOM_BYTES",
            ),
            max_work_items=positive("HUB_STORAGE_MAX_WORK_ITEMS"),
        )

    def balancing_policy(self) -> BalancingPolicy:
        from endoreg_db.services.hub.storage_balancing import BalancingPolicy
        from endoreg_db.services.hub.storage_placement import PlacementPolicy

        return BalancingPolicy(
            version=self.policy_version,
            placement_policy=PlacementPolicy(
                version=self.policy_version,
                telemetry_max_age=timedelta(seconds=self.telemetry_max_age_seconds),
                safety_margin_bytes=self.safety_margin_bytes,
                reservation_ttl=timedelta(seconds=self.reservation_ttl_seconds),
            ),
            capacity_pressure_basis_points=self.capacity_pressure_basis_points,
            capacity_target_basis_points=self.capacity_target_basis_points,
            minimum_filesystem_headroom_bytes=self.minimum_filesystem_headroom_bytes,
            max_work_items=self.max_work_items,
        )


@dataclass(frozen=True, slots=True)
class StorageBalanceExecutionResult:
    work_item_id: UUID
    rotation_id: UUID
    state: str
    target_evidence_id: UUID | None


@dataclass(frozen=True, slots=True)
class StorageCleanupExecutionResult:
    rotation_id: UUID
    state: str
    source_evidence_id: UUID


def default_storage_client_factory(node_key: str) -> StorageTransferClient:
    return StorageTransferClient.from_environment(node_key)


def _key(work_item_id: UUID, action: str) -> str:
    return f"balance:{work_item_id}:{action}"


def _plaintext_path(config: StorageBalanceWorkerConfig, work_item_id: UUID) -> Path:
    digest = hashlib.sha256(str(work_item_id).encode()).hexdigest()
    return config.staging_directory / f"{digest}.plaintext"


def _unlink_staging(path: Path, prepared: PreparedStorageEnvelope | None) -> None:
    for candidate in (
        path,
        prepared.ciphertext_path if prepared is not None else None,
        prepared.metadata_path if prepared is not None else None,
    ):
        if candidate is not None:
            candidate.unlink(missing_ok=True)


def _execute_storage_balance_work_item(
    *,
    work_item_id: UUID,
    config: StorageBalanceWorkerConfig | None = None,
    client_factory: StorageClientFactory = default_storage_client_factory,
) -> StorageBalanceExecutionResult:
    """Copy, verify, publish, and locally clean one persisted balancing item."""

    from endoreg_db.models import (
        StorageBalanceWorkItem,
        StorageBalanceWorkStatus,
        StorageReservation,
        StorageRotation,
        StorageTransferEvidence,
    )
    from endoreg_db.services.hub.storage_placement import (
        ReservationTransitionRequest,
        transition_storage_reservation,
    )
    from endoreg_db.services.hub.storage_rotation import (
        RotationVerificationRequest,
        advance_storage_rotation,
        record_storage_rotation_verification,
    )
    from endoreg_db.services.hub.storage_transfer import (
        STORAGE_TRANSFER_EVIDENCE_CONTRACT_VERSION,
        StoredTransferEvidenceRequest,
        VerifiedTransferEvidenceRequest,
        get_verified_transfer_evidence_for_placement,
        record_stored_transfer_evidence,
        record_verified_transfer_evidence,
    )

    if STORAGE_TRANSFER_EVIDENCE_CONTRACT_VERSION != "hub-storage-transfer-evidence-v1":
        raise RuntimeError("incompatible endoreg-db storage transfer evidence contract")
    worker_config = config or StorageBalanceWorkerConfig.from_environment()
    worker_config.staging_directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    if worker_config.staging_directory.is_symlink():
        raise ValueError("hub storage staging must not be a symlink")
    os.chmod(worker_config.staging_directory, 0o700)
    work = StorageBalanceWorkItem.objects.select_related(
        "source_placement__storage_node__node",
        "target_placement__storage_node__node",
        "reservation",
        "rotation",
        "cancellation_receipt",
    ).get(pk=work_item_id)
    if (
        work.status != StorageBalanceWorkStatus.ROTATION_REQUESTED
        or work.rotation is None
        or work.target_placement is None
        or work.reservation is None
    ):
        raise ValueError("balance work item has no executable rotation payload")
    if work.target_placement_id is None:
        raise ValueError("balance work item target placement identifier is absent")
    rotation = work.rotation
    if getattr(work, "cancellation_receipt", None) is not None:
        raise StorageBalanceWorkCancelled(
            "balance work was cancelled and compensated before byte copying",
        )
    prepared: PreparedStorageEnvelope | None = None
    plaintext_path = _plaintext_path(worker_config, work.pk)

    if rotation.state == StorageRotation.State.REQUESTED:
        advance_storage_rotation(
            rotation_id=rotation.pk,
            expected_state=StorageRotation.State.REQUESTED,
            target_state=StorageRotation.State.COPYING,
            idempotency_key=_key(work.pk, "copying"),
        )
        rotation.refresh_from_db()

    evidence = StorageTransferEvidence.objects.filter(rotation=rotation).first()
    if rotation.state == StorageRotation.State.COPYING and evidence is None:
        source_evidence = get_verified_transfer_evidence_for_placement(
            placement_id=work.source_placement_id,
        )
        source_client = client_factory(source_evidence.node_key)
        source_client.fetch_plaintext(
            ciphertext_sha256=source_evidence.ciphertext_sha256,
            expected_plaintext_sha256=work.sha256,
            expected_plaintext_size=work.expected_size_bytes,
            destination=plaintext_path,
        )
        target_key = work.target_placement.storage_node.node.node_key
        target_client = client_factory(target_key)
        prepared, write_receipt = target_client.prepare_and_store(
            source_path=plaintext_path,
            staging_directory=worker_config.staging_directory,
            idempotency_key=_key(work.pk, "store"),
            artifact_kind=StorageTransferArtifactKind(work.artifact_kind),
        )
        evidence = record_stored_transfer_evidence(
            request=StoredTransferEvidenceRequest(
                placement_id=work.target_placement_id,
                rotation_id=rotation.pk,
                node_key=target_key,
                artifact_kind=work.artifact_kind,
                envelope_profile=prepared.envelope.profile,
                recipient_key_id=write_receipt.recipient_key_id,
                plaintext_sha256=write_receipt.plaintext_sha256,
                plaintext_size=write_receipt.plaintext_size,
                ciphertext_sha256=write_receipt.ciphertext_sha256,
                ciphertext_size=write_receipt.ciphertext_size,
                stored_at=timezone.now(),
                idempotency_key=_key(work.pk, "store-evidence"),
            ),
        )

    if rotation.state == StorageRotation.State.COPYING:
        if evidence is None:
            raise RuntimeError("copy completed without persisted transfer evidence")
        advance_storage_rotation(
            rotation_id=rotation.pk,
            expected_state=StorageRotation.State.COPYING,
            target_state=StorageRotation.State.COPIED,
            idempotency_key=_key(work.pk, "copied"),
        )
        rotation.refresh_from_db()

    if evidence is None:
        evidence = StorageTransferEvidence.objects.get(rotation=rotation)
    target_client = client_factory(evidence.node_key)
    if evidence.state == StorageTransferEvidence.State.STORED:
        node_verification = target_client.verify(evidence.ciphertext_sha256)
        if (
            not node_verification.valid
            or node_verification.ciphertext_sha256 != evidence.ciphertext_sha256
            or node_verification.plaintext_sha256 != evidence.plaintext_sha256
            or node_verification.plaintext_size != evidence.plaintext_size
        ):
            raise ValueError(
                "storage-node verification does not match transfer evidence",
            )
        evidence = record_verified_transfer_evidence(
            request=VerifiedTransferEvidenceRequest(
                evidence_id=evidence.pk,
                ciphertext_sha256=evidence.ciphertext_sha256,
                plaintext_sha256=evidence.plaintext_sha256,
                plaintext_size=evidence.plaintext_size,
                verifier="lx-storage-balance-worker:v1",
                evidence_reference=f"node-verify:{evidence.ciphertext_sha256}",
                verified_at=timezone.now(),
                idempotency_key=_key(work.pk, "verify-evidence"),
            ),
        )
    if evidence.verified_at is None:
        raise RuntimeError("verified transfer evidence has no verification time")

    receipt = getattr(rotation, "verification_receipt", None)
    if rotation.state == StorageRotation.State.COPIED and receipt is None:
        receipt = record_storage_rotation_verification(
            request=RotationVerificationRequest(
                rotation_id=rotation.pk,
                transfer_evidence_id=evidence.pk,
                expected_size_bytes=evidence.plaintext_size,
                sha256=evidence.plaintext_sha256,
                target_node_key=evidence.node_key,
                placement_generation=work.target_placement.generation,
                verifier="lx-storage-balance-worker:v1",
                evidence_reference=f"transfer-evidence:{evidence.pk}",
                verified_at=evidence.verified_at,
                idempotency_key=_key(work.pk, "rotation-verification"),
            ),
        )
        advance_storage_rotation(
            rotation_id=rotation.pk,
            expected_state=StorageRotation.State.COPIED,
            target_state=StorageRotation.State.VERIFIED,
            verification_receipt_id=receipt.pk,
            idempotency_key=_key(work.pk, "verified"),
        )
        rotation.refresh_from_db()

    if rotation.state == StorageRotation.State.VERIFIED:
        transition_storage_reservation(
            request=ReservationTransitionRequest(
                reservation_id=work.reservation.pk,
                target_status=StorageReservation.Status.CONSUMED,
                idempotency_key=_key(work.pk, "reservation-consumed"),
            ),
        )
        if receipt is None:
            receipt = getattr(rotation, "verification_receipt")
        advance_storage_rotation(
            rotation_id=rotation.pk,
            expected_state=StorageRotation.State.VERIFIED,
            target_state=StorageRotation.State.COMMITTED,
            verification_receipt_id=receipt.pk,
            idempotency_key=_key(work.pk, "committed"),
        )
        rotation.refresh_from_db()

    if rotation.state != StorageRotation.State.COMMITTED:
        raise RuntimeError(f"rotation stopped in non-committed state {rotation.state}")
    _unlink_staging(plaintext_path, prepared)
    return StorageBalanceExecutionResult(
        work_item_id=work.pk,
        rotation_id=rotation.pk,
        state=rotation.state,
        target_evidence_id=evidence.pk,
    )


def _record_terminal_balance_failure(*, work_item_id: UUID, reason: str) -> None:
    from endoreg_db.models import (
        StorageBalanceWorkItem,
        StorageReservation,
        StorageRotation,
        StorageTransferEvidence,
    )
    from endoreg_db.services.hub.storage_placement import (
        ReservationTransitionRequest,
        transition_storage_reservation,
    )
    from endoreg_db.services.hub.storage_rotation import advance_storage_rotation
    from endoreg_db.services.hub.storage_transfer import (
        record_failed_transfer_evidence,
    )

    work = StorageBalanceWorkItem.objects.select_related("reservation", "rotation").get(
        pk=work_item_id,
    )
    rotation = work.rotation
    if rotation is None:
        return
    evidence = StorageTransferEvidence.objects.filter(rotation=rotation).first()
    if evidence is not None and evidence.state == StorageTransferEvidence.State.STORED:
        record_failed_transfer_evidence(evidence_id=evidence.pk, failure_reason=reason)
    reservation = work.reservation
    if reservation is not None and reservation.status in {
        StorageReservation.Status.ACTIVE,
        StorageReservation.Status.CONSUMED,
    }:
        transition_storage_reservation(
            request=ReservationTransitionRequest(
                reservation_id=reservation.pk,
                target_status=StorageReservation.Status.RELEASED,
                idempotency_key=_key(work.pk, "terminal-release"),
            ),
        )
    rotation.refresh_from_db()
    if rotation.state in {
        StorageRotation.State.REQUESTED,
        StorageRotation.State.COPYING,
        StorageRotation.State.COPIED,
        StorageRotation.State.VERIFIED,
    }:
        advance_storage_rotation(
            rotation_id=rotation.pk,
            expected_state=StorageRotation.State(rotation.state),
            target_state=StorageRotation.State.FAILED,
            failure_reason=reason,
            idempotency_key=_key(work.pk, "terminal-failure"),
        )


def execute_storage_balance_work_item(
    *,
    work_item_id: UUID,
    config: StorageBalanceWorkerConfig | None = None,
    client_factory: StorageClientFactory = default_storage_client_factory,
) -> StorageBalanceExecutionResult:
    try:
        return _execute_storage_balance_work_item(
            work_item_id=work_item_id,
            config=config,
            client_factory=client_factory,
        )
    except (ConnectionError, TimeoutError):
        raise
    except Exception as exc:
        reason = f"worker_terminal:{type(exc).__name__}"
        _record_terminal_balance_failure(work_item_id=work_item_id, reason=reason)
        raise


def execute_storage_rotation_cleanup(
    *,
    rotation_id: UUID,
    client_factory: StorageClientFactory = default_storage_client_factory,
) -> StorageCleanupExecutionResult:
    from endoreg_db.models import StorageRotation, StorageTransferEvidence
    from endoreg_db.services.hub.storage_rotation import (
        RotationCleanupRequest,
        RotationError,
        RotationErrorCode,
        advance_storage_rotation,
        record_storage_rotation_cleanup_readiness,
    )
    from endoreg_db.services.hub.storage_transfer import (
        STORAGE_CLEANUP_AUTHORIZATION_CONTRACT_VERSION,
        DeletedTransferEvidenceRequest,
        record_deleted_transfer_evidence,
    )

    if (
        STORAGE_CLEANUP_AUTHORIZATION_CONTRACT_VERSION
        != "hub-storage-cleanup-authorization-v1"
    ):
        raise RuntimeError("incompatible storage cleanup authorization contract")

    rotation = StorageRotation.objects.select_related(
        "source_placement__storage_node__node",
        "target_placement__storage_node__node",
        "verification_receipt",
        "cleanup_receipt",
    ).get(pk=rotation_id)
    source_evidence = (
        StorageTransferEvidence.objects.filter(
            placement=rotation.source_placement,
            state__in=[
                StorageTransferEvidence.State.VERIFIED,
                StorageTransferEvidence.State.RETIRED,
                StorageTransferEvidence.State.DELETED,
            ],
        )
        .order_by("-envelope_generation")
        .first()
    )
    if source_evidence is None:
        raise RuntimeError("rotation source has no removable transfer evidence")
    if rotation.state == StorageRotation.State.CLEANED:
        return StorageCleanupExecutionResult(
            rotation_id=rotation.pk,
            state=rotation.state,
            source_evidence_id=source_evidence.pk,
        )
    if rotation.state not in {
        StorageRotation.State.COMMITTED,
        StorageRotation.State.CLEANUP_DEFERRED,
    }:
        raise ValueError("rotation is not ready for source cleanup")
    cleanup = getattr(rotation, "cleanup_receipt", None)
    if cleanup is None:
        verification_receipt = getattr(rotation, "verification_receipt", None)
        if verification_receipt is None:
            raise RuntimeError("committed rotation has no verification receipt")
        observed_at = timezone.now()
        try:
            cleanup = record_storage_rotation_cleanup_readiness(
                request=RotationCleanupRequest(
                    rotation_id=rotation.pk,
                    verification_receipt_id=verification_receipt.pk,
                    source_transfer_evidence_id=source_evidence.pk,
                    expected_size_bytes=rotation.expected_size_bytes,
                    sha256=rotation.sha256,
                    source_node_key=source_evidence.node_key,
                    target_node_key=(
                        rotation.target_placement.storage_node.node.node_key
                    ),
                    placement_generation=rotation.target_placement.generation,
                    reconciler="lx-storage-cleanup-worker:v1",
                    evidence_reference=f"cleanup:{rotation.pk}",
                    media_leases_absent_at=observed_at,
                    replicas_verified_at=observed_at,
                    reconciled_at=observed_at,
                    idempotency_key=f"cleanup:{rotation.pk}:readiness",
                ),
            )
        except RotationError as exc:
            if exc.code is not RotationErrorCode.CLEANUP_BLOCKED:
                raise
            if rotation.state == StorageRotation.State.COMMITTED:
                advance_storage_rotation(
                    rotation_id=rotation.pk,
                    expected_state=StorageRotation.State.COMMITTED,
                    target_state=StorageRotation.State.CLEANUP_DEFERRED,
                    idempotency_key=f"cleanup:{rotation.pk}:deferred",
                )
                rotation.refresh_from_db()
            return StorageCleanupExecutionResult(
                rotation_id=rotation.pk,
                state=rotation.state,
                source_evidence_id=source_evidence.pk,
            )
    if source_evidence.state != StorageTransferEvidence.State.DELETED:
        deletion = client_factory(source_evidence.node_key).delete(
            source_evidence.ciphertext_sha256,
            idempotency_key=f"cleanup:{rotation.pk}:delete",
        )
        if deletion.digest != source_evidence.ciphertext_sha256:
            raise ValueError("storage-node deletion receipt has the wrong digest")
        source_evidence = record_deleted_transfer_evidence(
            request=DeletedTransferEvidenceRequest(
                evidence_id=source_evidence.pk,
                ciphertext_sha256=source_evidence.ciphertext_sha256,
                node_key=source_evidence.node_key,
                deleted_at=timezone.now(),
                idempotency_key=f"cleanup:{rotation.pk}:delete-evidence",
                cleanup_authorization_id=cleanup.pk,
            ),
        )
    advance_storage_rotation(
        rotation_id=rotation.pk,
        expected_state=StorageRotation.State(rotation.state),
        target_state=StorageRotation.State.CLEANED,
        cleanup_receipt_id=cleanup.pk,
        idempotency_key=f"cleanup:{rotation.pk}:cleaned",
    )
    rotation.refresh_from_db()
    return StorageCleanupExecutionResult(
        rotation_id=rotation.pk,
        state=rotation.state,
        source_evidence_id=source_evidence.pk,
    )


def expire_due_storage_reservations(*, maximum: int) -> int:
    from endoreg_db.models import StorageReservation
    from endoreg_db.services.hub.storage_placement import (
        ReservationTransitionRequest,
        transition_storage_reservation,
    )

    if maximum <= 0:
        raise ValueError("maximum must be positive")
    now = timezone.now()
    reservation_ids = list(
        StorageReservation.objects.filter(
            status=StorageReservation.Status.ACTIVE,
            expires_at__lte=now,
        )
        .order_by("expires_at", "pk")
        .values_list("pk", flat=True)[:maximum],
    )
    for reservation_id in reservation_ids:
        transition_storage_reservation(
            request=ReservationTransitionRequest(
                reservation_id=reservation_id,
                target_status=StorageReservation.Status.EXPIRED,
                idempotency_key=f"reservation:{reservation_id}:expired",
            ),
            now=now,
        )
    return len(reservation_ids)


__all__ = [
    "StorageBalanceExecutionResult",
    "StorageBalanceWorkCancelled",
    "StorageBalanceWorkerConfig",
    "StorageBalancingRuntimeConfig",
    "StorageTransferPeerClient",
    "execute_storage_balance_work_item",
    "StorageCleanupExecutionResult",
    "execute_storage_rotation_cleanup",
    "expire_due_storage_reservations",
    "default_storage_client_factory",
]
