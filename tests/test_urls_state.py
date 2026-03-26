from __future__ import annotations

import importlib
import sys

import pytest
from django.test import override_settings
from django.urls import Resolver404, clear_url_caches, resolve, set_urlconf


def _fresh_urls_module():
    sys.modules.pop("lx_annotate.urls", None)
    return importlib.import_module("lx_annotate.urls")


def test_root_urlpatterns_state_without_base_api(monkeypatch):
    monkeypatch.delenv("LX_ENABLE_BASE_API", raising=False)
    module = _fresh_urls_module()

    top_level_patterns = [str(pattern.pattern) for pattern in module.urlpatterns]

    assert "admin/" in top_level_patterns
    assert "api/" in top_level_patterns
    assert "oidc/" in top_level_patterns
    assert "favicon.ico" in top_level_patterns
    assert "base_api/" not in top_level_patterns
    assert top_level_patterns.index("api/") < top_level_patterns.index(
        "^(?!api/|base_api/|admin/|media/|oidc/).*$"
    )


@override_settings(ROOT_URLCONF="lx_annotate.urls")
def test_vue_spa_fallback_excludes_reserved_prefixes():
    assert resolve("/dashboard/").url_name == "vue_spa"
    assert resolve("/reporting/42/report-editor").url_name == "vue_spa"

    for reserved_path in (
        "/api/not-a-real-endpoint/",
        "/oidc/not-a-real-endpoint/",
        "/base_api/not-a-real-endpoint/",
        "/media/not-a-real-endpoint/",
    ):
        with pytest.raises(Resolver404):
            resolve(reserved_path)

    admin_match = resolve("/admin/not-a-real-endpoint/")
    assert admin_match.url_name is None


@pytest.mark.parametrize(
    "spa_path",
    (
        "/anonymisierung/validierung",
        "/video-untersuchung",
        "/reporting/case-resolution",
        "/reporting/case-setup",
        "/reporting/42/findings",
        "/reporting/42/report-editor",
        "/reporting/42/frame-selector",
        "/reporting/42/finalized",
        "/einstellungen",
    ),
)
@override_settings(ROOT_URLCONF="lx_annotate.urls")
def test_reporting_workflow_paths_resolve_to_vue_spa(spa_path: str):
    assert resolve(spa_path).url_name == "vue_spa"


def test_base_api_mount_requires_explicit_enable_flag(monkeypatch):
    monkeypatch.delenv("LX_ENABLE_BASE_API", raising=False)
    module_without_flag = _fresh_urls_module()
    assert module_without_flag.lx_dtypes_api_urls is None

    monkeypatch.setenv("LX_ENABLE_BASE_API", "1")
    monkeypatch.setenv("LX_BASE_API_EXPECTED_VERSION", "999.999.999")
    module_with_bad_version = _fresh_urls_module()

    assert module_with_bad_version.lx_dtypes_api_urls is None
    assert all(
        str(pattern.pattern) != "base_api/"
        for pattern in module_with_bad_version.urlpatterns
    )

    clear_url_caches()
    set_urlconf(None)
