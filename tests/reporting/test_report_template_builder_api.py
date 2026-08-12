from __future__ import annotations

import importlib.resources
import json
from pathlib import Path

import pytest
import yaml
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from django.urls import clear_url_caches, resolve, set_urlconf
from endoreg_db.utils.file_operations import atomic_copy_file

from tests.api.test_base_api_mount import _reload_urls_with_dtypes_api


def _copy_packaged_knowledge_base_data(tmp_path: Path) -> None:
    packaged_data_root = Path(
        str(importlib.resources.files("lx_dtypes").joinpath("data")),
    )
    for source_path in packaged_data_root.rglob("*"):
        if not source_path.is_file():
            continue
        atomic_copy_file(
            source=source_path,
            destination=tmp_path / source_path.relative_to(packaged_data_root),
        )


def _assert_builder_route_is_mounted() -> None:
    clear_url_caches()
    set_urlconf("lx_annotate.urls")
    match = resolve("/dtypes-api/report-templates/builder/templates")
    assert "lx_dtypes_api" in match.namespaces


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_report_template_builder_persists_yaml_via_dtypes_ninja_api(
    monkeypatch,
    tmp_path,
):
    _copy_packaged_knowledge_base_data(tmp_path)
    _reload_urls_with_dtypes_api(
        monkeypatch,
        tmp_path,
        knowledge_base_root=tmp_path,
    )
    _assert_builder_route_is_mounted()

    user = get_user_model().objects.create_user(
        username="report-template-builder",
        password="test-password",
        is_staff=True,
    )
    client = Client()
    client.force_login(user)
    response = client.post(
        "/dtypes-api/report-templates/builder/templates",
        data=json.dumps(
            {
                "module_name": "report_template_examples",
                "file_name": "clinic_colonoscopy_template_v1",
                "template_name": "clinic_colonoscopy_template",
                "examination": "colonoscopy",
                "description": "Clinic template with static header sections.",
                "sections": [
                    {
                        "section_type": "logo",
                        "name": "clinic_logo",
                        "description": "https://example.org/logo.png",
                    },
                    {
                        "section_type": "patient_info",
                        "name": "patient_information",
                        "description": "Patient demographics",
                        "fields": [
                            {
                                "key": "first_name",
                                "label": "Vorname",
                                "source": "patient",
                                "required": False,
                            },
                        ],
                    },
                    {
                        "section_type": "clinic_address",
                        "name": "clinic_address",
                        "description": "Clinic Street 1",
                    },
                    {
                        "section_type": "findings",
                        "name": "observations",
                        "description": "Document relevant findings",
                        "findings": [
                            {
                                "finding": "colon_polyp",
                                "required": False,
                                "multiple_allowed": True,
                                "classifications": [
                                    {
                                        "classification": "lesion_size_mm",
                                        "required": True,
                                    },
                                ],
                                "validator": {
                                    "enabled": True,
                                    "name": "polyp_present",
                                    "operator": "exists",
                                },
                            },
                        ],
                    },
                ],
            },
        ),
        content_type="application/json",
        secure=True,
    )

    assert response.status_code == 200, response.content.decode()
    payload = response.json()
    assert payload["file_name"] == "clinic_colonoscopy_template_v1.yaml"

    output_path = (
        tmp_path
        / "report_template_examples"
        / "generated_templates"
        / payload["file_name"]
    )
    assert output_path.exists()

    saved_records = yaml.safe_load(output_path.read_text(encoding="utf-8"))
    assert any(
        record["model"] == "report_template"
        and record["name"] == "clinic_colonoscopy_template"
        for record in saved_records
    )
    assert any(
        record["model"] == "report_template_section"
        and record["name"] == "clinic_logo"
        and record["section_kind"] == "patient_data"
        for record in saved_records
    )
    assert any(
        record["model"] == "findings_validator" and record["name"] == "polyp_present"
        for record in saved_records
    )

    config_payload = yaml.safe_load(
        (tmp_path / "report_template_examples" / "config.yaml").read_text(
            encoding="utf-8",
        ),
    )
    assert "./generated_templates" in config_payload["data"]["dirs"]


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
def test_report_template_builder_rejects_invalid_findings_sections(
    monkeypatch,
    tmp_path,
):
    _reload_urls_with_dtypes_api(monkeypatch, tmp_path)
    _assert_builder_route_is_mounted()

    client = Client()
    response = client.post(
        "/dtypes-api/report-templates/builder/templates",
        data=json.dumps(
            {
                "module_name": "report_template_examples",
                "file_name": "broken_template",
                "template_name": "broken_template",
                "examination": "colonoscopy",
                "sections": [
                    {
                        "section_type": "findings",
                        "name": "observations",
                        "description": "",
                        "findings": [],
                    },
                ],
            },
        ),
        content_type="application/json",
        secure=True,
    )

    assert response.status_code == 422, response.content.decode()
