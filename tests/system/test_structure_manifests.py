from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest
import yaml
from endoreg_db.utils.file_operations import (
    atomic_write_file,
    ensure_directory,
    safe_unlink_file,
)

from scripts.lint_structure import validate

ROOT = Path(__file__).resolve().parents[2]


def write(path: Path, content: str) -> None:
    ensure_directory(path.parent)
    encoded = content.encode()
    atomic_write_file(destination=path, content=(encoded,), required_bytes=len(encoded))


def manifest(path: str = ".", parent: str | None = None) -> dict:
    return {
        "version": 1,
        "tier": "root" if path == "." else "domain",
        "path": path,
        "parent": parent,
        "summary": "Validator test source tree.",
        "responsibilities": ["Exercise graph validation."],
        "boundaries": [],
        "entrypoints": [],
        "dependencies": {"internal": [], "external": []},
        "submodules": [],
        "contracts": [],
        "tests": {"directory": ".", "command": "python -m pytest"},
    }


def save(root: Path, data: dict, directory: str = ".") -> None:
    write(root / directory / "structure.yml", yaml.safe_dump(data))


@pytest.fixture
def source_tree(tmp_path: Path) -> Path:
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    data = manifest()
    data["submodules"] = [
        {
            "name": "app",
            "path": "app",
            "manifest": "app/structure.yml",
            "summary": "Test domain.",
        }
    ]
    save(tmp_path, data)
    save(tmp_path, manifest("app", "../structure.yml"), "app")
    write(tmp_path / "app/entry.py", "# Test source\n")
    return tmp_path


def test_repository_graph() -> None:
    assert validate(ROOT) == []


def test_valid_graph_preserves_custom_metadata(source_tree: Path) -> None:
    data = manifest("app", "../structure.yml")
    data["ownership"] = {"team": "maintainers", "protocol": "mTLS"}
    data["files"] = ["entry.py"]
    data["entrypoints"] = [
        {"name": "entry", "file": "entry.py", "purpose": "Test entry."}
    ]
    data["contracts"] = [{"name": "spec", "doc": "entry.py"}]
    data["dependencies"]["internal"] = ["app"]
    write(source_tree / "app/entry.py", "# Test source\n")
    save(source_tree, data, "app")
    before = (source_tree / "app/structure.yml").read_bytes()
    assert validate(source_tree) == []
    assert (source_tree / "app/structure.yml").read_bytes() == before


@pytest.mark.parametrize(
    "key,value,message",
    [
        ("version", True, "version must"),
        ("tier", "invalid", "invalid tier"),
        ("summary", "", "summary must"),
        ("responsibilities", [], "responsibilities must"),
        ("boundaries", "bad", "boundaries must"),
        ("dependencies", {"internal": [], "external": "bad"}, "external must"),
        ("path", "wrong", "path must match"),
        ("parent", None, "parent must"),
        ("parent", "missing.yml", "missing path"),
        ("parent", "structure.yml", "parent does not match caller"),
        (
            "entrypoints",
            [{"name": "bad", "file": "missing.py", "purpose": "Test"}],
            "missing path",
        ),
        ("files", ["missing.py"], "missing path"),
        ("contracts", [{"name": "bad", "doc": "missing.md"}], "missing path"),
        ("tests", {"directory": "missing", "command": "pytest"}, "missing path"),
        (
            "entrypoints",
            [{"name": "bad", "file": ".", "purpose": "Test"}],
            "expected a file",
        ),
        ("files", ["../../outside.py"], "escapes repository"),
        ("files", ["/etc/passwd"], "absolute paths"),
    ],
)
def test_invalid_schema_and_references(source_tree: Path, key, value, message) -> None:
    data = manifest("app", "../structure.yml")
    data[key] = value
    save(source_tree, data, "app")
    assert any(message in error for error in validate(source_tree))


def test_missing_required_key(source_tree: Path) -> None:
    data = manifest("app", "../structure.yml")
    del data["parent"]
    save(source_tree, data, "app")
    assert any(
        "missing required keys: parent" in error for error in validate(source_tree)
    )


def test_orphan_and_missing_child(source_tree: Path) -> None:
    save(source_tree, manifest("orphan", "../structure.yml"), "orphan")
    assert any("unreachable from root" in error for error in validate(source_tree))
    safe_unlink_file(source_tree / "app/structure.yml")
    assert any(
        "submodule.manifest: missing path" in error for error in validate(source_tree)
    )


def test_duplicate_child_link(source_tree: Path) -> None:
    data = yaml.safe_load((source_tree / "structure.yml").read_text())
    data["submodules"].append({**data["submodules"][0], "name": "alias"})
    save(source_tree, data)
    assert any("exactly one parent link" in error for error in validate(source_tree))


def test_child_manifest_matches_directory(source_tree: Path) -> None:
    data = yaml.safe_load((source_tree / "structure.yml").read_text())
    data["submodules"][0]["manifest"] = "structure.yml"
    save(source_tree, data)
    assert any("structure.yml in its path" in error for error in validate(source_tree))


def test_scope_ignores_dependencies_but_catches_deleted_tracked_manifest(
    source_tree: Path,
) -> None:
    write(source_tree / ".gitignore", "node_modules/\nmedia/\n")
    write(source_tree / "node_modules/structure.yml", "invalid: true\n")
    write(source_tree / "media/structure.yml", "invalid: true\n")
    assert validate(source_tree) == []
    subprocess.run(
        ["git", "add", "structure.yml", "app/structure.yml"],
        cwd=source_tree,
        check=True,
    )
    safe_unlink_file(source_tree / "app/structure.yml")
    assert any("app/structure.yml:" in error for error in validate(source_tree))


def test_ignored_reference_is_rejected(source_tree: Path) -> None:
    write(source_tree / ".gitignore", "ignored.py\n")
    write(source_tree / "app/ignored.py", "# Ignored\n")
    data = manifest("app", "../structure.yml")
    data["files"] = ["ignored.py"]
    save(source_tree, data, "app")
    assert any("outside Git source scope" in error for error in validate(source_tree))


@pytest.mark.parametrize(
    "content", ["version: 1\nversion: 2\n", "[broken", "[]", "null"]
)
def test_malformed_yaml_fails(source_tree: Path, content: str) -> None:
    write(source_tree / "app/structure.yml", content)
    assert validate(source_tree)


def test_cli_exit_status(source_tree: Path) -> None:
    command = [
        sys.executable,
        str(ROOT / "scripts/lint_structure.py"),
        "--root",
        str(source_tree),
    ]
    assert subprocess.run(command, capture_output=True).returncode == 0
    safe_unlink_file(source_tree / "structure.yml")
    result = subprocess.run(command, capture_output=True, text=True)
    assert result.returncode == 1
    assert "root manifest is missing" in result.stdout


def test_gates_run_full_graph() -> None:
    hooks = yaml.safe_load((ROOT / ".pre-commit-config.yaml").read_text())
    hook = next(
        hook
        for repo in hooks["repos"]
        for hook in repo["hooks"]
        if hook["id"] == "structure-manifests"
    )
    assert hook["entry"] == "python scripts/lint_structure.py"
    assert hook["pass_filenames"] is False
    assert hook["always_run"] is True
    for target in ("test", "test-real", "lint"):
        result = subprocess.run(
            ["make", "-n", target, "DEVENV_RUN="],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        assert result.stdout.splitlines()[0].endswith(
            "python scripts/lint_structure.py"
        )
