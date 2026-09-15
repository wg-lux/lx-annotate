from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0001_outboundhubtransferjob"),
    ]

    operations = [
        migrations.AddField(
            model_name="outboundhubtransferjob",
            name="local_cleanup_eligible_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="outboundhubtransferjob",
            name="local_cleanup_policy",
            field=models.CharField(
                choices=[
                    ("retain_processed_media", "Retain Processed Media"),
                    (
                        "eligible_after_verified_apply",
                        "Eligible After Verified Apply",
                    ),
                ],
                default="retain_processed_media",
                max_length=48,
            ),
        ),
        migrations.AddField(
            model_name="outboundhubtransferjob",
            name="local_cleanup_status",
            field=models.CharField(
                choices=[
                    ("not_applicable", "Not Applicable"),
                    ("retained", "Retained"),
                    ("eligible", "Eligible"),
                    ("cleaned", "Cleaned"),
                ],
                default="not_applicable",
                max_length=32,
            ),
        ),
    ]
