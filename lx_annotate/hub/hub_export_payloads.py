from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path
from typing import Any
from typing import cast
from typing import Literal
from typing import TypedDict

from endoreg_db.models import Center
from endoreg_db.models import ImageClassificationAnnotation
from endoreg_db.models import LabelVideoSegment
from endoreg_db.models import NetworkNode
from endoreg_db.models import PatientExamination
from endoreg_db.models import PatientExaminationReport
from endoreg_db.models import RawPdfFile
from endoreg_db.models import SensitiveMeta
from endoreg_db.models import TransferJob
from endoreg_db.models import VideoFile
from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.utils.file_operations import sha256_file
from lx_dtypes.models.contracts import JsonValue
from lx_dtypes.models.contracts import validate_hub_transfer_report_payload
from lx_dtypes.models.contracts import validate_hub_transfer_video_payload

from ..models import OutboundHubTransferJob
from .hub_export_state import has_usable_processed_artifact
from .hub_export_state import is_report_hub_export_eligible
from .hub_export_state import is_video_hub_export_eligible


class VideoFilePayload(TypedDict, total=False):
    video_hash: str
    processed_video_hash: str
    suffix: str | None
    fps: float | None
    duration: float | None
    frame_count: int | None
    width: int | None
    height: int | None


class VideoStatePayload(TypedDict, total=False):
    sensitive_meta_processed: bool
    frames_extracted: bool
    processing_started: bool
    frame_annotations_generated: bool
    anonymized: bool
    anonymization_validated: bool
    outside_segments_removed: bool
    segment_annotations_created: bool
    segment_annotations_validated: bool
    processed_file_sha256: str


class RawPdfFilePayload(TypedDict, total=False):
    pdf_hash: str
    anonymized_text: str


class RawPdfStatePayload(TypedDict, total=False):
    sensitive_meta_processed: bool
    processing_started: bool
    text_meta_extracted: bool
    anonymized: bool
    anonymization_validated: bool
    processed_file_sha256: str


class SensitiveMetaPayload(TypedDict, total=False):
    patient_hash: str
    examination_hash: str


class FrameAnnotationPayload(TypedDict, total=False):
    annotation_id: int
    video_hash: str
    frame_number: int
    frame_relative_path: str
    frame_timestamp: float | None
    label_name: str
    value: bool
    float_value: float | None
    information_source_name: str


class VideoSegmentPayload(TypedDict, total=False):
    source_node_key: str
    source_segment_id: int
    video_hash: str
    start_frame_number: int
    end_frame_number_exclusive: int
    label_name: str
    source_kind: Literal["manual_annotation", "prediction"]
    validation_state: Literal["unvalidated", "validated"]
    export_segment: bool
    anonymous_provenance: dict[str, str]
    model_name: str
    model_version: str


class StructuredReportPayload(TypedDict, total=False):
    template_name: str
    template_version: str
    template_hash: str
    status: Literal["final"]
    version: int
    is_active: bool


class ProcessingHistoryPayload(TypedDict):
    file_hash: str
    success: bool


class TransferPayload(TypedDict, total=False):
    transfer_key: str
    source_node_key: str
    target_node_key: str
    source_center_key: str
    resource_kind: Literal["video", "report"]
    resource_hash: str
    transfer_mode: str
    processing_policy: str
    processing_intent: str
    cleanup_policy: str
    payload_schema_version: str
    resource_rows: dict[str, Any]
    processing_snapshot: dict[str, Any]
    provenance: dict[str, Any]


def _require_processed_file(resource, *, field_name: str) -> None:
    if field_name != "processed_file" or not has_usable_processed_artifact(resource):
        raise ValueError(
            f"{type(resource).__name__}.{field_name} must exist and be non-empty "
            "for outbound hub transfer.",
        )


def _require_eligible_anonymization_status(
    status: AnonymizationState,
    *,
    kind: str,
) -> None:
    if status not in {
        AnonymizationState.ANONYMIZED,
        AnonymizationState.DONE_PROCESSING_ANONYMIZATION,
        AnonymizationState.VALIDATED,
    }:
        raise ValueError(
            f"{kind} transfer requires anonymized state. "
            f"Current anonymization_status={status.value!r} is not eligible.",
        )


