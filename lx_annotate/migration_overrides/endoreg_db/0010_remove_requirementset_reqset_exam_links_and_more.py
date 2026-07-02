from __future__ import annotations

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils.text import slugify

from ._compat import add_field_if_missing, get_table_columns


def _repair_center_identity_columns(apps, schema_editor) -> None:
    add_field_if_missing(
        apps,
        schema_editor,
        model_name="Center",
        field_name="display_name",
        field=models.CharField(blank=True, default="", max_length=255),
    )
    add_field_if_missing(
        apps,
        schema_editor,
        model_name="Center",
        field_name="center_key",
        field=models.CharField(blank=True, default="", max_length=255),
    )


def populate_missing_center_keys(apps, schema_editor) -> None:
    Center = apps.get_model("endoreg_db", "Center")
    table_name = Center._meta.db_table
    columns = get_table_columns(schema_editor, table_name)
    has_display_name = "display_name" in columns
    load_fields = ["id", "name", "center_key"]
    if has_display_name:
        load_fields.append("display_name")
    used_keys: set[str] = set()

    centers = Center.objects.all().only(*load_fields).order_by("pk")
    for center in centers.iterator():
        existing_key = (getattr(center, "center_key", "") or "").strip()
        if existing_key:
            used_keys.add(existing_key)

    centers = Center.objects.all().only(*load_fields).order_by("pk")
    for center in centers.iterator():
        existing_key = (getattr(center, "center_key", "") or "").strip()
        if existing_key:
            continue

        display_name = getattr(center, "display_name", "") if has_display_name else ""
        base = slugify(display_name or center.name or "") or "center"
        candidate = base
        suffix = 2
        while candidate in used_keys:
            candidate = f"{base}-{suffix}"
            suffix += 1
        center.center_key = candidate
        center.save(update_fields=["center_key"])
        used_keys.add(candidate)


class Migration(migrations.Migration):
    dependencies = [
        ("endoreg_db", "0009_patientexamination_draft_updated_at_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    _repair_center_identity_columns,
                    reverse_code=migrations.RunPython.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="center",
                    name="center_key",
                    field=models.CharField(blank=True, default="", max_length=255),
                    preserve_default=False,
                ),
            ],
        ),
        migrations.RunPython(populate_missing_center_keys, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="center",
            name="center_key",
            field=models.CharField(blank=True, max_length=255, unique=True),
        ),
        migrations.AddField(
            model_name="uploadjob",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                help_text="Authenticated user who initiated the upload job, if any",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_upload_jobs",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="uploadjob",
            name="idempotency_key",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="Client-supplied idempotency key for logical deduplication",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="uploadjob",
            name="ingest_mode",
            field=models.CharField(
                choices=[("api", "API"), ("watcher", "Watcher")],
                default="api",
                help_text="How the ingest request entered the system",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="uploadjob",
            name="original_filename",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Original client-supplied filename",
                max_length=512,
            ),
        ),
        migrations.AddField(
            model_name="uploadjob",
            name="processing_provenance",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Additional ingest metadata recorded for audit and processing",
            ),
        ),
        migrations.AddField(
            model_name="uploadjob",
            name="source_center",
            field=models.ForeignKey(
                blank=True,
                help_text="Center identity attached to the ingest request",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="upload_jobs",
                to="endoreg_db.center",
            ),
        ),
        migrations.AddField(
            model_name="uploadjob",
            name="source_system",
            field=models.CharField(
                blank=True,
                default="api",
                help_text="Name of the upstream source system or client",
                max_length=255,
            ),
        ),
    ]
