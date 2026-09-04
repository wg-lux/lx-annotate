"""Annotation-safe reconciliation of persisted video workflow state."""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from endoreg_db.models import UploadJob, VideoFile, VideoState


def _stored_file_exists(field_file: Any) -> bool:
    if not field_file or not getattr(field_file, "name", ""):
        return False
    return bool(field_file.storage.exists(field_file.name))


def _ready_hls_kinds(video: VideoFile) -> list[str]:
    manager = getattr(video, "hls_artifacts", None)
    if manager is None:
        return []
    return list(manager.filter(status="ready").values_list("artifact_kind", flat=True))


def _repair_upload_jobs(video: VideoFile, *, dry_run: bool) -> int:
    sensitive_meta_id = getattr(video, "sensitive_meta_id", None)
    video_hash = str(getattr(video, "video_hash", "") or "").strip()
    identity = Q()
    if sensitive_meta_id:
        identity |= Q(sensitive_meta_id=sensitive_meta_id)
    has_content_hash = any(
        field.name == "content_hash" for field in UploadJob._meta.fields
    )
    if video_hash and has_content_hash:
        identity |= Q(content_hash=video_hash)
    if not identity:
        return 0

    jobs = UploadJob.objects.filter(identity, status__in=["error", "lost"])
    count = jobs.count()
    if count and not dry_run:
        jobs.update(
            status=UploadJob.Status.ANONYMIZED,
            error_detail="",
            updated_at=timezone.now(),
        )
    return count


def repair_video_state(video: VideoFile, *, dry_run: bool = False) -> dict[str, Any]:
    """Reconcile facts backed by durable artifacts without deleting clinical data."""
    changes: list[str] = []
    state = getattr(video, "state", None)
    if state is None:
        changes.append("state_created")
        create_kwargs = (
            {"was_created": False} if hasattr(VideoState, "was_created") else {}
        )
        if dry_run:
            state = VideoState(**create_kwargs)
        else:
            state = VideoState.objects.create(**create_kwargs)
            video.state = state
            video.save(update_fields=["state", "date_modified"])

    def prove(field: str, condition: bool) -> None:
        if condition and hasattr(state, field) and not getattr(state, field):
            setattr(state, field, True)
            changes.append(field)

    frame_count = video.frames.count()
    segment_count = video.label_video_segments.count()
    raw_exists = _stored_file_exists(video.raw_file)
    processed_exists = _stored_file_exists(video.processed_file)
    ready_hls = _ready_hls_kinds(video)

    prove("video_meta_extracted", bool(video.video_meta_id))
    prove("frames_initialized", frame_count > 0)
    prove("lvs_created", segment_count > 0)
    prove("sensitive_meta_processed", bool(video.sensitive_meta_id))
    prove("anonymized", processed_exists or "processed" in ready_hls)

    if frame_count and getattr(state, "frame_count", None) != frame_count:
        state.frame_count = frame_count
        changes.append("frame_count")
    if changes and not dry_run:
        state.save()

    durable_success = bool(
        video.sensitive_meta_id or video.video_meta_id or processed_exists or ready_hls
    )
    repaired_jobs = _repair_upload_jobs(video, dry_run=dry_run) if durable_success else 0
    if repaired_jobs:
        changes.append("upload_job")

    missing: list[str] = []
    if not raw_exists and not processed_exists and not ready_hls:
        missing.append("source_media")
    if not video.video_meta_id and not raw_exists:
        missing.append("technical_metadata")
    if not video.sensitive_meta_id and not raw_exists:
        missing.append("sensitive_metadata")

    return {
        "video_id": video.pk,
        "filename": video.original_file_name or "",
        "status": (
            "reimport_required"
            if missing
            else ("repaired" if changes else "consistent")
        ),
        "changes": changes,
        "missing": missing,
        "annotations_preserved": True,
    }


class VideoStateRepairView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int | None = None) -> Response:
        dry_run = bool(request.data.get("dry_run", False))
        videos = VideoFile.objects.select_related(
            "state", "video_meta", "sensitive_meta"
        ).order_by("pk")
        if pk is not None:
            videos = videos.filter(pk=pk)
            if not videos.exists():
                return Response(
                    {"error": f"Video with ID {pk} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        with transaction.atomic():
            items = [repair_video_state(video, dry_run=dry_run) for video in videos]

        summary = {
            key: sum(item["status"] == key for item in items)
            for key in ("repaired", "consistent", "reimport_required")
        }
        return Response(
            {
                "dry_run": dry_run,
                "count": len(items),
                "summary": summary,
                "items": items,
                "annotations_preserved": True,
            }
        )
