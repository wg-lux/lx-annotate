from __future__ import annotations

from types import SimpleNamespace
import json

import pytest
from django.core.checks.registry import registry
from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings

from lx_annotate import checks as checks_module


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
            )
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
    monkeypatch, tmp_path
):
    registry_path = tmp_path / "terminology" / "registry.json"
    registry_path.parent.mkdir()
    registry_path.write_text(json.dumps({"modules": {}}), encoding="utf-8")
    monkeypatch.setenv("NGINX_PROTECTED_MEDIA_URL", "/protected_media/")
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(checks_module, "check_environment_readiness", lambda: [])

    messages = checks_module.lx_annotate_environment_checks(None)

    assert not any(
        message.id is not None and "lx_dtypes" in message.id for message in messages
    )


@override_settings(MEDIA_ROOT="/tmp/media-root", LX_DTYPES_HOST_MODELS_MODULE="")
def test_environment_checks_fail_for_missing_lx_dtypes_contract(monkeypatch, tmp_path):
    monkeypatch.delenv("LX_DTYPES_KB_REGISTRY", raising=False)
    monkeypatch.setenv("NGINX_PROTECTED_MEDIA_URL", "/protected_media/")
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(tmp_path))
    monkeypatch.setattr(checks_module, "check_environment_readiness", lambda: [])

    messages = checks_module.lx_annotate_environment_checks(None)

    assert any(
        message.id == "lx_annotate.lx_dtypes_host_models_module_missing"
        for message in messages
    )


def test_runtime_checks_are_not_registered_as_pre_migrate_system_checks():
    registered_checks = set(registry.registered_checks)

    assert checks_module.lx_annotate_endoreg_db_schema_checks not in registered_checks
    assert (
        checks_module.lx_annotate_endoreg_db_constraint_checks not in registered_checks
    )
    assert checks_module.lx_annotate_environment_checks not in registered_checks


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
            checks_module._ENDOREG_DB_REQUIRED_COLUMNS.get(table_name, ("id",))
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
            checks_module._ENDOREG_DB_REQUIRED_COLUMNS[table_name]
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
            checks_module._ENDOREG_DB_REQUIRED_CONSTRAINTS.get(table_name, ())
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
            checks_module._ENDOREG_DB_REQUIRED_COLUMNS[table_name]
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
            table_name
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
            )
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
