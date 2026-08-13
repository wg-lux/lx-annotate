# pyright: reportAttributeAccessIssue=false, reportIndexIssue=false
from __future__ import annotations

import base64
import hashlib
import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.utils import timezone
from endoreg_db.models import (
    Center,
    NetworkNode,
    RawPdfFile,
    RawPdfState,
    VideoFile,
    VideoState,
)

from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import verify_hub_report_artifact

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")
User = get_user_model()

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


class HubExportApiTests(TestCase):
    def setUp(self) -> None:
        self.operator = User.objects.create_user(username="hub-operator")
        self.client.force_login(self.operator)
        self.center = Center.objects.create(
            name="Test Center",
            center_key="test-center",
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
            name="Empty Center",
            center_key="empty-center",
        )
        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["config_ready"])
        self.assertEqual(payload["selected_target_node_key"], "hub-node")
        self.assertEqual(payload["source_node_key"], "site-node")
        self.assertEqual(len(payload["items"]), 1)
        self.assertTrue(payload["items"][0]["eligible"])
        self.assertEqual(
            payload["items"][0]["segment_annotation_status"],
            "not_started",
        )
        self.assertEqual(
            payload["items"][0]["export_integrity_status"],
            "persisted_verified",
        )
        self.assertFalse(payload["items"][0]["marked_for_upload"])
        self.assertIsNone(payload["items"][0]["marked_by_username"])
        self.assertIsNone(payload["items"][0]["marked_at"])
        self.assertEqual(payload["privacy_summary"]["min_k"], 5)
        self.assertEqual(payload["privacy_summary"]["eligible_resource_count"], 1)
        self.assertEqual(
            payload["privacy_summary"]["smallest_equivalence_class_size"],
            1,
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
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).count(),
            1,
        )
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        self.assertEqual(job.marked_by, self.operator)

        overview_response = self.client.get("/api/hub-export/overview/")
        overview_payload = overview_response.json()
        self.assertTrue(overview_payload["items"][0]["marked_for_upload"])
        self.assertEqual(
            overview_payload["items"][0]["marked_by_username"],
            self.operator.get_username(),
        )
        self.assertEqual(
            overview_payload["items"][0]["marked_at"],
            job.marked_at.isoformat(),
        )
        self.assertEqual(len(overview_payload["sync_summary"]["duplicates"]), 1)
        self.assertEqual(
            overview_payload["sync_summary"]["duplicates"][0]["reason"],
            "transfer_already_registered",
        )

        unmark_response = self.client.post(
            "/api/hub-export/unmark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(unmark_response.status_code, 200)
        self.assertEqual(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).count(),
            0,
        )

    def test_mark_rejects_client_supplied_operator_identity(self) -> None:
        response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "marked_by": "client-supplied-actor",
                "resources": [
                    {"id": self.report.id, "resource_kind": "report"},
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

    def test_overview_exposes_typed_failure_class_for_operator_triage(self) -> None:
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        job.failure_class = OutboundHubTransferJob.FailureClass.AUTHORIZATION_DENIAL
        job.last_error = (
            "Hub transfer authorization denied for /protected/clinical/report.pdf "
            "with secret super-secret."
        )
        job.save(update_fields=["local_status", "failure_class", "last_error"])

        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertEqual(item["failure_class"], "authorization_denial")
        self.assertEqual(item["last_error"], "Hub transfer authorization was denied.")
        self.assertNotIn("super-secret", item["last_error"])
        self.assertNotIn("/protected/clinical", item["last_error"])

    def test_hub_export_operator_endpoints_require_authentication(self):
        self.client.logout()

        for method, path, data in (
            ("get", "/api/hub-export/overview/", None),
            (
                "post",
                "/api/hub-export/mark/",
                {
                    "target_node_key": "hub-node",
                    "resources": [{"id": self.report.id, "resource_kind": "report"}],
                },
            ),
            (
                "post",
                "/api/hub-export/unmark/",
                {
                    "target_node_key": "hub-node",
                    "resources": [{"id": self.report.id, "resource_kind": "report"}],
                },
            ),
        ):
            response = getattr(self.client, method)(
                path,
                data=data,
                content_type="application/json" if data is not None else None,
            )
            self.assertIn(response.status_code, {401, 403})

    def test_hub_export_rejects_camel_case_request_aliases(self) -> None:
        resource_alias_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resourceKind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(resource_alias_response.status_code, 400)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

        NetworkNode.objects.create(
            display_name="Second Hub Node",
            node_key="hub-node-2",
            role=NetworkNode.Role.CENTRAL_HUB,
            base_url="https://hub-2.example/",
            owning_center=self.center,
        )
        target_alias_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "targetNodeKey": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(target_alias_response.status_code, 400)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

    def test_bulk_mark_is_atomic_when_one_resource_is_invalid(self):
        response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [
                    {"id": self.report.id, "resource_kind": "report"},
                    {"id": 999999, "resource_kind": "report"},
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

    def test_bulk_unmark_is_atomic_and_only_marked_jobs_are_reversible(self):
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)

        failed_unmark = self.client.post(
            "/api/hub-export/unmark/",
            data={
                "target_node_key": "hub-node",
                "resources": [
                    {"id": self.report.id, "resource_kind": "report"},
                    {"id": self.report.id, "resource_kind": "unsupported"},
                ],
            },
            content_type="application/json",
        )
        self.assertEqual(failed_unmark.status_code, 400)
        self.assertTrue(OutboundHubTransferJob.objects.filter(pk=job.pk).exists())

        job.local_status = OutboundHubTransferJob.LocalStatus.QUEUED
        job.save(update_fields=["local_status", "updated_at"])
        queued_unmark = self.client.post(
            "/api/hub-export/unmark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(queued_unmark.status_code, 200)
        self.assertEqual(queued_unmark.json()["unmarked_count"], 0)
        self.assertTrue(OutboundHubTransferJob.objects.filter(pk=job.pk).exists())

    def test_mark_history_remains_visible_to_another_operator(self):
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)

        reviewing_operator = User.objects.create_user(username="reviewing-operator")
        self.client.force_login(reviewing_operator)
        overview = self.client.get("/api/hub-export/overview/")

        self.assertEqual(overview.status_code, 200)
        item = overview.json()["items"][0]
        self.assertEqual(item["marked_by_username"], self.operator.get_username())
        self.assertIsNotNone(item["marked_at"])

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=True)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_mark_dispatches_secure_transfer_worker(self, delay_mock):
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/hub-export/mark/",
                data={
                    "target_node_key": "hub-node",
                    "resources": [{"id": self.report.id, "resource_kind": "report"}],
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=False)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_bulk_video_offload_fresh_verifies_and_explicitly_queues(self, delay_mock):
        processed_content = b"eligible-anonymized-video"
        processed_hash = hashlib.sha256(processed_content).hexdigest()
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
            outside_segments_removed=True,
            segment_annotations_created=True,
            segment_annotations_validated=True,
            ready_for_export=True,
            ready_for_export_at=timezone.now(),
            ready_for_export_by="test-suite",
            processed_file_sha256=processed_hash,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=video_state,
            video_hash="eligible-video-hash",
            processed_video_hash=processed_hash,
            original_file_name="eligible-video.mp4",
            processed_file=ContentFile(processed_content, name="eligible-video.mp4"),
        )
        VideoFile.objects.create(
            center=self.center,
            video_hash="ineligible-video-hash",
            original_file_name="ineligible-video.mp4",
        )

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/hub-export/offload-eligible-videos/",
                data={"target_node_key": "hub-node"},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "target_node_key": "hub-node",
                "discovered_count": 2,
                "eligible_count": 1,
                "queued_count": 1,
                "already_registered_count": 0,
                "skipped_count": 1,
            },
        )
        job = OutboundHubTransferJob.objects.get(video_file=video)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        self.assertEqual(job.marked_by, self.operator)
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
