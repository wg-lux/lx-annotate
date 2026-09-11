from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from endoreg_db.models import NetworkNode, RawPdfFile, VideoFile
from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.models.state.video_segment_validation import SegmentAnnotationStatus
from endoreg_db.services.video_segment_validation_workflow import (
    resolve_segment_annotation_status,
)
from endoreg_db.utils.file_operations import sha256_file

from ..models import OutboundHubTransferJob
from .hub_export_audit import emit_hub_export_audit_event
from .hub_export_contracts import HubExportIntegrityStatus

_INELIGIBLE_MESSAGE = "Resource is not currently eligible for hub export."


@dataclass(frozen=True)
class VideoHubExportReadiness:
    anonymization_status: AnonymizationState
    segment_annotation_status: SegmentAnnotationStatus
    processed_media_present: bool
    export_ready_state: bool
    processed_video_hash: str
    state_processed_file_sha256: str
    actual_processed_file_sha256: str
    state_present: bool
    export_integrity_status: HubExportIntegrityStatus

    @property
    def anonymization_ready(self) -> bool:
        return self.anonymization_status == AnonymizationState.VALIDATED

    @property
    def segment_annotations_final(self) -> bool:
        return self.segment_annotation_status is SegmentAnnotationStatus.VALIDATED

    @property
    def export_hashes_present(self) -> bool:
        return bool(self.processed_video_hash and self.state_processed_file_sha256)

    @property
    def export_hash_metadata_matches(self) -> bool:
        return (
            self.export_hashes_present
            and self.processed_video_hash == self.state_processed_file_sha256
        )

    @property
    def processed_media_hash_matches(self) -> bool:
        return (
            self.export_hash_metadata_matches
            and bool(self.actual_processed_file_sha256)
            and self.actual_processed_file_sha256 == self.processed_video_hash
        )

    @property
    def export_integrity_ready(self) -> bool:
        return self.export_integrity_status in {
            HubExportIntegrityStatus.PERSISTED_VERIFIED,
            HubExportIntegrityStatus.VERIFIED,
        }

    @property
    def transfer_eligible(self) -> bool:
        return (
            self.state_present
            and self.anonymization_ready
            and self.segment_annotations_final
            and self.processed_media_present
            and self.export_integrity_ready
        )

    @property
    def blocked_reason(self) -> str:
        if not self.state_present or not self.anonymization_ready:
            return "not ready for export"
        if (
            self.export_integrity_status
            is HubExportIntegrityStatus.MISSING_PROCESSED_MEDIA
        ):
            return "processed media missing"
        if self.segment_annotation_status in {
            SegmentAnnotationStatus.CLEANUP_QUEUED,
            SegmentAnnotationStatus.CLEANUP_RUNNING,
        }:
            return "segment cleanup pending"
        if self.segment_annotation_status is SegmentAnnotationStatus.CLEANUP_FAILED:
            return "segment cleanup failed"
        if not self.segment_annotations_final or not self.export_ready_state:
            return "not ready for export"
        if self.export_integrity_status is HubExportIntegrityStatus.MISSING_HASH:
            return "processed media hash missing"
        if (
            self.export_integrity_status
            is HubExportIntegrityStatus.HASH_METADATA_MISMATCH
        ):
            return "processed media hash metadata mismatch"
        if (
            self.export_integrity_status
            is HubExportIntegrityStatus.PROCESSED_MEDIA_UNREADABLE
        ):
            return "processed media unreadable"
        if (
            self.export_integrity_status
            is HubExportIntegrityStatus.PROCESSED_MEDIA_HASH_MISMATCH
        ):
            return "processed media hash mismatch"
        return ""

    @property
    def transfer_validation_error(self) -> str:
        if not self.state_present:
            return "VideoFile.state must exist for outbound hub transfer."
        if (
            not self.anonymization_ready
            or not self.segment_annotations_final
            or not self.processed_media_present
            or not self.export_ready_state
        ):
            return (
                "video transfer requires validated anonymization, finalized segment "
                "annotations, and export integrity; video is not eligible."
            )
        if self.export_integrity_status is HubExportIntegrityStatus.MISSING_HASH:
            return (
                "VideoFile.processed_video_hash and VideoState.processed_file_sha256 "
                "must exist for processed-media transfer."
            )
        if (
            self.export_integrity_status
            is HubExportIntegrityStatus.HASH_METADATA_MISMATCH
        ):
            return (
                "Processed video hash metadata is inconsistent; refusing outbound "
                "transfer."
            )
        if (
            self.export_integrity_status
            is HubExportIntegrityStatus.PROCESSED_MEDIA_UNREADABLE
        ):
            return "Processed video media is unreadable; refusing outbound transfer."
        if (
            self.export_integrity_status
            is HubExportIntegrityStatus.PROCESSED_MEDIA_HASH_MISMATCH
        ):
            return (
                "Processed video file hash does not match persisted hash metadata; "
                "refusing outbound transfer."
            )
        return "video is not eligible for outbound hub transfer."


