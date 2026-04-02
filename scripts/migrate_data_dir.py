#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import os
import shutil
import sys
import time
from pathlib import Path

# Allow direct execution via `python scripts/migrate_data_dir.py` by making the
# repository root importable before importing app modules.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from lx_annotate.storage.encryption import MAGIC, encrypt_stream, load_master_key

DEFAULT_TARGET_DATA_DIR = Path("/var/lib/lx-annotate/data")
DATA_DIR_ENV_KEYS = (
    "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
    "DATA_DIR",
    "LX_ANNOTATE_DATA_DIR",
    "STORAGE_DIR",
    "IO_DIR",
)
MANAGED_ENCRYPTED_ROOTS = {
    "documents",
    "model_weights",
    "processed_reports_final",
    "processed_videos_final",
    "sensitive_reports",
    "sensitive_videos",
    "uploads",
}


def default_repo_root() -> Path:
    return REPO_ROOT


def resolve_target_data_dir(raw_target: str | None) -> Path:
    if not raw_target:
        return DEFAULT_TARGET_DATA_DIR
    return Path(raw_target).expanduser().resolve()


def require_writable_directory(path: Path, *, create: bool) -> None:
    directory = path
    if create:
        directory.mkdir(parents=True, exist_ok=True)
    if not directory.exists():
        raise FileNotFoundError(f"Directory does not exist: {directory}")
    if not directory.is_dir():
        raise NotADirectoryError(f"Expected directory: {directory}")

    probe = directory / f".lx-annotate-write-test-{os.getpid()}"
    try:
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except OSError as exc:
        raise PermissionError(f"Directory is not writable: {directory}") from exc


def fsync_file(path: Path | str) -> None:
    path = Path(path)
    with path.open("rb") as handle:
        os.fsync(handle.fileno())


