from __future__ import annotations

import base64
import os
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
    VideoProcessingHistory,
    VideoState,
)
from endoreg_db.models.state import video_segment_validation as segment_state
from lx_annotate.hub.hub_export_jobs import build_hub_export_overview
from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import verify_hub_report_artifact

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


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
        verify_hub_report_artifact(report)
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-1__processed_v1",
        )

        report_state.anonymized = True
        report_state.sensitive_meta_processed = True
        report_state.anonymization_validated = True
        report_state.save(
            update_fields=[
                "anonymized",
                "sensitive_meta_processed",
                "anonymization_validated",
                "date_modified",
            ]
        )

        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        overview = build_hub_export_overview(target_node=self.hub_node)
        self.assertTrue(overview["items"][0]["eligible"])

    def test_video_inflight_job_fails_when_state_turns_ineligible(self):
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
            processed_file_sha256="a" * 64,
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
        video_state.ready_for_export = False
        video_state.processed_file_sha256 = ""
        video_state.save(
            update_fields=[
                "anonymized",
                "sensitive_meta_processed",
                "anonymization_validated",
                "processing_started",
                "ready_for_export",
                "processed_file_sha256",
                "date_modified",
            ]
        )

        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertIn("not ready for export", job.last_error)

    def test_video_pending_segment_cleanup_is_not_eligible(self):
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            anonymization_validated=True,
            processing_started=True,
            outside_segments_removed=True,
            segment_annotations_created=True,
            segment_annotations_validated=False,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=video_state,
            video_hash="video-hash-cleanup-pending",
            original_file_name="video-cleanup-pending.mp4",
            processed_file=ContentFile(
                b"processed-video", name="video-cleanup-pending-processed.mp4"
            ),
        )
        VideoProcessingHistory.objects.create(
            video=video,
            operation=VideoProcessingHistory.OPERATION_REPROCESSING,
            status=VideoProcessingHistory.STATUS_PENDING,
            task_id="cleanup-pending",
            config=segment_state.blackening_history_config(only_validated=False),
        )

        overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)
        self.assertFalse(video_item["eligible"])
        self.assertEqual(video_item["blocked_reason"], "segment cleanup pending")

    def test_video_final_cleanup_still_requires_ready_for_export(self):
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            anonymization_validated=True,
            processing_started=True,
            outside_segments_removed=True,
            segment_annotations_created=True,
            segment_annotations_validated=True,
            ready_for_export=False,
            processed_file_sha256="",
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=video_state,
            video_hash="video-hash-not-ready",
            original_file_name="video-not-ready.mp4",
            processed_file=ContentFile(
                b"processed-video", name="video-not-ready-processed.mp4"
            ),
        )

        overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)
        self.assertFalse(video_item["eligible"])
        self.assertEqual(video_item["blocked_reason"], "not ready for export")
