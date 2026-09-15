"""Durable transcode ownership, admission, and worker state regressions."""

from __future__ import annotations

import hashlib
import shutil
import subprocess
from datetime import timedelta
from functools import wraps
from pathlib import Path
from uuid import uuid4

import pytest
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.utils import timezone
from endoreg_db.models import Center, VideoFile
from endoreg_db.utils.encryption.encrypted import EncryptedStorage

from lx_annotate.models import VideoTranscodeJob
from lx_annotate.services.video_transcode_jobs import (
    execute_video_transcode,
    serialize_job,
    submit_video_transcode,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def video_and_actor():
    center = Center.objects.create(name="Transcode worker center")
    actor = User.objects.create_user(username="transcode-worker-operator")
    video = VideoFile.objects.create(
        center=center, video_hash="transcode-worker-source"
    )
    return video, actor


def job_for(video, actor, **overrides):
    fields = {
        "video": video,
        "actor": actor,
        "idempotency_key": uuid4(),
        "option": "replace_processed",
        "source_name": "protected/processed/source.mp4",
        "source_sha256": "a" * 64,
    }
    return VideoTranscodeJob.objects.create(**(fields | overrides))


@pytest.mark.parametrize("active_status", ["queued", "running"])
def test_database_prevents_two_active_operations_for_one_video(
    video_and_actor, active_status
):
    video, actor = video_and_actor
    existing = job_for(video, actor, status=active_status)
    with pytest.raises(IntegrityError), transaction.atomic():
        job_for(video, actor)
    existing.refresh_from_db()
    assert existing.status == active_status
    assert VideoTranscodeJob.objects.filter(video=video).count() == 1


@pytest.mark.parametrize("terminal", ["completed", "skipped", "failed", "lost"])
def test_terminal_ledger_allows_an_explicit_new_operation(video_and_actor, terminal):
    video, actor = video_and_actor
    old = job_for(video, actor, status=terminal)
    new = job_for(video, actor)
    old.refresh_from_db()
    assert old.status == terminal
    assert new.status == "queued"
    assert old.pk != new.pk


def test_idempotency_key_cannot_be_reassigned_to_another_video(video_and_actor):
    video, actor = video_and_actor
    existing = job_for(video, actor)
    other = VideoFile.objects.create(
        center=video.center, video_hash="another-transcode-source"
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        job_for(other, actor, idempotency_key=existing.idempotency_key)
    assert VideoTranscodeJob.objects.count() == 1


@pytest.fixture
def encrypted_video(video_and_actor, tmp_path, master_key, monkeypatch):
    from endoreg_db.services import streamable_media
    from endoreg_db.utils import paths

    monkeypatch.setenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path / "storage"))
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(tmp_path / "storage"))
    monkeypatch.setattr(
        paths,
        "ANONYM_VIDEO_DIR",
        paths.EndoregPathsModel.from_environment().anonym_video,
    )
    monkeypatch.setattr(
        streamable_media,
        "STREAMABLE_PROCESSED_VIDEO_ROOT",
        tmp_path / "storage" / "streamable_videos" / "processed",
    )
    video, actor = video_and_actor
    storage = EncryptedStorage(location=str(tmp_path / "storage"))
    for name in ("raw_file", "processed_file"):
        monkeypatch.setattr(VideoFile._meta.get_field(name), "storage", storage)
    video = VideoFile.objects.get(pk=video.pk)
    video.raw_file.save("raw.mp4", ContentFile(b"retained original source"), save=False)
    video.processed_file.save(
        "processed.mp4", ContentFile(b"not a valid media stream"), save=False
    )
    video.processed_video_hash = hashlib.sha256(b"not a valid media stream").hexdigest()
    video.save()
    return video, actor


@pytest.mark.parametrize("status", ["completed", "skipped", "failed", "lost"])
def test_terminal_worker_redelivery_does_not_change_ledger(video_and_actor, status):
    video, actor = video_and_actor
    job = job_for(video, actor, status=status, stage=status)
    original_updated_at = job.updated_at
    assert execute_video_transcode(str(job.pk)) == status
    job.refresh_from_db()
    assert job.updated_at == original_updated_at
    assert job.claim_token is None


