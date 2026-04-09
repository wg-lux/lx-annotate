from __future__ import annotations

from django.core.files.base import ContentFile
from django.test import TestCase

from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from lx_annotate.models import OutboundHubTransferJob


class HubExportApiTests(TestCase):
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

    def test_hub_export_overview_lists_eligible_items(self):
        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["config_ready"])
        self.assertEqual(payload["selected_target_node_key"], "hub-node")
        self.assertEqual(payload["source_node_key"], "site-node")
        self.assertEqual(len(payload["items"]), 1)
        self.assertTrue(payload["items"][0]["eligible"])
        self.assertFalse(payload["items"][0]["marked_for_upload"])

    def test_mark_and_unmark_report_for_hub_upload(self):
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "targetNodeKey": "hub-node",
                "resources": [{"id": self.report.id, "resourceKind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).count(),
            1,
        )

        overview_response = self.client.get("/api/hub-export/overview/")
        self.assertTrue(overview_response.json()["items"][0]["marked_for_upload"])

        unmark_response = self.client.post(
            "/api/hub-export/unmark/",
            data={
                "targetNodeKey": "hub-node",
                "resources": [{"id": self.report.id, "resourceKind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(unmark_response.status_code, 200)
        self.assertEqual(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).count(),
            0,
        )

    def test_hub_export_overview_reports_not_ready_when_multiple_hubs_exist(self):
        NetworkNode.objects.create(
            display_name="Hub Node 2",
            node_key="hub-node-2",
            role=NetworkNode.Role.CENTRAL_HUB,
            base_url="https://hub-2.example/",
            owning_center=self.center,
        )

        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertFalse(payload["config_ready"])
        self.assertIn("exactly one active central hub node", payload["config_error"])
