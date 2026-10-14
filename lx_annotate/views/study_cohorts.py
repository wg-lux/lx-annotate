"""Saved cohorts and bidirectional dataset links with explicit, scoped previews."""

from __future__ import annotations

from django.db import transaction
from django.db.models import F, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from endoreg_db.models import AIDataSet, PatientExamination, VideoFile
from endoreg_db.models.other.study import Study
from endoreg_db.models.other.study_cohort import StudyCohort
from endoreg_db.services.centers.access import resolve_allowed_center_ids
from endoreg_db.services.studies.cohort import (
    build_study_cohort_payload,
    parse_study_cohort_filters,
)
from endoreg_db.views.media.table_mappings import TableImportPermission
from lx_dtypes.models.contracts.cohort_definition import CohortPreviewDefinition
from pydantic import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.schemas.study_cohorts import (
    CohortDatasetLink,
    CohortDefinition,
)
from lx_annotate.services.dataset_lifecycle import (
    dataset_video_ids,
    require_dataset_access,
)
from lx_annotate.services.study_definitions import (
    download_study_definition,
    persist_study_definition,
)
from lx_annotate.services.study_eligibility import (
    apply_study_eligibility,
    validate_study_terminology,
)
from lx_annotate.views.study_export import StudyExportPatientReadPermission


def cohort_response(cohort: StudyCohort) -> dict[str, object]:
    return {
        "id": cohort.pk,
        "study_id": cohort.study_id,
        "name": cohort.name,
        "hypothesis": cohort.hypothesis,
        "filters": cohort.filters,
        "study_metadata": cohort.study_metadata,
        "imported_examination_count": cohort.imported_examinations.count(),
        "dataset_ids": list(
            cohort.datasets.order_by("pk").values_list("pk", flat=True)
        ),
        "updated_at": cohort.updated_at.isoformat(),
    }


def validated_datasets(ids: list[int], user: object) -> list[AIDataSet]:
    datasets = list(AIDataSet.objects.filter(pk__in=ids).order_by("pk"))
    if len(datasets) != len(ids):
        raise ValueError(
            "One or more datasets no longer exist. Reload the dataset list."
        )
    for dataset in datasets:
        require_dataset_access(user, dataset)
    return datasets


def save_definition(request: Request, cohort: StudyCohort | None = None) -> Response:
    actor_id = request.user.pk
    if actor_id is None:
        raise NotAuthenticated()
    try:
        definition = CohortDefinition.model_validate(request.data)
        validate_study_terminology(definition.study_metadata)
        with transaction.atomic():
            list(
                AIDataSet.objects.select_for_update()
                .filter(pk__in=definition.dataset_ids)
                .order_by("pk")
            )
            datasets = validated_datasets(definition.dataset_ids, request.user)
            study_id = definition.study_id
            if cohort is not None and "study_id" not in definition.model_fields_set:
                study_id = cohort.study_id
            study = (
                get_object_or_404(
                    Study.objects.select_for_update(),
                    pk=study_id,
                    created_by_id=actor_id,
                )
                if study_id is not None
                else Study.objects.create(
                    created_by_id=actor_id,
                    name=definition.name,
                    hypothesis=definition.hypothesis,
                )
            )
            if cohort is None:
                cohort = StudyCohort(created_by_id=actor_id)
            else:
                cohort = StudyCohort.objects.select_for_update().get(pk=cohort.pk)
            cohort.name = definition.name
            cohort.study = study
            cohort.hypothesis = definition.hypothesis
            cohort.filters = definition.filters.model_dump(mode="json")
            cohort.study_metadata = definition.study_metadata.model_dump(mode="json")
            cohort.save()
            cohort.datasets.set(datasets)
            persist_study_definition(cohort)
    except (ValidationError, ValueError) as error:
        return Response({"detail": str(error)}, status=400)
    return Response(
        cohort_response(cohort), status=200 if request.method == "PUT" else 201
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def study_cohorts(request: Request) -> Response:
    if request.method == "POST":
        return save_definition(request)
    cohorts = StudyCohort.objects.filter(
        created_by_id=request.user.pk
    ).prefetch_related("datasets")
    return Response([cohort_response(cohort) for cohort in cohorts])


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated, TableImportPermission])
def study_cohort_detail(request: Request, cohort_id: int) -> Response:
    cohort = get_object_or_404(StudyCohort, pk=cohort_id, created_by_id=request.user.pk)
    if request.method == "GET":
        validated_datasets(
            list(cohort.datasets.values_list("pk", flat=True)), request.user
        )
        return Response(cohort_response(cohort))
    if request.method == "DELETE":
        with transaction.atomic():
            cohort = StudyCohort.objects.select_for_update().get(
                pk=cohort.pk, created_by_id=request.user.pk
            )
            cohort.delete()
        return Response(status=204)
    return save_definition(request, cohort)


