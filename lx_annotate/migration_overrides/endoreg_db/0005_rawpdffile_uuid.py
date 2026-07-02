import uuid

from django.db import migrations, models

from ._compat import AddFieldIfMissing, backfill_missing_uuid


def populate_rawpdffile_uuid(apps, schema_editor):
    backfill_missing_uuid(apps, schema_editor, model_name="RawPdfFile")


class Migration(migrations.Migration):
    dependencies = [
        ("endoreg_db", "0004_videofile_uuid"),
    ]

    operations = [
        AddFieldIfMissing(
            model_name="rawpdffile",
            name="uuid",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(populate_rawpdffile_uuid, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="rawpdffile",
            name="uuid",
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
