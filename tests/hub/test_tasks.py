from __future__ import annotations

import ast
from pathlib import Path
from unittest.mock import patch

from django.conf import settings

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
        result = tasks.run_outbound_hub_transfer_job_task.run(123, 456)

    assert result is True
    runner.assert_called_once_with(
        outbound_job_id="123",
        source_node_key="456",
    )


def test_reconcile_outbound_hub_transfer_task_delegates() -> None:
    with patch(
        "lx_annotate.hub.hub_export_reconciliation.reconcile_outbound_transfer_job",
    ) as reconciler:
        result = tasks.reconcile_outbound_hub_transfer_job_task.run(123, 456)

    assert result is True
    reconciler.assert_called_once_with(
        outbound_job_id="123",
        source_node_key="456",
    )


def test_recover_stale_outbound_hub_transfer_jobs_task_returns_summary() -> None:
    summary = {"scanned": 1, "recovered": 0, "failed": 1, "skipped": 0}

    with patch(
        "lx_annotate.hub.hub_export_reconciliation."
        "recover_stale_outbound_transfer_jobs",
        return_value=summary,
    ) as recover:
        result = tasks.recover_stale_outbound_hub_transfer_jobs_task.run(456)

    assert result == summary
    recover.assert_called_once_with(source_node_key="456")
