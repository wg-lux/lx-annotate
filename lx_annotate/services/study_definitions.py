"""Portable, patient-free study documents in the host configuration boundary."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

import yaml
from django.conf import settings
from endoreg_db.models.other.study_cohort import StudyCohort
from endoreg_db.utils.file_operations import atomic_write_file, ensure_directory
from lx_dtypes.models.contracts.study_setup import (
    StudyCohortDefinition,
    StudyDatasetDefinition,
    StudySetupDefinition,
)
from lx_dtypes.utils.study_setup_yaml import parse_study_setup_yaml


def study_document(cohort: StudyCohort) -> StudySetupDefinition:
    datasets = list(cohort.datasets.order_by("pk"))
    return StudySetupDefinition(
        schema_version="1.0",
        definition_id=f"study_{cohort.definition_uuid.hex}",
        definition_version="1.0.0",
        datasets=[
            StudyDatasetDefinition.model_validate(
                {
                    "definition_id": f"dataset_{dataset.pk}",
                    "name": dataset.name,
                    "description": dataset.description or "",
                    "dataset_type": dataset.dataset_type,
                    "ai_model_type": dataset.ai_model_type,
                    "is_active": dataset.is_active,
                }
            )
            for dataset in datasets
        ],
        cohorts=[
            StudyCohortDefinition.model_validate(
                {
                    "definition_id": f"cohort_{cohort.pk}",
                    "name": cohort.name,
                    "hypothesis": cohort.hypothesis,
                    "filters": cohort.filters,
                    "study_metadata": cohort.study_metadata,
                    "dataset_refs": [f"dataset_{dataset.pk}" for dataset in datasets],
                }
            )
        ],
    )


def persist_study_definition(cohort: StudyCohort) -> bytes:
    """Validate before publishing an immutable content-addressed configuration file.

    The database remains authoritative. A rolled-back database transaction can
    leave an unreferenced configuration revision, never patient membership data.
    """
    document = study_document(cohort)
    if cohort.definition_snapshot:
        previous = StudySetupDefinition.model_validate(cohort.definition_snapshot)
        document.definition_version = previous.definition_version
        if document != previous:
            major, minor, patch = previous.definition_version.split(".")
            document.definition_version = f"{major}.{minor}.{int(patch) + 1}"
    content = publish_document(cohort, document)
    cohort.definition_snapshot = document.model_dump(mode="json")
    cohort.save(update_fields=["definition_snapshot"])
    return content


def publish_document(cohort: StudyCohort, document: StudySetupDefinition) -> bytes:
    raw = yaml.safe_dump(document.model_dump(mode="json"), sort_keys=False)
    parse_study_setup_yaml(raw)
    content = raw.encode("utf-8")
    root = Path(settings.CONFIG_ROOT).resolve()
    terminology = Path(settings.TERMINOLOGY_ROOT).resolve()
    if not Path(settings.CONFIG_ROOT).is_absolute() or root.is_relative_to(terminology):
        raise ValueError("CONFIG_ROOT must be absolute and outside TERMINOLOGY_ROOT")
    destination = root / "studies" / str(cohort.created_by_id) / str(cohort.pk)
    resolved = destination.resolve()
    if not resolved.is_relative_to(root) or resolved.is_relative_to(terminology):
        raise ValueError("Study definition directory escapes CONFIG_ROOT")
    for directory in (root, root / "studies", destination.parent, destination):
        ensure_directory(directory, dir_mode=0o700)
    atomic_write_file(
        destination=destination / f"{sha256(content).hexdigest()}.yml",
        content=[content],
        file_mode=0o600,
        dir_mode=0o700,
    )
    return content


def download_study_definition(cohort: StudyCohort) -> bytes:
    if not cohort.definition_snapshot:
        # Existing cohorts acquire their first portable snapshot on explicit download.
        return persist_study_definition(cohort)
    return publish_document(
        cohort, StudySetupDefinition.model_validate(cohort.definition_snapshot)
    )