def test_invalid_option_fails_before_runtime_or_media_io(video_and_actor, monkeypatch):
    from lx_annotate.services import video_transcode_jobs

    def forbidden_runtime():
        pytest.fail("Invalid work must not acquire a lease or touch media")

    monkeypatch.setattr(video_transcode_jobs, "transcode_runtime", forbidden_runtime)
    video, actor = video_and_actor
    job = job_for(video, actor, option="invalid")
    assert execute_video_transcode(str(job.pk)) == "failed"
    job.refresh_from_db()
    assert job.error_code == "invalid_transcode_option"
    assert job.finished_at is not None
    assert job.before_bytes is None and job.after_bytes is None


def test_running_redelivery_does_not_steal_execution(video_and_actor):
    video, actor = video_and_actor
    token = uuid4()
    job = job_for(
        video, actor, status="running", claim_token=token, heartbeat_at=timezone.now()
    )
    assert execute_video_transcode(str(job.pk)) == "running"
    job.refresh_from_db()
    assert job.claim_token == token
    assert job.finished_at is None


def test_expired_heartbeat_does_not_authorize_redelivery_to_steal_or_mutate(
    video_and_actor,
):
    video, actor = video_and_actor
    token = uuid4()
    job = job_for(
        video,
        actor,
        status="running",
        claim_token=token,
        heartbeat_at=timezone.now() - timedelta(minutes=3),
    )
    updated_at = job.updated_at
    assert execute_video_transcode(str(job.pk)) == "running"
    job.refresh_from_db()
    assert job.claim_token == token
    assert job.error_code == ""
    assert job.finished_at is None
    assert job.updated_at == updated_at


def test_changed_generation_is_rejected_without_touching_raw_or_processed(
    encrypted_video,
):
    video, actor = encrypted_video
    job = job_for(
        video, actor, source_name=video.processed_file.name, source_sha256="a" * 64
    )
    raw = Path(video.raw_file.path).read_bytes()
    processed = Path(video.processed_file.path).read_bytes()
    assert execute_video_transcode(str(job.pk)) == "failed"
    job.refresh_from_db()
    assert job.error_code == "processed_generation_changed"
    assert job.before_bytes is None and job.after_bytes is None
    assert Path(video.raw_file.path).read_bytes() == raw
    assert Path(video.processed_file.path).read_bytes() == processed


@pytest.mark.parametrize("option", ["replace_processed"])
def test_invalid_media_execution_preserves_option_and_published_artifacts(
    encrypted_video, option
):
    video, actor = encrypted_video
    job = job_for(
        video,
        actor,
        option=option,
        source_name=video.processed_file.name,
        source_sha256=video.processed_video_hash,
    )
    raw = Path(video.raw_file.path).read_bytes()
    processed = Path(video.processed_file.path).read_bytes()
    assert raw.startswith(b"LXENC01") and processed.startswith(b"LXENC01")
    assert execute_video_transcode(str(job.pk)) == "failed"
    job.refresh_from_db()
    video.refresh_from_db()
    assert job.option == option
    assert job.finished_at is not None
    assert job.saved_bytes == 0
    assert Path(video.raw_file.path).read_bytes() == raw
    assert Path(video.processed_file.path).read_bytes() == processed


def test_submission_replay_keeps_original_job_and_option(encrypted_video):
    video, actor = encrypted_video
    key = uuid4()
    first, created = submit_video_transcode(
        video=video, actor=actor, option="replace_processed", idempotency_key=key
    )
    replay, replay_created = submit_video_transcode(
        video=video, actor=actor, option="replace_processed", idempotency_key=key
    )
    assert created is True and replay_created is False
    assert first.pk == replay.pk


