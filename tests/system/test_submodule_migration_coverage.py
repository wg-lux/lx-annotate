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


@pytest.mark.parametrize(
    ("override", "upstream", "previous"),
    [
        (
            "0039_hub_storage_placement",
            "0060_hub_storage_placement",
            "0038_videohlsartifact_encoding_profile_name_and_more",
        ),
        (
            "0040_storage_control_plane_hardening",
            "0061_storage_control_plane_hardening",
            "0039_hub_storage_placement",
        ),
        (
            "0041_storage_balance_work_item",
            "0062_storage_balance_work_item",
            "0040_storage_control_plane_hardening",
        ),
        (
            "0042_storage_transfer_evidence",
            "0063_storage_transfer_evidence",
            "0041_storage_balance_work_item",
        ),
        (
            "0043_bind_rotation_transfer_evidence",
            "0064_bind_rotation_transfer_evidence",
            "0042_storage_transfer_evidence",
        ),
        (
            "0044_storage_transfer_commit_and_rekey",
            "0065_storage_transfer_commit_and_rekey",
            "0043_bind_rotation_transfer_evidence",
        ),
        (
            "0045_storage_placement_media_lease_subject",
            "0066_storage_placement_media_lease_subject",
            "0044_storage_transfer_commit_and_rekey",
        ),
        (
            "0046_storage_transfer_delete_evidence",
            "0067_storage_transfer_delete_evidence",
            "0045_storage_placement_media_lease_subject",
        ),
        (
            "0047_storage_node_probe_state",
            "0068_storage_node_probe_state",
            "0046_storage_transfer_delete_evidence",
        ),
        (
            "0048_storage_balance_cancellation_receipt",
            "0069_storage_balance_cancellation_receipt",
            "0047_storage_node_probe_state",
        ),
        (
            "0049_storage_reconciliation",
            "0070_storage_reconciliation",
            "0048_storage_balance_cancellation_receipt",
        ),
        (
            "0050_storage_operator_control",
            "0071_storage_operator_control",
            "0049_storage_reconciliation",
        ),
    ],
)
def test_storage_override_chain_preserves_operations_and_rebases_dependency(
    override: str,
    upstream: str,
    previous: str,
) -> None:
    override_migration = importlib.import_module(
        f"lx_annotate.migration_overrides.endoreg_db.{override}",
    ).Migration
    upstream_migration = importlib.import_module(
        f"endoreg_db.migrations.{upstream}",
    ).Migration

    assert override_migration.operations is upstream_migration.operations
    assert ("endoreg_db", previous) in override_migration.dependencies


def test_lx_dtypes_override_tracks_pinned_video_model_and_leaf() -> None:
    module = importlib.import_module(
        "lx_annotate.migration_overrides.lx_dtypes_django.0005_videofiledjango",
    )
    create = next(
        operation
        for operation in module.Migration.operations
        if isinstance(operation, migrations.CreateModel)
    )

    assert module.Migration.dependencies == [
        ("lx_dtypes_django", "0001_initial_squashed_0004_merge_20260402_0343"),
    ]
    assert create.name == "VideoFileDjango"
    assert {name for name, _field in create.fields}.issuperset(
        {"uuid", "video_hash", "raw_file", "processed_file", "storage_mode"},
    )
    root = Path("lx_annotate/migration_overrides/lx_dtypes_django")
    assert (root / "max_migration.txt").read_text(encoding="utf-8").strip() == (
        "0005_videofiledjango"
    )


def test_non_atomic_override_migration_sets_atomic_false(monkeypatch):
    import importlib as importlib_module

    migration_cls = type("FakeMigration", (), {"atomic": True})

    monkeypatch.setattr(
        importlib_module,
        "import_module",
        lambda name: SimpleNamespace(Migration=migration_cls),
    )

    namespace = runpy.run_path(
        "lx_annotate/migration_overrides/endoreg_db/0008_imageclassificationannotation_upsert_fields.py",
    )

    assert namespace["Migration"] is migration_cls
    assert migration_cls.atomic is False


