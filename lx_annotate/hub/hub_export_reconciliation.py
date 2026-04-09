from __future__ import annotations

from datetime import timedelta
from typing import TypedDict

import requests
from django.conf import settings
from django.utils import timezone

from endoreg_db.models import NetworkNode

from .hub_export_audit import emit_hub_export_audit_event
from .hub_export_worker import (
    apply_remote_status,
    fetch_remote_transfer_status,
    mark_outbound_job_failure,
    resolve_outbound_node_secret,
)
from ..models import OutboundHubTransferJob


class HubExportReconciliationSummary(TypedDict):
    scanned: int
    recovered: int
    failed: int
    skipped: int


_IN_FLIGHT_STATUSES = {
    OutboundHubTransferJob.LocalStatus.REGISTERING,
    OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA,
    OutboundHubTransferJob.LocalStatus.UPLOADING,
}


def hub_export_stale_after() -> timedelta:
    seconds = int(getattr(settings, "LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS", 1800))
    return timedelta(seconds=max(seconds, 60))


def _is_stale(job: OutboundHubTransferJob, *, now=None) -> bool:
    current_time = now or timezone.now()
    last_seen = (
        job.last_attempt_at
        or job.media_upload_started_at
        or job.registration_started_at
    )
    if last_seen is None:
        return False
    return current_time - last_seen >= hub_export_stale_after()


def reconcile_outbound_transfer_job(
    *,
    outbound_job_id: str,
    source_node_key: str,
    source_secret: str | None = None,
    request_timeout_s: int = 60,
) -> OutboundHubTransferJob:
    outbound_job = OutboundHubTransferJob.objects.select_related(
        "source_center",
        "target_node",
    ).get(pk=outbound_job_id)
    if outbound_job.local_status in {
        OutboundHubTransferJob.LocalStatus.MARKED,
        OutboundHubTransferJob.LocalStatus.QUEUED,
        OutboundHubTransferJob.LocalStatus.COMPLETED,
    }:
        return outbound_job

    source_node = NetworkNode.objects.get(node_key=source_node_key, is_active=True)
    secret = resolve_outbound_node_secret(
        source_node_key=source_node_key,
        explicit_secret=source_secret,
    )

    try:
        remote_status = fetch_remote_transfer_status(
            outbound_job=outbound_job,
            source_node=source_node,
            secret=secret,
            request_timeout_s=request_timeout_s,
        )
    except requests.RequestException as exc:
        if _is_stale(outbound_job):
            emit_hub_export_audit_event(
                "hub_export.recovery_stale_failure",
                outbound_job=outbound_job,
                error=str(exc),
            )
            return mark_outbound_job_failure(
                outbound_job,
                error_message=(
                    f"Hub transfer reconciliation failed for stale in-flight job: {exc}"
                ),
            )
        emit_hub_export_audit_event(
            "hub_export.reconciliation_deferred",
            outbound_job=outbound_job,
            error=str(exc),
        )
        return outbound_job

    apply_remote_status(outbound_job, remote_status)
    emit_hub_export_audit_event(
        "hub_export.reconciled",
        outbound_job=outbound_job,
        remote_transfer_status=outbound_job.remote_transfer_status,
    )
    return outbound_job


def recover_stale_outbound_transfer_jobs(
    *,
    source_node_key: str,
    source_secret: str | None = None,
    request_timeout_s: int = 60,
) -> HubExportReconciliationSummary:
    summary: HubExportReconciliationSummary = {
        "scanned": 0,
        "recovered": 0,
        "failed": 0,
        "skipped": 0,
    }
    queryset = OutboundHubTransferJob.objects.filter(
        local_status__in=_IN_FLIGHT_STATUSES
    )
    for job in queryset:
        if not _is_stale(job):
            summary["skipped"] += 1
            continue
        summary["scanned"] += 1
        previous_status = job.local_status
        reconciled = reconcile_outbound_transfer_job(
            outbound_job_id=str(job.pk),
            source_node_key=source_node_key,
            source_secret=source_secret,
            request_timeout_s=request_timeout_s,
        )
        if reconciled.local_status == OutboundHubTransferJob.LocalStatus.FAILED:
            summary["failed"] += 1
        elif reconciled.local_status != previous_status:
            summary["recovered"] += 1
        else:
            summary["skipped"] += 1
    return summary
