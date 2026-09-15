from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.db.models.fields.files import FieldFile
from django.utils import timezone
from endoreg_db.models import VideoFile
from endoreg_db.models.media.operation_lease import MediaOperationLease
from endoreg_db.models.media.video.video_processing import VideoProcessingHistory
from endoreg_db.utils.file_operations import safe_delete_field_file, sha256_file
from endoreg_db.utils.storage_streaming import field_file_size
from lx_dtypes.models.contracts.hub_media_envelope import HubMediaEnvelopeReceipt

from ..models import OutboundHubTransferJob
from .hub_export_audit import emit_hub_export_audit_event


class HubExportCleanupBlocked(RuntimeError):
    """Raised when local reclamation cannot prove every safety precondition."""


@dataclass(frozen=True, slots=True)
class HubExportCleanupResult:
    outbound_job_id: str
    candidate_bytes: int
    applied: bool
    storage_object_deleted: bool


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
    return str(OutboundHubTransferJob.LocalCleanupPolicy.RETAIN_PROCESSED_MEDIA)


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


def _validated_cleanup_receipt(
    outbound_job: OutboundHubTransferJob,
    *,
    source_node_key: str,
) -> HubMediaEnvelopeReceipt:
    if outbound_job.local_status != OutboundHubTransferJob.LocalStatus.COMPLETED:
        raise HubExportCleanupBlocked("Outbound Hub transfer is not completed.")
    if outbound_job.remote_transfer_status != "applied":
        raise HubExportCleanupBlocked("Hub has not reported an applied transfer.")
    if (
        outbound_job.local_cleanup_policy
        != OutboundHubTransferJob.LocalCleanupPolicy.ELIGIBLE_AFTER_VERIFIED_APPLY
    ):
        raise HubExportCleanupBlocked("Local cleanup policy retains processed media.")
    if outbound_job.local_cleanup_status not in {
        OutboundHubTransferJob.LocalCleanupStatus.ELIGIBLE,
        OutboundHubTransferJob.LocalCleanupStatus.CLEANING,
    }:
        raise HubExportCleanupBlocked("Outbound job is not cleanup-eligible.")
    if outbound_job.local_cleanup_eligible_at is None:
        raise HubExportCleanupBlocked("Cleanup eligibility has no durable timestamp.")
    if outbound_job.envelope_receipt is None:
        raise HubExportCleanupBlocked("Validated Hub envelope receipt is missing.")

    try:
        receipt = HubMediaEnvelopeReceipt.model_validate(outbound_job.envelope_receipt)
    except ValueError as exc:
        raise HubExportCleanupBlocked(
            "Persisted Hub envelope receipt is invalid.",
        ) from exc
    if receipt.source_node_key != source_node_key:
        raise HubExportCleanupBlocked("Hub receipt identifies another source node.")
    if receipt.receiver_transfer_id != str(outbound_job.remote_transfer_id):
        raise HubExportCleanupBlocked("Hub receipt identifies another remote transfer.")
    if receipt.plaintext_sha256 != receipt.processed_media_hash:
        raise HubExportCleanupBlocked(
            "Hub receipt plaintext digest does not match processed media.",
        )
    return receipt


def _locked_cleanup_video(outbound_job: OutboundHubTransferJob) -> VideoFile:
    if outbound_job.resource_kind != OutboundHubTransferJob.ResourceKind.VIDEO:
        raise HubExportCleanupBlocked(
            "Only lease-protected processed videos are supported by local reaping.",
        )
    if outbound_job.video_file_id is None:
        raise HubExportCleanupBlocked("Outbound video reference is missing.")
    return VideoFile.objects.select_for_update().get(pk=outbound_job.video_file_id)


def _assert_video_is_idle(video: VideoFile) -> None:
    now = timezone.now()
    if MediaOperationLease.objects.filter(
        video_id=int(video.pk),
        expires_at__gt=now,
    ).exists():
        raise HubExportCleanupBlocked("Active media-operation lease blocks cleanup.")
    if VideoProcessingHistory.objects.filter(
        video_id=int(video.pk),
        status__in=[
            VideoProcessingHistory.STATUS_PENDING,
            VideoProcessingHistory.STATUS_RUNNING,
        ],
    ).exists():
        raise HubExportCleanupBlocked("Active video processing blocks cleanup.")


def _validate_local_processed_video(
    video: VideoFile,
    *,
    receipt: HubMediaEnvelopeReceipt,
) -> tuple[FieldFile, int]:
    field_file = video.processed_file
    storage_name = str(getattr(field_file, "name", "") or "").strip()
    if not storage_name:
        raise HubExportCleanupBlocked("Local processed-video storage name is missing.")
    if not field_file.storage.exists(storage_name):
        raise HubExportCleanupBlocked(
            "Local processed video is unexpectedly missing; preserve evidence as LOST.",
        )
    size = field_file_size(field_file)
    if size != receipt.plaintext_size:
        raise HubExportCleanupBlocked(
            "Local processed-video size changed after transfer.",
        )
    if sha256_file(field_file) != receipt.plaintext_sha256:
        raise HubExportCleanupBlocked(
            "Local processed-video digest changed after transfer.",
        )
    return field_file, size