def test_import_monitoring_migration_backfills_terminal_error_codes():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0031_uploadjob_error_code_uploadjob_last_attempt_at_and_more",
    )
    updates = []

    class RecordingQuerySet:
        def __init__(self, model_name):
            self.model_name = model_name
            self.database_alias = None
            self.filters = None

        def using(self, database_alias):
            self.database_alias = database_alias
            return self

        def filter(self, **filters):
            self.filters = filters
            return self

        def update(self, **values):
            updates.append((self.model_name, self.database_alias, self.filters, values))

    models_by_name = {
        model_name: SimpleNamespace(objects=RecordingQuerySet(model_name))
        for model_name in ("UploadJob", "VideoHlsArtifact")
    }
    apps = SimpleNamespace(
        get_model=lambda app_label, model_name: models_by_name[model_name],
    )
    schema_editor = SimpleNamespace(connection=SimpleNamespace(alias="deployment"))

    module.backfill_terminal_error_codes(apps, schema_editor)

    assert updates == [
        (
            "UploadJob",
            "deployment",
            {"status": "error", "error_code": ""},
            {"error_code": "processing_failed"},
        ),
        (
            "UploadJob",
            "deployment",
            {"status": "lost", "error_code": ""},
            {"error_code": "source_missing"},
        ),
        (
            "VideoHlsArtifact",
            "deployment",
            {"status": "failed", "error_code": ""},
            {"error_code": "materialization_failed"},
        ),
    ]
    run_python_index = next(
        index
        for index, operation in enumerate(module.Migration.operations)
        if isinstance(operation, migrations.RunPython)
    )
    constraint_indexes = [
        index
        for index, operation in enumerate(module.Migration.operations)
        if isinstance(operation, migrations.AddConstraint)
    ]
    assert all(run_python_index < index for index in constraint_indexes)


def test_portal_user_center_migration_preserves_examiner_memberships():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0033_portaluserinfo_centers",
    )
    created_memberships = []

    class Membership:
        objects = SimpleNamespace(
            bulk_create=lambda memberships, ignore_conflicts: (
                created_memberships.extend(memberships)
            ),
        )

        def __init__(self, *, portaluserinfo_id, center_id):
            self.portaluserinfo_id = portaluserinfo_id
            self.center_id = center_id

    class PortalInfoQuerySet(list):
        def exclude(self, **_filters):
            return self

        def select_related(self, *_fields):
            return self

    portal_infos = PortalInfoQuerySet(
        [
            SimpleNamespace(pk=11, examiner=SimpleNamespace(center_id=101)),
            SimpleNamespace(pk=12, examiner=SimpleNamespace(center_id=102)),
        ],
    )
    portal_user_info = SimpleNamespace(
        centers=SimpleNamespace(through=Membership),
        objects=portal_infos,
    )
    apps = SimpleNamespace(get_model=lambda app_label, model_name: portal_user_info)

    module.copy_examiner_centers(apps, object())

    assert [
        (membership.portaluserinfo_id, membership.center_id)
        for membership in created_memberships
    ] == [(11, 101), (12, 102)]
    assert any(
        isinstance(operation, migrations.RunPython)
        for operation in module.Migration.operations
    )


def test_release_migration_contains_hls_generation_and_import_lease_contracts():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0035_reportimportattempt_and_more",
    )

    assert module.Migration.dependencies[0] == (
        "endoreg_db",
        "0034_case_case_id_case_patient_lab_samples_and_more",
    )
    assert any(
        isinstance(operation, migrations.CreateModel)
        and operation.name == "ReportImportAttempt"
        for operation in module.Migration.operations
    )
    assert any(
        isinstance(operation, migrations.RemoveConstraint)
        and operation.name == "unique_video_hls_artifact_kind"
        for operation in module.Migration.operations
    )
    constraint_names = {
        operation.constraint.name
        for operation in module.Migration.operations
        if isinstance(operation, migrations.AddConstraint)
    }
    assert {
        "report_attempt_lease_state_consistent",
        "unique_active_video_hls_attempt",
        "unique_ready_video_hls_artifact_kind",
        "upload_job_lease_state_consistent",
    }.issubset(constraint_names)


def test_add_field_if_missing_skips_existing_column(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0004_videofile_uuid",
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
        ),
    )
    to_state = SimpleNamespace(apps=SimpleNamespace(get_model=lambda *args: to_model))
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(
                get_table_description=lambda cursor, table_name: [
                    SimpleNamespace(name="uuid"),
                ],
            ),
        ),
    )

    operation.database_forwards("endoreg_db", schema_editor, None, to_state)

    assert calls == []


def test_add_field_if_missing_calls_super_when_column_missing(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0005_rawpdffile_uuid",
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
        ),
    )
    to_state = SimpleNamespace(apps=SimpleNamespace(get_model=lambda *args: to_model))
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(
                get_table_description=lambda cursor, table_name: [],
            ),
        ),
    )

    operation.database_forwards("endoreg_db", schema_editor, None, to_state)

    assert len(calls) == 1


