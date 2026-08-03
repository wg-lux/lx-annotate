from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path


DEFAULT_MODULE_NAME = "report_template_examples"
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


@dataclass(frozen=True)
class ActiveTerminology:
    module_name: str
    version: str


class TerminologyBootstrapError(RuntimeError):
    """Raised when the packaged terminology cannot be provisioned or validated."""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Register and validate the default terminology bundled with the "
            "installed lx-dtypes dependency."
        )
    )
    parser.add_argument(
        "--registry",
        type=Path,
        default=None,
        help="Registry path; defaults to LX_DTYPES_KB_REGISTRY.",
    )
    parser.add_argument(
        "--module",
        default=DEFAULT_MODULE_NAME,
        help=f"Packaged knowledge-base module (default: {DEFAULT_MODULE_NAME}).",
    )
    parser.add_argument(
        "--best-effort",
        action="store_true",
        help="Report failures as warnings and exit successfully.",
    )
    return parser


def _registry_path(value: Path | None) -> Path:
    configured = (
        str(value)
        if value is not None
        else os.environ.get("LX_DTYPES_KB_REGISTRY", "").strip()
    )
    if not configured:
        raise TerminologyBootstrapError(
            "--registry or LX_DTYPES_KB_REGISTRY is required"
        )
    return Path(configured).expanduser().resolve()


def _active_terminology(registry: Path) -> ActiveTerminology:
    try:
        payload = json.loads(registry.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise TerminologyBootstrapError(
            f"unable to read terminology registry {registry}: {exc}"
        ) from exc
    if not isinstance(payload, dict):
        raise TerminologyBootstrapError(
            "terminology registry must contain a JSON object"
        )

    active = payload.get("active")
    modules = payload.get("modules")
    if not isinstance(active, dict) or not isinstance(modules, dict):
        raise TerminologyBootstrapError(
            "terminology registry has no valid active module"
        )

    module_name = active.get("module_name")
    version = active.get("version")
    if not isinstance(module_name, str) or not module_name.strip():
        raise TerminologyBootstrapError(
            "terminology registry has no valid active module name"
        )
    if not isinstance(version, str) or not version.strip():
        raise TerminologyBootstrapError(
            "terminology registry has no valid active version"
        )

    versions = modules.get(module_name)
    if not isinstance(versions, dict) or version not in versions:
        raise TerminologyBootstrapError("active terminology identity is not registered")
    return ActiveTerminology(module_name=module_name, version=version)


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
    raise TerminologyBootstrapError(
        f"{module} exited with status {result.returncode}: {detail}"
    )


def _validate_active(registry: Path, active: ActiveTerminology) -> None:
    environment = os.environ.copy()
    environment["LX_DTYPES_KB_REGISTRY"] = str(registry)
    environment.pop("DJANGO_SETTINGS_MODULE", None)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            VALIDATE_ACTIVE_SCRIPT,
            active.module_name,
            active.version,
        ],
        check=False,
        capture_output=True,
        text=True,
        env=environment,
    )
    if result.returncode == 0:
        return
    detail = result.stderr.strip() or result.stdout.strip()
    raise TerminologyBootstrapError(
        "active terminology validation exited with status "
        f"{result.returncode}: {detail}"
    )


def _provision(registry: Path, module_name: str) -> ActiveTerminology:
    if not registry.exists():
        _run_lx_dtypes_module(
            "lx_dtypes.scripts.kb_registry",
            ["add-current", str(registry), "--module", module_name, "--activate"],
            registry=registry,
        )

    active = _active_terminology(registry)
    _validate_active(registry, active)
    return active


def _event_payload(
    *,
    status: str,
    registry: Path | None = None,
    active: ActiveTerminology | None = None,
    detail: str | None = None,
) -> str:
    payload: dict[str, str] = {
        "event": "lx_annotate.terminology_bootstrap",
        "status": status,
    }
    if registry is not None:
        payload["registry"] = str(registry)
    if active is not None:
        payload["module"] = active.module_name
        payload["version"] = active.version
    if detail is not None:
        payload["detail"] = detail
    return json.dumps(payload, sort_keys=True)


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    registry: Path | None = None
    try:
        registry = _registry_path(args.registry)
        active = _provision(registry, str(args.module).strip())
    except TerminologyBootstrapError as exc:
        status = "warning" if args.best_effort else "error"
        print(
            _event_payload(status=status, registry=registry, detail=str(exc)),
            file=sys.stderr,
        )
        return 0 if args.best_effort else 1

    print(_event_payload(status="ok", registry=registry, active=active))
    return 0
