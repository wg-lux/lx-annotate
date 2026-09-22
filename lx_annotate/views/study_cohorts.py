"""Saved cohorts and bidirectional dataset links with explicit, scoped previews."""

from __future__ import annotations

from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from endoreg_db.models import AIDataSet, PatientExamination, VideoFile
from endoreg_db.services.center_access import resolve_allowed_center_ids
from endoreg_db.services.study_cohort import (
    build_study_cohort_payload,
    parse_study_cohort_filters,
)
from pydantic import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.models import StudyCohort
from lx_annotate.schemas.study_cohorts import (
    CohortDatasetLink,
    CohortDefinition,
)
from lx_annotate.views.ai_dataset_splits import require_dataset_access
from lx_annotate.views.study_export import StudyExportPatientReadPermission


def cohort_response(cohort: StudyCohort) -> dict[str, object]:
    return {
        "id": cohort.pk,
        "name": cohort.name,
        "hypothesis": cohort.hypothesis,
        "filters": cohort.filters,
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
    try:
        definition = CohortDefinition.model_validate(request.data)
        with transaction.atomic():
            datasets = validated_datasets(definition.dataset_ids, request.user)
            if cohort is None:
                cohort = StudyCohort(created_by=request.user)
            else:
                cohort = StudyCohort.objects.select_for_update().get(pk=cohort.pk)
            cohort.name = definition.name
            cohort.hypothesis = definition.hypothesis
            cohort.filters = definition.filters.model_dump(mode="json")
            cohort.save()
            cohort.datasets.set(datasets)
    except (ValidationError, ValueError) as error:
        return Response({"detail": str(error)}, status=400)
    return Response(
        cohort_response(cohort), status=200 if request.method == "PUT" else 201
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_cohorts(request: Request) -> Response:
    if request.method == "POST":
        return save_definition(request)
    cohorts = StudyCohort.objects.filter(created_by=request.user).prefetch_related(
        "datasets"
    )
    return Response([cohort_response(cohort) for cohort in cohorts])


@api_view(["PUT"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_cohort_detail(request: Request, cohort_id: int) -> Response:
    cohort = get_object_or_404(StudyCohort, pk=cohort_id, created_by=request.user)
    return save_definition(request, cohort)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def dataset_study_cohorts(request: Request, dataset_id: int) -> Response:
    dataset = get_object_or_404(AIDataSet, pk=dataset_id)
    require_dataset_access(request.user, dataset)
    if request.method == "POST":
        try:
            link = CohortDatasetLink.model_validate(request.data)
        except ValidationError as error:
            return Response({"detail": str(error)}, status=400)
        with transaction.atomic():
            cohort = get_object_or_404(
                StudyCohort.objects.select_for_update(),
                pk=link.cohort_id,
                created_by=request.user,
            )
            if link.linked:
                cohort.datasets.add(dataset)
            else:
                cohort.datasets.remove(dataset)
            cohort.save()
        return Response(cohort_response(cohort))
    cohorts = StudyCohort.objects.filter(created_by=request.user, datasets=dataset)
    return Response([cohort_response(cohort) for cohort in cohorts])


@api_view(["POST"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_cohort_preview(request: Request) -> Response:
    try:
        definition = CohortDefinition.model_validate(request.data)
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
            video_ids.update(
                dataset.image_annotations.values_list("frame__video_id", flat=True)
            )
            video_ids.update(
                dataset.video_annotations.values_list("video_file_id", flat=True)
            )
        videos = VideoFile.objects.filter(pk__in=video_ids)
        dataset_video_count = videos.count()
        missing_examination_count = videos.filter(examination__isnull=True).count()
        conflicting = videos.filter(
            patient__isnull=False, examination__isnull=False
        ).exclude(patient_id=F("examination__patient_id"))
        conflicting_patient_count = conflicting.count()
        videos = videos.exclude(pk__in=conflicting.values("pk"))
        cases = cases.filter(pk__in=videos.values("examination_id"))
    candidate_count = cases.count()
    pseudonymous = cases.filter(patient__is_real_person=False).exclude(
        Q(patient__patient_hash__isnull=True) | Q(patient__patient_hash="")
    )
    payload = build_study_cohort_payload(
        parse_study_cohort_filters(definition.filters.model_dump()),
        request=request,
        case_scope=pseudonymous,
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
