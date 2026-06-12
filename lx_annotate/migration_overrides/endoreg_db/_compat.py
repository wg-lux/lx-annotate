from __future__ import annotations

import uuid

from django.db import migrations, models


def table_exists(schema_editor, table_name: str) -> bool:
    with schema_editor.connection.cursor() as cursor:
        return table_name in schema_editor.connection.introspection.table_names(cursor)


def get_table_columns(schema_editor, table_name: str) -> set[str]:
    with schema_editor.connection.cursor() as cursor:
        return {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, table_name
            )
        }


def column_exists(schema_editor, table_name: str, column_name: str) -> bool:
    return column_name in get_table_columns(schema_editor, table_name)


def add_field_if_missing(
    apps,
    schema_editor,
    *,
    model_name: str,
    field_name: str,
    field: models.Field,
    app_label: str = "endoreg_db",
) -> None:
    model = apps.get_model(app_label, model_name)
    table_name = model._meta.db_table
    field.set_attributes_from_name(field_name)
    if field.column is None:
        raise ValueError(f"Field {field_name!r} does not expose a database column.")

    if column_exists(schema_editor, table_name, field.column):
        return

    field.model = model
    schema_editor.add_field(model, field)


class AddFieldIfMissing(migrations.AddField):
    def database_forwards(self, app_label, schema_editor, from_state, to_state):
        to_model = to_state.apps.get_model(app_label, self.model_name)
        table_name = to_model._meta.db_table
        column_name = to_model._meta.get_field(self.name).column
        if column_name is None:
            raise ValueError(f"Field {self.name!r} does not expose a database column.")

        if column_exists(schema_editor, table_name, column_name):
            return

        super().database_forwards(app_label, schema_editor, from_state, to_state)


def backfill_missing_uuid(
    apps,
    schema_editor,
    *,
    model_name: str,
    app_label: str = "endoreg_db",
    field_name: str = "uuid",
) -> None:
    model = apps.get_model(app_label, model_name)
    table_name = schema_editor.quote_name(model._meta.db_table)
    pk_column = schema_editor.quote_name(model._meta.pk.column)
    uuid_column = schema_editor.quote_name(model._meta.get_field(field_name).column)

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f"SELECT {pk_column} FROM {table_name} WHERE {uuid_column} IS NULL"
        )
        for (pk_value,) in cursor.fetchall():
            cursor.execute(
                f"UPDATE {table_name} SET {uuid_column} = %s WHERE {pk_column} = %s",
                [uuid.uuid4(), pk_value],
            )


def drop_table_if_exists(schema_editor, table_name: str) -> None:
    schema_editor.execute(
        f"DROP TABLE IF EXISTS {schema_editor.quote_name(table_name)} CASCADE"
    )


def create_model_if_table_missing(
    apps,
    schema_editor,
    *,
    model_name: str,
    app_label: str = "endoreg_db",
) -> None:
    model = apps.get_model(app_label, model_name)

    if table_exists(schema_editor, model._meta.db_table):
        return

    schema_editor.create_model(model)


def create_many_to_many_table_if_missing(
    apps,
    schema_editor,
    *,
    model_name: str,
    field_name: str,
    app_label: str = "endoreg_db",
) -> None:
    model = apps.get_model(app_label, model_name)
    through_model = model._meta.get_field(field_name).remote_field.through

    if table_exists(schema_editor, through_model._meta.db_table):
        return

    schema_editor.create_model(through_model)
