from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

import scripts.migrate_data_dir as migrate_mod


def test_resolve_target_data_dir_defaults_to_var_lib_path():
    assert migrate_mod.resolve_target_data_dir(None) == Path(
        "/var/lib/lx-annotate/data"
    )


def test_build_management_command_passes_expected_arguments(tmp_path):
    source_root = tmp_path / "legacy-data"
    command = migrate_mod.build_management_command(
        source_root=source_root,
        dry_run=True,
        manifest_path="/tmp/manifest.json",
    )

    assert command == [
        migrate_mod.sys.executable,
        str(migrate_mod.REPO_ROOT / "manage.py"),
        "migrate_data_dir",
        str(source_root),
        "--dry-run",
        "--manifest-path",
        "/tmp/manifest.json",
    ]


def test_build_management_env_scopes_runtime_paths_to_target(tmp_path):
    target_dir = tmp_path / "var" / "lib" / "lx-annotate" / "data"

    env = migrate_mod.build_management_env(target_dir=target_dir)

    assert env["LX_ANNOTATE_ENCRYPTED_DATA_DIR"] == str(target_dir)
    assert env["LX_ANNOTATE_DATA_DIR"] == str(target_dir)
    assert env["IO_DIR"] == str(target_dir)
    assert (
        env["LX_ANNOTATE_DEFAULT_CENTER"]
        == migrate_mod.DEFAULT_WATCHER_CENTER_REFERENCE
    )


def test_build_management_env_preserves_explicit_default_center(tmp_path, monkeypatch):
    target_dir = tmp_path / "var" / "lib" / "lx-annotate" / "data"
    monkeypatch.setenv("LX_ANNOTATE_DEFAULT_CENTER", "custom-center-key")

    env = migrate_mod.build_management_env(target_dir=target_dir)

    assert env["LX_ANNOTATE_DEFAULT_CENTER"] == "custom-center-key"


def test_build_watcher_reconcile_command_targets_manage_py_shell():
    command = migrate_mod.build_watcher_reconcile_command()

    assert command[:4] == [
        migrate_mod.sys.executable,
        str(migrate_mod.REPO_ROOT / "manage.py"),
        "shell",
        "-c",
    ]
    assert 'source_system="migration"' in command[4]
    assert "LX_ANNOTATE_DEFAULT_CENTER" in command[4]


def test_run_migration_delegates_to_manage_py_with_source_root(tmp_path, monkeypatch):
    repo_root = tmp_path / "repo"
    target_dir = tmp_path / "runtime" / "data"
    source_root = repo_root / "data"
    repo_root.mkdir()

    recorded: dict[str, object] = {}

    calls: list[tuple[list[str], dict[str, str], bool]] = []

    def fake_run(command, env, check):
        recorded["command"] = command
        recorded["env"] = env
        recorded["check"] = check
        calls.append((command, env, check))
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(migrate_mod.subprocess, "run", fake_run)

    result = migrate_mod.run_migration(
        repo_root=repo_root,
        target_dir=target_dir,
        dry_run=False,
        manifest_path="/tmp/migrate.json",
    )

    assert result == 0
    assert recorded["check"] is False
    assert calls[0][0] == [
        migrate_mod.sys.executable,
        str(migrate_mod.REPO_ROOT / "manage.py"),
        "migrate_data_dir",
        str(source_root.resolve()),
        "--manifest-path",
        "/tmp/migrate.json",
    ]
    env = calls[0][1]
    assert isinstance(env, dict)
    assert env["LX_ANNOTATE_ENCRYPTED_DATA_DIR"] == str(target_dir)
    assert env["STORAGE_DIR"] == str(target_dir / "storage")
    assert env["IO_DIR"] == str(target_dir)
    assert len(calls) == 2
    assert calls[1][0][:4] == [
        migrate_mod.sys.executable,
        str(migrate_mod.REPO_ROOT / "manage.py"),
        "shell",
        "-c",
    ]


def test_run_migration_skips_reconcile_on_dry_run(tmp_path, monkeypatch):
    repo_root = tmp_path / "repo"
    target_dir = tmp_path / "runtime" / "data"
    repo_root.mkdir()
    calls: list[list[str]] = []

    def fake_run(command, env, check):
        calls.append(command)
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(migrate_mod.subprocess, "run", fake_run)

    result = migrate_mod.run_migration(
        repo_root=repo_root,
        target_dir=target_dir,
        dry_run=True,
        manifest_path="",
    )

    assert result == 0
    assert len(calls) == 1


def test_run_migration_skips_reconcile_after_failure(tmp_path, monkeypatch):
    repo_root = tmp_path / "repo"
    target_dir = tmp_path / "runtime" / "data"
    repo_root.mkdir()
    calls: list[list[str]] = []

    def fake_run(command, env, check):
        calls.append(command)
        return subprocess.CompletedProcess(command, 9)

    monkeypatch.setattr(migrate_mod.subprocess, "run", fake_run)

    result = migrate_mod.run_migration(
        repo_root=repo_root,
        target_dir=target_dir,
        dry_run=False,
        manifest_path="",
    )

    assert result == 9
    assert len(calls) == 1


def test_main_returns_delegated_exit_code(monkeypatch, tmp_path):
    repo_root = tmp_path / "repo"
    repo_root.mkdir()

    monkeypatch.setattr(
        migrate_mod,
        "run_migration",
        lambda **_kwargs: 7,
    )

    result = migrate_mod.main(
        [
            "--repo-root",
            str(repo_root),
            "--target",
            str(tmp_path / "target"),
        ]
    )

    assert result == 7


def test_main_rejects_allow_merge(monkeypatch, tmp_path):
    repo_root = tmp_path / "repo"
    repo_root.mkdir()

    with pytest.raises(SystemExit) as exc_info:
        migrate_mod.main(
            [
                "--repo-root",
                str(repo_root),
                "--target",
                str(tmp_path / "target"),
                "--allow-merge",
            ]
        )

    assert exc_info.value.code == 2
