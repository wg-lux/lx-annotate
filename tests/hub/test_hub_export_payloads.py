# pyright: reportTypedDictNotRequiredAccess=false
from __future__ import annotations

import hashlib

import base64
import os

from django.core.files.base import ContentFile
from django.test import TestCase
from django.utils import timezone

from endoreg_db.models import (
    Center,
    Frame,
    ImageClassificationAnnotation,
    InformationSource,
    Label,
    NetworkNode,
    PatientExaminationReport,
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
from tests.hub_payload_helpers import (
    create_hub_sensitive_meta,
    verify_hub_report_artifact,
)

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

    def _assert_transfer_payload_persists(self, payload):
        validated = validate_transfer_payload(payload)
        return validated

    def test_builds_and_validates_video_transfer_payload(self):
        processed_hash = hashlib.sha256(b"processed-video").hexdigest()
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
            ready_for_export_at=timezone.now(),
            ready_for_export_by="test-suite",
            processed_file_sha256=processed_hash,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=state,
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
        rows = payload["resource_rows"]
        self.assertEqual(
            set(rows["sensitive_meta"]), {"patient_hash", "examination_hash"}
        )
        self.assertNotIn("original_file_name", rows["video_file"])
        self.assertNotIn("meta", rows["video_file"])
        self.assertTrue(rows["video_state"]["anonymization_validated"])
        self.assertEqual(payload["payload_schema_version"], "2.0")

        validated = self._assert_transfer_payload_persists(payload)
        self.assertEqual(validated["source_node"].node_key, "site-node")
        self.assertEqual(validated["target_node"].node_key, "hub-node")

    def test_rejects_inconsistent_processed_video_hash_metadata(self):
        state = VideoState.objects.create(
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
            state=state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            video_hash="video-hash-inconsistent",
            processed_video_hash="b" * 64,
            original_file_name="video-inconsistent.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                b"processed-video", name="video-inconsistent-processed.mp4"
            ),
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__video__inconsistent__processed_v1",
        )

        with self.assertRaisesMessage(ValueError, "hash metadata is inconsistent"):
            build_transfer_payload(outbound_job=job, source_node=self.site_node)

    def test_builds_and_validates_report_transfer_payload(self):
        state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        report = RawPdfFile.objects.create(
            center=self.center,
            state=state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            pdf_hash="report-hash-1",
            text="Max Mustermann raw report text",
            anonymized_text="Anonymized report text",
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

        payload = build_transfer_payload(outbound_job=job, source_node=self.site_node)

        self.assertEqual(payload["resource_kind"], "report")
        self.assertEqual(payload["resource_hash"], "report-hash-1")
        rows = payload["resource_rows"]
        self.assertEqual(
            set(rows["sensitive_meta"]), {"patient_hash", "examination_hash"}
        )
        self.assertNotIn("text", rows["raw_pdf_file"])
        self.assertEqual(
            rows["raw_pdf_file"]["anonymized_text"], "Anonymized report text"
        )
        self.assertEqual(
            rows["raw_pdf_state"]["processed_file_sha256"],
            hashlib.sha256(b"%PDF-1.4\nprocessed\n%%EOF\n").hexdigest(),
        )

        validated = self._assert_transfer_payload_persists(payload)
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

    def test_serializes_positive_annotations_and_safe_final_report_metadata(self):
        processed_hash = hashlib.sha256(b"processed-video").hexdigest()
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
            ready_for_export_at=timezone.now(),
            ready_for_export_by="test-suite",
            processed_file_sha256=processed_hash,
        )
        sensitive_meta = create_hub_sensitive_meta(center=self.center)
        video = VideoFile.objects.create(
            center=self.center,
            state=state,
            sensitive_meta=sensitive_meta,
            examination=sensitive_meta.pseudo_examination,
            video_hash="video-hash-rows",
            processed_video_hash=processed_hash,
            original_file_name="Patient_Max_Mustermann.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                b"processed-video", name="Patient_Max_Mustermann_processed.mp4"
            ),
        )
        frame = Frame.objects.create(
            video=video,
            frame_number=7,
            relative_path="Patient_Max_Mustermann/frame_7.jpg",
            timestamp=0.28,
        )
        label = Label.objects.create(name="lesion_visible")
        information_source = InformationSource.objects.create(name="manual_annotation")
        positive = ImageClassificationAnnotation.objects.create(
            frame=frame,
            label=label,
            information_source=information_source,
            value=True,
            float_value=0.95,
            annotator="reviewer@example.org",
        )
        ImageClassificationAnnotation.objects.create(
            frame=frame,
            label=Label.objects.create(name="negative_label"),
            information_source=information_source,
            value=False,
            annotator="reviewer@example.org",
        )
        PatientExaminationReport.objects.create(
            patient_examination=sensitive_meta.pseudo_examination,
            template_name="star_upper_gi_main",
            template_version="2026.1",
            template_hash="template-hash",
            title="Patient Max Mustermann",
            status=PatientExaminationReport.Status.FINAL,
            editor_payload={"patient_name": "Max Mustermann"},
            rendered_text="Max Mustermann report text",
            version=2,
            is_active=True,
        )
        PatientExaminationReport.objects.create(
            patient_examination=sensitive_meta.pseudo_examination,
            template_name="draft-template",
            status=PatientExaminationReport.Status.DRAFT,
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__video__video-hash-rows__processed_v1",
        )

        payload = build_transfer_payload(outbound_job=job, source_node=self.site_node)
        rows = payload["resource_rows"]

        self.assertEqual(
            rows["frame_annotations"],
            [
                {
                    "annotation_id": positive.pk,
                    "video_hash": "video-hash-rows",
                    "frame_number": 7,
                    "frame_relative_path": "frames/video-hash-rows/00000007.jpg",
                    "frame_timestamp": 0.28,
                    "label_name": "lesion_visible",
                    "value": True,
                    "float_value": 0.95,
                    "information_source_name": "manual_annotation",
                }
            ],
        )
        self.assertEqual(
            rows["reports"],
            [
                {
                    "template_name": "star_upper_gi_main",
                    "template_version": "2026.1",
                    "template_hash": "template-hash",
                    "status": "final",
                    "version": 2,
                    "is_active": True,
                }
            ],
        )
        serialized = repr(rows)
        self.assertNotIn("Max Mustermann", serialized)
        self.assertNotIn("reviewer@example.org", serialized)
        self._assert_transfer_payload_persists(payload)
