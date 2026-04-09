#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET_DATA_DIR = Path("/var/lib/lx-annotate/data")
DEFAULT_WATCHER_CENTER_REFERENCE = "university-hospital-wuerzburg"


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


def build_watcher_reconcile_command() -> list[str]:
    reconcile_code = """
import os
from pathlib import Path

from endoreg_db.models import Center, UploadJob


def resolve_center(reference: str) -> Center:
    normalized = str(reference or "").strip()
    if not normalized:
        raise SystemExit("Watcher default center reference must not be empty")

    center = Center.objects.filter(center_key=normalized).first()
    if center is not None:
        return center

    center = Center.objects.filter(name=normalized).first()
    if center is not None:
        return center

    raise SystemExit(
        "Unable to reconcile migrated watcher jobs because "
        f"LX_ANNOTATE_DEFAULT_CENTER does not resolve: {normalized}"
    )


def infer_metadata(job: UploadJob, provenance: dict[str, object]) -> tuple[str, str]:
    migrated_path = str(provenance.get("migrated_destination_path", "") or "")
    original_name = str(job.original_filename or "")
    file_name = migrated_path or original_name or str(job.file.name or "")
    suffix = Path(file_name).suffix.lower()

    if suffix == ".pdf":
        return "application/pdf", "report"
    if suffix in {".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"}:
        return "video/mp4", "video"
    if suffix == ".txt":
        return "export/txt", "report"
    return "", ""


center = resolve_center(
    os.getenv("LX_ANNOTATE_DEFAULT_CENTER", "university-hospital-wuerzburg")
)
updated = 0

jobs = UploadJob.objects.filter(
    source_system="migration",
    ingest_mode=UploadJob.IngestMode.WATCHER,
    status=UploadJob.Status.PENDING,
)

for job in jobs:
    update_fields: list[str] = []
    provenance = dict(job.processing_provenance or {})
    content_type, file_type = infer_metadata(job, provenance)

    if job.source_center_id is None:
        job.source_center = center
        update_fields.append("source_center")

    if not str(job.content_type or "").strip() and content_type:
        job.content_type = content_type
        update_fields.append("content_type")

    migrated_destination_path = str(
        provenance.get("migrated_destination_path", "") or ""
    ).strip()
    if migrated_destination_path and not str(provenance.get("watched_path", "") or "").strip():
        provenance["watched_path"] = migrated_destination_path

    if file_type and not str(provenance.get("file_type", "") or "").strip():
        provenance["file_type"] = file_type

    if provenance != (job.processing_provenance or {}):
        job.processing_provenance = provenance
        update_fields.append("processing_provenance")

    if update_fields:
        job.save(update_fields=[*update_fields, "updated_at"])
        updated += 1

print(updated)
""".strip()
    return [
        sys.executable,
        str(REPO_ROOT / "manage.py"),
        "shell",
        "-c",
        reconcile_code,
    ]


def build_management_env(*, target_dir: Path) -> dict[str, str]:
    target_str = str(target_dir)
    env = os.environ.copy()
    env["LX_ANNOTATE_ENCRYPTED_DATA_DIR"] = target_str
    env["LX_ANNOTATE_DATA_DIR"] = target_str
    env["DATA_DIR"] = target_str
    env["STORAGE_DIR"] = str(target_dir / "storage")
    env["IO_DIR"] = target_str
    env.setdefault(
        "LX_ANNOTATE_DEFAULT_CENTER",
        DEFAULT_WATCHER_CENTER_REFERENCE,
    )
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
    if result.returncode != 0 or dry_run:
        return int(result.returncode)

    reconcile_command = build_watcher_reconcile_command()
    reconcile_result = subprocess.run(reconcile_command, env=env, check=False)
    return int(reconcile_result.returncode)


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
