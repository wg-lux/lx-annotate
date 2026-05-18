from __future__ import annotations

import importlib
import json
import sys

import pytest
from django.test import Client, override_settings
from django.urls import clear_url_caches, set_urlconf


def _reload_urls_with_base_api(monkeypatch):
    monkeypatch.setenv("LX_BASE_API_EXPECTED_VERSION", "0.1.1")
    monkeypatch.setattr(
        "importlib.metadata.version",
        lambda name: "0.1.1" if name == "lx-dtypes" else None,
    )

    sys.modules.pop("lx_annotate.urls", None)
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
def test_repo_urls_mount_base_api_live_routes(monkeypatch):
    urls = _reload_urls_with_base_api(monkeypatch)
    client = Client()

    templates_res = client.get(
        "/base_api/report-templates/by-examination/report_template_examples/colonoscopy",
        secure=True,
    )
    canonical_templates_res = client.get(
        "/dtypes-api/report-templates/by-examination/report_template_examples/colonoscopy",
        secure=True,
    )
    assert templates_res.status_code == 200, templates_res.content.decode()
    assert (
        canonical_templates_res.status_code == 200
    ), canonical_templates_res.content.decode()
    templates_payload = templates_res.json()
    assert templates_payload[0]["name"] == "colonoscopy_training_basic"

    assert any(
        getattr(pattern, "pattern", None) and str(pattern.pattern) == "base_api/"
        for pattern in urls.urlpatterns
    )
    assert any(
        getattr(pattern, "pattern", None) and str(pattern.pattern) == "dtypes-api/"
        for pattern in urls.urlpatterns
    )


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
def test_repo_urls_expose_live_report_template_generation_routes(monkeypatch):
    _reload_urls_with_base_api(monkeypatch)
    client = Client()

    by_name_res = client.get(
        "/base_api/report-templates/report_template_examples/colonoscopy_training_basic",
        secure=True,
    )
    assert by_name_res.status_code == 200, by_name_res.content.decode()
    by_name_payload = by_name_res.json()
    assert by_name_payload["name"] == "colonoscopy_training_basic"
    assert by_name_payload["examination"] == "colonoscopy"

    validate_res = client.post(
        "/base_api/report-templates/report_template_examples/colonoscopy_training_basic/validate",
        data=json.dumps(
            {
                "patient": "test_patient",
                "examination": "colonoscopy",
                "patient_findings": [
                    {
                        "finding": "colonoscopy_deepest_viewed_location",
                        "patient_examination": "test_exam",
                        "patient_finding_classifications": [],
                        "patient_finding_interventions": [],
                    }
                ],
            }
        ),
        content_type="application/json",
        secure=True,
    )
    assert validate_res.status_code == 200, validate_res.content.decode()
    validate_payload = validate_res.json()
    assert validate_payload["template_name"] == "colonoscopy_training_basic"
    assert validate_payload["evaluated_findings_count"] == 1
    assert validate_payload["examination_validators"][0]["ok"] is True
    assert validate_payload["findings_validators"][0]["ok"] is False

    core_concepts_res = client.get(
        "/base_api/core-concepts/report_template_examples",
        secure=True,
    )
    assert core_concepts_res.status_code == 200, core_concepts_res.content.decode()
    core_concepts_payload = core_concepts_res.json()
    assert "examination" in core_concepts_payload
    assert "finding" in core_concepts_payload


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_repo_urls_expose_validate_from_ledger_route(monkeypatch):
    _reload_urls_with_base_api(monkeypatch)
    client = Client()

    response = client.post(
        "/base_api/report-templates/report_template_examples/colonoscopy_training_basic/validate-from-ledger/999999",
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
def test_repo_urls_do_not_expose_stale_requirement_set_routes(monkeypatch):
    _reload_urls_with_base_api(monkeypatch)
    client = Client()

    response = client.get("/base_api/requirement-sets/", secure=True)

    assert response.status_code == 404
