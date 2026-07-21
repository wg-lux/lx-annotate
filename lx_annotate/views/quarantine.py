from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from endoreg_db.models.hub.quarantine_item import QuarantineItem
from endoreg_db.services.hub import resolve_allowed_center_id
from endoreg_db.authz.permissions import PolicyPermission
from endoreg_db.utils.permissions import EnvironmentAwarePermission

VIDEO_EXTENSIONS = {".avi", ".m4v", ".mkv", ".mov", ".mp4", ".webm"}
REPORT_EXTENSIONS = {".pdf"}


@dataclass(frozen=True)
class QuarantineDirectory:
    key: str
    label: str
    path: Path


def _configured_path(env_name: str, fallback: Path) -> Path:
    configured = os.getenv(env_name, "").strip()
    return Path(configured or fallback).expanduser().resolve(strict=False)


def _quarantine_directories() -> list[QuarantineDirectory]:
    app_data_dir = Path(settings.APP_DATA_DIR).expanduser().resolve(strict=False)
    return [
        QuarantineDirectory(
            key="lx_annotate_quarantine",
            label="lx-annotate quarantine",
            path=_configured_path(
                "LX_ANNOTATE_QUARANTINE_DIR",
                app_data_dir / "quarantine",
            ),
        )
    ]


def _media_type_for_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    if suffix in REPORT_EXTENSIONS:
        return "pdf"
    return "unknown"


def _iso_from_timestamp(timestamp: float) -> str:
    dt = datetime.fromtimestamp(timestamp, tz=timezone.get_current_timezone())
    return dt.isoformat()


def _read_quarantine_file(
    directory: QuarantineDirectory,
    entry: Path,
    *,
    quarantine_item: QuarantineItem | None,
) -> dict[str, Any] | None:
    if entry.is_symlink():
        return None

    try:
        stat_result = entry.stat(follow_symlinks=False)
    except OSError:
        return None

    if not entry.is_file():
        return None

    quarantined_at = _iso_from_timestamp(stat_result.st_ctime)
    review_status = (
        str(quarantine_item.status) if quarantine_item is not None else "unindexed"
    )
    source_upload_job = (
        quarantine_item.source_upload_job if quarantine_item is not None else None
    )
    next_action_by_status = {
        QuarantineItem.Status.PENDING_REVIEW.value: "review_required",
        QuarantineItem.Status.RETAINED.value: "retained",
        QuarantineItem.Status.APPROVED_FOR_DELETION.value: "deletion_approved",
        QuarantineItem.Status.FAILED.value: "operator_intervention",
        "unindexed": "ledger_reconciliation_required",
    }
    return {
        "id": f"{directory.key}:{entry.name}",
        "directory_key": directory.key,
        "directory_label": directory.label,
        "filename": entry.name,
        "media_type": _media_type_for_name(entry.name),
        "size": stat_result.st_size,
        "quarantined_at": quarantined_at,
        "created_at": quarantined_at,
        "modified_at": _iso_from_timestamp(stat_result.st_mtime),
        "reason": "Datei ist vermutlich beschädigt. Überprüfen Sie die Datei und importieren Sie erneut!",
        "review_status": review_status,
        "next_action": next_action_by_status.get(
            review_status,
            "operator_intervention",
        ),
        "source_upload_job_id": (
            str(source_upload_job.pk) if source_upload_job is not None else None
        ),
        "orphaned": source_upload_job is None,
    }


def _quarantine_item_for_entry(entry: Path) -> QuarantineItem | None:
    return (
        QuarantineItem.objects.select_related("source_upload_job__source_center")
        .filter(relative_path=entry.name)
        .order_by("-updated_at")
        .first()
    )


def _visible_in_center_scope(
    quarantine_item: QuarantineItem | None,
    *,
    allowed_center_id: int | None,
) -> bool:
    if allowed_center_id is None:
        return True
    if allowed_center_id == -1 or quarantine_item is None:
        return False
    source_upload_job = quarantine_item.source_upload_job
    return (
        source_upload_job is not None
        and source_upload_job.source_center_id == allowed_center_id
    )


def _limit_from_request(request) -> int:
    raw_limit = request.query_params.get("limit", "200")
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return 200
    return max(1, min(limit, 500))


@api_view(["GET"])
@permission_classes([EnvironmentAwarePermission, PolicyPermission])
def quarantine_overview(request):
    limit = _limit_from_request(request)
    files: list[dict[str, Any]] = []
    directories: list[dict[str, Any]] = []
    allowed_center_id = resolve_allowed_center_id(getattr(request, "user", None))

    for directory in _quarantine_directories():
        directory_summary: dict[str, Any] = {
            "key": directory.key,
            "label": directory.label,
            "exists": directory.path.exists(),
            "file_count": 0,
            "error": "",
        }

        if not directory.path.exists():
            directories.append(directory_summary)
            continue

        if not directory.path.is_dir():
            directory_summary["error"] = (
                "Configured quarantine path is not a directory."
            )
            directories.append(directory_summary)
            continue

        try:
            entries = sorted(
                directory.path.iterdir(),
                key=lambda candidate: candidate.stat(follow_symlinks=False).st_ctime,
                reverse=True,
            )
        except OSError:
            directory_summary["error"] = (
                "Quarantine inventory is temporarily unavailable."
            )
            directories.append(directory_summary)
            continue

        for entry in entries:
            quarantine_item = _quarantine_item_for_entry(entry)
            if not _visible_in_center_scope(
                quarantine_item,
                allowed_center_id=allowed_center_id,
            ):
                continue
            file_payload = _read_quarantine_file(
                directory,
                entry,
                quarantine_item=quarantine_item,
            )
            if file_payload is None:
                continue
            directory_summary["file_count"] += 1
            if len(files) < limit:
                files.append(file_payload)

        directories.append(directory_summary)

    total_size = sum(int(file_payload["size"]) for file_payload in files)
    return Response(
        {
            "count": len(files),
            "total_size": total_size,
            "directories": directories,
            "files": files,
        },
        status=status.HTTP_200_OK,
    )
