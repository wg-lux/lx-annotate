from __future__ import annotations

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0004_storagenodeactionreceipt"),
    ]

    operations = [
        migrations.CreateModel(
            name="StorageOperatorDispatchReceipt",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("operator_receipt_id", models.UUIDField(unique=True)),
                ("action", models.CharField(max_length=16)),
                ("control_version", models.PositiveBigIntegerField()),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pending"), ("dispatched", "Dispatched")],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("attempt_count", models.PositiveIntegerField(default=0)),
                (
                    "last_error",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("dispatched_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["status", "created_at"],
                        name="lx_op_dispatch_state_idx",
                    ),
                ],
            },
        ),
    ]
