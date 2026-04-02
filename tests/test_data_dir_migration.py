from __future__ import annotations

import base64
import os
import subprocess
import sys
from io import BytesIO
from pathlib import Path

from lx_annotate.storage.encryption import iter_decrypted_chunks


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "scripts" / "migrate_data_dir.py"


def test_migrate_data_dir_moves_repo_data_and_copies_env_file(tmp_path):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"
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
    assert (target_data.parent / ".env.systemd").read_text(encoding="utf-8") == (
        f"DATA_DIR={target_data}\n"
        f"LX_ANNOTATE_ENCRYPTED_DATA_DIR={target_data}\n"
        f"LX_ANNOTATE_DATA_DIR={target_data}\n"
        f"STORAGE_DIR={target_data}\n"
        f"IO_DIR={target_data}\n"
    )
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
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"
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
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"
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
    assert (state_root / ".env.systemd").read_text(
        encoding="utf-8"
    ) == "DJANGO_ENV=production\n"
    assert (repo_root / "data").exists() is False
    backup_dirs = sorted(repo_root.glob("data.migration-backup-*"))
    assert len(backup_dirs) == 1


def test_migrate_data_dir_fails_when_target_has_insufficient_space(
    tmp_path, monkeypatch
):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"
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


def test_migrate_data_dir_defaults_to_var_lib_target(tmp_path, monkeypatch):
    monkeypatch.delenv("LX_ANNOTATE_DATA_DIR", raising=False)
    monkeypatch.delenv("DATA_DIR", raising=False)

    import scripts.migrate_data_dir as migrate_mod

    assert migrate_mod.resolve_target_data_dir(None) == Path(
        "/var/lib/lx-annotate/data"
    )


def test_migrate_data_dir_rolls_back_source_and_quarantines_partial_target(
    tmp_path, monkeypatch
):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"
    source_data.mkdir(parents=True)
    (source_data / "reports").mkdir()
    (source_data / "reports" / "example.txt").write_text("payload", encoding="utf-8")

    import scripts.migrate_data_dir as migrate_mod
    import pytest

    original_copy_tree = migrate_mod.copy_tree_preserving_source

    def broken_copy_tree(source_dir, target_dir):
        actions = original_copy_tree(source_dir, target_dir)
        raise RuntimeError(f"simulated copy failure {actions}")

    monkeypatch.setattr(migrate_mod, "copy_tree_preserving_source", broken_copy_tree)

    with pytest.raises(RuntimeError, match="simulated copy failure"):
        migrate_mod.migrate_repo_data(
            repo_root=repo_root,
            target_dir=target_data,
        )

    assert (source_data / "reports" / "example.txt").read_text(
        encoding="utf-8"
    ) == "payload"
    failed_targets = sorted(target_data.parent.glob("data.failed-migration-*"))
    assert len(failed_targets) == 1
    assert (failed_targets[0] / "reports" / "example.txt").read_text(
        encoding="utf-8"
    ) == "payload"


def test_migrate_data_dir_encrypts_managed_video_payloads(tmp_path, monkeypatch):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"
    sensitive_videos = source_data / "sensitive_videos"
    sensitive_videos.mkdir(parents=True)
    plaintext = b"legacy-video-payload"
    (sensitive_videos / "clip.mp4").write_bytes(plaintext)
    monkeypatch.setenv(
        "LX_ANNOTATE_MASTER_KEY",
        base64.urlsafe_b64encode(os.urandom(32)).decode("ascii"),
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
    migrated_file = target_data / "sensitive_videos" / "clip.mp4"
    ciphertext = migrated_file.read_bytes()
    assert plaintext not in ciphertext
    decrypted = b"".join(
        iter_decrypted_chunks(
            BytesIO(ciphertext),
            master_key=base64.urlsafe_b64decode(os.environ["LX_ANNOTATE_MASTER_KEY"]),
        )
    )
    assert decrypted == plaintext


def test_migrate_data_dir_allow_merge_populates_existing_empty_directories(
    tmp_path, monkeypatch
):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"
    target_data.mkdir(parents=True)

    sensitive_videos = source_data / "sensitive_videos"
    sensitive_videos.mkdir(parents=True)
    plaintext = b"legacy-video-payload"
    (sensitive_videos / "clip.mp4").write_bytes(plaintext)

    # Existing empty managed directory should not block recursive merge.
    (target_data / "sensitive_videos").mkdir(parents=True)

    monkeypatch.setenv(
        "LX_ANNOTATE_MASTER_KEY",
        base64.urlsafe_b64encode(os.urandom(32)).decode("ascii"),
    )

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--repo-root",
            str(repo_root),
            "--target",
            str(target_data),
            "--allow-merge",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    migrated_file = target_data / "sensitive_videos" / "clip.mp4"
    assert migrated_file.read_bytes() == plaintext


def test_migrate_data_dir_allow_merge_skips_existing_files_but_copies_missing_ones(
    tmp_path,
):
    repo_root = tmp_path / "repo"
    source_data = repo_root / "data"
    target_data = tmp_path / "var" / "lib" / "lx-annotate" / "data"

    reports_dir = source_data / "reports"
    reports_dir.mkdir(parents=True)
    (reports_dir / "existing.txt").write_text("source-existing", encoding="utf-8")
    (reports_dir / "missing.txt").write_text("source-missing", encoding="utf-8")

    target_reports = target_data / "reports"
    target_reports.mkdir(parents=True)
    (target_reports / "existing.txt").write_text("target-existing", encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT_PATH),
            "--repo-root",
            str(repo_root),
            "--target",
            str(target_data),
            "--allow-merge",
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
    assert (target_reports / "existing.txt").read_text(
        encoding="utf-8"
    ) == "target-existing"
    assert (target_reports / "missing.txt").read_text(
        encoding="utf-8"
    ) == "source-missing"
