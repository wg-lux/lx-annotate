from __future__ import annotations

from django.core.exceptions import ObjectDoesNotExist
from endoreg_db.models import NetworkNode
from pydantic import ValidationError
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from lx_annotate.hub.hub_export_contracts import (
    HubEligibleVideoOffloadRequest,
    HubExportMutationRequest,
)
from lx_annotate.hub.hub_export_jobs import (
    build_hub_export_overview,
    mark_resources_for_hub_upload,
    queue_all_eligible_videos_for_hub_upload,
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


def _parse_mutation_request(data: object) -> HubExportMutationRequest:
    return HubExportMutationRequest.model_validate(data)


def _parse_eligible_video_offload_request(
    data: object,
) -> HubEligibleVideoOffloadRequest:
    return HubEligibleVideoOffloadRequest.model_validate(data)


def _validation_errors(exc: ValidationError) -> object:
    return exc.errors(include_url=False, include_input=False)


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
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
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def hub_export_mark(request):
    try:
        mutation = _parse_mutation_request(request.data or {})
    except ValidationError as exc:
        return Response(
            {"errors": _validation_errors(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    target_node = _resolve_target_node(mutation.target_node_key)
    if target_node is None:
        return Response(
            {
                "errors": {
                    "target_node_key": "No active central hub node is configured.",
                },
            },
            status=status.HTTP_409_CONFLICT,
        )

    try:
        jobs = mark_resources_for_hub_upload(
            resource_refs=[
                resource.model_dump(mode="json") for resource in mutation.resources
            ],
            target_node=target_node,
            marked_by=request.user,
        )
    except (ObjectDoesNotExist, ValueError) as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "marked_count": len(jobs),
            "target_node_key": target_node.node_key,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def hub_export_offload_eligible_videos(request):
    try:
        mutation = _parse_eligible_video_offload_request(request.data or {})
    except ValidationError as exc:
        return Response(
            {"errors": _validation_errors(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    target_node = _resolve_target_node(mutation.target_node_key)
    if target_node is None:
        return Response(
            {
                "errors": {
                    "target_node_key": "No active central hub node is configured.",
                },
            },
            status=status.HTTP_409_CONFLICT,
        )

    try:
        result = queue_all_eligible_videos_for_hub_upload(
            target_node=target_node,
            marked_by=request.user,
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result.model_dump(mode="json"), status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def hub_export_unmark(request):
    try:
        mutation = _parse_mutation_request(request.data or {})
    except ValidationError as exc:
        return Response(
            {"errors": _validation_errors(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    target_node = _resolve_target_node(mutation.target_node_key)
    if target_node is None:
        return Response(
            {
                "errors": {
                    "target_node_key": "No active central hub node is configured.",
                },
            },
            status=status.HTTP_409_CONFLICT,
        )

    try:
        deleted_count = unmark_resources_for_hub_upload(
            resource_refs=[
                resource.model_dump(mode="json") for resource in mutation.resources
            ],
            target_node=target_node,
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "unmarked_count": deleted_count,
            "target_node_key": target_node.node_key,
        },
        status=status.HTTP_200_OK,
    )
