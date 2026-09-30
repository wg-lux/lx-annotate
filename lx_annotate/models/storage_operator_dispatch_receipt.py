from __future__ import annotations

import uuid
from typing import Any

from django.db import models


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
