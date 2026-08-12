from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from django.core.checks import CRITICAL, WARNING
from django.core.checks.registry import registry
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
from lx_dtypes.models.interface.KnowledgeBaseResolver import (
    clear_knowledge_base_resolver_caches,
)

from lx_annotate import checks as checks_module
from lx_annotate import migration_history_safety as history_safety


@override_settings(MEDIA_ROOT="/tmp/media-root")
def test_environment_checks_report_missing_nginx_contract(monkeypatch):
    monkeypatch.delenv("NGINX_PROTECTED_MEDIA_URL", raising=False)
    monkeypatch.delenv("PROTECTED_MEDIA_ROOT", raising=False)
    monkeypatch.setattr(checks_module, "check_environment_readiness", lambda: [])

    messages = checks_module.lx_annotate_environment_checks(None)

    assert any(
        message.id == "lx_annotate.nginx_protected_media_url_missing"
        for message in messages
    )
    assert any(
        message.id == "lx_annotate.protected_media_root_missing" for message in messages
    )


@override_settings(MEDIA_ROOT="/tmp/media-root")
def test_environment_checks_surface_core_readiness_issues(monkeypatch, tmp_path):
    monkeypatch.setenv("NGINX_PROTECTED_MEDIA_URL", "/protected_media/")
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(
        checks_module,
        "check_environment_readiness",
        lambda: [
            SimpleNamespace(
                severity="critical",
                code="storage_root_missing",
                message="Storage root missing",
                path="/missing",
            ),
        ],
    )

    messages = checks_module.lx_annotate_environment_checks(None)

    assert any(message.id == "lx_annotate.storage_root_missing" for message in messages)


@override_settings(MEDIA_ROOT="/tmp/media-root")
def test_environment_checks_require_native_hls_state_machine(monkeypatch, tmp_path):
    monkeypatch.setenv("NGINX_PROTECTED_MEDIA_URL", "/protected_media/")
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(checks_module, "check_environment_readiness", lambda: [])
    monkeypatch.setattr(checks_module, "has_native_capability", lambda *_args: False)

    messages = checks_module.lx_annotate_environment_checks(None)

    assert any(
        message.id == "lx_annotate.hls_native_state_machine_missing"
        for message in messages
    )


