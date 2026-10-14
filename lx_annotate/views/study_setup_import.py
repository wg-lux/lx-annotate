"""Data-only YAML setup import; caller authorization is never supplied by YAML."""

from __future__ import annotations

from typing import cast

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as ModelError
from drf_spectacular.utils import _SerializerType, extend_schema
from endoreg_db.views.media.table_mappings import TableImportPermission
from lx_dtypes.models.contracts.study_setup import (
    StudySetupImportRequest,
    StudySetupImportResult,
)
from lx_dtypes.terminology.terminology_service import TerminologyError
from pydantic import ValidationError as SchemaError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.services.study_setup_import import (
    StudySetupConflict,
    import_study_setup,
)


@extend_schema(
    request=cast(_SerializerType, StudySetupImportRequest),
    responses={
        200: cast(_SerializerType, StudySetupImportResult),
        201: cast(_SerializerType, StudySetupImportResult),
    },
)
@api_view(["POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def study_setup_import(request: Request) -> Response:
    try:
        payload = StudySetupImportRequest.model_validate(request.data)
    except ValueError:
        return Response(
            {"detail": "Supply study YAML and validate, dry_run or import mode."},
            status=422,
        )
    try:
        result = import_study_setup(
            payload.yaml,
            actor=cast(User, request.user),
            dry_run=payload.mode != "import",
        )
    except SchemaError as error:
        return Response(
            {
                "detail": "Invalid study definition.",
                "issues": [
                    {"path": item["loc"], "code": item["type"]}
                    for item in error.errors(include_input=False, include_url=False)
                ],
            },
            status=422,
        )
    except (StudySetupConflict, ModelError):
        return Response(
            {
                "detail": "Conflicting study definition or unavailable import receipt; check its identity and version."
            },
            status=409,
        )
    except (ValueError, TerminologyError):
        return Response(
            {"detail": "Invalid study YAML or unresolved terminology references."},
            status=422,
        )
    return Response(
        result.model_dump(mode="json"),
        status=201 if result.status == "created" else 200,
    )