def _build_sensitive_meta_payload(
    sensitive_meta: SensitiveMeta | None,
) -> SensitiveMetaPayload:
    if sensitive_meta is None:
        raise ValueError(
            "SensitiveMeta with patient_hash and examination_hash is required "
            "for hub transfer.",
        )

    patient_hash = str(sensitive_meta.patient_hash or "").strip()
    examination_hash = str(sensitive_meta.examination_hash or "").strip()
    if not patient_hash or not examination_hash:
        raise ValueError(
            "SensitiveMeta must include patient_hash and examination_hash for "
            "hub transfer.",
        )

    return {
        "patient_hash": patient_hash,
        "examination_hash": examination_hash,
    }


def _require_value(value: Any, *, field_name: str) -> Any:
    if value is None or value == "":
        raise ValueError(f"{field_name} must exist for outbound hub transfer.")
    return value


def _validated_video_hashes(video: VideoFile) -> tuple[Any, str, str]:
    _require_processed_file(video, field_name="processed_file")
    state = video.state
    if state is None:
        raise ValueError("VideoFile.state must exist for outbound hub transfer.")
    if not is_video_hub_export_eligible(video):
        raise ValueError(
            f"video transfer requires anonymized processed state. Current anonymization_status={state.anonymization_status.value!r} is not eligible.",
        )
    _require_eligible_anonymization_status(state.anonymization_status, kind="video")
    processed_video_hash = str(video.processed_video_hash or "").strip()
    state_processed_hash = str(state.processed_file_sha256 or "").strip()
    if not processed_video_hash or not state_processed_hash:
        raise ValueError(
            "VideoFile.processed_video_hash and VideoState.processed_file_sha256 "
            "must exist for processed-media transfer.",
        )
    if processed_video_hash != state_processed_hash:
        raise ValueError(
            "Processed video hash metadata is inconsistent; refusing outbound transfer.",
        )
    actual_processed_hash = sha256_file(video.processed_file)
    if actual_processed_hash != processed_video_hash:
        raise ValueError(
            "Processed video file hash does not match persisted hash metadata; "
            "refusing outbound transfer.",
        )
    return state, processed_video_hash, state_processed_hash


def _video_file_payload(
    video: VideoFile,
    *,
    processed_video_hash: str,
) -> VideoFilePayload:
    return {
        "video_hash": video.video_hash,
        "processed_video_hash": processed_video_hash,
        "suffix": Path(str(video.suffix or ".mp4")).suffix or ".mp4",
        "fps": _require_value(video.fps, field_name="VideoFile.fps"),
        "duration": _require_value(video.duration, field_name="VideoFile.duration"),
        "frame_count": _require_value(
            video.frame_count,
            field_name="VideoFile.frame_count",
        ),
        "width": _require_value(video.width, field_name="VideoFile.width"),
        "height": _require_value(video.height, field_name="VideoFile.height"),
    }


def _video_state_payload(state: Any, *, state_processed_hash: str) -> VideoStatePayload:
    return {
        "sensitive_meta_processed": bool(state.sensitive_meta_processed),
        "frames_extracted": bool(state.frames_extracted),
        "processing_started": bool(state.processing_started),
        "frame_annotations_generated": bool(
            getattr(state, "segment_annotations_created", False),
        ),
        "anonymized": bool(state.anonymized),
        "anonymization_validated": bool(state.anonymization_validated),
        "outside_segments_removed": bool(state.outside_segments_removed),
        "segment_annotations_created": bool(state.segment_annotations_created),
        "segment_annotations_validated": bool(state.segment_annotations_validated),
        "processed_file_sha256": state_processed_hash,
    }


def _build_video_rows(video: VideoFile, *, source_node_key: str) -> dict[str, Any]:
    state, processed_video_hash, state_processed_hash = _validated_video_hashes(video)
    return {
        "video_file": _video_file_payload(
            video,
            processed_video_hash=processed_video_hash,
        ),
        "video_state": _video_state_payload(
            state,
            state_processed_hash=state_processed_hash,
        ),
        "sensitive_meta": _build_sensitive_meta_payload(video.sensitive_meta),
        "processing_history": {
            "file_hash": processed_video_hash,
            "success": not bool(getattr(state, "processing_error", False)),
        },
        "video_segments": _build_video_segment_rows(
            video,
            source_node_key=source_node_key,
        ),
        "frame_annotations": _build_frame_annotation_rows(video),
        "reports": _build_structured_report_rows(_resolve_examination(video)),
    }


def _validated_report_processed_hash(report: RawPdfFile, *, state: Any) -> str:
    actual_processed_hash = sha256_file(report.processed_file)
    state_processed_hash = str(
        getattr(state, "processed_file_sha256", "") or "",
    ).strip()
    if state_processed_hash and state_processed_hash != actual_processed_hash:
        raise ValueError(
            "Processed report hash metadata is inconsistent; refusing outbound transfer.",
        )
    if hasattr(state, "processed_file_sha256") and not state_processed_hash:
        raise ValueError(
            "RawPdfState.processed_file_sha256 must exist for outbound hub transfer.",
        )
    return state_processed_hash or actual_processed_hash


