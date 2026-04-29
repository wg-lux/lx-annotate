from __future__ import annotations

from types import SimpleNamespace

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


def test_runtime_checks_are_not_registered_as_pre_migrate_system_checks():
    registered_checks = set(registry.registered_checks)

    assert checks_module.lx_annotate_endoreg_db_schema_checks not in registered_checks
    assert checks_module.lx_annotate_environment_checks not in registered_checks


def test_schema_checks_fail_when_required_columns_are_missing(monkeypatch):
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: {
            "id",
            "storage_mode",
            "processed_streamable_relative_path",
        }
        if table_name == "endoreg_db_videofile"
        else {"id", "validation_comment"},
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
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: set()
        if table_name == "endoreg_db_auditledger"
        else {"id", "validation_comment", "storage_mode"},
    )

    messages = checks_module.lx_annotate_endoreg_db_schema_checks(None)

    assert any(
        message.id == "lx_annotate.endoreg_db_schema_table_missing"
        and message.obj == "endoreg_db_auditledger"
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

    with pytest.raises(ImproperlyConfigured, match="schema drift"):
        checks_module.assert_runtime_checks_pass()
