from __future__ import annotations

from typing import Any

from django.db.models import QuerySet

from endoreg_db.models import NetworkNode, RawPdfFile, VideoFile

from .hub_export_audit import emit_hub_export_audit_event
from .hub_export_cleanup import configured_local_cleanup_policy
from .hub_export_state import (
    is_report_hub_export_eligible,
    is_video_hub_export_eligible,
    video_hub_export_blocked_reason,
)
from ..models import OutboundHubTransferJob


def build_transfer_key(
    *,
    source_node_key: str,
    resource_kind: str,
    resource_hash: str,
) -> str:
    return f"{source_node_key}__{resource_kind}__{resource_hash}__processed_v1"


def _resource_ref_kind(resource_ref: dict[str, Any]) -> str:
    return (
        str(resource_ref.get("resource_kind") or resource_ref.get("resourceKind") or "")
        .strip()
        .lower()
    )


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


def build_hub_export_overview(*, target_node: NetworkNode | None) -> dict[str, Any]:
    source_node = get_default_source_node()
    hub_nodes = list(get_active_hub_nodes().select_related("owning_center"))
    selected_target = target_node
    config_error = ""
    if selected_target is None and len(hub_nodes) == 1:
        selected_target = hub_nodes[0]
    elif selected_target is None and not hub_nodes:
        config_error = "No active central hub node is configured."
    elif selected_target is None and len(hub_nodes) > 1:
        config_error = (
            "Normal sender mode requires exactly one active central hub node."
        )

    jobs_by_key: dict[tuple[str, int], OutboundHubTransferJob] = {}
    if selected_target is not None:
        for job in OutboundHubTransferJob.objects.select_related(
            "target_node",
            "source_center",
        ).filter(target_node=selected_target):
            if job.video_file_id is not None:
                jobs_by_key[("video", int(job.video_file_id))] = job
            if job.raw_pdf_file_id is not None:
                jobs_by_key[("report", int(job.raw_pdf_file_id))] = job

    items: list[dict[str, Any]] = []

    videos = VideoFile.objects.select_related("state", "center").order_by(
        "-date_created"
    )
    for video in videos:
        state = video.state
        anonymization_status = (
            state.anonymization_status.value if state is not None else "not_started"
        )
        eligible = is_video_hub_export_eligible(video)
        blocked_reason = "" if eligible else video_hub_export_blocked_reason(video)
        video_job = jobs_by_key.get(("video", int(video.id)))
        items.append(
            {
                "id": video.id,
                "resource_kind": "video",
                "filename": video.original_file_name or video.video_hash,
                "anonymization_status": anonymization_status,
                "processed_media_present": bool(
                    video.processed_file and video.processed_file.name
                ),
                "source_center_key": video.center.center_key if video.center else None,
                "source_center_name": video.center.name if video.center else None,
                "marked_for_upload": video_job is not None,
                "outbound_status": video_job.local_status
                if video_job is not None
                else "",
                "last_error": video_job.last_error if video_job is not None else "",
                "last_transfer_timestamp": (
                    video_job.completed_at.isoformat()
                    if video_job and video_job.completed_at
                    else None
                ),
                "target_node_key": (
                    video_job.target_node.node_key
                    if video_job is not None
                    else (
                        selected_target.node_key
                        if selected_target is not None
                        else None
                    )
                ),
                "eligible": eligible,
                "blocked_reason": blocked_reason,
                "created_at": video.date_created.isoformat()
                if video.date_created
                else None,
            }
        )

    reports = RawPdfFile.objects.select_related("state", "center").order_by(
        "-date_created"
    )
    for report in reports:
        state = report.state
        anonymization_status = (
            state.anonymization_status.value if state is not None else "not_started"
        )
        report_job = jobs_by_key.get(("report", int(report.id)))
        items.append(
            {
                "id": report.id,
                "resource_kind": "report",
                "filename": report.file.name.rsplit("/", 1)[-1]
                if report.file
                else report.pdf_hash,
                "anonymization_status": anonymization_status,
                "processed_media_present": bool(
                    report.processed_file and report.processed_file.name
                ),
                "source_center_key": report.center.center_key
                if report.center
                else None,
                "source_center_name": report.center.name if report.center else None,
                "marked_for_upload": report_job is not None,
                "outbound_status": report_job.local_status
                if report_job is not None
                else "",
                "last_error": report_job.last_error if report_job is not None else "",
                "last_transfer_timestamp": (
                    report_job.completed_at.isoformat()
                    if report_job and report_job.completed_at
                    else None
                ),
                "target_node_key": (
                    report_job.target_node.node_key
                    if report_job is not None
                    else (
                        selected_target.node_key
                        if selected_target is not None
                        else None
                    )
                ),
                "eligible": is_report_hub_export_eligible(report),
                "created_at": report.date_created.isoformat()
                if report.date_created
                else None,
            }
        )

    items.sort(key=lambda item: (not bool(item["eligible"]), item["filename"]))
    return {
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
        "items": items,
    }