def _validated_report_fields(report: RawPdfFile) -> tuple[Any, str, str]:
    _require_processed_file(report, field_name="processed_file")
    state = report.state
    if state is None:
        raise ValueError("RawPdfFile.state must exist for outbound hub transfer.")
    if not is_report_hub_export_eligible(report):
        raise ValueError(
            f"report transfer requires anonymized processed state. Current anonymization_status={state.anonymization_status.value!r} is not eligible.",
        )
    _require_eligible_anonymization_status(state.anonymization_status, kind="report")

    anonymized_text = str(report.anonymized_text or "").strip()
    if not anonymized_text:
        raise ValueError(
            "RawPdfFile.anonymized_text must exist for outbound hub transfer.",
        )
    processed_file_sha256 = _validated_report_processed_hash(report, state=state)
    return state, anonymized_text, processed_file_sha256


def _report_file_payload(
    report: RawPdfFile,
    *,
    anonymized_text: str,
) -> RawPdfFilePayload:
    return {
        "pdf_hash": report.pdf_hash,
        "anonymized_text": anonymized_text,
    }


def _report_state_payload(
    state: Any,
    *,
    processed_file_sha256: str,
) -> RawPdfStatePayload:
    return {
        "sensitive_meta_processed": bool(state.sensitive_meta_processed),
        "processing_started": bool(state.processing_started),
        "text_meta_extracted": bool(getattr(state, "text_meta_extracted", False)),
        "anonymized": bool(state.anonymized),
        "anonymization_validated": bool(state.anonymization_validated),
        "processed_file_sha256": processed_file_sha256,
    }


def _build_report_rows(report: RawPdfFile) -> dict[str, Any]:
    state, anonymized_text, processed_file_sha256 = _validated_report_fields(report)
    return {
        "raw_pdf_file": _report_file_payload(
            report,
            anonymized_text=anonymized_text,
        ),
        "raw_pdf_state": _report_state_payload(
            state,
            processed_file_sha256=processed_file_sha256,
        ),
        "sensitive_meta": _build_sensitive_meta_payload(report.sensitive_meta),
        "processing_history": {
            "file_hash": report.pdf_hash,
            "success": not bool(getattr(state, "processing_error", False)),
        },
        "reports": _build_structured_report_rows(_resolve_examination(report)),
    }


def _resolve_examination(
    resource: RawPdfFile | VideoFile,
) -> PatientExamination | None:
    examination = getattr(resource, "examination", None)
    if examination is not None:
        return cast(PatientExamination, examination)
    sensitive_meta = resource.sensitive_meta
    if sensitive_meta is None:
        return None
    return cast(
        PatientExamination | None,
        getattr(sensitive_meta, "pseudo_examination", None),
    )


def _build_frame_annotation_rows(video: VideoFile) -> list[FrameAnnotationPayload]:
    annotations = (
        ImageClassificationAnnotation.objects.filter(
            frame__video=video,
            value=True,
            information_source__isnull=False,
        )
        .select_related("frame", "label", "information_source")
        .order_by("pk")
    )
    rows: list[FrameAnnotationPayload] = []
    for annotation in annotations:
        information_source = annotation.information_source
        if information_source is None:
            continue
        frame = annotation.frame
        rows.append(
            {
                "annotation_id": int(annotation.pk),
                "video_hash": video.video_hash,
                "frame_number": int(frame.frame_number),
                "frame_relative_path": (
                    f"frames/{video.video_hash}/{int(frame.frame_number):08d}.jpg"
                ),
                "frame_timestamp": frame.timestamp,
                "label_name": annotation.label.name,
                "value": True,
                "float_value": annotation.float_value,
                "information_source_name": information_source.name,
            },
        )
    return rows


def _segment_identity(segment: LabelVideoSegment) -> tuple[int, str]:
    segment_id = segment.pk
    if segment_id is None:
        raise ValueError("LabelVideoSegment must be persisted before hub transfer.")
    if segment.label is None:
        raise ValueError(
            f"LabelVideoSegment {segment_id} requires a label for hub transfer.",
        )
    return int(segment_id), segment.label.name


def _segment_source_kind(
    segment: LabelVideoSegment,
) -> Literal["manual_annotation", "prediction"]:
    is_prediction = segment.prediction_meta is not None or (
        segment.source is not None and segment.source.name == "prediction"
    )
    return "prediction" if is_prediction else "manual_annotation"


