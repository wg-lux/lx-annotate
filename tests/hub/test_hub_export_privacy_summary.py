from __future__ import annotations

from datetime import date
from types import SimpleNamespace
from typing import Any

from lx_annotate.hub.hub_export_jobs import (
    HubExportPrivacyRecord,
    build_hub_export_privacy_summary,
)


def _sensitive_meta(
    *,
    examination_hash: str | None,
    examination_date: date | None,
    pseudo_dob: date | None = None,
    patient_dob: date | None = None,
    gender_name: str | None = "female",
) -> SimpleNamespace:
    pseudo_patient = SimpleNamespace(
        dob=pseudo_dob,
        gender=SimpleNamespace(name=gender_name) if gender_name else None,
    )
    return SimpleNamespace(
        examination_hash=examination_hash,
        examination_date=examination_date,
        patient_dob=patient_dob,
        pseudo_patient=pseudo_patient,
    )


def _record(
    resource_id: int,
    *,
    sensitive_meta: Any | None,
    resource_kind: str = "report",
    source_center_key: str | None = "center-a",
    eligible: bool = True,
    marked_for_upload: bool = False,
) -> HubExportPrivacyRecord:
    return {
        "resource_kind": resource_kind,
        "resource_id": resource_id,
        "source_center_key": source_center_key,
        "eligible": eligible,
        "marked_for_upload": marked_for_upload,
        "sensitive_meta": sensitive_meta,
    }


def test_hub_export_privacy_summary_warns_for_small_equivalence_class():
    records = [
        _record(
            index,
            sensitive_meta=_sensitive_meta(
                examination_hash=f"case-{index}",
                examination_date=date(2025, 1, 15),
                pseudo_dob=date(1975, 5, 1),
                gender_name="female",
            ),
        )
        for index in range(1, 4)
    ]

    summary = build_hub_export_privacy_summary(records, min_k=5)

    assert summary["passes_k_anonymity"] is False
    assert summary["status"] == "warning"
    assert summary["eligible_resource_count"] == 3
    assert summary["eligible_case_count"] == 3
    assert summary["smallest_equivalence_class_size"] == 3
    assert summary["violating_equivalence_class_count"] == 1


def test_hub_export_privacy_summary_passes_when_all_classes_reach_min_k():
    records = []
    for group_index, gender_name in enumerate(("female", "male"), start=1):
        for case_index in range(1, 6):
            resource_id = group_index * 100 + case_index
            records.append(
                _record(
                    resource_id,
                    sensitive_meta=_sensitive_meta(
                        examination_hash=f"case-{resource_id}",
                        examination_date=date(2025, 1, 15),
                        pseudo_dob=date(1975, 5, 1),
                        gender_name=gender_name,
                    ),
                )
            )

    summary = build_hub_export_privacy_summary(records, min_k=5)

    assert summary["passes_k_anonymity"] is True
    assert summary["status"] == "pass"
    assert summary["eligible_case_count"] == 10
    assert summary["smallest_equivalence_class_size"] == 5
    assert summary["violating_equivalence_class_count"] == 0


def test_hub_export_privacy_summary_counts_missing_quasi_identifiers_as_unknown():
    records = [
        _record(
            1,
            sensitive_meta=_sensitive_meta(
                examination_hash="case-1",
                examination_date=None,
                pseudo_dob=None,
                patient_dob=None,
                gender_name=None,
            ),
        ),
        _record(2, sensitive_meta=None),
        _record(
            3,
            sensitive_meta=_sensitive_meta(
                examination_hash=None,
                examination_date=None,
                pseudo_dob=None,
                patient_dob=None,
                gender_name=None,
            ),
            eligible=False,
            marked_for_upload=True,
        ),
        _record(4, sensitive_meta=None, eligible=False, marked_for_upload=False),
    ]

    summary = build_hub_export_privacy_summary(records, min_k=5)

    assert summary["eligible_resource_count"] == 2
    assert summary["marked_resource_count"] == 1
    assert summary["eligible_case_count"] == 3
    assert summary["smallest_equivalence_class_size"] == 3
    assert summary["violating_equivalence_class_count"] == 1
