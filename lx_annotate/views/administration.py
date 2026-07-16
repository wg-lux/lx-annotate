from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from django.conf import settings
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from endoreg_db.models import NetworkNode
from lx_annotate.hub.hub_export_jobs import (
    get_active_hub_nodes,
    get_default_source_node,
)
from lx_annotate.models import OutboundHubTransferJob
from lx_annotate.permissions import (
    CENTER_SCOPE_ADMIN_ROLE,
    ExactCenterScopeAdminPermission,
    user_has_exact_group,
)
from lx_annotate.services.access_management import (
    AccessManagementConflict,
    AccessManagementError,
    AccessManagementForbidden,
    CenterScopeMutation,
    assignment_status,
    get_portal_info_for_user,
    list_delegated_users,
    mutate_center_scope,
)


def _configured_readable_file(setting_name: str) -> tuple[bool, bool]:
    value = str(getattr(settings, setting_name, "") or "").strip()
    if not value:
        return False, False
    path = Path(value).expanduser()
    try:
        return True, path.is_file() and path.stat().st_size > 0
    except OSError:
        return True, False


def _transport_health() -> dict[str, Any]:
    cert_configured, cert_readable = _configured_readable_file(
        "LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE"
    )
    key_configured, key_readable = _configured_readable_file(
        "LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE"
    )
    ca_configured, ca_readable = _configured_readable_file(
        "LX_ANNOTATE_HUB_EXPORT_CA_FILE"
    )
    require_mtls = bool(getattr(settings, "LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS", True))
    mtls_ready = (cert_readable and key_readable) if require_mtls else True
    ca_ready = ca_readable if ca_configured else True
    return {
        "require_mtls": require_mtls,
        "client_certificate_configured": cert_configured,
        "client_certificate_readable": cert_readable,
        "client_key_configured": key_configured,
        "client_key_readable": key_readable,
        "custom_ca_configured": ca_configured,
        "custom_ca_readable": ca_readable,
        "ready": mtls_ready and ca_ready,
    }


def _hub_node_health(node: NetworkNode) -> dict[str, Any]:
    parsed = urlparse(str(node.base_url or ""))
    return {
        "node_key": str(node.node_key),
        "display_name": str(node.display_name),
        "owning_center_key": (
            str(node.owning_center.center_key) if node.owning_center else None
        ),
        "active": bool(node.is_active),
        "https_configured": parsed.scheme.lower() == "https" and bool(parsed.netloc),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def administration_overview(request):
    jobs = OutboundHubTransferJob.objects.select_related(
        "target_node", "source_center"
    ).order_by("-updated_at")
    portal_info = get_portal_info_for_user(request.user)
    if not bool(getattr(request.user, "is_superuser", False)):
        center_id = getattr(
            getattr(getattr(portal_info, "examiner", None), "center", None),
            "pk",
            None,
        )
        jobs = jobs.filter(source_center_id=center_id) if center_id else jobs.none()
    counts = Counter(jobs.values_list("local_status", flat=True))
    recent_jobs = jobs.filter(
        Q(local_status=OutboundHubTransferJob.LocalStatus.FAILED)
        | Q(
            local_status__in=[
                OutboundHubTransferJob.LocalStatus.QUEUED,
                OutboundHubTransferJob.LocalStatus.REGISTERING,
                OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA,
                OutboundHubTransferJob.LocalStatus.UPLOADING,
            ]
        )
    )[:25]
    source_node = get_default_source_node()
    hub_nodes = list(get_active_hub_nodes().select_related("owning_center"))
    roles = sorted(request.user.groups.values_list("name", flat=True))
    transport = _transport_health()
    target_nodes_ready = bool(hub_nodes) and all(
        _hub_node_health(node)["https_configured"] for node in hub_nodes
    )
    return Response(
        {
            "hub_health": {
                "ready": bool(source_node)
                and len(hub_nodes) == 1
                and target_nodes_ready
                and transport["ready"],
                "source_node_configured": source_node is not None,
                "source_node_key": str(source_node.node_key) if source_node else None,
                "exactly_one_active_hub": len(hub_nodes) == 1,
                "hub_nodes": [_hub_node_health(node) for node in hub_nodes],
                "transport": transport,
                "auto_queue_enabled": bool(
                    getattr(settings, "LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE", False)
                ),
            },
            "transfer_monitoring": {
                "total": jobs.count(),
                "counts": {
                    choice.value: int(counts.get(choice.value, 0))
                    for choice in OutboundHubTransferJob.LocalStatus
                },
                "recent_attention_jobs": [
                    {
                        "id": str(job.pk),
                        "resource_kind": str(job.resource_kind),
                        "local_status": str(job.local_status),
                        "target_node_key": str(job.target_node.node_key),
                        "source_center_key": (
                            str(job.source_center.center_key)
                            if job.source_center
                            else None
                        ),
                        "retry_count": int(job.retry_count),
                        "last_error": str(job.last_error),
                        "last_attempt_at": (
                            job.last_attempt_at.isoformat()
                            if job.last_attempt_at
                            else None
                        ),
                        "updated_at": job.updated_at.isoformat(),
                    }
                    for job in recent_jobs
                ],
            },
            "effective_permissions": {
                "username": str(request.user.username),
                "roles": roles,
                "center_assignment_status": assignment_status(portal_info),
                "center_key": (
                    str(portal_info.examiner.center.center_key)
                    if portal_info
                    and portal_info.examiner
                    and portal_info.examiner.center
                    else None
                ),
                "hub_monitor_read": True,
                "center_scope_admin": user_has_exact_group(
                    request.user, CENTER_SCOPE_ADMIN_ROLE
                ),
                "keycloak_role_mutation": False,
            },
        }
    )


def _positive_int(raw: Any, *, default: int, maximum: int) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return min(max(value, 1), maximum)


@api_view(["GET"])
@permission_classes([ExactCenterScopeAdminPermission])
def center_scope_users(request):
    page = _positive_int(request.query_params.get("page"), default=1, maximum=100000)
    page_size = _positive_int(
        request.query_params.get("page_size"), default=25, maximum=100
    )
    try:
        payload = list_delegated_users(
            actor=request.user, page=page, page_size=page_size
        )
    except AccessManagementForbidden as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
    return Response(payload)


@api_view(["POST"])
@permission_classes([ExactCenterScopeAdminPermission])
def center_scope_assignment(request, user_id: int):
    try:
        mutation = CenterScopeMutation.model_validate(request.data or {})
        result = mutate_center_scope(
            actor=request.user,
            target_user_id=user_id,
            mutation=mutation,
            correlation_id=request.headers.get("X-Request-ID"),
        )
    except AccessManagementConflict as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    except AccessManagementForbidden as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
    except AccessManagementError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)
