from __future__ import annotations

import ast
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.conf import settings
from django.test import override_settings

from lx_annotate import tasks


def _current_task(task):
    if hasattr(task, "_get_current_object"):
        return task._get_current_object()
    return task


def test_hub_export_tasks_are_configured_for_worker_loss_redelivery() -> None:
    celery_tasks = [
        tasks.run_outbound_hub_transfer_job_task,
        tasks.reconcile_outbound_hub_transfer_job_task,
        tasks.recover_stale_outbound_hub_transfer_jobs_task,
        tasks.execute_storage_balance_work_item_task,
        tasks.reconcile_storage_balancing_task,
        tasks.recover_storage_balance_work_items_task,
        tasks.dispatch_storage_operator_control_receipt_task,
        tasks.dispatch_pending_storage_operator_controls_task,
        tasks.ingest_processed_storage_artifact_task,
        tasks.publish_storage_artifact_task,
        tasks.dispatch_pending_storage_publications_task,
        tasks.execute_storage_rotation_cleanup_task,
        tasks.reconcile_storage_rotation_cleanup_task,
        tasks.sync_storage_node_telemetry_task,
        tasks.reconcile_storage_inventories_task,
        tasks.expire_storage_reservations_task,
        tasks.cleanup_retired_storage_envelope_task,
        tasks.reconcile_retired_storage_envelopes_task,
    ]

    for task in celery_tasks:
        current = _current_task(task)
        assert current.acks_late is True
        assert current.reject_on_worker_lost is True
        assert current.track_started is True


def test_lx_annotate_celery_defaults_bound_worker_memory_pressure() -> None:
    assert settings.CELERY_RESULT_BACKEND is None
    assert settings.CELERY_TASK_IGNORE_RESULT is True
    assert settings.CELERY_WORKER_PREFETCH_MULTIPLIER == 1
    assert settings.CELERY_TASK_TRACK_STARTED is True
    assert settings.CELERY_TASK_SOFT_TIME_LIMIT < settings.CELERY_TASK_TIME_LIMIT


@pytest.mark.django_db
@override_settings(ENDOREG_ENABLE_STORAGE_BALANCING=True)
def test_runtime_operator_pause_closes_all_storage_task_admission() -> None:
    from endoreg_db.services.hub.storage_operator_control import (
        get_storage_balancing_control_state,
    )

    state = get_storage_balancing_control_state()
    state.apply_control_transition(is_paused=True, version=state.version + 1)

    assert tasks._storage_balancing_enabled() is False


@pytest.mark.django_db
def test_pause_operator_receipt_dispatch_is_persisted_and_idempotent() -> None:
    from endoreg_db.services.hub.storage_operator_control import (
        StorageBalancingPauseRequest,
        set_storage_balancing_paused,
    )

    from lx_annotate.models import StorageOperatorDispatchReceipt

    receipt = set_storage_balancing_paused(
        request=StorageBalancingPauseRequest(
            paused=True,
            actor="django-user:17:storage-operator",
            reason="maintenance window",
            idempotency_key="pause-dispatch-test",
        ),
    )

    assert tasks.dispatch_storage_operator_control_receipt_task.run(str(receipt.pk))
    assert not tasks.dispatch_storage_operator_control_receipt_task.run(str(receipt.pk))

    dispatch = StorageOperatorDispatchReceipt.objects.get(
        operator_receipt_id=receipt.pk,
    )
    assert dispatch.action == "pause"
    assert dispatch.control_version == receipt.control_version
    assert dispatch.status == StorageOperatorDispatchReceipt.Status.DISPATCHED
    assert dispatch.attempt_count == 1


def test_task_module_defers_hub_job_imports_until_execution() -> None:
    source = Path(tasks.__file__).read_text(encoding="utf-8")
    tree = ast.parse(source)

    top_level_imports = [
        node for node in tree.body if isinstance(node, ast.Import | ast.ImportFrom)
    ]
    imported_modules = {
        node.module
        for node in top_level_imports
        if isinstance(node, ast.ImportFrom) and node.module is not None
    }

    assert not any(module.startswith("hub.") for module in imported_modules)


def test_run_outbound_hub_transfer_task_delegates_and_returns_small_result() -> None:
    with patch(
        "lx_annotate.hub.hub_export_worker.run_outbound_transfer_job",
    ) as runner:
        result = tasks.run_outbound_hub_transfer_job_task.run("123", "456")

    assert result is True
    runner.assert_called_once_with(
        outbound_job_id="123",
        source_node_key="456",
    )


