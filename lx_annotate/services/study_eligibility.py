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
from lx_dtypes.models.contracts.dtypes_record_persistence import (
    DtypesRecordPersistencePayload,
)
from lx_dtypes.models.contracts.study_metadata import StudyMetadata
from lx_dtypes.models.ledger.p_examination import PExamination
from lx_dtypes.packages import PackageValidationError, load_registered_package
from lx_dtypes.stats import evaluate_study_dataset, validate_study_analysis
from lx_dtypes.stats.study_linkage import assemble_coloreg_analysis_units
from lx_dtypes.terminology.terminology_service import TerminologyError


def validate_study_terminology(metadata: StudyMetadata) -> None:
    try:
        packages = {
            (requirement.module, requirement.version): load_registered_package(
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
        for definition in metadata.analysis_definitions:
            validate_study_analysis(
                definition, packages[(definition.module, definition.version)]
            )
    except PackageValidationError as error:
        raise ValueError("Study terminology package validation failed") from error
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


def evaluate_study_records(
    cases: QuerySet[PatientExamination], metadata: StudyMetadata
) -> dict[str, object]:
    """Read canonical persisted ledgers; evaluation never accepts browser records."""
    if not metadata.analysis_definitions:
        raise ValueError("No study analysis definitions are configured.")
    records: list[PExamination] = []
    missing = 0
    for case in cases.select_related("examination").order_by("pk").iterator():
        if not case.dtypes_record:
            missing += 1
            continue
        payload = DtypesRecordPersistencePayload.model_validate(case.dtypes_record)
        if (
            case.examination is None
            or payload.patient != str(case.patient_id)
            or payload.examination != case.examination.name
            or payload.knowledge_base_module != case.knowledge_base_module
            or payload.knowledge_base_version != case.knowledge_base_version
        ):
            raise ValueError("Persisted study record does not match its examination.")
        records.append(PExamination.model_validate(payload.model_dump(mode="python")))
    analyses: list[dict[str, object]] = []
    skipped: list[dict[str, object]] = []
    evaluated_records: set[str] = set()
    for definition in metadata.analysis_definitions:
        if definition.status == "draft":
            skipped.append(
                {
                    "analysis_name": definition.name,
                    "reason": "draft",
                    "unresolved_requirements": definition.unresolved_requirements,
                }
            )
            continue
        package_records = [
            record
            for record in records
            if (record.knowledge_base_module, record.knowledge_base_version)
            == (definition.module, definition.version)
        ]
        knowledge_base = load_registered_package(
            definition.module, version=definition.version
        )
        units = (
            assemble_coloreg_analysis_units(package_records)
            if definition.module == "coloreg"
            and definition.unit_finding == "coloreg_polyp_resection"
            else None
        )
        statistics = evaluate_study_dataset(
            definition, package_records, knowledge_base, units=units
        )
        evaluated_records.update(str(record.uuid) for record in package_records)
        analyses.append(
            {
                **statistics.model_dump(mode="json"),
                "package_mismatch_record_count": len(records) - len(package_records),
            }
        )
    return {
        "dataset_examination_count": len(records) + missing,
        "evaluated_examination_count": len(evaluated_records),
        "missing_record_count": missing,
        "analyses": analyses,
        "skipped_analyses": skipped,
    }