def _add_segment_model_metadata(
    row: VideoSegmentPayload,
    *,
    segment: LabelVideoSegment,
    source_kind: Literal["manual_annotation", "prediction"],
) -> None:
    if (
        source_kind == "prediction"
        and segment.export_segment
        and segment.prediction_meta is not None
    ):
        model_meta = segment.prediction_meta.model_meta
        row["model_name"] = model_meta.name
        row["model_version"] = model_meta.version


def _build_video_segment_row(
    segment: LabelVideoSegment,
    *,
    video_hash: str,
    source_node_key: str,
) -> VideoSegmentPayload:
    segment_id, label_name = _segment_identity(segment)
    source_kind = _segment_source_kind(segment)
    information_source_name = (
        segment.source.name if segment.source is not None else source_kind
    )
    row: VideoSegmentPayload = {
        "source_node_key": source_node_key,
        "source_segment_id": segment_id,
        "video_hash": video_hash,
        "start_frame_number": int(segment.start_frame_number),
        "end_frame_number_exclusive": int(segment.end_frame_number),
        "label_name": label_name,
        "source_kind": source_kind,
        "validation_state": "validated" if segment.is_validated else "unvalidated",
        "export_segment": bool(segment.export_segment),
        "anonymous_provenance": {
            "information_source_name": information_source_name,
        },
    }
    _add_segment_model_metadata(
        row,
        segment=segment,
        source_kind=source_kind,
    )
    return row


def _build_video_segment_rows(
    video: VideoFile,
    *,
    source_node_key: str,
) -> list[VideoSegmentPayload]:
    segments = (
        LabelVideoSegment.objects.filter(video_file=video)
        .select_related("label", "source", "state", "prediction_meta__model_meta")
        .order_by("pk")
    )
    rows: list[VideoSegmentPayload] = []
    for segment in segments:
        rows.append(
            _build_video_segment_row(
                segment,
                video_hash=video.video_hash,
                source_node_key=source_node_key,
            ),
        )
    return rows


def _build_structured_report_rows(
    examination: PatientExamination | None,
) -> list[StructuredReportPayload]:
    if examination is None:
        return []
    reports = PatientExaminationReport.objects.filter(
        patient_examination=examination,
        status=PatientExaminationReport.Status.FINAL,
        is_active=True,
    ).order_by("template_name", "template_version", "template_hash", "version")
    return [
        {
            "template_name": report.template_name,
            "template_version": report.template_version,
            "template_hash": report.template_hash,
            "status": "final",
            "version": int(report.version),
            "is_active": True,
        }
        for report in reports
    ]


def _build_processing_snapshot() -> dict[str, Any]:
    return {"sender_processing_success": True}


def build_transfer_payload(
    *,
    outbound_job: OutboundHubTransferJob,
    source_node: NetworkNode,
) -> TransferPayload:
    if source_node.role != NetworkNode.Role.SITE_NODE:
        raise ValueError("source_node must have role='site_node' for sender export.")
    if not source_node.is_active:
        raise ValueError("source_node must be active for sender export.")
    if not outbound_job.target_node.is_active:
        raise ValueError("target_node must be active for sender export.")

    if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO:
        video = outbound_job.video_file
        if video is None:
            raise ValueError("OutboundHubTransferJob.video_file must be set.")
        resource_rows = _build_video_rows(
            video,
            source_node_key=source_node.node_key,
        )
        resource_hash = video.video_hash
    else:
        report = outbound_job.raw_pdf_file
        if report is None:
            raise ValueError("OutboundHubTransferJob.raw_pdf_file must be set.")
        resource_rows = _build_report_rows(report)
        resource_hash = report.pdf_hash

    source_center = outbound_job.source_center or source_node.owning_center
    if source_center is None:
        raise ValueError("A source center is required for outbound hub transfer.")

    payload: TransferPayload = {
        "transfer_key": outbound_job.transfer_key,
        "source_node_key": source_node.node_key,
        "target_node_key": outbound_job.target_node.node_key,
        "source_center_key": source_center.center_key,
        "resource_kind": cast(Literal["video", "report"], outbound_job.resource_kind),
        "resource_hash": resource_hash,
        "transfer_mode": outbound_job.transfer_mode,
        "processing_policy": "preserve_processing_state",
        "processing_intent": "sender_requests_state_preservation",
        "cleanup_policy": "retain_all",
        "payload_schema_version": "3.0",
        "resource_rows": resource_rows,
        "processing_snapshot": _build_processing_snapshot(),
        "provenance": {
            "entrypoint": "lx_annotate_sender",
            "source_node_key": source_node.node_key,
            "source_center_key": source_center.center_key,
            "target_node_key": outbound_job.target_node.node_key,
            "transfer_mode": outbound_job.transfer_mode,
            "processing_policy": "preserve_processing_state",
            "cleanup_policy": "retain_all",
        },
    }
    return payload


