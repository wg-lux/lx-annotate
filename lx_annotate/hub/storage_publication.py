"""Durable, generation-bound publication of approved processed media."""

from __future__ import annotations

import os
import string
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import timedelta
from pathlib import Path
from uuid import UUID

import requests
from django.conf import settings
from django.db import transaction
from django.db.models import Exists, OuterRef, Q
from django.utils import timezone
from endoreg_db.models import RawPdfFile, RawPdfState, VideoFile, VideoState
from endoreg_db.services.raw_pdf_files.integrity import (
    require_usable_completed_report,
)
from endoreg_db.utils.storage import ensure_local_file

from lx_annotate.models import StorageArtifactPublication

from .storage_ingest import (
    ProcessedStorageIngestRequest,
    ProcessedStorageIngestResult,
    ingest_processed_storage_artifact,
)
from .storage_transfer_client import StorageTransferArtifactKind, StorageTransferClient

_SHA256_LENGTH = 64


def _sha256(value: object) -> str:
    digest = str(value or "").strip().lower()
    if len(digest) != _SHA256_LENGTH or any(
        character not in string.hexdigits for character in digest
    ):
        raise ValueError("processed generation has no valid SHA-256 identity")
    return digest


def _balancing_deployment_enabled() -> bool:
    return bool(getattr(settings, "ENDOREG_ENABLE_STORAGE_BALANCING", False))


def _dispatch_after_commit(publication_id: UUID) -> None:
    if not _balancing_deployment_enabled():
        return

    def _dispatch() -> None:
        from lx_annotate.tasks import publish_storage_artifact_task

        publish_storage_artifact_task.delay(str(publication_id))

    transaction.on_commit(_dispatch, robust=True)


def _refresh_publication_locator(
    publication: StorageArtifactPublication,
    *,
    processed_file_name: str,
) -> None:
    """Track an exact-hash artifact after a managed storage relocation."""
    if publication.processed_file_name == processed_file_name:
        return
    if publication.status == StorageArtifactPublication.Status.COMMITTED:
        return
    publication.processed_file_name = processed_file_name
    update_fields = ["processed_file_name"]
    if publication.status == StorageArtifactPublication.Status.BLOCKED:
        publication.status = StorageArtifactPublication.Status.PENDING
        publication.last_error_code = ""
        update_fields.extend(["status", "last_error_code"])
    publication.save(update_fields=update_fields)


def queue_video_storage_publication(
    state: VideoState,
    *,
    dispatch: bool = True,
) -> UUID | None:
    """Persist the exact export-approved video generation, if one exists."""
    if not bool(state.ready_for_export):
        return None
    try:
        digest = _sha256(state.processed_file_sha256)
    except ValueError:
        return None
    video = getattr(state, "video_file", None)
    if video is None or video.pk is None or video.center_id is None:
        return None
    file_name = str(getattr(video.processed_file, "name", "") or "").strip()
    if not file_name:
        return None
    publication, _created = StorageArtifactPublication.objects.get_or_create(
        resource_kind=StorageArtifactPublication.ResourceKind.VIDEO,
        video_file=video,
        processed_sha256=digest,
        defaults={
            "processed_file_name": file_name,
            "source_center_key": str(video.center.center_key),
        },
    )
    if publication.source_center_key != str(video.center.center_key):
        raise ValueError("video publication generation identity is inconsistent")
    _refresh_publication_locator(publication, processed_file_name=file_name)
    if dispatch:
        _dispatch_after_commit(publication.pk)
    return publication.pk


def queue_report_storage_publication(
    state: RawPdfState,
    *,
    dispatch: bool = True,
) -> UUID | None:
    """Persist the exact human-validated processed-report generation."""
    if not bool(state.anonymization_validated):
        return None
    try:
        digest = _sha256(state.processed_file_sha256)
    except ValueError:
        return None
    report = getattr(state, "raw_pdf_file", None)
    if report is None or report.pk is None or report.center_id is None:
        return None
    file_name = str(getattr(report.processed_file, "name", "") or "").strip()
    if not file_name:
        return None
    publication, _created = StorageArtifactPublication.objects.get_or_create(
        resource_kind=StorageArtifactPublication.ResourceKind.REPORT,
        raw_pdf_file=report,
        processed_sha256=digest,
        defaults={
            "processed_file_name": file_name,
            "source_center_key": str(report.center.center_key),
        },
    )
    if publication.source_center_key != str(report.center.center_key):
        raise ValueError("report publication generation identity is inconsistent")
    _refresh_publication_locator(publication, processed_file_name=file_name)
    if dispatch:
        _dispatch_after_commit(publication.pk)
    return publication.pk


