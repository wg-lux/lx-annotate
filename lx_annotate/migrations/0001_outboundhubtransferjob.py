from __future__ import annotations

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        (
            "endoreg_db",
            "0014_sensitivemeta_tags_sensitivemeta_validation_comment_and_more",
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="OutboundHubTransferJob",
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
                (
                    "transfer_key",
                    models.CharField(db_index=True, max_length=255, unique=True),
                ),
                (
                    "transfer_mode",
                    models.CharField(
                        choices=[
                            (
                                "metadata_and_processed_media",
                                "Metadata And Processed Media",
                            )
                        ],
                        default="metadata_and_processed_media",
                        max_length=48,
                    ),
                ),
                (
                    "local_status",
                    models.CharField(
                        choices=[
                            ("marked", "Marked"),
                            ("queued", "Queued"),
                            ("registering", "Registering"),
                            ("awaiting_media", "Awaiting Media"),
                            ("uploading", "Uploading"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                        ],
                        db_index=True,
                        default="marked",
                        max_length=32,
                    ),
                ),
                ("retry_count", models.PositiveIntegerField(default=0)),
                ("last_error", models.TextField(blank=True, default="")),
                (
                    "remote_transfer_id",
                    models.CharField(blank=True, default="", max_length=64),
                ),
                (
                    "remote_transfer_status",
                    models.CharField(blank=True, default="", max_length=32),
                ),
                (
                    "remote_processing_decision",
                    models.CharField(blank=True, default="", max_length=48),
                ),
                ("marked_at", models.DateTimeField(auto_now_add=True)),
                ("queued_at", models.DateTimeField(blank=True, null=True)),
                (
                    "registration_started_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                (
                    "media_upload_started_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                ("last_attempt_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "marked_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="marked_outbound_hub_transfer_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "raw_pdf_file",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="outbound_hub_transfer_jobs",
                        to="endoreg_db.rawpdffile",
                    ),
                ),
                (
                    "source_center",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="outbound_hub_transfer_jobs",
                        to="endoreg_db.center",
                    ),
                ),
                (
                    "target_node",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="outbound_hub_transfer_jobs",
                        to="endoreg_db.networknode",
                    ),
                ),
                (
                    "video_file",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="outbound_hub_transfer_jobs",
                        to="endoreg_db.videofile",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="outboundhubtransferjob",
            constraint=models.UniqueConstraint(
                fields=("video_file", "target_node", "transfer_mode"),
                name="lx_outbound_hub_transfer_unique_video_target_mode",
            ),
        ),
        migrations.AddConstraint(
            model_name="outboundhubtransferjob",
            constraint=models.UniqueConstraint(
                fields=("raw_pdf_file", "target_node", "transfer_mode"),
                name="lx_outbound_hub_transfer_unique_report_target_mode",
            ),
        ),
    ]
