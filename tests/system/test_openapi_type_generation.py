from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from endoreg_db.utils.file_operations import atomic_write_file

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = REPOSITORY_ROOT / "frontend"
TYPESCRIPT_BINARY = FRONTEND_ROOT / "node_modules/.bin/openapi-typescript"


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
