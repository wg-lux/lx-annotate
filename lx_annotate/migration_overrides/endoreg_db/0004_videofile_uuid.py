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


def populate_videofile_uuid(apps, schema_editor):
    video_file_model = apps.get_model("endoreg_db", "VideoFile")

    for video in video_file_model.objects.filter(uuid__isnull=True).iterator():
        video.uuid = uuid.uuid4()
        video.save(update_fields=["uuid"])


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