def _validate_transfer_contract(
    payload: TransferPayload,
) -> tuple[str, dict[str, Any]]:
    if payload.get("payload_schema_version") != "3.0":
        raise ValueError("Outbound hub transfer requires payload_schema_version='3.0'.")
    if payload.get("transfer_mode") != (
        TransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA.value
    ):
        raise ValueError("Outbound hub transfer requires processed-media mode.")

    resource_kind = str(payload.get("resource_kind") or "")
    if resource_kind == TransferJob.ResourceKind.VIDEO.value:
        video_payload = validate_hub_transfer_video_payload(
            cast(Mapping[str, JsonValue], payload),
        )
        return resource_kind, cast(dict[str, Any], video_payload)
    if resource_kind == TransferJob.ResourceKind.REPORT.value:
        report_payload = validate_hub_transfer_report_payload(
            cast(Mapping[str, JsonValue], payload),
        )
        return resource_kind, cast(dict[str, Any], report_payload)
    raise ValueError(f"Unsupported outbound resource_kind: {resource_kind!r}.")


def _validated_resource_rows(
    payload: TransferPayload,
    *,
    resource_kind: str,
) -> dict[str, Any]:
    resource_rows = payload.get("resource_rows", {})
    if not isinstance(resource_rows, dict):
        raise ValueError("resource_rows must be a JSON object.")
    _validate_privacy_preserving_resource_rows(
        resource_rows,
        resource_kind=resource_kind,
    )
    return resource_rows


def _validated_processing_snapshot(payload: TransferPayload) -> dict[str, Any]:
    processing_snapshot = payload.get("processing_snapshot", {})
    if processing_snapshot != {"sender_processing_success": True}:
        raise ValueError(
            "processing_snapshot must declare sender_processing_success=true.",
        )
    return cast(dict[str, Any], processing_snapshot)


def _validated_resource_hash(
    payload: TransferPayload,
    *,
    resource_kind: str,
    resource_rows: dict[str, Any],
) -> str:
    nested_row_name, nested_hash_name = {
        TransferJob.ResourceKind.VIDEO.value: ("video_file", "video_hash"),
        TransferJob.ResourceKind.REPORT.value: ("raw_pdf_file", "pdf_hash"),
    }[resource_kind]
    resource_hash = str(payload.get("resource_hash") or "").strip()
    nested_resource_hash = str(
        cast(dict[str, Any], resource_rows.get(nested_row_name, {})).get(
            nested_hash_name,
            "",
        ),
    ).strip()
    if not resource_hash or nested_resource_hash != resource_hash:
        raise ValueError("resource_hash must match the transferred resource row.")
    return resource_hash


def _resolve_transfer_parties(
    payload: TransferPayload,
) -> tuple[NetworkNode, NetworkNode, Center]:
    source_node = NetworkNode.objects.get(
        node_key=str(payload.get("source_node_key") or "").strip(),
        role=NetworkNode.Role.SITE_NODE,
        is_active=True,
    )
    target_node = NetworkNode.objects.get(
        node_key=str(payload.get("target_node_key") or "").strip(),
        role=NetworkNode.Role.CENTRAL_HUB,
        is_active=True,
    )
    source_center = Center.objects.get(
        center_key=str(payload.get("source_center_key") or "").strip(),
    )
    return source_node, target_node, source_center


def _validate_transfer_identity(
    payload: TransferPayload,
    *,
    source_node: NetworkNode,
    source_center: Center,
    resource_kind: str,
    resource_hash: str,
) -> None:
    owning_center_id = cast(int | None, getattr(source_node, "owning_center_id", None))
    if owning_center_id is None:
        raise ValueError("source_node must have an owning center for sender export.")
    if owning_center_id != source_center.pk:
        raise ValueError(
            "source_center_key must match the source node owning center before transfer.",
        )
    expected_transfer_key = (
        f"{source_node.node_key}__{resource_kind}__{resource_hash}__processed_v1"
    )
    if str(payload.get("transfer_key") or "") != expected_transfer_key:
        raise ValueError(
            "transfer_key must match the immutable source node, resource kind, "
            "resource hash, and processed-media transfer identity.",
        )


