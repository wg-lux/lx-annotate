from __future__ import annotations

from typing import Any, cast
from unittest.mock import patch

import pytest
from endoreg_db.models import Center, NetworkNode, VideoFile
from lx_dtypes.models.contracts.video_provenance import (
    VideoFrameProvenancePayload,
    VideoFrameTimeline,
    VideoProvenanceBundle,
)

from lx_annotate.hub.hub_export_payloads import build_transfer_payload
from lx_annotate.models import OutboundHubTransferJob


def test_video_sender_includes_the_validated_frame_provenance_bundle() -> None:
    center = Center(name="provenance-test", center_key="provenance-test")
    source = NetworkNode(
        role=NetworkNode.Role.SITE_NODE,
        node_key="source",
        owning_center=center,
        is_active=True,
    )
    target = NetworkNode(
        role=NetworkNode.Role.CENTRAL_HUB, node_key="target", is_active=True
    )
    video = VideoFile(raw_video_hash="a" * 64, processed_video_hash="b" * 64)
    job = OutboundHubTransferJob(
        video_file=video,
        resource_kind="video",
        source_center=center,
        target_node=target,
        transfer_key="provenance-test",
        transfer_mode="metadata_and_processed_media",
    )
    before = VideoFrameTimeline(
        content_hash="a" * 64,
        time_base_num=1,
        time_base_den=1000,
        presentation_timestamps=[100, 130, 170],
    )
    after = VideoFrameTimeline(
        content_hash="b" * 64,
        time_base_num=1,
        time_base_den=1000,
        presentation_timestamps=[0, 40],
    )
    bundle = VideoProvenanceBundle(
        transformations=[
            VideoFrameProvenancePayload(
                source=before, output=after, source_frame_indices=[0, 2]
            )
        ]
    )
    with (
        patch(
            "lx_annotate.hub.hub_export_payloads._build_video_rows",
            return_value={
                "video_file": {"processed_video_hash": "b" * 64},
                "video_segments": [
                    {
                        "source_segment_id": 3,
                        "start_frame_number": 1,
                        "end_frame_number_exclusive": 2,
                    }
                ],
            },
        ),
        patch(
            "endoreg_db.services.hub.video_provenance.export_video_provenance",
            return_value=bundle,
        ) as export,
    ):
        payload = build_transfer_payload(outbound_job=job, source_node=source)
    export.assert_called_once_with(video)
    assert "provenance" in payload
    assert payload["provenance"]["video_frame_provenance"] == bundle.model_dump(
        mode="json"
    )
    # Processed frame 1 descends from recording frame 2 (frame 1 was dropped).
    [segment] = cast(dict[str, Any], payload)["resource_rows"]["video_segments"]
    assert segment["timeline_coordinates"]["recording"] == {
        "recording_content_hash": "a" * 64,
        "time_base_num": 1,
        "time_base_den": 1000,
        "first_frame_index": 2,
        "last_frame_index": 2,
        "first_presentation_timestamp": 170,
        "last_presentation_timestamp": 170,
    }
    assert (
        segment["timeline_coordinates"]["generation"]["first_presentation_timestamp"]
        == 40
    )


def test_sender_fails_when_actual_frame_provenance_is_missing() -> None:
    center = Center(name="provenance-test", center_key="provenance-test")
    source = NetworkNode(
        role=NetworkNode.Role.SITE_NODE,
        node_key="source",
        owning_center=center,
        is_active=True,
    )
    target = NetworkNode(
        role=NetworkNode.Role.CENTRAL_HUB, node_key="target", is_active=True
    )
    video = VideoFile(raw_video_hash="a" * 64, processed_video_hash="b" * 64)
    job = OutboundHubTransferJob(
        video_file=video,
        resource_kind="video",
        source_center=center,
        target_node=target,
        transfer_key="provenance-test",
        transfer_mode="metadata_and_processed_media",
    )
    with (
        patch("lx_annotate.hub.hub_export_payloads._build_video_rows", return_value={}),
        patch(
            "endoreg_db.services.hub.video_provenance.export_video_provenance",
            side_effect=ValueError("Actual frame provenance is unavailable"),
        ),
        pytest.raises(ValueError, match="provenance is unavailable"),
    ):
        build_transfer_payload(outbound_job=job, source_node=source)
