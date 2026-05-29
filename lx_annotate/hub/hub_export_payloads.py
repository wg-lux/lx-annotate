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
    anonymization_validated: bool
    sensitive_meta_processed: bool
    frames_extracted: bool
    anonymized: bool
    processing_started: bool
    was_created: bool
    processing_error: bool


class RawPdfFilePayload(TypedDict, total=False):
    pdf_hash: str


class RawPdfStatePayload(TypedDict, total=False):
    anonymization_validated: bool
    sensitive_meta_processed: bool
    anonymized: bool
    processing_started: bool
    processing_error: bool


class SensitiveMetaPayload(TypedDict, total=False):
    patient_hash: str
    examination_hash: str
    patient_first_name: str | None
    patient_last_name: str | None
    patient_dob: str | None
    examination_date: str | None


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
        return {}

    payload: SensitiveMetaPayload = {}
    if sensitive_meta.patient_hash:
        payload["patient_hash"] = sensitive_meta.patient_hash
    if sensitive_meta.examination_hash:
        payload["examination_hash"] = sensitive_meta.examination_hash
    if sensitive_meta.patient_first_name:
        payload["patient_first_name"] = sensitive_meta.patient_first_name
    if sensitive_meta.patient_last_name:
        payload["patient_last_name"] = sensitive_meta.patient_last_name
    if sensitive_meta.patient_dob is not None:
        payload["patient_dob"] = sensitive_meta.patient_dob.isoformat()
    if sensitive_meta.examination_date is not None:
        payload["examination_date"] = sensitive_meta.examination_date.isoformat()
    return payload


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
        "original_file_name": video.original_file_name,
        "suffix": video.suffix,
        "fps": video.fps,
        "duration": video.duration,
        "frame_count": video.frame_count,
        "width": video.width,
        "height": video.height,
        "meta": cast(dict[str, Any], video.meta or {}),
    }
    video_state_payload: VideoStatePayload = {
        "anonymization_validated": bool(state.anonymization_validated),
        "sensitive_meta_processed": bool(state.sensitive_meta_processed),
        "frames_extracted": bool(state.frames_extracted),
        "anonymized": bool(state.anonymized),
        "processing_started": bool(state.processing_started),
        "was_created": bool(state.was_created),
        "processing_error": bool(getattr(state, "processing_error", False)),
    }
    return {
        "video_file": video_file_payload,
        "video_state": video_state_payload,
        "sensitive_meta": _build_sensitive_meta_payload(video.sensitive_meta),
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

    report_file_payload: RawPdfFilePayload = {"pdf_hash": report.pdf_hash}
    report_state_payload: RawPdfStatePayload = {
        "anonymization_validated": bool(state.anonymization_validated),
        "sensitive_meta_processed": bool(state.sensitive_meta_processed),
        "anonymized": bool(state.anonymized),
        "processing_started": bool(state.processing_started),
        "processing_error": bool(state.processing_error),
    }
    return {
        "raw_pdf_file": report_file_payload,
        "raw_pdf_state": report_state_payload,
        "sensitive_meta": _build_sensitive_meta_payload(report.sensitive_meta),
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
