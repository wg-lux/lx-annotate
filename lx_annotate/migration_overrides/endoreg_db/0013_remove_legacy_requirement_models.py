from django.db import migrations


class DeleteModelIfExists(migrations.DeleteModel):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = from_state.apps.get_model(app_label, self.name)
        table_names = [
            field.remote_field.through._meta.db_table
            for field in model._meta.local_many_to_many
            if field.remote_field.through._meta.auto_created
        ]
        table_names.append(model._meta.db_table)

        for table_name in table_names:
            schema_editor.execute(
                f"DROP TABLE IF EXISTS {schema_editor.quote_name(table_name)} CASCADE"
            )


class Migration(migrations.Migration):
    dependencies = [
        ("endoreg_db", "0012_networknode_transferjob"),
    ]

    operations = [
        DeleteModelIfExists(
            name="Requirement",
        ),
        DeleteModelIfExists(
            name="RequirementSet",
        ),
        DeleteModelIfExists(
            name="ExaminationRequirementSet",
        ),
        DeleteModelIfExists(
            name="RequirementOperator",
        ),
        DeleteModelIfExists(
            name="RequirementSetType",
        ),
        DeleteModelIfExists(
            name="RequirementType",
        ),
    ]
