"""Keep unattached imports observable throughout retries and terminal failures."""

from __future__ import annotations

from typing import Any, cast
from uuid import UUID

from django.http import HttpRequest, HttpResponse
from endoreg_db.models import RawPdfFile, UploadJob, VideoFile
from endoreg_db.serializers.misc.file_overview import (
    overview_upload_job_retry_summary,
    safe_upload_job_original_filename,
)
from endoreg_db.services.hub.import_monitoring import (
    can_dismiss_upload_job,
    dismissed_upload_job_filter,
)
from endoreg_db.views.anonymization import overview as backend_overview
from endoreg_db.views.anonymization.overview import (
    AnonymizationOverviewView,
    UploadJobDismissView,
    UploadJobRetryView,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from lx_annotate.permissions import LifecyclePolicyPermission


class LifecycleUploadJobRetryView(UploadJobRetryView):
    permission_classes = [IsAuthenticated, LifecyclePolicyPermission]


class LifecycleUploadJobDismissView(UploadJobDismissView):
    permission_classes = [IsAuthenticated, LifecyclePolicyPermission]


class _CancellationUnavailableView(APIView):
    def post(self, request: Request, job_id: UUID) -> Response:
        del request, job_id
        return Response(
            {
                "code": "import_cancellation_unavailable",
                "detail": "The installed backend does not support import cancellation.",
            },
            status=503,
        )


def lifecycle_upload_job_cancel(request: HttpRequest, job_id: UUID) -> HttpResponse:
    # Older installed backends never advertise the cancel action. Reject direct
    # requests explicitly while keeping the existing overview usable during an
    # independently versioned dependency upgrade.
    backend_view = getattr(
        backend_overview, "UploadJobCancelView", _CancellationUnavailableView
    )
    return backend_view.as_view(
        permission_classes=[IsAuthenticated, LifecyclePolicyPermission]
    )(request, job_id=job_id)


class LifecycleAnonymizationOverviewView(AnonymizationOverviewView):
    """Extend the packaged overview without changing media serialization or scope."""

    def _unattached_retryable_upload_job_rows(
        self,
        *,
        items: list[VideoFile | RawPdfFile],
        allowed_center_ids: frozenset[int] | None,
    ) -> list[dict[str, object]]:
        attached_job_ids = {
            upload_job.pk
            for item in items
            if (
                upload_job := cast(
                    UploadJob | None,
                    getattr(item, "_overview_upload_job", None),
                )
            )
            is not None
        }
        retry_jobs = (
            UploadJob.objects.select_related("source_center")
            .filter(
                status__in=[
                    UploadJob.Status.PENDING,
                    UploadJob.Status.PROCESSING,
                    UploadJob.Status.RETRYING,
                    UploadJob.Status.ERROR,
                    UploadJob.Status.LOST,
                    "cancel_requested",
                    "cancelled",
                ]
            )
            .exclude(pk__in=attached_job_ids)
            .exclude(dismissed_upload_job_filter())
            .order_by("-created_at")
        )
        if allowed_center_ids is not None:
            retry_jobs = retry_jobs.filter(source_center_id__in=allowed_center_ids)

        used_ids = {int(item.pk) for item in items}
        rows: list[dict[str, object]] = []
        for upload_job in retry_jobs:
            synthetic_id = -(int(upload_job.id.int) % 2_000_000_000 + 1)
            while synthetic_id in used_ids:
                synthetic_id -= 1
            used_ids.add(synthetic_id)
            media_type = "pdf" if "pdf" in upload_job.content_type.lower() else "video"
            filename = safe_upload_job_original_filename(cast(Any, upload_job))
            rows.append(
                {
                    "id": synthetic_id,
                    "filename": filename or f"Import {upload_job.pk}",
                    "media_type": media_type,
                    "anonymization_status": (
                        "processing_anonymization"
                        if upload_job.status
                        in {
                            UploadJob.Status.PENDING,
                            UploadJob.Status.PROCESSING,
                            UploadJob.Status.RETRYING,
                            "cancel_requested",
                        }
                        else "not_started"
                        if upload_job.status == "cancelled"
                        else "failed"
                    ),
                    "annotation_status": "",
                    "created_at": upload_job.created_at,
                    "sensitive_meta_id": None,
                    "file_size": 0,
                    "upload_job": overview_upload_job_retry_summary(upload_job),
                    "hls_materializations": [],
                    "document_type": None,
                    "patient_hash_display": None,
                    "examination_hash_display": None,
                    "pseudo_patient_id": None,
                    "pseudo_examination_id": None,
                    "import_only": True,
                    "can_dismiss_import": can_dismiss_upload_job(upload_job),
                }
            )
        return rows
