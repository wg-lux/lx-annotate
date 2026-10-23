from __future__ import annotations

from types import SimpleNamespace
from typing import cast
from uuid import UUID

import pytest
from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.utils.hashs import get_hub_record_pseudonym

from lx_annotate.hub import hub_export_payloads
from lx_annotate.hub.hub_export_contracts import (
    MISSING_PSEUDONYMOUS_IDENTITY_DETAIL,
    HubPayloadRejected,
)
from lx_annotate.hub.hub_export_payloads import (
    TransferPayload,
    _require_eligible_anonymization_status,
    _require_processed_file,
    _require_value,
    _validate_frame_annotations,
    _validate_privacy_preserving_resource_rows,
    _validate_processing_history,
    _validate_sensitive_meta_row,
    _validate_structured_reports,
    _validate_transfer_contract,
    _validate_video_segment,
    _validated_report_fields,
    _validated_report_processed_hash,
    _validated_video_hashes,
    build_hub_identity_payload,
)

# Site-local persisted UUIDs; they must never appear on the wire.
LOCAL_PATIENT_UUID = UUID("821d81f1-fb20-4e38-b777-01c67fe03001")
LOCAL_EXAMINATION_UUID = UUID("821d81f1-fb20-4e38-b777-01c67fe03002")
# Contract 7.0 wire values are hub-scoped UUIDv8 pseudonyms.
PATIENT_UUID = UUID("821d81f1-fb20-8e38-b777-01c67fe03001")
EXAMINATION_UUID = UUID("821d81f1-fb20-8e38-b777-01c67fe03002")


def test_transfer_contract_rejects_non_processed_media_mode() -> None:
    payload = cast(
        TransferPayload,
        {
            "payload_schema_version": "7.0",
            "transfer_mode": "raw_media",
        },
    )

    with pytest.raises(ValueError, match="requires processed-media mode"):
        _validate_transfer_contract(payload)


@pytest.mark.parametrize(
    ("sensitive_meta", "error"),
    [
        (None, "must be a JSON object"),
        (
            {
                "patient_uuid": str(PATIENT_UUID),
                "examination_uuid": str(EXAMINATION_UUID),
                "patient_name": "prohibited",
            },
            "Extra inputs are not permitted",
        ),
        (
            {
                "patient_uuid": str(PATIENT_UUID),
                "examination_uuid": str(EXAMINATION_UUID),
                "patient_hash": "a" * 64,
            },
            "Extra inputs are not permitted",
        ),
        (
            {
                "patient_uuid": "not-a-uuid",
                "examination_uuid": str(EXAMINATION_UUID),
            },
            "patient_uuid",
        ),
        (
            {
                "patient_uuid": str(LOCAL_PATIENT_UUID),
                "examination_uuid": str(EXAMINATION_UUID),
            },
            "UUIDv8 pseudonyms",
        ),
        (
            {
                "patient_uuid": str(PATIENT_UUID),
                "examination_uuid": str(LOCAL_EXAMINATION_UUID),
            },
            "UUIDv8 pseudonyms",
        ),
    ],
)
def test_sensitive_meta_rejects_identifiers_and_invalid_hashes(
    sensitive_meta: object, error: str
) -> None:
    with pytest.raises(ValueError, match=error):
        _validate_sensitive_meta_row({"sensitive_meta": sensitive_meta})


def test_negative_frame_annotation_cannot_leave_the_node() -> None:
    annotation = {
        "annotation_id": 1,
        "raw_video_hash": "video-hash",
        "frame_number": 4,
        "frame_relative_path": "frames/4.jpg",
        "label_name": "finding",
        "value": False,
        "information_source_name": "manual_annotation",
    }

    with pytest.raises(ValueError, match="Only positive frame annotations"):
        _validate_frame_annotations({"frame_annotations": [annotation]})


