from __future__ import annotations

import importlib
import runpy
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from django.db import migrations, models


def _fresh_import(module_name: str):
    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


@pytest.mark.parametrize(
    ("filename", "target"),
    [
        ("0001_initial.py", "endoreg_db.migrations.0001_initial"),
        ("0002_export_flags.py", "endoreg_db.migrations.0002_export_flags"),
        (
            "0003_patientexaminationreport_report_and_more.py",
            "endoreg_db.migrations.0003_patientexaminationreport_report_and_more",
        ),
        (
            "0006_applicationsettings.py",
            "endoreg_db.migrations.0006_applicationsettings",
        ),
        (
            "0007_pdfprocessinghistory.py",
            "endoreg_db.migrations.0007_pdfprocessinghistory",
        ),
        (
            "0012_networknode_transferjob.py",
            "endoreg_db.migrations.0012_networknode_transferjob",
        ),
    ],
)
def test_proxy_migration_modules_delegate_to_upstream(monkeypatch, filename, target):
    import importlib as importlib_module

    sentinel_migration = object()
    seen = []

    def fake_import_module(name):
        seen.append(name)
        return SimpleNamespace(Migration=sentinel_migration)

    monkeypatch.setattr(importlib_module, "import_module", fake_import_module)

    path = Path("lx_annotate/migration_overrides/endoreg_db") / filename
    namespace = runpy.run_path(str(path))

    assert namespace["Migration"] is sentinel_migration
    assert seen == [target]


def test_non_atomic_override_migration_sets_atomic_false(monkeypatch):
    import importlib as importlib_module

    migration_cls = type("FakeMigration", (), {"atomic": True})

    monkeypatch.setattr(
        importlib_module,
        "import_module",
        lambda name: SimpleNamespace(Migration=migration_cls),
    )

    namespace = runpy.run_path(
        "lx_annotate/migration_overrides/endoreg_db/0008_imageclassificationannotation_upsert_fields.py"
    )

    assert namespace["Migration"] is migration_cls
    assert migration_cls.atomic is False


def test_add_field_if_missing_skips_existing_column(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0004_videofile_uuid"
    )
    calls = []

    monkeypatch.setattr(
        migrations.AddField,
        "database_forwards",
        lambda *args, **kwargs: calls.append((args, kwargs)),
    )

    operation = module.AddFieldIfMissing(
        model_name="videofile",
        name="uuid",
        field=models.UUIDField(null=True, editable=False),
    )
    to_model = SimpleNamespace(
        _meta=SimpleNamespace(
            db_table="video_table",
            get_field=lambda _name: SimpleNamespace(column="uuid"),
        )
    )
    to_state = SimpleNamespace(apps=SimpleNamespace(get_model=lambda *args: to_model))
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(
                get_table_description=lambda cursor, table_name: [
                    SimpleNamespace(name="uuid")
                ]
            ),
        )
    )

    operation.database_forwards("endoreg_db", schema_editor, None, to_state)

    assert calls == []


def test_add_field_if_missing_calls_super_when_column_missing(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0005_rawpdffile_uuid"
    )
    calls = []

    monkeypatch.setattr(
        migrations.AddField,
        "database_forwards",
        lambda *args, **kwargs: calls.append((args, kwargs)),
    )

    operation = module.AddFieldIfMissing(
        model_name="rawpdffile",
        name="uuid",
        field=models.UUIDField(null=True, editable=False),
    )
    to_model = SimpleNamespace(
        _meta=SimpleNamespace(
            db_table="raw_pdf_table",
            get_field=lambda _name: SimpleNamespace(column="uuid"),
        )
    )
    to_state = SimpleNamespace(apps=SimpleNamespace(get_model=lambda *args: to_model))
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(
                get_table_description=lambda cursor, table_name: []
            ),
        )
    )

    operation.database_forwards("endoreg_db", schema_editor, None, to_state)

    assert len(calls) == 1


