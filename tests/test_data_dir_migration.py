from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "migrate_data_dir.py"


def test_migrate_data_dir_moves_repo_data_and_copies_env_file(tmp_path):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate"
    source_data.mkdir(parents=True)
    (source_data / "reports").mkdir()
    (source_data / "reports" / "example.txt").write_text("payload", encoding="utf-8")
    (repo_root / ".env.systemd").write_text(
        "DATA_DIR=/old/repo/data\n", encoding="utf-8"
    )

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--repo-root",
            str(repo_root),
            "--target",
            str(target_data),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert (target_data / "reports" / "example.txt").read_text(
        encoding="utf-8"
    ) == "payload"
    assert (target_data / ".env.systemd").read_text(
        encoding="utf-8"
    ) == "DATA_DIR=/old/repo/data\n"
    backup_dirs = sorted(repo_root.glob("data.migration-backup-*"))
    assert len(backup_dirs) == 1
    assert (backup_dirs[0] / "reports" / "example.txt").read_text(
        encoding="utf-8"
    ) == "payload"
    assert not source_data.exists()
    assert (repo_root / ".env.systemd").exists()
    assert (target_data / ".migration-complete").exists()


def test_migrate_data_dir_dry_run_leaves_source_untouched(tmp_path):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate"
    source_data.mkdir(parents=True)
    (source_data / "video.bin").write_bytes(b"abc")

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--repo-root",
            str(repo_root),
            "--target",
            str(target_data),
            "--dry-run",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert (source_data / "video.bin").exists()
    assert not target_data.exists()


def test_migrate_data_dir_refuses_split_state_by_default(tmp_path):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate"
    source_data.mkdir(parents=True)
    target_data.mkdir(parents=True)
    (source_data / "source.bin").write_bytes(b"src")
    (target_data / "target.bin").write_bytes(b"dst")

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--repo-root",
            str(repo_root),
            "--target",
            str(target_data),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 1
    assert "both source and target contain data" in result.stderr


def test_migrate_data_dir_allows_dedicated_data_target_under_nonempty_state_root(
    tmp_path,
):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    state_root = tmp_path / "var" / "lib" / "lx-annotate"
    target_data = state_root / "data"

    source_data.mkdir(parents=True)
    (source_data / "reports").mkdir()
    (source_data / "reports" / "example.txt").write_text("payload", encoding="utf-8")

    # Mirror deployment layout where /var/lib/lx-annotate already contains
    # runtime state that is not part of the data migration target.
    (state_root / "staticfiles" / ".vite").mkdir(parents=True)
    (state_root / "ssl").mkdir(parents=True)
    (state_root / ".env.systemd").write_text(
        "DJANGO_ENV=production\n", encoding="utf-8"
    )

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--repo-root",
            str(repo_root),
            "--target",
            str(target_data),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert (target_data / "reports" / "example.txt").read_text(
        encoding="utf-8"
    ) == "payload"
    assert (state_root / "staticfiles" / ".vite").is_dir()
    assert (state_root / "ssl").is_dir()
    assert (repo_root / "data").exists() is False
    backup_dirs = sorted(repo_root.glob("data.migration-backup-*"))
    assert len(backup_dirs) == 1


def test_migrate_data_dir_fails_when_target_has_insufficient_space(
    tmp_path, monkeypatch
):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate"
    source_data.mkdir(parents=True)
    target_data.mkdir(parents=True)
    (source_data / "big.bin").write_bytes(b"0123456789")

    import scripts.migrate_data_dir as migrate_mod
    import pytest
    from types import SimpleNamespace

    def fake_disk_usage(_path):
        return SimpleNamespace(total=100, used=95, free=5)

    monkeypatch.setattr(migrate_mod.shutil, "disk_usage", fake_disk_usage)

    with pytest.raises(RuntimeError, match="Insufficient free space"):
        migrate_mod.migrate_repo_data(
            repo_root=repo_root,
            target_dir=target_data,
        )
