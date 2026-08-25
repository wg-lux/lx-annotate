from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "bump_release_version.py"


def _copy_release_files(destination: Path) -> None:
    (destination / "frontend").mkdir()
    for relative_path in (
        "pyproject.toml",
        "frontend/package.json",
        "frontend/package-lock.json",
        "frontend/default.nix",
    ):
        source = REPO_ROOT / relative_path
        target = destination / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def _versions(root: Path) -> set[str]:
    pyproject = tomllib.loads((root / "pyproject.toml").read_text(encoding="utf-8"))
    package = json.loads((root / "frontend/package.json").read_text(encoding="utf-8"))
    lock = json.loads((root / "frontend/package-lock.json").read_text(encoding="utf-8"))
    nix_version = next(
        line.split('"')[1]
        for line in (root / "frontend/default.nix")
        .read_text(encoding="utf-8")
        .splitlines()
        if line.startswith("  version = ")
    )
    return {
        pyproject["project"]["version"],
        package["version"],
        lock["version"],
        lock["packages"][""]["version"],
        nix_version,
    }


def _patch_bump(version: str) -> str:
    major, minor, patch = (int(part) for part in version.split("."))
    return f"{major}.{minor}.{patch + 1}"


def test_release_version_bump_updates_all_release_fields(tmp_path: Path) -> None:
    _copy_release_files(tmp_path)
    current = next(iter(_versions(tmp_path)))
    expected = _patch_bump(current)

    result = subprocess.run(
        [sys.executable, str(SCRIPT), "patch", "--root", str(tmp_path)],
        check=True,
        capture_output=True,
        text=True,
    )

    assert _versions(tmp_path) == {expected}
    assert json.loads(result.stdout) == {
        "event": "release_version_bump",
        "from": current,
        "to": expected,
        "dry_run": False,
    }


def test_release_version_bump_dry_run_does_not_write(tmp_path: Path) -> None:
    _copy_release_files(tmp_path)
    current = _versions(tmp_path)

    subprocess.run(
        [sys.executable, str(SCRIPT), "2.0.0", "--root", str(tmp_path), "--dry-run"],
        check=True,
    )

    assert _versions(tmp_path) == current
