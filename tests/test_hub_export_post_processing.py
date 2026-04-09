from __future__ import annotations

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from lx_annotate.hub.hub_export_jobs import build_hub_export_overview
from lx_annotate.models import OutboundHubTransferJob


class HubExportPostProcessingTests(TestCase):
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
            anonymized=False,
            sensitive_meta_processed=False,
            processing_started=False,
        )
        self.report = RawPdfFile.objects.create(
            center=self.center,
            state=self.report_state,
            pdf_hash="report-hash-pp-1",
            file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="report-pp-1.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed\n%%EOF\n",
                name="report-pp-1-processed.pdf",
            ),
        )

    def test_overview_reflects_eligibility_after_state_transition(self):
        before = build_hub_export_overview(target_node=self.hub_node)
        self.assertFalse(before["items"][0]["eligible"])

        self.report_state.anonymized = True
        self.report_state.sensitive_meta_processed = True
        self.report_state.processing_started = True
        self.report_state.save()

        after = build_hub_export_overview(target_node=self.hub_node)
        self.assertTrue(after["items"][0]["eligible"])

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=True)
    def test_marked_job_is_auto_queued_when_resource_becomes_eligible(self):
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-pp-1__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.MARKED,
        )

        self.report_state.anonymized = True
        self.report_state.sensitive_meta_processed = True
        self.report_state.processing_started = True
        self.report_state.save()

        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        self.assertIsNotNone(job.queued_at)

    def test_inflight_job_fails_when_resource_becomes_ineligible(self):
        self.report_state.anonymized = True
        self.report_state.sensitive_meta_processed = True
        self.report_state.processing_started = True
        self.report_state.save()

        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-pp-1__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.UPLOADING,
        )

        self.report_state.anonymized = False
        self.report_state.sensitive_meta_processed = False
        self.report_state.processing_started = True
        self.report_state.save()

        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertIn("not currently eligible", job.last_error)
