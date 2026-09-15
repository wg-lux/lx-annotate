from __future__ import annotations

import base64
import hashlib
import os
from datetime import timedelta
from unittest.mock import patch

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
from endoreg_db.services import video_segment_validation_workflow as segment_workflow

from lx_annotate.hub.hub_export_jobs import build_hub_export_overview
from lx_annotate.hub.hub_export_state import resolve_video_hub_export_state
from lx_annotate.models import OutboundHubTransferJob, StorageArtifactPublication
from tests.hub_payload_helpers import verify_hub_report_artifact

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


class HubExportHookTests(TestCase):
    def setUp(self) -> None:
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
            ],
        )

        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        publication = StorageArtifactPublication.objects.get(raw_pdf_file=report)
        self.assertEqual(
            publication.processed_sha256,
            report_state.processed_file_sha256,
        )
        self.assertEqual(
            publication.processed_file_name,
            report.processed_file.name,
        )
        self.assertEqual(publication.status, "pending")
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
                b"processed-video",
                name="video-1-processed.mp4",
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
            ],
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
                b"processed-video",
                name="video-cleanup-pending-processed.mp4",
            ),
        )
        VideoProcessingHistory.objects.create(
            video=video,
            operation=VideoProcessingHistory.OPERATION_REPROCESSING,
            status=VideoProcessingHistory.STATUS_PENDING,
            task_id="cleanup-pending",
            config=segment_workflow.blackening_history_config(only_validated=False),
        )

        overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)
        self.assertFalse(video_item["eligible"])
        self.assertEqual(video_item["blocked_reason"], "segment cleanup pending")

    def test_video_missing_transfer_hashes_is_not_eligible(self):
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
            video_hash="video-hash-missing-transfer-hashes",
            original_file_name="video-missing-transfer-hashes.mp4",
            processed_file=ContentFile(
                b"processed-video",
                name="video-missing-transfer-hashes-processed.mp4",
            ),
        )

        overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)

        self.assertFalse(video_item["eligible"])
        self.assertEqual(video_item["blocked_reason"], "processed media hash missing")

    def test_video_matching_transfer_hashes_is_eligible(self):
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
            video_hash="video-hash-transfer-ready",
            processed_video_hash=processed_hash,
            original_file_name="video-transfer-ready.mp4",
            processed_file=ContentFile(
                b"processed-video",
                name="video-transfer-ready-processed.mp4",
            ),
        )

        with patch(
            "lx_annotate.hub.hub_export_state.sha256_file",
            side_effect=AssertionError("overview must not hash processed media"),
        ):
            overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)

        self.assertTrue(video_item["eligible"])
        self.assertEqual(video_item["blocked_reason"], "")
        self.assertEqual(video_item["segment_annotation_status"], "validated")
        self.assertEqual(video_item["export_integrity_status"], "persisted_verified")

    def test_video_hash_metadata_mismatch_is_typed_in_overview(self):
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
            video_hash="video-hash-metadata-mismatch-overview",
            processed_video_hash="b" * 64,
            original_file_name="video-metadata-mismatch-overview.mp4",
            processed_file=ContentFile(
                b"processed-video",
                name="video-metadata-mismatch-overview-processed.mp4",
            ),
        )

        overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)

        self.assertFalse(video_item["eligible"])
        self.assertEqual(
            video_item["export_integrity_status"],
            "hash_metadata_mismatch",
        )
        self.assertEqual(
            video_item["blocked_reason"],
            "processed media hash metadata mismatch",
        )

    def test_physical_hash_mismatch_is_checked_only_at_transfer_boundary(self):
        persisted_hash = "a" * 64
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
            processed_file_sha256=persisted_hash,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=video_state,
            video_hash="video-hash-physical-mismatch-overview",
            processed_video_hash=persisted_hash,
            original_file_name="video-physical-mismatch-overview.mp4",
            processed_file=ContentFile(
                b"different-processed-video",
                name="video-physical-mismatch-overview-processed.mp4",
            ),
        )

        overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)
        transfer_readiness = resolve_video_hub_export_state(
            video,
            verify_processed_media=True,
        )

        self.assertEqual(video_item["export_integrity_status"], "persisted_verified")
        self.assertEqual(
            transfer_readiness.export_integrity_status,
            "processed_media_hash_mismatch",
        )
        self.assertFalse(transfer_readiness.transfer_eligible)

    def test_video_final_cleanup_still_requires_processed_media(self):
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            anonymization_validated=True,
            processing_started=True,
            outside_segments_removed=True,
            segment_annotations_created=True,
            segment_annotations_validated=True,
            processed_file_sha256="",
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=video_state,
            video_hash="video-hash-not-ready",
            original_file_name="video-not-ready.mp4",
        )

        overview = build_hub_export_overview(target_node=self.hub_node)
        video_item = next(item for item in overview["items"] if item["id"] == video.pk)
        self.assertFalse(video_item["eligible"])
        self.assertEqual(video_item["blocked_reason"], "processed media missing")
