from __future__ import annotations

import importlib.resources
import json
import sys
from pathlib import Path

import pytest
from django.test import Client, override_settings
from django.urls import clear_url_caches, set_urlconf


def _reload_urls_with_dtypes_api(
    monkeypatch,
    tmp_path,
    *,
    knowledge_base_root: Path | None = None,
):
    from lx_dtypes.models.interface.KnowledgeBaseResolver import (
        clear_knowledge_base_resolver_caches,
    )

    resolved_knowledge_base_root = knowledge_base_root or Path(
        str(importlib.resources.files("lx_dtypes").joinpath("data")),
    )
    registry_path = tmp_path / "kb_registry.json"
    registry_path.write_text(
        json.dumps(
            {
                "active": {
                    "module_name": "report_template_examples",
                    "version": "0.1.0",
                },
                "modules": {
                    "report_template_examples": {
                        "0.1.0": {"input_dirs": [str(resolved_knowledge_base_root)]},
                    },
                },
            },
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("LX_DTYPES_KB_REGISTRY", str(registry_path))
    monkeypatch.setattr(
        "importlib.metadata.version",
        lambda name: "0.1.1" if name == "lx-dtypes" else None,
    )
    clear_knowledge_base_resolver_caches()

    sys.modules.pop("lx_annotate.urls", None)
    sys.modules.pop("lx_annotate.dtypes_api_urls", None)
    sys.modules.pop("lx_dtypes.django.api.main", None)
    sys.modules.pop("lx_dtypes.django.api.report_template_builder", None)

    from ninja.main import NinjaAPI

    NinjaAPI._registry = []

    clear_url_caches()
    set_urlconf(None)
    module = importlib.import_module("lx_annotate.urls")
    clear_url_caches()
    set_urlconf("lx_annotate.urls")
    return module


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_repo_urls_expose_validate_from_ledger_route(monkeypatch, tmp_path):
    _reload_urls_with_dtypes_api(monkeypatch, tmp_path)
    client = Client()

    response = client.post(
        "/dtypes-api/report-templates/report_template_examples/colonoscopy_training_basic/validate-from-ledger/999999?version=0.1.0",
        secure=True,
    )

    assert response.status_code == 404, response.content.decode()
    payload = response.json()
    assert "detail" in payload
    assert "PatientExamination" in payload["detail"]


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
def test_repo_urls_do_not_expose_stale_requirement_set_routes(monkeypatch, tmp_path):
    _reload_urls_with_dtypes_api(monkeypatch, tmp_path)
    client = Client()

    response = client.get("/dtypes-api/requirement-sets/", secure=True)

    assert response.status_code == 404
