from __future__ import annotations

import base64
import hashlib
import os
from datetime import timedelta

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.utils import timezone
from endoreg_db.models import Center, NetworkNode, VideoFile, VideoState
from endoreg_db.models.media.operation_lease import MediaOperationLease
from endoreg_db.utils.file_operations import safe_delete_field_file
from lx_dtypes.models.contracts.hub_media_envelope import HubMediaEnvelopeReceipt

from lx_annotate.hub.hub_export_cleanup import (
    HubExportCleanupBlocked,
    cleanup_verified_local_processed_video,
    configured_local_cleanup_policy,
)
from lx_annotate.models import OutboundHubTransferJob

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")
os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


class HubExportCleanupTests(TestCase):
    def setUp(self) -> None:
        self.center = Center.objects.create(name="Site", center_key="site-center")
        self.hub = NetworkNode.objects.create(
            display_name="Hub",
            node_key="hub-node",
            role=NetworkNode.Role.CENTRAL_HUB,
            base_url="https://hub.example/",
            owning_center=self.center,
        )
        payload = b"anonymized-processed-video"
        digest = hashlib.sha256(payload).hexdigest()
        state = VideoState.objects.create(
            processing_started=True,
            sensitive_meta_processed=True,
            anonymized=True,
            anonymization_validated=True,
            processed_file_sha256=digest,
        )
        self.video = VideoFile.objects.create(
            center=self.center,
            state=state,
            video_hash="video-resource-hash",
            processed_video_hash=digest,
            processed_file=ContentFile(payload, name="cleanup-processed.mp4"),
        )
        self.job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
            video_file=self.video,
            source_center=self.center,
            target_node=self.hub,
            transfer_key="site-node__video__video-resource-hash__processed_v1",
            local_status=OutboundHubTransferJob.LocalStatus.COMPLETED,
            remote_transfer_id="remote-transfer-id",
            remote_transfer_status="applied",
            local_cleanup_policy=(
                OutboundHubTransferJob.LocalCleanupPolicy.ELIGIBLE_AFTER_VERIFIED_APPLY
            ),
            local_cleanup_status=OutboundHubTransferJob.LocalCleanupStatus.ELIGIBLE,
            local_cleanup_eligible_at=timezone.now(),
            completed_at=timezone.now(),
            envelope_receipt=HubMediaEnvelopeReceipt(
                transfer_key="site-node__video__video-resource-hash__processed_v1",
                source_node_key="site-node",
                source_center_key="site-center",
                target_node_key="hub-node",
                resource_kind="video",
                resource_hash="video-resource-hash",
                processed_media_hash=digest,
                plaintext_sha256=digest,
                plaintext_size=len(payload),
                recipient_key_id="a" * 64,
                ciphertext_sha256="b" * 64,
                ciphertext_size=len(payload),
                envelope_fingerprint_sha256="c" * 64,
                receiver_transfer_id="remote-transfer-id",
                processing_decision="skip_processing_preserved_state",
            ).model_dump(mode="json"),
        )

    @override_settings(LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY="invalid")
    def test_invalid_cleanup_policy_fails_safe_to_retain(self) -> None:
        self.assertEqual(
            configured_local_cleanup_policy(),
            OutboundHubTransferJob.LocalCleanupPolicy.RETAIN_PROCESSED_MEDIA,
        )

    def test_dry_run_verifies_candidate_without_deleting(self) -> None:
        result = cleanup_verified_local_processed_video(
            outbound_job_id=str(self.job.pk),
            source_node_key="site-node",
        )

        self.video.refresh_from_db()
        self.job.refresh_from_db()
        self.assertEqual(result.candidate_bytes, len(b"anonymized-processed-video"))
        self.assertFalse(result.applied)
        self.assertTrue(self.video.processed_file.name)
        self.assertEqual(
            self.job.local_cleanup_status,
            OutboundHubTransferJob.LocalCleanupStatus.ELIGIBLE,
        )

    def test_apply_deletes_only_processed_copy_and_records_completion(self) -> None:
        raw_payload = b"raw-media-must-remain"
        self.video.raw_file = ContentFile(raw_payload, name="raw-remains.mp4")
        self.video.save(update_fields=["raw_file", "date_modified"])

        result = cleanup_verified_local_processed_video(
            outbound_job_id=str(self.job.pk),
            source_node_key="site-node",
            apply=True,
        )

        self.video.refresh_from_db()
        self.job.refresh_from_db()
        self.assertTrue(result.storage_object_deleted)
        self.assertFalse(self.video.processed_file.name)
        self.assertTrue(self.video.raw_file.name)
        self.assertEqual(
            self.job.local_cleanup_status,
            OutboundHubTransferJob.LocalCleanupStatus.CLEANED,
        )
        self.assertIsNotNone(self.job.local_cleanup_completed_at)

    def test_active_media_lease_blocks_before_mutation(self) -> None:
        MediaOperationLease.objects.create(
            video=self.video,
            lease_type=MediaOperationLease.LEASE_STREAM,
            expires_at=timezone.now() + timedelta(minutes=5),
            metadata={"file_type": "processed"},
        )

        with self.assertRaisesMessage(HubExportCleanupBlocked, "lease"):
            cleanup_verified_local_processed_video(
                outbound_job_id=str(self.job.pk),
                source_node_key="site-node",
                apply=True,
            )

        self.video.refresh_from_db()
        self.job.refresh_from_db()
        self.assertTrue(self.video.processed_file.name)
        self.assertEqual(
            self.job.local_cleanup_status,
            OutboundHubTransferJob.LocalCleanupStatus.ELIGIBLE,
        )

    def test_receipt_identity_mismatch_blocks_cleanup(self) -> None:
        receipt = dict(self.job.envelope_receipt)
        receipt["source_node_key"] = "another-site"
        OutboundHubTransferJob.objects.filter(pk=self.job.pk).update(
            envelope_receipt=receipt,
        )

        with self.assertRaisesMessage(HubExportCleanupBlocked, "source node"):
            cleanup_verified_local_processed_video(
                outbound_job_id=str(self.job.pk),
                source_node_key="site-node",
                apply=True,
            )

        self.video.refresh_from_db()
        self.assertTrue(self.video.processed_file.name)

    def test_cleaning_replay_finishes_after_storage_delete(self) -> None:
        self.job.local_cleanup_status = (
            OutboundHubTransferJob.LocalCleanupStatus.CLEANING
        )
        self.job.save(update_fields=["local_cleanup_status", "updated_at"])
        self.assertTrue(
            safe_delete_field_file(self.video.processed_file, missing_ok=False),
        )

        result = cleanup_verified_local_processed_video(
            outbound_job_id=str(self.job.pk),
            source_node_key="site-node",
            apply=True,
        )

        self.video.refresh_from_db()
        self.job.refresh_from_db()
        self.assertTrue(result.applied)
        self.assertFalse(result.storage_object_deleted)
        self.assertFalse(self.video.processed_file.name)
        self.assertEqual(
            self.job.local_cleanup_status,
            OutboundHubTransferJob.LocalCleanupStatus.CLEANED,
        )