def hub_export_auto_queue_enabled() -> bool:
    return bool(getattr(settings, "LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE", False))


def has_usable_processed_artifact(resource: RawPdfFile | VideoFile) -> bool:
    """Fail closed unless the managed processed artifact exists and is non-empty."""
    processed_file = resource.processed_file
    stored_name = str(getattr(processed_file, "name", "") or "").strip()
    if not stored_name:
        return False
    try:
        return (
            bool(processed_file.storage.exists(stored_name))
            and int(processed_file.size) > 0
        )
    except (OSError, TypeError, ValueError):
        return False


def resolve_video_hub_export_state(
    video: VideoFile,
    *,
    verify_processed_media: bool = False,
) -> VideoHubExportReadiness:
    state = video.state
    if state is None:
        return VideoHubExportReadiness(
            anonymization_status=AnonymizationState.NOT_STARTED,
            segment_annotation_status=SegmentAnnotationStatus.NOT_STARTED,
            processed_media_present=False,
            export_ready_state=False,
            processed_video_hash="",
            state_processed_file_sha256="",
            actual_processed_file_sha256="",
            state_present=False,
            export_integrity_status=HubExportIntegrityStatus.NOT_READY,
        )

    processed_media_present = has_usable_processed_artifact(video)
    processed_video_hash = str(video.processed_video_hash or "").strip().lower()
    state_processed_file_sha256 = str(state.processed_file_sha256 or "").strip().lower()
    actual_processed_file_sha256 = ""
    if not processed_media_present:
        integrity_status = HubExportIntegrityStatus.MISSING_PROCESSED_MEDIA
    elif not state.ready_for_export:
        integrity_status = HubExportIntegrityStatus.NOT_READY
    elif not processed_video_hash or not state_processed_file_sha256:
        integrity_status = HubExportIntegrityStatus.MISSING_HASH
    elif processed_video_hash != state_processed_file_sha256:
        integrity_status = HubExportIntegrityStatus.HASH_METADATA_MISMATCH
    elif not verify_processed_media:
        integrity_status = HubExportIntegrityStatus.PERSISTED_VERIFIED
    else:
        try:
            actual_processed_file_sha256 = sha256_file(video.processed_file)
        except (OSError, TypeError, ValueError):
            integrity_status = HubExportIntegrityStatus.PROCESSED_MEDIA_UNREADABLE
        else:
            integrity_status = (
                HubExportIntegrityStatus.VERIFIED
                if actual_processed_file_sha256 == processed_video_hash
                else HubExportIntegrityStatus.PROCESSED_MEDIA_HASH_MISMATCH
            )
    return VideoHubExportReadiness(
        anonymization_status=AnonymizationState(state.anonymization_status),
        segment_annotation_status=SegmentAnnotationStatus(
            resolve_segment_annotation_status(video),
        ),
        processed_media_present=processed_media_present,
        export_ready_state=bool(state.ready_for_export),
        processed_video_hash=processed_video_hash,
        state_processed_file_sha256=state_processed_file_sha256,
        actual_processed_file_sha256=actual_processed_file_sha256,
        state_present=True,
        export_integrity_status=integrity_status,
    )


