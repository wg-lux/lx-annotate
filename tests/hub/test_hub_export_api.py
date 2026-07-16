# pyright: reportAttributeAccessIssue=false, reportIndexIssue=false
from __future__ import annotations

from django.core.files.base import ContentFile
from django.test import TestCase
from django.test import override_settings
from unittest.mock import patch

from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import verify_hub_report_artifact

import base64
import os

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


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
        verify_hub_report_artifact(self.report)

    def test_hub_export_overview_lists_eligible_items(self):
        empty_center = Center.objects.create(
            name="Empty Center", center_key="empty-center"
        )
        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["config_ready"])
        self.assertEqual(payload["selected_target_node_key"], "hub-node")
        self.assertEqual(payload["source_node_key"], "site-node")
        self.assertEqual(len(payload["items"]), 1)
        self.assertTrue(payload["items"][0]["eligible"])
        self.assertFalse(payload["items"][0]["marked_for_upload"])
        self.assertEqual(payload["privacy_summary"]["min_k"], 5)
        self.assertEqual(payload["privacy_summary"]["eligible_resource_count"], 1)
        self.assertEqual(
            payload["privacy_summary"]["smallest_equivalence_class_size"], 1
        )
        self.assertFalse(payload["privacy_summary"]["passes_k_anonymity"])
        sync_summary = payload["sync_summary"]
        self.assertEqual(sync_summary["processed_file_count"], 1)
        self.assertEqual(sync_summary["candidate_count"], 1)
        self.assertEqual(sync_summary["rejections"], [])
        self.assertEqual(sync_summary["duplicates"], [])
        centers_by_key = {
            center["center_key"]: center for center in sync_summary["centers"]
        }
        self.assertIn(empty_center.center_key, centers_by_key)
        self.assertEqual(centers_by_key[empty_center.center_key]["processed_files"], [])
        self.assertEqual(
            centers_by_key[self.center.center_key]["active_node_keys"],
            ["hub-node", "site-node"],
        )

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
        overview_payload = overview_response.json()
        self.assertTrue(overview_payload["items"][0]["marked_for_upload"])
        self.assertEqual(len(overview_payload["sync_summary"]["duplicates"]), 1)
        self.assertEqual(
            overview_payload["sync_summary"]["duplicates"][0]["reason"],
            "transfer_already_registered",
        )

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

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=True)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_mark_dispatches_secure_transfer_worker(self, delay_mock):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/hub-export/mark/",
                data={
                    "targetNodeKey": "hub-node",
                    "resources": [{"id": self.report.id, "resourceKind": "report"}],
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)

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