def test_uuid_population_helpers_assign_missing_values(monkeypatch):
    video_module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0004_videofile_uuid"
    )
    pdf_module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0005_rawpdffile_uuid"
    )

    fixed_values = iter(["video-uuid", "pdf-uuid"])
    monkeypatch.setattr(video_module.uuid, "uuid4", lambda: next(fixed_values))
    monkeypatch.setattr(pdf_module.uuid, "uuid4", lambda: next(fixed_values))

    video = _FakeMigrationRecord()
    raw_pdf = _FakeMigrationRecord()

    apps = SimpleNamespace(
        get_model=lambda app_label, model_name: _FakeMigrationModel(  # noqa: ARG005
            [video] if model_name == "VideoFile" else [raw_pdf]
        )
    )

    video_module.populate_videofile_uuid(apps, schema_editor=None)
    pdf_module.populate_rawpdffile_uuid(apps, schema_editor=None)

    assert video.uuid == "video-uuid"
    assert raw_pdf.uuid == "pdf-uuid"
    assert video.saved_update_fields == ["uuid"]
    assert raw_pdf.saved_update_fields == ["uuid"]


def test_center_key_population_handles_legacy_center_without_display_name():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0010_remove_requirementset_reqset_exam_links_and_more"
    )

    existing = _FakeCenterRecord(name="Test Center", center_key="test-center")
    missing = _FakeCenterRecord(name="Test Center")
    center_model = _FakeMigrationModel([existing, missing])
    center_model._meta = SimpleNamespace(db_table="center_table")
    apps = SimpleNamespace(get_model=lambda *args: center_model)
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(
                get_table_description=lambda cursor, table_name: [
                    SimpleNamespace(name="id"),
                    SimpleNamespace(name="name"),
                    SimpleNamespace(name="center_key"),
                ]
            ),
        )
    )

    module.populate_missing_center_keys(apps, schema_editor)

    assert missing.center_key == "test-center-2"
    assert missing.saved_update_fields == ["center_key"]


def test_legacy_requirement_delete_model_uses_if_exists_sql():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0013_remove_legacy_requirement_models"
    )
    executed_sql = []
    through_model = SimpleNamespace(
        _meta=SimpleNamespace(
            auto_created=True,
            db_table="endoreg_db_requirement_finding_classifications",
        )
    )
    model = SimpleNamespace(
        _meta=SimpleNamespace(
            db_table="endoreg_db_requirement",
            local_many_to_many=[
                SimpleNamespace(remote_field=SimpleNamespace(through=through_model))
            ],
        )
    )
    from_state = SimpleNamespace(
        apps=SimpleNamespace(get_model=lambda app_label, model_name: model)
    )
    schema_editor = SimpleNamespace(
        execute=executed_sql.append,
        quote_name=lambda table_name: f'"{table_name}"',
    )
    operation = module.DeleteModelIfExists(name="Requirement")

    operation.database_forwards("endoreg_db", schema_editor, from_state, None)

    assert executed_sql == [
        'DROP TABLE IF EXISTS "endoreg_db_requirement_finding_classifications" CASCADE',
        'DROP TABLE IF EXISTS "endoreg_db_requirement" CASCADE',
    ]


class _null_context:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeMigrationRecord:
    def __init__(self):
        self.uuid = None
        self.saved_update_fields = None

    def save(self, update_fields):
        self.saved_update_fields = update_fields


class _FakeMigrationQuerySet:
    def __init__(self, rows):
        self.rows = rows
        self.only_fields = None

    def iterator(self):
        return iter(self.rows)

    def only(self, *fields):
        self.only_fields = fields
        return self

    def order_by(self, *fields):  # noqa: ARG002
        return self


class _FakeMigrationManager:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, **kwargs):  # noqa: ARG002
        return _FakeMigrationQuerySet(self.rows)

    def all(self):
        return _FakeMigrationQuerySet(self.rows)


class _FakeMigrationModel:
    def __init__(self, rows):
        self.objects = _FakeMigrationManager(rows)


class _FakeCenterRecord:
    def __init__(self, name, center_key=""):
        self.name = name
        self.center_key = center_key
        self.saved_update_fields = None

    def save(self, update_fields):
        self.saved_update_fields = update_fields
