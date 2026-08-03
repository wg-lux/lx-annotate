from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path

from endoreg_db.utils.file_operations import atomic_write_file
from pydantic import BaseModel, ConfigDict, Field


class RegistryActiveIdentity(BaseModel):
    module_name: str = Field(min_length=1)
    version: str = Field(min_length=1)


class RegistryEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    input_dirs: list[str] = Field(min_length=1)


class RegistryPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    modules: dict[str, dict[str, RegistryEntry]]
    active: RegistryActiveIdentity | None = None


VALIDATE_ACTIVE_SCRIPT = """
import sys

from lx_dtypes.models.interface.KnowledgeBaseResolver import (
    load_knowledge_base,
    load_module_config,
)

module_name, version = sys.argv[1:]
config = load_module_config(module_name, version=version)
if config.name != module_name or config.version != version:
    raise SystemExit(
        "active terminology identity does not match its module config: "
        f"expected {module_name}@{version}, got {config.name}@{config.version}"
    )
load_knowledge_base(module_name, version=version)
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Idempotently provision and validate LX-Annotate terminology."
    )
    parser.add_argument(
        "--registry",
        type=Path,
        default=None,
        help="Registry path; defaults to LX_DTYPES_KB_REGISTRY.",
    )
    parser.add_argument(
        "--module",
        default="report_template_examples",
        help="Knowledge-base module to register when no registry exists.",
    )
    parser.add_argument("--version", default="")
    parser.add_argument("--medical-field", default="")
    parser.add_argument("--input-dir", action="append", type=Path, default=[])
    parser.add_argument(
        "--best-effort",
        action="store_true",
        help="Log provisioning errors and exit successfully.",
    )
    return parser


def _registry_path(value: Path | None) -> Path:
    configured = (
        str(value)
        if value is not None
        else os.environ.get("LX_DTYPES_KB_REGISTRY", "").strip()
    )
    if not configured:
        raise ValueError("--registry or LX_DTYPES_KB_REGISTRY is required")
    return Path(configured).expanduser().resolve()


def _run_lx_dtypes_module(
    module: str,
    args: Sequence[str],
    *,
    registry: Path,
) -> None:
    environment = os.environ.copy()
    environment["LX_DTYPES_KB_REGISTRY"] = str(registry)
    result = subprocess.run(
        [sys.executable, "-m", module, *args],
        check=False,
        capture_output=True,
        text=True,
        env=environment,
    )
    if result.returncode == 0:
        return
    detail = result.stderr.strip() or result.stdout.strip()
    raise RuntimeError(f"{module} exited with status {result.returncode}: {detail}")


def _validate_active(registry: Path, module_name: str, version: str) -> None:
    environment = os.environ.copy()
    environment["LX_DTYPES_KB_REGISTRY"] = str(registry)
    environment.pop("DJANGO_SETTINGS_MODULE", None)
    result = subprocess.run(
        [sys.executable, "-c", VALIDATE_ACTIVE_SCRIPT, module_name, version],
        check=False,
        capture_output=True,
        text=True,
        env=environment,
    )
    if result.returncode == 0:
        return
    detail = result.stderr.strip() or result.stdout.strip()
    raise RuntimeError(
        "active terminology validation exited with status "
        f"{result.returncode}: {detail}"
    )


def _read_registry(registry: Path) -> RegistryPayload:
    return RegistryPayload.model_validate_json(registry.read_text(encoding="utf-8"))


def _read_active_identity(registry: Path) -> tuple[str, str]:
    payload = _read_registry(registry)
    active = payload.active
    if active is None:
        raise ValueError("terminology registry has no active module")
    versions = payload.modules.get(active.module_name)
    if versions is None or active.version not in versions:
        raise ValueError("active terminology identity is not registered")
    return active.module_name, active.version


def _activate_registered_identity(
    registry: Path,
    *,
    module_name: str | None = None,
    version: str | None = None,
) -> tuple[str, str]:
    payload = _read_registry(registry)
    if module_name is None or version is None:
        identities = [
            (registered_module, registered_version)
            for registered_module, versions in payload.modules.items()
            for registered_version in versions
        ]
        if len(identities) != 1:
            raise ValueError(
                "new terminology registry must contain exactly one identity"
            )
        module_name, version = identities[0]
    versions = payload.modules.get(module_name)
    if versions is None or version not in versions:
        raise ValueError("requested active terminology identity is not registered")

    payload.active = RegistryActiveIdentity(
        module_name=module_name,
        version=version,
    )
    encoded = (payload.model_dump_json(indent=2) + "\n").encode("utf-8")
    atomic_write_file(
        destination=registry,
        content=[encoded],
        required_bytes=len(encoded),
        file_mode=0o600,
    )
    return module_name, version


def _provision(args: argparse.Namespace) -> None:
    registry = _registry_path(args.registry)

    if not registry.exists():
        if args.version or args.input_dir:
            if not args.version or not args.input_dir:
                raise ValueError(
                    "explicit terminology provisioning requires --version and "
                    "at least one --input-dir"
                )
            registry_args = [
                "add",
                str(registry),
                "--module",
                args.module,
                "--version",
                args.version,
            ]
            if args.medical_field:
                registry_args.extend(["--medical-field", args.medical_field])
            for input_dir in args.input_dir:
                registry_args.extend(["--input-dir", str(input_dir)])
        else:
            registry_args = [
                "add-current",
                str(registry),
                "--module",
                args.module,
            ]
        _run_lx_dtypes_module(
            "lx_dtypes.scripts.kb_registry",
            registry_args,
            registry=registry,
        )
        _activate_registered_identity(
            registry,
            module_name=args.module if args.version else None,
            version=args.version or None,
        )

    module_name, version = _read_active_identity(registry)
    _validate_active(registry, module_name, version)

    print(
        json.dumps(
            {
                "event": "lx_annotate.terminology_bootstrap",
                "status": "ok",
                "registry": str(registry),
                "module": module_name,
                "version": version,
            },
            sort_keys=True,
        )
    )


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        _provision(args)
    except (Exception, SystemExit) as exc:
        print(
            json.dumps(
                {
                    "event": "lx_annotate.terminology_bootstrap",
                    "status": "warning" if args.best_effort else "error",
                    "detail": str(exc),
                },
                sort_keys=True,
            ),
            file=sys.stderr,
        )
        if args.best_effort:
            return 0
        return 1
    return 0
