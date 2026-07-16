# pyright: reportAttributeAccessIssue=false
from __future__ import annotations

import hashlib
from unittest.mock import MagicMock, patch

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
from lx_annotate.hub.hub_export_worker import run_outbound_transfer_job
from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import (
    create_hub_sensitive_meta,
    verify_hub_report_artifact,
)


@override_settings(LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=False)
class HubExportEndToEndTests(TestCase):
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

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_report_mark_then_transfer_completes(self, post_mock: MagicMock) -> None:
        report_state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        report = RawPdfFile.objects.create(
            center=self.center,
            state=report_state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            pdf_hash="report-hash-1",
            anonymized_text="Anonymized report text",
            file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="report-1.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed\n%%EOF\n",
                name="report-1-processed.pdf",
            ),
        )
        verify_hub_report_artifact(report)
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "targetNodeKey": "hub-node",
                "resources": [{"id": report.id, "resourceKind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)

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

        job = OutboundHubTransferJob.objects.get(raw_pdf_file=report)
        result = run_outbound_transfer_job(
            outbound_job_id=str(job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status, OutboundHubTransferJob.LocalStatus.COMPLETED
        )
        self.assertEqual(result.remote_transfer_status, "applied")

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_video_mark_then_transfer_completes(self, post_mock: MagicMock) -> None:
        processed_hash = hashlib.sha256(b"processed-video").hexdigest()
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            anonymization_validated=True,
            processing_started=True,
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
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            video_hash="video-hash-1",
            processed_video_hash=processed_hash,
            original_file_name="video-1.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                b"processed-video", name="video-1-processed.mp4"
            ),
        )
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "targetNodeKey": "hub-node",
                "resources": [{"id": video.id, "resourceKind": "video"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)

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

        job = OutboundHubTransferJob.objects.get(video_file=video)
        result = run_outbound_transfer_job(
            outbound_job_id=str(job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status, OutboundHubTransferJob.LocalStatus.COMPLETED
        )
        self.assertEqual(result.remote_transfer_status, "applied")
