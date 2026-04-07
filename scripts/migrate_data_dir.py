#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET_DATA_DIR = Path("/var/lib/lx-annotate/data")


def default_repo_root() -> Path:
    return REPO_ROOT


def resolve_target_data_dir(raw_target: str | None) -> Path:
    if not raw_target:
        return DEFAULT_TARGET_DATA_DIR
    return Path(raw_target).expanduser().resolve()


def build_management_command(
    *,
    source_root: Path,
    dry_run: bool = False,
    manifest_path: str = "",
) -> list[str]:
    command = [
        sys.executable,
        str(REPO_ROOT / "manage.py"),
        "migrate_data_dir",
        str(source_root),
    ]
    if dry_run:
        command.append("--dry-run")
    if manifest_path:
        command.extend(["--manifest-path", manifest_path])
    return command


def build_management_env(*, target_dir: Path) -> dict[str, str]:
    target_str = str(target_dir)
    env = os.environ.copy()
    env["LX_ANNOTATE_ENCRYPTED_DATA_DIR"] = target_str
    env["LX_ANNOTATE_DATA_DIR"] = target_str
    env["DATA_DIR"] = target_str
    env["STORAGE_DIR"] = str(target_dir / "storage")
    env["IO_DIR"] = target_str
    return env


def run_migration(
    *,
    repo_root: Path,
    target_dir: Path,
    dry_run: bool = False,
    manifest_path: str = "",
) -> int:
    source_root = (repo_root / "data").expanduser().resolve()
    command = build_management_command(
        source_root=source_root,
        dry_run=dry_run,
        manifest_path=manifest_path,
    )
    env = build_management_env(target_dir=target_dir)
    result = subprocess.run(command, env=env, check=False)
    return int(result.returncode)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Delegate data-dir migration to the endoreg_db migrate_data_dir command."
        )
    )
    parser.add_argument(
        "--repo-root",
        default=str(default_repo_root()),
        help="Repository root that currently contains ./data to migrate.",
    )
    parser.add_argument(
        "--target",
        default=None,
        help=(
            "Protected data root for the delegated migration. "
            "Defaults to /var/lib/lx-annotate/data."
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Pass through dry-run mode to endoreg_db migrate_data_dir.",
    )
    parser.add_argument(
        "--manifest-path",
        default="",
        help="Optional manifest path to pass through to endoreg_db migrate_data_dir.",
    )
    parser.add_argument(
        "--allow-merge",
        action="store_true",
        help="Unsupported legacy flag kept only for compatibility.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.allow_merge:
        parser.error(
            "--allow-merge is not supported by the delegated endoreg_db migration command"
        )

    repo_root = Path(args.repo_root).expanduser().resolve()
    target_dir = resolve_target_data_dir(args.target)
    return run_migration(
        repo_root=repo_root,
        target_dir=target_dir,
        dry_run=bool(args.dry_run),
        manifest_path=str(args.manifest_path or "").strip(),
    )


if __name__ == "__main__":
    raise SystemExit(main())
