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


def test_read_project_version_and_contract_exports(tmp_path):
    from lx_annotate import urls

    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text("[project]\nversion='1.2.3'\n", encoding="utf-8")
    assert urls._read_project_version(pyproject) == "1.2.3"
    assert urls._read_project_version(tmp_path / "missing.toml") is None

    submodule_root = tmp_path / "lx-data-models"
    contracts_dir = submodule_root / "lx_dtypes" / "models" / "contracts"
    contracts_dir.mkdir(parents=True)
    contracts_init = contracts_dir / "__init__.py"

    contracts_init.write_text("PdfRedactionRequest\n", encoding="utf-8")
    assert urls._has_required_base_api_contracts(submodule_root) is False

    contracts_init.write_text(
        "\n".join(urls.REQUIRED_BASE_API_CONTRACT_EXPORTS), encoding="utf-8"
    )
    assert urls._has_required_base_api_contracts(submodule_root) is True


def test_resolve_lx_data_models_root_prefers_env(monkeypatch, settings, tmp_path):
    from lx_annotate import urls

    env_root = tmp_path / "nix-provided-lx-data-models"
    monkeypatch.setenv("LX_DATA_MODELS_ROOT", str(env_root))
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path / "ignored-base-dir")

    assert urls._resolve_lx_data_models_root() == env_root.resolve()


def test_urls_import_mounts_base_api_when_submodule_contracts_match(
    monkeypatch, settings, tmp_path
):
    submodule_root = tmp_path / "lx-data-models"
    contracts_dir = submodule_root / "lx_dtypes" / "models" / "contracts"
    contracts_dir.mkdir(parents=True)
    (submodule_root / "pyproject.toml").write_text(
        "[project]\nversion='0.1.1'\n", encoding="utf-8"
    )
    (contracts_dir / "__init__.py").write_text(
        "\n".join(
            [
                "PdfRedactionRequest = object()",
                "PdfRedactionResponse = object()",
                "CaseResolutionRequest = object()",
                "CaseResolutionResponse = object()",
                "RequirementEvaluationRequest = object()",
                "RequirementEvaluationResponse = object()",
                "DocumentType = object()",
                "ReportContext = object()",
            ]
        ),
        encoding="utf-8",
    )

    fake_api = SimpleNamespace(urls=("base-api-patterns", "base-api-app", "base-api"))
    monkeypatch.setenv("LX_BASE_API_EXPECTED_VERSION", "0.1.1")
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    monkeypatch.setitem(
        sys.modules,
        "lx_dtypes.django.api.main",
        SimpleNamespace(api=fake_api),
    )

    module = _fresh_import("lx_annotate.urls")

    assert module.lx_dtypes_api_urls == fake_api.urls
    assert str(submodule_root) in sys.path
    assert any(
        getattr(pattern, "pattern", None) and str(pattern.pattern) == "base_api/"
        for pattern in module.urlpatterns
    )


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
        (
            "0013_remove_legacy_requirement_models.py",
            "endoreg_db.migrations.0013_remove_legacy_requirement_models",
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

    def iterator(self):
        return iter(self.rows)


class _FakeMigrationManager:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, **kwargs):  # noqa: ARG002
        return _FakeMigrationQuerySet(self.rows)


class _FakeMigrationModel:
    def __init__(self, rows):
        self.objects = _FakeMigrationManager(rows)