@override_settings(
    MEDIA_ROOT="/tmp/media-root",
    LX_DTYPES_HOST_MODELS_MODULE="endoreg_db.integrations.lx_dtypes_host_models",
)
def test_environment_checks_accept_valid_lx_dtypes_runtime_contract(
    monkeypatch,
    tmp_path,
):
    kb_root = tmp_path / "knowledge-bases"
    module_dir = kb_root / "verified_reporting"
    module_dir.mkdir(parents=True)
    (module_dir / "config.yaml").write_text(
        "\n".join(
            [
                "name: verified_reporting",
                "description: Verified test bundle",
                "version: 2026.07.31",
                "modules: []",
                "depends_on: []",
                "data:",
                "  dirs: []",
            ],
        )
        + "\n",
        encoding="utf-8",
    )
    registry_path = tmp_path / "terminology" / "registry.json"
    registry_path.parent.mkdir()
    registry_path.write_text(
        json.dumps(
            {
                "active": {
                    "module_name": "verified_reporting",
                    "version": "2026.07.31",
                },
                "modules": {
                    "verified_reporting": {
                        "2026.07.31": {"input_dirs": [str(kb_root)]},
                    },
                },
            },
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("LX_DTYPES_KB_REGISTRY", str(registry_path))
    monkeypatch.setenv("NGINX_PROTECTED_MEDIA_URL", "/protected_media/")
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(checks_module, "check_environment_readiness", lambda: [])
    clear_knowledge_base_resolver_caches()

    messages = checks_module.lx_annotate_environment_checks(None)

    assert not any(
        message.id is not None and "lx_dtypes" in message.id for message in messages
    )


@override_settings(MEDIA_ROOT="/tmp/media-root", LX_DTYPES_HOST_MODELS_MODULE="")
def test_environment_checks_warn_for_missing_lx_dtypes_contract(monkeypatch, tmp_path):
    monkeypatch.delenv("LX_DTYPES_KB_REGISTRY", raising=False)
    monkeypatch.setenv("NGINX_PROTECTED_MEDIA_URL", "/protected_media/")
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(checks_module, "check_environment_readiness", lambda: [])

    messages = checks_module.lx_annotate_environment_checks(None)

    assert any(
        message.id == "lx_annotate.lx_dtypes_host_models_module_missing"
        for message in messages
    )
    registry_message = next(
        message
        for message in messages
        if message.id == "lx_annotate.lx_dtypes_kb_registry_missing"
    )
    assert registry_message.level == WARNING


def test_only_migration_history_is_registered_as_a_pre_migrate_system_check():
    registered_checks = set(registry.registered_checks)

    assert checks_module.lx_annotate_endoreg_db_schema_checks not in registered_checks
    assert (
        checks_module.lx_annotate_endoreg_db_constraint_checks not in registered_checks
    )
    assert checks_module.lx_annotate_environment_checks not in registered_checks
    assert checks_module.lx_annotate_migration_history_checks in registered_checks


def _migration_contracts(monkeypatch):
    contract = history_safety.MigrationHistoryContract(
        app_label="example",
        distribution="example",
        legacy_names=frozenset({"0001_initial", "0002_legacy"}),
        canonical_module="canonical.migrations",
        canonical_leaf="0003_canonical",
        canonical_manifest_sha256="canonical",
    )
    canonical = history_safety.MigrationManifest(
        frozenset({"0001_initial", "0002_canonical", "0003_canonical"}),
        "canonical",
    )
    monkeypatch.setattr(checks_module, "CONTRACTS", (contract,))
    monkeypatch.setattr(
        checks_module,
        "verify_canonical_contract_manifests",
        lambda _contracts: {"example": canonical},
    )
    monkeypatch.setattr(
        checks_module,
        "_application_table_names",
        lambda _app_label: {"example_record"},
    )
    return contract, canonical


def test_pre_migrate_history_check_skips_commands_without_database_scope(
    monkeypatch,
):
    monkeypatch.setattr(
        checks_module,
        "_migration_history_introspection",
        lambda **_kwargs: pytest.fail("unrelated command opened the database"),
    )

    assert checks_module.lx_annotate_migration_history_checks(None) == []


@override_settings(MIGRATION_MODULES={"example": "retired.migrations"})
def test_pre_migrate_history_check_rejects_retired_dependency_mapping(monkeypatch):
    _migration_contracts(monkeypatch)

    messages = checks_module.lx_annotate_migration_history_checks(
        None,
        databases=["default"],
    )

    assert len(messages) == 1
    assert messages[0].level >= CRITICAL
    assert "retired dependency migration mapping" in messages[0].msg


@override_settings(MIGRATION_MODULES={})
def test_pre_migrate_history_check_allows_fresh_release_b_database(monkeypatch):
    _migration_contracts(monkeypatch)
    monkeypatch.setattr(
        checks_module,
        "_migration_history_introspection",
        lambda **_kwargs: (set(), set()),
    )

    assert (
        checks_module.lx_annotate_migration_history_checks(None, databases=["default"])
        == []
    )


@override_settings(MIGRATION_MODULES={})
def test_pre_migrate_history_check_allows_converged_release_b_database(monkeypatch):
    contract, canonical = _migration_contracts(monkeypatch)
    applied = {
        (contract.app_label, name) for name in contract.legacy_names | canonical.names
    }
    monkeypatch.setattr(
        checks_module,
        "_migration_history_introspection",
        lambda **_kwargs: (applied, {"example_record"}),
    )

    assert (
        checks_module.lx_annotate_migration_history_checks(None, databases=["default"])
        == []
    )


@override_settings(MIGRATION_MODULES={})
def test_pre_migrate_history_check_allows_canonical_migration_resume(monkeypatch):
    _contract, _canonical = _migration_contracts(monkeypatch)
    monkeypatch.setattr(
        checks_module,
        "_migration_history_introspection",
        lambda **_kwargs: (
            {("example", "0001_initial"), ("example", "0002_canonical")},
            {"example_record"},
        ),
    )

    assert (
        checks_module.lx_annotate_migration_history_checks(
            None,
            databases=["default"],
        )
        == []
    )


@override_settings(MIGRATION_MODULES={})
def test_pre_migrate_history_check_rejects_unconverged_release_b_database(
    monkeypatch,
):
    contract, _canonical = _migration_contracts(monkeypatch)
    applied = {(contract.app_label, name) for name in contract.legacy_names}
    monkeypatch.setattr(
        checks_module,
        "_migration_history_introspection",
        lambda **_kwargs: (applied, {"example_record"}),
    )

    messages = checks_module.lx_annotate_migration_history_checks(
        None,
        databases=["default"],
    )

    assert len(messages) == 1
    assert messages[0].level >= CRITICAL
    assert messages[0].id == "lx_annotate.migration_history_unsafe"
    assert "Redeploy the bridge release" in messages[0].msg


@override_settings(MIGRATION_MODULES={})
def test_pre_migrate_history_check_rejects_partial_bridge_history(monkeypatch):
    contract, _canonical = _migration_contracts(monkeypatch)
    applied = {
        *((contract.app_label, name) for name in contract.legacy_names),
        (contract.app_label, "0002_canonical"),
    }
    monkeypatch.setattr(
        checks_module,
        "_migration_history_introspection",
        lambda **_kwargs: (applied, {"example_record"}),
    )

    messages = checks_module.lx_annotate_migration_history_checks(
        None,
        databases=["default"],
    )

    assert len(messages) == 1
    assert messages[0].level >= CRITICAL
    assert "missing reviewed identities" in messages[0].msg


def test_schema_checks_fail_when_required_columns_are_missing(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: (
            {
                "id",
                "storage_mode",
                "processed_streamable_relative_path",
            }
            if table_name == "endoreg_db_videofile"
            else {"id", "validation_comment"}
        ),
    )

    messages = checks_module.lx_annotate_endoreg_db_schema_checks(None)

    assert any(
        message.id == "lx_annotate.endoreg_db_schema_column_missing"
        and message.obj == "endoreg_db_videofile"
        and "raw_streamable_relative_path" in message.msg
        for message in messages
    )


def test_schema_checks_fail_when_required_tables_are_missing(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: (
            set()
            if table_name == "endoreg_db_auditledger"
            else {"id", "validation_comment", "storage_mode"}
        ),
    )

    messages = checks_module.lx_annotate_endoreg_db_schema_checks(None)

    assert any(
        message.id == "lx_annotate.endoreg_db_schema_table_missing"
        and message.obj == "endoreg_db_auditledger"
        for message in messages
    )


def test_schema_checks_require_release_0_9_53_columns_and_receipt_table(monkeypatch):
    def table_columns(table_name, using=checks_module.DEFAULT_DB_ALIAS):
        if table_name == "endoreg_db_medicalledgerwritereceipt":
            return set()
        required = set(
            checks_module._ENDOREG_DB_REQUIRED_COLUMNS.get(table_name, ("id",)),
        )
        if table_name == "endoreg_db_videohlsartifact":
            required.remove("encoding_profile_name")
        return required

    monkeypatch.setattr(checks_module, "_table_columns", table_columns)

    messages = checks_module.lx_annotate_endoreg_db_schema_checks(None)

    assert any(
        message.id == "lx_annotate.endoreg_db_schema_column_missing"
        and message.obj == "endoreg_db_videohlsartifact"
        and "encoding_profile_name" in message.msg
        for message in messages
    )
    assert any(
        message.id == "lx_annotate.endoreg_db_schema_table_missing"
        and message.obj == "endoreg_db_medicalledgerwritereceipt"
        for message in messages
    )


def test_schema_checks_fail_closed_when_schema_cannot_be_introspected(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: None,
    )

    messages = checks_module.lx_annotate_endoreg_db_schema_checks(None)

    assert any(
        message.id == "lx_annotate.endoreg_db_schema_introspection_failed"
        for message in messages
    )


def test_constraint_checks_report_existing_violations(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: set(
            checks_module._ENDOREG_DB_REQUIRED_COLUMNS[table_name],
        ),
    )
    monkeypatch.setattr(
        checks_module,
        "_count_constraint_violations",
        lambda table_name, predicate_sql, parameters: (
            2
            if table_name == "endoreg_db_uploadjob" and "status IN" in predicate_sql
            else 0
        ),
    )
    monkeypatch.setattr(
        checks_module,
        "_table_constraint_names",
        lambda table_name: set(
            checks_module._ENDOREG_DB_REQUIRED_CONSTRAINTS.get(table_name, ()),
        ),
    )

    messages = checks_module.lx_annotate_endoreg_db_constraint_checks(None)

    assert len(messages) == 1
    assert messages[0].id == "lx_annotate.endoreg_db_constraint_violated"
    assert messages[0].obj == "upload_job_terminal_error_coded"
    assert "2 existing row(s)" in messages[0].msg


def test_constraint_checks_report_missing_generation_constraints(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: (
            set(checks_module._ENDOREG_DB_REQUIRED_COLUMNS[table_name])
            if table_name == "endoreg_db_videohlsartifact"
            else set(checks_module._ENDOREG_DB_REQUIRED_COLUMNS[table_name])
        ),
    )
    monkeypatch.setattr(
        checks_module,
        "_table_constraint_names",
        lambda table_name: (
            {"video_hls_failure_coded"}
            if table_name == "endoreg_db_videohlsartifact"
            else set(checks_module._ENDOREG_DB_REQUIRED_CONSTRAINTS[table_name])
        ),
    )
    monkeypatch.setattr(
        checks_module,
        "_count_constraint_violations",
        lambda table_name, predicate_sql, parameters: 0,
    )

    messages = checks_module.lx_annotate_endoreg_db_constraint_checks(None)

    assert any(
        message.id == "lx_annotate.endoreg_db_schema_constraint_missing"
        and message.obj == "endoreg_db_videohlsartifact"
        and "unique_active_video_hls_attempt" in message.msg
        and "unique_ready_video_hls_artifact_kind" in message.msg
        for message in messages
    )


def test_constraint_checks_require_medical_ledger_receipt_integrity(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: set(
            checks_module._ENDOREG_DB_REQUIRED_COLUMNS[table_name],
        ),
    )
    monkeypatch.setattr(
        checks_module,
        "_table_constraint_names",
        lambda table_name: (
            set()
            if table_name == "endoreg_db_medicalledgerwritereceipt"
            else set(checks_module._ENDOREG_DB_REQUIRED_CONSTRAINTS[table_name])
        ),
    )
    monkeypatch.setattr(
        checks_module,
        "_count_constraint_violations",
        lambda table_name, predicate_sql, parameters: 0,
    )

    messages = checks_module.lx_annotate_endoreg_db_constraint_checks(None)

    assert any(
        message.id == "lx_annotate.endoreg_db_schema_constraint_missing"
        and message.obj == "endoreg_db_medicalledgerwritereceipt"
        and "medled_receipt_patient_key_uq" in message.msg
        and "medled_receipt_key_nonempty" in message.msg
        and "medled_receipt_hash_nonempty" in message.msg
        for message in messages
    )


def test_constraint_checks_skip_queries_until_required_columns_exist(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: {"id"},
    )
    queried_constraints = []
    monkeypatch.setattr(
        checks_module,
        "_count_constraint_violations",
        lambda table_name, predicate_sql, parameters: queried_constraints.append(
            table_name,
        ),
    )
    monkeypatch.setattr(
        checks_module,
        "_table_constraint_names",
        lambda table_name: set(),
    )

    messages = checks_module.lx_annotate_endoreg_db_constraint_checks(None)

    assert messages == []
    assert queried_constraints == []


def test_assert_runtime_checks_pass_fails_closed_on_critical_messages(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "lx_annotate_endoreg_db_schema_checks",
        lambda app_configs: [
            checks_module.Critical(
                "schema drift",
                id="lx_annotate.endoreg_db_schema_column_missing",
            ),
        ],
    )
    monkeypatch.setattr(
        checks_module,
        "lx_annotate_environment_checks",
        lambda app_configs: [],
    )
    monkeypatch.setattr(
        checks_module,
        "lx_annotate_endoreg_db_constraint_checks",
        lambda app_configs: [],
    )

    with pytest.raises(ImproperlyConfigured, match="schema drift"):
        checks_module.assert_runtime_checks_pass()
