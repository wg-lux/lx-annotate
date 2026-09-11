from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

User = get_user_model()


class AIDatasetSplitPlan(models.Model):
    """Immutable, validated annotation membership snapshot."""

    dataset = models.ForeignKey("endoreg_db.AIDataSet", on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    snapshot = models.JSONField()

    def clean(self):
        from pydantic import ValidationError as SchemaError

        from lx_annotate.schemas.ai_dataset_splits import SplitSnapshot

        super().clean()
        try:
            self.snapshot = SplitSnapshot.model_validate(self.snapshot).model_dump(
                mode="json"
            )
        except SchemaError as error:
            raise ValidationError(
                {"snapshot": "Invalid split membership snapshot."}
            ) from error

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Split plans are immutable; create a new plan.")
        self.full_clean()
        return super().save(*args, **kwargs)

    class Meta:
        ordering = ["-created_at", "-pk"]


class StorageNodeActionReceipt(models.Model):
    """Unique, attributable replay receipt for one storage drain-state mutation."""

    if TYPE_CHECKING:
        actor_id: int

    id: Any = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idempotency_key: Any = models.CharField(max_length=255, unique=True)
    node_key: Any = models.CharField(max_length=255)
    action: Any = models.CharField(max_length=16)
    expected_is_draining: Any = models.BooleanField()
    resulting_is_draining: Any = models.BooleanField()
    reason: Any = models.CharField(max_length=1000)
    actor: Any = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="storage_node_action_receipts",
    )
    correlation_id: Any = models.CharField(max_length=255)
    created_at: Any = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class StorageOperatorDispatchReceipt(models.Model):
    """Durable local dispatch state for an endoreg operator intent."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        DISPATCHED = "dispatched", "Dispatched"

    id: Any = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operator_receipt_id: Any = models.UUIDField(unique=True)
    action: Any = models.CharField(max_length=16)
    control_version: Any = models.PositiveBigIntegerField()
    status: Any = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    attempt_count: Any = models.PositiveIntegerField(default=0)
    last_error: Any = models.CharField(max_length=255, blank=True, default="")
    created_at: Any = models.DateTimeField(auto_now_add=True)
    dispatched_at: Any = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="lx_op_dispatch_state_idx",
            ),
        ]


class StorageArtifactPublication(models.Model):
    """Durable request to publish one approved processed-media generation."""

    if TYPE_CHECKING:
        video_file_id: int | None
        raw_pdf_file_id: int | None

    class ResourceKind(models.TextChoices):
        VIDEO = "video", "Video"
        REPORT = "report", "Report"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMMITTED = "committed", "Committed"
        BLOCKED = "blocked", "Blocked"

    id: Any = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource_kind: Any = models.CharField(max_length=16, choices=ResourceKind.choices)
    video_file: Any = models.ForeignKey(
        "endoreg_db.VideoFile",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="storage_artifact_publications",
    )
    raw_pdf_file: Any = models.ForeignKey(
        "endoreg_db.RawPdfFile",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="storage_artifact_publications",
    )
    processed_file_name: Any = models.CharField(max_length=500)
    processed_sha256: Any = models.CharField(max_length=64)
    source_center_key: Any = models.CharField(max_length=255)
    status: Any = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
    )
    attempt_count: Any = models.PositiveIntegerField(default=0)
    placement_id: Any = models.UUIDField(null=True, blank=True)
    transfer_evidence_id: Any = models.UUIDField(null=True, blank=True)
    node_key: Any = models.CharField(max_length=255, blank=True, default="")
    last_error_code: Any = models.CharField(max_length=128, blank=True, default="")
    created_at: Any = models.DateTimeField(auto_now_add=True)
    last_attempt_at: Any = models.DateTimeField(null=True, blank=True)
    committed_at: Any = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at", "pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["video_file", "processed_sha256"],
                condition=models.Q(resource_kind="video"),
                name="lx_storage_pub_video_generation",
            ),
            models.UniqueConstraint(
                fields=["raw_pdf_file", "processed_sha256"],
                condition=models.Q(resource_kind="report"),
                name="lx_storage_pub_report_generation",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        resource_kind="video",
                        video_file__isnull=False,
                        raw_pdf_file__isnull=True,
                    )
                    | models.Q(
                        resource_kind="report",
                        video_file__isnull=True,
                        raw_pdf_file__isnull=False,
                    )
                ),
                name="lx_storage_pub_exact_resource",
            ),
        ]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="lx_storage_pub_state_idx",
            ),
        ]


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

    class FailureClass(models.TextChoices):
        NO_FAILURE = "", "No Failure"
        CONFIGURATION_REJECTION = (
            "configuration_rejection",
            "Configuration Rejection",
        )
        AUTHORIZATION_DENIAL = "authorization_denial", "Authorization Denial"
        INTEGRITY_INCONSISTENCY = (
            "integrity_inconsistency",
            "Integrity Inconsistency",
        )
        TRANSIENT_RETRY = "transient_retry", "Transient Retry"

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
        CLEANING = "cleaning", "Cleaning"
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
    local_cleanup_completed_at: Any = models.DateTimeField(null=True, blank=True)
    envelope_receipt: Any = models.JSONField(null=True, blank=True)
    local_status: Any = models.CharField(
        max_length=32,
        choices=LocalStatus.choices,
        default=LocalStatus.MARKED,
        db_index=True,
    )
    retry_count: Any = models.PositiveIntegerField(default=0)
    failure_class: Any = models.CharField(
        max_length=32,
        choices=FailureClass.choices,
        blank=True,
        default=FailureClass.NO_FAILURE,
        db_index=True,
    )
    last_error: Any = models.TextField(blank=True, default="")
    remote_transfer_id: Any = models.CharField(max_length=64, blank=True, default="")
    remote_transfer_status: Any = models.CharField(
        max_length=32,
        blank=True,
        default="",
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
                "Exactly one of video_file or raw_pdf_file must be set.",
            )

        if self.resource_kind == self.ResourceKind.VIDEO:
            if not has_video:
                raise ValidationError(
                    {
                        "video_file": (
                            "video_file is required when resource_kind='video'."
                        ),
                    },
                )
            if has_report:
                raise ValidationError(
                    {
                        "raw_pdf_file": (
                            "raw_pdf_file must be empty for video transfers."
                        ),
                    },
                )

        if self.resource_kind == self.ResourceKind.REPORT:
            if not has_report:
                raise ValidationError(
                    {
                        "raw_pdf_file": (
                            "raw_pdf_file is required when resource_kind='report'."
                        ),
                    },
                )
            if has_video:
                raise ValidationError(
                    {"video_file": ("video_file must be empty for report transfers.")},
                )

        if self.target_node.role != "central_hub":
            raise ValidationError(
                {"target_node": "target_node must have role='central_hub'."},
            )

        if self.transfer_mode != self.TransferMode.METADATA_AND_PROCESSED_MEDIA:
            raise ValidationError(
                {
                    "transfer_mode": (
                        "Only metadata_and_processed_media is permitted for "
                        "outbound hub transfer."
                    ),
                },
            )

        if self.envelope_receipt is not None:
            from lx_dtypes.models.contracts.hub_media_envelope import (
                HubMediaEnvelopeReceipt,
            )

            try:
                receipt = HubMediaEnvelopeReceipt.model_validate(self.envelope_receipt)
            except ValueError as exc:
                raise ValidationError(
                    {"envelope_receipt": "Envelope receipt is invalid."},
                ) from exc

            resource = self.video_file if has_video else self.raw_pdf_file
            resource_hash_field = "video_hash" if has_video else "pdf_hash"
            processed_hash = (
                str(getattr(resource, "processed_video_hash", "") or "").strip()
                if has_video
                else str(
                    getattr(
                        getattr(resource, "state", None),
                        "processed_file_sha256",
                        "",
                    )
                    or "",
                ).strip()
            )
            expected = {
                "transfer_key": str(self.transfer_key),
                "target_node_key": str(self.target_node.node_key),
                "source_center_key": str(
                    getattr(self.source_center, "center_key", "") or "",
                ),
                "resource_kind": str(self.resource_kind),
                "resource_hash": str(
                    getattr(resource, resource_hash_field, "") or "",
                ),
                "processed_media_hash": processed_hash,
            }
            mismatches = [
                field_name
                for field_name, expected_value in expected.items()
                if not expected_value
                or str(getattr(receipt, field_name)) != expected_value
            ]
            if self.remote_transfer_id and (
                receipt.receiver_transfer_id != str(self.remote_transfer_id)
            ):
                mismatches.append("receiver_transfer_id")
            if mismatches:
                raise ValidationError(
                    {
                        "envelope_receipt": (
                            "Envelope receipt does not match the outbound job: "
                            + ", ".join(sorted(set(mismatches)))
                        ),
                    },
                )

    def save(self, *args: Any, **kwargs: Any) -> None:
        self.full_clean()
        super().save(*args, **kwargs)
