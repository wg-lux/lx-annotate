"""Persisted transcode admission and fenced, non-retrying worker execution."""

from __future__ import annotations

import inspect
import logging
import threading
from types import ModuleType
from typing import TYPE_CHECKING, Any, TypedDict
from uuid import UUID, uuid4

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from endoreg_db.models import VideoFile

from django.conf import settings
from django.db import IntegrityError, close_old_connections, transaction
from django.db.models import Q
from django.utils import timezone

from lx_annotate.models import VideoTranscodeJob

logger = logging.getLogger(__name__)
OPTIONS = tuple(VideoTranscodeJob.Option.values)


class TranscodeSubmissionError(Exception):
    def __init__(self, code: str, status: int = 409):
        self.code, self.status = code, status
        super().__init__(code)


def transcode_runtime() -> tuple[ModuleType, ModuleType]:
    try:
        from endoreg_db.services import media_operation_gate as gate
        from endoreg_db.services import video_processed_transcode as service

        required = {
            "transcode_claim",
            "expected_processed_name",
            "expected_processed_hash",
            "progress_callback",
        }
        parameters = inspect.signature(
            service.transcode_processed_video_for_storage_pressure
        ).parameters
        if "mode" in parameters or not required.issubset(parameters):
            raise ImportError("Transcode publication contract is unavailable")
        for name in (
            "acquire_video_transcode_lease",
            "renew_video_transcode_lease",
            "release_video_transcode_lease",
            "assert_video_transcode_lease",
        ):
            if not hasattr(gate, name):
                raise ImportError("Exclusive media lease contract is unavailable")
        return gate, service
    except (ImportError, AttributeError) as exc:
        raise TranscodeSubmissionError("transcode_dependency_unavailable", 503) from exc


def has_active_import(video: VideoFile) -> bool:
    from endoreg_db.models import UploadJob

    identity = Q()
    if video.sensitive_meta_id:
        identity |= Q(sensitive_meta_id=video.sensitive_meta_id)
    if video.video_hash:
        identity |= Q(content_hash=video.video_hash)
    return (
        bool(identity)
        and UploadJob.objects.filter(
            identity,
            source_center_id=video.center_id,
            status__in=["pending", "processing", "retrying", "cancel_requested"],
        ).exists()
    )


def video_is_transcodable(video: VideoFile) -> bool:
    return not has_active_import(video) and bool(
        video.processed_file
        and video.processed_file.name
        and video.processed_video_hash
        and video.processed_file.storage.exists(video.processed_file.name)
    )


class SerializedVideoTranscodeJob(TypedDict):
    id: str
    video_id: int
    option: str
    status: str
    stage: str
    progress_percent: int | None
    before_bytes: int | None
    after_bytes: int | None
    saved_bytes: int | None
    error_code: str
    created_at: str
    updated_at: str


