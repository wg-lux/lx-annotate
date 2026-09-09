# pyright: reportAttributeAccessIssue=false, reportPrivateUsage=false
from __future__ import annotations

import base64
import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any, cast
from unittest.mock import MagicMock, patch
from urllib.parse import urlparse

import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.utils import timezone
from endoreg_db.models import (
    Center,
    NetworkNode,
    PortalUserInfo,
    RawPdfFile,
    RawPdfState,
    TransferJob,
    VideoFile,
    VideoState,
)
from endoreg_db.serializers.hub.transfer_job import TransferJobCreateSerializer
from endoreg_db.utils.file_operations import sha256_file
from lx_dtypes.models.contracts.hub_media_envelope import (
    HubMediaEnvelopeMetadata,
    HubMediaEnvelopeReceipt,
)

from lx_annotate.hub.hub_export_payloads import build_transfer_payload
from lx_annotate.hub.hub_export_worker import (
    CiphertextUploadStream,
    run_outbound_transfer_job,
)
from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import (
    create_hub_sensitive_meta,
    hub_transfer_status_payload,
    verify_hub_report_artifact,
)

User = cast(Any, get_user_model())
TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")


@override_settings(LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=False)
class HubExportEndToEndTests(TestCase):
    """Exercise sender/receiver contracts without pretending one DB is two nodes."""

    def setUp(self) -> None:
        self.envelope_tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.envelope_tempdir.cleanup)
        envelope_root = Path(self.envelope_tempdir.name)
        recipient_key = X25519PrivateKey.generate()
        recipient_private_path = envelope_root / "hub-recipient-private.pem"
        recipient_private_path.write_bytes(
            recipient_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            ),
        )
        recipient_private_path.chmod(0o600)
        recipient_public_path = envelope_root / "hub-recipient-public.pem"
        recipient_public_path.write_bytes(
            recipient_key.public_key().public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            ),
        )
        settings_override = self.settings(
            LX_ANNOTATE_ENCRYPTED_DATA_DIR=str(envelope_root),
            LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR=str(
                envelope_root / "sender-envelopes",
            ),
            LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE=str(recipient_public_path),
            ENDOREG_HUB_TRANSFER_RECIPIENT_PRIVATE_KEY_FILES=(
                str(recipient_private_path),
            ),
            ENDOREG_HUB_TRANSFER_REQUIRE_ROOT_OWNED_PRIVATE_KEYS=False,
        )
        settings_override.enable()
        self.addCleanup(settings_override.disable)
        self.operator = User.objects.create_user(username="hub-e2e-operator")
        self.client.force_login(self.operator)
        self.center = Center.objects.create(
            name="Test Center",
            center_key="test-center",
        )
        self.operator.groups.add(Group.objects.get_or_create(name="data:write")[0])
        PortalUserInfo.objects.get_or_create(user=self.operator)[0].centers.add(
            self.center
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

    def _assert_sender_payload_accepted_by_receiver(
        self,
        job: OutboundHubTransferJob,
    ) -> None:
        payload = build_transfer_payload(
            outbound_job=job,
            source_node=self.site_node,
        )
        receiver_serializer = TransferJobCreateSerializer(data=payload)

        self.assertTrue(receiver_serializer.is_valid(), receiver_serializer.errors)
        validated_data = cast(
            dict[str, object],
            receiver_serializer.validated_data,
        )
        self.assertEqual(validated_data["source_node"], self.site_node)
        self.assertEqual(validated_data["target_node"], self.hub_node)
        self.assertEqual(validated_data["source_center"], self.center)
        self.assertEqual(validated_data["payload_schema_version"], "3.0")

    @staticmethod
    def _requests_response_from_django(
        django_response,
        *,
        url: str,
    ) -> requests.Response:
        response = requests.Response()
        response.status_code = django_response.status_code
        response._content = bytes(django_response.content)
        response.encoding = "utf-8"
        response.url = url
        return response

    def _forward_worker_post_to_receiver(
        self,
        url: str,
        request_kwargs: dict[str, object],
        *,
        wire_uploads: list[bytes],
        forbidden_wire_values: tuple[bytes, ...],
        attest_mtls: bool = True,
    ) -> requests.Response:
        """Send the exact raw worker ciphertext through the receiver boundary."""

        request_headers = cast(dict[str, str], request_kwargs["headers"])
        presented_node = NetworkNode.objects.get(
            node_key=request_headers["X-Network-Node-Key"],
        )
        presented_secret = request_headers["X-Network-Node-Secret"]
        self.assertTrue(presented_node.is_active)
        self.assertEqual(presented_node.role, NetworkNode.Role.SITE_NODE)
        self.assertTrue(presented_node.check_shared_secret(presented_secret))
        self.assertTrue(request_kwargs["verify"])
        self.assertIsNone(request_kwargs.get("cert"))
        body_forbidden_values = forbidden_wire_values + (
            presented_secret.encode("utf-8"),
        )

        proxy_headers = {
            key: value
            for key, value in request_headers.items()
            if key.lower() not in {"content-length", "content-type"}
        }
        if attest_mtls:
            proxy_headers["X-Client-Cert-Verified"] = "SUCCESS"
        path = urlparse(url).path
        json_payload = request_kwargs.get("json")
        if json_payload is not None:
            encoded_payload = json.dumps(json_payload, sort_keys=True).encode("utf-8")
            for forbidden in body_forbidden_values:
                self.assertNotIn(forbidden, encoded_payload)
            django_response = self.client.post(
                path,
                data=json_payload,
                content_type="application/json",
                secure=True,
                headers=proxy_headers,
            )
        else:
            upload_stream = cast(CiphertextUploadStream, request_kwargs["data"])
            wire_body = b"".join(upload_stream)
            self.assertEqual(len(wire_body), upload_stream.content_length)
            self.assertEqual(
                request_headers["Content-Length"],
                str(len(wire_body)),
            )
            self.assertEqual(
                request_headers["Content-Type"],
                upload_stream.content_type,
            )
            self.assertEqual(
                request_headers["X-Hub-Media-Role"],
                upload_stream.media_role,
            )
            self.assertEqual(
                request_headers["X-Hub-Media-Envelope"],
                upload_stream.envelope_json,
            )
            for forbidden in body_forbidden_values:
                self.assertNotIn(forbidden, wire_body)
            wire_uploads.append(wire_body)
            django_response = cast(
                Any,
                self.client.generic(
                    "POST",
                    path,
                    data=wire_body,
                    content_type=upload_stream.content_type,
                    secure=True,
                    headers={
                        **proxy_headers,
                        "X-Hub-Media-Role": upload_stream.media_role,
                        "X-Hub-Media-Envelope": upload_stream.envelope_json,
                    },
                ),
            )
        return self._requests_response_from_django(django_response, url=url)

    def _assert_transfer_ledger_excludes(
        self,
        transfer_job: TransferJob,
        *forbidden_values: bytes,
    ) -> None:
        persisted_ledger = json.dumps(
            {
                "resource_rows": transfer_job.resource_rows,
                "processing_snapshot": transfer_job.processing_snapshot,
                "provenance": transfer_job.provenance,
                "status_detail": transfer_job.status_detail,
            },
            sort_keys=True,
        ).encode("utf-8")
        for forbidden in forbidden_values:
            self.assertNotIn(forbidden, persisted_ledger)

    @staticmethod
    def _mock_applied_payload(
        *,
        job: OutboundHubTransferJob,
        source_node_key: str,
        remote_transfer_id: str,
        upload_stream: CiphertextUploadStream,
    ) -> dict[str, object]:
        envelope = HubMediaEnvelopeMetadata.model_validate_json(
            upload_stream.envelope_json,
        )
        ciphertext = upload_stream.media_path.read_bytes()
        receipt = HubMediaEnvelopeReceipt(
            transfer_key=envelope.transfer_key,
            source_node_key=envelope.source_node_key,
            source_center_key=envelope.source_center_key,
            target_node_key=envelope.target_node_key,
            resource_kind=envelope.resource_kind,
            resource_hash=envelope.resource_hash,
            processed_media_hash=envelope.processed_media_hash,
            plaintext_sha256=envelope.plaintext_sha256,
            plaintext_size=envelope.plaintext_size,
            recipient_key_id=envelope.recipient_key_id,
            ciphertext_sha256=hashlib.sha256(ciphertext).hexdigest(),
            ciphertext_size=len(ciphertext),
            envelope_fingerprint_sha256=envelope.envelope_fingerprint_sha256(),
            receiver_transfer_id=remote_transfer_id,
            processing_decision="skip_processing_preserved_state",
        )
        return {
            **hub_transfer_status_payload(
                job=job,
                source_node_key=source_node_key,
                remote_transfer_id=remote_transfer_id,
                transfer_status="applied",
                processing_decision="skip_processing_preserved_state",
            ),
            "envelope_receipt": receipt.model_dump(mode="json"),
        }

    @patch.dict(os.environ, {"LX_ANNOTATE_MASTER_KEY": TEST_MASTER_KEY})
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_report_mark_then_mocked_transfer_completes(
        self,
        post_mock: MagicMock,
    ) -> None:
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
                "target_node_key": "hub-node",
                "resources": [{"id": report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)

        register_response = MagicMock()
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=report)
        self.assertEqual(job.marked_by, self.operator)
        self._assert_sender_payload_accepted_by_receiver(job)
        register_response.json.return_value = hub_transfer_status_payload(
            job=job,
            source_node_key=self.site_node.node_key,
            remote_transfer_id="remote-transfer-1",
            transfer_status="awaiting_media",
            processing_decision="wait_for_missing_media",
        )
        register_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.side_effect = lambda: self._mock_applied_payload(
            job=job,
            source_node_key=self.site_node.node_key,
            remote_transfer_id="remote-transfer-1",
            upload_stream=post_mock.call_args.kwargs["data"],
        )
        upload_response.raise_for_status.return_value = None
        post_mock.side_effect = [register_response, upload_response]

        result = run_outbound_transfer_job(
            outbound_job_id=str(job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        self.assertEqual(result.remote_transfer_status, "applied")

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_ENABLE_INCOMING_HUB_TRANSFERS=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    @patch.dict(os.environ, {"LX_ANNOTATE_MASTER_KEY": TEST_MASTER_KEY})
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_receiver_mtls_denial_fails_sender_before_transfer_registration(
        self,
        post_mock: MagicMock,
    ) -> None:
        self.site_node.set_shared_secret("super-secret")
        self.site_node.save(update_fields=["shared_secret_hash", "updated_at"])
        report_state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        raw_plaintext = b"%PDF-1.4\nraw-mtls-denied\n%%EOF\n"
        processed_plaintext = b"%PDF-1.4\nprocessed-mtls-denied\n%%EOF\n"
        report = RawPdfFile.objects.create(
            center=self.center,
            state=report_state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            pdf_hash="report-hash-mtls-denied",
            anonymized_text="Anonymized report denied without mTLS",
            file=ContentFile(raw_plaintext, name="report-mtls-denied.pdf"),
            processed_file=ContentFile(
                processed_plaintext,
                name="report-mtls-denied-processed.pdf",
            ),
        )
        verify_hub_report_artifact(report)
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": self.hub_node.node_key,
                "resources": [{"id": report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        outbound_job = OutboundHubTransferJob.objects.get(raw_pdf_file=report)
        wire_uploads: list[bytes] = []

        def _receiver_post(url: str, **kwargs: object) -> requests.Response:
            return self._forward_worker_post_to_receiver(
                url,
                kwargs,
                wire_uploads=wire_uploads,
                forbidden_wire_values=(
                    raw_plaintext,
                    processed_plaintext,
                    TEST_MASTER_KEY.encode("ascii"),
                ),
                attest_mtls=False,
            )

        post_mock.side_effect = _receiver_post
        result = run_outbound_transfer_job(
            outbound_job_id=str(outbound_job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(
            result.failure_class,
            OutboundHubTransferJob.FailureClass.AUTHORIZATION_DENIAL,
        )
        self.assertEqual(result.retry_count, 0)
        self.assertIn("authorization denied", result.last_error.lower())
        self.assertEqual(wire_uploads, [])
        self.assertFalse(
            TransferJob.objects.filter(transfer_key=outbound_job.transfer_key).exists(),
        )
        post_mock.assert_called_once()

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_ENABLE_INCOMING_HUB_TRANSFERS=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    @patch.dict(os.environ, {"LX_ANNOTATE_MASTER_KEY": TEST_MASTER_KEY})
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_report_worker_recovers_lost_ack_and_rejects_changed_replay(
        self,
        post_mock: MagicMock,
    ) -> None:
        self.site_node.set_shared_secret("super-secret")
        self.site_node.save(update_fields=["shared_secret_hash", "updated_at"])
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
            pdf_hash="report-hash-real-receiver",
            anonymized_text="Anonymized report text",
            file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="report-real.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed-real\n%%EOF\n",
                name="report-real-processed.pdf",
            ),
        )
        verify_hub_report_artifact(report)
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": self.hub_node.node_key,
                "resources": [{"id": report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        outbound_job = OutboundHubTransferJob.objects.get(raw_pdf_file=report)
        lose_upload_ack = True
        transmitted_wire_uploads: list[bytes] = []
        processed_plaintext = b"%PDF-1.4\nprocessed-real\n%%EOF\n"
        forbidden_wire_values = (
            b"%PDF-1.4\nraw\n%%EOF\n",
            processed_plaintext,
            TEST_MASTER_KEY.encode("ascii"),
            b"super-secret",
        )

        def _receiver_post(url: str, **kwargs: object) -> requests.Response:
            nonlocal lose_upload_ack
            is_upload = kwargs.get("json") is None
            response = self._forward_worker_post_to_receiver(
                url,
                kwargs,
                wire_uploads=transmitted_wire_uploads,
                forbidden_wire_values=forbidden_wire_values,
            )
            if is_upload and lose_upload_ack:
                lose_upload_ack = False
                self.assertEqual(response.status_code, 200, response.content)
                raise requests.ConnectionError(
                    "connection dropped after receiver applied the upload",
                )
            return response

        post_mock.side_effect = _receiver_post
        # The in-process sender and receiver share one test database and media
        # root, unlike separate deployments. Emulate only the receiver's
        # initially empty artifact store so registration requests the upload;
        # the real receiver upload, hash, persistence, and status paths remain
        # exercised below.
        with patch(
            "endoreg_db.services.hub.transfers._decide_report_processing",
            return_value=(
                TransferJob.ProcessingDecision.WAIT_FOR_MISSING_MEDIA,
                TransferJob.TransferStatus.AWAITING_MEDIA,
                "Receiver artifact store is empty at registration",
            ),
        ):
            lost_ack_result = run_outbound_transfer_job(
                outbound_job_id=str(outbound_job.id),
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        receiver_job = TransferJob.objects.get(transfer_key=outbound_job.transfer_key)
        self.assertEqual(
            lost_ack_result.local_status,
            OutboundHubTransferJob.LocalStatus.FAILED,
        )
        self.assertEqual(
            receiver_job.transfer_status,
            TransferJob.TransferStatus.APPLIED,
        )
        self._assert_transfer_ledger_excludes(
            receiver_job,
            b"%PDF-1.4\nraw\n%%EOF\n",
            processed_plaintext,
            TEST_MASTER_KEY.encode("ascii"),
            b"super-secret",
        )
        self.assertEqual(lost_ack_result.retry_count, 1)
        self.assertEqual(
            sha256_file(report.processed_file),
            hashlib.sha256(b"%PDF-1.4\nprocessed-real\n%%EOF\n").hexdigest(),
        )
        self.assertEqual(len(transmitted_wire_uploads), 1)

        exact_replay_result = run_outbound_transfer_job(
            outbound_job_id=str(outbound_job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )
        self.assertEqual(
            exact_replay_result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        self.assertEqual(str(receiver_job.id), exact_replay_result.remote_transfer_id)

        report.anonymized_text = "Changed anonymized report text"
        report.save(update_fields=["anonymized_text", "date_modified"])
        outbound_job.refresh_from_db()
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        outbound_job.save(update_fields=["local_status", "updated_at"])

        changed_replay_result = run_outbound_transfer_job(
            outbound_job_id=str(outbound_job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )
        receiver_job.refresh_from_db()
        self.assertEqual(
            changed_replay_result.local_status,
            OutboundHubTransferJob.LocalStatus.FAILED,
        )
        self.assertEqual(changed_replay_result.retry_count, 1)
        self.assertIn("canonical replay conflict", changed_replay_result.last_error)
        self.assertEqual(
            receiver_job.transfer_status,
            TransferJob.TransferStatus.APPLIED,
        )
        self.assertEqual(
            receiver_job.resource_rows["raw_pdf_file"]["anonymized_text"],
            "Anonymized report text",
        )
        self.assertEqual(
            TransferJob.objects.filter(
                transfer_key=outbound_job.transfer_key,
            ).count(),
            1,
        )
        self.assertEqual(post_mock.call_count, 4)

        hash_mismatch_state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        hash_mismatch_report = RawPdfFile.objects.create(
            center=self.center,
            state=hash_mismatch_state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            pdf_hash="report-hash-mismatch",
            anonymized_text="Anonymized hash mismatch report",
            file=ContentFile(
                b"%PDF-1.4\nraw-hash-mismatch\n%%EOF\n",
                name="report-hash-mismatch.pdf",
            ),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed-hash-mismatch\n%%EOF\n",
                name="report-hash-mismatch-processed.pdf",
            ),
        )
        verify_hub_report_artifact(hash_mismatch_report)
        hash_mismatch_mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": self.hub_node.node_key,
                "resources": [
                    {
                        "id": hash_mismatch_report.id,
                        "resource_kind": "report",
                    },
                ],
            },
            content_type="application/json",
        )
        self.assertEqual(hash_mismatch_mark_response.status_code, 200)
        hash_mismatch_job = OutboundHubTransferJob.objects.get(
            raw_pdf_file=hash_mismatch_report,
        )
        hash_mismatch_state.refresh_from_db()
        hash_mismatch_state.processed_file_sha256 = "0" * 64
        hash_mismatch_state.save(
            update_fields=["processed_file_sha256"],
        )

        hash_mismatch_result = run_outbound_transfer_job(
            outbound_job_id=str(hash_mismatch_job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )
        self.assertEqual(
            hash_mismatch_result.local_status,
            OutboundHubTransferJob.LocalStatus.FAILED,
        )
        self.assertIn("hash metadata is inconsistent", hash_mismatch_result.last_error)
        self.assertFalse(
            TransferJob.objects.filter(
                transfer_key=hash_mismatch_job.transfer_key,
            ).exists(),
        )
        self.assertEqual(post_mock.call_count, 4)

        report.anonymized_text = "Receiver-preserved anonymized report"
        report.save(update_fields=["anonymized_text", "date_modified"])
        outbound_job.delete()
        second_site_node = NetworkNode.objects.create(
            display_name="Second Site Node",
            node_key="second-site-node",
            role=NetworkNode.Role.SITE_NODE,
            owning_center=self.center,
        )
        second_site_node.set_shared_secret("second-super-secret")
        second_site_node.save(
            update_fields=["shared_secret_hash", "updated_at"],
        )
        collision_job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key=(
                "second-site-node__report__report-hash-real-receiver__processed_v1"
            ),
            marked_by=self.operator,
        )

        collision_result = run_outbound_transfer_job(
            outbound_job_id=str(collision_job.id),
            source_node_key=second_site_node.node_key,
            source_secret="second-super-secret",
        )
        collision_receiver_job = TransferJob.objects.get(
            transfer_key=collision_job.transfer_key,
        )
        report.refresh_from_db()
        self.assertEqual(
            collision_result.local_status,
            OutboundHubTransferJob.LocalStatus.FAILED,
        )
        self.assertEqual(
            collision_result.remote_transfer_status,
            TransferJob.TransferStatus.INCONSISTENT,
        )
        self.assertEqual(
            collision_receiver_job.transfer_status,
            TransferJob.TransferStatus.INCONSISTENT,
        )
        self.assertIsNone(collision_receiver_job.target_object_id)
        self.assertEqual(
            report.anonymized_text,
            "Receiver-preserved anonymized report",
        )
        self.assertEqual(post_mock.call_count, 5)

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_ENABLE_INCOMING_HUB_TRANSFERS=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    @patch.dict(os.environ, {"LX_ANNOTATE_MASTER_KEY": TEST_MASTER_KEY})
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_video_in_process_lifecycle_uses_raw_ciphertext_contract(
        self,
        post_mock: MagicMock,
    ) -> None:
        # Arrange
        self.site_node.set_shared_secret("super-secret")
        self.site_node.save(update_fields=["shared_secret_hash", "updated_at"])
        plaintext_media = b"processed-video"
        processed_hash = hashlib.sha256(plaintext_media).hexdigest()
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
                plaintext_media,
                name="video-1-processed.mp4",
            ),
        )
        observed_sender_states: list[str] = []
        observed_request_paths: list[str] = []
        transmitted_wire_uploads: list[bytes] = []
        forbidden_wire_values = (
            plaintext_media,
            TEST_MASTER_KEY.encode("ascii"),
            b"super-secret",
        )

        def _receiver_post(url: str, **kwargs: object) -> requests.Response:
            outbound_job = OutboundHubTransferJob.objects.get(video_file=video)
            observed_sender_states.append(str(outbound_job.local_status))
            observed_request_paths.append(urlparse(url).path)
            return self._forward_worker_post_to_receiver(
                url,
                kwargs,
                wire_uploads=transmitted_wire_uploads,
                forbidden_wire_values=forbidden_wire_values,
            )

        post_mock.side_effect = _receiver_post

        # Act
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": video.id, "resource_kind": "video"}],
            },
            content_type="application/json",
        )
        job = OutboundHubTransferJob.objects.get(video_file=video)
        marked_status = str(job.local_status)
        with patch(
            "endoreg_db.services.hub.transfers._decide_video_processing",
            return_value=(
                TransferJob.ProcessingDecision.WAIT_FOR_MISSING_MEDIA,
                TransferJob.TransferStatus.AWAITING_MEDIA,
                "Receiver artifact store is empty at registration",
            ),
        ):
            result = run_outbound_transfer_job(
                outbound_job_id=str(job.id),
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        # Assert
        receiver_job = TransferJob.objects.get(transfer_key=job.transfer_key)
        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(job.marked_by, self.operator)
        self.assertEqual(
            marked_status,
            OutboundHubTransferJob.LocalStatus.MARKED,
        )
        self.assertEqual(
            observed_sender_states,
            [
                OutboundHubTransferJob.LocalStatus.REGISTERING,
                OutboundHubTransferJob.LocalStatus.UPLOADING,
            ],
        )
        self.assertEqual(
            observed_request_paths,
            [
                "/api/media/hub/transfers/",
                f"/api/media/hub/transfers/{job.transfer_key}/media/",
            ],
        )
        self.assertEqual(
            result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        self.assertEqual(result.remote_transfer_status, "applied")
        self.assertEqual(result.remote_transfer_id, str(receiver_job.id))
        self.assertEqual(
            receiver_job.transfer_status,
            TransferJob.TransferStatus.APPLIED,
        )
        self.assertIsNotNone(receiver_job.target_object_id)
        receiver_video = VideoFile.objects.get(pk=receiver_job.target_object_id)
        self.assertEqual(receiver_video.video_hash, video.video_hash)
        self.assertEqual(
            receiver_job.resource_rows["video_file"]["processed_video_hash"],
            processed_hash,
        )
        self._assert_transfer_ledger_excludes(
            receiver_job,
            plaintext_media,
            TEST_MASTER_KEY.encode("ascii"),
            b"super-secret",
        )
        self.assertIsNotNone(result.envelope_receipt)
        self.assertEqual(
            result.envelope_receipt["receiver_transfer_id"],
            str(receiver_job.id),
        )
        self.assertEqual(len(transmitted_wire_uploads), 1)
        self.assertEqual(post_mock.call_count, 2)
