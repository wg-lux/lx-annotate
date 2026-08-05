from __future__ import annotations

from django.conf import settings
from django.utils import timezone

from ..models import OutboundHubTransferJob
from .hub_export_audit import emit_hub_export_audit_event


def configured_local_cleanup_policy() -> str:
    """
    This function returns the configured cleanup policy after a hub export.
    """
    configured = str(
        getattr(
            settings,
            "LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY",
            OutboundHubTransferJob.LocalCleanupPolicy.RETAIN_PROCESSED_MEDIA,
        )
        or "",
    ).strip()
    valid_values = {
        OutboundHubTransferJob.LocalCleanupPolicy.RETAIN_PROCESSED_MEDIA,
        OutboundHubTransferJob.LocalCleanupPolicy.ELIGIBLE_AFTER_VERIFIED_APPLY,
    }
    if configured in valid_values:
        return configured
    return OutboundHubTransferJob.LocalCleanupPolicy.RETAIN_PROCESSED_MEDIA[1]


def apply_completed_export_cleanup_policy(
    outbound_job: OutboundHubTransferJob,
    *,
    source_node_key: str,
) -> OutboundHubTransferJob:
    if (
        outbound_job.local_cleanup_policy
        == OutboundHubTransferJob.LocalCleanupPolicy.ELIGIBLE_AFTER_VERIFIED_APPLY
    ):
        outbound_job.local_cleanup_status = (
            OutboundHubTransferJob.LocalCleanupStatus.ELIGIBLE
        )
        outbound_job.local_cleanup_eligible_at = timezone.now()
    else:
        outbound_job.local_cleanup_status = (
            OutboundHubTransferJob.LocalCleanupStatus.RETAINED
        )
        outbound_job.local_cleanup_eligible_at = None

    outbound_job.save(
        update_fields=[
            "local_cleanup_status",
            "local_cleanup_eligible_at",
            "updated_at",
        ],
    )
    emit_hub_export_audit_event(
        "hub_export.local_cleanup_policy_applied",
        outbound_job=outbound_job,
        source_node_key=source_node_key,
        local_cleanup_policy=outbound_job.local_cleanup_policy,
        local_cleanup_status=outbound_job.local_cleanup_status,
    )
    return outbound_job
