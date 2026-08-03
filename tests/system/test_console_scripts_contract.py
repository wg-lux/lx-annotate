from __future__ import annotations

import tomllib
from pathlib import Path

import pytest
from packaging.requirements import Requirement

REPO_ROOT = Path(__file__).resolve().parents[2]


def _project_metadata() -> dict:
    return tomllib.loads((REPO_ROOT / "pyproject.toml").read_text())


def test_python_wheel_exposes_runtime_console_scripts():
    pyproject = _project_metadata()

    expected_scripts = {
        "lx-annotate-web": "lx_annotate.cli:web",
        "lx-annotate-server": "lx_annotate.cli:web",
        "lx-annotate-manage": "lx_annotate.cli:manage",
        "lx-annotate-migrate": "lx_annotate.cli:migrate",
        "lx-annotate-load-base-data": "lx_annotate.cli:load_base_data",
        "lx-annotate-worker": "lx_annotate.cli:worker",
        "lx-annotate-celery": "lx_annotate.cli:celery",
        "lx-annotate-watch": "lx_annotate.cli:watch",
        "lx-annotate-export-frames": "lx_annotate.cli:export_frames",
        "lx-annotate-import-sap": "lx_annotate.cli:import_sap",
        "lx-annotate-bootstrap-terminology": ("lx_annotate.cli:bootstrap_terminology"),
    }
    assert pyproject["project"]["scripts"].items() >= expected_scripts.items()


def test_python_wheel_does_not_ship_development_tools_as_runtime_dependencies():
    pyproject = _project_metadata()
    runtime_names = {
        Requirement(requirement).name.lower()
        for requirement in pyproject["project"]["dependencies"]
    }
    forbidden_runtime_dependencies = {
        "black",
        "build",
        "django-rest-framework",
        "django-stubs",
        "mypy",
        "pre-commit",
        "pytest",
        "pytest-cov",
        "pytest-django",
        "types-requests",
    }

    assert runtime_names.isdisjoint(forbidden_runtime_dependencies)
    dev_dependencies = "\n".join(pyproject["project"]["optional-dependencies"]["dev"])
    for required_tool in (
        "black",
        "build",
        "django-stubs",
        "mypy",
        "pre-commit",
        "pytest",
        "pytest-cov",
        "pytest-django",
        "types-requests",
    ):
        assert required_tool in dev_dependencies


def test_cli_entrypoints_keep_luxnix_compatibility_aliases():
    from lx_annotate import cli

    assert cli._normalise_worker_args(["--queue=inference"]) == ["--queues=inference"]
    assert cli._normalise_worker_args(["--queue", "maintenance,default"]) == [
        "--queues",
        "maintenance,default",
    ]
    assert cli._normalise_watch_args(["--once", "--log-level", "INFO"]) == [
        "--process-existing-once",
        "--log-level",
        "INFO",
    ]


def test_export_frames_delegates_default_output_directory_to_command(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
):
    from lx_annotate import cli

    output_dir = tmp_path / "export" / "frames"
    monkeypatch.setenv("LX_ANNOTATE_EXPORT_FRAMES_OUTPUT_DIR", str(output_dir))
    manage_calls: list[list[str]] = []
    monkeypatch.setattr(
        cli,
        "manage",
        lambda args: manage_calls.append(list(args)) or 0,
    )

    assert cli.export_frames(["--limit", "1"]) == 0

    assert manage_calls == [
        [
            "export_frame_annot",
            "--output-dir",
            str(output_dir),
            "--limit",
            "1",
        ]
    ]
    assert not output_dir.exists()


def test_export_frames_preserves_explicit_output_path(
    monkeypatch: pytest.MonkeyPatch,
):
    from lx_annotate import cli

    manage_calls: list[list[str]] = []
    monkeypatch.setattr(
        cli,
        "manage",
        lambda args: manage_calls.append(list(args)) or 0,
    )

    assert cli.export_frames(["--output-path=annotations.json"]) == 0
    assert manage_calls == [["export_frame_annot", "--output-path=annotations.json"]]


def test_application_filesystem_mutations_do_not_bypass_canonical_boundary():
    production_sources = (
        REPO_ROOT / "lx_annotate" / "cli.py",
        REPO_ROOT / "lx_annotate" / "settings" / "settings_base.py",
    )

    for source_path in production_sources:
        source = source_path.read_text(encoding="utf-8")
        assert "os.makedirs(" not in source
        assert ".mkdir(" not in source
