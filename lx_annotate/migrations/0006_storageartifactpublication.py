from __future__ import annotations

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("endoreg_db", "0050_storage_operator_control"),
        ("lx_annotate", "0005_storageoperatordispatchreceipt"),
    ]

    operations = [
        migrations.CreateModel(
            name="StorageArtifactPublication",
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
                (
                    "resource_kind",
                    models.CharField(
                        choices=[("video", "Video"), ("report", "Report")],
                        max_length=16,
                    ),
                ),
                ("processed_file_name", models.CharField(max_length=500)),
                ("processed_sha256", models.CharField(max_length=64)),
                ("source_center_key", models.CharField(max_length=255)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("processing", "Processing"),
                            ("committed", "Committed"),
                            ("blocked", "Blocked"),
                        ],
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("attempt_count", models.PositiveIntegerField(default=0)),
                ("placement_id", models.UUIDField(blank=True, null=True)),
                ("transfer_evidence_id", models.UUIDField(blank=True, null=True)),
                ("node_key", models.CharField(blank=True, default="", max_length=255)),
                (
                    "last_error_code",
                    models.CharField(blank=True, default="", max_length=128),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_attempt_at", models.DateTimeField(blank=True, null=True)),
                ("committed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "raw_pdf_file",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="storage_artifact_publications",
                        to="endoreg_db.rawpdffile",
                    ),
                ),
                (
                    "video_file",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="storage_artifact_publications",
                        to="endoreg_db.videofile",
                    ),
                ),
            ],
            options={"ordering": ["created_at", "pk"]},
        ),
        migrations.AddConstraint(
            model_name="storageartifactpublication",
            constraint=models.UniqueConstraint(
                condition=models.Q(("resource_kind", "video")),
                fields=("video_file", "processed_sha256"),
                name="lx_storage_pub_video_generation",
            ),
        ),
        migrations.AddConstraint(
            model_name="storageartifactpublication",
            constraint=models.UniqueConstraint(
                condition=models.Q(("resource_kind", "report")),
                fields=("raw_pdf_file", "processed_sha256"),
                name="lx_storage_pub_report_generation",
            ),
        ),
        migrations.AddConstraint(
            model_name="storageartifactpublication",
            constraint=models.CheckConstraint(
                condition=(
                    models.Q(
                        ("raw_pdf_file__isnull", True),
                        ("resource_kind", "video"),
                        ("video_file__isnull", False),
                    )
                    | models.Q(
                        ("raw_pdf_file__isnull", False),
                        ("resource_kind", "report"),
                        ("video_file__isnull", True),
                    )
                ),
                name="lx_storage_pub_exact_resource",
            ),
        ),
        migrations.AddIndex(
            model_name="storageartifactpublication",
            index=models.Index(
                fields=["status", "created_at"],
                name="lx_storage_pub_state_idx",
            ),
        ),
    ]
