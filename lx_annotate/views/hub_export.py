from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from endoreg_db.models import NetworkNode
from endoreg_db.utils.permissions import EnvironmentAwarePermission

from lx_annotate.hub.hub_export_jobs import (
    build_hub_export_overview,
    mark_resources_for_hub_upload,
    require_normal_sender_target_hub,
    resolve_target_hub_node,
    unmark_resources_for_hub_upload,
)


def _resolve_target_node(target_node_key: str | None) -> NetworkNode | None:
    normalized = str(target_node_key or "").strip()
    if normalized:
        return resolve_target_hub_node(target_node_key=normalized)
    try:
        return require_normal_sender_target_hub()
    except ValueError:
        return None


def _request_target_node_key(data) -> str | None:
    return data.get("target_node_key") or data.get("targetNodeKey")


@api_view(["GET"])
@permission_classes([EnvironmentAwarePermission])
def hub_export_overview(request):
    target_node_key = request.query_params.get("target_node_key")
    target_node = (
        resolve_target_hub_node(target_node_key=target_node_key)
        if str(target_node_key or "").strip()
        else _resolve_target_node(None)
    )
    payload = build_hub_export_overview(target_node=target_node)
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([EnvironmentAwarePermission])
def hub_export_mark(request):
    data = request.data or {}
    target_node = _resolve_target_node(_request_target_node_key(data))
    if target_node is None:
        return Response(
            {
                "errors": {
                    "target_node_key": "No active central hub node is configured."
                }
            },
            status=status.HTTP_409_CONFLICT,
        )

    resources = data.get("resources")
    if not isinstance(resources, list) or not resources:
        return Response(
            {"errors": {"resources": "resources must be a non-empty list."}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        jobs = mark_resources_for_hub_upload(
            resource_refs=list(resources),
            target_node=target_node,
            marked_by=getattr(request, "user", None),
        )
    except Exception as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "marked_count": len(jobs),
            "target_node_key": target_node.node_key,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([EnvironmentAwarePermission])
def hub_export_unmark(request):
    data = request.data or {}
    target_node = _resolve_target_node(_request_target_node_key(data))
    if target_node is None:
        return Response(
            {
                "errors": {
                    "target_node_key": "No active central hub node is configured."
                }
            },
            status=status.HTTP_409_CONFLICT,
        )

    resources = data.get("resources")
    if not isinstance(resources, list) or not resources:
        return Response(
            {"errors": {"resources": "resources must be a non-empty list."}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        deleted_count = unmark_resources_for_hub_upload(
            resource_refs=list(resources),
            target_node=target_node,
        )
    except Exception as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "unmarked_count": deleted_count,
            "target_node_key": target_node.node_key,
        },
        status=status.HTTP_200_OK,
    )
