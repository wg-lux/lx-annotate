"""Explicit rollback of workflow approval, never rollback of clinical artifacts."""

from __future__ import annotations

from typing import Any

from django.db.models import Q
from endoreg_db.models import VideoFile, VideoState
from endoreg_db.models.media.video.video_processing import VideoProcessingHistory
from endoreg_db.models.state.audit_ledger import AuditLedger
from endoreg_db.services.media.operation_gate import (
    MediaOperationDeferred,
    defer_if_video_media_busy,
)

from lx_annotate.models import OutboundHubTransferJob


def reset_video_for_backfill(
    video: VideoFile, *, actor: Any, dry_run: bool
) -> dict[str, Any]:
    """Caller holds the VideoFile lock in a transaction, including audit commit."""
    result: dict[str, Any] = {
        "video_id": video.pk,
        "filename": video.original_file_name or "",
        "status": "blocked",
        "changes": [],
        "missing": [],
        "annotations_preserved": True,
        "reset_to": "import",
    }
    state = video.state
    if state is None:
        result["missing"] = ["state"]
        return result
    if (
        state.processing_error
        or video.meta is None
        or str(video.meta.get("integrity_status") or "").strip() == "lost"
    ):
        result["missing"] = ["integrity_failure"]
        return result
    raw = video.raw_file
    if not raw or not raw.name or not raw.storage.exists(raw.name) or raw.size <= 0:
        result["missing"] = ["source_media"]
        return result
    try:
        defer_if_video_media_busy(video_id=video.pk)
    except MediaOperationDeferred:
        result["missing"] = ["active_media_operation"]
        return result
    if VideoProcessingHistory.objects.filter(
        video=video, status__in=["pending", "running"]
    ).exists():
        result["missing"] = ["active_processing"]
        return result
    jobs = OutboundHubTransferJob.objects.filter(video_file=video)
    if jobs.filter(
        ~Q(local_status__in=["marked", "failed"])
        | (Q(remote_transfer_id__isnull=False) & ~Q(remote_transfer_id=""))
    ).exists():
        result["missing"] = ["registered_or_active_transfer"]
        return result

    state = VideoState.objects.select_for_update().get(pk=state.pk)
    # Keep actual media identities and all annotation/metadata rows. Only derived
    # completion and approval flags are revoked for the next processing attempt.
    target: dict[str, object] = {
        "processing_started": False,
        "was_created": False,
        "video_meta_extracted": False,
        "text_meta_extracted": False,
        "sensitive_meta_processed": False,
        "frames_extracted": False,
        "anonymized": False,
        "anonymization_validated": False,
        "segment_annotations_validated": False,
        "outside_segments_removed": False,
        "ready_for_export": False,
        "ready_for_export_at": None,
        "ready_for_export_by": "",
        "processed_file_sha256": "",
    }
    before = {name: getattr(state, name) for name in target}
    changed = [name for name, value in target.items() if before[name] != value]
    result.update(status="repaired" if changed else "consistent", changes=changed)
    if dry_run or not changed:
        return result
    for name, value in target.items():
        setattr(state, name, value)
    state.save(update_fields=[*changed, "date_modified"])
    AuditLedger.objects.create(
        user=actor,
        object_type="VideoFile",
        object_pk=str(video.pk),
        action="reset_for_backfill",
        data={
            "reset_to": "import",
            "before": {
                name: value.isoformat() if hasattr(value, "isoformat") else value
                for name, value in before.items()
            },
            "after": target,
            "annotations_preserved": True,
        },
    )
    return result
