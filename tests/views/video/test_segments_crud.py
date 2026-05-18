from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from endoreg_db.models import (
    Center,
    Frame,
    ImageClassificationAnnotation,
    InformationSource,
    Label,
    LabelVideoSegment,
    VideoFile,
    VideoProcessingHistory,
    VideoState,
)
from endoreg_db.models.state.video_segment_validation import (
    OUTSIDE_FRAME_BLACKENING_KIND,
)
from endoreg_db.services.video_post_validation_jobs import (
    JobDispatchResult,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    user = User.objects.create_user(username="segment-reviewer")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def center():
    return Center.objects.create(name="Outside Cleanup Test Center")


def _make_video(center, *, video_hash: str = "outside-cleanup-video") -> VideoFile:
    state = VideoState.objects.create(
        frames_extracted=True,
        frames_initialized=True,
        frame_count=4,
    )
    video = VideoFile.objects.create(
        center=center,
        state=state,
        video_hash=video_hash,
        original_file_name=f"{video_hash}.mp4",
    )
    Frame.objects.bulk_create(
        [
            Frame(
                video=video,
                frame_number=index,
                relative_path=f"frame_{index:07d}.jpg",
                is_extracted=True,
            )
            for index in range(4)
        ]
    )
    return video


def _make_segment(video: VideoFile, *, label_name: str) -> LabelVideoSegment:
    label, _ = Label.objects.get_or_create(name=label_name)
    source, _ = InformationSource.objects.get_or_create(name="manual_annotation")
    return LabelVideoSegment.objects.create(
        video_file=video,
        label=label,
        source=source,
        start_frame_number=0,
        end_frame_number=2,
    )


def _validate_bulk_url(video: VideoFile) -> str:
    return f"/api/media/videos/{video.pk}/segments/validate-bulk/"


def test_bulk_validation_with_queued_cleanup_stays_non_final(api_client, center):
    video = _make_video(center)
    segment = _make_segment(video, label_name="outside")

    def fake_dispatch(*, video_id: int, only_validated: bool = False):
        history = VideoProcessingHistory.objects.create(
            video_id=video_id,
            operation=VideoProcessingHistory.OPERATION_REPROCESSING,
            status=VideoProcessingHistory.STATUS_PENDING,
            task_id="task-cleanup-queued",
            config={
                "kind": OUTSIDE_FRAME_BLACKENING_KIND,
                "only_validated": only_validated,
            },
        )
        return JobDispatchResult(
            task_id="task-cleanup-queued",
            mode="celery",
            status="queued",
            video_id=video_id,
            history_id=history.pk,
        )

    with patch(
        "endoreg_db.views.video.segments_crud.dispatch_video_post_validation_rebuild",
        side_effect=fake_dispatch,
    ):
        response = api_client.post(
            _validate_bulk_url(video),
            {
                "segment_ids": [segment.pk],
                "is_validated": True,
                "information_source_name": "manual_annotation",
                "annotator": "annotator-a",
            },
            format="json",
        )

    assert response.status_code == 202
    assert response.data["segment_annotation_status"] == "cleanup_queued"
    assert response.data["segment_annotations_validated"] is False
    assert response.data["outside_segments_removed"] is False
    assert response.data["post_processing_job"]["status"] == "queued"
    assert response.data["post_processing_job"]["task_id"] == "task-cleanup-queued"

    video.refresh_from_db()
    state = video.get_or_create_state()
    assert state.segment_annotations_created is True
    assert state.segment_annotations_validated is False
    assert state.outside_segments_removed is False


def test_manual_segments_without_model_meta_create_frame_annotations(
    api_client, center
):
    video = _make_video(center, video_hash="manual-no-model-meta")
    segment = _make_segment(video, label_name="polyp")

    response = api_client.post(
        _validate_bulk_url(video),
        {
            "segment_ids": [segment.pk],
            "is_validated": True,
            "information_source_name": "manual_annotation",
            "annotator": "annotator-manual",
        },
        format="json",
    )

    assert response.status_code == 200
    assert response.data["segment_annotation_status"] == "validated"
    assert response.data["segment_annotations_validated"] is True

    annotations = ImageClassificationAnnotation.objects.filter(
        frame__video=video,
        label=segment.label,
        information_source__name="manual_annotation",
        model_meta__isnull=True,
        annotator="annotator-manual",
    )
    assert annotations.count() == 2


def test_bulk_validation_conflict_does_not_go_green(api_client, center):
    video = _make_video(center, video_hash="annotation-conflict")
    segment = _make_segment(video, label_name="outside")

    with patch.object(
        LabelVideoSegment,
        "generate_annotations",
        side_effect=RuntimeError("frame annotation failure"),
    ):
        response = api_client.post(
            _validate_bulk_url(video),
            {
                "segment_ids": [segment.pk],
                "is_validated": True,
                "information_source_name": "manual_annotation",
            },
            format="json",
        )

    assert response.status_code == 409
    assert response.data["segment_annotation_status"] == "not_started"
    assert response.data["segment_annotations_validated"] is False

    video.refresh_from_db()
    state = video.get_or_create_state()
    assert state.segment_annotations_validated is False
    assert state.outside_segments_removed is False


def test_bulk_validation_dispatch_failure_returns_503(api_client, center):
    video = _make_video(center, video_hash="dispatch-failure")
    segment = _make_segment(video, label_name="outside")

    def failing_dispatch(*, video_id: int, only_validated: bool = False):
        history = VideoProcessingHistory.objects.create(
            video_id=video_id,
            operation=VideoProcessingHistory.OPERATION_REPROCESSING,
            status=VideoProcessingHistory.STATUS_FAILURE,
            task_id="task-dispatch-failed",
            details="broker unavailable",
            config={
                "kind": OUTSIDE_FRAME_BLACKENING_KIND,
                "only_validated": only_validated,
            },
        )
        return JobDispatchResult(
            task_id="task-dispatch-failed",
            mode="celery",
            status="failed",
            video_id=video_id,
            history_id=history.pk,
        )

    with patch(
        "endoreg_db.views.video.segments_crud.dispatch_video_post_validation_rebuild",
        side_effect=failing_dispatch,
    ):
        response = api_client.post(
            _validate_bulk_url(video),
            {
                "segment_ids": [segment.pk],
                "is_validated": True,
                "information_source_name": "manual_annotation",
            },
            format="json",
        )

    assert response.status_code == 503
    assert response.data["segment_annotation_status"] == "cleanup_failed"
    assert response.data["segment_annotations_validated"] is False
    assert response.data["post_processing_job"]["status"] == "failed"

    video.refresh_from_db()
    state = video.get_or_create_state()
    assert state.segment_annotations_validated is False
    assert state.outside_segments_removed is False
    history = VideoProcessingHistory.objects.get(task_id="task-dispatch-failed")
    assert history.status == VideoProcessingHistory.STATUS_FAILURE
    assert "broker unavailable" in history.details


def test_video_list_surfaces_failed_cleanup_job_for_frontend(api_client, center):
    video = _make_video(center, video_hash="failed-cleanup-visible")
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
    failure_details = "outside-frame verification failed: majority frames not blackened"
    VideoProcessingHistory.objects.create(
        video=video,
        operation=VideoProcessingHistory.OPERATION_REPROCESSING,
        status=VideoProcessingHistory.STATUS_FAILURE,
        task_id="failed-cleanup-visible-task",
        details=failure_details,
        config={
            "kind": OUTSIDE_FRAME_BLACKENING_KIND,
            "only_validated": False,
        },
    )

    response = api_client.get("/api/media/videos/")

    assert response.status_code == 200
    payload = next(item for item in response.data["results"] if item["id"] == video.pk)
    assert payload["segment_annotation_status"] == "cleanup_failed"
    assert payload["segment_annotations_validated"] is False
    assert payload["outside_segments_removed"] is False
    assert (
        payload["post_validation_rebuild"]["status"]
        == VideoProcessingHistory.STATUS_FAILURE
    )
    assert (
        payload["post_validation_rebuild"]["task_id"]
        == "failed-cleanup-visible-task"
    )
    assert payload["post_validation_rebuild"]["details"] == failure_details


def test_blacken_outside_allows_rerun_after_failed_cleanup(
    api_client, center, monkeypatch
):
    video = _make_video(center, video_hash="failed-cleanup-rerun")
    _make_segment(video, label_name="outside")
    old_history = VideoProcessingHistory.objects.create(
        video=video,
        operation=VideoProcessingHistory.OPERATION_REPROCESSING,
        status=VideoProcessingHistory.STATUS_FAILURE,
        task_id="old-failed-cleanup-task",
        details="outside-frame verification failed",
        config={
            "kind": OUTSIDE_FRAME_BLACKENING_KIND,
            "only_validated": False,
        },
    )

    class FakeTask:
        @staticmethod
        def apply_async(*args, **kwargs):
            return SimpleNamespace(id="rerun-cleanup-task")

    monkeypatch.setenv("VIDEO_POST_VALIDATION_JOB_MODE", "celery")
    monkeypatch.setenv("CELERY_FRAME_EXTRACTION_REQUIRE_SECURE_TRANSPORT", "0")
    monkeypatch.setattr(
        "endoreg_db.tasks.run_video_post_validation_rebuild_task",
        FakeTask,
    )

    response = api_client.post(
        f"/api/media/videos/{video.pk}/segments/blacken-outside/",
        {"only_validated": False},
        format="json",
    )

    assert response.status_code == 202
    assert response.data["status"] == "queued"
    assert response.data["post_processing_job"]["task_id"] == "rerun-cleanup-task"
    assert response.data["post_processing_job"]["history_id"] != old_history.pk

    rerun_history = VideoProcessingHistory.objects.get(task_id="rerun-cleanup-task")
    assert rerun_history.status == VideoProcessingHistory.STATUS_PENDING
    assert rerun_history.config["kind"] == OUTSIDE_FRAME_BLACKENING_KIND
