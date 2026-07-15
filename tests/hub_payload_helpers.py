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
