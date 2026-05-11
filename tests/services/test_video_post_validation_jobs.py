from unittest.mock import patch

import pytest

from endoreg_db.models import Center, VideoFile, VideoProcessingHistory, VideoState
from endoreg_db.models.state.video_segment_validation import (
    OUTSIDE_FRAME_BLACKENING_KIND,
    resolve_segment_annotation_status,
)
from endoreg_db.services import video_post_validation_jobs
from endoreg_db.services.video_post_validation_jobs import (
    dispatch_video_post_validation_rebuild,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def center():
    return Center.objects.create(name="Post Validation Job Test Center")


def _make_video(center, *, video_hash: str = "post-validation-video") -> VideoFile:
    state = VideoState.objects.create(
        frames_extracted=True,
        frames_initialized=True,
        frame_count=1,
    )
    return VideoFile.objects.create(
        center=center,
        state=state,
        video_hash=video_hash,
        original_file_name=f"{video_hash}.mp4",
    )


def _make_history(video: VideoFile) -> VideoProcessingHistory:
    return VideoProcessingHistory.objects.create(
        video=video,
        operation=VideoProcessingHistory.OPERATION_REPROCESSING,
        status=VideoProcessingHistory.STATUS_PENDING,
        task_id="post-validation-task",
        config={"kind": OUTSIDE_FRAME_BLACKENING_KIND, "only_validated": False},
    )


def test_legacy_validated_without_outside_cleanup_serializes_as_required(center):
    video = _make_video(center, video_hash="legacy-premature-green")
    state = video.get_or_create_state()
    state.segment_annotations_created = True
    state.segment_annotations_validated = True
    state.outside_segments_removed = False
    state.save(
        update_fields=[
            "segment_annotations_created",
            "segment_annotations_validated",
            "outside_segments_removed",
            "date_modified",
        ]
    )

    assert resolve_segment_annotation_status(video) == "cleanup_required"


def test_rebuild_success_marks_final_only_after_verification(center):
    video = _make_video(center, video_hash="rebuild-success")
    history = _make_history(video)

    with (
        patch.object(
            VideoFile, "create_video_without_outside_frames", return_value=True
        ),
        patch.object(video_post_validation_jobs, "_verify_extracted_frame_contract"),
        patch.object(video_post_validation_jobs, "_verify_outside_frames_blackened"),
    ):
        result = video_post_validation_jobs._run_video_post_validation_rebuild(
            video.pk,
            history_id=history.pk,
        )

    assert result is True
    video.refresh_from_db()
    state = video.get_or_create_state()
    assert state.outside_segments_removed is True
    assert state.segment_annotations_validated is True
    history.refresh_from_db()
    assert history.status == VideoProcessingHistory.STATUS_SUCCESS


def test_rebuild_failure_keeps_final_flags_false(center):
    video = _make_video(center, video_hash="rebuild-failure")
    history = _make_history(video)

    with (
        patch.object(
            VideoFile, "create_video_without_outside_frames", return_value=True
        ),
        patch.object(
            video_post_validation_jobs,
            "_verify_extracted_frame_contract",
            side_effect=RuntimeError("frame contract failed"),
        ),
        patch.object(video_post_validation_jobs, "_verify_outside_frames_blackened"),
    ):
        with pytest.raises(RuntimeError, match="frame contract failed"):
            video_post_validation_jobs._run_video_post_validation_rebuild(
                video.pk,
                history_id=history.pk,
            )

    video.refresh_from_db()
    state = video.get_or_create_state()
    assert state.outside_segments_removed is False
    assert state.segment_annotations_validated is False
    history.refresh_from_db()
    assert history.status == VideoProcessingHistory.STATUS_FAILURE


def test_celery_dispatch_failure_does_not_fall_back_to_thread(monkeypatch, center):
    video = _make_video(center, video_hash="celery-dispatch-failure")
    monkeypatch.setenv("VIDEO_POST_VALIDATION_JOB_MODE", "celery")

    class FailingTask:
        @staticmethod
        def apply_async(*args, **kwargs):
            raise RuntimeError("broker unavailable")

    monkeypatch.setattr(
        "endoreg_db.tasks.run_video_post_validation_rebuild_task",
        FailingTask,
    )

    with patch.object(video_post_validation_jobs._executor, "submit") as submit:
        result = dispatch_video_post_validation_rebuild(video_id=video.pk)

    submit.assert_not_called()
    assert result.status == "failed"
    assert result.mode == "celery"
    assert result.history_id is not None
    history = VideoProcessingHistory.objects.get(video=video)
    assert history.status == VideoProcessingHistory.STATUS_FAILURE
    assert "broker unavailable" in history.details