def test_uuid_population_helpers_assign_missing_values(monkeypatch):
    video_module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0004_videofile_uuid",
    )
    pdf_module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0005_rawpdffile_uuid",
    )

    fixed_values = iter(["video-uuid", "pdf-uuid"])
    monkeypatch.setattr(video_module.uuid, "uuid4", lambda: next(fixed_values))
    monkeypatch.setattr(pdf_module.uuid, "uuid4", lambda: next(fixed_values))

    video_model = _FakeMigrationModel([], db_table="endoreg_db_videofile")
    raw_pdf_model = _FakeMigrationModel([], db_table="endoreg_db_rawpdffile")

    apps = SimpleNamespace(
        get_model=lambda app_label, model_name: (  # noqa: ARG005
            video_model if model_name == "VideoFile" else raw_pdf_model
        ),
    )
    video_schema_editor = _FakeUuidSchemaEditor(rows=[(10,)])
    raw_pdf_schema_editor = _FakeUuidSchemaEditor(rows=[(20,)])

    video_module.populate_videofile_uuid(apps, video_schema_editor)
    pdf_module.populate_rawpdffile_uuid(apps, raw_pdf_schema_editor)

    assert video_schema_editor.cursor.executed == [
        (
            'SELECT "id" FROM "endoreg_db_videofile" WHERE "uuid" IS NULL',
            None,
        ),
        (
            'UPDATE "endoreg_db_videofile" SET "uuid" = %s WHERE "id" = %s',
            ["video-uuid", 10],
        ),
    ]
    assert raw_pdf_schema_editor.cursor.executed == [
        (
            'SELECT "id" FROM "endoreg_db_rawpdffile" WHERE "uuid" IS NULL',
            None,
        ),
        (
            'UPDATE "endoreg_db_rawpdffile" SET "uuid" = %s WHERE "id" = %s',
            ["pdf-uuid", 20],
        ),
    ]


def test_center_key_population_handles_legacy_center_without_display_name():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0010_remove_requirementset_reqset_exam_links_and_more",
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
                ],
            ),
        ),
    )

    module.populate_missing_center_keys(apps, schema_editor)

    assert missing.center_key == "test-center-2"
    assert missing.saved_update_fields == ["center_key"]


def test_center_identity_repair_adds_display_name_and_center_key(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0010_remove_requirementset_reqset_exam_links_and_more",
    )
    calls = []

    def record_add_field_if_missing(apps, schema_editor, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(module, "add_field_if_missing", record_add_field_if_missing)

    module._repair_center_identity_columns(apps=object(), schema_editor=object())

    assert [
        (call["model_name"], call["field_name"], call["field"].__class__.__name__)
        for call in calls
    ] == [
        ("Center", "display_name", "CharField"),
        ("Center", "center_key", "CharField"),
    ]
    assert calls[0]["field"].max_length == 255
    assert calls[1]["field"].max_length == 255


@pytest.mark.parametrize(
    ("database_vendor", "cascade_clause"),
    [("sqlite", ""), ("postgresql", " CASCADE")],
)
def test_legacy_requirement_delete_model_uses_backend_compatible_if_exists_sql(
    database_vendor,
    cascade_clause,
):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0013_remove_legacy_requirement_models",
    )
    executed_sql = []
    through_model = SimpleNamespace(
        _meta=SimpleNamespace(
            auto_created=True,
            db_table="endoreg_db_requirement_finding_classifications",
        ),
    )
    model = SimpleNamespace(
        _meta=SimpleNamespace(
            db_table="endoreg_db_requirement",
            local_many_to_many=[
                SimpleNamespace(remote_field=SimpleNamespace(through=through_model)),
            ],
        ),
    )
    from_state = SimpleNamespace(
        apps=SimpleNamespace(get_model=lambda app_label, model_name: model),
    )
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(vendor=database_vendor),
        execute=executed_sql.append,
        quote_name=lambda table_name: f'"{table_name}"',
    )
    operation = module.DeleteModelIfExists(name="Requirement")

    operation.database_forwards("endoreg_db", schema_editor, from_state, None)

    assert executed_sql == [
        "DROP TABLE IF EXISTS "
        f'"endoreg_db_requirement_finding_classifications"{cascade_clause}',
        f'DROP TABLE IF EXISTS "endoreg_db_requirement"{cascade_clause}',
    ]


def test_sensitivemeta_tags_migration_creates_missing_tag_table():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0014_sensitivemeta_tags_sensitivemeta_validation_comment_and_more",
    )
    created_models = []
    tag_model = SimpleNamespace(_meta=SimpleNamespace(db_table="endoreg_db_tag"))
    apps = SimpleNamespace(get_model=lambda app_label, model_name: tag_model)
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(table_names=lambda cursor: []),
        ),
        create_model=created_models.append,
    )

    module.create_tag_table_if_missing(apps, schema_editor)

    assert created_models == [tag_model]


