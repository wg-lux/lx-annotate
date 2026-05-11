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
