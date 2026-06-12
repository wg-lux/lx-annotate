from typing import Any, cast

from django.db import migrations
from ._compat import drop_table_if_exists


class DeleteModelIfExists(migrations.DeleteModel):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        model = from_state.apps.get_model(app_label, self.name)
        table_names: list[str] = []
        for field in model._meta.local_many_to_many:
            remote_field = getattr(field, "remote_field", None)
            if remote_field is None:
                continue

            through_model = cast(Any, remote_field).through
            if through_model is not None and through_model._meta.auto_created:
                table_names.append(through_model._meta.db_table)
        table_names.append(model._meta.db_table)

        for table_name in table_names:
            drop_table_if_exists(schema_editor, table_name)


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
