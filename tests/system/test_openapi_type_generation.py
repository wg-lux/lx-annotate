from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, override_settings
from drf_spectacular.generators import SchemaGenerator
from endoreg_db.urls import ninja_api
from endoreg_db.urls import urlpatterns as endoreg_urlpatterns
from endoreg_db.utils.file_operations import atomic_write_file

from lx_annotate.management.commands.export_openapi import (
    API_DEFINITIONS,
    _merge_endoreg_schemas,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = REPOSITORY_ROOT / "frontend"
TYPESCRIPT_BINARY = FRONTEND_ROOT / "node_modules/.bin/openapi-typescript"


def test_shared_canonical_schemas_merge_only_when_identical() -> None:
    canonical = {"components": {"schemas": {"JsonValue": {"type": "string"}}}}
    assert (
        _merge_endoreg_schemas(canonical, canonical)["components"]
        == canonical["components"]
    )
    incompatible = {"components": {"schemas": {"JsonValue": {"type": "number"}}}}
    with pytest.raises(CommandError, match="duplicate Endoreg schema names"):
        _merge_endoreg_schemas(canonical, incompatible)


def _export(output_dir: Path, typescript_output_dir: Path | None = None) -> None:
    options: dict[str, object] = {"output_dir": output_dir}
    if typescript_output_dir is not None:
        options.update(
            {
                "typescript_output_dir": typescript_output_dir,
                "typescript_binary": TYPESCRIPT_BINARY,
            },
        )
    call_command("export_openapi", **options)


def test_offline_export_is_deterministic_and_keeps_api_ownership(
    tmp_path: Path,
) -> None:
    output_dir = tmp_path / "openapi"
    _export(output_dir)
    first_export = {path.name: path.read_bytes() for path in output_dir.iterdir()}

    _export(output_dir)

    assert {
        path.name: path.read_bytes() for path in output_dir.iterdir()
    } == first_export
    endoreg_schema = json.loads((output_dir / "endoreg-api.json").read_text())
    dtypes_schema = json.loads((output_dir / "dtypes-api.json").read_text())
    assert endoreg_schema["paths"]
    assert dtypes_schema["paths"]
    assert all(path.startswith("/endoreg-api/") for path in endoreg_schema["paths"])
    assert all(path.startswith("/dtypes-api/") for path in dtypes_schema["paths"])
    assert (
        "SegmentFrameSelectorResponseSchema" in endoreg_schema["components"]["schemas"]
    )
    assert "SaveReportTemplateRequest" in dtypes_schema["components"]["schemas"]


def test_endoreg_export_covers_ninja_and_drf_urlpatterns(tmp_path: Path) -> None:
    output_dir = tmp_path / "openapi"
    _export(output_dir)
    exported_schema = json.loads((output_dir / "endoreg-api.json").read_text())

    path_prefix = API_DEFINITIONS["endoreg-api"][0]
    ninja_schema = ninja_api.get_openapi_schema(path_prefix=path_prefix)
    drf_schema = SchemaGenerator(patterns=endoreg_urlpatterns).get_schema(
        request=None,
        public=True,
    )
    expected_paths = set(ninja_schema["paths"])
    expected_paths.update(f"{path_prefix}{path}" for path in drf_schema["paths"])

    assert set(exported_schema["paths"]) == expected_paths
    for path, path_item in ninja_schema["paths"].items():
        assert exported_schema["paths"][path] == json.loads(json.dumps(path_item))
    for path, path_item in drf_schema["paths"].items():
        assert exported_schema["paths"][f"{path_prefix}{path}"] == json.loads(
            json.dumps(path_item)
        )


def test_check_rejects_a_stale_generated_artifact(tmp_path: Path) -> None:
    output_dir = tmp_path / "openapi"
    _export(output_dir)
    stale_path = output_dir / "endoreg-api.json"
    stale_content = b"{}\n"
    atomic_write_file(
        destination=stale_path,
        content=(stale_content,),
        required_bytes=len(stale_content),
    )

    with pytest.raises(CommandError, match="Generated artifact is stale"):
        call_command("export_openapi", output_dir=output_dir, check=True)


@pytest.mark.skipif(
    not TYPESCRIPT_BINARY.is_file(),
    reason="frontend dependencies are missing",
)
def test_committed_openapi_and_types_are_current() -> None:
    call_command(
        "export_openapi",
        output_dir=FRONTEND_ROOT / "openapi",
        typescript_output_dir=FRONTEND_ROOT / "src/types/generated",
        typescript_binary=TYPESCRIPT_BINARY,
        check=True,
    )
    generated_endoreg = (
        FRONTEND_ROOT / "src/types/generated/endoreg-api.ts"
    ).read_text()
    assert "export type JsonValue =" in generated_endoreg
    assert "JsonValue: JsonValue;" in generated_endoreg


def test_manage_command_honors_test_settings_without_deployment_secret() -> None:
    environment = os.environ.copy()
    environment["DJANGO_SETTINGS_MODULE"] = "lx_annotate.settings.settings_test"
    environment.pop("DJANGO_SECRET_KEY", None)
    environment.pop("DJANGO_SECRET_KEY_FILE", None)

    result = subprocess.run(
        [sys.executable, "manage.py", "help", "export_openapi"],
        cwd=REPOSITORY_ROOT,
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert "Export Django Ninja OpenAPI schemas" in result.stdout


def test_manage_command_rejects_unknown_command() -> None:
    env = os.environ.copy()
    env["DJANGO_SETTINGS_MODULE"] = "lx_annotate.settings.settings_test"
    result = subprocess.run(
        [sys.executable, "manage.py", "readiness_nonexistent_command"],
        cwd=REPOSITORY_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    assert result.returncode != 0
    assert "Unknown command" in result.stderr


@pytest.mark.parametrize(
    "path",
    [
        "/dtypes-api/report-templates/{module_name}/{template_name}/validate",
        "/dtypes-api/report-templates/{module_name}/{template_name}/validate-from-ledger/{patient_examination_id}",
        "/dtypes-api/validators/{module_name}/{validator_kind}/{validator_name}/validate",
    ],
)
def test_validation_language_is_optional_and_constrained(path: str) -> None:
    from lx_dtypes.django.api.main import api
    from ninja import NinjaAPI

    assert isinstance(api, NinjaAPI)
    schema = api.get_openapi_schema(path_prefix="/dtypes-api")
    parameters = schema["paths"][path]["post"]["parameters"]
    language = next(
        parameter for parameter in parameters if parameter["name"] == "language"
    )
    assert language["in"] == "query"
    assert language["required"] is False
    assert language["schema"]["default"] == "de"
    assert language["schema"]["enum"] == ["de", "en"]


@pytest.mark.parametrize(
    "path",
    [
        "/dtypes-api/report-templates/report_template_examples/colonoscopy_training_basic/validate",
        "/dtypes-api/report-templates/report_template_examples/colonoscopy_training_basic/validate-from-ledger/999999",
        "/dtypes-api/validators/report_template_examples/findings_validator/unknown/validate",
    ],
)
@override_settings(ROOT_URLCONF="lx_annotate.urls", ALLOWED_HOSTS=["testserver"])
def test_validation_rejects_unsupported_language_at_request_boundary(path: str) -> None:
    response = Client().post(
        f"{path}?version=0.1.0&language=unsupported",
        data={},
        content_type="application/json",
        secure=True,
    )
    assert response.status_code == 422
    assert any(
        error["loc"] == ["query", "language"] for error in response.json()["detail"]
    )


@pytest.mark.django_db
@pytest.mark.parametrize("language", [None, "de", "en"])
@override_settings(ROOT_URLCONF="lx_annotate.urls", ALLOWED_HOSTS=["testserver"])
def test_ledger_validation_accepts_default_and_supported_languages(
    language: str | None,
) -> None:
    query = "version=0.1.0"
    if language is not None:
        query += f"&language={language}"
    response = Client().post(
        "/dtypes-api/report-templates/report_template_examples/"
        f"colonoscopy_training_basic/validate-from-ledger/999999?{query}",
        secure=True,
    )
    # A real ledger lookup is reached; query validation must not reject old clients
    # that omit language or clients selecting either supported language.
    assert response.status_code == 404
    assert "PatientExamination" in response.json()["detail"]


def test_case_documents_schema_describes_records_not_a_string(tmp_path: Path) -> None:
    _export(tmp_path)
    schema = json.loads((tmp_path / "endoreg-api.json").read_text())
    for name in ("Case", "PatchedCase"):
        documents = schema["components"]["schemas"][name]["properties"]["documents"]
        assert documents["type"] == "array"
        assert documents["items"]["type"] == "object"
        assert documents["readOnly"] is True


def test_drf_schema_has_unambiguous_operations_and_patient_parameters(
    capsys: pytest.CaptureFixture[str],
) -> None:
    from drf_spectacular.drainage import GENERATOR_STATS

    from lx_annotate.openapi import ApplicationAutoSchema

    GENERATOR_STATS.reset()
    schema = SchemaGenerator(patterns=endoreg_urlpatterns).get_schema(
        request=None,
        public=True,
    )
    assert capsys.readouterr().err == ""
    operation_ids = []
    patient_parameters: set[str] = set()
    for path, path_item in schema["paths"].items():
        for method, operation in path_item.items():
            if method not in {
                "get",
                "post",
                "put",
                "patch",
                "delete",
                "head",
                "options",
            }:
                continue
            operation_ids.append(operation["operationId"])
            for parameter in operation.get("parameters", []):
                if parameter["name"] in {"medication_id", "schedule_id"}:
                    patient_parameters.add(parameter["name"])
                    assert parameter["in"] == "path"
                    assert parameter["required"] is True
                    assert parameter["schema"]["type"] == "integer"
    assert patient_parameters == {"medication_id", "schedule_id"}
    assert len(operation_ids) == len(set(operation_ids))
    for (path, method), operation_id in ApplicationAutoSchema.operation_ids.items():
        assert schema["paths"][path][method.lower()]["operationId"] == operation_id
