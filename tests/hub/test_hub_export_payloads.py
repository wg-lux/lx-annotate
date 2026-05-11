from __future__ import annotations

import base64
import os

from django.core.files.base import ContentFile
from django.test import TestCase

from endoreg_db.models import (
    Center,
    NetworkNode,
    RawPdfFile,
    RawPdfState,
    VideoFile,
    VideoState,
)
from lx_annotate.hub.hub_export_payloads import (
    build_transfer_payload,
    validate_transfer_payload,
)
from lx_annotate.models import OutboundHubTransferJob

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


class HubExportPayloadTests(TestCase):
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
            owning_center=self.center,
        )

    def test_builds_and_validates_video_transfer_payload(self):
        state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            anonymization_validated=True,
            processing_started=True,
            frames_extracted=True,
            outside_segments_removed=True,
            segment_annotations_created=True,
            segment_annotations_validated=True,
            ready_for_export=True,
            processed_file_sha256="a" * 64,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=state,
            video_hash="video-hash-1",
            processed_video_hash="processed-video-hash-1",
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
        )

        payload = build_transfer_payload(outbound_job=job, source_node=self.site_node)

        self.assertEqual(payload["resource_kind"], "video")
        self.assertEqual(payload["resource_hash"], "video-hash-1")
        self.assertEqual(
            payload["transfer_mode"],
            OutboundHubTransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA,
        )

        validated = validate_transfer_payload(payload)
        self.assertEqual(validated["source_node"].node_key, "site-node")
        self.assertEqual(validated["target_node"].node_key, "hub-node")

    def test_builds_and_validates_report_transfer_payload(self):
        state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
        )
        report = RawPdfFile.objects.create(
            center=self.center,
            state=state,
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

        payload = build_transfer_payload(outbound_job=job, source_node=self.site_node)

        self.assertEqual(payload["resource_kind"], "report")
        self.assertEqual(payload["resource_hash"], "report-hash-1")

        validated = validate_transfer_payload(payload)
        self.assertEqual(validated["source_node"].node_key, "site-node")
        self.assertEqual(validated["target_node"].node_key, "hub-node")

    def test_rejects_non_anonymized_video_before_network_request(self):
        state = VideoState.objects.create(
            processing_started=True,
            anonymized=False,
            sensitive_meta_processed=False,
            frames_extracted=False,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=state,
            video_hash="video-hash-2",
            processed_video_hash="processed-video-hash-2",
            original_file_name="video-2.mp4",
            processed_file=ContentFile(
                b"processed-video", name="video-2-processed.mp4"
            ),
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__video__video-hash-2__processed_v1",
        )

        with self.assertRaisesMessage(ValueError, "not eligible"):
            build_transfer_payload(outbound_job=job, source_node=self.site_node)