def test_run_outbound_hub_transfer_task_surfaces_retryable_failure_to_celery() -> None:
    retryable_result = SimpleNamespace(
        retry_count=1,
        last_error="Hub transfer registration failed: timeout",
    )
    current_task = _current_task(tasks.run_outbound_hub_transfer_job_task)
    with (
        patch(
            "lx_annotate.hub.hub_export_worker.run_outbound_transfer_job",
            return_value=retryable_result,
        ),
        patch.object(
            current_task,
            "retry",
            side_effect=RuntimeError("celery retry requested"),
        ) as retry,
        pytest.raises(RuntimeError, match="celery retry requested"),
    ):
        tasks.run_outbound_hub_transfer_job_task.run("123", "456")

    retry.assert_called_once()
    assert retry.call_args.kwargs["max_retries"] == 5


def test_reconcile_outbound_hub_transfer_task_delegates() -> None:
    with patch(
        "lx_annotate.hub.hub_export_reconciliation.reconcile_outbound_transfer_job",
    ) as reconciler:
        result = tasks.reconcile_outbound_hub_transfer_job_task.run("123", "456")

    assert result is True
    reconciler.assert_called_once_with(
        outbound_job_id="123",
        source_node_key="456",
    )


def test_recover_stale_outbound_hub_transfer_jobs_task_returns_summary() -> None:
    summary = {
        "scanned": 1,
        "recovered": 0,
        "redispatched": 0,
        "failed": 1,
        "skipped": 0,
    }

    with patch(
        "lx_annotate.hub.hub_export_reconciliation."
        "recover_stale_outbound_transfer_jobs",
        return_value=summary,
    ) as recover:
        result = tasks.recover_stale_outbound_hub_transfer_jobs_task.run("456")

    assert result == summary
    recover.assert_called_once_with(source_node_key="456")


@pytest.mark.django_db
@override_settings(ENDOREG_ENABLE_STORAGE_BALANCING=True)
def test_storage_balance_execution_task_delegates() -> None:
    with (
        patch(
            "lx_annotate.hub.storage_balance_worker.execute_storage_balance_work_item",
            return_value=SimpleNamespace(
                rotation_id="ad73d93b-6843-4a7e-8426-26b371fb7760",
            ),
        ) as execute,
        patch.object(tasks.execute_storage_rotation_cleanup_task, "delay") as cleanup,
    ):
        result = tasks.execute_storage_balance_work_item_task.run(
            "21f850c1-743c-43fc-9054-835e1e10c515",
        )
    assert result is True
    assert str(execute.call_args.kwargs["work_item_id"]) == (
        "21f850c1-743c-43fc-9054-835e1e10c515"
    )
    cleanup.assert_called_once_with("ad73d93b-6843-4a7e-8426-26b371fb7760")


@pytest.mark.django_db
@override_settings(ENDOREG_ENABLE_STORAGE_BALANCING=True)
def test_cancelled_queued_balance_work_is_a_terminal_noop() -> None:
    from lx_annotate.hub.storage_balance_worker import StorageBalanceWorkCancelled

    with (
        patch(
            "lx_annotate.hub.storage_balance_worker.execute_storage_balance_work_item",
            side_effect=StorageBalanceWorkCancelled("cancelled"),
        ),
        patch.object(tasks.execute_storage_rotation_cleanup_task, "delay") as cleanup,
    ):
        result = tasks.execute_storage_balance_work_item_task.run(
            "6a9243c3-74d2-4aee-9051-3fd5b64a6430",
        )

    assert result is False
    cleanup.assert_not_called()


@override_settings(ENDOREG_ENABLE_STORAGE_BALANCING=False)
def test_storage_task_kill_switch_blocks_already_queued_byte_mutations() -> None:
    with (
        patch(
            "lx_annotate.hub.storage_balance_worker.execute_storage_balance_work_item",
        ) as execute,
        patch.object(tasks.execute_storage_rotation_cleanup_task, "delay") as cleanup,
    ):
        assert (
            tasks.execute_storage_balance_work_item_task.run(
                "21f850c1-743c-43fc-9054-835e1e10c515",
            )
            is False
        )
    execute.assert_not_called()
    cleanup.assert_not_called()
    assert (
        tasks.execute_storage_rotation_cleanup_task.run(
            "ad73d93b-6843-4a7e-8426-26b371fb7760",
        )
        == "paused"
    )
    assert (
        tasks.cleanup_retired_storage_envelope_task.run(
            "ad73d93b-6843-4a7e-8426-26b371fb7760",
        )
        is False
    )
    with pytest.raises(RuntimeError, match="paused"):
        tasks.ingest_processed_storage_artifact_task.run(
            artifact_key="artifact-1",
            artifact_kind="anonymized_video",
            source_path="/tmp/never-read",
            residency_key="de",
            idempotency_key="paused-ingest-operation-0001",
        )
