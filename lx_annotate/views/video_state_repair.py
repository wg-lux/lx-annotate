"""Annotation-safe reconciliation of persisted video workflow state."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID, uuid5

from django.db import transaction
from endoreg_db.models import VideoFile, VideoState
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    ValidationError,
    model_validator,
)
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from lx_annotate.permissions import LifecyclePolicyPermission, lifecycle_center_ids


class RepairTranscodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    option: Literal["replace_processed"]
    idempotency_key: UUID


class VideoRepairRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dry_run: StrictBool = False
    transcode: RepairTranscodeRequest | None = None
    after_video_id: int = Field(default=0, ge=0, strict=True)
    batch_size: int = Field(default=100, ge=1, le=100, strict=True)

    @model_validator(mode="after")
    def validate_transcode_intent(self) -> VideoRepairRequest:
        if self.dry_run and self.transcode is not None:
            raise ValueError("Dry-run repair cannot submit transcode jobs.")
        if self.transcode is None and (self.after_video_id or self.batch_size != 100):
            raise ValueError("Batch cursors require an explicit transcode option.")
        return self


def _stored_file_exists(field_file: Any) -> bool:
    if not field_file or not getattr(field_file, "name", ""):
        return False
    return bool(field_file.storage.exists(field_file.name))


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

    prove("video_meta_extracted", bool(video.video_meta_id))
    prove("frames_initialized", frame_count > 0)
    prove("lvs_created", segment_count > 0)
    prove("sensitive_meta_processed", bool(video.sensitive_meta_id))
    prove("anonymized", processed_exists)

    if frame_count and getattr(state, "frame_count", None) != frame_count:
        state.frame_count = frame_count
        changes.append("frame_count")
    if changes and not dry_run:
        state.save()

    # A processed-file reference is not a successful replacement receipt for a
    # failed upload. Preserve its diagnostics, source and cleanup eligibility.

    missing: list[str] = []
    if not raw_exists and not processed_exists:
        missing.append("source_media")
    if not video.video_meta_id:
        missing.append("technical_metadata")
    if not video.sensitive_meta_id:
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


def _repair_one(video_id: int, *, dry_run: bool) -> dict[str, Any]:
    from endoreg_db.services import media_operation_gate

    with transaction.atomic():
        video = (
            VideoFile.objects.select_for_update(of=("self",))
            .select_related("state", "video_meta", "sensitive_meta")
            .get(pk=video_id)
        )
        # Legacy installed dependencies cannot start a transcode; newer ones
        # expose this guard and must participate in the same publication lock.
        guard = getattr(media_operation_gate, "assert_video_not_transcoding", None)
        try:
            if guard is not None:
                guard(video_id)
        except media_operation_gate.MediaOperationDeferred:
            return {
                "video_id": video.pk,
                "filename": video.original_file_name or "",
                "status": "blocked",
                "changes": [],
                "missing": ["active_transcode"],
                "annotations_preserved": True,
            }
        return repair_video_state(video, dry_run=dry_run)


def _submit_repair_transcodes(
    videos, request: RepairTranscodeRequest, actor, blocked_ids: set[int]
) -> dict[str, Any]:
    from lx_annotate.services.video_transcode_jobs import (
        TranscodeSubmissionError,
        serialize_video_transcode_job,
        submit_video_transcode,
    )

    items: list[dict[str, Any]] = []
    for video in videos:
        if video.pk in blocked_ids:
            items.append(
                {
                    "video_id": video.pk,
                    "status": "rejected",
                    "error_code": "active_transcode",
                }
            )
            continue
        try:
            job, created = submit_video_transcode(
                video=video,
                actor=actor,
                option=request.option,
                idempotency_key=uuid5(request.idempotency_key, f"video:{video.pk}"),
            )
            if created and job.status in ("failed", "lost"):
                items.append(
                    {
                        "video_id": video.pk,
                        "status": "rejected",
                        "error_code": job.error_code,
                        "job": serialize_video_transcode_job(job),
                    }
                )
                continue
            items.append(
                {
                    "video_id": video.pk,
                    "status": "queued" if created else "existing",
                    "job": serialize_video_transcode_job(job),
                }
            )
        except TranscodeSubmissionError as exc:
            items.append(
                {"video_id": video.pk, "status": "rejected", "error_code": exc.code}
            )
        except OSError:
            items.append(
                {
                    "video_id": video.pk,
                    "status": "rejected",
                    "error_code": "processed_storage_unavailable",
                }
            )
    return {
        "count": len(items),
        **{
            key: sum(item["status"] == key for item in items)
            for key in ("queued", "existing", "rejected")
        },
        "items": items,
    }


class VideoStateRepairView(APIView):
    permission_classes = [IsAuthenticated, LifecyclePolicyPermission]

    def post(self, request, pk: int | None = None) -> Response:
        center_ids = lifecycle_center_ids(request.user)
        try:
            options = VideoRepairRequest.model_validate(request.data)
        except ValidationError:
            return Response({"error": "Invalid video repair options."}, status=400)
        if options.transcode is not None:
            from lx_annotate.services.video_transcode_jobs import (
                TranscodeSubmissionError,
                assert_transcode_supported,
            )

            try:
                assert_transcode_supported()
            except TranscodeSubmissionError as exc:
                return Response(
                    {"error": "Safe transcoding is unavailable.", "code": exc.code},
                    status=exc.status,
                )
        dry_run = options.dry_run
        videos = VideoFile.objects.select_related(
            "state", "video_meta", "sensitive_meta"
        ).order_by("pk")
        if center_ids is not None:
            videos = videos.filter(center_id__in=center_ids)
        if pk is not None:
            videos = videos.filter(pk=pk)
            if not videos.exists():
                return Response(
                    {"error": f"Video with ID {pk} not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        has_more = False
        if options.transcode is not None:
            selected = list(
                videos.filter(pk__gt=options.after_video_id)[: options.batch_size + 1]
            )
            has_more = len(selected) > options.batch_size
            selected = selected[: options.batch_size]
        else:
            selected = list(videos)
        items = [_repair_one(video.pk, dry_run=dry_run) for video in selected]

        summary = {
            key: sum(item["status"] == key for item in items)
            for key in ("repaired", "consistent", "reimport_required", "blocked")
        }
        response = {
            "dry_run": dry_run,
            "count": len(items),
            "summary": summary,
            "items": items,
            "annotations_preserved": True,
        }
        if options.transcode is not None:
            blocked_ids = {
                item["video_id"] for item in items if item["status"] == "blocked"
            }
            transcodes = _submit_repair_transcodes(
                selected, options.transcode, request.user, blocked_ids
            )
            transcodes["next_after_video_id"] = selected[-1].pk if has_more else None
            response["transcodes"] = transcodes
        return Response(response)
