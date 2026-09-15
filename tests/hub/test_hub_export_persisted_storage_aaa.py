from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.models.state.video_segment_validation import SegmentAnnotationStatus

from lx_annotate.hub.hub_export_contracts import (
    HubExportIntegrityStatus,
    HubExportOverview,
)
from lx_annotate.hub.hub_export_state import resolve_video_hub_export_state


def _finished_video(*, video_hash: str, state_hash: str) -> SimpleNamespace:
    return SimpleNamespace(
        processed_file=object(),
        processed_video_hash=video_hash,
        state=SimpleNamespace(
            ready_for_export=True,
            processed_file_sha256=state_hash,
            anonymization_status=AnonymizationState.VALIDATED,
        ),
    )


@patch(
    "lx_annotate.hub.hub_export_state.resolve_segment_annotation_status",
    return_value=SegmentAnnotationStatus.VALIDATED,
)
@patch(
    "lx_annotate.hub.hub_export_state.has_usable_processed_artifact", return_value=True
)
def test_matching_persisted_hash_evidence_marks_finished_video_verified(
    _artifact_present,
    _segment_status,
) -> None:
    # Arrange
    digest = "a" * 64
    video = _finished_video(video_hash=digest, state_hash=digest)

    # Act
    readiness = resolve_video_hub_export_state(video)  # type: ignore[arg-type]

    # Assert
    assert (
        readiness.export_integrity_status is HubExportIntegrityStatus.PERSISTED_VERIFIED
    )
    assert readiness.transfer_eligible is True


@patch(
    "lx_annotate.hub.hub_export_state.resolve_segment_annotation_status",
    return_value=SegmentAnnotationStatus.VALIDATED,
)
@patch(
    "lx_annotate.hub.hub_export_state.has_usable_processed_artifact", return_value=True
)
def test_mismatched_persisted_hash_evidence_fails_closed(
    _artifact_present,
    _segment_status,
) -> None:
    # Arrange
    video = _finished_video(video_hash="a" * 64, state_hash="b" * 64)

    # Act
    readiness = resolve_video_hub_export_state(video)  # type: ignore[arg-type]

    # Assert
    assert (
        readiness.export_integrity_status
        is HubExportIntegrityStatus.HASH_METADATA_MISMATCH
    )
    assert readiness.transfer_eligible is False
    assert readiness.blocked_reason == "processed media hash metadata mismatch"


def test_overview_contract_serializes_persisted_verified_without_coercion() -> None:
    # Arrange
    payload = {
        "selected_target_node_key": "hub-1",
        "source_node_key": "site-1",
        "hub_nodes": [],
        "config_ready": False,
        "config_error": "No configured hub",
        "privacy_summary": {
            "min_k": 5,
            "eligible_resource_count": 0,
            "eligible_case_count": 0,
            "marked_resource_count": 0,
            "smallest_equivalence_class_size": None,
            "violating_equivalence_class_count": 0,
            "passes_k_anonymity": False,
            "status": "unavailable",
        },
        "sync_summary": {
            "centers": [],
            "rejections": [],
            "duplicates": [],
            "processed_file_count": 0,
            "candidate_count": 0,
        },
        "items": [
            {
                "id": 17,
                "resource_kind": "video",
                "filename": "finished.mp4",
                "anonymization_status": "validated",
                "segment_annotation_status": "validated",
                "export_integrity_status": "persisted_verified",
                "processed_media_present": True,
                "source_center_key": "center-a",
                "source_center_name": "Center A",
                "marked_for_upload": False,
                "marked_by_username": None,
                "marked_at": None,
                "outbound_job_id": None,
                "outbound_status": "",
                "failure_class": None,
                "last_error": "",
                "blocked_reason": "",
                "last_transfer_timestamp": None,
                "target_node_key": "hub-1",
                "eligible": True,
                "created_at": None,
            }
        ],
    }

    # Act
    serialized = HubExportOverview.model_validate(payload).model_dump(mode="json")

    # Assert
    assert serialized["items"][0]["export_integrity_status"] == "persisted_verified"
    assert serialized["items"][0]["eligible"] is True
