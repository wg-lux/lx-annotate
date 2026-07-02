from __future__ import annotations

from django.conf import settings
from django.utils import timezone

from endoreg_db.models import RawPdfFile, VideoFile
from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.models.state.video_segment_validation import (
    resolve_segment_annotation_status,
    segment_annotations_are_final,
)

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


def video_hub_export_blocked_reason(video: VideoFile) -> str:
    state = video.state
    if state is None:
        return "not ready for export"
    if not state.anonymization_validated:
        return "not ready for export"
    if not bool(video.processed_file and video.processed_file.name):
        return "processed media missing"

    segment_status = resolve_segment_annotation_status(video)
    if not segment_annotations_are_final(video):
        if segment_status in {"cleanup_queued", "cleanup_running"}:
            return "segment cleanup pending"
        if segment_status == "cleanup_failed":
            return "segment cleanup failed"
        return "not ready for export"
    if not state.ready_for_export or not state.processed_file_sha256:
        return "not ready for export"
    return ""


def is_video_hub_export_eligible(video: VideoFile) -> bool:
    return video_hub_export_blocked_reason(video) == ""


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
    ineligible_message: str = _INELIGIBLE_MESSAGE,
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
            if job.last_error != ineligible_message:
                job.last_error = ineligible_message
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
    blocked_reason = video_hub_export_blocked_reason(video)
    return _sync_outbound_jobs(
        queryset=OutboundHubTransferJob.objects.filter(video_file=video).select_related(
            "target_node"
        ),
        eligible=blocked_reason == "",
        ineligible_message=blocked_reason or _INELIGIBLE_MESSAGE,
    )


def sync_outbound_jobs_for_report(report: RawPdfFile) -> int:
    return _sync_outbound_jobs(
        queryset=OutboundHubTransferJob.objects.filter(
            raw_pdf_file=report
        ).select_related("target_node"),
        eligible=is_report_hub_export_eligible(report),
    )
