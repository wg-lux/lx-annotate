# pyright: reportIndexIssue=false, reportArgumentType=false
from __future__ import annotations

import tempfile
import requests
from unittest.mock import MagicMock, patch
from pathlib import Path

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings

from endoreg_db.models import Center, NetworkNode, RawPdfFile, RawPdfState
from tests.hub_payload_helpers import (
    create_hub_sensitive_meta,
    verify_hub_report_artifact,
)
from lx_annotate.hub.hub_export_worker import (
    resolve_outbound_node_secret,
    resolve_hub_transport_config,
    run_outbound_transfer_job,
)
from lx_annotate.models import OutboundHubTransferJob

import base64
import os

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


@override_settings(LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=False)
class HubExportWorkerTests(TestCase):
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

    def test_run_outbound_transfer_job_rejects_non_https_hub_target(self):
        self.hub_node.base_url = "http://hub.example/"
        self.hub_node.save(update_fields=["base_url", "updated_at"])

        with self.assertRaisesMessage(ValueError, "must use https"):
            run_outbound_transfer_job(
                outbound_job_id=str(self.job.id),
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_registers_and_uploads_processed_media(
        self,
        post_mock: MagicMock,
    ):
        register_response = MagicMock()
        register_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "awaiting_media",
            "processing_decision": "wait_for_missing_media",
            "status_detail": "",
        }
        register_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "applied",
            "processing_decision": "skip_processing_preserved_state",
            "status_detail": "",
        }
        upload_response.raise_for_status.return_value = None

        post_mock.side_effect = [register_response, upload_response]

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status, OutboundHubTransferJob.LocalStatus.COMPLETED
        )
        self.assertEqual(result.remote_transfer_status, "applied")
        self.assertEqual(result.remote_transfer_id, "remote-transfer-1")
        self.assertEqual(post_mock.call_count, 2)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_streams_processed_media_upload(
        self,
        post_mock: MagicMock,
    ):
        register_response = MagicMock()
        register_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "awaiting_media",
            "processing_decision": "wait_for_missing_media",
            "status_detail": "",
        }
        register_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "applied",
            "processing_decision": "skip_processing_preserved_state",
            "status_detail": "",
        }
        upload_response.raise_for_status.return_value = None

        responses = iter([register_response, upload_response])
        captured_upload: dict[str, object] = {}

        def _post_side_effect(*args, **kwargs):
            headers = kwargs.get("headers", {})
            content_type = str(headers.get("Content-Type", ""))
            if content_type.startswith("multipart/form-data; boundary="):
                body_chunks = list(kwargs["data"])
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
            result.local_status, OutboundHubTransferJob.LocalStatus.COMPLETED
        )
        upload_kwargs = captured_upload["kwargs"]
        body = captured_upload["body"]
        headers = upload_kwargs["headers"]

        self.assertNotIn("files", upload_kwargs)
        self.assertNotIsInstance(upload_kwargs["data"], bytes)
        self.assertTrue(
            headers["Content-Type"].startswith("multipart/form-data; boundary=")
        )
        self.assertEqual(int(headers["Content-Length"]), len(body))
        self.assertIn(b'name="media_role"', body)
        self.assertIn(b"\r\nprocessed\r\n", body)
        self.assertIn(b'name="file"; filename=', body)
        self.assertIn(b"%PDF-1.4\nprocessed\n%%EOF\n", body)

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
            result.local_status, OutboundHubTransferJob.LocalStatus.COMPLETED
        )
        post_mock.assert_not_called()

    @patch("lx_annotate.hub.hub_export_worker.requests.get")
    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_reuses_existing_remote_transfer_on_409(
        self,
        post_mock: MagicMock,
        get_mock: MagicMock,
    ):
        conflict_response = MagicMock()
        conflict_response.status_code = 409

        status_response = MagicMock()
        status_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "awaiting_media",
            "processing_decision": "wait_for_missing_media",
            "status_detail": "",
        }
        status_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "applied",
            "processing_decision": "skip_processing_preserved_state",
            "status_detail": "",
        }
        upload_response.raise_for_status.return_value = None

        post_mock.side_effect = [conflict_response, upload_response]
        get_mock.return_value = status_response

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(
            result.local_status, OutboundHubTransferJob.LocalStatus.COMPLETED
        )
        self.assertEqual(get_mock.call_count, 1)
        self.assertEqual(post_mock.call_count, 2)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    def test_run_outbound_transfer_job_marks_failure_on_network_error(
        self,
        post_mock: MagicMock,
    ):
        post_mock.side_effect = requests.RequestException("connection dropped")

        result = run_outbound_transfer_job(
            outbound_job_id=str(self.job.id),
            source_node_key=self.site_node.node_key,
            source_secret="super-secret",
        )

        self.assertEqual(result.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(result.retry_count, 1)
        self.assertIn("registration failed", result.last_error)

    @patch("lx_annotate.hub.hub_export_worker.requests.post")
    @patch("lx_annotate.hub.hub_export_worker.ensure_local_file")
    def test_run_outbound_transfer_job_localizes_processed_media_before_upload(
        self,
        ensure_local_file_mock: MagicMock,
        post_mock: MagicMock,
    ) -> None:
        register_response = MagicMock()
        register_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "awaiting_media",
            "processing_decision": "wait_for_missing_media",
            "status_detail": "",
        }
        register_response.raise_for_status.return_value = None

        upload_response = MagicMock()
        upload_response.json.return_value = {
            "id": "remote-transfer-1",
            "transfer_status": "applied",
            "processing_decision": "skip_processing_preserved_state",
            "status_detail": "",
        }
        upload_response.raise_for_status.return_value = None
        post_mock.side_effect = [register_response, upload_response]

        with tempfile.TemporaryDirectory() as tmpdir:
            localized_path = Path(tmpdir) / "localized-report.pdf"
            localized_path.write_bytes(b"%PDF-1.4\nprocessed\n%%EOF\n")

            class _Localizer:
                def __enter__(self):
                    return localized_path

                def __exit__(self, exc_type, exc, tb):
                    return False

            ensure_local_file_mock.return_value = _Localizer()

            result = run_outbound_transfer_job(
                outbound_job_id=str(self.job.id),
                source_node_key=self.site_node.node_key,
                source_secret="super-secret",
            )

        self.assertEqual(
            result.local_status, OutboundHubTransferJob.LocalStatus.COMPLETED
        )
        ensure_local_file_mock.assert_called_once_with(
            self.report.processed_file,
            suffix=".pdf",
        )
