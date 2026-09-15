from __future__ import annotations

import hashlib
from datetime import date, datetime, timezone
from typing import Any

from endoreg_db.models import Center, RawPdfFile, SensitiveMeta
from endoreg_db.services.raw_pdf_files import (
    verify_and_persist_processed_report_sha256,
)


def create_hub_sensitive_meta(
    *,
    center: Center,
    first_name: str = "Test",
    last_name: str = "Patient",
) -> SensitiveMeta:
    return SensitiveMeta.objects.create(
        center=center,
        patient_first_name=first_name,
        patient_last_name=last_name,
        patient_dob=datetime(1980, 1, 1, tzinfo=timezone.utc),
        examination_date=date(2024, 1, 2),
    )


def verify_hub_report_artifact(report: RawPdfFile) -> str:
    """Verify a test report through the production processed-artifact boundary."""
    return verify_and_persist_processed_report_sha256(report)


def hub_transfer_status_payload(
    *,
    job: Any,
    source_node_key: str,
    remote_transfer_id: str,
    transfer_status: str,
    processing_decision: str,
) -> dict[str, str]:
    if str(job.resource_kind) == "video":
        resource_hash = str(job.video_file.video_hash)
        processed_media_hash = str(job.video_file.processed_video_hash)
    else:
        resource_hash = str(job.raw_pdf_file.pdf_hash)
        processed_media_hash = str(job.raw_pdf_file.state.processed_file_sha256)
    return {
        "id": remote_transfer_id,
        "transfer_key": str(job.transfer_key),
        "source_node_key": source_node_key,
        "target_node_key": str(job.target_node.node_key),
        "source_center_key": str(job.source_center.center_key),
        "resource_kind": str(job.resource_kind),
        "resource_hash": resource_hash,
        "processed_media_hash": processed_media_hash,
        "transfer_mode": str(job.transfer_mode),
        "transfer_status": transfer_status,
        "processing_decision": processing_decision,
        "payload_schema_version": "3.0",
        "status_detail": "",
    }


def valid_report_resource_rows(*, pdf_hash: str = "hash-1") -> dict[str, Any]:
    processed_file_sha256 = hashlib.sha256(f"processed:{pdf_hash}".encode()).hexdigest()
    return {
        "raw_pdf_file": {
            "pdf_hash": pdf_hash,
            "anonymized_text": "Anonymized report text",
        },
        "sensitive_meta": {
            "patient_hash": hashlib.sha256(b"test-patient").hexdigest(),
            "examination_hash": hashlib.sha256(
                b"test-examination:2024-01-02"
            ).hexdigest(),
        },
        "raw_pdf_state": {
            "processing_started": True,
            "text_meta_extracted": True,
            "sensitive_meta_processed": True,
            "anonymized": True,
            "anonymization_validated": True,
            "processed_file_sha256": processed_file_sha256,
        },
        "processing_history": {
            "file_hash": pdf_hash,
            "success": True,
        },
    }
