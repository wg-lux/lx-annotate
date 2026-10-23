# pyright: reportTypedDictNotRequiredAccess=false
from __future__ import annotations

import base64
import hashlib
import os
import secrets
from datetime import timedelta
from unittest.mock import patch

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.utils import timezone
from endoreg_db.exceptions import MediaOperationDeferred
from endoreg_db.models import (
    Center,
    Frame,
    ImageClassificationAnnotation,
    InformationSource,
    Label,
    LabelVideoSegment,
    NetworkNode,
    PatientExaminationReport,
    RawPdfFile,
    RawPdfState,
    VideoFile,
    VideoState,
)
from endoreg_db.models.media.operation_lease import MediaOperationLease
from endoreg_db.utils.hashs import get_hub_record_pseudonym

from lx_annotate.hub.hub_export_payloads import (
    build_hub_identity_payload,
    build_transfer_payload,
    validate_transfer_payload,
)
from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import (
    create_hub_sensitive_meta,
    hub_report_pdf_bytes,
    hub_video_artifact,
    verify_hub_report_artifact,
)

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


@override_settings(DJANGO_SALT=secrets.token_hex(32))
class HubExportPayloadTests(TestCase):
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
            owning_center=self.center,
        )

    def _assert_transfer_payload_persists(self, payload):
        validated = validate_transfer_payload(payload)
        return validated

    def test_identity_retries_preserve_persisted_uuids(self):
        meta = create_hub_sensitive_meta(center=self.center)
        first = build_hub_identity_payload(meta, hub_node_key=self.hub_node.node_key)
        meta.refresh_from_db()
        assert (
            build_hub_identity_payload(meta, hub_node_key=self.hub_node.node_key)
            == first
        )
        assert first == {
            "patient_uuid": str(
                get_hub_record_pseudonym(
                    meta.pseudo_patient.uuid,
                    kind="patient",
                    hub_node_key=self.hub_node.node_key,
                )
            ),
            "examination_uuid": str(
                get_hub_record_pseudonym(
                    meta.pseudo_examination.uuid,
                    kind="examination",
                    hub_node_key=self.hub_node.node_key,
                )
            ),
        }
        # Local persisted UUIDs stay on the site.
        assert str(meta.pseudo_patient.uuid) not in first.values()
        assert str(meta.pseudo_examination.uuid) not in first.values()

    def test_builds_and_validates_video_transfer_payload(self):
        source_hash, processed_bytes = hub_video_artifact()
        processed_hash = hashlib.sha256(processed_bytes).hexdigest()
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
            raw_video_hash=source_hash,
            processed_video_hash=processed_hash,
            original_file_name="video-1.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                processed_bytes,
                name="video-1-processed.mp4",
            ),
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key=f"site-node__video__{source_hash}__processed_v1",
        )

        payload = build_transfer_payload(outbound_job=job, source_node=self.site_node)

        self.assertEqual(payload["resource_kind"], "video")
        self.assertEqual(payload["resource_hash"], source_hash)
        self.assertEqual(
            payload["transfer_mode"],
            OutboundHubTransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA,
        )
        rows = payload["resource_rows"]
        self.assertEqual(
            set(rows["sensitive_meta"]),
            {"patient_uuid", "examination_uuid"},
        )
        self.assertNotIn("original_file_name", rows["video_file"])
        self.assertNotIn("meta", rows["video_file"])
        self.assertTrue(rows["video_state"]["anonymization_validated"])
        self.assertEqual(payload["payload_schema_version"], "7.0")

        validated = self._assert_transfer_payload_persists(payload)
        self.assertEqual(validated["source_node"].node_key, "site-node")
        self.assertEqual(validated["target_node"].node_key, "hub-node")

        # An explicitly acknowledged legacy mapping survives the same sender contract.
        from endoreg_db.services.hub.video_provenance import (
            accept_video_provenance_recovery,
            export_video_provenance,
        )
        from lx_dtypes.models.contracts.video_provenance import (
            VideoProvenanceBundle,
            VideoProvenanceRecovery,
        )

        verified = export_video_provenance(video)
        assert isinstance(verified, VideoProvenanceBundle)
        recovery = VideoProvenanceRecovery(
            recording_hash=source_hash,
            original_timeline=verified.transformations[0].source,
            processed_timeline=verified.transformations[-1].output,
        )
        accept_video_provenance_recovery(video, recovery)
        video.save(update_fields=["meta"])
        recovered_payload = build_transfer_payload(
            outbound_job=job, source_node=self.site_node
        )
        self.assertNotIn("video_frame_provenance", recovered_payload["provenance"])
        self.assertFalse(
            recovered_payload["provenance"]["video_provenance_recovery"][
                "electrical_matching_eligible"
            ]
        )
        self._assert_transfer_payload_persists(recovered_payload)
        video.meta = {}
        video.save(update_fields=["meta"])

        # Reprocessing changes the exported artifact, never the import identity.
        original_pk = video.pk
        original_key = payload["transfer_key"]
        repeated_source_hash, reprocessed_bytes = hub_video_artifact(reprocessed=True)
        self.assertEqual(repeated_source_hash, source_hash)
        with self.assertRaises(MediaOperationDeferred):
            video.processed_file.save("reprocessed.mp4", ContentFile(reprocessed_bytes))
        MediaOperationLease.objects.filter(video_id=video.pk).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        video.processed_file.save("reprocessed.mp4", ContentFile(reprocessed_bytes))
        from endoreg_db.utils.hashs import get_file_hash

        video.processed_video_hash = get_file_hash(video.processed_file)
        video.save(update_fields=["processed_video_hash"])
        state = video.get_or_create_state()
        state.outside_segments_removed = True
        state.save(update_fields=["outside_segments_removed"])
        state.mark_ready_for_export(
            processed_file_sha256=video.processed_video_hash,
            ready_for_export_by="test-suite",
        )
        rebuilt = build_transfer_payload(outbound_job=job, source_node=self.site_node)
        self._assert_transfer_payload_persists(rebuilt)
        self.assertEqual(rebuilt["resource_hash"], video.raw_video_hash)
        self.assertEqual(rebuilt["transfer_key"], original_key)
        self.assertEqual(
            rebuilt["resource_rows"]["video_file"]["raw_video_hash"],
            video.raw_video_hash,
        )
        self.assertNotEqual(video.processed_video_hash, processed_hash)
        resolved = VideoFile.objects.get(raw_video_hash=source_hash, center=self.center)
        self.assertEqual(resolved.pk, original_pk)

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
            raw_video_hash="video-hash-inconsistent",
            processed_video_hash="b" * 64,
            original_file_name="video-inconsistent.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                b"processed-video",
                name="video-inconsistent-processed.mp4",
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

    def test_rejects_processed_video_file_hash_mismatch(self):
        persisted_hash = "a" * 64
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
            processed_file_sha256=persisted_hash,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            raw_video_hash="video-hash-file-mismatch",
            processed_video_hash=persisted_hash,
            original_file_name="video-file-mismatch.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                b"different-processed-video",
                name="video-file-mismatch-processed.mp4",
            ),
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key=("site-node__video__video-hash-file-mismatch__processed_v1"),
        )

        with self.assertRaisesMessage(ValueError, "file hash does not match"):
            build_transfer_payload(outbound_job=job, source_node=self.site_node)

    def test_rejects_unreadable_processed_video_as_typed_integrity_failure(self):
        processed_hash = hashlib.sha256(b"processed-video").hexdigest()
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
            processed_file_sha256=processed_hash,
        )
        video = VideoFile.objects.create(
            center=self.center,
            state=state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            raw_video_hash="video-hash-unreadable",
            processed_video_hash=processed_hash,
            original_file_name="video-unreadable.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                b"processed-video",
                name="video-unreadable-processed.mp4",
            ),
        )
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__video__unreadable__processed_v1",
        )

        with patch(
            "lx_annotate.hub.hub_export_state.get_file_hash",
            side_effect=OSError("disappeared"),
        ):
            with self.assertRaisesMessage(ValueError, "media is unreadable"):
                build_transfer_payload(outbound_job=job, source_node=self.site_node)

    def test_rejects_source_center_outside_source_node_ownership(self):
        other_center = Center.objects.create(
            name="Other Center",
            center_key="other-center",
        )
        state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        report = RawPdfFile.objects.create(
            center=other_center,
            state=state,
            sensitive_meta=create_hub_sensitive_meta(center=other_center),
            pdf_hash="report-hash-other-center",
            anonymized_text="Anonymized report text",
            file=ContentFile(hub_report_pdf_bytes("raw"), name="other-center.pdf"),
            processed_file=ContentFile(
                hub_report_pdf_bytes("processed"),
                name="other-center-processed.pdf",
            ),
        )
        verify_hub_report_artifact(report)
        job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=report,
            source_center=other_center,
            target_node=self.hub_node,
            transfer_key=("site-node__report__report-hash-other-center__processed_v1"),
        )
        payload = build_transfer_payload(outbound_job=job, source_node=self.site_node)

        with self.assertRaisesMessage(ValueError, "owning center"):
            validate_transfer_payload(payload)

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
            file=ContentFile(hub_report_pdf_bytes("raw"), name="report-1.pdf"),
            processed_file=ContentFile(
                hub_report_pdf_bytes("processed"),
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
            set(rows["sensitive_meta"]),
            {"patient_uuid", "examination_uuid"},
        )
        self.assertNotIn("text", rows["raw_pdf_file"])
        self.assertEqual(
            rows["raw_pdf_file"]["anonymized_text"],
            "Anonymized report text",
        )
        self.assertEqual(
            rows["raw_pdf_state"]["processed_file_sha256"],
            hashlib.sha256(hub_report_pdf_bytes("processed")).hexdigest(),
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
            raw_video_hash="video-hash-2",
            processed_video_hash="processed-video-hash-2",
            original_file_name="video-2.mp4",
            processed_file=ContentFile(
                b"processed-video",
                name="video-2-processed.mp4",
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
        source_hash, processed_bytes = hub_video_artifact()
        processed_hash = hashlib.sha256(processed_bytes).hexdigest()
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
            raw_video_hash=source_hash,
            processed_video_hash=processed_hash,
            original_file_name="Patient_Max_Mustermann.mp4",
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_file=ContentFile(
                processed_bytes,
                name="Patient_Max_Mustermann_processed.mp4",
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
        segment = LabelVideoSegment.objects.create(
            video_file=video,
            label=label,
            source=information_source,
            start_frame_number=5,
            end_frame_number=10,
            export_segment=True,
        )
        segment.mark_validated(information_source_name="manual_annotation")
        # Segment edits invalidate export readiness on the video's cached state.
        # Finalize that same state instance before serializing the fixture.
        state = video.state
        state.segment_annotations_created = True
        state.segment_annotations_validated = True
        state.outside_segments_removed = True
        state.ready_for_export = True
        state.ready_for_export_at = timezone.now()
        state.ready_for_export_by = "test-suite"
        state.processed_file_sha256 = processed_hash
        state.save(
            update_fields=[
                "segment_annotations_created",
                "segment_annotations_validated",
                "outside_segments_removed",
                "ready_for_export",
                "ready_for_export_at",
                "ready_for_export_by",
                "processed_file_sha256",
                "date_modified",
            ],
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
            transfer_key=f"site-node__video__{source_hash}__processed_v1",
        )

        payload = build_transfer_payload(outbound_job=job, source_node=self.site_node)
        rows = payload["resource_rows"]

        self.assertEqual(
            rows["frame_annotations"],
            [
                {
                    "annotation_id": positive.pk,
                    "raw_video_hash": source_hash,
                    "frame_number": 7,
                    "frame_relative_path": f"frames/{source_hash}/00000007.jpg",
                    "frame_timestamp": 0.28,
                    "label_name": "lesion_visible",
                    "value": True,
                    "float_value": 0.95,
                    "information_source_name": "manual_annotation",
                },
            ],
        )
        coordinates = rows["video_segments"][0]["timeline_coordinates"]
        self.assertEqual(
            (
                coordinates["generation"]["content_hash"],
                coordinates["generation"]["first_frame_number"],
                coordinates["generation"]["last_frame_number"],
            ),
            (processed_hash, 5, 9),
        )
        self.assertEqual(
            (coordinates["recording_mapping_status"], coordinates["recording"] is None),
            ("verified", False),
        )
        self.assertEqual(
            [
                {k: v for k, v in row.items() if k != "timeline_coordinates"}
                for row in rows["video_segments"]
            ],
            [
                {
                    "source_node_key": "site-node",
                    "source_segment_id": segment.pk,
                    "raw_video_hash": source_hash,
                    "start_frame_number": 5,
                    "end_frame_number_exclusive": 10,
                    "label_name": "lesion_visible",
                    "source_kind": "manual_annotation",
                    "validation_state": "validated",
                    "export_segment": True,
                    "anonymous_provenance": {
                        "information_source_name": "manual_annotation",
                    },
                },
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
                },
            ],
        )
        serialized = repr(rows)
        self.assertNotIn("Max Mustermann", serialized)
        self.assertNotIn("reviewer@example.org", serialized)
        self._assert_transfer_payload_persists(payload)
