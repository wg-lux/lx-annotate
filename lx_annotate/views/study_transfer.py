"""Owner- and center-scoped standalone study hub actions."""

from __future__ import annotations

from typing import cast
from uuid import UUID

import requests
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from endoreg_db.models import NetworkNode, PatientExamination, Study
from endoreg_db.services.centers.access import resolve_allowed_center_ids
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.hub.hub_export_jobs import require_normal_sender_target_hub
from lx_annotate.hub.study_transfer import send_study_to_hub
from lx_annotate.views.study_cohorts import require_study_capture_coverage
from lx_annotate.views.study_export import StudyExportPatientReadPermission


class StudyHubRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    source_node_key: str = Field(min_length=1)
    target_node_key: str | None = None


@api_view(["POST"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_hub_transfer(request: Request, study_id: UUID) -> Response:
    study = get_object_or_404(Study, uuid=study_id, created_by=request.user)
    try:
        selection = StudyHubRequest.model_validate(request.data)
        source = get_object_or_404(
            NetworkNode,
            node_key=selection.source_node_key,
            is_active=True,
            role=NetworkNode.Role.SITE_NODE,
        )
        allowed = resolve_allowed_center_ids(request.user)
        center = source.owning_center
        if center is None or (allowed is not None and center.pk not in allowed):
            return Response(
                {"detail": "Study sender center is not authorized."}, status=403
            )
        target = (
            get_object_or_404(
                NetworkNode,
                node_key=selection.target_node_key,
                is_active=True,
                role=NetworkNode.Role.CENTRAL_HUB,
            )
            if selection.target_node_key
            else require_normal_sender_target_hub()
        )
        scope = PatientExamination.objects.filter(patient__center_id=center.pk)
        try:
            require_study_capture_coverage(study, request.user)
        except ValueError:
            return Response(
                {
                    "detail": "Capture the current cohort ledger before exporting this study."
                },
                status=409,
            )
        receipt = send_study_to_hub(
            owner=cast(User, request.user),
            study=study,
            source=source,
            target=target,
            examination_scope=scope,
        )
    except (ValidationError, DjangoValidationError):
        return Response({"detail": "Invalid study transfer contract."}, status=400)
    except (ValueError, requests.RequestException):
        return Response(
            {
                "detail": "Study transfer could not be verified. Retry preserves its identity."
            },
            status=400,
        )
    return Response(receipt.model_dump(mode="json"))


@api_view(["POST"])
@permission_classes([IsAuthenticated, StudyExportPatientReadPermission])
def study_hub_accept(request: Request, transfer_id: UUID) -> Response:
    from endoreg_db.models import TransferJob
    from endoreg_db.services.hub.study_transfer import accept_study_transfer

    if request.data:
        return Response(
            {"detail": "Study transfer acceptance takes no override fields."},
            status=400,
        )
    allowed = resolve_allowed_center_ids(request.user)
    jobs = TransferJob.objects.filter(resource_kind="study", transfer_status="applied")
    scope = PatientExamination.objects.all()
    if allowed is not None:
        jobs = jobs.filter(source_center_id__in=allowed)
        scope = scope.filter(patient__center_id__in=allowed)
    transfer = get_object_or_404(jobs, pk=transfer_id)
    try:
        entries = accept_study_transfer(
            transfer_job=transfer,
            owner=cast(User, request.user),
            examination_scope=scope,
        )
    except (ValueError, DjangoValidationError):
        return Response(
            {"detail": "Study transfer could not be accepted into this workspace."},
            status=400,
        )
    return Response({"collection_count": len(entries), "transfer_id": str(transfer.pk)})
