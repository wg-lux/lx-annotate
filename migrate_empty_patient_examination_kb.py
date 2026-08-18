"""Safely rebind one empty PatientExamination to an installed knowledge base.

Run inside Django's shell, for example:

    LX_PE_ID=169 \
    LX_EXPECTED_KB=report_template_examples@0.1.1 \
    LX_TARGET_KB=mst_3_0@3.0.0 \
    lx-annotate-manage shell < migrate_empty_patient_examination_kb.py

The script refuses to modify an examination with structured reporting content.
It has no force mode by design.
"""

from __future__ import annotations

import json
import os
from django.db import transaction
from lx_dtypes.models.interface.KnowledgeBaseResolver import (
    load_knowledge_base,
    load_module_config,
)

from endoreg_db.models.medical.patient.patient_examination import PatientExamination


def _required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _parse_identity(value: str, *, variable: str) -> tuple[str, str]:
    module_name, separator, version = value.partition("@")
    module_name = module_name.strip()
    version = version.strip()
    if separator != "@" or not module_name or not version:
        raise RuntimeError(
            f"{variable} must have the form <module>@<version>; got {value!r}"
        )
    return module_name, version


def _relation_has_rows(instance: PatientExamination, relation_name: str) -> bool:
    manager = getattr(instance, relation_name, None)
    if manager is None:
        return False
    exists = getattr(manager, "exists", None)
    if not callable(exists):
        raise RuntimeError(
            f"PatientExamination.{relation_name} is not a related manager"
        )
    return bool(exists())


patient_examination_id = int(_required_env("LX_PE_ID"))
expected_module, expected_version = _parse_identity(
    _required_env("LX_EXPECTED_KB"),
    variable="LX_EXPECTED_KB",
)
target_module, target_version = _parse_identity(
    _required_env("LX_TARGET_KB"),
    variable="LX_TARGET_KB",
)

# Resolve the exact installed/registered target before opening the write transaction.
target_config = load_module_config(target_module, version=target_version)
if (target_config.name, target_config.version) != (target_module, target_version):
    raise RuntimeError(
        "Resolved target identity differs from the requested identity: "
        f"{target_config.name}@{target_config.version}"
    )
load_knowledge_base(target_module, version=target_version)

with transaction.atomic():
    examination = PatientExamination.objects.select_for_update().get(
        pk=patient_examination_id
    )

    current_identity = (
        examination.knowledge_base_module.strip(),
        examination.knowledge_base_version.strip(),
    )
    expected_identity = (expected_module, expected_version)
    if current_identity != expected_identity:
        raise RuntimeError(
            "Refusing stale or repeated migration: "
            f"expected {expected_module}@{expected_version}, "
            f"found {current_identity[0]}@{current_identity[1]}"
        )

    blockers: dict[str, bool] = {
        "report_draft": bool(examination.report_draft),
        "draft_updated_at": examination.draft_updated_at is not None,
        "dtypes_record": bool(examination.dtypes_record),
        "dtypes_record_updated_at": examination.dtypes_record_updated_at is not None,
        "patient_findings": _relation_has_rows(examination, "patient_findings"),
        "indications": _relation_has_rows(examination, "indications"),
        "reports": _relation_has_rows(examination, "reports"),
    }
    populated = sorted(name for name, present in blockers.items() if present)
    if populated:
        raise RuntimeError(
            "Refusing knowledge-base migration because structured reporting "
            "state exists in: " + ", ".join(populated)
        )

    examination.knowledge_base_module = target_module
    examination.knowledge_base_version = target_version
    examination.save(
        update_fields=[
            "knowledge_base_module",
            "knowledge_base_version",
        ]
    )

print(
    json.dumps(
        {
            "event": "patient_examination.knowledge_base_rebound",
            "status": "ok",
            "patient_examination_id": patient_examination_id,
            "previous": {
                "module_name": expected_module,
                "version": expected_version,
            },
            "current": {
                "module_name": target_module,
                "version": target_version,
            },
        },
        sort_keys=True,
    )
)