def test_sensitivemeta_tags_migration_keeps_existing_tag_table():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0014_sensitivemeta_tags_sensitivemeta_validation_comment_and_more",
    )
    created_models = []
    tag_model = SimpleNamespace(_meta=SimpleNamespace(db_table="endoreg_db_tag"))
    apps = SimpleNamespace(get_model=lambda app_label, model_name: tag_model)
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(
                table_names=lambda cursor: ["endoreg_db_tag"],
            ),
        ),
        create_model=created_models.append,
    )

    module.create_tag_table_if_missing(apps, schema_editor)

    assert created_models == []


def test_video_annotations_migration_creates_missing_ai_dataset_table():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0016_rename_streamable_relative_path_videofile_raw_streamable_relative_path_and_more",
    )
    created_models = []
    ai_dataset_model = SimpleNamespace(
        _meta=SimpleNamespace(db_table="endoreg_db_aidataset"),
    )
    apps = SimpleNamespace(get_model=lambda app_label, model_name: ai_dataset_model)
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(table_names=lambda cursor: []),
        ),
        create_model=created_models.append,
    )

    module.create_ai_dataset_table_if_missing(apps, schema_editor)

    assert created_models == [ai_dataset_model]


def test_video_annotations_migration_keeps_existing_ai_dataset_table():
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0016_rename_streamable_relative_path_videofile_raw_streamable_relative_path_and_more",
    )
    created_models = []
    ai_dataset_model = SimpleNamespace(
        _meta=SimpleNamespace(db_table="endoreg_db_aidataset"),
    )
    apps = SimpleNamespace(get_model=lambda app_label, model_name: ai_dataset_model)
    schema_editor = SimpleNamespace(
        connection=SimpleNamespace(
            cursor=lambda: _null_context(),
            introspection=SimpleNamespace(
                table_names=lambda cursor: ["endoreg_db_aidataset"],
            ),
        ),
        create_model=created_models.append,
    )

    module.create_ai_dataset_table_if_missing(apps, schema_editor)

    assert created_models == []


def test_ai_dataset_backfill_uses_column_scoped_queries(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0021_anonymizationfieldmetric_and_more",
    )
    settings_updates = []

    class SettingsQuery:
        def __init__(self, rows):
            self.rows = rows

        def iterator(self):
            return iter(self.rows)

    class SettingsManager:
        def values_list(self, *fields):
            assert fields == ("id", "ai_dataset_name", "ai_dataset_type")
            return SettingsQuery([(7, "Polyp Dataset", "frame")])

        def filter(self, **kwargs):
            assert kwargs == {"pk": 7}
            return self

        def update(self, **kwargs):
            settings_updates.append(kwargs)

    class DatasetQuery:
        def order_by(self, *fields):
            assert fields == ("pk",)
            return self

        def values_list(self, *fields, flat=False):
            assert fields == ("id",)
            assert flat is True
            return self

        def __getitem__(self, value):
            assert value == slice(None, 2, None)
            return [42]

    class DatasetManager:
        def filter(self, **kwargs):
            assert kwargs == {"name": "Polyp Dataset", "dataset_type": "frame"}
            return DatasetQuery()

    settings_model = SimpleNamespace(
        _meta=SimpleNamespace(
            db_table="endoreg_db_applicationsettings",
            pk=SimpleNamespace(attname="id"),
        ),
        objects=SettingsManager(),
    )
    dataset_model = SimpleNamespace(
        _meta=SimpleNamespace(
            db_table="endoreg_db_aidataset",
            pk=SimpleNamespace(attname="id"),
        ),
        objects=DatasetManager(),
    )
    apps = SimpleNamespace(
        get_model=lambda app_label, model_name: (
            settings_model if model_name == "ApplicationSettings" else dataset_model
        ),
    )
    monkeypatch.setattr(
        module,
        "get_table_columns",
        lambda schema_editor, table_name: {
            "id",
            "ai_dataset_id",
            "ai_dataset_name",
            "ai_dataset_type",
            "name",
            "dataset_type",
        },
    )

    module.backfill_ai_dataset(apps, schema_editor=object())

    assert settings_updates == [{"ai_dataset_id": 42}]


