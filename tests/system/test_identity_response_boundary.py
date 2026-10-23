from __future__ import annotations

from io import BytesIO

import pytest
from django.conf import settings
from django.http import HttpRequest, JsonResponse
from endoreg_db.services.privacy.response_boundary import IdentityHashResponseMiddleware
from openpyxl import load_workbook

from lx_annotate.views.study_export import (
    StudyExportSelection,
    build_study_export_workbook,
)


def test_host_installs_guard_and_rejects_browser_identity() -> None:
    assert (
        "endoreg_db.services.privacy.response_boundary.IdentityHashResponseMiddleware"
        in settings.MIDDLEWARE
    )
    original = JsonResponse({"patient_hash": "a" * 64})
    response = IdentityHashResponseMiddleware(lambda _request: original)(HttpRequest())
    assert isinstance(response, JsonResponse)
    assert response.status_code == 409
    assert b"a" * 64 not in response.content


@pytest.mark.parametrize(
    "selection",
    [
        StudyExportSelection(group_by="patient"),
        StudyExportSelection(group_by="examination"),
    ],
)
def test_study_workbooks_use_hash_free_columns(selection: StudyExportSelection) -> None:
    workbook = load_workbook(
        BytesIO(build_study_export_workbook([], selection=selection, row_count=0))
    )
    headers = next(workbook["Cases"].values)
    assert "Patient ID" in headers
    assert not any(
        "hash" in str(value).lower() or "pseudonym" in str(value).lower()
        for value in headers
    )
