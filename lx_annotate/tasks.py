from __future__ import annotations

from typing import TYPE_CHECKING

from celery import shared_task

if TYPE_CHECKING:
    from .hub.hub_export_reconciliation import HubExportReconciliationSummary


@shared_task(
    name="lx_annotate.run_outbound_hub_transfer_job",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def run_outbound_hub_transfer_job_task(
    _task,
    outbound_job_id: str,
    source_node_key: str,
) -> bool:
    from .hub.hub_export_worker import run_outbound_transfer_job
    from .hub.hub_export_reconciliation import (
        hub_export_max_retries,
        is_retryable_outbound_failure,
    )

    result = run_outbound_transfer_job(
        outbound_job_id=str(outbound_job_id),
        source_node_key=str(source_node_key),
    )
    if is_retryable_outbound_failure(result):
        retry_count = max(int(result.retry_count or 0), 1)
        countdown = min(30 * (2 ** (retry_count - 1)), 15 * 60)
        raise _task.retry(
            exc=RuntimeError(result.last_error),
            countdown=countdown,
            max_retries=hub_export_max_retries(),
        )
    return True


@shared_task(
    name="lx_annotate.reconcile_outbound_hub_transfer_job",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def reconcile_outbound_hub_transfer_job_task(
    _task,
    outbound_job_id: str,
    source_node_key: str,
) -> bool:
    from .hub.hub_export_reconciliation import reconcile_outbound_transfer_job

    reconcile_outbound_transfer_job(
        outbound_job_id=str(outbound_job_id),
        source_node_key=str(source_node_key),
    )
    return True


@shared_task(
    name="lx_annotate.recover_stale_outbound_hub_transfer_jobs",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def recover_stale_outbound_hub_transfer_jobs_task(
    _task,
    source_node_key: str,
) -> HubExportReconciliationSummary:
    from .hub.hub_export_reconciliation import recover_stale_outbound_transfer_jobs

    return recover_stale_outbound_transfer_jobs(
        source_node_key=str(source_node_key),
    )