def test_report_llm_migration_repairs_videostate_constraint_columns(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0023_reportllminferencejob_and_more",
    )
    calls = []

    def record_add_field_if_missing(apps, schema_editor, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(module, "add_field_if_missing", record_add_field_if_missing)

    module.ensure_videostate_constraint_columns(apps=object(), schema_editor=object())

    assert [
        (call["model_name"], call["field_name"], call["field"].__class__.__name__)
        for call in calls
    ] == [
        ("VideoState", "processing_error", "BooleanField"),
        ("VideoState", "processing_started", "BooleanField"),
        ("VideoState", "anonymization_validated", "BooleanField"),
        ("VideoState", "segment_annotations_validated", "BooleanField"),
        ("VideoState", "outside_segments_removed", "BooleanField"),
        ("VideoState", "processed_file_sha256", "CharField"),
        ("VideoState", "ready_for_export", "BooleanField"),
        ("VideoState", "ready_for_export_at", "DateTimeField"),
        ("VideoState", "ready_for_export_by", "CharField"),
    ]
    assert calls[5]["field"].max_length == 64
    assert calls[8]["field"].max_length == 255


def test_report_llm_migration_repairs_numeric_distribution_columns(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0023_reportllminferencejob_and_more",
    )
    calls = []

    def record_add_field_if_missing(apps, schema_editor, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(module, "add_field_if_missing", record_add_field_if_missing)

    module.ensure_numeric_value_distribution_columns(
        apps=object(),
        schema_editor=object(),
    )

    assert [
        (call["model_name"], call["field_name"], call["field"].__class__.__name__)
        for call in calls
    ] == [
        ("NumericValueDistribution", "min_value", "FloatField"),
        ("NumericValueDistribution", "max_value", "FloatField"),
        ("NumericValueDistribution", "mean", "FloatField"),
        ("NumericValueDistribution", "std_dev", "FloatField"),
        ("NumericValueDistribution", "skewness", "FloatField"),
    ]
    assert all(call["field"].null is True for call in calls)


def test_report_llm_migration_repairs_auto_many_to_many_tables(monkeypatch):
    module = importlib.import_module(
        "lx_annotate.migration_overrides.endoreg_db.0023_reportllminferencejob_and_more",
    )
    calls = []

    def record_create_many_to_many_table_if_missing(apps, schema_editor, **kwargs):
        calls.append(kwargs)

    monkeypatch.setattr(
        module,
        "create_many_to_many_table_if_missing",
        record_create_many_to_many_table_if_missing,
    )

    auto_through = SimpleNamespace(_meta=SimpleNamespace(auto_created=True))
    explicit_through = SimpleNamespace(_meta=SimpleNamespace(auto_created=False))
    fake_apps = SimpleNamespace(
        get_models=lambda: [
            SimpleNamespace(
                _meta=SimpleNamespace(
                    app_label="endoreg_db",
                    object_name="Finding",
                    local_many_to_many=[
                        SimpleNamespace(
                            name="finding_classifications",
                            remote_field=SimpleNamespace(through=auto_through),
                        ),
                        SimpleNamespace(
                            name="manual_links",
                            remote_field=SimpleNamespace(through=explicit_through),
                        ),
                    ],
                ),
            ),
            SimpleNamespace(
                _meta=SimpleNamespace(
                    app_label="endoreg_db",
                    object_name="FindingClassification",
                    local_many_to_many=[
                        SimpleNamespace(
                            name="choices",
                            remote_field=SimpleNamespace(through=auto_through),
                        ),
                    ],
                ),
            ),
        ],
    )

    module.ensure_auto_many_to_many_tables(apps=fake_apps, schema_editor=object())

    assert [
        (call["app_label"], call["model_name"], call["field_name"]) for call in calls
    ] == [
        ("endoreg_db", "Finding", "finding_classifications"),
        ("endoreg_db", "FindingClassification", "choices"),
    ]


class _null_context:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeUuidCursor:
    def __init__(self, rows):
        self.rows = rows
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchall(self):
        return self.rows


class _FakeUuidSchemaEditor:
    def __init__(self, rows):
        self.cursor = _FakeUuidCursor(rows)
        self.connection = SimpleNamespace(cursor=lambda: self.cursor)

    def quote_name(self, name):
        return f'"{name}"'


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
    def __init__(self, rows, db_table="fake_table"):
        self.objects = _FakeMigrationManager(rows)
        self._meta = SimpleNamespace(
            db_table=db_table,
            pk=SimpleNamespace(attname="id", column="id"),
            get_field=lambda field_name: SimpleNamespace(column=field_name),
        )


class _FakeCenterRecord:
    def __init__(self, name, center_key=""):
        self.name = name
        self.center_key = center_key
        self.saved_update_fields = None

    def save(self, update_fields):
        self.saved_update_fields = update_fields


# pyright: reportAttributeAccessIssue=false
