from __future__ import annotations

import json
import sys
import tomllib
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_release_version_has_one_repository_policy() -> None:
    pyproject = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text())
    frontend_package = json.loads(
        (REPO_ROOT / "frontend" / "package.json").read_text(encoding="utf-8")
    )
    frontend_lock = json.loads(
        (REPO_ROOT / "frontend" / "package-lock.json").read_text(encoding="utf-8")
    )

    release_version = pyproject["project"]["version"]
    assert frontend_package["version"] == release_version
    assert frontend_lock["version"] == release_version
    assert frontend_lock["packages"][""]["version"] == release_version


def test_python_wheel_exposes_runtime_console_scripts():
    pyproject = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text())

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
        "lx-annotate-recover-data": "lx_annotate.cli:recover_data",
        "lx-annotate-bootstrap-terminology": ("lx_annotate.cli:bootstrap_terminology"),
        "lx-annotate-provision-hub-nodes": "lx_annotate.cli:provision_hub_nodes",
        "lx-annotate-storage-relief": "lx_annotate.cli:storage_relief",
        "lx-annotate-acceptance": "lx_annotate.cli:acceptance",
    }
    assert pyproject["project"]["scripts"].items() >= expected_scripts.items()


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
        REPO_ROOT / "lx_annotate" / "services" / "runtime_recovery.py",
        REPO_ROOT / "lx_annotate" / "settings" / "settings_base.py",
    )

    for source_path in production_sources:
        source = source_path.read_text(encoding="utf-8")
        assert "os.makedirs(" not in source
        assert ".mkdir(" not in source


@pytest.mark.parametrize(
    ("function_name", "management_command"),
    [
        ("recover_data", "recover_runtime_data"),
        ("provision_hub_nodes", "provision_hub_nodes"),
        ("storage_relief", "emergency_storage_relief"),
        ("acceptance", "runtime_acceptance"),
    ],
)
def test_operational_entrypoints_delegate_to_management_commands(
    monkeypatch: pytest.MonkeyPatch,
    function_name: str,
    management_command: str,
):
    from lx_annotate import cli

    manage_calls: list[list[str]] = []
    monkeypatch.setattr(
        cli,
        "manage",
        lambda args: manage_calls.append(list(args)) or 0,
    )

    assert getattr(cli, function_name)(["--example"]) == 0
    assert manage_calls == [[management_command, "--example"]]


def test_manage_exposes_command_to_app_startup_and_restores_argv(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from lx_annotate import cli

    original_argv = list(sys.argv)
    observed: list[list[str]] = []

    def fake_execute(argv: list[str]) -> None:
        observed.append(list(sys.argv))
        assert argv == ["lx-annotate-manage", "recover_runtime_data", "--help"]

    monkeypatch.setattr(
        "django.core.management.execute_from_command_line", fake_execute
    )

    assert cli.manage(["recover_runtime_data", "--help"]) == 0
    assert observed == [["lx-annotate-manage", "recover_runtime_data", "--help"]]
    assert sys.argv == original_argv
