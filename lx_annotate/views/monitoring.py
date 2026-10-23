from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.monitoring.service import build_monitoring_snapshot
from lx_annotate.permissions import RuntimeMonitoringPermission


@api_view(["GET"])
@permission_classes([IsAuthenticated, RuntimeMonitoringPermission])
def monitoring_snapshot(request: Request) -> Response:
    # The browser cannot select paths, units, subprocesses, or costly check modes.
    if request.query_params:
        return Response(
            {"detail": "Monitoring does not accept query parameters."},
            status=400,
            headers={"Cache-Control": "private, no-store"},
        )
    return Response(
        build_monitoring_snapshot().model_dump(mode="json"),
        headers={"Cache-Control": "private, no-store", "Vary": "Cookie, Authorization"},
    )
