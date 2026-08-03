from __future__ import annotations

import importlib
import importlib.resources
import json
import sys

import pytest
from django.test import Client, override_settings
from django.urls import clear_url_caches, set_urlconf


def _reload_urls_with_dtypes_api(monkeypatch, tmp_path):
    package_data_root = importlib.resources.files("lx_dtypes").joinpath("data")
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
                        "0.1.0": {"input_dirs": [str(package_data_root)]}
                    }
                },
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("LX_DTYPES_KB_REGISTRY", str(registry_path))
    monkeypatch.setattr(
        "importlib.metadata.version",
        lambda name: "0.1.1" if name == "lx-dtypes" else None,
    )

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
def test_repo_urls_mount_only_canonical_dtypes_api_routes(monkeypatch, tmp_path):
    urls = _reload_urls_with_dtypes_api(monkeypatch, tmp_path)
    client = Client()

    canonical_templates_res = client.get(
        "/dtypes-api/report-templates/by-examination/report_template_examples/colonoscopy",
        secure=True,
    )
    assert canonical_templates_res.status_code == 200, (
        canonical_templates_res.content.decode()
    )
    templates_payload = canonical_templates_res.json()
    assert templates_payload[0]["name"] == "colonoscopy_training_basic"

    assert not any(
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
def test_repo_urls_expose_live_report_template_generation_routes(monkeypatch, tmp_path):
    _reload_urls_with_dtypes_api(monkeypatch, tmp_path)
    client = Client()

    by_name_res = client.get(
        "/dtypes-api/report-templates/report_template_examples/colonoscopy_training_basic",
        secure=True,
    )
    assert by_name_res.status_code == 200, by_name_res.content.decode()
    by_name_payload = by_name_res.json()
    assert by_name_payload["name"] == "colonoscopy_training_basic"
    assert by_name_payload["examination"] == "colonoscopy"
    assert by_name_payload["report_sections"]

    validate_res = client.post(
        "/dtypes-api/report-templates/report_template_examples/colonoscopy_training_basic/validate",
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
    examination_validation = validate_payload["examination_validators"][0]
    assert examination_validation["ok"] is False
    assert any(
        issue["code"] == "failed_finding_validator_dependency"
        for issue in examination_validation["issues"]
    )
    assert validate_payload["findings_validators"][0]["ok"] is False

    core_concepts_res = client.get(
        "/dtypes-api/core-concepts/report_template_examples",
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
def test_repo_urls_expose_validate_from_ledger_route(monkeypatch, tmp_path):
    _reload_urls_with_dtypes_api(monkeypatch, tmp_path)
    client = Client()

    response = client.post(
        "/dtypes-api/report-templates/report_template_examples/colonoscopy_training_basic/validate-from-ledger/999999",
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
