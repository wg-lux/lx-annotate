from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Literal

from django.conf import settings
from django.utils import timezone
from pydantic import BaseModel, ConfigDict, Field
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.permissions import (
    user_has_exact_group,
    user_has_global_center_scope_admin,
)

logger = logging.getLogger(__name__)
CACHE_HEADERS = {"Cache-Control": "private, no-store", "Vary": "Cookie, Authorization"}


class AnonymizationStorageSnapshot(BaseModel):
    """Filesystem capacity, including non-media occupants and filesystem reserves.

    ``used_bytes + available_bytes + reserved_bytes == total_bytes``.
    Reserves are free blocks unavailable to an unprivileged process, not pending
    import reservations. This is neither a media inventory nor a fleet total.
    """

    model_config = ConfigDict(extra="forbid", strict=True)

    scope: Literal["protected_media_filesystem"] = "protected_media_filesystem"
    total_bytes: int = Field(gt=0)
    used_bytes: int = Field(ge=0)
    available_bytes: int = Field(ge=0)
    reserved_bytes: int = Field(ge=0)
    observed_at: datetime


def observe_storage_capacity() -> AnonymizationStorageSnapshot:
    # Match monitoring.runtime.storage_check's bounded statvfs observation. It
    # cannot supply f_bfree, which is needed to distinguish use from reserves.
    configured_root = getattr(settings, "PROTECTED_MEDIA_ROOT", None)
    if not configured_root:
        raise ValueError("Protected media storage is not configured.")
    root = Path(configured_root)
    if not root.is_absolute() or not root.is_dir():
        raise ValueError("Protected media storage is unavailable.")
    if not os.access(root, os.R_OK | os.X_OK, effective_ids=True):
        raise PermissionError("Protected media storage is inaccessible.")
    usage = os.statvfs(root)
    if (
        usage.f_frsize <= 0
        or usage.f_blocks <= 0
        or not 0 <= usage.f_bavail <= usage.f_bfree <= usage.f_blocks
    ):
        raise ValueError("Filesystem capacity is inconsistent.")
    return AnonymizationStorageSnapshot(
        total_bytes=usage.f_blocks * usage.f_frsize,
        used_bytes=(usage.f_blocks - usage.f_bfree) * usage.f_frsize,
        available_bytes=usage.f_bavail * usage.f_frsize,
        reserved_bytes=(usage.f_bfree - usage.f_bavail) * usage.f_frsize,
        observed_at=timezone.now(),
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def anonymization_storage(request: Request) -> Response:
    # Match administration's storage monitoring boundary, independent of DEBUG.
    if not (
        user_has_global_center_scope_admin(request.user)
        or user_has_exact_group(request.user, "storage:monitor")
    ):
        return Response(
            {"detail": "Storage monitoring permission is required."},
            status=403,
            headers=CACHE_HEADERS,
        )
    if request.query_params:
        return Response(
            {"detail": "Storage capacity does not accept query parameters."},
            status=400,
            headers=CACHE_HEADERS,
        )
    try:
        snapshot = observe_storage_capacity()
    except (OSError, ValueError, TypeError) as exc:
        # Exception messages can include protected paths; retain only their type.
        logger.warning(
            '{"event":"anonymization_storage_unavailable","error_type":"%s"}',
            type(exc).__name__,
        )
        return Response(
            {
                "code": "storage_unavailable",
                "detail": "Protected media filesystem capacity is unavailable.",
            },
            status=503,
            headers=CACHE_HEADERS,
        )
    return Response(snapshot.model_dump(mode="json"), headers=CACHE_HEADERS)
