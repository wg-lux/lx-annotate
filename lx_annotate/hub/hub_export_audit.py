from __future__ import annotations

import json
import logging
from typing import Any


logger = logging.getLogger("lx_annotate.hub_export.audit")


def _request_user_repr(user: Any) -> str | None:
    if user is None:
        return None
    if not getattr(user, "is_authenticated", False):
        return None
    username = str(getattr(user, "username", "") or "").strip()
    if username:
        return username
    user_id = getattr(user, "pk", None)
    if user_id is None:
        return None
    return str(user_id)


def emit_hub_export_audit_event(event: str, **payload: Any) -> None:
    body: dict[str, Any] = {"event": event, **payload}
    outbound_job = body.pop("outbound_job", None)
    if outbound_job is not None:
        body.setdefault("outbound_job_id", str(outbound_job.pk))
        body.setdefault("transfer_key", str(outbound_job.transfer_key))
        body.setdefault("local_status", str(outbound_job.local_status))
        body.setdefault("target_node_key", str(outbound_job.target_node.node_key))
        source_center = getattr(outbound_job, "source_center", None)
        body.setdefault(
            "source_center_key",
            getattr(source_center, "center_key", None),
        )
        body.setdefault("resource_kind", str(outbound_job.resource_kind))
        if outbound_job.video_file_id is not None:
            body.setdefault("resource_id", int(outbound_job.video_file_id))
        if outbound_job.raw_pdf_file_id is not None:
            body.setdefault("resource_id", int(outbound_job.raw_pdf_file_id))
    if "request_user" in body:
        body["request_user"] = _request_user_repr(body["request_user"])
    try:
        logger.info(json.dumps(body, default=str, sort_keys=True))
    except Exception:
        logger.exception("Failed to emit hub export audit event %s", event)
