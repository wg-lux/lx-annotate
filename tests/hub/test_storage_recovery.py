from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch
from uuid import UUID, uuid4

import pytest
from django.test import override_settings
from django.utils import timezone
from endoreg_db.models import (
    NetworkNode,
    StorageArtifactKind,
    StorageArtifactPlacement,
    StorageNodeCapability,
    StorageNodeState,
)
from endoreg_db.services.hub.storage_balancing import (
    BalancingPolicy,
    StorageBalanceCancellationRequest,
    cancel_storage_balance_work,
    reconcile_storage_balancing,
)
from endoreg_db.services.hub.storage_placement import PlacementPolicy

from lx_annotate import tasks
from lx_annotate.hub.storage_recovery import (
    StorageBalanceRecoveryDecision,
    StorageBalanceRecoveryDisposition,
    StorageBalanceRecoveryPlan,
    StorageBalanceRecoveryReason,
    classify_storage_balance_recovery,
    plan_storage_balance_recovery,
)


def _work(
    *,
    rotation_state: str = "requested",
    reservation_state: str = "active",
    evidence_state: str | None = None,
    cancelled: bool = False,
) -> SimpleNamespace:
    source_id = uuid4()
    target_id = uuid4()
    reservation_id = uuid4()
    rotation_id = uuid4()
    evidence = None if evidence_state is None else SimpleNamespace(state=evidence_state)
    rotation = SimpleNamespace(
        pk=rotation_id,
        state=rotation_state,
        source_placement_id=source_id,
        target_placement_id=target_id,
        artifact_key="artifact:1",
        artifact_kind="sidecar",
        expected_size_bytes=42,
        sha256="a" * 64,
        target_transfer_evidence=evidence,
        verification_receipt=(
            SimpleNamespace(pk=uuid4()) if rotation_state == "verified" else None
        ),
    )
    return SimpleNamespace(
        pk=uuid4(),
        status="rotation_requested",
        source_placement=SimpleNamespace(pk=source_id),
        target_placement=SimpleNamespace(
            pk=target_id,
            state="reserved",
            reservation_id=reservation_id,
        ),
        reservation=SimpleNamespace(pk=reservation_id, status=reservation_state),
        rotation=rotation,
        cancellation_receipt=(SimpleNamespace(pk=uuid4()) if cancelled else None),
        artifact_key="artifact:1",
        artifact_kind="sidecar",
        expected_size_bytes=42,
        sha256="a" * 64,
    )


@pytest.mark.parametrize(
    ("rotation_state", "reservation_state", "evidence_state"),
    [
        ("requested", "active", None),
        ("copying", "active", None),
        ("copying", "active", "stored"),
        ("copied", "active", "verified"),
        ("verified", "active", "verified"),
        ("verified", "consumed", "verified"),
    ],
)
def test_recovery_classification_accepts_only_resumable_lifecycle_combinations(
    rotation_state: str,
    reservation_state: str,
    evidence_state: str | None,
) -> None:
    decision = classify_storage_balance_recovery(
        _work(
            rotation_state=rotation_state,
            reservation_state=reservation_state,
            evidence_state=evidence_state,
        ),
    )

    assert decision.disposition is StorageBalanceRecoveryDisposition.REDISPATCH
    assert decision.reason is StorageBalanceRecoveryReason.RECOVERABLE


@pytest.mark.parametrize(
    ("work", "reason"),
    [
        (_work(cancelled=True), StorageBalanceRecoveryReason.CANCELLED),
        (
            _work(rotation_state="copying", evidence_state="failed"),
            StorageBalanceRecoveryReason.EVIDENCE_MISMATCH,
        ),
        (
            _work(rotation_state="copied", evidence_state=None),
            StorageBalanceRecoveryReason.EVIDENCE_MISMATCH,
        ),
        (
            _work(rotation_state="copying", reservation_state="released"),
            StorageBalanceRecoveryReason.RESERVATION_MISMATCH,
        ),
        (
            _work(rotation_state="committed", reservation_state="consumed"),
            StorageBalanceRecoveryReason.LIFECYCLE_MISMATCH,
        ),
    ],
)
def test_recovery_classification_refuses_cancelled_or_inconsistent_work(
    work: SimpleNamespace,
    reason: StorageBalanceRecoveryReason,
) -> None:
    decision = classify_storage_balance_recovery(work)

    assert decision.disposition is StorageBalanceRecoveryDisposition.REFUSE
    assert decision.reason is reason


def test_recovery_plan_rejects_unbounded_limits() -> None:
    with pytest.raises(ValueError, match="between 1 and 1000"):
        plan_storage_balance_recovery(maximum=0)
    with pytest.raises(ValueError, match="between 1 and 1000"):
        plan_storage_balance_recovery(maximum=1_001)


