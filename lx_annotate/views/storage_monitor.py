from __future__ import annotations

import logging
from dataclasses import asdict

from django.core import signing
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.permissions import (
    user_has_exact_group,
    user_has_global_center_scope_admin,
)
from lx_annotate.services.storage_monitor import delete_observation, inventory
from lx_annotate.views.anonymization_storage import CACHE_HEADERS

logger = logging.getLogger(__name__)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def storage_monitor(request: Request) -> Response:
    administrator = user_has_global_center_scope_admin(request.user)
    if not administrator and (
        request.method != "GET"
        or not user_has_exact_group(request.user, "storage:monitor")
    ):
        return Response(
            {"detail": "Globale Speicherberechtigung erforderlich."},
            status=403,
            headers=CACHE_HEADERS,
        )
    try:
        if request.method == "DELETE":
            value = request.data.get("token")
            if not isinstance(value, str) or not value:
                return Response(
                    {"detail": "Gültige Löschbestätigung erforderlich."},
                    status=400,
                    headers=CACHE_HEADERS,
                )
            delete_observation(value)
            logger.info(
                '{"event":"storage_monitor_deletion","actor_id":"%s"}', request.user.pk
            )
            return Response({"deleted": True}, headers=CACHE_HEADERS)
        offset = int(request.query_params.get("offset", "0"))
        limit = int(request.query_params.get("limit", "100"))
        if offset < 0 or not 1 <= limit <= 200:
            raise ValueError("Invalid page")
        entries = inventory()
        query = request.query_params.get("search", "").casefold()
        kind = request.query_params.get("kind", "")
        state = request.query_params.get("state", "")
        total_size = sum(
            entry.size or 0 for entry in entries if entry.kind == "artifact"
        )
        filtered = [
            entry
            for entry in entries
            if (not kind or entry.kind == kind)
            and (not state or entry.status == state)
            and (
                not query
                or query
                in " ".join(
                    (
                        entry.name,
                        entry.path,
                        entry.id,
                        *entry.owners,
                        *entry.details.values(),
                    )
                ).casefold()
            )
        ]
        filtered.sort(key=lambda entry: (-(entry.size or 0), entry.id))
        rows = [asdict(entry) for entry in filtered[offset : offset + limit]]
        if not administrator:
            for row in rows:
                row["token"] = ""
        return Response(
            {
                "items": rows,
                "total": len(filtered),
                "bytes": total_size,
                "states": sorted({entry.status for entry in entries}),
                "administrator": administrator,
            },
            headers=CACHE_HEADERS,
        )
    except (
        signing.BadSignature,
        ValueError,
        ObjectDoesNotExist,
        TimeoutError,
        RuntimeError,
    ):
        return Response(
            {
                "detail": "Bestand geändert, gesperrt oder Anfrage ungültig. Bitte aktualisieren."
            },
            status=409,
            headers=CACHE_HEADERS,
        )
    except OSError as exc:
        logger.warning(
            '{"event":"storage_monitor_unavailable","error_type":"%s"}',
            type(exc).__name__,
        )
        return Response(
            {
                "detail": "Speicherinventar oder Löschung nicht vollständig verfügbar. Bitte aktualisieren."
            },
            status=503,
            headers=CACHE_HEADERS,
        )