@api_view(["GET"])
@permission_classes([IsAuthenticated, TableImportPermission])
def study_cohort_definition(request: Request, cohort_id: int) -> HttpResponse:
    with transaction.atomic():
        cohort = get_object_or_404(
            StudyCohort.objects.select_for_update(),
            pk=cohort_id,
            created_by_id=request.user.pk,
        )
        validated_datasets(
            list(cohort.datasets.values_list("pk", flat=True)), request.user
        )
        content = download_study_definition(cohort)
    response = HttpResponse(content, content_type="application/yaml")
    response["Content-Disposition"] = f'attachment; filename="study-{cohort.pk}.yml"'
    response["Cache-Control"] = "private, no-store"
    return response


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def dataset_study_cohorts(request: Request, dataset_id: int) -> Response:
    dataset = get_object_or_404(AIDataSet, pk=dataset_id)
    require_dataset_access(request.user, dataset)
    if request.method == "POST":
        try:
            link = CohortDatasetLink.model_validate(request.data)
        except ValidationError as error:
            return Response({"detail": str(error)}, status=400)
        with transaction.atomic():
            dataset = AIDataSet.objects.select_for_update().get(pk=dataset_id)
            require_dataset_access(request.user, dataset)
            cohort = get_object_or_404(
                StudyCohort.objects.select_for_update(),
                pk=link.cohort_id,
                created_by_id=request.user.pk,
            )
            if link.linked:
                cohort.datasets.add(dataset)
            else:
                cohort.datasets.remove(dataset)
            cohort.save()
            persist_study_definition(cohort)
        return Response(cohort_response(cohort))
    cohorts = StudyCohort.objects.filter(
        created_by_id=request.user.pk, datasets=dataset
    )
    return Response([cohort_response(cohort) for cohort in cohorts])


@api_view(["POST"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_cohort_preview(request: Request) -> Response:
    try:
        definition = CohortPreviewDefinition.model_validate(request.data)
        imported_ids: list[int] = []
        if definition.cohort_id is not None:
            cohort = get_object_or_404(
                StudyCohort, pk=definition.cohort_id, created_by_id=request.user.pk
            )
            definition = CohortPreviewDefinition.model_validate(
                {
                    "cohort_id": cohort.pk,
                    "name": cohort.name,
                    "hypothesis": cohort.hypothesis,
                    "filters": cohort.filters,
                    "study_metadata": cohort.study_metadata,
                    "dataset_ids": list(cohort.datasets.values_list("pk", flat=True)),
                }
            )
            imported_ids = list(
                cohort.imported_examinations.values_list("pk", flat=True)
            )
        validate_study_terminology(definition.study_metadata)
        datasets = validated_datasets(definition.dataset_ids, request.user)
    except (ValidationError, ValueError) as error:
        return Response({"detail": str(error)}, status=400)
    cases = PatientExamination.objects.all()
    allowed = resolve_allowed_center_ids(request.user)
    if allowed is not None:
        cases = cases.filter(patient__center_id__in=allowed)
    missing_examination_count = 0
    conflicting_patient_count = 0
    dataset_video_count = 0
    if datasets:
        video_ids = set()
        for dataset in datasets:
            imported_ids.extend(dataset.examinations.values_list("pk", flat=True))
            video_ids.update(dataset_video_ids(dataset))
        videos = VideoFile.objects.filter(pk__in=video_ids)
        dataset_video_count = videos.count()
        missing_examination_count = videos.filter(examination__isnull=True).count()
        conflicting = videos.filter(
            patient__isnull=False, examination__isnull=False
        ).exclude(patient_id=F("examination__patient_id"))
        conflicting_patient_count = conflicting.count()
        videos = videos.exclude(pk__in=conflicting.values("pk"))
        cases = cases.filter(
            Q(pk__in=videos.values("examination_id")) | Q(pk__in=imported_ids)
        )
    elif imported_ids:
        cases = cases.filter(pk__in=imported_ids)
    candidate_count = cases.count()
    pseudonymous = cases.filter(patient__is_real_person=False).exclude(
        Q(patient__patient_hash__isnull=True) | Q(patient__patient_hash="")
    )
    payload = build_study_cohort_payload(
        parse_study_cohort_filters(definition.filters.model_dump()),
        request=request,
        case_scope=apply_study_eligibility(pseudonymous, definition.study_metadata),
        include_without_media=bool(imported_ids),
    )
    return Response(
        {
            **payload,
            "eligibility": {
                "dataset_count": len(datasets),
                "dataset_video_count": dataset_video_count,
                "missing_examination_video_count": missing_examination_count,
                "conflicting_patient_video_count": conflicting_patient_count,
                "candidate_examination_count": candidate_count,
                "pseudonymous_examination_count": pseudonymous.count(),
                "displayed_patient_count": len(payload["cases"]),
            },
        }
    )
