from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.test import TestCase

from endoreg_db.models import Center, NetworkNode, RawPdfFile, VideoFile
from lx_annotate.models import OutboundHubTransferJob


User = get_user_model()


class OutboundHubTransferJobTests(TestCase):
    def setUp(self) -> None:
        self.center = Center.objects.create(
            name="Test Center", center_key="test-center"
        )
        self.hub_node = NetworkNode.objects.create(
            display_name="Hub Node",
            node_key="hub-node",
            role=NetworkNode.Role.CENTRAL_HUB,
            owning_center=self.center,
        )
        self.site_node = NetworkNode.objects.create(
            display_name="Site Node",
            node_key="site-node",
            role=NetworkNode.Role.SITE_NODE,
            owning_center=self.center,
        )
        self.user = User.objects.create(username="operator")
        self.video = VideoFile.objects.create(
            center=self.center,
            video_hash="video-hash-1",
            original_file_name="video-1.mp4",
        )
        self.report = RawPdfFile.objects.create(
            center=self.center,
            pdf_hash="report-hash-1",
            file=ContentFile(b"%PDF-1.4\n%%EOF\n", name="report-1.pdf"),
        )

    def test_accepts_video_transfer_with_central_hub_target(self):
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=self.video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__video__video-hash-1__processed_v1",
            marked_by=self.user,
        )

        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.MARKED)

    def test_rejects_video_transfer_without_video_file(self):
        job = OutboundHubTransferJob(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__video__missing__processed_v1",
            marked_by=self.user,
        )

        with self.assertRaises(ValidationError):
            job.full_clean()

    def test_rejects_non_hub_target_node(self):
        job = OutboundHubTransferJob(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.site_node,
            transfer_key="site-node__report__report-hash-1__processed_v1",
            marked_by=self.user,
        )

        with self.assertRaises(ValidationError):
            job.full_clean()

    def test_rejects_non_processed_media_transfer_mode(self):
        job = OutboundHubTransferJob(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-1__processed_v1",
            transfer_mode="metadata_only",
            marked_by=self.user,
        )

        with self.assertRaises(ValidationError):
            job.full_clean()
