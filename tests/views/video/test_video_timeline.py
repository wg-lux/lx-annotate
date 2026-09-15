from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import pytest
from django.contrib.auth.models import User
from endoreg_db.models import Center, Frame, VideoFile
from endoreg_db.schemas.video_storage import (
    VideoArtifactProbe,
    VideoSourceTimelineEvidence,
    VideoTimelineContract,
)
from endoreg_db.services.video_files import (
    get_video_frame_neighborhood,
    video_frame_number_to_seconds,
    video_seconds_to_frame_number,
)
from endoreg_db.services.video_storage.timelines import persist_video_source_timeline
from endoreg_db.services.video_timeline import VideoTimelineMappingError
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def _source_timeline_meta(
    *,
    frame_count: int,
    duration: float,
    variable_frame_rate: bool,
) -> dict[str, object]:
    timeline = VideoTimelineContract(
        fps_num=25,
        fps_den=1,
        duration_seconds=duration,
        frame_count=frame_count,
        variable_frame_rate=variable_frame_rate,
        time_base_num=1,
        time_base_den=90_000,
    )
    source = VideoArtifactProbe(
        codec_name="h264",
        pixel_format="yuv420p",
        width=1920,
        height=1080,
        size_bytes=1,
        timeline=timeline,
    )
    evidence = VideoSourceTimelineEvidence(
        persisted_at=datetime(2026, 1, 1, tzinfo=UTC),
        source=source,
        timestamp_mapping=("ffprobe_pts" if variable_frame_rate else "rational_cfr"),
    )
    return {"source_timeline": evidence.model_dump(mode="json")}


def _make_video(
    *,
    video_hash: str,
    timestamps: list[float | None],
    duration: float,
    variable_frame_rate: bool,
    with_timeline_meta: bool = True,
) -> VideoFile:
    center = Center.objects.create(name=f"Timeline Center {video_hash}")
    frame_count = len(timestamps)
    video = VideoFile.objects.create(
        center=center,
        video_hash=video_hash,
        original_file_name=f"{video_hash}.mp4",
        fps=25,
        duration=duration,
        frame_count=frame_count,
        meta=(
            _source_timeline_meta(
                frame_count=frame_count,
                duration=duration,
                variable_frame_rate=variable_frame_rate,
            )
            if with_timeline_meta
            else {}
        ),
    )
    Frame.objects.bulk_create(
        [
            Frame(
                video=video,
                frame_number=frame_number,
                relative_path=f"frame_{frame_number:07d}.jpg",
                timestamp=timestamp,
                is_extracted=True,
            )
            for frame_number, timestamp in enumerate(timestamps)
        ],
    )
    return video


@pytest.fixture
def vfr_video() -> VideoFile:
    return _make_video(
        video_hash="irregular-pts",
        timestamps=[0.0, 0.04, 0.11, 0.16, 0.24],
        duration=0.29,
        variable_frame_rate=True,
    )


def test_vfr_video_resolves_nearest_frame_from_persisted_pts(vfr_video: VideoFile):
    assert video_seconds_to_frame_number(vfr_video, 0.13) == 2
    assert video_seconds_to_frame_number(vfr_video, 0.15) == 3
    assert video_frame_number_to_seconds(vfr_video, 2) == pytest.approx(0.11)

    neighborhood = get_video_frame_neighborhood(vfr_video, 0.13, radius=2)

    assert neighborhood.timeline_version == "pts_v1"
    assert neighborhood.timestamp_mapping == "ffprobe_pts"
    assert neighborhood.requested_timestamp == pytest.approx(0.13)
    assert neighborhood.current.frame_number == 2
    assert neighborhood.current.timestamp == pytest.approx(0.11)
    assert neighborhood.previous is not None
    assert neighborhood.previous.timestamp == pytest.approx(0.04)
    assert neighborhood.next is not None
    assert neighborhood.next.timestamp == pytest.approx(0.16)
    assert [frame.timestamp for frame in neighborhood.frames] == pytest.approx(
        [0.0, 0.04, 0.11, 0.16, 0.24],
    )


