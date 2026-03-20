from __future__ import annotations

import re

from django.urls import get_resolver

from lx_annotate.management.commands.export_route_manifest import _walk


def _normalize_backend_route(path: str) -> str:
    normalized = path
    if normalized.startswith("api/"):
        normalized = normalized[len("api/") :]
    normalized = normalized.lstrip("^").rstrip("$")
    normalized = re.sub(r"\(\?P<[^>]+>\[\^/\.\]\+\)", "{param}", normalized)
    normalized = re.sub(r"\(\?P<[^>]+>[^)]+\)", "{param}", normalized)
    normalized = re.sub(r"<[^>]+>", "{param}", normalized)
    return normalized


def test_endoreg_db_service_keeps_api_mount_and_route_volume():
    rows = _walk(get_resolver().url_patterns)
    endoreg_rows = [
        row
        for row in rows
        if row.path.startswith("api/") and row.source.startswith("endoreg_db.")
    ]

    assert endoreg_rows, "Expected endoreg_db routes mounted under /api/"
    assert len(endoreg_rows) >= 80, (
        f"Expected at least 80 endoreg_db API routes, found {len(endoreg_rows)}"
    )


def test_endoreg_db_service_keeps_critical_frontend_routes():
    rows = _walk(get_resolver().url_patterns)
    normalized_paths = {_normalize_backend_route(row.path) for row in rows}

    expected_paths = {
        "auth/bootstrap",
        "endoreg_db/",
        "login/",
        "login/callback/",
        "conf/",
        "patients/",
        "patients/{param}/",
        "patients/{param}/pseudonym/",
        "patient-examination-reports/",
        "patient-examination-reports/{param}/",
        "patient-examination-reports/save-submission/",
        "patient-examination-reports/segment-frame-selector/",
        "patient-examination-reports/history-context/",
        "anonymization/items/overview/",
        "anonymization/{param}/validate/",
        "media/videos/",
        "media/videos/{param}/",
        "media/videos/{param}/stream/",
        "media/videos/{param}/segments/",
        "media/videos/{param}/segments/{param}/validate/",
        "media/pdfs/{param}/stream/",
        "upload/",
        "upload/{param}/status/",
    }

    missing = sorted(expected_paths - normalized_paths)
    assert not missing, f"Missing critical endoreg_db routes: {missing}"
