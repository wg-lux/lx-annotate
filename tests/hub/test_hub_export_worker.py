# pyright: reportIndexIssue=false, reportArgumentType=false
from __future__ import annotations

import base64
import hashlib
import json
import os
import tempfile
from collections.abc import Iterable
from pathlib import Path
from typing import cast
from unittest.mock import MagicMock, patch

import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from lx_dtypes.models.contracts.hub_media_envelope import (
    HubMediaEnvelopeMetadata,
    HubMediaEnvelopeReceipt,
)

from lx_annotate.hub.hub_export_worker import (
    MultipartUploadStream,
    RemoteTransferIntegrityError,
    RemoteTransferStatusPayload,
    apply_remote_status,
    resolve_hub_request_timeout_seconds,
    resolve_hub_transport_config,
    resolve_outbound_node_secret,
    run_outbound_transfer_job,
)
from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import (
    create_hub_sensitive_meta,
    hub_transfer_status_payload,
    verify_hub_report_artifact,
)

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


@override_settings(LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=False)
class HubExportWorkerTests(TestCase):
    def setUp(self) -> None:
        self.envelope_tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.envelope_tempdir.cleanup)
        envelope_root = Path(self.envelope_tempdir.name)
        recipient_key = X25519PrivateKey.generate()
        recipient_public_path = envelope_root / "hub-recipient.pem"
        recipient_public_path.write_bytes(
            recipient_key.public_key().public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            ),
        )
        settings_override = self.settings(
            LX_ANNOTATE_ENCRYPTED_DATA_DIR=str(envelope_root),
            LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR=str(
                envelope_root / "envelopes",
            ),
            LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE=str(recipient_public_path),
        )
        settings_override.enable()
        self.addCleanup(settings_override.disable)
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
        self.report_state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        self.report = RawPdfFile.objects.create(
            center=self.center,
            state=self.report_state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            pdf_hash="report-hash-1",
            anonymized_text="Anonymized report text",
            file=ContentFile(b"%PDF-1.4\nraw\n%%EOF\n", name="report-1.pdf"),
            processed_file=ContentFile(
                b"%PDF-1.4\nprocessed\n%%EOF\n",
                name="report-1-processed.pdf",
            ),
        )
        verify_hub_report_artifact(self.report)
        self.job = OutboundHubTransferJob.objects.create(
            resource_kind=OutboundHubTransferJob.ResourceKind.REPORT,
            raw_pdf_file=self.report,
            source_center=self.center,
            target_node=self.hub_node,
            transfer_key="site-node__report__report-hash-1__processed_v1",
        )

    def _remote_status(
        self,
        *,
        transfer_status: str,
        processing_decision: str,
    ) -> dict[str, str]:
        return hub_transfer_status_payload(
            job=self.job,
            source_node_key=self.site_node.node_key,
            remote_transfer_id="remote-transfer-1",
            transfer_status=transfer_status,
            processing_decision=processing_decision,
        )

    def _applied_payload(
        self,
        upload_stream: MultipartUploadStream,
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
            receiver_transfer_id="remote-transfer-1",
            processing_decision="skip_processing_preserved_state",
        )
        return {
            **self._remote_status(
                transfer_status="applied",
                processing_decision="skip_processing_preserved_state",
            ),
            "envelope_receipt": receipt.model_dump(mode="json"),
        }

    def test_resolve_outbound_node_secret_requires_explicit_or_env_value(self):
        with self.assertRaisesMessage(ValueError, "Missing outbound hub node secret"):
            resolve_outbound_node_secret(source_node_key="site-node")

    def test_resolve_outbound_node_secret_reads_secret_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            secret_file = Path(tmpdir) / "node-secret"
            secret_file.write_text("file-secret\n", encoding="utf-8")
            with patch.dict(
                os.environ,
                {"LX_ANNOTATE_HUB_SOURCE_NODE_SECRET_FILE": str(secret_file)},
                clear=False,
            ):
                self.assertEqual(
                    resolve_outbound_node_secret(source_node_key="site-node"),
                    "file-secret",
                )

    @override_settings(
        LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=True,
        LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="",
        LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
    )
    def test_hub_transport_fails_closed_without_client_identity(self):
        with self.assertRaisesMessage(ValueError, "requires mTLS"):
            resolve_hub_transport_config()

    def test_hub_transport_supplies_client_identity_and_private_ca(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            cert_file = Path(tmpdir) / "client.crt"
            key_file = Path(tmpdir) / "client.key"
            ca_file = Path(tmpdir) / "hub-ca.crt"
            for path in (cert_file, key_file, ca_file):
                path.write_text("test", encoding="utf-8")
            with override_settings(
                LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=True,
                LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE=str(cert_file),
                LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE=str(key_file),
                LX_ANNOTATE_HUB_EXPORT_CA_FILE=str(ca_file),
            ):
                transport = resolve_hub_transport_config()

        self.assertEqual(transport.cert, (str(cert_file), str(key_file)))
        self.assertEqual(transport.verify, str(ca_file))

    @override_settings(LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS=21600)
    def test_hub_request_timeout_defaults_to_long_running_transfer_budget(self):
        self.assertEqual(resolve_hub_request_timeout_seconds(), 21600)
        self.assertEqual(resolve_hub_request_timeout_seconds(45), 45)

    @override_settings(LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS=0)
    def test_hub_request_timeout_rejects_non_positive_configuration(self):
        with self.assertRaisesMessage(ValueError, "must be positive"):
            resolve_hub_request_timeout_seconds()

    def test_run_outbound_transfer_job_records_non_https_configuration_rejection(
        self,
    ) -> None:
        self.hub_node.base_url = "http://hub.example/"
        self.hub_node.save(update_fields=["base_url", "updated_at"])

        with self.assertLogs("lx_annotate.hub_export.audit", level="INFO") as logs:
            result = run_outbound_transfer_job(
                outbound_job_id=str(self.job.id),
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(result.retry_count, 0)
        self.assertIn("must use https", result.last_error)
        event = json.loads(logs.records[-1].getMessage())
        self.assertEqual(event["failure_class"], "configuration_rejection")
        self.assertEqual(event["attempt_number"], 1)

    @override_settings(LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE="")
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_missing_recipient_key_blocks_before_registration(
        self,
        post_mock: MagicMock,
    ) -> None:
        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(
            result.failure_class,
            OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION,
        )
        self.assertIn("recipient key", result.last_error)
        post_mock.assert_not_called()

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_registers_and_uploads_processed_media(
        self,
        post_mock: MagicMock,
    ):
        register_response = MagicMock()
        register_response.json.return_value = self._remote_status(
            transfer_status="awaiting_media",
            processing_decision="wait_for_missing_media",
        )
        register_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.side_effect = lambda: self._applied_payload(
            post_mock.call_args.kwargs["data"],
        )
        upload_response.raise_for_status.return_value = None

        post_mock.side_effect = [register_response, upload_response]

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        self.assertEqual(result.remote_transfer_status, "applied")
        self.assertEqual(result.remote_transfer_id, "remote-transfer-1")
        self.assertIsNotNone(result.envelope_receipt)
        self.assertEqual(
            result.envelope_receipt["receiver_transfer_id"],
            "remote-transfer-1",
        )
        self.assertEqual(post_mock.call_count, 2)
        self.assertEqual(post_mock.call_args_list[0].kwargs["timeout"], 21600)
        self.assertEqual(post_mock.call_args_list[1].kwargs["timeout"], 21600)

    def test_applied_status_without_validated_receipt_is_rejected(self) -> None:
        self.job.local_status = OutboundHubTransferJob.LocalStatus.REGISTERING
        self.job.save(update_fields=["local_status", "updated_at"])
        applied = self._remote_status(
            transfer_status="applied",
            processing_decision="skip_processing_preserved_state",
        )

        with self.assertRaisesMessage(
            RemoteTransferIntegrityError,
            "validated envelope receipt",
        ):
            apply_remote_status(
                self.job,
                cast(RemoteTransferStatusPayload, applied),
                expected_source_node_key=self.site_node.node_key,
            )

        self.job.refresh_from_db()
        self.assertEqual(
            self.job.local_status,
            OutboundHubTransferJob.LocalStatus.REGISTERING,
        )
        self.assertIsNone(self.job.envelope_receipt)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_streams_processed_media_upload(
        self,
        post_mock: MagicMock,
    ):
        register_response = MagicMock()
        register_response.json.return_value = self._remote_status(
            transfer_status="awaiting_media",
            processing_decision="wait_for_missing_media",
        )
        register_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.side_effect = lambda: self._applied_payload(
            post_mock.call_args.kwargs["data"],
        )
        upload_response.raise_for_status.return_value = None

        responses = iter([register_response, upload_response])
        captured_upload: dict[str, object] = {}

        def _post_side_effect(
            *args: object,
            **kwargs: object,
        ) -> object:
            captured_upload["kwargs"] = kwargs
            headers = cast(dict[str, object], kwargs.get("headers", {}))
            content_type = str(
                headers.get("Content-Type", headers.get("content-type", "")),
            )
            if content_type.startswith("multipart/form-data; boundary="):
                body_chunks = list(cast("Iterable[bytes]", kwargs["data"]))
                captured_upload["kwargs"] = kwargs
                captured_upload["body"] = b"".join(body_chunks)
            return next(responses)

        post_mock.side_effect = _post_side_effect

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        upload_kwargs = cast(dict[str, object], captured_upload["kwargs"])
        self.assertIn("body", captured_upload)
        self.assertIn("headers", upload_kwargs)
        body = cast(bytes, captured_upload["body"])
        headers = cast(dict[str, str], upload_kwargs["headers"])

        self.assertNotIn("files", upload_kwargs)
        self.assertNotIsInstance(upload_kwargs["data"], bytes)
        content_type = str(
            headers.get("Content-Type", headers.get("content-type", "")),
        )
        self.assertTrue(
            content_type.startswith("multipart/form-data; boundary="),
        )
        self.assertEqual(int(headers["Content-Length"]), len(body))
        self.assertIn(b'name="media_role"', body)
        self.assertIn(b"\r\nprocessed\r\n", body)
        self.assertIn(b'name="envelope"', body)
        self.assertIn(b'name="file"; filename=', body)
        self.assertNotIn(b"%PDF-1.4\nprocessed\n%%EOF\n", body)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_is_noop_for_completed_job(
        self,
        post_mock: MagicMock,
    ):
        self.job.local_status = OutboundHubTransferJob.LocalStatus.COMPLETED
        self.job.save(update_fields=["local_status", "updated_at"])

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        post_mock.assert_not_called()

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_rejects_canonical_replay_conflict_on_409(
        self,
        post_mock: MagicMock,
    ):
        conflict_response = MagicMock()
        conflict_response.status_code = 409
        post_mock.return_value = conflict_response

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(result.retry_count, 0)
        self.assertEqual(
            result.failure_class,
            OutboundHubTransferJob.FailureClass.INTEGRITY_INCONSISTENCY,
        )
        self.assertIn("canonical replay conflict", result.last_error)
        self.assertEqual(post_mock.call_count, 1)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_records_authorization_denial_without_retry(
        self,
        post_mock: MagicMock,
    ) -> None:
        denied_response = MagicMock()
        denied_response.status_code = 403
        post_mock.return_value = denied_response

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(
            result.failure_class,
            OutboundHubTransferJob.FailureClass.AUTHORIZATION_DENIAL,
        )
        self.assertEqual(result.retry_count, 0)
        self.assertEqual(post_mock.call_count, 1)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_records_http_400_as_configuration_rejection(
        self,
        post_mock: MagicMock,
    ) -> None:
        rejected_response = MagicMock()
        rejected_response.status_code = 400
        post_mock.return_value = rejected_response

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(
            result.failure_class,
            OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION,
        )
        self.assertEqual(result.retry_count, 0)
        self.assertIn("HTTP 400", result.last_error)
        self.assertEqual(post_mock.call_count, 1)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_marks_failure_on_network_error(
        self,
        post_mock: MagicMock,
    ):
        post_mock.side_effect = requests.RequestException("connection dropped")

        with self.assertLogs("lx_annotate.hub_export.audit", level="INFO") as logs:
            result = run_outbound_transfer_job(
                outbound_job_id=str(self.job.id),
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(result.retry_count, 1)
        self.assertIn("registration failed", result.last_error)
        event = json.loads(logs.records[-1].getMessage())
        self.assertEqual(event["failure_class"], "transient_retry")
        self.assertEqual(event["attempt_number"], 1)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_rejects_mismatched_acknowledgement(
        self,
        post_mock: MagicMock,
    ) -> None:
        response = MagicMock()
        acknowledgement = self._remote_status(
            transfer_status="awaiting_media",
            processing_decision="wait_for_missing_media",
        )
        acknowledgement["processed_media_hash"] = "0" * 64
        response.json.return_value = acknowledgement
        response.raise_for_status.return_value = None
        post_mock.return_value = response

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(result.retry_count, 0)
        self.assertIn("acknowledgement inconsistent", result.last_error)
        self.assertIn("processed_media_hash", result.last_error)
        post_mock.assert_called_once()

    @patch("lx_annotate.hub.hub_export_envelope.iter_field_file_bytes")
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_records_unreadable_processed_media(
        self,
        post_mock: MagicMock,
        iter_field_file_bytes_mock: MagicMock,
    ) -> None:
        register_response = MagicMock()
        register_response.json.return_value = self._remote_status(
            transfer_status="awaiting_media",
            processing_decision="wait_for_missing_media",
        )
        register_response.raise_for_status.return_value = None
        post_mock.return_value = register_response
        iter_field_file_bytes_mock.side_effect = OSError("protected media unavailable")

        with self.assertLogs("lx_annotate.hub_export.audit", level="INFO") as logs:
            result = run_outbound_transfer_job(
                outbound_job_id=str(self.job.id),
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(result.retry_count, 0)
        self.assertIn("processed media rejected", result.last_error)
        event = json.loads(logs.records[-1].getMessage())
        self.assertEqual(event["failure_class"], "configuration_rejection")
        post_mock.assert_called_once()

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_encrypts_without_localizing_plaintext(
        self,
        post_mock: MagicMock,
    ) -> None:
        register_response = MagicMock()
        register_response.json.return_value = self._remote_status(
            transfer_status="awaiting_media",
            processing_decision="wait_for_missing_media",
        )
        register_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.side_effect = lambda: self._applied_payload(
            post_mock.call_args.kwargs["data"],
        )
        upload_response.raise_for_status.return_value = None
        post_mock.side_effect = [register_response, upload_response]

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        upload_stream = post_mock.call_args.kwargs["data"]
        self.assertIsInstance(upload_stream, MultipartUploadStream)
        self.assertTrue(upload_stream.upload_file_name.endswith(".bin"))
        self.assertFalse(upload_stream.media_path.exists())

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_applied_registration_validates_receipt_and_cleans_lost_ack_envelope(
        self,
        post_mock: MagicMock,
    ) -> None:
        register_response = MagicMock()
        register_response.json.return_value = self._remote_status(
            transfer_status="awaiting_media",
            processing_decision="wait_for_missing_media",
        )
        register_response.raise_for_status.return_value = None
        applied_payload: dict[str, object] = {}

        def first_attempt(*args: object, **kwargs: object) -> MagicMock:
            del args
            upload_stream = kwargs.get("data")
            if isinstance(upload_stream, MultipartUploadStream):
                applied_payload.update(self._applied_payload(upload_stream))
                raise requests.ConnectionError("lost applied acknowledgement")
            return register_response

        post_mock.side_effect = first_attempt
        first_result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )
        envelope_directory = Path(self.envelope_tempdir.name) / "envelopes"
        self.assertEqual(
            first_result.local_status,
            OutboundHubTransferJob.LocalStatus.FAILED,
        )
        self.assertEqual(len(list(envelope_directory.glob("*"))), 2)

        applied_response = MagicMock()
        applied_response.json.return_value = applied_payload
        applied_response.raise_for_status.return_value = None
        post_mock.side_effect = None
        post_mock.return_value = applied_response
        second_result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            second_result.local_status,
            OutboundHubTransferJob.LocalStatus.COMPLETED,
        )
        self.assertEqual(list(envelope_directory.glob("*")), [])
