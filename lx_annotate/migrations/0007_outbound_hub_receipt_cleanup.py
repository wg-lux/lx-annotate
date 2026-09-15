from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0006_storageartifactpublication"),
    ]

    operations = [
        migrations.AddField(
            model_name="outboundhubtransferjob",
            name="envelope_receipt",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="outboundhubtransferjob",
            name="local_cleanup_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="outboundhubtransferjob",
            name="local_cleanup_status",
            field=models.CharField(
                choices=[
                    ("not_applicable", "Not Applicable"),
                    ("retained", "Retained"),
                    ("eligible", "Eligible"),
                    ("cleaning", "Cleaning"),
                    ("cleaned", "Cleaned"),
                ],
                default="not_applicable",
                max_length=32,
            ),
        ),
    ]
