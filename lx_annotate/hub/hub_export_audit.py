from __future__ import annotations

import hashlib
import logging
from typing import Any

from endoreg_db.utils.structured_logging import emit_structured_event


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
        body.setdefault("retry_count", int(outbound_job.retry_count or 0))
        body.setdefault("attempt_number", int(outbound_job.retry_count or 0) + 1)
        failure_class = str(getattr(outbound_job, "failure_class", "") or "")
        if failure_class:
            body.setdefault("failure_class", failure_class)
        body.setdefault(
            "remote_transfer_id",
            str(outbound_job.remote_transfer_id or "") or None,
        )
        body.setdefault(
            "remote_transfer_status",
            str(outbound_job.remote_transfer_status or "") or None,
        )
        body.setdefault(
            "remote_processing_decision",
            str(outbound_job.remote_processing_decision or "") or None,
        )
        body.setdefault("local_cleanup_policy", str(outbound_job.local_cleanup_policy))
        body.setdefault("local_cleanup_status", str(outbound_job.local_cleanup_status))
        body.setdefault("marked_by", _request_user_repr(outbound_job.marked_by))
        marked_at = getattr(outbound_job, "marked_at", None)
        body.setdefault(
            "marked_at",
            marked_at.isoformat() if marked_at is not None else None,
        )
        source_center = getattr(outbound_job, "source_center", None)
        body.setdefault(
            "source_center_key",
            getattr(source_center, "center_key", None),
        )
        body.setdefault("resource_kind", str(outbound_job.resource_kind))
        resource_hash = ""
        if outbound_job.video_file_id is not None:
            body.setdefault("resource_id", int(outbound_job.video_file_id))
            resource_hash = str(outbound_job.video_file.video_hash or "")
        if outbound_job.raw_pdf_file_id is not None:
            body.setdefault("resource_id", int(outbound_job.raw_pdf_file_id))
            resource_hash = str(outbound_job.raw_pdf_file.pdf_hash or "")
        if resource_hash:
            body.setdefault(
                "resource_hash_sha256",
                hashlib.sha256(resource_hash.encode("utf-8")).hexdigest(),
            )
    if "request_user" in body:
        body["request_user"] = _request_user_repr(body["request_user"])
    event_name = str(body.pop("event"))
    try:
        emit_structured_event(logger, event_name, **body)
    except Exception:
        logger.exception("Failed to emit hub export audit event %s", event_name)