def cleanup_verified_local_processed_video(
    *,
    outbound_job_id: str,
    source_node_key: str,
    apply: bool = False,
) -> HubExportCleanupResult:
    """Reap one verified site copy without touching raw media or Hub state.

    Dry-run is the default. Apply uses a durable ``cleaning`` marker before the
    storage mutation so a worker restart can finish clearing model state after
    an already completed audited deletion.
    """

    with transaction.atomic():
        outbound_job = (
            OutboundHubTransferJob.objects.select_for_update()
            .select_related("video_file", "source_center", "target_node")
            .get(pk=outbound_job_id)
        )
        if (
            outbound_job.local_cleanup_status
            == OutboundHubTransferJob.LocalCleanupStatus.CLEANED
        ):
            return HubExportCleanupResult(
                outbound_job_id=str(outbound_job.pk),
                candidate_bytes=0,
                applied=apply,
                storage_object_deleted=False,
            )
        receipt = _validated_cleanup_receipt(
            outbound_job,
            source_node_key=source_node_key,
        )
        video = _locked_cleanup_video(outbound_job)
        _assert_video_is_idle(video)
        if (
            apply
            and outbound_job.local_cleanup_status
            == OutboundHubTransferJob.LocalCleanupStatus.CLEANING
        ):
            candidate_bytes = receipt.plaintext_size
        else:
            _field_file, candidate_bytes = _validate_local_processed_video(
                video,
                receipt=receipt,
            )
        if not apply:
            return HubExportCleanupResult(
                outbound_job_id=str(outbound_job.pk),
                candidate_bytes=candidate_bytes,
                applied=False,
                storage_object_deleted=False,
            )
        outbound_job.local_cleanup_status = (
            OutboundHubTransferJob.LocalCleanupStatus.CLEANING
        )
        outbound_job.save(update_fields=["local_cleanup_status", "updated_at"])

    with transaction.atomic():
        outbound_job = (
            OutboundHubTransferJob.objects.select_for_update()
            .select_related("video_file", "source_center", "target_node")
            .get(pk=outbound_job_id)
        )
        receipt = _validated_cleanup_receipt(
            outbound_job,
            source_node_key=source_node_key,
        )
        video = _locked_cleanup_video(outbound_job)
        _assert_video_is_idle(video)
        field_file = video.processed_file
        storage_name = str(getattr(field_file, "name", "") or "").strip()
        storage_object_deleted = False
        if storage_name and field_file.storage.exists(storage_name):
            current_size = field_file_size(field_file)
            if current_size != receipt.plaintext_size:
                raise HubExportCleanupBlocked(
                    "Local processed-video size changed while cleanup was pending.",
                )
            if sha256_file(field_file) != receipt.plaintext_sha256:
                raise HubExportCleanupBlocked(
                    "Local processed-video digest changed while cleanup was pending.",
                )
            storage_object_deleted = safe_delete_field_file(
                field_file,
                missing_ok=False,
            )
        video.processed_file.name = ""
        video.save(update_fields=["processed_file", "date_modified"])

        outbound_job.local_cleanup_status = (
            OutboundHubTransferJob.LocalCleanupStatus.CLEANED
        )
        outbound_job.local_cleanup_completed_at = timezone.now()
        outbound_job.save(
            update_fields=[
                "local_cleanup_status",
                "local_cleanup_completed_at",
                "updated_at",
            ],
        )
        emit_hub_export_audit_event(
            "hub_export.local_cleanup_completed",
            outbound_job=outbound_job,
            source_node_key=source_node_key,
            reclaimed_bytes=candidate_bytes,
            storage_object_deleted=storage_object_deleted,
        )
        return HubExportCleanupResult(
            outbound_job_id=str(outbound_job.pk),
            candidate_bytes=candidate_bytes,
            applied=True,
            storage_object_deleted=storage_object_deleted,
        )


def reap_verified_local_processed_videos(
    *,
    source_node_key: str,
    limit: int = 100,
    apply: bool = False,
) -> list[HubExportCleanupResult]:
    if limit <= 0 or limit > 1000:
        raise ValueError("limit must be between 1 and 1000")
    job_ids = list(
        OutboundHubTransferJob.objects.filter(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            local_cleanup_status__in=[
                OutboundHubTransferJob.LocalCleanupStatus.ELIGIBLE,
                OutboundHubTransferJob.LocalCleanupStatus.CLEANING,
            ],
        )
        .order_by("local_cleanup_eligible_at", "pk")
        .values_list("pk", flat=True)[:limit],
    )
    return [
        cleanup_verified_local_processed_video(
            outbound_job_id=str(job_id),
            source_node_key=source_node_key,
            apply=apply,
        )
        for job_id in job_ids
    ]