def test_dispatch_error_is_persisted_and_never_claims_success(
    encrypted_video, monkeypatch, django_capture_on_commit_callbacks
):
    from lx_annotate.tasks import run_video_transcode_job_task

    def unavailable(*args, **kwargs):
        raise ConnectionError("test broker unavailable")

    monkeypatch.setattr(run_video_transcode_job_task, "apply_async", unavailable)
    video, actor = encrypted_video
    with django_capture_on_commit_callbacks(execute=True):
        job, created = submit_video_transcode(
            video=video,
            actor=actor,
            option="replace_processed",
            idempotency_key=uuid4(),
        )
    job.refresh_from_db()
    assert created is True
    assert job.status == "failed"
    assert job.error_code == "broker_dispatch_failed"
    assert job.before_bytes is None and job.saved_bytes is None


def test_serialized_job_omits_storage_identity_and_reports_persisted_bytes(
    video_and_actor,
):
    video, actor = video_and_actor
    job = job_for(
        video,
        actor,
        status="completed",
        stage="completed",
        before_bytes=1200,
        after_bytes=800,
        saved_bytes=400,
    )
    payload = serialize_job(job)
    assert payload["before_bytes"] == 1200
    assert payload["after_bytes"] == 800
    assert payload["saved_bytes"] == 400
    assert payload["progress_percent"] == 100
    assert "source_name" not in payload and "source_sha256" not in payload
    assert "claim_token" not in payload and "actor_id" not in payload


def test_heartbeat_failure_fences_publication_before_worker_continues(
    encrypted_video, monkeypatch
):
    from threading import Event

    from django.db import OperationalError
    from endoreg_db.services import media_operation_gate, video_processed_transcode

    from lx_annotate.services import video_transcode_jobs

    class ImmediateStop(Event):
        def wait(self, timeout=None):
            return False

    class ImmediateThread:
        def __init__(self, *, target, daemon):
            self.target = target

        def start(self):
            self.target()

        def join(self, timeout=None):
            pass

        def is_alive(self):
            return False

    def fail_renewal(*args, **kwargs):
        raise OperationalError("heartbeat database unavailable")

    actual = video_processed_transcode.transcode_processed_video_for_storage_pressure
    fenced = []

    @wraps(actual)
    def observe_fence(*args, **kwargs):
        claim = kwargs["transcode_claim"]
        fenced.append(claim.heartbeat_failed.is_set())
        media_operation_gate.assert_video_transcode_lease(claim)
        pytest.fail("Failed heartbeat must fence publication")

    monkeypatch.setattr(video_transcode_jobs.threading, "Event", ImmediateStop)
    monkeypatch.setattr(video_transcode_jobs.threading, "Thread", ImmediateThread)
    monkeypatch.setattr(
        media_operation_gate, "renew_video_transcode_lease", fail_renewal
    )
    monkeypatch.setattr(
        video_processed_transcode,
        "transcode_processed_video_for_storage_pressure",
        observe_fence,
    )
    video, actor = encrypted_video
    job = job_for(
        video,
        actor,
        source_name=video.processed_file.name,
        source_sha256=video.processed_video_hash,
    )
    assert execute_video_transcode(str(job.pk)) == "lost"
    assert fenced == [True]
    job.refresh_from_db()
    assert job.before_bytes is None and job.after_bytes is None


