from __future__ import annotations

from django.conf import settings
from endoreg_db.services.hub import get_deployment_role
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.services.remote_machines import RemoteMachine


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def remote_machines(request: Request) -> Response:
    """List the LuxNix machines this browser may switch to in remote mode.

    The client navigates to the chosen ``base_url``; it never sends API
    requests to another origin through this application.
    """
    del request
    machines: tuple[RemoteMachine, ...] = settings.LX_ANNOTATE_REMOTE_MACHINES
    return Response(
        {
            "deployment_role": get_deployment_role(),
            "machines": [machine.model_dump() for machine in machines],
        },
        headers={"Cache-Control": "no-store"},
    )
