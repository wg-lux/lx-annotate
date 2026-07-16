from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

User = get_user_model()


class OutboundHubTransferJob(models.Model):
    if TYPE_CHECKING:
        video_file_id: int | None
        raw_pdf_file_id: int | None
        source_center_id: int | None
        target_node_id: int
        marked_by_id: int | None

    class ResourceKind(models.TextChoices):
        VIDEO = "video", "Video"
        REPORT = "report", "Report"

    class LocalStatus(models.TextChoices):
        MARKED = "marked", "Marked"
        QUEUED = "queued", "Queued"
        REGISTERING = "registering", "Registering"
        AWAITING_MEDIA = "awaiting_media", "Awaiting Media"
        UPLOADING = "uploading", "Uploading"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class TransferMode(models.TextChoices):
        METADATA_AND_PROCESSED_MEDIA = (
            "metadata_and_processed_media",
            "Metadata And Processed Media",
        )

    class LocalCleanupPolicy(models.TextChoices):
        RETAIN_PROCESSED_MEDIA = (
            "retain_processed_media",
            "Retain Processed Media",
        )
        ELIGIBLE_AFTER_VERIFIED_APPLY = (
            "eligible_after_verified_apply",
            "Eligible After Verified Apply",
        )

    class LocalCleanupStatus(models.TextChoices):
        NOT_APPLICABLE = "not_applicable", "Not Applicable"
        RETAINED = "retained", "Retained"
        ELIGIBLE = "eligible", "Eligible"
        CLEANED = "cleaned", "Cleaned"

    id: Any = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource_kind: Any = models.CharField(max_length=16, choices=ResourceKind.choices)
    video_file: Any = models.ForeignKey(
        "endoreg_db.VideoFile",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="outbound_hub_transfer_jobs",
    )
    raw_pdf_file: Any = models.ForeignKey(
        "endoreg_db.RawPdfFile",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="outbound_hub_transfer_jobs",
    )
    source_center: Any = models.ForeignKey(
        "endoreg_db.Center",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="outbound_hub_transfer_jobs",
    )
    target_node: Any = models.ForeignKey(
        "endoreg_db.NetworkNode",
        on_delete=models.PROTECT,
        related_name="outbound_hub_transfer_jobs",
    )
    transfer_key: Any = models.CharField(max_length=255, unique=True, db_index=True)
    transfer_mode: Any = models.CharField(
        max_length=48,
        choices=TransferMode.choices,
        default=TransferMode.METADATA_AND_PROCESSED_MEDIA,
    )
    local_cleanup_policy: Any = models.CharField(
        max_length=48,
        choices=LocalCleanupPolicy.choices,
        default=LocalCleanupPolicy.RETAIN_PROCESSED_MEDIA,
    )
    local_cleanup_status: Any = models.CharField(
        max_length=32,
        choices=LocalCleanupStatus.choices,
        default=LocalCleanupStatus.NOT_APPLICABLE,
    )
    local_cleanup_eligible_at: Any = models.DateTimeField(null=True, blank=True)
    local_status: Any = models.CharField(
        max_length=32,
        choices=LocalStatus.choices,
        default=LocalStatus.MARKED,
        db_index=True,
    )
    retry_count: Any = models.PositiveIntegerField(default=0)
    last_error: Any = models.TextField(blank=True, default="")
    remote_transfer_id: Any = models.CharField(max_length=64, blank=True, default="")
    remote_transfer_status: Any = models.CharField(
        max_length=32, blank=True, default=""
    )
    remote_processing_decision: Any = models.CharField(
        max_length=48,
        blank=True,
        default="",
    )
    marked_by: Any = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="marked_outbound_hub_transfer_jobs",
    )
    marked_at: Any = models.DateTimeField(auto_now_add=True)
    queued_at: Any = models.DateTimeField(null=True, blank=True)
    registration_started_at: Any = models.DateTimeField(null=True, blank=True)
    media_upload_started_at: Any = models.DateTimeField(null=True, blank=True)
    last_attempt_at: Any = models.DateTimeField(null=True, blank=True)
    completed_at: Any = models.DateTimeField(null=True, blank=True)
    created_at: Any = models.DateTimeField(auto_now_add=True)
    updated_at: Any = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["video_file", "target_node", "transfer_mode"],
                name="lx_outbound_hub_transfer_unique_video_target_mode",
            ),
            models.UniqueConstraint(
                fields=["raw_pdf_file", "target_node", "transfer_mode"],
                name="lx_outbound_hub_transfer_unique_report_target_mode",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.transfer_key} ({self.local_status})"

    def clean(self) -> None:
        super().clean()

        has_video = self.video_file_id is not None
        has_report = self.raw_pdf_file_id is not None
        if has_video == has_report:
            raise ValidationError(
                "Exactly one of video_file or raw_pdf_file must be set."
            )

        if self.resource_kind == self.ResourceKind.VIDEO:
            if not has_video:
                raise ValidationError(
                    {
                        "video_file": (
                            "video_file is required when resource_kind='video'."
                        )
                    }
                )
            if has_report:
                raise ValidationError(
                    {
                        "raw_pdf_file": (
                            "raw_pdf_file must be empty for video transfers."
                        )
                    }
                )

        if self.resource_kind == self.ResourceKind.REPORT:
            if not has_report:
                raise ValidationError(
                    {
                        "raw_pdf_file": (
                            "raw_pdf_file is required when resource_kind='report'."
                        )
                    }
                )
            if has_video:
                raise ValidationError(
                    {"video_file": "video_file must be empty for report transfers."}
                )

        if self.target_node.role != "central_hub":
            raise ValidationError(
                {"target_node": "target_node must have role='central_hub'."}
            )

        if self.transfer_mode != self.TransferMode.METADATA_AND_PROCESSED_MEDIA:
            raise ValidationError(
                {
                    "transfer_mode": (
                        "Only metadata_and_processed_media is permitted for "
                        "outbound hub transfer."
                    )
                }
            )

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.full_clean()
        super().save(*args, **kwargs)
