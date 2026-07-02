from __future__ import annotations

from typing import Any, Literal, TypedDict, cast

from django.contrib.auth.models import AnonymousUser

from endoreg_db.models import NetworkNode, RawPdfFile, SensitiveMeta, VideoFile
from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.serializers.hub import TransferJobCreateSerializer

from .hub_export_state import (
    is_report_hub_export_eligible,
    is_video_hub_export_eligible,
)
from ..models import OutboundHubTransferJob


class VideoFilePayload(TypedDict, total=False):
    video_hash: str
    processed_video_hash: str
    original_file_name: str | None
    suffix: str | None
    fps: float | None
    duration: float | None
    frame_count: int | None
    width: int | None
    height: int | None
    meta: dict[str, Any]


class VideoStatePayload(TypedDict, total=False):
    sensitive_meta_processed: bool
    frames_extracted: bool
    processing_started: bool
    frame_annotations_generated: bool


class RawPdfFilePayload(TypedDict, total=False):
    pdf_hash: str
    text: str


class RawPdfStatePayload(TypedDict, total=False):
    sensitive_meta_processed: bool
    processing_started: bool
    text_meta_extracted: bool


class SensitiveMetaPayload(TypedDict, total=False):
    patient_first_name: str
    patient_last_name: str
    patient_dob: str
    examination_date: str


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
    field = getattr(resource, field_name, None)
    if not field or not getattr(field, "name", ""):
        raise ValueError(
            f"{type(resource).__name__}.{field_name} must exist for outbound hub transfer."
        )


def _require_eligible_anonymization_status(
    status: AnonymizationState, *, kind: str
) -> None:
    if status not in {
        AnonymizationState.ANONYMIZED,
        AnonymizationState.DONE_PROCESSING_ANONYMIZATION,
        AnonymizationState.VALIDATED,
    }:
        raise ValueError(
            f"{kind} transfer requires anonymized state. "
            f"Current anonymization_status={status.value!r} is not eligible."
        )


def _build_sensitive_meta_payload(
    sensitive_meta: SensitiveMeta | None,
) -> SensitiveMetaPayload:
    if sensitive_meta is None:
        raise ValueError(
            "SensitiveMeta with patient_first_name, patient_last_name, "
            "patient_dob, and examination_date is required for hub transfer."
        )

    if (
        not sensitive_meta.patient_first_name
        or not sensitive_meta.patient_last_name
        or sensitive_meta.patient_dob is None
        or sensitive_meta.examination_date is None
    ):
        raise ValueError(
            "SensitiveMeta must include patient_first_name, patient_last_name, "
            "patient_dob, and examination_date for hub transfer."
        )

    return {
        "patient_first_name": sensitive_meta.patient_first_name,
        "patient_last_name": sensitive_meta.patient_last_name,
        "patient_dob": sensitive_meta.patient_dob.date().isoformat()
        if hasattr(sensitive_meta.patient_dob, "date")
        else sensitive_meta.patient_dob.isoformat(),
        "examination_date": sensitive_meta.examination_date.isoformat(),
    }


def _require_value(value: Any, *, field_name: str) -> Any:
    if value is None or value == "":
        raise ValueError(f"{field_name} must exist for outbound hub transfer.")
    return value


def _build_video_rows(video: VideoFile) -> dict[str, Any]:
    _require_processed_file(video, field_name="processed_file")
    processed_video_hash = video.processed_video_hash or video.video_hash
    if not processed_video_hash:
        raise ValueError(
            "VideoFile.processed_video_hash or video_hash must exist for processed-media transfer."
        )
    state = video.state
    if state is None:
        raise ValueError("VideoFile.state must exist for outbound hub transfer.")
    if not is_video_hub_export_eligible(video):
        raise ValueError(
            f"video transfer requires anonymized processed state. Current anonymization_status={state.anonymization_status.value!r} is not eligible."
        )
    _require_eligible_anonymization_status(state.anonymization_status, kind="video")

    video_file_payload: VideoFilePayload = {
        "video_hash": video.video_hash,
        "processed_video_hash": processed_video_hash,
        "original_file_name": _require_value(
            video.original_file_name, field_name="VideoFile.original_file_name"
        ),
        "suffix": _require_value(video.suffix, field_name="VideoFile.suffix"),
        "fps": _require_value(video.fps, field_name="VideoFile.fps"),
        "duration": _require_value(video.duration, field_name="VideoFile.duration"),
        "frame_count": _require_value(
            video.frame_count, field_name="VideoFile.frame_count"
        ),
        "width": _require_value(video.width, field_name="VideoFile.width"),
        "height": _require_value(video.height, field_name="VideoFile.height"),
        "meta": cast(dict[str, Any], video.meta or {}),
    }
    video_state_payload: VideoStatePayload = {
        "sensitive_meta_processed": bool(state.sensitive_meta_processed),
        "frames_extracted": bool(state.frames_extracted),
        "processing_started": bool(state.processing_started),
        "frame_annotations_generated": bool(
            getattr(state, "segment_annotations_created", False)
        ),
    }
    return {
        "video_file": video_file_payload,
        "video_state": video_state_payload,
        "sensitive_meta": _build_sensitive_meta_payload(video.sensitive_meta),
        "processing_history": {
            "file_hash": processed_video_hash,
            "success": not bool(getattr(state, "processing_error", False)),
        },
    }


def _build_report_rows(report: RawPdfFile) -> dict[str, Any]:
    _require_processed_file(report, field_name="processed_file")
    state = report.state
    if state is None:
        raise ValueError("RawPdfFile.state must exist for outbound hub transfer.")
    if not is_report_hub_export_eligible(report):
        raise ValueError(
            f"report transfer requires anonymized processed state. Current anonymization_status={state.anonymization_status.value!r} is not eligible."
        )
    _require_eligible_anonymization_status(state.anonymization_status, kind="report")

    report_file_payload: RawPdfFilePayload = {
        "pdf_hash": report.pdf_hash,
        "text": cast(str, getattr(report, "text", "") or ""),
    }
    report_state_payload: RawPdfStatePayload = {
        "sensitive_meta_processed": bool(state.sensitive_meta_processed),
        "processing_started": bool(state.processing_started),
        "text_meta_extracted": bool(getattr(state, "text_meta_extracted", False)),
    }
    return {
        "raw_pdf_file": report_file_payload,
        "raw_pdf_state": report_state_payload,
        "sensitive_meta": _build_sensitive_meta_payload(report.sensitive_meta),
        "processing_history": {
            "file_hash": report.pdf_hash,
            "success": not bool(getattr(state, "processing_error", False)),
        },
    }


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
        resource_rows = _build_video_rows(video)
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
        "payload_schema_version": "1.0",
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


def validate_transfer_payload(
    payload: TransferPayload,
    *,
    request_user=None,
) -> dict[str, Any]:
    request = type(
        "TransferValidationRequest",
        (),
        {"user": request_user if request_user is not None else AnonymousUser()},
    )()
    serializer = TransferJobCreateSerializer(
        data=payload,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    return cast(dict[str, Any], serializer.validated_data)