def serialize_job(job: VideoTranscodeJob) -> SerializedVideoTranscodeJob:
    return {
        "id": str(job.pk),
        "video_id": job.video_id,
        "option": job.option,
        "status": job.status,
        "stage": job.stage,
        "progress_percent": 100 if job.status == "completed" else None,
        "before_bytes": job.before_bytes,
        "after_bytes": job.after_bytes,
        "saved_bytes": job.saved_bytes,
        "error_code": job.error_code,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


def _dispatch(job_id: UUID) -> None:
    from lx_annotate.tasks import run_video_transcode_job_task

    try:
        run_video_transcode_job_task.apply_async(
            args=(str(job_id),), queue=settings.CELERY_FFMPEG_MEDIA_QUEUE
        )
    except Exception:
        VideoTranscodeJob.objects.filter(pk=job_id, status="queued").update(
            status="failed",
            stage="dispatch",
            error_code="broker_dispatch_failed",
            finished_at=timezone.now(),
            updated_at=timezone.now(),
        )
        logger.exception("Transcode dispatch failed", extra={"job_id": str(job_id)})


def _submit_video_transcode(
    *, video: VideoFile, actor: User, option: str, idempotency_key: UUID
) -> tuple[VideoTranscodeJob, bool]:
    if option not in OPTIONS:
        raise TranscodeSubmissionError("invalid_transcode_option", 400)
    transcode_runtime()
    with transaction.atomic():
        video = type(video).objects.select_for_update().get(pk=video.pk)
        replay = VideoTranscodeJob.objects.filter(
            idempotency_key=idempotency_key
        ).first()
        if replay:
            if (
                replay.video_id != video.pk
                or replay.option != option
                or replay.actor_id != actor.pk
            ):
                raise TranscodeSubmissionError("idempotency_conflict")
            return replay, False
        if VideoTranscodeJob.objects.filter(
            video=video, status__in=["queued", "running"]
        ).exists():
            raise TranscodeSubmissionError("transcode_already_active")
        if has_active_import(video):
            raise TranscodeSubmissionError("video_import_active")
        if not video_is_transcodable(video):
            raise TranscodeSubmissionError("processed_media_unavailable")
        job = VideoTranscodeJob.objects.create(
            video=video,
            actor=actor,
            option=option,
            idempotency_key=idempotency_key,
            source_name=video.processed_file.name,
            source_sha256=video.processed_video_hash,
        )
        transaction.on_commit(lambda: _dispatch(job.pk))
    job.refresh_from_db()
    return job, True


def submit_video_transcode(
    *, video: VideoFile, actor: User, option: str, idempotency_key: UUID
) -> tuple[VideoTranscodeJob, bool]:
    try:
        return _submit_video_transcode(
            video=video, actor=actor, option=option, idempotency_key=idempotency_key
        )
    except IntegrityError as exc:
        replay = VideoTranscodeJob.objects.filter(
            idempotency_key=idempotency_key
        ).first()
        if replay is not None:
            if (
                replay.video_id == video.pk
                and replay.actor_id == actor.pk
                and replay.option == option
            ):
                return replay, False
            raise TranscodeSubmissionError("idempotency_conflict") from exc
        if VideoTranscodeJob.objects.filter(
            video=video, status__in=["queued", "running"]
        ).exists():
            raise TranscodeSubmissionError("transcode_already_active") from exc
        raise


def execute_video_transcode(job_id: str) -> str:
    token = uuid4()
    with transaction.atomic():
        job = VideoTranscodeJob.objects.select_for_update().get(pk=job_id)
        if job.status != "queued":
            return job.status
        job.status, job.stage, job.claim_token = "running", "claiming", token
        job.heartbeat_at = timezone.now()
        job.save(
            update_fields=[
                "status",
                "stage",
                "claim_token",
                "heartbeat_at",
                "updated_at",
            ]
        )

    owned = VideoTranscodeJob.objects.filter(
        pk=job_id, claim_token=token, status="running"
    )
    claim = None
    stop = threading.Event()
    heartbeat_error: list[Exception] = []
    thread = None
    terminal = "failed"
    error_code = "transcode_failed"
    result = None
    gate: ModuleType | None = None
    service: ModuleType | None = None
    try:
        if job.option not in OPTIONS:
            raise TranscodeSubmissionError("invalid_transcode_option", 400)
        gate, service = transcode_runtime()
        claim = gate.acquire_video_transcode_lease(
            video_id=job.video_id, ttl_seconds=120
        )

        def heartbeat() -> None:
            close_old_connections()
            try:
                while not stop.wait(20):
                    gate.renew_video_transcode_lease(claim, ttl_seconds=120)
                    if not owned.update(
                        heartbeat_at=timezone.now(), updated_at=timezone.now()
                    ):
                        raise RuntimeError("Transcode execution claim was fenced")
            except Exception as exc:
                claim.heartbeat_failed.set()
                heartbeat_error.append(exc)
            finally:
                close_old_connections()

        def progress(stage: str) -> None:
            gate.assert_video_transcode_lease(claim)
            if heartbeat_error:
                raise RuntimeError("Transcode heartbeat failed") from heartbeat_error[0]
            if not owned.update(
                stage=stage, heartbeat_at=timezone.now(), updated_at=timezone.now()
            ):
                raise RuntimeError("Transcode execution claim was fenced")

        thread = threading.Thread(target=heartbeat, daemon=True)
        thread.start()
        video = job.video
        video.refresh_from_db()
        if has_active_import(video):
            raise TranscodeSubmissionError("video_import_active")
        if (
            video.processed_file.name != job.source_name
            or video.processed_video_hash != job.source_sha256
        ):
            raise TranscodeSubmissionError("processed_generation_changed")
        result = service.transcode_processed_video_for_storage_pressure(
            video,
            apply=True,
            transcode_claim=claim,
            expected_processed_name=job.source_name,
            expected_processed_hash=job.source_sha256,
            progress_callback=progress,
        )
        if heartbeat_error:
            raise RuntimeError("Transcode heartbeat failed") from heartbeat_error[0]
        if result.status == "changed":
            terminal, error_code = "completed", ""
        elif result.status.startswith("skipped"):
            terminal, error_code = "skipped", result.status
        else:
            terminal, error_code = "failed", "transcode_" + result.status
    except Exception as exc:
        cleanup_error = getattr(service, "ProcessedVideoTranscodeCleanupError", None)
        error_code = (
            exc.code
            if isinstance(exc, TranscodeSubmissionError)
            else "transcode_cleanup_pending"
            if isinstance(cleanup_error, type) and isinstance(exc, cleanup_error)
            else "transcode_execution_failed"
        )
        if error_code == "transcode_cleanup_pending":
            owned.update(stage="cleanup")
        terminal = "lost" if heartbeat_error else "failed"
        logger.error(
            "Video transcode failed",
            extra={"job_id": str(job_id), "error_type": type(exc).__name__},
        )
    finally:
        stop.set()
        if thread:
            thread.join(timeout=30)
            if thread.is_alive():
                terminal, error_code = "lost", "transcode_heartbeat_stop_failed"
        if claim is not None and gate is not None:
            try:
                gate.release_video_transcode_lease(claim)
            except Exception:
                terminal, error_code = "lost", "transcode_lease_release_failed"
                logger.error(
                    "Video transcode lease release failed",
                    extra={"job_id": str(job_id)},
                )
    updates: dict[str, Any] = dict(
        status=terminal,
        error_code=error_code,
        finished_at=timezone.now(),
        updated_at=timezone.now(),
    )
    if terminal in {"completed", "skipped"}:
        updates["stage"] = terminal
    if result is not None:
        updates.update(before_bytes=result.old_size, after_bytes=result.new_size)
        if result.old_size is not None and result.new_size is not None:
            updates["saved_bytes"] = (
                result.old_size - result.new_size
                if terminal == "completed" and job.option == "replace_processed"
                else 0
            )
    owned.update(**updates)
    return VideoTranscodeJob.objects.get(pk=job_id).status


def assert_transcode_supported() -> None:
    transcode_runtime()


serialize_video_transcode_job = serialize_job
