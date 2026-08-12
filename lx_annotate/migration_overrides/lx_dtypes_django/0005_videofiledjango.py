from __future__ import annotations

import typing
import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lx_dtypes_django", "0001_initial_squashed_0004_merge_20260402_0343"),
    ]

    operations = [
        migrations.CreateModel(
            name="VideoFileDjango",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("tags", models.CharField(blank=True, max_length=1024)),
                (
                    "uuid",
                    models.UUIDField(
                        db_index=True,
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                        unique=True,
                    ),
                ),
                ("external_ids", models.JSONField(default=dict)),
                ("center", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "processor",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "video_meta",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "examination",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("patient", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "ai_model_meta",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("state", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "import_meta",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "sensitive_meta",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("video_hash", models.CharField(max_length=255)),
                (
                    "processed_video_hash",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "original_file_name",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                (
                    "storage_mode",
                    models.CharField(blank=True, max_length=64, null=True),
                ),
                (
                    "raw_streamable_relative_path",
                    models.CharField(blank=True, max_length=512),
                ),
                (
                    "processed_streamable_relative_path",
                    models.CharField(blank=True, max_length=512),
                ),
                (
                    "raw_file",
                    models.FileField(
                        blank=True,
                        max_length=500,
                        null=True,
                        upload_to="",
                    ),
                ),
                (
                    "processed_file",
                    models.FileField(
                        blank=True,
                        max_length=500,
                        null=True,
                        upload_to="",
                    ),
                ),
                ("uploaded_at", models.DateTimeField(blank=True, null=True)),
                ("frame_dir", models.CharField(blank=True, max_length=512)),
                ("fps", models.FloatField()),
                ("duration", models.FloatField()),
                ("frame_count", models.IntegerField()),
                ("width", models.IntegerField()),
                ("height", models.IntegerField()),
                ("suffix", models.CharField(max_length=10)),
                ("sequences", models.JSONField(default=dict)),
                ("export_segments_by_video", models.BooleanField(default=False)),
                ("date", models.DateField(blank=True, null=True)),
                ("meta", models.JSONField(null=True)),
                ("date_created", models.DateTimeField(auto_now_add=True)),
                ("date_modified", models.DateTimeField(auto_now=True)),
            ],
            options={"abstract": False},
            bases=(typing.cast(type[typing.Any], typing.Generic), models.Model),
        ),
    ]