def _validate_segment_source_node(
    resource_rows: dict[str, Any],
    *,
    source_node: NetworkNode,
) -> None:
    for segment in resource_rows.get("video_segments", []):
        if cast(dict[str, Any], segment).get("source_node_key") != source_node.node_key:
            raise ValueError(
                "video segment source_node_key must match transfer source_node_key.",
            )


def validate_transfer_payload(
    payload: TransferPayload,
    *,
    request_user=None,
) -> dict[str, Any]:
    """Validate the schema 3.0 sender boundary before network registration."""
    del request_user
    resource_kind, canonical_payload = _validate_transfer_contract(payload)
    resource_rows = _validated_resource_rows(
        payload,
        resource_kind=resource_kind,
    )
    processing_snapshot = _validated_processing_snapshot(payload)
    resource_hash = _validated_resource_hash(
        payload,
        resource_kind=resource_kind,
        resource_rows=resource_rows,
    )
    source_node, target_node, source_center = _resolve_transfer_parties(payload)
    _validate_transfer_identity(
        payload,
        source_node=source_node,
        source_center=source_center,
        resource_kind=resource_kind,
        resource_hash=resource_hash,
    )
    _validate_segment_source_node(resource_rows, source_node=source_node)
    return {
        **canonical_payload,
        "source_node": source_node,
        "target_node": target_node,
        "source_center": source_center,
        "resource_rows": resource_rows,
        "processing_snapshot": processing_snapshot,
    }


def _require_exact_keys(
    payload: dict[str, Any],
    *,
    allowed: set[str],
    required: set[str],
    field_name: str,
) -> None:
    keys = set(payload)
    forbidden = sorted(keys - allowed)
    missing = sorted(required - keys)
    if forbidden:
        raise ValueError(
            f"{field_name} contains prohibited fields: {', '.join(forbidden)}",
        )
    if missing:
        raise ValueError(
            f"{field_name} is missing required fields: {', '.join(missing)}",
        )


def _require_sha256(value: Any, *, field_name: str) -> str:
    normalized = str(value or "").strip().lower()
    if len(normalized) != 64 or any(
        character not in "0123456789abcdef" for character in normalized
    ):
        raise ValueError(f"{field_name} must be a SHA-256 hex digest.")
    return normalized


def _validate_sensitive_meta_row(resource_rows: dict[str, Any]) -> None:
    sensitive_meta = resource_rows.get("sensitive_meta")
    if not isinstance(sensitive_meta, dict):
        raise ValueError("resource_rows.sensitive_meta must be a JSON object.")
    sensitive_meta_payload = cast(dict[str, Any], sensitive_meta)
    _require_exact_keys(
        sensitive_meta_payload,
        allowed={"patient_hash", "examination_hash"},
        required={"patient_hash", "examination_hash"},
        field_name="resource_rows.sensitive_meta",
    )
    _require_sha256(
        sensitive_meta_payload["patient_hash"],
        field_name="resource_rows.sensitive_meta.patient_hash",
    )
    _require_sha256(
        sensitive_meta_payload["examination_hash"],
        field_name="resource_rows.sensitive_meta.examination_hash",
    )


def _validate_video_resource_rows(resource_rows: dict[str, Any]) -> None:
    _require_exact_keys(
        resource_rows,
        allowed={
            "video_file",
            "video_state",
            "sensitive_meta",
            "processing_history",
            "video_segments",
            "frame_annotations",
            "reports",
        },
        required={
            "video_file",
            "video_state",
            "sensitive_meta",
            "processing_history",
        },
        field_name="resource_rows",
    )
    video_file = cast(dict[str, Any], resource_rows.get("video_file"))
    video_state = cast(dict[str, Any], resource_rows.get("video_state"))
    if not isinstance(video_file, dict) or not isinstance(video_state, dict):
        raise ValueError("video_file and video_state rows are required.")
    _require_exact_keys(
        video_file,
        allowed={
            "video_hash",
            "processed_video_hash",
            "suffix",
            "fps",
            "duration",
            "frame_count",
            "width",
            "height",
        },
        required={"video_hash", "processed_video_hash"},
        field_name="resource_rows.video_file",
    )
    _require_sha256(
        video_state.get("processed_file_sha256"),
        field_name="resource_rows.video_state.processed_file_sha256",
    )
    _require_exact_keys(
        video_state,
        allowed={
            "sensitive_meta_processed",
            "frames_extracted",
            "processing_started",
            "frame_annotations_generated",
            "anonymized",
            "anonymization_validated",
            "outside_segments_removed",
            "segment_annotations_created",
            "segment_annotations_validated",
            "processed_file_sha256",
        },
        required={"anonymization_validated", "processed_file_sha256"},
        field_name="resource_rows.video_state",
    )
    if video_state.get("anonymization_validated") is not True:
        raise ValueError("video_state must be explicitly anonymization validated.")


