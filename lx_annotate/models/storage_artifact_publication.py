from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from django.db import models


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
