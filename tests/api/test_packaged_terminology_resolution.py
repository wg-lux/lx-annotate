from __future__ import annotations

import importlib
import json
import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
from django.test import Client, override_settings
from django.urls import clear_url_caches, set_urlconf
from endoreg_db.models import Examination, Finding
from lx_dtypes.knowledge_bases import (
    BUILTIN_KNOWLEDGE_BASE_PROVIDER,
    get_packaged_knowledge_base,
)
from lx_dtypes.models.interface.KnowledgeBaseResolver import (
    clear_knowledge_base_resolver_caches,
)
from lx_dtypes.scripts.kb_registry import main as kb_registry_main
from ninja.main import NinjaAPI


def _mount_canonical_dtypes_api(monkeypatch, registry_path: Path) -> None:
    monkeypatch.setenv("LX_DTYPES_KB_REGISTRY", str(registry_path))
    clear_knowledge_base_resolver_caches()

    for module_name in (
        "lx_annotate.urls",
        "lx_annotate.dtypes_api_urls",
        "lx_dtypes.django.api.main",
        "lx_dtypes.django.api.report_template_builder",
    ):
        sys.modules.pop(module_name, None)

    NinjaAPI._registry = []
    clear_url_caches()
    set_urlconf(None)
    importlib.import_module("lx_annotate.urls")
    clear_url_caches()
    set_urlconf("lx_annotate.urls")


@pytest.fixture(autouse=True)
def _isolate_dtypes_runtime_state() -> Iterator[None]:
    clear_knowledge_base_resolver_caches()
    yield
    clear_knowledge_base_resolver_caches()
    clear_url_caches()
    set_urlconf(None)


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_packaged_dgvs_bundle_resolves_through_canonical_host_api(
    monkeypatch,
    tmp_path: Path,
) -> None:
    registry_path = tmp_path / "terminology" / "registry.json"

    assert (
        kb_registry_main(
            [
                "bootstrap",
                "--registry",
                str(registry_path),
                "--module",
                "dgvs_reporting",
            ],
        )
        == 0
    )

    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    assert registry["active"] == {
        "module_name": "dgvs_reporting",
        "version": "0.1.0",
    }
    descriptor = get_packaged_knowledge_base("dgvs_reporting", "0.1.0")
    assert registry["modules"]["dgvs_reporting"]["0.1.0"]["sources"] == [
        {
            "kind": "provider",
            "provider": BUILTIN_KNOWLEDGE_BASE_PROVIDER,
            "content_sha256": descriptor.content_sha256,
        },
    ]
    assert "input_dirs" not in registry["modules"]["dgvs_reporting"]["0.1.0"]

    _mount_canonical_dtypes_api(monkeypatch, registry_path)
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
    assert bundles["active"] == {
        "module_name": "dgvs_reporting",
        "version": "0.1.0",
        "medical_field": "gastroenterology",
        "is_active": True,
    }
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
