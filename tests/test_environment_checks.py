from __future__ import annotations

from types import SimpleNamespace

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


def test_schema_checks_skip_columns_covered_by_pending_migration(monkeypatch):
    monkeypatch.setattr(checks_module.sys, "argv", ["manage.py", "migrate"])
    monkeypatch.setattr(
        checks_module,
        "_pending_migrations_for_app",
        lambda app_label, using=checks_module.DEFAULT_DB_ALIAS: {
            "0016_rename_streamable_relative_path_videofile_raw_streamable_relative_path_and_more"
        },
    )
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

    assert not any(
        message.id == "lx_annotate.endoreg_db_schema_column_missing"
        and message.obj == "endoreg_db_videofile"
        for message in messages
    )


def test_schema_checks_fail_when_required_columns_have_no_pending_migration(monkeypatch):
    monkeypatch.setattr(checks_module.sys, "argv", ["manage.py", "migrate"])
    monkeypatch.setattr(
        checks_module,
        "_pending_migrations_for_app",
        lambda app_label, using=checks_module.DEFAULT_DB_ALIAS: set(),
    )
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


def test_schema_checks_skip_missing_table_covered_by_pending_migration(monkeypatch):
    monkeypatch.setattr(checks_module.sys, "argv", ["manage.py", "migrate"])
    monkeypatch.setattr(
        checks_module,
        "_pending_migrations_for_app",
        lambda app_label, using=checks_module.DEFAULT_DB_ALIAS: {
            "0017_auditledger_ledgerhead_and_more"
        },
    )
    monkeypatch.setattr(
        checks_module,
        "_table_columns",
        lambda table_name, using=checks_module.DEFAULT_DB_ALIAS: set()
        if table_name == "endoreg_db_auditledger"
        else {"id", "validation_comment", "storage_mode"},
    )

    messages = checks_module.lx_annotate_endoreg_db_schema_checks(None)

    assert not any(
        message.id == "lx_annotate.endoreg_db_schema_table_missing"
        and message.obj == "endoreg_db_auditledger"
        for message in messages
    )
