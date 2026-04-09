from __future__ import annotations

from django.conf import settings
from django.utils import timezone

from endoreg_db.models import RawPdfFile, VideoFile
from endoreg_db.models.state.anonymization import AnonymizationState

from .hub_export_audit import emit_hub_export_audit_event
from ..models import OutboundHubTransferJob


_ELIGIBLE_ANONYMIZATION_STATES = {
    AnonymizationState.ANONYMIZED,
    AnonymizationState.DONE_PROCESSING_ANONYMIZATION,
    AnonymizationState.VALIDATED,
}

_INELIGIBLE_MESSAGE = "Resource is not currently eligible for hub export."


def hub_export_auto_queue_enabled() -> bool:
    return bool(getattr(settings, "LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE", False))


def is_video_hub_export_eligible(video: VideoFile) -> bool:
    state = video.state
    if state is None:
        return False
    if state.anonymization_status not in _ELIGIBLE_ANONYMIZATION_STATES:
        return False
    return bool(video.processed_file and video.processed_file.name)


def is_report_hub_export_eligible(report: RawPdfFile) -> bool:
    state = report.state
    if state is None:
        return False
    if state.anonymization_status not in _ELIGIBLE_ANONYMIZATION_STATES:
        return False
    return bool(report.processed_file and report.processed_file.name)


def _sync_outbound_jobs(
    *,
    queryset,
    eligible: bool,
) -> int:
    updated = 0
    for job in queryset.exclude(
        local_status=OutboundHubTransferJob.LocalStatus.COMPLETED
    ):
        update_fields: list[str] = []

        if eligible:
            if job.last_error == _INELIGIBLE_MESSAGE:
                job.last_error = ""
                update_fields.append("last_error")
            if (
                hub_export_auto_queue_enabled()
                and job.local_status == OutboundHubTransferJob.LocalStatus.MARKED
            ):
                job.local_status = OutboundHubTransferJob.LocalStatus.QUEUED
                job.queued_at = timezone.now()
                update_fields.extend(["local_status", "queued_at"])
        else:
            if job.last_error != _INELIGIBLE_MESSAGE:
                job.last_error = _INELIGIBLE_MESSAGE
                update_fields.append("last_error")
            if job.local_status in {
                OutboundHubTransferJob.LocalStatus.QUEUED,
                OutboundHubTransferJob.LocalStatus.REGISTERING,
                OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA,
                OutboundHubTransferJob.LocalStatus.UPLOADING,
            }:
                job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
                update_fields.append("local_status")

        if update_fields:
            job.save(update_fields=[*update_fields, "updated_at"])
            if "local_status" in update_fields:
                emit_hub_export_audit_event(
                    "hub_export.queued"
                    if eligible
                    else "hub_export.ineligible_state_detected",
                    outbound_job=job,
                )
            updated += 1
    return updated


def sync_outbound_jobs_for_video(video: VideoFile) -> int:
    return _sync_outbound_jobs(
        queryset=video.outbound_hub_transfer_jobs.select_related("target_node"),
        eligible=is_video_hub_export_eligible(video),
    )


def sync_outbound_jobs_for_report(report: RawPdfFile) -> int:
    return _sync_outbound_jobs(
        queryset=report.outbound_hub_transfer_jobs.select_related("target_node"),
        eligible=is_report_hub_export_eligible(report),
    )