def _schedule_outbound_job(job: OutboundHubTransferJob) -> None:
    source_node = (
        NetworkNode.objects.filter(
            role=NetworkNode.Role.SITE_NODE,
            is_active=True,
        )
        .order_by("pk")
        .first()
    )
    if source_node is None:
        raise ValueError("No active site node is configured for outbound hub export.")

    job_id = str(job.pk)
    source_node_key = source_node.node_key

    def _dispatch() -> None:
        from lx_annotate.tasks import run_outbound_hub_transfer_job_task

        run_outbound_hub_transfer_job_task.delay(job_id, source_node_key)

    transaction.on_commit(_dispatch)


def queue_outbound_job(job: OutboundHubTransferJob) -> bool:
    if job.local_status != OutboundHubTransferJob.LocalStatus.MARKED:
        return False
    job.local_status = OutboundHubTransferJob.LocalStatus.QUEUED
    job.queued_at = timezone.now()
    job.save(update_fields=["local_status", "queued_at", "updated_at"])
    emit_hub_export_audit_event("hub_export.queued", outbound_job=job)
    _schedule_outbound_job(job)
    return True


def video_hub_export_blocked_reason(video: VideoFile) -> str:
    return resolve_video_hub_export_state(video).blocked_reason


def is_video_hub_export_eligible(video: VideoFile) -> bool:
    return resolve_video_hub_export_state(video).transfer_eligible


def report_hub_export_blocked_reason(
    report: RawPdfFile,
    *,
    verify_processed_media: bool = False,
) -> str:
    if report.center is None:
        return "source center missing"
    state = report.state
    if state is None or state.anonymization_status != AnonymizationState.VALIDATED:
        return "not ready for export"
    processed_file_sha256 = getattr(state, "processed_file_sha256", None)
    if processed_file_sha256 is not None and not str(processed_file_sha256).strip():
        return "processed media missing"
    if not has_usable_processed_artifact(report):
        return "processed media missing"
    if verify_processed_media:
        try:
            actual_digest = sha256_file(report.processed_file)
        except (OSError, TypeError, ValueError):
            return "processed media unreadable"
        if actual_digest != processed_file_sha256:
            return "processed media hash mismatch"
    return ""


def is_report_hub_export_eligible(
    report: RawPdfFile,
    *,
    verify_processed_media: bool = False,
) -> bool:
    return (
        report_hub_export_blocked_reason(
            report,
            verify_processed_media=verify_processed_media,
        )
        == ""
    )


def _sync_outbound_jobs(
    *,
    queryset,
    eligible: bool,
    ineligible_message: str = _INELIGIBLE_MESSAGE,
) -> int:
    updated = 0
    for job in queryset.exclude(
        local_status=OutboundHubTransferJob.LocalStatus.COMPLETED,
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
                if update_fields:
                    job.save(update_fields=[*update_fields, "updated_at"])
                    updated += 1
                if queue_outbound_job(job):
                    updated += 1
                continue
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
                job.failure_class = (
                    OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION
                )
                update_fields.append("failure_class")

        if update_fields:
            job.save(update_fields=[*update_fields, "updated_at"])
            if "local_status" in update_fields:
                emit_hub_export_audit_event(
                    "hub_export.ineligible_state_detected",
                    outbound_job=job,
                )
            updated += 1
    return updated


def sync_outbound_jobs_for_video(video: VideoFile) -> int:
    readiness = resolve_video_hub_export_state(video)
    return _sync_outbound_jobs(
        queryset=OutboundHubTransferJob.objects.filter(video_file=video).select_related(
            "target_node",
        ),
        eligible=readiness.transfer_eligible,
        ineligible_message=readiness.blocked_reason or _INELIGIBLE_MESSAGE,
    )


def sync_outbound_jobs_for_report(report: RawPdfFile) -> int:
    return _sync_outbound_jobs(
        queryset=OutboundHubTransferJob.objects.filter(
            raw_pdf_file=report,
        ).select_related("target_node"),
        eligible=is_report_hub_export_eligible(report),
    )
