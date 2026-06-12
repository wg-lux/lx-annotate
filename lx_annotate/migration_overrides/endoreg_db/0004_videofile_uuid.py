import uuid

from django.db import migrations, models

from ._compat import AddFieldIfMissing, backfill_missing_uuid


def populate_videofile_uuid(apps, schema_editor):
    backfill_missing_uuid(apps, schema_editor, model_name="VideoFile")


class Migration(migrations.Migration):
    dependencies = [
        ("endoreg_db", "0003_patientexaminationreport_report_and_more"),
    ]

    operations = [
        AddFieldIfMissing(
            model_name="videofile",
            name="uuid",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(populate_videofile_uuid, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="videofile",
            name="uuid",
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
