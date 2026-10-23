#!/usr/bin/env python3
"""Validate architectural context without importing application runtime code."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path
from typing import Any

import yaml

TIERS = {"root", "domain", "service", "package", "tool"}
REQUIRED = {
    "version",
    "tier",
    "path",
    "parent",
    "summary",
    "responsibilities",
    "boundaries",
    "entrypoints",
    "dependencies",
    "submodules",
    "contracts",
    "tests",
}


class ManifestLoader(yaml.SafeLoader):
    """Reject duplicate keys rather than silently discarding metadata."""


def _mapping(loader: ManifestLoader, node: yaml.MappingNode) -> dict:
    loader.flatten_mapping(node)
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in result:
            raise ValueError(f"duplicate YAML key: {key}")
        result[key] = loader.construct_object(value_node)
    return result


ManifestLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _mapping)


def source_files(root: Path) -> set[Path]:
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=root,
        capture_output=True,
        check=True,
    )
    return {root / name.decode("utf-8") for name in result.stdout.split(b"\0") if name}


def _text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a nonempty string")
    return value


def _list(value: Any, label: str) -> list:
    if not isinstance(value, list):
        raise ValueError(f"{label} must be a list")
    return value


def _dict(value: Any, label: str) -> dict:
    if not isinstance(value, dict):
        raise ValueError(f"{label} must be a mapping")
    return value


def validate(root: Path) -> list[str]:
    """Return deterministic diagnostics for schema, references, and graph drift."""
    root = root.resolve()
    sources = source_files(root)
    manifests = {path for path in sources if path.name == "structure.yml"}
    errors: list[str] = []
    parents: dict[Path, Path | None] = {}
    edges: dict[Path, list[Path]] = {}
    root_manifest = root / "structure.yml"
    if root_manifest not in manifests:
        errors.append("structure.yml: root manifest is missing from source scope")

    def reference(base: Path, value: Any, label: str, kind: str = "any") -> Path:
        raw = _text(value, label)
        if Path(raw).is_absolute():
            raise ValueError(f"{label}: absolute paths are prohibited")
        path = (base / raw).resolve()
        if not path.is_relative_to(root):
            raise ValueError(f"{label}: path escapes repository: {raw}")
        if not path.exists():
            raise ValueError(f"{label}: missing path: {raw}")
        if kind == "file" and not path.is_file():
            raise ValueError(f"{label}: expected a file: {raw}")
        if kind == "directory" and not path.is_dir():
            raise ValueError(f"{label}: expected a directory: {raw}")
        if path not in sources and not any(p.is_relative_to(path) for p in sources):
            raise ValueError(f"{label}: path is outside Git source scope: {raw}")
        return path

    def extra_references(value: Any, base: Path) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key in {"file", "doc"}:
                    reference(base, child, key, "file")
                elif key == "files":
                    for item in _list(child, "files"):
                        reference(base, item, "files", "file")
                else:
                    extra_references(child, base)
        elif isinstance(value, list):
            for child in value:
                extra_references(child, base)

    for manifest in sorted(manifests):
        label = manifest.relative_to(root).as_posix()
        base = manifest.parent
        try:
            data = _dict(yaml.load(manifest.read_text(), Loader=ManifestLoader), label)
            missing = REQUIRED - data.keys()
            if missing:
                raise ValueError(f"missing required keys: {', '.join(sorted(missing))}")
            if type(data["version"]) is not int or data["version"] != 1:
                raise ValueError("version must be integer 1")
            if _text(data["tier"], "tier") not in TIERS:
                raise ValueError("invalid tier")
            if (manifest == root_manifest) != (data["tier"] == "root"):
                raise ValueError("only the root manifest may use tier root")
            if data["path"] != base.relative_to(root).as_posix():
                raise ValueError("path must match manifest directory relative to root")
            _text(data["summary"], "summary")
            for key in ("responsibilities", "boundaries"):
                items = _list(data[key], key)
                if key == "responsibilities" and not items:
                    raise ValueError("responsibilities must not be empty")
                for item in items:
                    _text(item, key)
            parent = data["parent"]
            if manifest == root_manifest:
                if parent is not None:
                    raise ValueError("root parent must be null")
                parents[manifest] = None
            else:
                parents[manifest] = reference(base, parent, "parent", "file")
                if parents[manifest] not in manifests:
                    raise ValueError("parent must reference a source structure.yml")
            for item in _list(data["entrypoints"], "entrypoints"):
                item = _dict(item, "entrypoint")
                _text(item.get("name"), "entrypoint.name")
                _text(item.get("purpose"), "entrypoint.purpose")
                reference(base, item.get("file"), "entrypoint.file", "file")
            deps = _dict(data["dependencies"], "dependencies")
            for value in _list(deps.get("internal"), "dependencies.internal"):
                reference(root, value, "dependencies.internal", "directory")
            for value in _list(deps.get("external"), "dependencies.external"):
                _text(value, "dependencies.external")
            edges[manifest] = []
            names = set()
            for item in _list(data["submodules"], "submodules"):
                item = _dict(item, "submodule")
                name = _text(item.get("name"), "submodule.name")
                if name in names:
                    raise ValueError(f"duplicate submodule name: {name}")
                names.add(name)
                _text(item.get("summary"), "submodule.summary")
                directory = reference(
                    base, item.get("path"), "submodule.path", "directory"
                )
                child = reference(
                    base, item.get("manifest"), "submodule.manifest", "file"
                )
                if child not in manifests or child.parent != directory:
                    raise ValueError(
                        "submodule manifest must be structure.yml in its path"
                    )
                if directory == base or not directory.is_relative_to(base):
                    raise ValueError("submodule must be a descendant directory")
                edges[manifest].append(child)
            for item in _list(data["contracts"], "contracts"):
                item = _dict(item, "contract")
                _text(item.get("name"), "contract.name")
                reference(base, item.get("doc"), "contract.doc", "file")
            tests = _dict(data["tests"], "tests")
            reference(base, tests.get("directory"), "tests.directory", "directory")
            _text(tests.get("command"), "tests.command")
            extra_references(data, base)
        except (ValueError, TypeError, OSError, yaml.YAMLError, RecursionError) as exc:
            errors.append(f"{label}: {exc}")

    callers: dict[Path, list[Path]] = {}
    for caller, children in edges.items():
        for child in children:
            callers.setdefault(child, []).append(caller)
            if parents.get(child) != caller:
                errors.append(
                    f"{child.relative_to(root)}: parent does not match caller {caller.relative_to(root)}"
                )
    for child in sorted(manifests - {root_manifest}):
        if len(callers.get(child, [])) != 1:
            errors.append(
                f"{child.relative_to(root)}: expected exactly one parent link"
            )

    reached: set[Path] = set()
    active: set[Path] = set()

    def visit(node: Path) -> None:
        if node in active:
            errors.append(f"{node.relative_to(root)}: cycle in manifest graph")
            return
        if node in reached:
            return
        reached.add(node)
        active.add(node)
        for child in edges.get(node, []):
            visit(child)
        active.remove(node)

    visit(root_manifest)
    for orphan in sorted(manifests - reached):
        errors.append(f"{orphan.relative_to(root)}: unreachable from root")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parents[1]
    )
    args = parser.parse_args()
    try:
        errors = validate(args.root)
    except (OSError, subprocess.CalledProcessError) as exc:
        parser.exit(1, f"Cannot enumerate Git source scope: {exc}\n")
    if errors:
        for error in errors:
            print(error)
        return 1
    print("Structure manifests: schema, references, and root reachability passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
