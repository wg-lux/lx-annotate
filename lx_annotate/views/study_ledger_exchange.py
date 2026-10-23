"""Authorized HTTP boundary for the canonical stored-study exchange workbook."""

from __future__ import annotations

from typing import cast
from uuid import UUID

from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as ModelError
from django.db.models import QuerySet
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from endoreg_db.models import PatientExamination
from endoreg_db.models.other.study import Study
from endoreg_db.models.other.study_cohort import StudyCohort
from endoreg_db.models.other.study_collection_entry import StudyCollectionEntry
from endoreg_db.services.centers.access import resolve_allowed_center_ids
from endoreg_db.services.studies.exchange import (
    capture_study_examinations,
    export_study_exchange,
    import_study_exchange,
)
from endoreg_db.views.media.table_mappings import TableImportPermission
from lx_dtypes.study_exchange import (
    MAX_EXCHANGE_BYTES,
    study_exchange_from_xlsx,
    study_exchange_to_xlsx,
)
from lx_dtypes.terminology.terminology_service import TerminologyError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.views.study_cohorts import (
    require_study_capture_coverage,
    study_cohort_record_scope,
)
from lx_annotate.views.study_export import StudyExportPatientReadPermission


def _scope(user: User) -> QuerySet[PatientExamination]:
    cases = PatientExamination.objects.all()
    centers = resolve_allowed_center_ids(user)
    return cases if centers is None else cases.filter(patient__center_id__in=centers)


@api_view(["GET"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_ledger_options(request: Request) -> Response:
    studies = Study.objects.filter(created_by=request.user).order_by("name", "uuid")
    return Response(
        {
            "studies": [
                {"uuid": str(study.uuid), "name": study.name} for study in studies
            ]
        },
        headers={"Cache-Control": "private, no-store"},
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_ledger_xlsx(request: Request, study_uuid: UUID) -> Response | HttpResponse:
    owner = cast(User, request.user)
    study = get_object_or_404(Study, uuid=study_uuid, created_by=owner)
    try:
        require_study_capture_coverage(study, owner)
        bundle = export_study_exchange(
            owner=owner, study=study, examination_scope=_scope(owner)
        )
        workbook = study_exchange_to_xlsx(bundle)
    except (PermissionError, PermissionDenied):
        return Response(
            {"detail": "Study contains examinations outside your authorized scope."},
            status=403,
        )
    except (ValueError, ModelError, TerminologyError):
        return Response(
            {
                "detail": "Stored study data failed exchange validation. Check cohort export coverage and capture missing collections first."
            },
            status=409,
        )
    response = HttpResponse(
        workbook,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = (
        f'attachment; filename="study-ledger-{study_uuid}.xlsx"'
    )
    response["X-Export-Row-Count"] = str(len(bundle.collections))
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def study_ledger_import(request: Request) -> Response:
    upload = request.FILES.get("file")
    if upload is None or upload.size is None or upload.size > MAX_EXCHANGE_BYTES:
        return Response(
            {"detail": "A bounded LX study workbook is required."}, status=400
        )
    content = upload.read(MAX_EXCHANGE_BYTES + 1)
    if len(content) > MAX_EXCHANGE_BYTES:
        return Response({"detail": "Workbook exceeds size limit."}, status=400)
    owner = cast(User, request.user)
    try:
        bundle = study_exchange_from_xlsx(content)
        records = import_study_exchange(
            owner=owner, bundle=bundle, examination_scope=_scope(owner)
        )
    except (PermissionError, PermissionDenied):
        return Response({"detail": "Study or examination access denied."}, status=403)
    except (ValueError, ModelError, TerminologyError):
        return Response(
            {
                "detail": "Workbook import failed. Check the LX exchange format, installed package snapshots and existing examination UUIDs."
            },
            status=400,
        )
    return Response(
        {"collections": len(records)}, headers={"Cache-Control": "private, no-store"}
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def study_cohort_capture(request: Request, cohort_id: int) -> Response:
    cohort = get_object_or_404(StudyCohort, pk=cohort_id, created_by=request.user)
    if request.data:
        return Response({"detail": "Save cohort changes before capturing."}, status=400)
    owner = cast(User, request.user)
    try:
        cases, _ = study_cohort_record_scope(cohort, owner)
        count = cases.count()
        covered = (
            StudyCollectionEntry.objects.filter(
                cohort=cohort, patient_examination__in=cases
            )
            .values("patient_examination_id")
            .distinct()
            .count()
        )
        if request.method == "POST":
            entries = capture_study_examinations(
                owner=owner,
                study=cohort.study,
                cohort=cohort,
                examination_scope=cases,
                cohort_examination_scope=cases,
            )
            covered = len({entry.patient_examination.pk for entry in entries})
    except (PermissionDenied, PermissionError):
        return Response({"detail": "Cohort access denied."}, status=403)
    except (ValueError, ModelError, TerminologyError):
        return Response(
            {
                "detail": "Ledger capture failed. Save validated records and install their exact full package snapshots first."
            },
            status=400,
        )
    return Response(
        {
            "examinations": count,
            "covered_examinations": covered,
            "missing_collections": count - covered,
        },
        headers={"Cache-Control": "private, no-store"},
    )
