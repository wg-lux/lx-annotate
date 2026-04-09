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
