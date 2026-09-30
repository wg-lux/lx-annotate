from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()


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