def fsync_directory(path: Path) -> None:
    fd = os.open(path, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def atomic_copy2(source: Path | str, destination: Path | str) -> Path:
    source = Path(source)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_destination = destination.with_name(
        f".{destination.name}.lx-annotate-part-{os.getpid()}"
    )
    if temp_destination.exists():
        temp_destination.unlink()
    shutil.copy2(source, temp_destination)
    fsync_file(temp_destination)
    os.replace(temp_destination, destination)
    fsync_directory(destination.parent)
    return destination


def atomic_encrypt_copy(source: Path | str, destination: Path | str, *, master_key: bytes) -> Path:
    source = Path(source)
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp_destination = destination.with_name(
        f".{destination.name}.lx-annotate-part-{os.getpid()}"
    )
    if temp_destination.exists():
        temp_destination.unlink()
    with source.open("rb") as source_handle, temp_destination.open("wb") as dest_handle:
        encrypt_stream(source_handle, dest_handle, master_key=master_key)
        dest_handle.flush()
        os.fsync(dest_handle.fileno())
    os.replace(temp_destination, destination)
    fsync_directory(destination.parent)
    return destination


def atomic_write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.lx-annotate-part-{os.getpid()}")
    if temp_path.exists():
        temp_path.unlink()
    temp_path.write_text(content, encoding="utf-8")
    fsync_file(temp_path)
    os.replace(temp_path, path)
    fsync_directory(path.parent)


def is_same_filesystem(left: Path, right: Path) -> bool:
    return left.stat().st_dev == right.stat().st_dev


def is_managed_encrypted_relative_path(relative_path: Path) -> bool:
    return bool(relative_path.parts) and relative_path.parts[0] in MANAGED_ENCRYPTED_ROOTS


def is_already_encrypted(path: Path) -> bool:
    with path.open("rb") as handle:
        return handle.read(len(MAGIC)) == MAGIC


def list_entries(path: Path) -> list[Path]:
    if not path.exists():
        return []
    return sorted(path.iterdir(), key=lambda entry: entry.name)


def tree_size_bytes(path: Path) -> int:
    total = 0
    for root, dirs, files in os.walk(path):
        del dirs
        for file_name in files:
            file_path = Path(root) / file_name
            total += file_path.stat().st_size
    return total


def validate_source_tree_readable(path: Path) -> None:
    for root, dirs, files in os.walk(path):
        for dir_name in dirs:
            dir_path = Path(root) / dir_name
            if not os.access(dir_path, os.R_OK | os.X_OK):
                raise PermissionError(f"Directory is not readable/searchable: {dir_path}")
        for file_name in files:
            file_path = Path(root) / file_name
            if not os.access(file_path, os.R_OK):
                raise PermissionError(f"File is not readable: {file_path}")


def validate_target_capacity(*, source_dir: Path, target_dir: Path) -> int:
    source_size = tree_size_bytes(source_dir)
    usage_root = target_dir if target_dir.exists() else target_dir.parent
    usage = shutil.disk_usage(usage_root)
    required_bytes = int(source_size * 1.05) + (128 * 1024 * 1024)
    if usage.free < required_bytes:
        raise RuntimeError(
            "Insufficient free space in target filesystem: "
            f"required={required_bytes} free={usage.free} source={source_size}"
        )
    return source_size


def copy_tree_preserving_source(source_dir: Path, target_dir: Path) -> list[str]:
    actions: list[str] = []
    master_key: bytes | None = None
    target_dir.mkdir(parents=True, exist_ok=True)
    for root, dir_names, file_names in os.walk(source_dir):
        dir_names.sort()
        file_names.sort()
        root_path = Path(root)
        relative_root = root_path.relative_to(source_dir)
        destination_root = target_dir / relative_root
        destination_root.mkdir(parents=True, exist_ok=True)
        for dir_name in dir_names:
            (destination_root / dir_name).mkdir(parents=True, exist_ok=True)
        for file_name in file_names:
            source_file = root_path / file_name
            relative_path = source_file.relative_to(source_dir)
            destination = target_dir / relative_path
            if is_managed_encrypted_relative_path(relative_path):
                if is_already_encrypted(source_file):
                    actions.append(f"copying already-encrypted managed file {source_file} -> {destination}")
                    atomic_copy2(source_file, destination)
                else:
                    if master_key is None:
                        master_key = load_master_key()
                    actions.append(f"encrypting managed file {source_file} -> {destination}")
                    atomic_encrypt_copy(source_file, destination, master_key=master_key)
            else:
                actions.append(f"copying {source_file} -> {destination}")
                atomic_copy2(source_file, destination)
    fsync_directory(target_dir)
    return actions


def merge_tree_preserving_source(source_dir: Path, target_dir: Path) -> list[str]:
    actions: list[str] = []
    master_key: bytes | None = None
    target_dir.mkdir(parents=True, exist_ok=True)
    for root, dir_names, file_names in os.walk(source_dir):
        dir_names.sort()
        file_names.sort()
        root_path = Path(root)
        relative_root = root_path.relative_to(source_dir)
        destination_root = target_dir / relative_root
        destination_root.mkdir(parents=True, exist_ok=True)
        for dir_name in dir_names:
            (destination_root / dir_name).mkdir(parents=True, exist_ok=True)
        for file_name in file_names:
            source_file = root_path / file_name
            relative_path = source_file.relative_to(source_dir)
            destination = target_dir / relative_path
            if destination.exists():
                actions.append(f"WARNING: destination already exists, skipping: {destination}")
                continue
            if is_managed_encrypted_relative_path(relative_path):
                if is_already_encrypted(source_file):
                    actions.append(f"copying already-encrypted managed file {source_file} -> {destination}")
                    atomic_copy2(source_file, destination)
                else:
                    if master_key is None:
                        master_key = load_master_key()
                    actions.append(f"encrypting managed file {source_file} -> {destination}")
                    atomic_encrypt_copy(source_file, destination, master_key=master_key)
            else:
                actions.append(f"copying {source_file} -> {destination}")
                atomic_copy2(source_file, destination)
    fsync_directory(target_dir)
    return actions


def backup_source_dir(source_dir: Path) -> Path:
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    backup_dir = source_dir.with_name(f"{source_dir.name}.migration-backup-{timestamp}")
    if backup_dir.exists():
        raise FileExistsError(f"Backup path already exists: {backup_dir}")
    source_dir.rename(backup_dir)
    fsync_directory(backup_dir.parent)
    return backup_dir


def render_target_env_text(source_text: str, target_data_dir: Path) -> str:
    updated: list[str] = []
    seen: set[str] = set()

    for line in source_text.splitlines():
        key, sep, _value = line.partition("=")
        if sep and key in DATA_DIR_ENV_KEYS:
            updated.append(f"{key}={target_data_dir}")
            seen.add(key)
        else:
            updated.append(line)

    for key in DATA_DIR_ENV_KEYS:
        if key not in seen:
            updated.append(f"{key}={target_data_dir}")

    return "\n".join(updated) + "\n"


def sync_env_file(source_env_file: Path, target_env_file: Path, target_data_dir: Path) -> list[str]:
    actions: list[str] = []
    target_env_file.parent.mkdir(parents=True, exist_ok=True)
    if target_env_file.exists():
        actions.append(
            f"target env file already exists, leaving as source of truth: {target_env_file}"
        )
        return actions

    if source_env_file.exists():
        rendered = render_target_env_text(
            source_env_file.read_text(encoding="utf-8"), target_data_dir
        )
        actions.append(f"copied env file {source_env_file} -> {target_env_file}")
    else:
        rendered = "".join(f"{key}={target_data_dir}\n" for key in DATA_DIR_ENV_KEYS)
        actions.append(f"source env file does not exist: {source_env_file}")
        actions.append(f"created minimal env file at: {target_env_file}")

    atomic_write_text(target_env_file, rendered)
    return actions


def migrate_repo_data(
    *,
    repo_root: Path,
    target_dir: Path,
    dry_run: bool = False,
    allow_merge: bool = False,
) -> list[str]:
    actions: list[str] = []
    source_dir = (repo_root / "data").resolve()
    source_env_file = (repo_root / ".env.systemd").resolve()
    target_env_file = target_dir.parent / ".env.systemd"

    if source_dir == target_dir:
        actions.append(f"source and target are identical: {source_dir}")
        return actions

    source_exists = source_dir.exists()
    target_entries = list_entries(target_dir) if target_dir.exists() else []
    source_entries = list_entries(source_dir) if source_exists else []

    if dry_run and not target_dir.exists():
        require_writable_directory(target_dir.parent, create=True)
    else:
        require_writable_directory(target_dir, create=not dry_run)
    require_writable_directory(repo_root, create=False)

    if source_exists and target_entries and source_entries and not allow_merge:
        raise RuntimeError(
            "Refusing migration because both source and target contain data. "
            "Resolve manually or rerun with --allow-merge after inspection."
        )

    if not source_exists:
        actions.append(f"source data directory does not exist: {source_dir}")
        if not dry_run:
            actions.extend(
                sync_env_file(
                    source_env_file,
                    target_env_file,
                    target_dir,
                )
            )
        return actions

    if not source_entries:
        actions.append(f"source data directory is empty: {source_dir}")
        if not dry_run:
            actions.extend(
                sync_env_file(
                    source_env_file,
                    target_env_file,
                    target_dir,
                )
            )
            try:
                source_dir.rmdir()
                actions.append(f"removed empty source directory: {source_dir}")
            except OSError as exc:
                if exc.errno != errno.ENOTEMPTY:
                    raise
        return actions

    validate_source_tree_readable(source_dir)
    source_size = validate_target_capacity(source_dir=source_dir, target_dir=target_dir)
    actions.append(f"validated source readability: {source_dir}")
    actions.append(f"validated target free space for {source_size} bytes of source data")

    if target_entries and allow_merge:
        actions.append(
            "WARNING: target already contains data; allow-merge enabled, leaving source in place."
        )
        for entry in source_entries:
            destination = target_dir / entry.name
            if dry_run:
                if destination.exists():
                    actions.append(f"WARNING: destination already exists, skipping: {destination}")
                else:
                    actions.append(f"would copy {entry} -> {destination}")
                continue
            if entry.is_dir():
                actions.extend(merge_tree_preserving_source(entry, destination))
            elif destination.exists():
                actions.append(f"WARNING: destination already exists, skipping: {destination}")
            else:
                if is_managed_encrypted_relative_path(Path(entry.name)):
                    if is_already_encrypted(entry):
                        actions.append(f"copying already-encrypted managed file {entry} -> {destination}")
                        atomic_copy2(entry, destination)
                    else:
                        actions.append(f"encrypting managed file {entry} -> {destination}")
                        atomic_encrypt_copy(
                            entry,
                            destination,
                            master_key=load_master_key(),
                        )
                else:
                    actions.append(f"copying {entry} -> {destination}")
                    atomic_copy2(entry, destination)
        if not dry_run:
            fsync_directory(target_dir)
            actions.extend(
                sync_env_file(
                    source_env_file,
                    target_env_file,
                    target_dir,
                )
            )
        return actions

    same_fs = is_same_filesystem(source_dir.parent, target_dir.parent)
    actions.append(
        f"filesystem mode: {'same-device' if same_fs else 'cross-device copy'}"
    )

    backup_dir = source_dir.with_name(f"{source_dir.name}.migration-backup-DRYRUN")
    if not dry_run:
        backup_dir = backup_source_dir(source_dir)
    actions.append(f"backed up source directory to: {backup_dir}")

    try:
        if not dry_run:
            target_dir.mkdir(parents=True, exist_ok=True)
            actions.extend(copy_tree_preserving_source(backup_dir, target_dir))
            actions.extend(
                sync_env_file(
                    source_env_file,
                    target_env_file,
                    target_dir,
                )
            )
            os.sync()
            marker_path = target_dir / ".migration-complete"
            marker_path.write_text(
                f"source_backup={backup_dir}\nsource_repo={repo_root}\n",
                encoding="utf-8",
            )
            fsync_file(marker_path)
            actions.append(f"wrote migration marker: {marker_path}")
        else:
            for entry in source_entries:
                actions.append(f"would copy {entry} -> {target_dir / entry.name}")
            if source_env_file.exists():
                actions.append(
                    f"would copy env file {source_env_file} -> {target_env_file}"
                )
    except Exception:
        if not dry_run and source_dir.exists():
            raise
        if not dry_run and not source_dir.exists() and backup_dir.exists():
            if target_dir.exists():
                failed_target = target_dir.with_name(
                    f"{target_dir.name}.failed-migration-{time.strftime('%Y%m%d-%H%M%S')}"
                )
                if failed_target.exists():
                    raise RuntimeError(
                        f"Failed migration target already exists: {failed_target}"
                    )
                target_dir.rename(failed_target)
                fsync_directory(failed_target.parent)
            backup_dir.rename(source_dir)
            fsync_directory(source_dir.parent)
        raise

    return actions


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Move repo-local lx-annotate data into the configured external data directory."
        )
    )
    parser.add_argument(
        "--repo-root",
        default=str(default_repo_root()),
        help="Repository root that currently contains ./data and optional .env.systemd",
    )
    parser.add_argument(
        "--target",
        default=None,
        help=(
            "Destination data directory. Defaults to LX_ANNOTATE_DATA_DIR, DATA_DIR, "
            "or /var/lib/lx-annotate/data."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned actions without moving files.",
    )
    parser.add_argument(
        "--allow-merge",
        action="store_true",
        help="Allow copying into a non-empty target. Existing paths are skipped with warnings.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).expanduser().resolve()
    target_dir = resolve_target_data_dir(args.target)
    actions = migrate_repo_data(
        repo_root=repo_root,
        target_dir=target_dir,
        dry_run=args.dry_run,
        allow_merge=args.allow_merge,
    )
    for action in actions:
        print(action)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"migration failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