def test_probed_vfr_timestamps_are_persisted_and_used_for_resolution(
    tmp_path: Path,
):
    video = _make_video(
        video_hash="probed-irregular-pts",
        timestamps=[None] * 5,
        duration=0.29,
        variable_frame_rate=True,
        with_timeline_meta=False,
    )
    timeline = VideoTimelineContract(
        fps_num=25,
        fps_den=1,
        duration_seconds=0.29,
        frame_count=5,
        variable_frame_rate=True,
        time_base_num=1,
        time_base_den=90_000,
    )
    artifact = VideoArtifactProbe(
        codec_name="h264",
        pixel_format="yuv420p",
        width=1920,
        height=1080,
        size_bytes=1,
        timeline=timeline,
    )

    persist_video_source_timeline(
        video,
        tmp_path / "source.mp4",
        probe_artifact=lambda _path: artifact,
        probe_frame_pts=lambda _path: [0.0, 0.04, 0.11, 0.16, 0.24],
    )

    video.refresh_from_db()
    assert list(
        video.frames.order_by("frame_number").values_list("timestamp", flat=True),
    ) == pytest.approx([0.0, 0.04, 0.11, 0.16, 0.24])
    assert video.meta["source_timeline"]["timestamp_mapping"] == "ffprobe_pts"
    assert video_seconds_to_frame_number(video, 0.13) == 2
    assert video_frame_number_to_seconds(video, 2) == pytest.approx(0.11)


def test_legacy_cfr_video_resolves_timestamps_without_frame_rows():
    video = _make_video(
        video_hash="legacy-cfr",
        timestamps=[None] * 5,
        duration=0.2,
        variable_frame_rate=False,
        with_timeline_meta=False,
    )

    neighborhood = get_video_frame_neighborhood(video, 0.105, radius=1)

    assert neighborhood.timeline_version == "legacy_cfr_v1"
    assert neighborhood.timestamp_mapping == "rational_cfr"
    assert neighborhood.current.frame_number == 3
    assert neighborhood.current.timestamp == pytest.approx(0.12)
    assert [frame.timestamp for frame in neighborhood.frames] == pytest.approx(
        [0.08, 0.12, 0.16],
    )


def test_frame_neighborhood_clamps_duration_to_last_display_frame(
    vfr_video: VideoFile,
):
    neighborhood = get_video_frame_neighborhood(vfr_video, 0.29, radius=2)

    assert neighborhood.current.frame_number == 4
    assert neighborhood.current.timestamp == pytest.approx(0.24)
    assert neighborhood.next is None
    assert [frame.frame_number for frame in neighborhood.frames] == [2, 3, 4]


def test_vfr_video_fails_closed_when_a_required_pts_is_missing():
    video = _make_video(
        video_hash="missing-vfr-pts",
        timestamps=[0.0, 0.04, None, 0.16, 0.24],
        duration=0.29,
        variable_frame_rate=True,
    )

    with pytest.raises(VideoTimelineMappingError, match="no persisted PTS"):
        get_video_frame_neighborhood(video, 0.13, radius=1)


def test_vfr_video_rejects_non_monotonic_persisted_pts():
    video = _make_video(
        video_hash="non-monotonic-vfr-pts",
        timestamps=[0.0, 0.04, 0.11, 0.10, 0.24],
        duration=0.29,
        variable_frame_rate=True,
    )

    with pytest.raises(VideoTimelineMappingError, match="strictly increasing"):
        get_video_frame_neighborhood(video, 0.11, radius=2)


def test_frame_neighborhood_endpoint_returns_canonical_pts(vfr_video: VideoFile):
    user = User.objects.create_superuser(
        username="timeline-reviewer",
        email="timeline@example.test",
        password="unused",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        f"/api/media/videos/{vfr_video.pk}/timeline/frame-neighborhood/",
        {"timestamp": "0.13", "radius": "1"},
    )

    assert response.status_code == 200
    assert response.data == {
        "video_id": vfr_video.pk,
        "requested_timestamp": 0.13,
        "timeline_version": "pts_v1",
        "timestamp_mapping": "ffprobe_pts",
        "current": {"frame_number": 2, "timestamp": 0.11},
        "previous": {"frame_number": 1, "timestamp": 0.04},
        "next": {"frame_number": 3, "timestamp": 0.16},
        "frames": [
            {"frame_number": 1, "timestamp": 0.04},
            {"frame_number": 2, "timestamp": 0.11},
            {"frame_number": 3, "timestamp": 0.16},
        ],
    }


def test_frame_neighborhood_endpoint_validates_query(vfr_video: VideoFile):
    user = User.objects.create_superuser(
        username="timeline-query-reviewer",
        email="timeline-query@example.test",
        password="unused",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        f"/api/media/videos/{vfr_video.pk}/timeline/frame-neighborhood/",
        {"timestamp": "-0.1", "radius": "0"},
    )

    assert response.status_code == 400
    payload = cast(dict[str, Any], response.data)
    assert payload["error"] == "Invalid frame-neighborhood query."
