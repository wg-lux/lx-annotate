from __future__ import annotations

import json
from pathlib import Path

import pytest
from django.test import Client, override_settings
from endoreg_db.models import Examination, Finding
from lx_dtypes.terminology.terminology_loader import get_terminology_service

from lx_annotate.services.report_llm import GraphReference, resolve_graph


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_packaged_dgvs_bundle_resolves_through_canonical_host_api(
    packaged_registry: Path,
) -> None:
    registry_path = packaged_registry
    assert get_terminology_service().registry_path == registry_path

    client = Client()

    examination = Examination.objects.create(name="colonoscopy")
    included_finding = Finding.objects.create(name="colon_polyp")
    unrelated_finding = Finding.objects.create(name="host_only_unrelated_finding")
    examination.findings.add(included_finding, unrelated_finding)

    bundles_response = client.get("/dtypes-api/terminology/bundles", secure=True)
    context_response = client.get(
        "/dtypes-api/knowledge-bases/dgvs_reporting/0.1.0/examinations/"
        "colonoscopy/reporting-context",
        secure=True,
    )
    findings_response = client.get(
        f"/dtypes-api/examinations/{examination.pk}/findings/",
        {
            "module_name": "dgvs_reporting",
            "module_version": "0.1.0",
        },
        secure=True,
    )

    assert bundles_response.status_code == 200, bundles_response.content.decode()
    bundles = bundles_response.json()
    assert bundles == get_terminology_service().list_bundles().model_dump(mode="json")
    assert {
        (bundle["module_name"], bundle["version"]) for bundle in bundles["bundles"]
    } >= {
        ("dgvs_reporting", "0.1.0"),
        ("mst_3_0", "3.0.0"),
        ("star_upper_gi", "0.1.2"),
    }

    assert context_response.status_code == 200, context_response.content.decode()
    context = context_response.json()
    assert context["identity"] == {
        "knowledge_base_module": "dgvs_reporting",
        "knowledge_base_version": "0.1.0",
    }
    assert context["examination_name"] == "colonoscopy"
    assert (
        resolve_graph(GraphReference.model_validate(context)).model_dump(mode="json")
        == context
    )
    assert {template["name"] for template in context["report_templates"]} == {
        "colonoscopy_training_basic",
    }
    finding_names = {finding["name"] for finding in context["concepts"]["finding"]}
    assert {
        "colon_polyp",
        "endoscopy_medication_administration",
    } <= finding_names

    assert findings_response.status_code == 200, findings_response.content.decode()
    resolved_finding_names = {finding["name"] for finding in findings_response.json()}
    assert "colon_polyp" in resolved_finding_names
    assert "host_only_unrelated_finding" not in resolved_finding_names

    public_payload = json.dumps(
        {
            "bundles": bundles,
            "reporting_context": context,
            "findings": findings_response.json(),
        },
        sort_keys=True,
    )
    assert str(registry_path) not in public_payload
    assert "site-packages" not in public_payload
