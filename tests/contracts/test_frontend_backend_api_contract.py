from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

import pytest
from django.test import Client, override_settings
from django.urls import Resolver404, resolve
from endoreg_db.serializers.report.patient_examination_report import (
    SegmentFrameSelectorResponseSchema,
)
from endoreg_db.serializers.video.video_processing_history import (
    VideoProcessingHistorySerializer,
)
from lx_dtypes.models.contracts.patient_examination_report import (
    PatientExaminationReportMakeReportPayload,
    PatientExaminationReportSubmissionPayload,
    SegmentFrameSelectorPatchPayload,
)
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[2]
ENDPOINTS_SOURCE = ROOT / "frontend/src/types/api/endpoints.ts"
REPORT_SUBMISSION_SOURCE = ROOT / "frontend/src/types/api/reportSubmission.ts"
REPORT_EXPORT_SOURCE = ROOT / "frontend/src/api/reportExportApi.ts"
FRAME_SELECTOR_SOURCE = ROOT / "frontend/src/views/reporting/FrameSelectorPage.vue"
GENERATED_ENDOREG_SOURCE = ROOT / "frontend/src/types/generated/endoreg-api.ts"
CORRECTION_SOURCE = (
    ROOT / "frontend/src/components/Anonymizer/AnonymizationCorrectionComponent.vue"
)
REPORT_EDITOR_SOURCE = ROOT / "frontend/src/views/reporting/ReportEditorPage.vue"
ANONYMIZATION_VALIDATION_SOURCE = (
    ROOT / "frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue"
)
VIDEO_EXAMINATION_SOURCE = (
    ROOT / "frontend/src/components/VideoExamination/VideoExaminationAnnotation.vue"
)

UUID_SAMPLE = "11111111-1111-1111-1111-111111111111"

ENDPOINT_EXPORT_SCRIPT = r"""
const fs = require('fs')
const ts = require('./frontend/node_modules/typescript')
const source = fs.readFileSync('frontend/src/types/api/endpoints.ts', 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText
const exportsObject = {}
new Function('exports', 'require', 'module', javascript)(
  exportsObject,
  require,
  { exports: exportsObject }
)
const rows = []
const walk = (value, prefix = []) => {
  for (const [key, child] of Object.entries(value)) {
    const name = [...prefix, key]
    if (typeof child === 'function') {
      rows.push({ name: name.join('.'), path: child(1, 2, 3) })
    } else if (child && typeof child === 'object') {
      walk(child, name)
    } else {
      rows.push({ name: name.join('.'), path: child })
    }
  }
}
walk(exportsObject.endpoints)
process.stdout.write(JSON.stringify(rows))
"""


