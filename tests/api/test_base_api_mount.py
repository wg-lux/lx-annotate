from __future__ import annotations

import pytest
from django.test import Client, override_settings


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
@pytest.mark.django_db
def test_repo_urls_expose_validate_from_ledger_route(packaged_registry):
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
def test_repo_urls_do_not_expose_stale_requirement_set_routes():
    client = Client()

    response = client.get("/dtypes-api/requirement-sets/", secure=True)

    assert response.status_code == 404
