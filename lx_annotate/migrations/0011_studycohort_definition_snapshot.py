from __future__ import annotations

import uuid

from django.db import migrations, models


def assign_definition_identities(apps, schema_editor):
    cohort_model = apps.get_model("lx_annotate", "StudyCohort")
    for cohort in (
        cohort_model.objects.using(schema_editor.connection.alias).all().iterator()
    ):
        cohort.definition_uuid = uuid.uuid4()
        cohort.save(update_fields=["definition_uuid"])


class Migration(migrations.Migration):
    dependencies = [("lx_annotate", "0010_studycohort")]

    operations = [
        migrations.AddField(
            model_name="studycohort",
            name="definition_uuid",
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(assign_definition_identities, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="studycohort",
            name="definition_uuid",
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
        migrations.AddField(
            model_name="studycohort",
            name="study_metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="studycohort",
            name="definition_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