def _registered_frontend_endpoints() -> list[dict[str, str]]:
    result = subprocess.run(
        ["node", "-e", ENDPOINT_EXPORT_SCRIPT],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    assert isinstance(payload, list)
    return payload


def _resolve_endoreg_path(relative_path: str) -> None:
    path = urlsplit(relative_path).path
    candidates = (
        f"/endoreg-api/{path}",
        f"/endoreg-api/{path.replace('/1/', f'/{UUID_SAMPLE}/')}",
    )
    failures: list[str] = []
    for candidate in candidates:
        try:
            resolve(candidate)
            return
        except Resolver404:
            failures.append(candidate)
    pytest.fail(f"Frontend endpoint does not resolve: {', '.join(failures)}")


def _typescript_object_fields(source: Path, type_name: str) -> set[str]:
    text = source.read_text(encoding="utf-8")
    match = re.search(
        rf"(?:export )?type {re.escape(type_name)}\s*=\s*\{{(?P<body>.*?)\n\}}",
        text,
        flags=re.DOTALL,
    )
    assert match is not None, f"TypeScript type {type_name} not found in {source}"
    return set(
        re.findall(
            r"^\s{2}([A-Za-z][A-Za-z0-9]*)\??:",
            match.group("body"),
            re.MULTILINE,
        ),
    )


def _typescript_schema_fields(source: Path, schema_name: str) -> set[str]:
    text = source.read_text(encoding="utf-8")
    marker = re.search(
        rf"^\s{{8}}{re.escape(schema_name)}:\s*\{{",
        text,
        flags=re.MULTILINE,
    )
    assert marker is not None, f"Generated schema {schema_name} not found in {source}"
    opening_brace = text.find("{", marker.start())
    depth = 0
    closing_brace = None
    for index in range(opening_brace, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                closing_brace = index
                break
    assert closing_brace is not None, f"Generated schema {schema_name} is not closed"
    body = text[opening_brace + 1 : closing_brace]
    return set(
        re.findall(
            r"^\s{12}([a-z][A-Za-z0-9_]*)\??:",
            body,
            re.MULTILINE,
        ),
    )


def _snake_case(value: str) -> str:
    return re.sub(r"(?<!^)([A-Z])", r"_\1", value).lower()


def test_every_registered_endoreg_frontend_endpoint_resolves() -> None:
    rows = _registered_frontend_endpoints()
    assert len(rows) >= 100
    for row in rows:
        _resolve_endoreg_path(row["path"])


def test_catalog_examination_calls_use_only_the_dtypes_api() -> None:
    editor_source = REPORT_EDITOR_SOURCE.read_text(encoding="utf-8")
    assert (
        "dtypesApi(`examinations/${String(selectedExaminationId)}/`)" in editor_source
    )
    assert "dtypesApi('examinations/')" in editor_source
    assert "r(endpoints.router.examinations)" not in editor_source

    resolve("/dtypes-api/examinations/1/")
    resolve("/dtypes-api/examinations/")
    with pytest.raises(Resolver404):
        resolve("/endoreg-api/examinations/1/")


@override_settings(ALLOWED_HOSTS=["testserver"])
def test_reporting_methods_and_trailing_slashes_match_ninja_routes() -> None:
    client = Client()
    expected_methods = {
        "/endoreg-api/patient-examination-reports/save-submission": {"POST"},
        "/endoreg-api/patient-examination-reports/make-report": {"POST"},
        "/endoreg-api/patient-examination-reports/segment-frame-selector": {
            "GET",
            "PATCH",
        },
        "/endoreg-api/patient-examination-reports/history-context": {"GET"},
        "/endoreg-api/patient-examination-reports/1": {"GET"},
    }
    for path, methods in expected_methods.items():
        response = client.options(path, secure=True)
        assert response.status_code == 405
        assert set(response.headers["Allow"].split(", ")) == methods
        with pytest.raises(Resolver404):
            resolve(f"{path}/")


@pytest.mark.parametrize(
    ("source", "type_name", "backend_model"),
    [
        (
            REPORT_SUBMISSION_SOURCE,
            "SaveReportSubmissionRequest",
            PatientExaminationReportSubmissionPayload,
        ),
        (
            REPORT_EXPORT_SOURCE,
            "MakeReportRequest",
            PatientExaminationReportMakeReportPayload,
        ),
        (
            FRAME_SELECTOR_SOURCE,
            "SegmentFrameSelectorPatch",
            SegmentFrameSelectorPatchPayload,
        ),
    ],
)
def test_reporting_request_fields_match_backend_payload_models(
    source: Path,
    type_name: str,
    backend_model: type[BaseModel],
) -> None:
    frontend_fields = {
        _snake_case(field) for field in _typescript_object_fields(source, type_name)
    }
    backend_fields = set(backend_model.model_fields)
    required_backend_fields = {
        name
        for name, field in backend_model.model_fields.items()
        if field.is_required()
    }
    assert frontend_fields <= backend_fields
    assert required_backend_fields <= frontend_fields


def test_segment_selector_response_fields_match_backend_schema() -> None:
    frontend_fields = _typescript_schema_fields(
        GENERATED_ENDOREG_SOURCE,
        "SegmentFrameSelectorResponseSchema",
    )
    backend_fields = set(SegmentFrameSelectorResponseSchema.model_fields)
    assert frontend_fields == backend_fields


def test_processing_history_uses_the_backend_supplied_media_url() -> None:
    backend_fields = set(VideoProcessingHistorySerializer().fields)
    frontend_source = CORRECTION_SOURCE.read_text(encoding="utf-8")

    assert "download_url" in backend_fields
    assert "entry.downloadUrl ?? entry.download_url" in frontend_source
    assert "openProcessedResult(entry.downloadUrl)" in frontend_source
    assert "processedVideoDownload" not in ENDPOINTS_SOURCE.read_text(encoding="utf-8")
    assert "media/processed-videos/" not in frontend_source


def test_frontend_contains_no_calls_to_removed_legacy_routes() -> None:
    correction_source = CORRECTION_SOURCE.read_text(encoding="utf-8")
    validation_source = ANONYMIZATION_VALIDATION_SOURCE.read_text(encoding="utf-8")
    video_examination_source = VIDEO_EXAMINATION_SOURCE.read_text(encoding="utf-8")

    assert "/analyze/" not in correction_source
    assert "media/videos/task-status/" not in correction_source
    assert "/reprocess/" not in correction_source
    assert "save-anonymization-annotation-video/" not in validation_source
    assert "save-anonymization-annotation-pdf/" not in validation_source
    assert "axiosInstance.delete(r(`examinations/" not in video_examination_source