@pytest.mark.parametrize("option", ["replace_processed"])
def test_real_encoder_worker_persists_byte_results_and_preserves_raw(
    encrypted_video, option, monkeypatch
):
    from endoreg_db.services import video_processed_transcode
    from endoreg_db.utils.paths import EndoregPathsModel

    actual_transcode = (
        video_processed_transcode.transcode_processed_video_for_storage_pressure
    )
    actual_hls = video_processed_transcode.materialize_video_hls
    actual_candidate = video_processed_transcode._build_transcode_candidate
    results = []
    hls_errors = []

    @wraps(actual_candidate)
    def observe_candidate(*args, **kwargs):
        try:
            return actual_candidate(*args, **kwargs)
        except Exception as exc:
            hls_errors.append(str(exc))
            raise

    @wraps(actual_hls)
    def observe_hls(*args, **kwargs):
        try:
            return actual_hls(*args, **kwargs)
        except Exception as exc:
            hls_errors.append(str(exc))
            raise

    @wraps(actual_transcode)
    def observe_transcode(*args, **kwargs):
        try:
            result = actual_transcode(*args, **kwargs)
        except Exception as exc:
            hls_errors.append(f"{type(exc).__name__}: {exc}; cause={exc.__cause__}")
            raise
        results.append(result)
        return result

    monkeypatch.setattr(
        video_processed_transcode,
        "transcode_processed_video_for_storage_pressure",
        observe_transcode,
    )
    monkeypatch.setattr(video_processed_transcode, "materialize_video_hls", observe_hls)
    monkeypatch.setattr(
        video_processed_transcode, "_build_transcode_candidate", observe_candidate
    )
    executable = shutil.which("ffmpeg")
    if executable is None:
        pytest.skip("FFmpeg is required for real transcode worker integration")
    encoded = subprocess.run(
        [
            executable,
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=size=320x240:rate=25:duration=2",
            "-an",
            "-c:v",
            "libx264",
            "-crf",
            "0",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "frag_keyframe+empty_moov",
            "-f",
            "mp4",
            "pipe:1",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
        timeout=30,
    ).stdout
    video, actor = encrypted_video
    managed_paths = EndoregPathsModel.from_environment()
    source_name = f"{video.video_hash}.mp4"
    video.processed_file.save(source_name, ContentFile(encoded), save=False)
    assert Path(video.processed_file.path) == managed_paths.anonym_video / source_name
    video.processed_video_hash = hashlib.sha256(encoded).hexdigest()
    video.storage_mode = "app_encrypted"
    video.fps, video.duration, video.frame_count = 25.0, 2.0, 50
    video.save()
    original_name, original_hash = video.processed_file.name, video.processed_video_hash
    raw = Path(video.raw_file.path).read_bytes()
    job = job_for(
        video,
        actor,
        option=option,
        source_name=original_name,
        source_sha256=original_hash,
    )
    outcome = execute_video_transcode(str(job.pk))
    job.refresh_from_db()
    assert outcome == "completed", (serialize_job(job), results, hls_errors)
    job.refresh_from_db()
    video.refresh_from_db()
    assert isinstance(job.before_bytes, int) and isinstance(job.after_bytes, int)
    assert job.before_bytes == len(encoded)
    assert 0 < job.after_bytes < job.before_bytes
    assert job.stage == "completed" and job.finished_at is not None
    assert Path(video.raw_file.path).read_bytes() == raw
    assert job.saved_bytes == job.before_bytes - job.after_bytes
    assert video.processed_file.name != original_name
    assert video.processed_video_hash != original_hash
    assert Path(video.processed_file.path).read_bytes().startswith(b"LXENC01")
    assert not video.processed_file.storage.exists(original_name)
    assert not any(
        field.name.startswith("optimized_playback") for field in VideoFile._meta.fields
    )


def test_cleanup_pending_does_not_report_completed_or_storage_savings(
    encrypted_video, monkeypatch
):
    from endoreg_db.services import video_processed_transcode

    actual = video_processed_transcode.transcode_processed_video_for_storage_pressure

    @wraps(actual)
    def cleanup_pending(*args, **kwargs):
        kwargs["progress_callback"]("cleanup")
        raise video_processed_transcode.ProcessedVideoTranscodeCleanupError(
            video_id=args[0].pk, phase="published_generation"
        )

    monkeypatch.setattr(
        video_processed_transcode,
        "transcode_processed_video_for_storage_pressure",
        cleanup_pending,
    )
    video, actor = encrypted_video
    job = job_for(
        video,
        actor,
        source_name=video.processed_file.name,
        source_sha256=video.processed_video_hash,
    )
    assert execute_video_transcode(str(job.pk)) == "failed"
    job.refresh_from_db()
    assert job.error_code == "transcode_cleanup_pending"
    assert job.stage == "cleanup"
    assert job.saved_bytes is None
    assert serialize_job(job)["progress_percent"] is None