@pytest.mark.parametrize(
    "report",
    [
        {"template_name": "report", "status": "draft", "version": 1, "is_active": True},
        {
            "template_name": "report",
            "status": "final",
            "version": 1,
            "is_active": False,
        },
    ],
)
def test_only_active_final_reports_can_leave_the_node(
    report: dict[str, object],
) -> None:
    with pytest.raises(ValueError, match="Only active final structured report"):
        _validate_structured_reports({"reports": [report]})


def _valid_segment() -> dict[str, object]:
    return {
        "source_node_key": "site-node",
        "source_segment_id": 1,
        "raw_video_hash": "video-hash",
        "start_frame_number": 2,
        "end_frame_number_exclusive": 5,
        "label_name": "finding",
        "source_kind": "prediction",
        "validation_state": "validated",
        "export_segment": True,
        "anonymous_provenance": {"information_source_name": "prediction"},
        "timeline_coordinates": {
            "schema_version": "1",
            "generation": {
                "content_hash": "b" * 64,
                "time_base_num": 1,
                "time_base_den": 1000,
                "first_frame_number": 2,
                "last_frame_number": 4,
                "first_presentation_timestamp": 80,
                "last_presentation_timestamp": 160,
            },
            "recording_mapping_status": "unresolved",
        },
    }


def test_video_segments_require_timeline_coordinates() -> None:
    segment = _valid_segment()
    del segment["timeline_coordinates"]

    with pytest.raises(ValueError, match="timeline_coordinates"):
        _validate_video_segment(segment, raw_video_hash="video-hash", frame_count=10)


@pytest.mark.parametrize(
    ("changes", "error"),
    [
        ({"raw_video_hash": "other-video"}, "raw_video_hash must match"),
        ({"start_frame_number": True}, "frame boundaries are invalid"),
        ({"end_frame_number_exclusive": 11}, "frame boundaries are invalid"),
        ({"model_name": "model-a"}, "model metadata must be supplied together"),
        (
            {
                "source_kind": "manual_annotation",
                "model_name": "model-a",
                "model_version": "1",
            },
            "model metadata is permitted only for exported predictions",
        ),
        ({"anonymous_provenance": None}, "anonymous_provenance must be an object"),
        ({"source_kind": "unknown"}, "source_kind is invalid"),
        ({"validation_state": "unknown"}, "validation_state is invalid"),
        ({"export_segment": "yes"}, "export_segment must be boolean"),
    ],
)
def test_video_segments_reject_inconsistent_identity_state_and_bounds(
    changes: dict[str, object], error: str
) -> None:
    segment = _valid_segment()
    segment.update(changes)

    with pytest.raises(ValueError, match=error):
        _validate_video_segment(segment, raw_video_hash="video-hash", frame_count=10)


@pytest.mark.parametrize(
    ("validator", "payload", "error"),
    [
        (
            _validate_frame_annotations,
            {"frame_annotations": [None]},
            "frame_annotations entries must be JSON objects",
        ),
        (
            _validate_structured_reports,
            {"reports": [None]},
            "reports entries must be JSON objects",
        ),
        (
            _validate_processing_history,
            {"processing_history": None},
            "processing_history must be a JSON object",
        ),
    ],
)
def test_nested_payload_collections_require_json_objects(
    validator, payload: dict[str, object], error: str
) -> None:
    with pytest.raises(ValueError, match=error):
        validator(payload)


def test_unknown_resource_kind_is_rejected() -> None:
    resource_rows = {
        "sensitive_meta": {
            "patient_uuid": str(PATIENT_UUID),
            "examination_uuid": str(EXAMINATION_UUID),
        }
    }

    with pytest.raises(ValueError, match="Unsupported outbound resource_kind"):
        _validate_privacy_preserving_resource_rows(
            resource_rows,
            resource_kind="raw_media",
        )