def mark_resources_for_hub_upload(
    *,
    resource_refs: list[dict[str, Any]],
    target_node: NetworkNode,
    marked_by=None,
) -> list[OutboundHubTransferJob]:
    source_node = get_default_source_node()
    if source_node is None:
        raise ValueError("No active site node is configured for outbound hub export.")

    created_or_existing: list[OutboundHubTransferJob] = []
    for ref in resource_refs:
        resource_kind = _resource_ref_kind(ref)
        resource_id = _resource_ref_id(ref)

        if resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO:
            video = VideoFile.objects.select_related("center").get(pk=resource_id)
            if not is_video_hub_export_eligible(video):
                raise ValueError(f"Video {resource_id} is not eligible for hub export.")
            job, created = OutboundHubTransferJob.objects.get_or_create(
                video_file=video,
                target_node=target_node,
                transfer_mode=OutboundHubTransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA,
                defaults={
                    "resource_kind": OutboundHubTransferJob.ResourceKind.VIDEO,
                    "source_center": video.center,
                    "local_cleanup_policy": configured_local_cleanup_policy(),
                    "marked_by": (
                        marked_by
                        if getattr(marked_by, "is_authenticated", False)
                        else None
                    ),
                    "transfer_key": build_transfer_key(
                        source_node_key=source_node.node_key,
                        resource_kind="video",
                        resource_hash=video.video_hash,
                    ),
                },
            )
            emit_hub_export_audit_event(
                "hub_export.marked",
                outbound_job=job,
                request_user=marked_by,
                source_node_key=source_node.node_key,
                created=created,
            )
            created_or_existing.append(job)
            continue

        if resource_kind == OutboundHubTransferJob.ResourceKind.REPORT:
            report = RawPdfFile.objects.select_related("center").get(pk=resource_id)
            if not is_report_hub_export_eligible(report):
                raise ValueError(
                    f"Report {resource_id} is not eligible for hub export."
                )
            job, created = OutboundHubTransferJob.objects.get_or_create(
                raw_pdf_file=report,
                target_node=target_node,
                transfer_mode=OutboundHubTransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA,
                defaults={
                    "resource_kind": OutboundHubTransferJob.ResourceKind.REPORT,
                    "source_center": report.center,
                    "local_cleanup_policy": configured_local_cleanup_policy(),
                    "marked_by": (
                        marked_by
                        if getattr(marked_by, "is_authenticated", False)
                        else None
                    ),
                    "transfer_key": build_transfer_key(
                        source_node_key=source_node.node_key,
                        resource_kind="report",
                        resource_hash=report.pdf_hash,
                    ),
                },
            )
            emit_hub_export_audit_event(
                "hub_export.marked",
                outbound_job=job,
                request_user=marked_by,
                source_node_key=source_node.node_key,
                created=created,
            )
            created_or_existing.append(job)
            continue

        raise ValueError(f"Unsupported resource_kind={resource_kind!r}")

    return created_or_existing


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
