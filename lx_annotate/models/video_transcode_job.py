from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


class VideoTranscodeJob(models.Model):
    """Durable, attributable operation on one processed-media generation."""

    video_id: int
    actor_id: int

    class Option(models.TextChoices):
        REPLACE_PROCESSED = "replace_processed", "Replace processed derivative"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"
        FAILED = "failed", "Failed"
        LOST = "lost", "Lost"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    video = models.ForeignKey(
        "endoreg_db.VideoFile", on_delete=models.PROTECT, related_name="transcode_jobs"
    )
    actor = models.ForeignKey(User, on_delete=models.PROTECT)
    idempotency_key = models.UUIDField(unique=True)
    option = models.CharField(max_length=32, choices=Option.choices)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.QUEUED
    )
    stage = models.CharField(max_length=32, default="queued")
    source_name = models.CharField(max_length=500)
    source_sha256 = models.CharField(max_length=64)
    claim_token = models.UUIDField(null=True, blank=True)
    before_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    after_bytes = models.PositiveBigIntegerField(null=True, blank=True)
    saved_bytes = models.BigIntegerField(null=True, blank=True)
    error_code = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    heartbeat_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["video"],
                condition=models.Q(status__in=["queued", "running"]),
                name="lx_one_active_video_transcode",
            )
        ]
