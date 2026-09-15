"""Fail-closed recovery planning for persisted storage-balance work."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any
from uuid import UUID


class StorageBalanceRecoveryDisposition(StrEnum):
    REDISPATCH = "redispatch"
    REFUSE = "refuse"


class StorageBalanceRecoveryReason(StrEnum):
    RECOVERABLE = "recoverable"
    CANCELLED = "cancelled"
    INCOMPLETE_PAYLOAD = "incomplete_payload"
    LIFECYCLE_MISMATCH = "lifecycle_mismatch"
    RESERVATION_MISMATCH = "reservation_mismatch"
    TARGET_MISMATCH = "target_mismatch"
    EVIDENCE_MISMATCH = "evidence_mismatch"


@dataclass(frozen=True, slots=True)
class StorageBalanceRecoveryDecision:
    work_item_id: UUID
    rotation_id: UUID | None
    disposition: StorageBalanceRecoveryDisposition
    reason: StorageBalanceRecoveryReason
    rotation_state: str


@dataclass(frozen=True, slots=True)
class StorageBalanceRecoveryPlan:
    decisions: tuple[StorageBalanceRecoveryDecision, ...]

    @property
    def redispatch_ids(self) -> tuple[UUID, ...]:
        return tuple(
            decision.work_item_id
            for decision in self.decisions
            if decision.disposition is StorageBalanceRecoveryDisposition.REDISPATCH
        )

    @property
    def refused(self) -> tuple[StorageBalanceRecoveryDecision, ...]:
        return tuple(
            decision
            for decision in self.decisions
            if decision.disposition is StorageBalanceRecoveryDisposition.REFUSE
        )


def _decision(
    work: Any,
    *,
    disposition: StorageBalanceRecoveryDisposition,
    reason: StorageBalanceRecoveryReason,
) -> StorageBalanceRecoveryDecision:
    rotation = getattr(work, "rotation", None)
    return StorageBalanceRecoveryDecision(
        work_item_id=UUID(str(work.pk)),
        rotation_id=(
            UUID(str(rotation.pk))
            if rotation is not None and getattr(rotation, "pk", None) is not None
            else None
        ),
        disposition=disposition,
        reason=reason,
        rotation_state=str(getattr(rotation, "state", "")),
    )


def classify_storage_balance_recovery(work: Any) -> StorageBalanceRecoveryDecision:
    """Classify one immutable work item without mutating lifecycle state.

    Recovery is deliberately stricter than worker execution: an inconsistent row is
    left untouched for reconciliation instead of being guessed back into a workflow.
    """

    if getattr(work, "cancellation_receipt", None) is not None:
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.CANCELLED,
        )

    rotation = getattr(work, "rotation", None)
    reservation = getattr(work, "reservation", None)
    source = getattr(work, "source_placement", None)
    target = getattr(work, "target_placement", None)
    if any(item is None for item in (rotation, reservation, source, target)):
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.INCOMPLETE_PAYLOAD,
        )
    if str(getattr(work, "status", "")) != "rotation_requested":
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.LIFECYCLE_MISMATCH,
        )

    if (
        getattr(rotation, "source_placement_id", None) != getattr(source, "pk", None)
        or getattr(rotation, "target_placement_id", None) != getattr(target, "pk", None)
        or str(getattr(rotation, "artifact_key", ""))
        != str(getattr(work, "artifact_key", ""))
        or str(getattr(rotation, "artifact_kind", ""))
        != str(getattr(work, "artifact_kind", ""))
        or int(getattr(rotation, "expected_size_bytes", 0))
        != int(getattr(work, "expected_size_bytes", 0))
        or str(getattr(rotation, "sha256", "")) != str(getattr(work, "sha256", ""))
    ):
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.TARGET_MISMATCH,
        )
    if (
        getattr(target, "reservation_id", None) != getattr(reservation, "pk", None)
        or str(getattr(target, "state", "")) != "reserved"
    ):
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.TARGET_MISMATCH,
        )

    rotation_state = str(getattr(rotation, "state", ""))
    if rotation_state not in {"requested", "copying", "copied", "verified"}:
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.LIFECYCLE_MISMATCH,
        )
    reservation_state = str(getattr(reservation, "status", ""))
    allowed_reservation_states = (
        {"active", "consumed"} if rotation_state == "verified" else {"active"}
    )
    if reservation_state not in allowed_reservation_states:
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.RESERVATION_MISMATCH,
        )
    evidence = getattr(rotation, "target_transfer_evidence", None)
    evidence_state = None if evidence is None else str(evidence.state)
    allowed_evidence: dict[str, set[str | None]] = {
        "requested": {None},
        "copying": {None, "stored", "verified"},
        "copied": {"stored", "verified"},
        "verified": {"verified"},
    }
    if evidence_state not in allowed_evidence[rotation_state]:
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.EVIDENCE_MISMATCH,
        )
    if (
        rotation_state == "verified"
        and getattr(rotation, "verification_receipt", None) is None
    ):
        return _decision(
            work,
            disposition=StorageBalanceRecoveryDisposition.REFUSE,
            reason=StorageBalanceRecoveryReason.EVIDENCE_MISMATCH,
        )

    return _decision(
        work,
        disposition=StorageBalanceRecoveryDisposition.REDISPATCH,
        reason=StorageBalanceRecoveryReason.RECOVERABLE,
    )


def plan_storage_balance_recovery(*, maximum: int) -> StorageBalanceRecoveryPlan:
    """Return a bounded, ordered recovery plan for non-terminal persisted work."""

    if maximum <= 0 or maximum > 1_000:
        raise ValueError("maximum must be between 1 and 1000")

    from endoreg_db.models import StorageBalanceWorkItem, StorageRotation

    rows = list(
        StorageBalanceWorkItem.objects.filter(
            status="rotation_requested",
            rotation__state__in=[
                StorageRotation.State.REQUESTED,
                StorageRotation.State.COPYING,
                StorageRotation.State.COPIED,
                StorageRotation.State.VERIFIED,
            ],
        )
        .select_related(
            "source_placement",
            "target_placement",
            "reservation",
            "rotation__target_transfer_evidence",
            "rotation__verification_receipt",
            "cancellation_receipt",
        )
        .order_by("updated_at", "pk")[: maximum * 4],
    )
    decisions: list[StorageBalanceRecoveryDecision] = []
    redispatch_count = 0
    for row in rows:
        decision = classify_storage_balance_recovery(row)
        decisions.append(decision)
        if decision.disposition is StorageBalanceRecoveryDisposition.REDISPATCH:
            redispatch_count += 1
            if redispatch_count == maximum:
                break
    return StorageBalanceRecoveryPlan(decisions=tuple(decisions))


__all__ = [
    "StorageBalanceRecoveryDecision",
    "StorageBalanceRecoveryDisposition",
    "StorageBalanceRecoveryPlan",
    "StorageBalanceRecoveryReason",
    "classify_storage_balance_recovery",
    "plan_storage_balance_recovery",
]
