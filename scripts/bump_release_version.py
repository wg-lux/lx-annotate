#!/usr/bin/env python3
"""Update every repository-owned release version from one validated source."""

from __future__ import annotations

import argparse
import json
import os
import re
import stat
import sys
import tempfile
import tomllib
from dataclasses import dataclass
from pathlib import Path

VERSION_PATTERN = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


@dataclass(frozen=True)
class VersionFiles:
    pyproject: Path
    frontend_package: Path
    frontend_lock: Path
    frontend_nix: Path


def _parse_version(value: str) -> tuple[int, int, int]:
    matched = VERSION_PATTERN.fullmatch(value)
    if matched is None:
        raise ValueError(
            "Version must be major.minor.patch with non-negative integers.",
        )
    major, minor, patch = matched.groups()
    return int(major), int(minor), int(patch)


def _next_version(current: str, requested: str) -> str:
    major, minor, patch = _parse_version(current)
    if requested == "major":
        return f"{major + 1}.0.0"
    if requested == "minor":
        return f"{major}.{minor + 1}.0"
    if requested == "patch":
        return f"{major}.{minor}.{patch + 1}"
    _parse_version(requested)
    return requested


def _replace_once(
    content: str, pattern: re.Pattern[str], replacement: str, path: Path,
) -> str:
    updated, count = pattern.subn(replacement, content, count=1)
    if count != 1:
        raise ValueError(f"Expected exactly one release-version field in {path}.")
    return updated


def _read_current_version(files: VersionFiles) -> str:
    pyproject = tomllib.loads(files.pyproject.read_text(encoding="utf-8"))
    package = json.loads(files.frontend_package.read_text(encoding="utf-8"))
    lock = json.loads(files.frontend_lock.read_text(encoding="utf-8"))
    nix_content = files.frontend_nix.read_text(encoding="utf-8")
    nix_match = re.search(r'(?m)^  version = "([^"]+)";$', nix_content)
    if nix_match is None:
        raise ValueError(
            f"Could not find the frontend Nix version in {files.frontend_nix}.",
        )

    versions = {
        str(pyproject["project"]["version"]),
        str(package["version"]),
        str(lock["version"]),
        str(lock["packages"][""]["version"]),
        nix_match.group(1),
    }
    if len(versions) != 1:
        raise ValueError(
            f"Release version fields disagree: {', '.join(sorted(versions))}.",
        )
    current = versions.pop()
    _parse_version(current)
    return current


def _updated_contents(files: VersionFiles, version: str) -> dict[Path, str]:
    return {
        files.pyproject: _replace_once(
            files.pyproject.read_text(encoding="utf-8"),
            re.compile(r'(?m)^version = "[^"]+"$'),
            f'version = "{version}"',
            files.pyproject,
        ),
        files.frontend_package: _replace_once(
            files.frontend_package.read_text(encoding="utf-8"),
            re.compile(r'(?m)^  "version": "[^"]+",$'),
            f'  "version": "{version}",',
            files.frontend_package,
        ),
        files.frontend_lock: _replace_once(
            _replace_once(
                files.frontend_lock.read_text(encoding="utf-8"),
                re.compile(r'(?m)^  "version": "[^"]+",$'),
                f'  "version": "{version}",',
                files.frontend_lock,
            ),
            re.compile(
                r'("packages": \{\n    "": \{\n      "name": "lx-annotate",\n      "version": )"[^"]+"',
            ),
            rf'\g<1>"{version}"',
            files.frontend_lock,
        ),
        files.frontend_nix: _replace_once(
            files.frontend_nix.read_text(encoding="utf-8"),
            re.compile(r'(?m)^  version = "[^"]+";$'),
            f'  version = "{version}";',
            files.frontend_nix,
        ),
    }


def _atomic_write(path: Path, content: str) -> None:
    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", dir=path.parent,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as temporary_file:
            temporary_file.write(content)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        os.chmod(temporary_path, stat.S_IMODE(path.stat().st_mode))
        os.replace(temporary_path, path)
    except BaseException:
        temporary_path.unlink(missing_ok=True)
        raise


def _write_all(updates: dict[Path, str]) -> None:
    originals = {path: path.read_text(encoding="utf-8") for path in updates}
    written: list[Path] = []
    try:
        for path, content in updates.items():
            _atomic_write(path, content)
            written.append(path)
    except BaseException:
        for path in reversed(written):
            _atomic_write(path, originals[path])
        raise


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "version", help="major, minor, patch, or an exact major.minor.patch version",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="repository root (default: current directory)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="validate and print the change without writing files",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = args.root.resolve()
    files = VersionFiles(
        pyproject=root / "pyproject.toml",
        frontend_package=root / "frontend/package.json",
        frontend_lock=root / "frontend/package-lock.json",
        frontend_nix=root / "frontend/default.nix",
    )
    try:
        current = _read_current_version(files)
        updated = _next_version(current, args.version)
        updates = _updated_contents(files, updated)
        if not args.dry_run:
            _write_all(updates)
    except (
        KeyError,
        OSError,
        ValueError,
        json.JSONDecodeError,
        tomllib.TOMLDecodeError,
    ) as error:
        print(
            json.dumps({"event": "release_version_bump_failed", "error": str(error)}),
            file=sys.stderr,
        )
        return 1

    print(
        json.dumps(
            {
                "event": "release_version_bump",
                "from": current,
                "to": updated,
                "dry_run": args.dry_run,
            },
        ),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
