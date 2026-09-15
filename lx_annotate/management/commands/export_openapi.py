from __future__ import annotations

import json
import subprocess
from argparse import ArgumentParser
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from drf_spectacular.generators import SchemaGenerator
from endoreg_db.urls import urlpatterns as endoreg_urlpatterns
from endoreg_db.utils.file_operations import atomic_write_file, ensure_directory

API_DEFINITIONS = {
    "endoreg-api": ("/endoreg-api", "endoreg_db.urls", "ninja_api"),
    "dtypes-api": ("/dtypes-api", "lx_dtypes.django.api.main", "api"),
}

_GENERATED_JSON_VALUE = """        JsonValue: components[\"schemas\"][\"JsonNull\"] | components[\"schemas\"][\"JsonScalar\"] | components[\"schemas\"][\"JsonValue\"][] | {
            [key: string]: components[\"schemas\"][\"JsonValue\"];
        };
"""
_JSON_VALUE_ALIAS = """export type JsonValue = null | string | number | boolean | JsonValue[] | {
    [key: string]: JsonValue;
};
"""


def _load_api(module_name: str, attribute_name: str) -> Any:
    from importlib import import_module

    module = import_module(module_name)
    return getattr(module, attribute_name)


def _merge_endoreg_schemas(
    ninja_schema: dict[str, Any], drf_schema: dict[str, Any]
) -> dict[str, Any]:
    """Combine the Ninja and DRF operations mounted below ``/endoreg-api/``."""
    schema = dict(ninja_schema)
    path_prefix = API_DEFINITIONS["endoreg-api"][0]
    ninja_paths = dict(ninja_schema.get("paths", {}))
    drf_paths = {
        f"{path_prefix}{path}": path_item
        for path, path_item in drf_schema.get("paths", {}).items()
    }
    duplicate_paths = set(ninja_paths).intersection(drf_paths)
    if duplicate_paths:
        raise CommandError(
            "Django Ninja and DRF expose duplicate Endoreg API paths: "
            + ", ".join(sorted(duplicate_paths))
        )
    schema["paths"] = ninja_paths | drf_paths

    ninja_components = dict(ninja_schema.get("components", {}))
    drf_components = dict(drf_schema.get("components", {}))
    ninja_schemas = dict(ninja_components.get("schemas", {}))
    drf_schemas = dict(drf_components.get("schemas", {}))
    duplicate_schemas = set(ninja_schemas).intersection(drf_schemas)
    if duplicate_schemas:
        raise CommandError(
            "Django Ninja and DRF expose duplicate Endoreg schema names: "
            + ", ".join(sorted(duplicate_schemas))
        )
    ninja_components["schemas"] = ninja_schemas | drf_schemas
    schema["components"] = ninja_components
    return schema


def _schema_bytes(api_name: str) -> bytes:
    path_prefix, module_name, attribute_name = API_DEFINITIONS[api_name]
    api = _load_api(module_name, attribute_name)
    schema = api.get_openapi_schema(path_prefix=path_prefix)
    if api_name == "endoreg-api":
        drf_schema = SchemaGenerator(patterns=endoreg_urlpatterns).get_schema(
            request=None,
            public=True,
        )
        schema = _merge_endoreg_schemas(schema, drf_schema)
    payload = json.dumps(
        schema,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    )
    return f"{payload}\n".encode()


def _typescript_bytes(binary: Path, schema_path: Path) -> bytes:
    try:
        result = subprocess.run(
            [str(binary), str(schema_path), "--export-type"],
            check=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        stderr = getattr(exc, "stderr", b"")
        detail = stderr.decode("utf-8", errors="replace").strip()
        suffix = f": {detail}" if detail else ""
        raise CommandError(f"openapi-typescript failed{suffix}") from exc
    generated = result.stdout.decode("utf-8")
    if _GENERATED_JSON_VALUE in generated:
        generated = generated.replace(
            _GENERATED_JSON_VALUE,
            "        JsonValue: JsonValue;\n",
            1,
        )
        components_marker = "export type components = {\n"
        if components_marker not in generated:
            raise CommandError("Generated TypeScript components declaration is missing")
        generated = generated.replace(
            components_marker,
            f"{_JSON_VALUE_ALIAS}{components_marker}",
            1,
        )
    return generated.encode("utf-8")


def _write_or_check(path: Path, content: bytes, *, check: bool) -> None:
    if check:
        try:
            current = path.read_bytes()
        except OSError as exc:
            raise CommandError(f"Generated artifact is missing: {path}") from exc
        if current != content:
            raise CommandError(f"Generated artifact is stale: {path}")
        return
    atomic_write_file(
        destination=path,
        content=(content,),
        required_bytes=len(content),
    )


class Command(BaseCommand):
    help = "Export Django Ninja OpenAPI schemas and optional TypeScript contracts."

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument("--output-dir", type=Path, required=True)
        parser.add_argument("--typescript-output-dir", type=Path)
        parser.add_argument("--typescript-binary", type=Path)
        parser.add_argument("--check", action="store_true")

    def handle(self, *args: Any, **options: Any) -> None:
        output_dir = Path(options["output_dir"]).resolve()
        typescript_output = options.get("typescript_output_dir")
        typescript_output_dir = (
            Path(typescript_output).resolve() if typescript_output is not None else None
        )
        check = bool(options["check"])
        if not check:
            ensure_directory(output_dir)
            if typescript_output_dir is not None:
                ensure_directory(typescript_output_dir)

        binary_option = options.get("typescript_binary")
        binary = (
            Path(binary_option).resolve()
            if binary_option is not None
            else Path(__file__).resolve().parents[3]
            / "frontend/node_modules/.bin/openapi-typescript"
        )
        if typescript_output_dir is not None and not binary.is_file():
            raise CommandError(f"openapi-typescript binary is missing: {binary}")

        exported: list[str] = []
        for api_name in API_DEFINITIONS:
            schema_path = output_dir / f"{api_name}.json"
            schema_content = _schema_bytes(api_name)
            _write_or_check(schema_path, schema_content, check=check)

            if typescript_output_dir is not None:
                typescript_content = _typescript_bytes(binary, schema_path)
                typescript_path = typescript_output_dir / f"{api_name}.ts"
                _write_or_check(typescript_path, typescript_content, check=check)
            exported.append(api_name)

        action = "Verified" if check else "Exported"
        self.stdout.write(self.style.SUCCESS(f"{action}: {', '.join(exported)}"))
