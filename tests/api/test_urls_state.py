from __future__ import annotations

import importlib
import sys

import pytest
from django.test import Client, override_settings
from django.urls import Resolver404, clear_url_caches, resolve, set_urlconf
from ninja.main import NinjaAPI


def _fresh_urls_module(monkeypatch=None):
    sys.modules.pop("lx_annotate.urls", None)
    sys.modules.pop("lx_annotate.api_urls", None)
    sys.modules.pop("lx_annotate.dtypes_api_urls", None)
    sys.modules.pop("lx_dtypes.django.api.main", None)
    sys.modules.pop("lx_dtypes.django.api.report_template_builder", None)
    NinjaAPI._registry = []

    clear_url_caches()
    set_urlconf(None)
    return importlib.import_module("lx_annotate.urls")


def test_root_urlpatterns_expose_only_canonical_dtypes_api(monkeypatch):
    module = _fresh_urls_module(monkeypatch)

    top_level_patterns = [str(pattern.pattern) for pattern in module.urlpatterns]

    assert "admin/" in top_level_patterns
    assert "endoreg-api/" in top_level_patterns
    assert "api/" in top_level_patterns
    assert "oidc/" in top_level_patterns
    assert "favicon.ico" in top_level_patterns
    assert "dtypes-api/" in top_level_patterns
    assert "base_api/" not in top_level_patterns
    assert top_level_patterns.index("endoreg-api/") < top_level_patterns.index(
        "^(?!endoreg-api/|api/|dtypes-api/|base_api/|admin/|media/|oidc/).*$"
    )


@override_settings(ROOT_URLCONF="lx_annotate.urls")
def test_spa_resolution_does_not_import_api_url_modules(monkeypatch):
    lazy_modules = (
        "lx_annotate.api_urls",
        "lx_annotate.dtypes_api_urls",
        "endoreg_db.urls",
        "endoreg_db.urls.settings",
        "endoreg_db.views.misc.application_settings",
        "endoreg_db.utils.ai.model_training.config",
    )
    for module_name in lazy_modules:
        sys.modules.pop(module_name, None)

    _fresh_urls_module(monkeypatch)
    clear_url_caches()
    set_urlconf("lx_annotate.urls")

    assert resolve("/anonymisierung/uebersicht").url_name == "vue_spa"

    for module_name in lazy_modules:
        assert module_name not in sys.modules


@override_settings(ROOT_URLCONF="lx_annotate.urls")
def test_vue_spa_fallback_excludes_reserved_prefixes():
    assert resolve("/dashboard/").url_name == "vue_spa"
    assert resolve("/reporting/42/report-editor").url_name == "vue_spa"

    for reserved_path in (
        "/endoreg-api/not-a-real-endpoint/",
        "/api/not-a-real-endpoint/",
        "/dtypes-api/not-a-real-endpoint/",
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


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
def test_canonical_api_urls_are_reachable_and_base_api_is_removed(
    monkeypatch, tmp_path
):
    from tests.api.test_base_api_mount import _reload_urls_with_dtypes_api

    _reload_urls_with_dtypes_api(monkeypatch, tmp_path)
    clear_url_caches()
    set_urlconf("lx_annotate.urls")
    client = Client()

    dtypes_api_response = client.get(
        "/dtypes-api/core-concepts/report_template_examples",
        secure=True,
    )
    base_api_response = client.get("/base_api/not-supported", secure=True)
    endoreg_api_response = client.get("/endoreg-api/conf/", secure=True)
    api_response = client.get("/api/conf/", secure=True)

    assert dtypes_api_response.status_code != 404
    assert base_api_response.status_code == 404
    assert endoreg_api_response.status_code != 404
    assert api_response.status_code != 404