def _validate_report_resource_rows(resource_rows: dict[str, Any]) -> None:
    _require_exact_keys(
        resource_rows,
        allowed={
            "raw_pdf_file",
            "raw_pdf_state",
            "sensitive_meta",
            "processing_history",
            "reports",
        },
        required={
            "raw_pdf_file",
            "raw_pdf_state",
            "sensitive_meta",
            "processing_history",
        },
        field_name="resource_rows",
    )
    raw_pdf_file = cast(dict[str, Any], resource_rows.get("raw_pdf_file"))
    raw_pdf_state = cast(dict[str, Any], resource_rows.get("raw_pdf_state"))
    if not isinstance(raw_pdf_file, dict) or not isinstance(raw_pdf_state, dict):
        raise ValueError("raw_pdf_file and raw_pdf_state rows are required.")
    _require_exact_keys(
        raw_pdf_file,
        allowed={"pdf_hash", "anonymized_text"},
        required={"pdf_hash", "anonymized_text"},
        field_name="resource_rows.raw_pdf_file",
    )
    if not str(raw_pdf_file.get("anonymized_text") or "").strip():
        raise ValueError("raw_pdf_file.anonymized_text must not be blank.")
    _require_sha256(
        raw_pdf_state.get("processed_file_sha256"),
        field_name="resource_rows.raw_pdf_state.processed_file_sha256",
    )
    _require_exact_keys(
        raw_pdf_state,
        allowed={
            "sensitive_meta_processed",
            "processing_started",
            "text_meta_extracted",
            "anonymized",
            "anonymization_validated",
            "processed_file_sha256",
        },
        required={"anonymization_validated", "processed_file_sha256"},
        field_name="resource_rows.raw_pdf_state",
    )
    if raw_pdf_state.get("anonymization_validated") is not True:
        raise ValueError("raw_pdf_state must be explicitly anonymization validated.")


def _validate_processing_history(resource_rows: dict[str, Any]) -> None:
    processing_history = resource_rows.get("processing_history")
    if not isinstance(processing_history, dict):
        raise ValueError("resource_rows.processing_history must be a JSON object.")
    _require_exact_keys(
        cast(dict[str, Any], processing_history),
        allowed={"file_hash", "success"},
        required={"file_hash", "success"},
        field_name="resource_rows.processing_history",
    )


def _validate_frame_annotations(resource_rows: dict[str, Any]) -> None:
    for annotation in resource_rows.get("frame_annotations", []):
        if not isinstance(annotation, dict):
            raise ValueError("frame_annotations entries must be JSON objects.")
        annotation_payload = cast(dict[str, Any], annotation)
        _require_exact_keys(
            annotation_payload,
            allowed={
                "annotation_id",
                "video_hash",
                "frame_number",
                "frame_relative_path",
                "frame_timestamp",
                "label_name",
                "value",
                "float_value",
                "information_source_name",
            },
            required={
                "annotation_id",
                "video_hash",
                "frame_number",
                "frame_relative_path",
                "label_name",
                "value",
                "information_source_name",
            },
            field_name="resource_rows.frame_annotations",
        )
        if annotation_payload.get("value") is not True:
            raise ValueError("Only positive frame annotations may be transferred.")


def _validate_segment_frame_bounds(
    segment_payload: dict[str, Any],
    *,
    frame_count: Any,
) -> None:
    start_frame = segment_payload.get("start_frame_number")
    end_frame = segment_payload.get("end_frame_number_exclusive")
    invalid_boundary = (
        isinstance(start_frame, bool)
        or not isinstance(start_frame, int)
        or isinstance(end_frame, bool)
        or not isinstance(end_frame, int)
    )
    if invalid_boundary:
        raise ValueError("video segment frame boundaries are invalid.")
    valid_start_frame = cast(int, start_frame)
    valid_end_frame = cast(int, end_frame)
    if (
        valid_start_frame < 0
        or valid_end_frame <= valid_start_frame
        or not isinstance(frame_count, int)
        or valid_end_frame > frame_count
    ):
        raise ValueError("video segment frame boundaries are invalid.")