def _node(key: str, domain: str, *, draining: bool) -> StorageNodeState:
    node = NetworkNode.objects.create(
        node_key=key,
        display_name=key,
        role=NetworkNode.Role.STORAGE_NODE,
    )
    state = StorageNodeState.objects.create(
        node=node,
        is_draining=draining,
        is_reachable=True,
        accepting_writes=True,
        failure_domain=domain,
        residency_key="de",
        total_bytes=100_000,
        filesystem_free_bytes=90_000,
        policy_usable_bytes=80_000,
        committed_bytes=42 if draining else 0,
        observed_at=timezone.now(),
    )
    StorageNodeCapability.objects.create(
        storage_node=state,
        artifact_kind=StorageArtifactKind.SIDECAR,
    )
    return state


def _policy() -> BalancingPolicy:
    from datetime import timedelta

    return BalancingPolicy(
        version="balance-v1",
        placement_policy=PlacementPolicy(
            version="placement-v1",
            telemetry_max_age=timedelta(minutes=5),
            safety_margin_bytes=10,
            reservation_ttl=timedelta(minutes=10),
        ),
        capacity_pressure_basis_points=9_000,
        capacity_target_basis_points=7_000,
        minimum_filesystem_headroom_bytes=10,
        max_work_items=1,
    )


@pytest.mark.django_db
def test_orm_recovery_plan_excludes_persisted_cancellation() -> None:
    source = _node("recovery-source", "rack-a", draining=True)
    _node("recovery-target", "rack-b", draining=False)
    StorageArtifactPlacement.objects.create(
        storage_node=source,
        artifact_key="artifact:recovery:1",
        artifact_kind=StorageArtifactKind.SIDECAR,
        role=StorageArtifactPlacement.Role.PRIMARY,
        state=StorageArtifactPlacement.State.COMMITTED,
        generation=1,
        expected_size_bytes=42,
        sha256="a" * 64,
        policy_version="placement-v1",
        committed_at=timezone.now(),
    )
    work = reconcile_storage_balancing(policy=_policy())[0]

    initial = plan_storage_balance_recovery(maximum=1)
    assert initial.redispatch_ids == (work.pk,)

    cancel_storage_balance_work(
        request=StorageBalanceCancellationRequest(
            work_item_id=work.pk,
            actor="test:operator",
            reason="operator stopped the queued move",
            idempotency_key="cancel-recovery-test-0001",
        ),
    )

    after_cancel = plan_storage_balance_recovery(maximum=1)
    assert after_cancel.redispatch_ids == ()


@pytest.mark.django_db
@override_settings(ENDOREG_ENABLE_STORAGE_BALANCING=True)
def test_recovery_task_dispatches_only_typed_recoverable_decisions() -> None:
    first = uuid4()
    second = uuid4()
    refused = StorageBalanceRecoveryDecision(
        work_item_id=uuid4(),
        rotation_id=uuid4(),
        disposition=StorageBalanceRecoveryDisposition.REFUSE,
        reason=StorageBalanceRecoveryReason.CANCELLED,
        rotation_state="failed",
    )
    plan = StorageBalanceRecoveryPlan(
        decisions=(
            StorageBalanceRecoveryDecision(
                work_item_id=first,
                rotation_id=uuid4(),
                disposition=StorageBalanceRecoveryDisposition.REDISPATCH,
                reason=StorageBalanceRecoveryReason.RECOVERABLE,
                rotation_state="copying",
            ),
            refused,
            StorageBalanceRecoveryDecision(
                work_item_id=second,
                rotation_id=uuid4(),
                disposition=StorageBalanceRecoveryDisposition.REDISPATCH,
                reason=StorageBalanceRecoveryReason.RECOVERABLE,
                rotation_state="verified",
            ),
        ),
    )

    with (
        patch(
            "lx_annotate.hub.storage_balance_worker.StorageBalancingRuntimeConfig.from_environment",
            return_value=SimpleNamespace(max_work_items=2),
        ),
        patch(
            "lx_annotate.hub.storage_recovery.plan_storage_balance_recovery",
            return_value=plan,
        ) as planner,
        patch.object(tasks.execute_storage_balance_work_item_task, "delay") as dispatch,
    ):
        result = tasks.recover_storage_balance_work_items_task.run()

    assert result == 2
    planner.assert_called_once_with(maximum=2)
    assert [call.args for call in dispatch.call_args_list] == [
        (str(first),),
        (str(second),),
    ]


@override_settings(ENDOREG_ENABLE_STORAGE_BALANCING=False)
def test_recovery_task_pause_gate_prevents_planning_and_dispatch() -> None:
    with (
        patch(
            "lx_annotate.hub.storage_recovery.plan_storage_balance_recovery",
        ) as planner,
        patch.object(tasks.execute_storage_balance_work_item_task, "delay") as dispatch,
    ):
        assert tasks.recover_storage_balance_work_items_task.run() == 0

    planner.assert_not_called()
    dispatch.assert_not_called()


def test_recovery_decision_uses_typed_uuid_identity() -> None:
    decision = classify_storage_balance_recovery(_work())

    assert isinstance(decision.work_item_id, UUID)
    assert isinstance(decision.rotation_id, UUID)
