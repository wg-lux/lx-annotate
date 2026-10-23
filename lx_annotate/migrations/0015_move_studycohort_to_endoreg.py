"""Move cohort persistence without changing identities or membership rows."""

from __future__ import annotations

from django.core.management.color import no_style
from django.db import migrations


def move_cohorts(apps, schema_editor, source_app, target_app):
    source = apps.get_model(source_app, "StudyCohort")
    target = apps.get_model(target_app, "StudyCohort")
    alias = schema_editor.connection.alias
    if target.objects.using(alias).exists():
        raise ValueError("Target cohort table is not empty; reconcile before migrating")
    pairs = [(source, target)]
    for name in ("datasets", "imported_examinations"):
        pairs.append(
            (
                source._meta.get_field(name).remote_field.through,
                target._meta.get_field(name).remote_field.through,
            )
        )
    quote = schema_editor.quote_name
    for old, new in pairs:
        columns = ", ".join(quote(field.column) for field in old._meta.local_fields)
        schema_editor.execute(
            f"INSERT INTO {quote(new._meta.db_table)} ({columns}) SELECT {columns} FROM {quote(old._meta.db_table)}"
        )
    # Clear sources in dependency order. The following DeleteModel removes only
    # the now-empty legacy tables. Reverse migration uses the same atomic move.
    for old, _ in reversed(pairs):
        schema_editor.execute(f"DELETE FROM {quote(old._meta.db_table)}")
    for statement in schema_editor.connection.ops.sequence_reset_sql(
        no_style(), [new for _, new in pairs]
    ):
        schema_editor.execute(statement)
    # Resolve deferred foreign-key trigger events before DeleteModel drops the
    # emptied legacy tables in this same atomic migration.
    schema_editor.connection.check_constraints()


def forwards(apps, schema_editor):
    move_cohorts(apps, schema_editor, "lx_annotate", "endoreg_db")


def backwards(apps, schema_editor):
    move_cohorts(apps, schema_editor, "endoreg_db", "lx_annotate")


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0014_studycohort_study"),
        ("endoreg_db", "0096_studycohort"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.DeleteModel(name="StudyCohort"),
    ]
