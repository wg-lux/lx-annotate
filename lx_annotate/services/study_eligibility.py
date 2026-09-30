"""Resolve study requirements against explicitly versioned local terminology."""

from __future__ import annotations

from typing import assert_never

from django.db.models import (
    Case,
    Exists,
    F,
    IntegerField,
    OuterRef,
    Q,
    QuerySet,
    Value,
    When,
)
from django.db.models.functions import ExtractDay, ExtractMonth, ExtractYear
from endoreg_db.models import PatientExamination, PatientFinding
from lx_dtypes.models.contracts.study_metadata import StudyMetadata
from lx_dtypes.terminology.terminology_loader import load_module_kb
from lx_dtypes.terminology.terminology_service import TerminologyError


def validate_study_terminology(metadata: StudyMetadata) -> None:
    try:
        packages = {
            (requirement.module, requirement.version): load_module_kb(
                requirement.module, version=requirement.version
            )
            for requirement in metadata.terminology_requirements
        }
        for criterion in metadata.inclusion_criteria:
            for concept in criterion.concepts:
                package = packages[(concept.module, concept.version)]
                match concept.kind:
                    case "examination":
                        package.get_examination(concept.name)
                    case "finding":
                        package.get_finding(concept.name)
                    case unreachable:
                        assert_never(unreachable)
    except (TerminologyError, KeyError) as error:
        raise ValueError(
            f"Unresolved study terminology requirement: {error}"
        ) from error


def apply_study_eligibility(
    cases: QuerySet[PatientExamination], metadata: StudyMetadata
) -> QuerySet[PatientExamination]:
    """AND criteria, OR alternatives, and inclusive completed-year age ranges.

    Filtering happens before preview limits and aggregation. Missing version or
    birth/examination dates cannot satisfy a constrained criterion.
    """
    if metadata.participating_centers:
        cases = cases.filter(
            patient__center__center_key__in=[
                center.center_key for center in metadata.participating_centers
            ]
        )
    if metadata.age_groups:
        cases = (
            cases.filter(
                date_start__isnull=False,
                patient__dob__isnull=False,
                date_start__gte=F("patient__dob"),
            )
            .alias(
                study_start_month=ExtractMonth("date_start"),
                study_birth_month=ExtractMonth("patient__dob"),
                study_start_day=ExtractDay("date_start"),
                study_birth_day=ExtractDay("patient__dob"),
            )
            .alias(
                study_age=ExtractYear("date_start")
                - ExtractYear("patient__dob")
                - Case(
                    When(
                        Q(study_start_month__lt=F("study_birth_month"))
                        | (
                            Q(study_start_month=F("study_birth_month"))
                            & Q(study_start_day__lt=F("study_birth_day"))
                        ),
                        then=Value(1),
                    ),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            )
        )
        age_match = Q(pk__in=[])
        for group in metadata.age_groups:
            bounds = Q(study_age__gte=group.minimum_age)
            if group.maximum_age is not None:
                bounds &= Q(study_age__lte=group.maximum_age)
            age_match |= bounds
        cases = cases.filter(age_match)
    for criterion in metadata.inclusion_criteria:
        alternatives = Q(pk__in=[])
        for concept in criterion.concepts:
            identity = Q(
                knowledge_base_module=concept.module,
                knowledge_base_version=concept.version,
            )
            match concept.kind:
                case "examination":
                    evidence = Q(examination__name=concept.name)
                case "finding":
                    evidence = Q(
                        Exists(
                            PatientFinding.objects.filter(
                                patient_examination_id=OuterRef("pk"),
                                finding__name=concept.name,
                                is_active=True,
                            )
                        )
                    )
                case unreachable:
                    assert_never(unreachable)
            alternatives |= identity & evidence
        cases = cases.filter(alternatives)
    return cases
