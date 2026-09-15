from __future__ import annotations

import hashlib
from collections.abc import Iterator
from functools import partial

import fitz
import pytest
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.utils.file_operations import safe_delete_field_file

from lx_annotate.hub.hub_export_jobs import (
    mark_resources_for_hub_upload,
    retry_failed_outbound_job,
)
from lx_annotate.hub.hub_export_state import (
    is_report_hub_export_eligible,
    report_hub_export_blocked_reason,
)
from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import verify_hub_report_artifact

pytestmark = pytest.mark.django_db


@pytest.fixture
def reviewed_report(master_key: bytes) -> Iterator[RawPdfFile]:
    center = Center.objects.create(name="Publication AAA", center_key="publication-aaa")
    state = RawPdfState.objects.create(
        processing_started=True,
        sensitive_meta_processed=True,
        anonymized=True,
        anonymization_validated=True,
    )
    with fitz.open() as document:
        document.new_page().insert_text((72, 72), "Synthetic reviewed report")
        content = document.tobytes()
    report = RawPdfFile.objects.create(
        center=center,
        state=state,
        pdf_hash=hashlib.sha256(content).hexdigest(),
        anonymized_text="Synthetic reviewed report",
        processed_file=ContentFile(content, name="publication-aaa.pdf"),
    )
    verify_hub_report_artifact(report)
    yield report
    safe_delete_field_file(report.processed_file)


@pytest.mark.parametrize("validated", [False, True])
@pytest.mark.parametrize("failed", [False, True])
def test_report_failure_overrides_validation_in_export_eligibility(
    reviewed_report: RawPdfFile,
    validated: bool,
    failed: bool,
) -> None:
    # Arrange: model a stale persisted validation flag after a processing failure.
    state = reviewed_report.state
    state.anonymization_validated = validated
    state.processing_error = failed
    state.save(update_fields=["anonymization_validated", "processing_error"])

    # Act
    eligible = is_report_hub_export_eligible(reviewed_report)
    reason = report_hub_export_blocked_reason(reviewed_report)

    # Assert
    assert eligible is (validated and not failed)
    assert reason == ("" if validated and not failed else "not ready for export")
    if failed:
        assert state.anonymization_status is AnonymizationState.FAILED


@pytest.mark.parametrize("failed", [False, True])
def test_operator_marking_cannot_authorize_failed_report(
    reviewed_report: RawPdfFile,
    failed: bool,
    settings,
) -> None:
    # Arrange
    settings.LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE = False
    operator = User.objects.create_user(username="publication-reviewer")
    NetworkNode.objects.create(
        node_key="publication-site",
        display_name="Publication site",
        role=NetworkNode.Role.SITE_NODE,
        owning_center=reviewed_report.center,
    )
    hub = NetworkNode.objects.create(
        node_key="publication-hub",
        display_name="Publication hub",
        role=NetworkNode.Role.CENTRAL_HUB,
        owning_center=reviewed_report.center,
    )
    state = reviewed_report.state
    state.processing_error = failed
    state.save(update_fields=["processing_error"])
    mark_report = partial(
        mark_resources_for_hub_upload,
        resource_refs=[{"resource_kind": "report", "id": reviewed_report.pk}],
        target_node=hub,
        marked_by=operator,
    )

    # Act
    if failed:
        with pytest.raises(ValueError, match="not eligible for hub export"):
            mark_report()
    else:
        mark_report()

    # Assert
    jobs = OutboundHubTransferJob.objects.filter(raw_pdf_file=reviewed_report)
    assert jobs.count() == (0 if failed else 1)
    if not failed:
        job = jobs.get()
        assert job.marked_by == operator
        assert job.local_status == OutboundHubTransferJob.LocalStatus.MARKED


