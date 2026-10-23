from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0011_studycohort_definition_snapshot"),
        ("endoreg_db", "0093_study_table_import"),
    ]
    operations = [
        migrations.AddField(
            model_name="studycohort",
            name="imported_examinations",
            field=models.ManyToManyField(
                blank=True,
                related_name="imported_study_cohorts",
                to="endoreg_db.patientexamination",
            ),
        )
    ]
