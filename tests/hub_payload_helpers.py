from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from endoreg_db.models import Center, SensitiveMeta


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


def valid_report_resource_rows(*, pdf_hash: str = "hash-1") -> dict[str, Any]:
    return {
        "raw_pdf_file": {
            "pdf_hash": pdf_hash,
            "text": "Anonymized report text",
        },
        "sensitive_meta": {
            "patient_first_name": "Test",
            "patient_last_name": "Patient",
            "patient_dob": "1980-01-01",
            "examination_date": "2024-01-02",
        },
        "raw_pdf_state": {
            "processing_started": True,
            "text_meta_extracted": True,
            "sensitive_meta_processed": True,
        },
        "processing_history": {
            "file_hash": pdf_hash,
            "success": True,
        },
    }
