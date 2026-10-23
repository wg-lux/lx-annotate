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
    HubRecoveryAction,
    HubRecoveryAssessment,
)
from lx_annotate.hub.hub_export_jobs import (
    build_hub_export_overview,
    mark_resources_for_hub_upload,
    queue_all_eligible_videos_for_hub_upload,
    require_normal_sender_target_hub,
    resolve_target_hub_node,
    retry_failed_outbound_job,
    unmark_resources_for_hub_upload,
)
from lx_annotate.permissions import (
    LifecyclePolicyPermission,
    lifecycle_center_ids,
    user_has_global_center_scope_admin,
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
    return exc.errors(include_url=False, include_input=False, include_context=False)


def _operator_recovery(
    assessment: HubRecoveryAssessment, *, allow_inspection: bool
) -> HubRecoveryAssessment:
    if allow_inspection:
        return assessment

    def action(value: HubRecoveryAction) -> HubRecoveryAction:
        return (
            HubRecoveryAction.ADMINISTRATOR_RECOVERY
            if value == HubRecoveryAction.INSPECT_RECOVERY
            else value
        )

    return assessment.model_copy(
        update={
            "allowed_actions": list(
                dict.fromkeys(action(value) for value in assessment.allowed_actions)
            ),
            "blockers": [
                blocker.model_copy(update={"action": action(blocker.action)})
                for blocker in assessment.blockers
            ],
        }
    )


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_overview(request):
    center_ids = lifecycle_center_ids(request.user)
    target_node_key = request.query_params.get("target_node_key")
    target_node = (
        resolve_target_hub_node(target_node_key=target_node_key)
        if str(target_node_key or "").strip()
        else _resolve_target_node(None)
    )
    payload = build_hub_export_overview(
        target_node=target_node, allowed_center_ids=center_ids
    )
    for item in payload["items"]:
        if item.get("recovery") is not None:
            item["recovery"] = _operator_recovery(
                HubRecoveryAssessment.model_validate(item["recovery"]),
                allow_inspection=user_has_global_center_scope_admin(request.user),
            ).model_dump(mode="json")
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_mark(request):
    center_ids = lifecycle_center_ids(request.user)
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
            allowed_center_ids=center_ids,
            retain_local_processed_media=mutation.retain_local_processed_media,
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
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_offload_eligible_videos(request):
    center_ids = lifecycle_center_ids(request.user)
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
            allowed_center_ids=center_ids,
            retain_local_processed_media=mutation.retain_local_processed_media,
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(result.model_dump(mode="json"), status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_retry(request, outbound_job_id):
    center_ids = lifecycle_center_ids(request.user)
    try:
        result = retry_failed_outbound_job(
            outbound_job_id=str(outbound_job_id),
            requested_by=request.user,
            allowed_center_ids=center_ids,
        )
    except ObjectDoesNotExist:
        return Response(
            {"detail": "Hub transfer job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    except ValueError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_409_CONFLICT,
        )
    return Response(result.model_dump(mode="json"), status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_unmark(request):
    center_ids = lifecycle_center_ids(request.user)
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
            allowed_center_ids=center_ids,
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


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_preflight(request, video_id):
    from lx_annotate.hub.hub_export_recovery import preflight_video

    try:
        result = preflight_video(
            video_id, allowed_center_ids=lifecycle_center_ids(request.user)
        )
    except ObjectDoesNotExist:
        return Response(
            {"detail": "Video not found."}, status=status.HTTP_404_NOT_FOUND
        )
    return Response(
        _operator_recovery(
            result, allow_inspection=user_has_global_center_scope_admin(request.user)
        ).model_dump(mode="json")
    )


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_inspect_recovery(request, video_id):
    from lx_annotate.hub.hub_export_recovery import (
        preview_cleanup_recovery,
        scoped_video,
    )

    if not user_has_global_center_scope_admin(request.user):
        return Response(
            {"detail": "Administrator recovery inspection is required."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        video = scoped_video(video_id, lifecycle_center_ids(request.user))
    except ObjectDoesNotExist:
        return Response(
            {"detail": "Video not found."}, status=status.HTTP_404_NOT_FOUND
        )
    return Response(preview_cleanup_recovery(video, requested_by_id=request.user.pk))


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated, LifecyclePolicyPermission])
def hub_export_restart_cleanup(request, video_id):
    from lx_annotate.hub.hub_export_contracts import HubCleanupRestartRequest
    from endoreg_db.services.media.operation_gate import MediaOperationDeferred
    from lx_annotate.hub.hub_export_recovery import restart_cleanup

    if not user_has_global_center_scope_admin(request.user):
        return Response(
            {"detail": "Administrator recovery permission is required."},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        mutation = HubCleanupRestartRequest.model_validate(request.data)
    except ValidationError as exc:
        return Response(
            {"errors": _validation_errors(exc)}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        result = restart_cleanup(
            video_id=video_id,
            requested_by=request.user,
            allowed_center_ids=lifecycle_center_ids(request.user),
            mutation=mutation,
        )
    except ObjectDoesNotExist:
        return Response(
            {"detail": "Video not found."}, status=status.HTTP_404_NOT_FOUND
        )
    except MediaOperationDeferred:
        return Response(
            {"detail": "A media operation is active. Inspect again."},
            status=status.HTTP_409_CONFLICT,
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    return Response(result)
