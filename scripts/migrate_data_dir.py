#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import os
import shutil
import sys
import time
from pathlib import Path

DEFAULT_TARGET_DATA_DIR = Path("/var/lib/lx-annotate/data")
DATA_DIR_ENV_KEYS = (
    "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
    "DATA_DIR",
    "LX_ANNOTATE_DATA_DIR",
    "STORAGE_DIR",
    "IO_DIR",
)


def default_repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def resolve_target_data_dir(raw_target: str | None) -> Path:
    target = (
        raw_target
        or os.getenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR")
        or os.getenv("LX_ANNOTATE_DATA_DIR")
        or os.getenv("DATA_DIR")
    )
    if not target:
        return DEFAULT_TARGET_DATA_DIR
    return Path(target).expanduser().resolve()


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


def fsync_file(path: Path) -> None:
    with path.open("rb") as handle:
        os.fsync(handle.fileno())


def fsync_directory(path: Path) -> None:
    fd = os.open(path, os.O_RDONLY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def is_same_filesystem(left: Path, right: Path) -> bool:
    return left.stat().st_dev == right.stat().st_dev


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
    for entry in list_entries(source_dir):
        destination = target_dir / entry.name
        actions.append(f"copying {entry} -> {destination}")
        if entry.is_dir():
            shutil.copytree(entry, destination, copy_function=shutil.copy2)
        else:
            shutil.copy2(entry, destination)
            fsync_file(destination)
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

    target_env_file.write_text(rendered, encoding="utf-8")
    fsync_file(target_env_file)
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
            if destination.exists():
                actions.append(f"WARNING: destination already exists, skipping: {destination}")
                continue
            actions.append(f"copying {entry} -> {destination}")
            if not dry_run:
                if entry.is_dir():
                    shutil.copytree(entry, destination, copy_function=shutil.copy2)
                else:
                    shutil.copy2(entry, destination)
                    fsync_file(destination)
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