def _residency_key() -> str:
    value = str(os.getenv("ENDOREG_STORAGE_RESIDENCY_KEY", "") or "").strip()
    if not value:
        raise ValueError("ENDOREG_STORAGE_RESIDENCY_KEY is required for publication")
    if len(value) > 128:
        raise ValueError("ENDOREG_STORAGE_RESIDENCY_KEY exceeds the typed contract")
    return value


@contextmanager
def _validated_source(
    publication: StorageArtifactPublication,
) -> Iterator[tuple[Path, StorageTransferArtifactKind, int | None, str]]:
    if publication.resource_kind == StorageArtifactPublication.ResourceKind.VIDEO:
        video = VideoFile.objects.select_related("state", "center").get(
            pk=publication.video_file_id,
        )
        state = video.state
        expected = _sha256(publication.processed_sha256)
        if (
            not state.ready_for_export
            or _sha256(state.processed_file_sha256) != expected
            or _sha256(video.processed_video_hash) != expected
            or str(video.processed_file.name or "") != publication.processed_file_name
            or str(video.center.center_key) != publication.source_center_key
        ):
            raise ValueError("approved video generation changed before publication")
        with ensure_local_file(video.processed_file, suffix=".mp4") as source:
            yield (
                Path(source),
                StorageTransferArtifactKind.ANONYMIZED_VIDEO,
                int(video.pk),
                f"video:{video.pk}:processed:{expected}",
            )
        return

    report = RawPdfFile.objects.select_related("state", "center").get(
        pk=publication.raw_pdf_file_id,
    )
    state = report.state
    if state is None:
        raise ValueError("approved report has no state before publication")
    expected = _sha256(publication.processed_sha256)
    if (
        not state.anonymization_validated
        or str(report.processed_file.name or "") != publication.processed_file_name
        or report.center is None
        or str(report.center.center_key) != publication.source_center_key
    ):
        raise ValueError("approved report generation changed before publication")
    actual = require_usable_completed_report(report)
    if _sha256(actual) != expected or _sha256(state.processed_file_sha256) != expected:
        raise ValueError("processed report integrity proof changed before publication")
    with ensure_local_file(report.processed_file, suffix=".pdf") as source:
        yield (
            Path(source),
            StorageTransferArtifactKind.PROCESSED_REPORT,
            None,
            f"report:{report.pk}:processed:{expected}",
        )


