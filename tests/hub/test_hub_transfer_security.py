from __future__ import annotations

from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from endoreg_db.models import Center, NetworkNode, TransferJob
from tests.hub_payload_helpers import valid_report_resource_rows


@override_settings(ENDOREG_ENABLE_HUB_TRANSFERS=True)
class HubTransferSecurityTests(TestCase):
    def setUp(self) -> None:
        self.center = Center.objects.create(
            name="Transfer Center",
            center_key="transfer-center",
        )
        self.site_node = NetworkNode.objects.create(
            display_name="Site Node",
            node_key="site-node",
            role=NetworkNode.Role.SITE_NODE,
            owning_center=self.center,
            is_active=True,
        )
        self.site_node.set_shared_secret("super-secret")
        self.site_node.save(update_fields=["shared_secret_hash", "updated_at"])
        self.hub_node = NetworkNode.objects.create(
            display_name="Hub Node",
            node_key="hub-node",
            role=NetworkNode.Role.CENTRAL_HUB,
            owning_center=self.center,
            is_active=True,
        )

    def _transfer_payload(
        self, *, transfer_key: str = "site-node__report__hash-1__v1"
    ) -> dict:
        return {
            "transfer_key": transfer_key,
            "source_node_key": self.site_node.node_key,
            "target_node_key": self.hub_node.node_key,
            "source_center_key": self.center.center_key,
            "resource_kind": TransferJob.ResourceKind.REPORT,
            "resource_hash": "hash-1",
            "transfer_mode": TransferJob.TransferMode.METADATA_ONLY,
            "processing_policy": TransferJob.ProcessingPolicy.PRESERVE_PROCESSING_STATE,
            "processing_intent": TransferJob.ProcessingIntent.STATE_PRESERVATION,
            "cleanup_policy": TransferJob.CleanupPolicy.RETAIN_ALL,
            "payload_schema_version": "1.0",
            "resource_rows": valid_report_resource_rows(pdf_hash="hash-1"),
            "processing_snapshot": {
                "sender_processing_success": True,
            },
        }

    def _create_transfer_job(
        self, *, transfer_key: str = "site-node__report__status__v1"
    ) -> TransferJob:
        return TransferJob.objects.create(
            transfer_key=transfer_key,
            source_node=self.site_node,
            target_node=self.hub_node,
            source_center=self.center,
            resource_kind=TransferJob.ResourceKind.REPORT,
            resource_hash="hash-status-1",
            transfer_mode=TransferJob.TransferMode.METADATA_AND_PROCESSED_MEDIA,
            processing_policy=TransferJob.ProcessingPolicy.PRESERVE_PROCESSING_STATE,
            processing_intent=TransferJob.ProcessingIntent.STATE_PRESERVATION,
            cleanup_policy=TransferJob.CleanupPolicy.RETAIN_ALL,
            payload_schema_version="1.0",
            resource_rows={},
            processing_snapshot={},
            provenance={},
        )

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_ENABLE_HUB_TRANSFERS=False,
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    def test_transfer_create_returns_404_when_transfer_api_flag_is_disabled(self):
        response = self.client.post(
            "/api/media/hub/transfers/",
            data=self._transfer_payload(transfer_key="site-node__report__off__v1"),
            content_type="application/json",
            secure=True,
            HTTP_X_CLIENT_CERT_VERIFIED="SUCCESS",
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 404)
        self.assertFalse(
            TransferJob.objects.filter(
                transfer_key="site-node__report__off__v1"
            ).exists()
        )

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=False,
    )
    def test_transfer_create_rejects_insecure_transport(self):
        response = self.client.post(
            "/api/media/hub/transfers/",
            data=self._transfer_payload(),
            content_type="application/json",
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("secure transport", str(response.json()["detail"]).lower())

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    def test_transfer_create_rejects_missing_mtls_attestation(self):
        response = self.client.post(
            "/api/media/hub/transfers/",
            data=self._transfer_payload(transfer_key="site-node__report__hash-2__v1"),
            content_type="application/json",
            secure=True,
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("mutual tls", str(response.json()["detail"]).lower())

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    def test_transfer_create_accepts_secure_proxy_attested_request(self):
        response = self.client.post(
            "/api/media/hub/transfers/",
            data=self._transfer_payload(transfer_key="site-node__report__hash-3__v1"),
            content_type="application/json",
            secure=True,
            HTTP_X_CLIENT_CERT_VERIFIED="SUCCESS",
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["transfer_key"], "site-node__report__hash-3__v1")

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=False,
    )
    def test_transfer_status_rejects_insecure_transport(self):
        transfer_job = self._create_transfer_job()

        response = self.client.get(
            f"/api/media/hub/transfers/{transfer_job.transfer_key}/status/",
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("secure transport", str(response.json()["detail"]).lower())

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    def test_transfer_status_rejects_missing_mtls_attestation(self):
        transfer_job = self._create_transfer_job(
            transfer_key="site-node__report__status-mtls__v1"
        )

        response = self.client.get(
            f"/api/media/hub/transfers/{transfer_job.transfer_key}/status/",
            secure=True,
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("mutual tls", str(response.json()["detail"]).lower())

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    def test_transfer_status_accepts_secure_proxy_attested_request(self):
        transfer_job = self._create_transfer_job(
            transfer_key="site-node__report__status-ok__v1"
        )

        response = self.client.get(
            f"/api/media/hub/transfers/{transfer_job.transfer_key}/status/",
            secure=True,
            HTTP_X_CLIENT_CERT_VERIFIED="SUCCESS",
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["transfer_key"], transfer_job.transfer_key)

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=False,
    )
    def test_transfer_media_upload_rejects_insecure_transport(self):
        transfer_job = self._create_transfer_job(
            transfer_key="site-node__report__media-insecure__v1"
        )

        response = self.client.post(
            f"/api/media/hub/transfers/{transfer_job.transfer_key}/media/",
            data={"media_role": "processed"},
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("secure transport", str(response.json()["detail"]).lower())

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    def test_transfer_media_upload_rejects_missing_mtls_attestation(self):
        transfer_job = self._create_transfer_job(
            transfer_key="site-node__report__media-mtls__v1"
        )

        response = self.client.post(
            f"/api/media/hub/transfers/{transfer_job.transfer_key}/media/",
            data={"media_role": "processed"},
            secure=True,
            HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
            HTTP_X_NETWORK_NODE_SECRET="super-secret",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("mutual tls", str(response.json()["detail"]).lower())

    @override_settings(
        ENDOREG_DEPLOYMENT_ROLE="central_hub",
        ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=True,
        ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=True,
        ENDOREG_HUB_TRANSFER_MTLS_META_KEY="HTTP_X_CLIENT_CERT_VERIFIED",
        ENDOREG_HUB_TRANSFER_MTLS_META_VALUE="SUCCESS",
    )
    def test_transfer_media_upload_accepts_secure_proxy_attested_request(self):
        transfer_job = self._create_transfer_job(
            transfer_key="site-node__report__media-ok__v1"
        )
        uploaded_file = SimpleUploadedFile(
            "report.pdf",
            b"%PDF-1.4\nhub-transfer\n",
            content_type="application/pdf",
        )

        with patch(
            "endoreg_db.views.media.hub.transfers.attach_transfer_media",
            return_value=transfer_job,
        ) as mocked_attach:
            response = self.client.post(
                f"/api/media/hub/transfers/{transfer_job.transfer_key}/media/",
                data={"media_role": "processed", "file": uploaded_file},
                secure=True,
                HTTP_X_CLIENT_CERT_VERIFIED="SUCCESS",
                HTTP_X_NETWORK_NODE_KEY=self.site_node.node_key,
                HTTP_X_NETWORK_NODE_SECRET="super-secret",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["transfer_key"], transfer_job.transfer_key)
        mocked_attach.assert_called_once()
