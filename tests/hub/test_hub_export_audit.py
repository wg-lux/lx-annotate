from __future__ import annotations

import hashlib
import logging
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import cast

import pytest

from endoreg_db.utils.structured_logging import hash_identifier
from lx_annotate.hub.hub_export_audit import emit_hub_export_audit_event


def test_hub_export_audit_event_contains_safe_end_to_end_correlation(
    caplog: pytest.LogCaptureFixture,
) -> None:
    resource_hash = "canonical-report-hash"
    sensitive_error = "/protected/clinical/report.pdf"
    outbound_job = SimpleNamespace(
        pk="local-job-id",
        transfer_key="site-node__report__canonical-report-hash__processed_v1",
        local_status="completed",
        failure_class="integrity_inconsistency",
        target_node=SimpleNamespace(node_key="hub-node"),
        retry_count=1,
        remote_transfer_id="remote-transfer-id",
        remote_transfer_status="applied",
        remote_processing_decision="skip_processing_preserved_state",
        local_cleanup_policy="eligible_after_verified_apply",
        local_cleanup_status="eligible",
        marked_by=SimpleNamespace(
            is_authenticated=True,
            username="operator-a",
            pk=17,
        ),
        marked_at=datetime(2026, 8, 3, 10, 30, tzinfo=UTC),
        source_center=SimpleNamespace(center_key="site-center"),
        resource_kind="report",
        video_file_id=None,
        raw_pdf_file_id=23,
        raw_pdf_file=SimpleNamespace(
            pdf_hash=resource_hash,
            text="raw clinical text must never be logged",
        ),
    )

    with caplog.at_level(logging.INFO, logger="lx_annotate.hub_export.audit"):
        emit_hub_export_audit_event(
            "hub_export.completed",
            outbound_job=outbound_job,
            source_node_key="site-node",
            acknowledgement="verified_apply",
            error=sensitive_error,
        )

    event = cast(dict[str, object], getattr(caplog.records[-1], "structured_event"))
    assert event == {
        "acknowledgement": "verified_apply",
        "attempt_number": 2,
        "event": "hub_export.completed",
        "error": f"<redacted:path_like:sha256={hash_identifier(sensitive_error)}>",
        "failure_class": "integrity_inconsistency",
        "local_cleanup_policy": "eligible_after_verified_apply",
        "local_cleanup_status": "eligible",
        "local_status": "completed",
        "marked_at": "2026-08-03T10:30:00+00:00",
        "marked_by": "operator-a",
        "outbound_job_id": "local-job-id",
        "remote_processing_decision": "skip_processing_preserved_state",
        "remote_transfer_id": "remote-transfer-id",
        "remote_transfer_status": "applied",
        "resource_hash_sha256": hashlib.sha256(
            resource_hash.encode("utf-8")
        ).hexdigest(),
        "resource_id": 23,
        "resource_kind": "report",
        "retry_count": 1,
        "source_center_key": "site-center",
        "source_node_key": "site-node",
        "target_node_key": "hub-node",
        "transfer_key": "site-node__report__canonical-report-hash__processed_v1",
    }
    assert "raw clinical text" not in caplog.text
    assert sensitive_error not in caplog.text
