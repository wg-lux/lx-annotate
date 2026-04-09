from __future__ import annotations

from datetime import timedelta

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
from lx_annotate.hub.hub_export_jobs import build_hub_export_overview
from lx_annotate.models import OutboundHubTransferJob


class HubExportHookTests(TestCase):
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

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=True)
    def test_report_becomes_visible_and_queued_when_state_turns_eligible(self):
        report_state = RawPdfState.objects.create(processing_started=True)
        report = RawPdfFile.objects.create(
            center=self.center,
            state=report_state,
            pdf_hash="report-hash-1",
            file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="report-1.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed\n%%EOF\n",
                name="report-1-processed.pdf",
            ),
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-1__processed_v1",
        )

        report_state.anonymized = True
        report_state.sensitive_meta_processed = True
        report_state.save(
            update_fields=["anonymized", "sensitive_meta_processed", "date_modified"]
        )

        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        overview = build_hub_export_overview(target_node=self.hub_node)
        self.assertTrue(overview["items"][0]["eligible"])

    def test_video_inflight_job_fails_when_state_turns_ineligible(self):
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=video_state,
            video_hash="video-hash-1",
            original_file_name="video-1.mp4",
            processed_file=ContentFile(
                b"processed-video", name="video-1-processed.mp4"
            ),
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__video__video-hash-1__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.UPLOADING,
            last_attempt_at=timezone.now() - timedelta(minutes=5),
        )

        video_state.anonymized = False
        video_state.sensitive_meta_processed = False
        video_state.anonymization_validated = False
        video_state.processing_started = False
        video_state.save(
            update_fields=[
                "anonymized",
                "sensitive_meta_processed",
                "anonymization_validated",
                "processing_started",
                "date_modified",
            ]
        )

        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertIn("not currently eligible", job.last_error)
