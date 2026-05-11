from __future__ import annotations

from unittest.mock import MagicMock, patch

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from lx_annotate.hub.hub_export_worker import run_outbound_transfer_job
from lx_annotate.models import OutboundHubTransferJob


class HubExportCleanupPolicyTests(TestCase):
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
            pdf_hash="report-hash-cleanup-1",
            file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="report-cleanup-1.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed\n%%EOF\n",
                name="report-cleanup-1-processed.pdf",
            ),
        )

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_completed_transfer_retains_processed_media_by_default(
        self,
        post_mock: MagicMock,
    ) -> None:
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-cleanup-1__processed_v1",
        )
        register_response = MagicMock()
        register_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "awaiting_media",
            "processing_decision": "wait_for_missing_media",
            "status_detail": "",
        }
        register_response.raise_for_status.return_value = None
        upload_response = MagicMock()
        upload_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "applied",
            "processing_decision": "skip_processing_preserved_state",
            "status_detail": "",
        }
        upload_response.raise_for_status.return_value = None
        post_mock.side_effect = [register_response, upload_response]

        result = run_outbound_transfer_job(
            outbound_job_id=str(job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_cleanup_policy,
            OutboundHubTransferJob.LocalCleanupPolicy.RETAIN_PROCESSED_MEDIA,
        )
        self.assertEqual(
            result.local_cleanup_status,
            OutboundHubTransferJob.LocalCleanupStatus.RETAINED,
        )
        self.assertIsNone(result.local_cleanup_eligible_at)

    @override_settings(
        LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY="eligible_after_verified_apply"
    )
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_completed_transfer_can_mark_local_artifact_cleanup_eligible(
        self,
        post_mock: MagicMock,
    ) -> None:
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-cleanup-1__processed_v1",
            local_cleanup_policy=(
                OutboundHubTransferJob.LocalCleanupPolicy.ELIGIBLE_AFTER_VERIFIED_APPLY
            ),
        )
        register_response = MagicMock()
        register_response.json.return_value = {
            "id": "remote-transfer-2",
            "transfer_status": "awaiting_media",
            "processing_decision": "wait_for_missing_media",
            "status_detail": "",
        }
        register_response.raise_for_status.return_value = None
        upload_response = MagicMock()
        upload_response.json.return_value = {
            "id": "remote-transfer-2",
            "transfer_status": "applied",
            "processing_decision": "skip_processing_preserved_state",
            "status_detail": "",
        }
        upload_response.raise_for_status.return_value = None
        post_mock.side_effect = [register_response, upload_response]

        result = run_outbound_transfer_job(
            outbound_job_id=str(job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_cleanup_status,
            OutboundHubTransferJob.LocalCleanupStatus.ELIGIBLE,
        )
        self.assertIsNotNone(result.local_cleanup_eligible_at)
