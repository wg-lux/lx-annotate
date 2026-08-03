from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0002_outboundhubtransferjob_local_cleanup_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="outboundhubtransferjob",
            name="failure_class",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "No Failure"),
                    ("configuration_rejection", "Configuration Rejection"),
                    ("authorization_denial", "Authorization Denial"),
                    ("integrity_inconsistency", "Integrity Inconsistency"),
                    ("transient_retry", "Transient Retry"),
                ],
                db_index=True,
                default="",
                max_length=32,
            ),
        ),
    ]
