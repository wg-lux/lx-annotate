from __future__ import annotations

import json
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from endoreg_db.models import Examination, Finding
from lx_dtypes.terminology.terminology_loader import get_terminology_service

from lx_annotate.services.report_llm import GraphReference, resolve_graph


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_reporting_packages_can_be_switched_and_reselected(
    packaged_registry: Path,
) -> None:
    client = Client()
    actor = get_user_model().objects.create_user(
        username="terminology-switch-test", is_staff=True
    )
    client.force_login(actor)
    service = get_terminology_service()
    assert service.registry_path == packaged_registry
    original = service.list_bundles().active
    assert original is not None

    def select(module_name: str, version: str) -> None:
        before = client.get("/dtypes-api/terminology/bundles", secure=True)
        assert before.status_code == 200, before.content.decode()
        response = client.post(
            "/dtypes-api/terminology/bundles/select",
            {
                "module_name": module_name,
                "version": version,
                "expected_revision": before.json()["revision"],
            },
            content_type="application/json",
            secure=True,
        )
        assert response.status_code == 200, response.content.decode()
        after = client.get("/dtypes-api/terminology/bundles", secure=True)
        assert after.status_code == 200, after.content.decode()
        assert after.json()["active"] == response.json()["active"]
        assert after.json()["revision"] == response.json()["revision"]
        assert service.active_identity() == (module_name, version)
        graph = client.get(
            f"/dtypes-api/knowledge-bases/{module_name}/{version}/graph",
            secure=True,
        )
        assert graph.status_code == 200, graph.content.decode()
        assert graph.json()["identity"] == {
            "knowledge_base_module": module_name,
            "knowledge_base_version": version,
        }

    try:
        for identity in (
            ("dgvs_reporting", "0.1.0"),
            ("mst_3_0", "3.0.0"),
            ("star_upper_gi", "0.1.2"),
            ("coloreg", "0.1.0"),
            ("dgvs_reporting", "0.1.0"),
        ):
            select(*identity)
    finally:
        select(original.module_name, original.version)


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


@pytest.mark.parametrize("consumer", ["report", "study"])
def test_report_and_study_reject_invalid_registered_package(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, consumer: str
) -> None:
    from lx_dtypes import packages
    from lx_dtypes.models.contracts.study_metadata import StudyMetadata
    from lx_dtypes.packages import PackageValidationError, create_package
    from lx_dtypes.terminology.terminology_service import TerminologyService

    from lx_annotate.services.study_eligibility import validate_study_terminology

    manifest = create_package(tmp_path / "custom", name="custom", version="1.0.0")
    service = TerminologyService(tmp_path / "registry.json")
    service.register_local("custom", "1.0.0", input_dirs=[tmp_path])
    monkeypatch.setattr(packages, "get_terminology_service", lambda: service)
    # A stale cached KB must not mask an invalid deployment-owned authoring file.
    (manifest.parent / "records.yml").write_text(
        "- model: examination\n  name: colonoscopy\n  findings: [missing_finding]\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError) as rejected:
        if consumer == "report":
            resolve_graph(
                GraphReference.model_validate(
                    {
                        "identity": {
                            "knowledge_base_module": "custom",
                            "knowledge_base_version": "1.0.0",
                        },
                        "context_id": "sha256:" + "0" * 64,
                        "examination_name": "colonoscopy",
                    }
                )
            )
        else:
            validate_study_terminology(
                StudyMetadata.model_validate(
                    {
                        "terminology_requirements": [
                            {"module": "custom", "version": "1.0.0"}
                        ]
                    }
                )
            )

    if consumer == "study":
        assert isinstance(rejected.value.__cause__, PackageValidationError)
        assert str(tmp_path) not in str(rejected.value)
    else:
        assert isinstance(rejected.value, PackageValidationError)