def test_processed_file_is_required_and_must_be_usable(monkeypatch) -> None:
    monkeypatch.setattr(
        hub_export_payloads,
        "has_usable_processed_artifact",
        lambda _resource: False,
    )

    with pytest.raises(ValueError, match="processed_file must exist and be non-empty"):
        _require_processed_file(SimpleNamespace(), field_name="processed_file")


def test_non_anonymized_status_is_rejected() -> None:
    eligible = {
        AnonymizationState.ANONYMIZED,
        AnonymizationState.DONE_PROCESSING_ANONYMIZATION,
        AnonymizationState.VALIDATED,
    }
    ineligible = next(status for status in AnonymizationState if status not in eligible)

    with pytest.raises(ValueError, match="requires anonymized state"):
        _require_eligible_anonymization_status(ineligible, kind="video")


@pytest.mark.parametrize(
    "sensitive_meta",
    [
        None,
        SimpleNamespace(
            pseudo_patient=None,
            pseudo_examination=SimpleNamespace(uuid=LOCAL_EXAMINATION_UUID),
        ),
    ],
)
def test_sensitive_meta_requires_both_pseudonymous_identities(sensitive_meta) -> None:
    with pytest.raises(HubPayloadRejected) as rejected:
        build_hub_identity_payload(sensitive_meta, hub_node_key="hub-node")

    assert rejected.value.blocker.code == "identity_evidence"
    assert str(rejected.value) == MISSING_PSEUDONYMOUS_IDENTITY_DETAIL


@pytest.mark.parametrize("hub_node_key", ["hub-node", "other-hub"])
def test_sensitive_meta_identity_payload_uses_hub_pseudonyms(hub_node_key: str) -> None:
    sensitive_meta = SimpleNamespace(
        pseudo_patient=SimpleNamespace(uuid=LOCAL_PATIENT_UUID),
        pseudo_examination=SimpleNamespace(uuid=LOCAL_EXAMINATION_UUID),
    )

    payload = build_hub_identity_payload(sensitive_meta, hub_node_key=hub_node_key)
    assert payload == {
        "patient_uuid": str(
            get_hub_record_pseudonym(
                LOCAL_PATIENT_UUID, kind="patient", hub_node_key=hub_node_key
            )
        ),
        "examination_uuid": str(
            get_hub_record_pseudonym(
                LOCAL_EXAMINATION_UUID, kind="examination", hub_node_key=hub_node_key
            )
        ),
    }
    assert str(LOCAL_PATIENT_UUID) not in payload.values()
    assert str(LOCAL_EXAMINATION_UUID) not in payload.values()


@pytest.mark.parametrize("value", [None, ""])
def test_required_payload_value_rejects_missing_values(value) -> None:
    with pytest.raises(ValueError, match="field must exist"):
        _require_value(value, field_name="field")


def test_video_hash_validation_requires_state(monkeypatch) -> None:
    monkeypatch.setattr(
        hub_export_payloads,
        "_require_processed_file",
        lambda *_args, **_kwargs: None,
    )
    with pytest.raises(ValueError, match="VideoFile.state must exist"):
        _validated_video_hashes(SimpleNamespace(state=None))


@pytest.mark.parametrize(
    "state",
    [
        SimpleNamespace(processed_file_sha256="different"),
        SimpleNamespace(processed_file_sha256=""),
    ],
)
def test_report_processed_hash_rejects_missing_or_inconsistent_metadata(
    monkeypatch, state
) -> None:
    monkeypatch.setattr(hub_export_payloads, "get_file_hash", lambda _file: "actual")
    report = SimpleNamespace(processed_file=object())

    with pytest.raises(ValueError, match="hash metadata is inconsistent|must exist"):
        _validated_report_processed_hash(report, state=state)


def test_report_fields_require_state(monkeypatch) -> None:
    monkeypatch.setattr(
        hub_export_payloads,
        "_require_processed_file",
        lambda *_args, **_kwargs: None,
    )
    with pytest.raises(ValueError, match="RawPdfFile.state must exist"):
        _validated_report_fields(SimpleNamespace(state=None))
