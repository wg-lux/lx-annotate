from __future__ import annotations

import importlib
import sys

import pytest
from django.test import Client, override_settings
from django.urls import Resolver404, clear_url_caches, resolve, set_urlconf
from ninja.main import NinjaAPI


LX_DATA_MODELS_ROOT = "/home/admin/dev/lx-annotate/lx-data-models"


def _fresh_urls_module(monkeypatch=None):
    if monkeypatch is not None:
        monkeypatch.setenv("LX_BASE_API_EXPECTED_VERSION", "0.1.1")
        monkeypatch.setenv("LX_DATA_MODELS_ROOT", LX_DATA_MODELS_ROOT)

    sys.modules.pop("lx_annotate.urls", None)
    sys.modules.pop("lx_dtypes.django.api.main", None)
    sys.modules.pop("lx_dtypes.django.api.report_template_builder", None)
    NinjaAPI._registry = []

    clear_url_caches()
    set_urlconf(None)
    return importlib.import_module("lx_annotate.urls")


def test_root_urlpatterns_state_with_base_api(monkeypatch):
    module = _fresh_urls_module(monkeypatch)

    top_level_patterns = [str(pattern.pattern) for pattern in module.urlpatterns]

    assert "admin/" in top_level_patterns
    assert "api/" in top_level_patterns
    assert "oidc/" in top_level_patterns
    assert "favicon.ico" in top_level_patterns
    assert "base_api/" in top_level_patterns
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


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
def test_api_and_base_api_urls_are_both_reachable(monkeypatch):
    _fresh_urls_module(monkeypatch)
    clear_url_caches()
    set_urlconf("lx_annotate.urls")
    client = Client()

    base_api_response = client.get(
        "/base_api/core-concepts/report_template_examples",
        secure=True,
    )
    api_response = client.get("/api/conf/", secure=True)

    assert base_api_response.status_code != 404
    assert api_response.status_code != 404
