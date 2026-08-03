# pyright: reportMissingImports=false
from __future__ import annotations

import json
from io import StringIO

import pytest
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import CommandError

from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState

from lx_annotate.hub.hub_export_health import build_hub_export_health_summary
from lx_annotate.models import OutboundHubTransferJob


pytestmark = pytest.mark.django_db


@pytest.fixture
def hub_export_report_job(master_key: bytes) -> OutboundHubTransferJob:
    del master_key
    center = Center.objects.create(name="Health Center", center_key="health-center")
    hub_node = NetworkNode.objects.create(
        display_name="Health Hub",
        node_key="health-hub",
        role=NetworkNode.Role.CENTRAL_HUB,
        base_url="https://hub.example/",
        owning_center=center,
    )
    report_state = RawPdfState.objects.create(
        anonymized=True,
        sensitive_meta_processed=True,
        processing_started=True,
        anonymization_validated=True,
    )
    report = RawPdfFile.objects.create(
        center=center,
        state=report_state,
        pdf_hash="health-report-hash",
        file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="health.pdf"),
        processed_file=ContentFile(
            b"%PDF-1.4\nprocessed\n%%EOF\n",
            name="health-processed.pdf",
        ),
    )
    return OutboundHubTransferJob.objects.create(
        resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
        raw_pdf_file=report,
        source_center=center,
        target_node=hub_node,
        transfer_key="health-site__report__health-report-hash__processed_v1",
    )


def _set_job_state(
    job: OutboundHubTransferJob,
    *,
    status: str,
    failure_class: str = "",
    retry_count: int = 0,
) -> None:
    job.local_status = status
    job.failure_class = failure_class
    job.retry_count = retry_count
    job.save(update_fields=["local_status", "failure_class", "retry_count"])


@pytest.mark.parametrize(
    ("failure_class", "summary_field"),
    [
        (
            OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION,
            "configuration_rejection",
        ),
        (
            OutboundHubTransferJob.FailureClass.AUTHORIZATION_DENIAL,
            "authorization_denial",
        ),
        (
            OutboundHubTransferJob.FailureClass.INTEGRITY_INCONSISTENCY,
            "integrity_inconsistency",
        ),
    ],
)
def test_health_summary_distinguishes_every_terminal_alert_class(
    hub_export_report_job: OutboundHubTransferJob,
    failure_class: str,
    summary_field: str,
) -> None:
    _set_job_state(
        hub_export_report_job,
        status=OutboundHubTransferJob.LocalStatus.FAILED,
        failure_class=failure_class,
    )

    summary = build_hub_export_health_summary(max_retries=5)

    assert summary.total_jobs == 1
    assert getattr(summary, summary_field) == 1
    assert summary.critical_count == 1
    assert summary.healthy is False


def test_transient_retry_only_alerts_after_exhaustion(
    hub_export_report_job: OutboundHubTransferJob,
) -> None:
    _set_job_state(
        hub_export_report_job,
        status=OutboundHubTransferJob.LocalStatus.FAILED,
        failure_class=OutboundHubTransferJob.FailureClass.TRANSIENT_RETRY,
        retry_count=4,
    )
    retryable = build_hub_export_health_summary(max_retries=5)
    assert retryable.transient_retry == 1
    assert retryable.critical_count == 0

    _set_job_state(
        hub_export_report_job,
        status=OutboundHubTransferJob.LocalStatus.FAILED,
        failure_class=OutboundHubTransferJob.FailureClass.TRANSIENT_RETRY,
        retry_count=5,
    )
    exhausted = build_hub_export_health_summary(max_retries=5)
    assert exhausted.retry_exhausted == 1
    assert exhausted.critical_count == 1


def test_health_command_emits_json_and_fails_closed(
    hub_export_report_job: OutboundHubTransferJob,
) -> None:
    _set_job_state(
        hub_export_report_job,
        status=OutboundHubTransferJob.LocalStatus.FAILED,
        failure_class=OutboundHubTransferJob.FailureClass.INTEGRITY_INCONSISTENCY,
    )
    stdout = StringIO()

    with pytest.raises(CommandError, match="critical_count=1"):
        call_command("check_hub_export_health", stdout=stdout)

    payload = json.loads(stdout.getvalue())
    assert payload["integrity_inconsistency"] == 1
    assert payload["healthy"] is False
    assert "last_error" not in payload
