from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime
from typing import Any, Literal, TypedDict

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from endoreg_db.models import Center, NetworkNode, RawPdfFile, VideoFile

from .hub_export_contracts import (
    HubCenterSyncState,
    HubExportDuplicateReason,
    HubExportOverview,
    HubExportRejectionReason,
    HubExportResourceKind,
    HubFileSyncSummary,
    HubProcessedFile,
    HubSyncDuplicate,
    HubSyncRejection,
)
from .hub_export_audit import emit_hub_export_audit_event
from .hub_export_cleanup import configured_local_cleanup_policy
from .hub_export_state import (
    has_usable_processed_artifact,
    hub_export_auto_queue_enabled,
    is_report_hub_export_eligible,
    is_video_hub_export_eligible,
    queue_outbound_job,
    report_hub_export_blocked_reason,
    video_hub_export_blocked_reason,
)
from ..models import OutboundHubTransferJob

HUB_EXPORT_PRIVACY_MIN_K = 5

HubExportPrivacyStatus = Literal["pass", "warning", "unavailable"]


class HubExportPrivacySummary(TypedDict):
    min_k: int
    eligible_resource_count: int
    eligible_case_count: int
    marked_resource_count: int
    smallest_equivalence_class_size: int | None
    violating_equivalence_class_count: int
    passes_k_anonymity: bool
    status: HubExportPrivacyStatus


class HubExportPrivacyRecord(TypedDict):
    resource_kind: str
    resource_id: int
    source_center_key: str | None
    eligible: bool
    marked_for_upload: bool
    sensitive_meta: Any | None


def build_transfer_key(
    *,
    source_node_key: str,
    resource_kind: str,
    resource_hash: str,
) -> str:
    return f"{source_node_key}__{resource_kind}__{resource_hash}__processed_v1"


def _resource_ref_kind(resource_ref: dict[str, Any]) -> str:
    return str(resource_ref.get("resource_kind") or "").strip().lower()


def _resource_ref_id(resource_ref: dict[str, Any]) -> int:
    raw_id = resource_ref.get("id")
    if raw_id is None:
        raise ValueError("resource ref is missing required 'id'")
    return int(raw_id)


def get_active_hub_nodes() -> QuerySet[NetworkNode]:
    return NetworkNode.objects.filter(
        role=NetworkNode.Role.CENTRAL_HUB,
        is_active=True,
    ).order_by("display_name", "pk")


def get_active_site_nodes() -> QuerySet[NetworkNode]:
    return NetworkNode.objects.filter(
        role=NetworkNode.Role.SITE_NODE,
        is_active=True,
    ).order_by("display_name", "pk")


def get_default_source_node() -> NetworkNode | None:
    return get_active_site_nodes().first()


def resolve_target_hub_node(
    *, target_node_key: str | None = None
) -> NetworkNode | None:
    normalized = str(target_node_key or "").strip()
    if normalized:
        return get_active_hub_nodes().filter(node_key=normalized).first()
    return get_active_hub_nodes().first()


def require_normal_sender_target_hub() -> NetworkNode:
    hub_nodes = list(get_active_hub_nodes())
    if not hub_nodes:
        raise ValueError("No active central hub node is configured.")
    if len(hub_nodes) != 1:
        raise ValueError(
            "Normal sender mode requires exactly one active central hub node."
        )
    return hub_nodes[0]


def _normalized_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _year_from_date(value: Any) -> int | None:
    if isinstance(value, datetime):
        return value.year
    if isinstance(value, date):
        return value.year
    year = getattr(value, "year", None)
    return int(year) if isinstance(year, int) else None


def _privacy_exam_year(sensitive_meta: Any | None) -> str:
    year = _year_from_date(getattr(sensitive_meta, "examination_date", None))
    return str(year) if year is not None else "unknown"


