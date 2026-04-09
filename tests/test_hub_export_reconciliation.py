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
    @patch("lx_annotate.hub.hub_export_worker.requests.get")
    def test_recover_stale_outbound_transfer_jobs_marks_failed_when_status_check_fails(
        self,
        get_mock: MagicMock,
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

        summary = recover_stale_outbound_transfer_jobs(
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        job.refresh_from_db()
        self.assertEqual(summary["failed"], 1)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertIn("stale in-flight job", job.last_error)
