from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Annotated, Literal

from endoreg_db.utils.file_operations import atomic_write_file
from lx_dtypes.knowledge_bases import (
    BUILTIN_KNOWLEDGE_BASE_PROVIDER,
    PackagedKnowledgeBase,
    get_packaged_knowledge_base,
    list_packaged_knowledge_bases,
)
from pydantic import BaseModel, ConfigDict, Field, model_validator

PACKAGED_REPORTING_MODULES = tuple(
    descriptor.module_name for descriptor in list_packaged_knowledge_bases()
)
DEFAULT_REPORTING_MODULE = "star_upper_gi"


class RegistryActiveIdentity(BaseModel):
    module_name: str = Field(min_length=1)
    version: str = Field(min_length=1)


class ProviderSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["provider"] = "provider"
    provider: str = Field(min_length=1)
    content_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")


class FilesystemSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["filesystem"] = "filesystem"
    input_dirs: list[str] = Field(min_length=1)


KnowledgeBaseSource = Annotated[
    ProviderSource | FilesystemSource,
    Field(discriminator="kind"),
]


class RegistryEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    sources: list[KnowledgeBaseSource] | None = Field(default=None, min_length=1)
    input_dirs: list[str] | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_source(self) -> RegistryEntry:
        if (self.sources is None) == (self.input_dirs is None):
            raise ValueError(
                "registry entry requires exactly one source representation",
            )
        return self


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
        description="Idempotently provision and validate LX-Annotate terminology.",
    )
    parser.add_argument(
        "--registry",
        type=Path,
        default=None,
        help="Registry path; defaults to LX_DTYPES_KB_REGISTRY.",
    )
    parser.add_argument(
        "--module",
        default=DEFAULT_REPORTING_MODULE,
        help=(
            "Knowledge-base module to activate when no registry exists. "
            f"Defaults to {DEFAULT_REPORTING_MODULE}."
        ),
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


def _validate_identity(registry: Path, module_name: str, version: str) -> None:
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
        "terminology identity validation exited with status "
        f"{result.returncode}: {detail}",
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


def _packaged_registry_entry(descriptor: PackagedKnowledgeBase) -> RegistryEntry:
    entry: dict[str, object] = {
        "sources": [
            {
                "kind": "provider",
                "provider": BUILTIN_KNOWLEDGE_BASE_PROVIDER,
                "content_sha256": descriptor.content_sha256,
            },
        ],
    }
    if descriptor.medical_field:
        entry["medical_field"] = descriptor.medical_field
    return RegistryEntry.model_validate(entry)


def _is_packaged_entry(entry: RegistryEntry) -> bool:
    if entry.sources is not None:
        if len(entry.sources) != 1:
            return False
        source = entry.sources[0]
        if isinstance(source, ProviderSource):
            return source.provider == BUILTIN_KNOWLEDGE_BASE_PROVIDER
        paths = tuple(source.input_dirs)
    else:
        paths = tuple(entry.input_dirs or [])

    if len(paths) != 1:
        return False
    normalized_parts = tuple(part.lower() for part in Path(paths[0]).parts)
    return "site-packages" in normalized_parts and normalized_parts[-2:] == (
        "lx_dtypes",
        "data",
    )


def _write_registry(registry: Path, payload: RegistryPayload) -> None:
    encoded = (payload.model_dump_json(indent=2, exclude_none=True) + "\n").encode(
        "utf-8",
    )
    atomic_write_file(
        destination=registry,
        content=[encoded],
        required_bytes=len(encoded),
        file_mode=0o600,
    )


def _ensure_packaged_reporting_modules(registry: Path) -> None:
    payload = (
        _read_registry(registry) if registry.exists() else RegistryPayload(modules={})
    )
    changed = False
    for requested_module in PACKAGED_REPORTING_MODULES:
        descriptor = get_packaged_knowledge_base(requested_module)
        module_name, version = descriptor.module_name, descriptor.version
        expected = _packaged_registry_entry(descriptor)
        versions = payload.modules.setdefault(module_name, {})
        existing = versions.get(version)
        if existing == expected:
            continue
        if existing is not None and not _is_packaged_entry(existing):
            raise ValueError(
                "immutable terminology identity collision for "
                f"{module_name}@{version}: the existing entry is not a "
                "recognized packaged provider or installed-wheel source",
            )
        versions[version] = expected
        changed = True

    if changed:
        _write_registry(registry, payload)


def _migrate_stale_active_packaged_identity(registry: Path) -> None:
    payload = _read_registry(registry)
    active = payload.active
    if active is None:
        return

    try:
        descriptor = get_packaged_knowledge_base(active.module_name)
    except LookupError:
        return
    if descriptor.version == active.version:
        return

    active_entry = payload.modules.get(active.module_name, {}).get(active.version)
    if active_entry is None or not _is_packaged_entry(active_entry):
        return

    current_entry = payload.modules.get(descriptor.module_name, {}).get(
        descriptor.version,
    )
    if current_entry is None:
        raise ValueError(
            "current packaged terminology identity was not registered before migration",
        )

    stale_versions = payload.modules[active.module_name]
    del stale_versions[active.version]
    if not stale_versions:
        del payload.modules[active.module_name]
    payload.active = RegistryActiveIdentity(
        module_name=descriptor.module_name,
        version=descriptor.version,
    )
    _write_registry(registry, payload)


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
                "new terminology registry must contain exactly one identity",
            )
        module_name, version = identities[0]
    versions = payload.modules.get(module_name)
    if versions is None or version not in versions:
        raise ValueError("requested active terminology identity is not registered")

    payload.active = RegistryActiveIdentity(
        module_name=module_name,
        version=version,
    )
    _write_registry(registry, payload)
    return module_name, version


