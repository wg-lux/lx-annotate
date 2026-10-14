"""Transfer application persistence atomically; stop all writers before migration."""

from __future__ import annotations

from django.conf import settings
from django.core.management.color import no_style
from django.db import migrations

MODEL_NAMES = (
    "AIDatasetSplitPlan",
    "OutboundHubTransferJob",
    "StorageArtifactPublication",
    "StorageNodeActionReceipt",
    "StorageOperatorDispatchReceipt",
    "VideoTranscodeJob",
)


def move_content_types(apps, alias, source_app, target_app):
    ContentType = apps.get_model("contenttypes", "ContentType")
    Permission = apps.get_model("auth", "Permission")
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Group = apps.get_model("auth", "Group")
    memberships = (
        (User._meta.get_field("user_permissions").remote_field.through, "user_id"),
        (Group._meta.get_field("permissions").remote_field.through, "group_id"),
    )
    # Cohort persistence already moved in 0015 and stays canonical when only
    # 0016 is rolled back. Its permission correction is forward-only here.
    names = (
        (*MODEL_NAMES, "StudyCohort") if source_app == "lx_annotate" else MODEL_NAMES
    )
    for name in names:
        old = (
            ContentType.objects.using(alias)
            .filter(app_label=source_app, model=name.lower())
            .first()
        )
        if old is None:
            continue
        new = (
            ContentType.objects.using(alias)
            .filter(app_label=target_app, model=name.lower())
            .first()
        )
        if new is None:
            old.app_label = target_app
            old.save(using=alias, update_fields=["app_label"])
            continue
        # A separately migrated dependency may already have default permissions.
        # Merge both sets of assignments before removing the redundant identity.
        for permission in Permission.objects.using(alias).filter(content_type=old):
            replacement = (
                Permission.objects.using(alias)
                .filter(content_type=new, codename=permission.codename)
                .first()
            )
            if replacement is None:
                permission.content_type_id = new.pk
                permission.save(using=alias, update_fields=["content_type"])
                continue
            for through, owner_field in memberships:
                for owner_id in (
                    through.objects.using(alias)
                    .filter(permission_id=permission.pk)
                    .values_list(owner_field, flat=True)
                ):
                    through.objects.using(alias).get_or_create(
                        **{owner_field: owner_id, "permission_id": replacement.pk}
                    )
            # Preserve custom foreign-key references as well as admin history.
            for model in apps.get_models(include_auto_created=True):
                for field in model._meta.local_fields:
                    if field.is_relation and field.related_model == Permission:
                        if model not in {pair[0] for pair in memberships}:
                            model.objects.using(alias).filter(
                                **{field.attname: permission.pk}
                            ).update(**{field.attname: replacement.pk})
            permission.delete(using=alias)
        for model in apps.get_models(include_auto_created=True):
            for field in model._meta.local_fields:
                if field.is_relation and field.related_model == ContentType:
                    model.objects.using(alias).filter(**{field.attname: old.pk}).update(
                        **{field.attname: new.pk}
                    )
        old.delete(using=alias)


def move_models(apps, schema_editor, source_app, target_app):
    alias = schema_editor.connection.alias
    pairs = [
        (apps.get_model(source_app, name), apps.get_model(target_app, name))
        for name in MODEL_NAMES
    ]
    if schema_editor.connection.vendor == "postgresql":
        tables = ", ".join(
            schema_editor.quote_name(model._meta.db_table)
            for pair in pairs
            for model in pair
        )
        schema_editor.execute(f"LOCK TABLE {tables} IN ACCESS EXCLUSIVE MODE")
    # Check every destination before copying any row. Never merge job identities.
    for source, target in pairs:
        if target.objects.using(alias).exists():
            raise ValueError(
                f"Target {target._meta.label} is not empty; reconcile before migrating"
            )
        if {f.column: f.get_internal_type() for f in source._meta.local_fields} != {
            f.column: f.get_internal_type() for f in target._meta.local_fields
        }:
            raise ValueError(f"Persistence shape mismatch: {source._meta.label}")
    quote = schema_editor.quote_name
    for source, target in pairs:
        columns = ", ".join(quote(field.column) for field in source._meta.local_fields)
        schema_editor.execute(
            f"INSERT INTO {quote(target._meta.db_table)} ({columns}) "
            f"SELECT {columns} FROM {quote(source._meta.db_table)}"
        )
        if source.objects.using(alias).count() != target.objects.using(alias).count():
            raise ValueError(f"Persistence row count mismatch: {source._meta.label}")
    move_content_types(apps, alias, source_app, target_app)
    for source, _ in pairs:
        schema_editor.execute(f"DELETE FROM {quote(source._meta.db_table)}")
    for statement in schema_editor.connection.ops.sequence_reset_sql(
        no_style(), [target for _, target in pairs]
    ):
        schema_editor.execute(statement)
    # PostgreSQL cannot drop tables with pending deferred foreign-key events.
    schema_editor.connection.check_constraints()


def forwards(apps, schema_editor):
    move_models(apps, schema_editor, "lx_annotate", "endoreg_db")


def backwards(apps, schema_editor):
    move_models(apps, schema_editor, "endoreg_db", "lx_annotate")


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0015_move_studycohort_to_endoreg"),
        ("endoreg_db", "0097_application_persistence"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        *(migrations.DeleteModel(name=name) for name in MODEL_NAMES),
    ]
