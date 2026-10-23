from __future__ import annotations

import json

from django.test import Client, override_settings
from django.urls import resolve


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
)
def test_report_template_builder_rejects_invalid_findings_sections(
    packaged_registry,
):
    match = resolve("/dtypes-api/report-templates/builder/templates")
    assert "lx_dtypes_api" in match.namespaces

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