def _register_initial_identity(
    registry: Path,
    args: argparse.Namespace,
) -> tuple[str, str]:
    if args.version or args.input_dir:
        if not args.version or not args.input_dir:
            raise ValueError(
                "explicit terminology provisioning requires --version and "
                "at least one --input-dir",
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
        identity = (args.module, args.version)
    else:
        descriptor = get_packaged_knowledge_base(args.module)
        registry_args = [
            "add-current",
            str(registry),
            "--module",
            args.module,
        ]
        identity = (descriptor.module_name, descriptor.version)

    _run_lx_dtypes_module(
        "lx_dtypes.scripts.kb_registry",
        registry_args,
        registry=registry,
    )
    return identity


def _provision(args: argparse.Namespace) -> None:
    registry = _registry_path(args.registry)

    existing = _read_registry(registry) if registry.exists() else None
    needs_initial_activation = (
        existing is None or not existing.modules or existing.active is None
    )
    initial_identity: tuple[str, str] | None = None
    uses_explicit_identity = bool(args.version or args.input_dir)
    packaged_initial_descriptor: PackagedKnowledgeBase | None = None
    if needs_initial_activation and not uses_explicit_identity:
        packaged_initial_descriptor = get_packaged_knowledge_base(args.module)
    if needs_initial_activation and uses_explicit_identity:
        initial_identity = _register_initial_identity(registry, args)

    _ensure_packaged_reporting_modules(registry)

    if packaged_initial_descriptor is not None:
        initial_identity = (
            packaged_initial_descriptor.module_name,
            packaged_initial_descriptor.version,
        )

    if initial_identity is not None:
        _activate_registered_identity(
            registry,
            module_name=initial_identity[0],
            version=initial_identity[1],
        )

    _migrate_stale_active_packaged_identity(registry)

    packaged_identities: set[tuple[str, str]] = set()
    for requested_module in PACKAGED_REPORTING_MODULES:
        descriptor = get_packaged_knowledge_base(requested_module)
        identity = (descriptor.module_name, descriptor.version)
        _validate_identity(registry, *identity)
        packaged_identities.add(identity)

    module_name, version = _read_active_identity(registry)
    if (module_name, version) not in packaged_identities:
        _validate_identity(registry, module_name, version)

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
        ),
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
