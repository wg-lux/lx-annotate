"""Owned cohort selection around the reusable EndoReg table importer."""

from __future__ import annotations

from pathlib import Path
from typing import Literal, cast
from uuid import UUID, uuid5

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as ModelError
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.shortcuts import get_object_or_404
from endoreg_db.models.administration.center.center import Center
from endoreg_db.models.aidataset.aidataset import AIDataSet
from endoreg_db.models.other.study_cohort import StudyCohort
from endoreg_db.services.studies.table_import import import_table
from endoreg_db.services.studies.table_mappings import mapping_path
from endoreg_db.services.studies.table_parser import MAX_TABLE_BYTES, load_table_mapping
from endoreg_db.utils.file_operations import (
    atomic_create_file,
    protected_temporary_directory,
)
from endoreg_db.utils.hashs import get_file_hash
from endoreg_db.views.media.table_mappings import TableImportPermission
from lx_dtypes.models.contracts.table_import import TableExtractionError
from lx_dtypes.terminology.terminology_service import TerminologyError
from pydantic import BaseModel, ConfigDict, Field
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError as ApiError
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from lx_annotate.services.dataset_lifecycle import attach_import_dataset


class _UploadOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mapping_id: UUID
    center_id: int = Field(gt=0)
    dataset_name: str | None = Field(default=None, min_length=1, max_length=255)
    mode: Literal["validate", "import"] = "validate"


@api_view(["POST"])
@permission_classes([IsAuthenticated, TableImportPermission])
def study_table_import(request: Request, cohort_id: int) -> Response:
    cohort = get_object_or_404(StudyCohort, pk=cohort_id, created_by_id=request.user.pk)
    try:
        options = _UploadOptions.model_validate(
            {key: request.data[key] for key in request.data if key != "file"}
        )
        upload = request.FILES.get("file")
        if not isinstance(upload, UploadedFile) or not upload.name:
            raise ValueError("A table upload is required")
        suffix = Path(upload.name).suffix.lower()
        if (
            suffix not in {".csv", ".xls", ".xlsx"}
            or upload.size is None
            or upload.size > MAX_TABLE_BYTES
        ):
            raise ValueError("Unsupported or oversized table")
        source_content = upload.read(MAX_TABLE_BYTES + 1)
        if len(source_content) > MAX_TABLE_BYTES:
            raise ValueError("Table exceeds size limit")
        mapping_file = mapping_path(cast(int, request.user.pk), options.mapping_id)
        if not mapping_file.is_file():
            return Response({"detail": "Mapping not found."}, status=404)
        center = get_object_or_404(Center, pk=options.center_id)
        with protected_temporary_directory(prefix="study_table_") as staging:
            source_file = staging / f"source{suffix}"
            atomic_create_file(
                destination=source_file,
                content=[source_content],
                file_mode=0o600,
                dir_mode=0o700,
            )
            dataset_id: int | None = None
            with transaction.atomic():
                Center.objects.select_for_update().get(pk=center.pk)
                source_hash = get_file_hash(source_file)
                identity = uuid5(
                    options.mapping_id, f"{request.user.pk}:{center.pk}:{source_hash}"
                )
                list(
                    AIDataSet.objects.select_for_update().filter(
                        import_identity=identity
                    )
                )
                result = import_table(
                    mapping_file,
                    source_file,
                    owner=cast(User, request.user),
                    center=center,
                    dry_run=options.mode == "validate",
                )
                if not result.dry_run:
                    dataset = attach_import_dataset(
                        cast(User, request.user),
                        cohort,
                        mapping_id=options.mapping_id,
                        source_hash=source_hash,
                        center_id=cast(int, center.pk),
                        name=options.dataset_name
                        or load_table_mapping(mapping_file).name,
                        examination_ids=result.patient_examination_ids,
                    )
                    dataset_id = dataset.pk
    except PermissionError:
        return Response({"detail": "Center access denied."}, status=403)
    except TableExtractionError as error:
        return Response(
            {
                "detail": str(error),
                "row_number": error.row_number,
                "field": error.field,
                "code": error.code,
            },
            status=400,
        )
    except (ValueError, ModelError, ApiError):
        return Response(
            {
                "detail": "Table validation failed. Check mapping, source format and existing clinical identities."
            },
            status=400,
        )
    except TerminologyError:
        return Response(
            {"detail": "Selected knowledge-base version is unavailable."}, status=409
        )
    return Response(
        {
            "dataset_id": dataset_id,
            "dry_run": result.dry_run,
            "patient_examination_ids": result.patient_examination_ids,
            "rows": result.row_count,
            "created": result.created_count,
            "replayed": result.replayed_count,
            "videos": result.matched_video_count,
            "reports": result.matched_report_count,
        },
        headers={"Cache-Control": "private, no-store"},
    )
