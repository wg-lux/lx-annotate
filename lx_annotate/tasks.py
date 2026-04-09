from __future__ import annotations

from celery import shared_task

from .hub.hub_export_reconciliation import (
    HubExportReconciliationSummary,
    reconcile_outbound_transfer_job,
    recover_stale_outbound_transfer_jobs,
)
from .hub.hub_export_worker import run_outbound_transfer_job


@shared_task(name="lx_annotate.run_outbound_hub_transfer_job")
def run_outbound_hub_transfer_job_task(
    outbound_job_id: str,
    source_node_key: str,
) -> bool:
    run_outbound_transfer_job(
        outbound_job_id=str(outbound_job_id),
        source_node_key=str(source_node_key),
    )
    return True


@shared_task(name="lx_annotate.reconcile_outbound_hub_transfer_job")
def reconcile_outbound_hub_transfer_job_task(
    outbound_job_id: str,
    source_node_key: str,
) -> bool:
    reconcile_outbound_transfer_job(
        outbound_job_id=str(outbound_job_id),
        source_node_key=str(source_node_key),
    )
    return True


@shared_task(name="lx_annotate.recover_stale_outbound_hub_transfer_jobs")
def recover_stale_outbound_hub_transfer_jobs_task(
    source_node_key: str,
) -> HubExportReconciliationSummary:
    return recover_stale_outbound_transfer_jobs(
        source_node_key=str(source_node_key),
    )