def test_report_marking_rejects_replaced_content_with_stale_digest(
    reviewed_report: RawPdfFile,
    settings,
) -> None:
    # Arrange: replace managed content through storage, retaining its old approval proof.
    settings.LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE = False
    operator = User.objects.create_user(username="integrity-reviewer")
    NetworkNode.objects.create(
        node_key="integrity-site",
        display_name="Integrity site",
        role=NetworkNode.Role.SITE_NODE,
        owning_center=reviewed_report.center,
    )
    hub = NetworkNode.objects.create(
        node_key="integrity-hub",
        display_name="Integrity hub",
        role=NetworkNode.Role.CENTRAL_HUB,
        owning_center=reviewed_report.center,
    )
    storage = reviewed_report.processed_file.storage
    name = reviewed_report.processed_file.name
    with fitz.open() as document:
        document.new_page().insert_text((72, 72), "Synthetic replacement not reviewed")
        replacement = document.tobytes()
    safe_delete_field_file(reviewed_report.processed_file)
    assert storage.save(name, ContentFile(replacement)) == name
    original_digest = reviewed_report.state.processed_file_sha256
    assert hashlib.sha256(replacement).hexdigest() != original_digest

    # Act
    with pytest.raises(ValueError, match="not eligible for hub export"):
        mark_resources_for_hub_upload(
            resource_refs=[{"resource_kind": "report", "id": reviewed_report.pk}],
            target_node=hub,
            marked_by=operator,
        )

    # Assert
    assert not OutboundHubTransferJob.objects.filter(
        raw_pdf_file=reviewed_report
    ).exists()
    reviewed_report.state.refresh_from_db()
    assert reviewed_report.state.processed_file_sha256 == original_digest


@pytest.mark.parametrize("changed", [False, True])
def test_report_retry_rechecks_content_without_changing_transfer_identity(
    reviewed_report: RawPdfFile,
    changed: bool,
    settings,
) -> None:
    # Arrange: create a real marked job, then simulate a failed delivery attempt.
    settings.LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE = False
    operator = User.objects.create_user(username="retry-reviewer")
    NetworkNode.objects.create(
        node_key="retry-site",
        display_name="Retry site",
        role=NetworkNode.Role.SITE_NODE,
        owning_center=reviewed_report.center,
    )
    hub = NetworkNode.objects.create(
        node_key="retry-hub",
        display_name="Retry hub",
        role=NetworkNode.Role.CENTRAL_HUB,
        owning_center=reviewed_report.center,
    )
    [job] = mark_resources_for_hub_upload(
        resource_refs=[{"resource_kind": "report", "id": reviewed_report.pk}],
        target_node=hub,
        marked_by=operator,
    )
    identity = job.transfer_key
    job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
    job.save(update_fields=["local_status"])
    if changed:
        name = reviewed_report.processed_file.name
        storage = reviewed_report.processed_file.storage
        safe_delete_field_file(reviewed_report.processed_file)
        with fitz.open() as document:
            document.new_page().insert_text(
                (72, 72), "Synthetic replacement before retry"
            )
            replacement = document.tobytes()
        assert storage.save(name, ContentFile(replacement)) == name

    # Act
    if changed:
        with pytest.raises(ValueError, match="no longer eligible"):
            retry_failed_outbound_job(
                outbound_job_id=str(job.pk), requested_by=operator
            )
    else:
        retry_failed_outbound_job(outbound_job_id=str(job.pk), requested_by=operator)

    # Assert: retry must reuse the original ledger identity or remain failed.
    job.refresh_from_db()
    assert job.transfer_key == identity
    assert (
        OutboundHubTransferJob.objects.filter(raw_pdf_file=reviewed_report).count() == 1
    )
    assert job.local_status == (
        OutboundHubTransferJob.LocalStatus.FAILED
        if changed
        else OutboundHubTransferJob.LocalStatus.QUEUED
    )


def test_overview_readiness_does_not_rehash_processed_report(
    reviewed_report: RawPdfFile,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange: polling has persisted proof; full rehash belongs to an action boundary.
    def unexpected_hash(*args: object, **kwargs: object) -> str:
        pytest.fail("Overview must not reread the complete processed report")

    monkeypatch.setattr("lx_annotate.hub.hub_export_state.sha256_file", unexpected_hash)

    # Act
    eligible = is_report_hub_export_eligible(reviewed_report)

    # Assert
    assert eligible is True


def test_fresh_report_integrity_check_rejects_unreadable_content(
    reviewed_report: RawPdfFile,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange: inject a storage read failure at the adjacent I/O boundary.
    def unreadable(*args: object, **kwargs: object) -> str:
        raise OSError("processed report read failed")

    monkeypatch.setattr("lx_annotate.hub.hub_export_state.sha256_file", unreadable)

    # Act
    reason = report_hub_export_blocked_reason(
        reviewed_report,
        verify_processed_media=True,
    )

    # Assert
    assert reason == "processed media unreadable"
    assert not OutboundHubTransferJob.objects.filter(
        raw_pdf_file=reviewed_report
    ).exists()
