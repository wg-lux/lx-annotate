"""Authorized, atomic provisioning of patient-free study setup definitions."""

from __future__ import annotations

import logging
from typing import cast

from django.contrib.auth.models import User
from django.db import transaction
from endoreg_db.authz.policy import satisfies
from endoreg_db.models.administration.center.center import Center
from endoreg_db.models.aidataset.aidataset import AIDataSet
from endoreg_db.models.other.study import Study
from endoreg_db.models.other.study_cohort import StudyCohort
from endoreg_db.models.other.study_setup_import import StudySetupImport
from endoreg_db.services.centers.access import resolve_allowed_center_ids
from lx_dtypes.models.contracts.json_types import JsonObject
from lx_dtypes.models.contracts.study_setup import (
    StudySetupImportReceipt,
    StudySetupImportResult,
)
from lx_dtypes.utils.study_setup_yaml import parse_study_setup_yaml
from rest_framework.exceptions import PermissionDenied

from lx_annotate.services.dataset_lifecycle import require_dataset_access
from lx_annotate.services.study_definitions import study_document
from lx_annotate.services.study_eligibility import validate_study_terminology

logger = logging.getLogger(__name__)


class StudySetupConflict(ValueError):
    """An immutable import identity cannot be reused or its receipt is unavailable."""


def _require_import_actor(actor: User) -> None:
    if (
        not actor.is_authenticated
        or not actor.is_active
        or not (
            actor.is_superuser
            or satisfies(
                set(actor.groups.values_list("name", flat=True)), "patient:write"
            )
        )
    ):
        raise PermissionDenied("Study definition import requires patient:write")


def import_study_setup(
    raw: str, *, actor: User, dry_run: bool = True
) -> StudySetupImportResult:
    _require_import_actor(actor)
    definition = parse_study_setup_yaml(raw)
    digest = definition.content_sha256
    with transaction.atomic():
        # Serialize first imports too; uniqueness remains the database backstop.
        actor = User.objects.select_for_update().get(pk=actor.pk)
        _require_import_actor(actor)
        allowed = resolve_allowed_center_ids(actor)
        if allowed == frozenset():
            raise PermissionDenied(
                "Study definition import requires an authorized center"
            )

        for cohort in definition.cohorts:
            validate_study_terminology(cohort.study_metadata)
            keys = {
                center.center_key
                for center in cohort.study_metadata.participating_centers
            }
            if cohort.filters.center_key:
                keys.add(cohort.filters.center_key)
            visible = Center.objects.filter(center_key__in=keys)
            if allowed is not None:
                visible = visible.filter(pk__in=allowed)
            if set(visible.values_list("center_key", flat=True)) != keys:
                raise PermissionDenied("Study references an unavailable center")
        existing = StudySetupImport.objects.filter(
            owner=actor,
            definition_id=definition.definition_id,
            definition_version=definition.definition_version,
        ).first()
        result = StudySetupImportResult(
            status="planned",
            definition_id=definition.definition_id,
            definition_version=definition.definition_version,
            content_sha256=digest,
            datasets={item.definition_id: None for item in definition.datasets},
            cohorts={item.definition_id: None for item in definition.cohorts},
            links={
                item.definition_id: item.dataset_refs for item in definition.cohorts
            },
        )
        if existing:
            if existing.content_sha256 != digest:
                raise StudySetupConflict(
                    "Study definition identity/version already contains different content"
                )
            receipt = existing.validated_receipt()
            for identifier in receipt.datasets.values():
                dataset = AIDataSet.objects.filter(pk=identifier, owner=actor).first()
                if dataset is None:
                    raise StudySetupConflict(
                        "An imported dataset was removed; use a new definition version"
                    )
                require_dataset_access(actor, dataset)
            if StudyCohort.objects.filter(
                pk__in=receipt.cohorts.values(), created_by=actor
            ).count() != len(receipt.cohorts):
                raise StudySetupConflict(
                    "An imported cohort was removed; use a new definition version"
                )
            # Current links may differ from the immutable imported document.
            for dataset in AIDataSet.objects.filter(
                study_cohorts__pk__in=receipt.cohorts.values()
            ).distinct():
                require_dataset_access(actor, dataset)
            result.status = "unchanged"
            result.datasets = dict(receipt.datasets)
            result.cohorts = dict(receipt.cohorts)
            return result
        if dry_run:
            return result
        datasets: dict[str, AIDataSet] = {}
        for item in definition.datasets:
            dataset = AIDataSet(
                owner=actor, **item.model_dump(exclude={"definition_id"})
            )
            dataset.full_clean()
            dataset.save()
            datasets[item.definition_id] = dataset
        study = (
            Study.objects.create(created_by=actor, name=definition.definition_id)
            if definition.cohorts
            else None
        )
        cohort_ids: dict[str, int] = {}
        for item in definition.cohorts:
            cohort = StudyCohort.objects.create(
                created_by=actor,
                study=study,
                name=item.name,
                hypothesis=item.hypothesis,
                filters=item.filters.model_dump(mode="json"),
                study_metadata=item.study_metadata.model_dump(mode="json"),
            )
            cohort.datasets.set(
                [datasets[reference] for reference in item.dataset_refs]
            )
            # A cohort download represents this cohort, while the receipt retains
            # the complete original multi-cohort document and identity mapping.
            cohort.definition_snapshot = study_document(cohort).model_dump(mode="json")
            cohort.save(update_fields=["definition_snapshot"])
            cohort_ids[item.definition_id] = int(cohort.pk)
        receipt = StudySetupImportReceipt(
            definition=definition,
            datasets={key: int(row.pk) for key, row in datasets.items()},
            cohorts=cohort_ids,
        )
        StudySetupImport.objects.create(
            owner=actor,
            definition_id=definition.definition_id,
            definition_version=definition.definition_version,
            content_sha256=digest,
            payload=cast(JsonObject, receipt.model_dump(mode="json")),
        )
        result.status = "created"
        result.datasets = dict(receipt.datasets)
        result.cohorts = dict(receipt.cohorts)
        transaction.on_commit(
            lambda: logger.info(
                "study_setup_import_committed owner_id=%s definition_id=%s version=%s digest=%s",
                actor.pk,
                definition.definition_id,
                definition.definition_version,
                digest,
            )
        )
        return result