def _privacy_age_band(sensitive_meta: Any | None) -> str:
    pseudo_patient = getattr(sensitive_meta, "pseudo_patient", None)
    dob = getattr(pseudo_patient, "dob", None) or getattr(
        sensitive_meta, "patient_dob", None
    )
    birth_year = _year_from_date(dob)
    if birth_year is None:
        return "unknown"

    exam_year = (
        _year_from_date(getattr(sensitive_meta, "examination_date", None))
        or timezone.localdate().year
    )
    age = max(0, exam_year - birth_year)
    bucket_start = (age // 10) * 10
    if bucket_start >= 90:
        return "90+"
    return f"{bucket_start}-{bucket_start + 9}"


def _privacy_gender(sensitive_meta: Any | None) -> str:
    pseudo_patient = getattr(sensitive_meta, "pseudo_patient", None)
    gender = getattr(pseudo_patient, "gender", None)
    if isinstance(gender, str):
        gender_name = _normalized_text(gender)
    else:
        gender_name = _normalized_text(getattr(gender, "name", None))
    return gender_name.lower() if gender_name is not None else "unknown"


def _privacy_case_identity(record: HubExportPrivacyRecord) -> str:
    sensitive_meta = record.get("sensitive_meta")
    examination_hash = _normalized_text(
        getattr(sensitive_meta, "examination_hash", None)
    )
    if examination_hash:
        return f"examination_hash:{examination_hash}"
    return f"resource:{record['resource_kind']}:{record['resource_id']}"


def _privacy_equivalence_key(
    record: HubExportPrivacyRecord,
) -> tuple[str, str, str, str, str]:
    sensitive_meta = record.get("sensitive_meta")
    return (
        _normalized_text(record.get("source_center_key")) or "unknown",
        _normalized_text(record.get("resource_kind")) or "unknown",
        _privacy_exam_year(sensitive_meta),
        _privacy_age_band(sensitive_meta),
        _privacy_gender(sensitive_meta),
    )


def _accumulate_privacy_record(
    record: HubExportPrivacyRecord,
    *,
    case_ids: set[str],
    equivalence_classes: dict[tuple[str, str, str, str, str], set[str]],
) -> tuple[int, int]:
    eligible = bool(record.get("eligible"))
    marked_for_upload = bool(record.get("marked_for_upload"))
    if eligible or marked_for_upload:
        case_identity = _privacy_case_identity(record)
        case_ids.add(case_identity)
        equivalence_key = _privacy_equivalence_key(record)
        equivalence_classes.setdefault(equivalence_key, set()).add(case_identity)
    return int(eligible), int(marked_for_upload)


def _unavailable_privacy_summary(
    *,
    min_k: int,
    eligible_resource_count: int,
    marked_resource_count: int,
) -> HubExportPrivacySummary:
    return {
        "min_k": min_k,
        "eligible_resource_count": eligible_resource_count,
        "eligible_case_count": 0,
        "marked_resource_count": marked_resource_count,
        "smallest_equivalence_class_size": None,
        "violating_equivalence_class_count": 0,
        "passes_k_anonymity": False,
        "status": "unavailable",
    }


def _available_privacy_summary(
    *,
    min_k: int,
    eligible_resource_count: int,
    marked_resource_count: int,
    case_ids: set[str],
    equivalence_classes: dict[tuple[str, str, str, str, str], set[str]],
) -> HubExportPrivacySummary:
    class_sizes = [len(case_id_set) for case_id_set in equivalence_classes.values()]
    violating_class_count = sum(1 for class_size in class_sizes if class_size < min_k)
    passes_k_anonymity = violating_class_count == 0
    return {
        "min_k": min_k,
        "eligible_resource_count": eligible_resource_count,
        "eligible_case_count": len(case_ids),
        "marked_resource_count": marked_resource_count,
        "smallest_equivalence_class_size": min(class_sizes),
        "violating_equivalence_class_count": violating_class_count,
        "passes_k_anonymity": passes_k_anonymity,
        "status": "pass" if passes_k_anonymity else "warning",
    }


def build_hub_export_privacy_summary(
    privacy_records: Iterable[HubExportPrivacyRecord],
    *,
    min_k: int = HUB_EXPORT_PRIVACY_MIN_K,
) -> HubExportPrivacySummary:
    eligible_resource_count = 0
    marked_resource_count = 0
    case_ids: set[str] = set()
    equivalence_classes: dict[tuple[str, str, str, str, str], set[str]] = {}

    for record in privacy_records:
        eligible_increment, marked_increment = _accumulate_privacy_record(
            record,
            case_ids=case_ids,
            equivalence_classes=equivalence_classes,
        )
        eligible_resource_count += eligible_increment
        marked_resource_count += marked_increment

    if not equivalence_classes:
        return _unavailable_privacy_summary(
            min_k=min_k,
            eligible_resource_count=eligible_resource_count,
            marked_resource_count=marked_resource_count,
        )
    return _available_privacy_summary(
        min_k=min_k,
        eligible_resource_count=eligible_resource_count,
        marked_resource_count=marked_resource_count,
        case_ids=case_ids,
        equivalence_classes=equivalence_classes,
    )


def _sync_rejection_reason(blocked_reason: str) -> HubExportRejectionReason:
    reasons = {
        "source center missing": HubExportRejectionReason.MISSING_CENTER,
        "processed media missing": HubExportRejectionReason.MISSING_PROCESSED_FILE,
        "segment cleanup pending": HubExportRejectionReason.SEGMENT_CLEANUP_PENDING,
        "segment cleanup failed": HubExportRejectionReason.SEGMENT_CLEANUP_FAILED,
        "not ready for export": HubExportRejectionReason.NOT_READY_FOR_EXPORT,
    }
    try:
        return reasons[blocked_reason]
    except KeyError as exc:
        raise ValueError(
            f"Unsupported hub export blocked reason: {blocked_reason}"
        ) from exc


def _processed_filename(resource: RawPdfFile | VideoFile) -> str:
    stored_name = str(resource.processed_file.name or "").strip()
    return stored_name.rsplit("/", 1)[-1]


def _resolve_overview_target(
    target_node: NetworkNode | None,
    hub_nodes: list[NetworkNode],
) -> tuple[NetworkNode | None, str]:
    if target_node is not None:
        return target_node, ""
    if len(hub_nodes) == 1:
        return hub_nodes[0], ""
    if not hub_nodes:
        return None, "No active central hub node is configured."
    return None, "Normal sender mode requires exactly one active central hub node."


def _jobs_by_resource(
    selected_target: NetworkNode | None,
) -> dict[tuple[str, int], OutboundHubTransferJob]:
    if selected_target is None:
        return {}

    jobs_by_key: dict[tuple[str, int], OutboundHubTransferJob] = {}
    jobs = OutboundHubTransferJob.objects.select_related(
        "target_node",
        "source_center",
        "marked_by",
    ).filter(target_node=selected_target)
    for job in jobs:
        if job.video_file_id is not None:
            jobs_by_key[("video", int(job.video_file_id))] = job
        if job.raw_pdf_file_id is not None:
            jobs_by_key[("report", int(job.raw_pdf_file_id))] = job
    return jobs_by_key


def _job_overview_fields(
    job: OutboundHubTransferJob | None,
    *,
    selected_target: NetworkNode | None,
) -> dict[str, Any]:
    return {
        "marked_for_upload": job is not None,
        "marked_by_username": (
            job.marked_by.get_username() if job is not None and job.marked_by else None
        ),
        "marked_at": job.marked_at.isoformat() if job is not None else None,
        "outbound_status": job.local_status if job is not None else "",
        "failure_class": job.failure_class
        if job is not None and job.failure_class
        else None,
        "last_error": _operator_failure_detail(job),
        "last_transfer_timestamp": (
            job.completed_at.isoformat() if job and job.completed_at else None
        ),
        "target_node_key": (
            job.target_node.node_key
            if job is not None
            else selected_target.node_key
            if selected_target is not None
            else None
        ),
    }


def _operator_failure_detail(job: OutboundHubTransferJob | None) -> str:
    if job is None or job.local_status != OutboundHubTransferJob.LocalStatus.FAILED:
        return ""
    messages = {
        OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION: (
            "Hub transfer configuration or payload was rejected."
        ),
        OutboundHubTransferJob.FailureClass.AUTHORIZATION_DENIAL: (
            "Hub transfer authorization was denied."
        ),
        OutboundHubTransferJob.FailureClass.INTEGRITY_INCONSISTENCY: (
            "Hub transfer integrity verification failed."
        ),
        OutboundHubTransferJob.FailureClass.TRANSIENT_RETRY: (
            "Hub transfer is waiting for a bounded retry."
        ),
    }
    return messages.get(
        job.failure_class,
        "Hub transfer failed; inspect protected structured logs.",
    )


def _append_sync_outcomes(
    *,
    resource_kind: HubExportResourceKind,
    resource_id: int,
    filename: str,
    source_center_key: str | None,
    eligible: bool,
    blocked_reason: str,
    job: OutboundHubTransferJob | None,
    rejections: list[HubSyncRejection],
    duplicates: list[HubSyncDuplicate],
) -> None:
    if not eligible:
        rejections.append(
            HubSyncRejection(
                resource_kind=resource_kind,
                resource_id=resource_id,
                filename=filename,
                center_key=source_center_key,
                reason=_sync_rejection_reason(blocked_reason),
                detail=blocked_reason,
            )
        )
    if job is not None:
        duplicates.append(
            HubSyncDuplicate(
                resource_kind=resource_kind,
                resource_id=resource_id,
                filename=filename,
                center_key=source_center_key,
                reason=HubExportDuplicateReason.TRANSFER_ALREADY_REGISTERED,
                transfer_key=job.transfer_key,
                transfer_status=job.local_status,
                target_node_key=job.target_node.node_key,
            )
        )


def _anonymization_status(resource: RawPdfFile | VideoFile) -> str:
    state = resource.state
    return state.anonymization_status.value if state is not None else "not_started"


def _created_at(resource: RawPdfFile | VideoFile) -> str | None:
    return resource.date_created.isoformat() if resource.date_created else None


def _append_privacy_record(
    privacy_records: list[HubExportPrivacyRecord],
    *,
    resource_kind: str,
    resource_id: int,
    source_center_key: str | None,
    eligible: bool,
    marked_for_upload: bool,
    sensitive_meta: Any,
) -> None:
    privacy_records.append(
        {
            "resource_kind": resource_kind,
            "resource_id": resource_id,
            "source_center_key": source_center_key,
            "eligible": eligible,
            "marked_for_upload": marked_for_upload,
            "sensitive_meta": sensitive_meta,
        }
    )


def _resource_overview_item(
    *,
    resource: RawPdfFile | VideoFile,
    resource_kind: str,
    resource_id: int,
    filename: str,
    processed_media_present: bool,
    source_center_key: str | None,
    source_center_name: str | None,
    job: OutboundHubTransferJob | None,
    selected_target: NetworkNode | None,
    eligible: bool,
    blocked_reason: str,
) -> dict[str, Any]:
    return {
        "id": resource_id,
        "resource_kind": resource_kind,
        "filename": filename,
        "anonymization_status": _anonymization_status(resource),
        "processed_media_present": processed_media_present,
        "source_center_key": source_center_key,
        "source_center_name": source_center_name,
        **_job_overview_fields(job, selected_target=selected_target),
        "eligible": eligible,
        "blocked_reason": blocked_reason,
        "created_at": _created_at(resource),
    }


def _video_processed_file(
    video: VideoFile,
    *,
    processed_media_present: bool,
    eligible: bool,
    job: OutboundHubTransferJob | None,
) -> HubProcessedFile | None:
    if not processed_media_present or video.center is None:
        return None
    processed_file_hash = (
        str(video.processed_video_hash).strip() if video.processed_video_hash else None
    )
    return HubProcessedFile(
        resource_kind=HubExportResourceKind.VIDEO,
        resource_id=int(video.pk),
        filename=_processed_filename(video),
        resource_hash=video.video_hash,
        processed_file_hash=processed_file_hash,
        center_key=video.center.center_key,
        center_name=video.center.name,
        eligible=eligible,
        transfer_registered=job is not None,
        transfer_key=job.transfer_key if job else None,
        transfer_status=job.local_status if job else "",
        target_node_key=job.target_node.node_key if job else None,
    )


def _report_filename(report: RawPdfFile) -> str:
    if report.file and report.file.name:
        return (report.file.name or "").rsplit("/", 1)[-1]
    return report.pdf_hash


def _report_processed_file(
    report: RawPdfFile,
    *,
    processed_media_present: bool,
    eligible: bool,
    job: OutboundHubTransferJob | None,
) -> HubProcessedFile | None:
    if not processed_media_present or report.center is None:
        return None
    state_hash = str(getattr(report.state, "processed_file_sha256", "") or "").strip()
    return HubProcessedFile(
        resource_kind=HubExportResourceKind.REPORT,
        resource_id=int(report.pk),
        filename=_processed_filename(report),
        resource_hash=report.pdf_hash,
        processed_file_hash=state_hash or None,
        center_key=report.center.center_key,
        center_name=report.center.name,
        eligible=eligible,
        transfer_registered=job is not None,
        transfer_key=job.transfer_key if job else None,
        transfer_status=job.local_status if job else "",
        target_node_key=job.target_node.node_key if job else None,
    )


def _collect_video_overview(
    *,
    selected_target: NetworkNode | None,
    jobs_by_key: dict[tuple[str, int], OutboundHubTransferJob],
    processed_files_by_center: dict[str, list[HubProcessedFile]],
    items: list[dict[str, Any]],
    privacy_records: list[HubExportPrivacyRecord],
    rejections: list[HubSyncRejection],
    duplicates: list[HubSyncDuplicate],
) -> None:
    videos = VideoFile.objects.select_related(
        "state",
        "center",
        "sensitive_meta",
        "sensitive_meta__pseudo_patient",
        "sensitive_meta__pseudo_patient__gender",
    ).order_by("-date_created")
    for video in videos:
        video_id = int(video.pk)
        eligible = is_video_hub_export_eligible(video)
        blocked_reason = "" if eligible else video_hub_export_blocked_reason(video)
        video_job = jobs_by_key.get(("video", video_id))
        marked_for_upload = video_job is not None
        source_center_key = video.center.center_key if video.center else None
        filename = video.original_file_name or video.video_hash
        processed_media_present = has_usable_processed_artifact(video)
        _append_privacy_record(
            privacy_records,
            resource_kind="video",
            resource_id=video_id,
            source_center_key=source_center_key,
            eligible=eligible,
            marked_for_upload=marked_for_upload,
            sensitive_meta=video.sensitive_meta,
        )
        items.append(
            _resource_overview_item(
                resource=video,
                resource_kind="video",
                resource_id=video_id,
                filename=filename,
                processed_media_present=processed_media_present,
                source_center_key=source_center_key,
                source_center_name=video.center.name if video.center else None,
                job=video_job,
                selected_target=selected_target,
                eligible=eligible,
                blocked_reason=blocked_reason,
            )
        )
        processed_file = _video_processed_file(
            video,
            processed_media_present=processed_media_present,
            eligible=eligible,
            job=video_job,
        )
        if processed_file is not None:
            processed_files_by_center[processed_file.center_key].append(processed_file)
        _append_sync_outcomes(
            resource_kind=HubExportResourceKind.VIDEO,
            resource_id=video_id,
            filename=filename,
            source_center_key=source_center_key,
            eligible=eligible,
            blocked_reason=blocked_reason,
            job=video_job,
            rejections=rejections,
            duplicates=duplicates,
        )


def _collect_report_overview(
    *,
    selected_target: NetworkNode | None,
    jobs_by_key: dict[tuple[str, int], OutboundHubTransferJob],
    processed_files_by_center: dict[str, list[HubProcessedFile]],
    items: list[dict[str, Any]],
    privacy_records: list[HubExportPrivacyRecord],
    rejections: list[HubSyncRejection],
    duplicates: list[HubSyncDuplicate],
) -> None:
    reports = RawPdfFile.objects.select_related(
        "state",
        "center",
        "sensitive_meta",
        "sensitive_meta__pseudo_patient",
        "sensitive_meta__pseudo_patient__gender",
    ).order_by("-date_created")
    for report in reports:
        report_id = int(report.pk)
        report_job = jobs_by_key.get(("report", report_id))
        blocked_reason = report_hub_export_blocked_reason(report)
        eligible = blocked_reason == ""
        marked_for_upload = report_job is not None
        report_center = report.center
        source_center_key = report_center.center_key if report_center else None
        filename = _report_filename(report)
        processed_media_present = has_usable_processed_artifact(report)
        _append_privacy_record(
            privacy_records,
            resource_kind="report",
            resource_id=report_id,
            source_center_key=source_center_key,
            eligible=eligible,
            marked_for_upload=marked_for_upload,
            sensitive_meta=report.sensitive_meta,
        )
        items.append(
            _resource_overview_item(
                resource=report,
                resource_kind="report",
                resource_id=report_id,
                filename=filename,
                processed_media_present=processed_media_present,
                source_center_key=source_center_key,
                source_center_name=report.center.name if report.center else None,
                job=report_job,
                selected_target=selected_target,
                eligible=eligible,
                blocked_reason=blocked_reason,
            )
        )
        processed_file = _report_processed_file(
            report,
            processed_media_present=processed_media_present,
            eligible=eligible,
            job=report_job,
        )
        if processed_file is not None:
            processed_files_by_center[processed_file.center_key].append(processed_file)
        _append_sync_outcomes(
            resource_kind=HubExportResourceKind.REPORT,
            resource_id=report_id,
            filename=filename,
            source_center_key=source_center_key,
            eligible=eligible,
            blocked_reason=blocked_reason,
            job=report_job,
            rejections=rejections,
            duplicates=duplicates,
        )


def _active_node_keys_by_center() -> dict[str, list[str]]:
    active_nodes_by_center: dict[str, list[str]] = {}
    nodes = (
        NetworkNode.objects.filter(
            is_active=True,
            owning_center__isnull=False,
        )
        .select_related("owning_center")
        .order_by("node_key", "pk")
    )
    for node in nodes:
        if node.owning_center is not None:
            active_nodes_by_center.setdefault(node.owning_center.center_key, []).append(
                node.node_key
            )
    return active_nodes_by_center


def _center_sync_state(
    center: Center,
    *,
    active_nodes_by_center: dict[str, list[str]],
    processed_files_by_center: dict[str, list[HubProcessedFile]],
    rejections: list[HubSyncRejection],
    duplicates: list[HubSyncDuplicate],
) -> HubCenterSyncState:
    processed_files = processed_files_by_center[center.center_key]
    return HubCenterSyncState(
        center_key=center.center_key,
        display_name=center.display_name or center.name,
        active_node_keys=active_nodes_by_center.get(center.center_key, []),
        processed_files=processed_files,
        candidate_count=sum(
            file.eligible and not file.transfer_registered for file in processed_files
        ),
        rejection_count=sum(
            rejection.center_key == center.center_key for rejection in rejections
        ),
        duplicate_count=sum(
            duplicate.center_key == center.center_key for duplicate in duplicates
        ),
    )


def _build_center_sync_summary(
    *,
    processed_files_by_center: dict[str, list[HubProcessedFile]],
    rejections: list[HubSyncRejection],
    duplicates: list[HubSyncDuplicate],
) -> HubFileSyncSummary:
    active_nodes_by_center = _active_node_keys_by_center()
    center_states = [
        _center_sync_state(
            center,
            active_nodes_by_center=active_nodes_by_center,
            processed_files_by_center=processed_files_by_center,
            rejections=rejections,
            duplicates=duplicates,
        )
        for center in Center.objects.order_by("center_key", "pk")
    ]
    return HubFileSyncSummary(
        centers=center_states,
        rejections=rejections,
        duplicates=duplicates,
        processed_file_count=sum(
            len(center.processed_files) for center in center_states
        ),
        candidate_count=sum(center.candidate_count for center in center_states),
    )


def build_hub_export_overview(*, target_node: NetworkNode | None) -> dict[str, Any]:
    source_node = get_default_source_node()
    hub_nodes = list(get_active_hub_nodes().select_related("owning_center"))
    selected_target, config_error = _resolve_overview_target(target_node, hub_nodes)
    jobs_by_key = _jobs_by_resource(selected_target)

    items: list[dict[str, Any]] = []
    privacy_records: list[HubExportPrivacyRecord] = []
    processed_files_by_center: dict[str, list[HubProcessedFile]] = {
        center.center_key: [] for center in Center.objects.order_by("center_key", "pk")
    }
    rejections: list[HubSyncRejection] = []
    duplicates: list[HubSyncDuplicate] = []

    _collect_video_overview(
        selected_target=selected_target,
        jobs_by_key=jobs_by_key,
        processed_files_by_center=processed_files_by_center,
        items=items,
        privacy_records=privacy_records,
        rejections=rejections,
        duplicates=duplicates,
    )
    _collect_report_overview(
        selected_target=selected_target,
        jobs_by_key=jobs_by_key,
        processed_files_by_center=processed_files_by_center,
        items=items,
        privacy_records=privacy_records,
        rejections=rejections,
        duplicates=duplicates,
    )

    items.sort(key=lambda item: (not bool(item["eligible"]), item["filename"]))
    sync_summary = _build_center_sync_summary(
        processed_files_by_center=processed_files_by_center,
        rejections=rejections,
        duplicates=duplicates,
    )
    payload = {
        "selected_target_node_key": (
            selected_target.node_key if selected_target is not None else None
        ),
        "source_node_key": source_node.node_key if source_node is not None else None,
        "hub_nodes": [
            {
                "node_key": node.node_key,
                "display_name": node.display_name,
                "base_url": node.base_url,
                "owning_center_key": (
                    node.owning_center.center_key if node.owning_center else None
                ),
            }
            for node in hub_nodes
        ],
        "config_ready": (
            source_node is not None
            and selected_target is not None
            and len(hub_nodes) == 1
        ),
        "config_error": config_error
        or (
            "No active site node is configured for outbound hub export."
            if source_node is None
            else ""
        ),
        "privacy_summary": build_hub_export_privacy_summary(privacy_records),
        "sync_summary": sync_summary,
        "items": items,
    }
    return HubExportOverview.model_validate(payload).model_dump(mode="json")


@transaction.atomic
def mark_resources_for_hub_upload(
    *,
    resource_refs: list[dict[str, Any]],
    target_node: NetworkNode,
    marked_by=None,
) -> list[OutboundHubTransferJob]:
    authenticated_marker = _authenticated_marker(marked_by)
    source_node = get_default_source_node()
    if source_node is None:
        raise ValueError("No active site node is configured for outbound hub export.")

    created_or_existing: list[OutboundHubTransferJob] = []
    for ref in resource_refs:
        resource_kind = _resource_ref_kind(ref)
        resource_id = _resource_ref_id(ref)

        if resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO:
            job, created = _mark_video_for_hub_upload(
                resource_id=resource_id,
                target_node=target_node,
                source_node=source_node,
                marked_by=authenticated_marker,
            )
        elif resource_kind == OutboundHubTransferJob.ResourceKind.REPORT:
            job, created = _mark_report_for_hub_upload(
                resource_id=resource_id,
                target_node=target_node,
                source_node=source_node,
                marked_by=authenticated_marker,
            )
        else:
            raise ValueError(f"Unsupported resource_kind={resource_kind!r}")
        _finalize_marked_job(
            job,
            source_node=source_node,
            marked_by=authenticated_marker,
            created=created,
        )
        created_or_existing.append(job)

    return created_or_existing


def _authenticated_marker(marked_by: Any) -> Any:
    if not getattr(marked_by, "is_authenticated", False):
        raise ValueError(
            "An authenticated operator is required for hub export marking."
        )
    return marked_by


def _mark_video_for_hub_upload(
    *,
    resource_id: int,
    target_node: NetworkNode,
    source_node: NetworkNode,
    marked_by: Any,
) -> tuple[OutboundHubTransferJob, bool]:
    video = VideoFile.objects.select_related("center").get(pk=resource_id)
    if not is_video_hub_export_eligible(video):
        raise ValueError(f"Video {resource_id} is not eligible for hub export.")
    return OutboundHubTransferJob.objects.get_or_create(
        video_file=video,
        target_node=target_node,
        transfer_mode=OutboundHubTransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA,
        defaults={
            "resource_kind": OutboundHubTransferJob.ResourceKind.VIDEO,
            "source_center": video.center,
            "local_cleanup_policy": configured_local_cleanup_policy(),
            "marked_by": marked_by,
            "transfer_key": build_transfer_key(
                source_node_key=source_node.node_key,
                resource_kind="video",
                resource_hash=video.video_hash,
            ),
        },
    )


def _mark_report_for_hub_upload(
    *,
    resource_id: int,
    target_node: NetworkNode,
    source_node: NetworkNode,
    marked_by: Any,
) -> tuple[OutboundHubTransferJob, bool]:
    report = RawPdfFile.objects.select_related("center").get(pk=resource_id)
    if not is_report_hub_export_eligible(report):
        raise ValueError(f"Report {resource_id} is not eligible for hub export.")
    return OutboundHubTransferJob.objects.get_or_create(
        raw_pdf_file=report,
        target_node=target_node,
        transfer_mode=OutboundHubTransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA,
        defaults={
            "resource_kind": OutboundHubTransferJob.ResourceKind.REPORT,
            "source_center": report.center,
            "local_cleanup_policy": configured_local_cleanup_policy(),
            "marked_by": marked_by,
            "transfer_key": build_transfer_key(
                source_node_key=source_node.node_key,
                resource_kind="report",
                resource_hash=report.pdf_hash,
            ),
        },
    )


def _finalize_marked_job(
    job: OutboundHubTransferJob,
    *,
    source_node: NetworkNode,
    marked_by: Any,
    created: bool,
) -> None:
    emit_hub_export_audit_event(
        "hub_export.marked",
        outbound_job=job,
        request_user=marked_by,
        source_node_key=source_node.node_key,
        created=created,
    )
    if hub_export_auto_queue_enabled():
        queue_outbound_job(job)


@transaction.atomic
def unmark_resources_for_hub_upload(
    *,
    resource_refs: list[dict[str, Any]],
    target_node: NetworkNode,
) -> int:
    deleted = 0
    for ref in resource_refs:
        resource_kind = _resource_ref_kind(ref)
        resource_id = _resource_ref_id(ref)
        filters: dict[str, Any] = {"target_node": target_node}
        if resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO:
            filters["video_file_id"] = resource_id
        elif resource_kind == OutboundHubTransferJob.ResourceKind.REPORT:
            filters["raw_pdf_file_id"] = resource_id
        else:
            raise ValueError(f"Unsupported resource_kind={resource_kind!r}")

        deleted += OutboundHubTransferJob.objects.filter(
            **filters,
            local_status=OutboundHubTransferJob.LocalStatus.MARKED,
        ).delete()[0]
    return deleted