def publish_storage_artifact(publication_id: UUID) -> ProcessedStorageIngestResult:
    """Publish one receipt idempotently after revalidating its managed source."""
    with transaction.atomic():
        publication = StorageArtifactPublication.objects.select_for_update().get(
            pk=publication_id,
        )
        if publication.status == StorageArtifactPublication.Status.COMMITTED:
            if not publication.placement_id or not publication.transfer_evidence_id:
                raise RuntimeError("committed publication is missing its receipts")
            return ProcessedStorageIngestResult(
                placement_id=publication.placement_id,
                transfer_evidence_id=publication.transfer_evidence_id,
                node_key=publication.node_key,
                committed=True,
            )
        publication.status = StorageArtifactPublication.Status.PROCESSING
        publication.attempt_count += 1
        publication.last_attempt_at = timezone.now()
        publication.last_error_code = ""
        publication.save(
            update_fields=[
                "status",
                "attempt_count",
                "last_attempt_at",
                "last_error_code",
            ],
        )

    try:
        with _validated_source(publication) as (
            source_path,
            artifact_kind,
            video_id,
            artifact_key,
        ):
            result = ingest_processed_storage_artifact(
                request=ProcessedStorageIngestRequest(
                    artifact_key=artifact_key,
                    artifact_kind=artifact_kind,
                    source_path=source_path,
                    residency_key=_residency_key(),
                    idempotency_key=f"storage-publication:{publication.pk}",
                    media_lease_video_id=video_id,
                ),
                client_factory=StorageTransferClient.from_environment,
            )
    except (requests.ConnectionError, requests.Timeout) as exc:
        StorageArtifactPublication.objects.filter(pk=publication.pk).update(
            status=StorageArtifactPublication.Status.PENDING,
            last_error_code="transient_transport",
        )
        error_type = (
            TimeoutError if isinstance(exc, requests.Timeout) else ConnectionError
        )
        raise error_type(
            "storage publication transport is temporarily unavailable",
        ) from exc
    except requests.HTTPError as exc:
        status_code = getattr(exc.response, "status_code", 0)
        if status_code >= 500:
            StorageArtifactPublication.objects.filter(pk=publication.pk).update(
                status=StorageArtifactPublication.Status.PENDING,
                last_error_code="transient_remote_service",
            )
            raise ConnectionError(
                "storage publication service is temporarily unavailable",
            ) from exc
        StorageArtifactPublication.objects.filter(pk=publication.pk).update(
            status=StorageArtifactPublication.Status.BLOCKED,
            last_error_code=f"remote_http_{status_code}"[:128],
        )
        raise
    except Exception as exc:
        StorageArtifactPublication.objects.filter(pk=publication.pk).update(
            status=StorageArtifactPublication.Status.BLOCKED,
            last_error_code=type(exc).__name__[:128],
        )
        raise

    StorageArtifactPublication.objects.filter(pk=publication.pk).update(
        status=StorageArtifactPublication.Status.COMMITTED,
        placement_id=result.placement_id,
        transfer_evidence_id=result.transfer_evidence_id,
        node_key=result.node_key,
        committed_at=timezone.now(),
        last_error_code="",
    )
    return result


def pending_storage_publication_ids(*, limit: int) -> list[UUID]:
    if not 1 <= limit <= 1000:
        raise ValueError("publication dispatch limit must be between 1 and 1000")
    stale_before = timezone.now() - timedelta(minutes=15)
    return list(
        StorageArtifactPublication.objects.filter(
            Q(status=StorageArtifactPublication.Status.PENDING)
            | Q(
                status=StorageArtifactPublication.Status.PROCESSING,
                last_attempt_at__lt=stale_before,
            ),
        )
        .order_by("created_at", "pk")
        .values_list("pk", flat=True)[:limit],
    )


def discover_storage_publications(*, limit: int) -> int:
    """Backfill outbox rows for already-approved generations after deployment."""
    if not 1 <= limit <= 1000:
        raise ValueError("publication discovery limit must be between 1 and 1000")
    discovered = 0
    existing_video = StorageArtifactPublication.objects.filter(
        resource_kind=StorageArtifactPublication.ResourceKind.VIDEO,
        video_file_id=OuterRef("pk"),
        processed_sha256=OuterRef("state__processed_file_sha256"),
    )
    videos = (
        VideoFile.objects.filter(
            state__ready_for_export=True,
            state__processed_file_sha256__gt="",
        )
        .annotate(has_publication=Exists(existing_video))
        .filter(has_publication=False)
        .select_related("state", "center")
        .order_by("pk")[:limit]
    )
    for video in videos:
        if queue_video_storage_publication(video.state, dispatch=False) is not None:
            discovered += 1
    remaining = limit - discovered
    if remaining <= 0:
        return discovered
    existing_report = StorageArtifactPublication.objects.filter(
        resource_kind=StorageArtifactPublication.ResourceKind.REPORT,
        raw_pdf_file_id=OuterRef("pk"),
        processed_sha256=OuterRef("state__processed_file_sha256"),
    )
    reports = (
        RawPdfFile.objects.filter(
            state__anonymization_validated=True,
            state__processed_file_sha256__gt="",
        )
        .annotate(has_publication=Exists(existing_report))
        .filter(has_publication=False)
        .select_related("state", "center")
        .order_by("pk")[:remaining]
    )
    for report in reports:
        state = report.state
        if (
            state is not None
            and queue_report_storage_publication(state, dispatch=False) is not None
        ):
            discovered += 1
    return discovered


__all__ = [
    "pending_storage_publication_ids",
    "discover_storage_publications",
    "publish_storage_artifact",
    "queue_report_storage_publication",
    "queue_video_storage_publication",
]
