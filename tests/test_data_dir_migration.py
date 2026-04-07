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
    assert env["DATA_DIR"] == str(target_dir)
    assert env["STORAGE_DIR"] == str(target_dir / "storage")
    assert env["IO_DIR"] == str(target_dir)


def test_run_migration_delegates_to_manage_py_with_source_root(tmp_path, monkeypatch):
    repo_root = tmp_path / "repo"
    target_dir = tmp_path / "runtime" / "data"
    source_root = repo_root / "data"
    repo_root.mkdir()

    recorded: dict[str, object] = {}

    def fake_run(command, env, check):
        recorded["command"] = command
        recorded["env"] = env
        recorded["check"] = check
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(migrate_mod.subprocess, "run", fake_run)

    result = migrate_mod.run_migration(
        repo_root=repo_root,
        target_dir=target_dir,
        dry_run=True,
        manifest_path="/tmp/migrate.json",
    )

    assert result == 0
    assert recorded["check"] is False
    assert recorded["command"] == [
        migrate_mod.sys.executable,
        str(migrate_mod.REPO_ROOT / "manage.py"),
        "migrate_data_dir",
        str(source_root.resolve()),
        "--dry-run",
        "--manifest-path",
        "/tmp/migrate.json",
    ]
    env = recorded["env"]
    assert isinstance(env, dict)
    assert env["LX_ANNOTATE_ENCRYPTED_DATA_DIR"] == str(target_dir)
    assert env["STORAGE_DIR"] == str(target_dir / "storage")
    assert env["IO_DIR"] == str(target_dir)


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