def _validate_segment_provenance(segment_payload: dict[str, Any]) -> None:
    provenance = segment_payload.get("anonymous_provenance")
    if not isinstance(provenance, dict):
        raise ValueError("video segment anonymous_provenance must be an object.")
    _require_exact_keys(
        provenance,
        allowed={"information_source_name"},
        required={"information_source_name"},
        field_name="resource_rows.video_segments.anonymous_provenance",
    )


def _validate_segment_model_metadata(segment_payload: dict[str, Any]) -> None:
    has_model_name = "model_name" in segment_payload
    has_model_version = "model_version" in segment_payload
    if has_model_name != has_model_version:
        raise ValueError("video segment model metadata must be supplied together.")
    if has_model_name and (
        segment_payload.get("source_kind") != "prediction"
        or segment_payload.get("export_segment") is not True
    ):
        raise ValueError(
            "video segment model metadata is permitted only for exported predictions.",
        )


def _validate_segment_enums(segment_payload: dict[str, Any]) -> None:
    if segment_payload.get("source_kind") not in {
        "manual_annotation",
        "prediction",
    }:
        raise ValueError("video segment source_kind is invalid.")
    if segment_payload.get("validation_state") not in {
        "unvalidated",
        "validated",
    }:
        raise ValueError("video segment validation_state is invalid.")
    if not isinstance(segment_payload.get("export_segment"), bool):
        raise ValueError("video segment export_segment must be boolean.")


def _validate_video_segment(
    segment: Any,
    *,
    video_hash: str,
    frame_count: Any,
) -> None:
    if not isinstance(segment, dict):
        raise ValueError("video_segments entries must be JSON objects.")
    segment_payload = cast(dict[str, Any], segment)
    _require_exact_keys(
        segment_payload,
        allowed={
            "source_node_key",
            "source_segment_id",
            "video_hash",
            "start_frame_number",
            "end_frame_number_exclusive",
            "label_name",
            "source_kind",
            "validation_state",
            "export_segment",
            "anonymous_provenance",
            "model_name",
            "model_version",
        },
        required={
            "source_node_key",
            "source_segment_id",
            "video_hash",
            "start_frame_number",
            "end_frame_number_exclusive",
            "label_name",
            "source_kind",
            "validation_state",
            "export_segment",
            "anonymous_provenance",
        },
        field_name="resource_rows.video_segments",
    )
    if segment_payload.get("video_hash") != video_hash:
        raise ValueError("video segment video_hash must match video_file.")
    _validate_segment_frame_bounds(segment_payload, frame_count=frame_count)
    _validate_segment_provenance(segment_payload)
    _validate_segment_model_metadata(segment_payload)
    _validate_segment_enums(segment_payload)


def _validate_video_segments(resource_rows: dict[str, Any]) -> None:
    video_hash = str(
        cast(dict[str, Any], resource_rows.get("video_file", {})).get("video_hash", ""),
    ).strip()
    frame_count = cast(dict[str, Any], resource_rows.get("video_file", {})).get(
        "frame_count",
    )
    for segment in resource_rows.get("video_segments", []):
        _validate_video_segment(
            segment,
            video_hash=video_hash,
            frame_count=frame_count,
        )


def _validate_structured_reports(resource_rows: dict[str, Any]) -> None:
    for report in resource_rows.get("reports", []):
        if not isinstance(report, dict):
            raise ValueError("reports entries must be JSON objects.")
        report_payload = cast(dict[str, Any], report)
        _require_exact_keys(
            report_payload,
            allowed={
                "template_name",
                "template_version",
                "template_hash",
                "status",
                "version",
                "is_active",
            },
            required={"template_name", "status", "version", "is_active"},
            field_name="resource_rows.reports",
        )
        if (
            report_payload.get("status") != "final"
            or report_payload.get("is_active") is not True
        ):
            raise ValueError("Only active final structured report rows may transfer.")


def _validate_privacy_preserving_resource_rows(
    resource_rows: dict[str, Any],
    *,
    resource_kind: str,
) -> None:
    _validate_sensitive_meta_row(resource_rows)
    if resource_kind == TransferJob.ResourceKind.VIDEO.value:
        _validate_video_resource_rows(resource_rows)
    elif resource_kind == TransferJob.ResourceKind.REPORT.value:
        _validate_report_resource_rows(resource_rows)
    else:
        raise ValueError(f"Unsupported outbound resource_kind: {resource_kind!r}.")
    _validate_processing_history(resource_rows)
    _validate_frame_annotations(resource_rows)
    _validate_video_segments(resource_rows)
    _validate_structured_reports(resource_rows)
