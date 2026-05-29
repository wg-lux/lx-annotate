import uuid

from django.db import migrations, models


class AddFieldIfMissing(migrations.AddField):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        to_model = to_state.apps.get_model(app_label, self.model_name)
        table_name = to_model._meta.db_table
        column_name = to_model._meta.get_field(self.name).column

        with schema_editor.connection.cursor() as cursor:
            columns = schema_editor.connection.introspection.get_table_description(
                cursor, table_name
            )

        if any(column.name == column_name for column in columns):
            return

        super().database_forwards(app_label, schema_editor, from_state, to_state)


def populate_rawpdffile_uuid(apps, schema_editor):
    raw_pdf_model = apps.get_model("endoreg_db", "RawPdfFile")

    for raw_pdf in (
        raw_pdf_model.objects.filter(uuid__isnull=True).only("id", "uuid").iterator()
    ):
        raw_pdf.uuid = uuid.uuid4()
        raw_pdf.save(update_fields=["uuid"])


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
