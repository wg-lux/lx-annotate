from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch

import requests
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.utils import timezone

from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from lx_annotate.hub.hub_export_reconciliation import (
    reconcile_outbound_transfer_job,
    recover_stale_outbound_transfer_jobs,
)
from lx_annotate.models import OutboundHubTransferJob

import base64
import os

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


@override_settings(LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=False)
class HubExportReconciliationTests(TestCase):
    def setUp(self) -> None:
        self.center = Center.objects.create(
            name="Test Center", center_key="test-center"
        )
        self.site_node = NetworkNode.objects.create(
            display_name="Site Node",
            node_key="site-node",
            role=NetworkNode.Role.SITE_NODE,
            owning_center=self.center,
        )
        self.hub_node = NetworkNode.objects.create(
            display_name="Hub Node",
            node_key="hub-node",
            role=NetworkNode.Role.CENTRAL_HUB,
            base_url="https://hub.example/",
            owning_center=self.center,
        )
        self.report_state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        self.report = RawPdfFile.objects.create(
            center=self.center,
            state=self.report_state,
            pdf_hash="report-hash-1",
            file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="report-1.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed\n%%EOF\n",
                name="report-1-processed.pdf",
            ),
        )

    @patch("lx_annotate.hub.hub_export_worker.requests.get")
    def test_reconcile_outbound_transfer_job_applies_remote_status(
        self,
        get_mock: MagicMock,
    ) -> None:
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-1__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.REGISTERING,
        )
        response = MagicMock()
        response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "awaiting_media",
            "processing_decision": "wait_for_missing_media",
            "status_detail": "",
        }
        response.raise_for_status.return_value = None
        get_mock.return_value = response

        result = reconcile_outbound_transfer_job(
            outbound_job_id=str(job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status, OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA
        )
        self.assertEqual(result.remote_transfer_status, "awaiting_media")

    @override_settings(LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS=60)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    @patch("lx_annotate.hub.hub_export_worker.requests.get")
    def test_recover_stale_inflight_job_redispatches_after_status_check_failure(
        self,
        get_mock: MagicMock,
        delay_mock: MagicMock,
    ) -> None:
        get_mock.side_effect = requests.RequestException("status timeout")
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-1__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.UPLOADING,
            last_attempt_at=timezone.now() - timedelta(minutes=5),
        )

        with self.captureOnCommitCallbacks(execute=True):
            summary = recover_stale_outbound_transfer_jobs(
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        job.refresh_from_db()
        self.assertEqual(summary["failed"], 0)
        self.assertEqual(summary["redispatched"], 1)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        self.assertIn("stale in-flight job", job.last_error)
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)

    @override_settings(LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS=60)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_recover_redispatches_lost_queued_job(
        self,
        delay_mock: MagicMock,
    ) -> None:
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__queued-lost__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.QUEUED,
            queued_at=timezone.now() - timedelta(minutes=5),
        )

        with self.captureOnCommitCallbacks(execute=True):
            summary = recover_stale_outbound_transfer_jobs(
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        job.refresh_from_db()
        self.assertEqual(summary["redispatched"], 1)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        self.assertGreater(job.queued_at, timezone.now() - timedelta(minutes=1))
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)

    @override_settings(
        LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS=60,
        LX_ANNOTATE_HUB_EXPORT_MAX_RETRIES=2,
    )
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_recover_only_redispatches_failed_jobs_below_retry_limit(
        self,
        delay_mock: MagicMock,
    ) -> None:
        retryable = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__failed-retryable__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.FAILED,
            retry_count=1,
            last_error="Hub transfer registration failed: timeout",
            last_attempt_at=timezone.now() - timedelta(minutes=5),
        )
        exhausted_report = RawPdfFile.objects.create(
            center=self.center,
            state=RawPdfState.objects.create(
                anonymized=True,
                sensitive_meta_processed=True,
                processing_started=True,
                anonymization_validated=True,
            ),
            pdf_hash="report-hash-exhausted",
            file=ContentFile(b"%PDF-1.4\nraw2\n%%EOF\n", name="raw2.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed2\n%%EOF\n", name="processed2.pdf"
            ),
        )
        exhausted = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=exhausted_report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__failed-exhausted__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.FAILED,
            retry_count=2,
            last_error="Hub transfer media upload failed: timeout",
            last_attempt_at=timezone.now() - timedelta(minutes=5),
        )

        with self.captureOnCommitCallbacks(execute=True):
            summary = recover_stale_outbound_transfer_jobs(
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        retryable.refresh_from_db()
        exhausted.refresh_from_db()
        self.assertEqual(summary["redispatched"], 1)
        self.assertEqual(
            retryable.local_status, OutboundHubTransferJob.LocalStatus.QUEUED
        )
        self.assertEqual(
            exhausted.local_status, OutboundHubTransferJob.LocalStatus.FAILED
        )
        delay_mock.assert_called_once_with(str(retryable.pk), self.site_node.node_key)
