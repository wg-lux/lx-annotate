from django.db import migrations, models

from ._compat import add_field_if_missing


def _conditionally_add_patient_examination_fields(apps, schema_editor) -> None:
    add_field_if_missing(
        apps,
        schema_editor,
        model_name="PatientExamination",
        field_name="draft_updated_at",
        field=models.DateTimeField(blank=True, null=True),
    )
    add_field_if_missing(
        apps,
        schema_editor,
        model_name="PatientExamination",
        field_name="knowledge_base_module",
        field=models.CharField(blank=True, default="", max_length=255),
    )
    add_field_if_missing(
        apps,
        schema_editor,
        model_name="PatientExamination",
        field_name="knowledge_base_version",
        field=models.CharField(blank=True, default="", max_length=255),
    )
    add_field_if_missing(
        apps,
        schema_editor,
        model_name="PatientExamination",
        field_name="report_draft",
        field=models.JSONField(blank=True, default=dict),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("endoreg_db", "0008_imageclassificationannotation_upsert_fields"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    _conditionally_add_patient_examination_fields,
                    reverse_code=migrations.RunPython.noop,
                )
            ],
            state_operations=[
                migrations.AddField(
                    model_name="patientexamination",
                    name="draft_updated_at",
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="patientexamination",
                    name="knowledge_base_module",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
                migrations.AddField(
                    model_name="patientexamination",
                    name="knowledge_base_version",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
                migrations.AddField(
                    model_name="patientexamination",
                    name="report_draft",
                    field=models.JSONField(blank=True, default=dict),
                ),
            ],
        )
    ]
