# pyright: reportAttributeAccessIssue=false, reportIndexIssue=false
from __future__ import annotations

import base64
import hashlib
import json
import os
from typing import Any, cast
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from endoreg_db.models import (
    Center,
    NetworkNode,
    PortalUserInfo,
    RawPdfFile,
    RawPdfState,
    VideoFile,
    VideoState,
)
from endoreg_db.services.raw_pdf_files import validate_report_metadata_annotation
from endoreg_db.utils.hashs import get_file_hash
from endoreg_db.utils.storage import file_exists

from lx_annotate.models import OutboundHubTransferJob
from tests.hub_payload_helpers import (
    create_hub_sensitive_meta,
    hub_report_pdf_bytes,
    hub_video_artifact,
    verify_hub_report_artifact,
)

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")
User = cast(Any, get_user_model())

os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


class HubExportApiTests(TestCase):
    def setUp(self) -> None:
        self.operator = User.objects.create_user(username="hub-operator")
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
        self.report_state = RawPdfState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
        )
        self.report = RawPdfFile.objects.create(
            center=self.center,
            state=self.report_state,
            pdf_hash="report-hash-1",
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            anonymized_text="Reviewed anonymous report",
            file=ContentFile(hub_report_pdf_bytes("raw"), name="report-1.pdf"),
            processed_file=ContentFile(
                hub_report_pdf_bytes("processed"),
                name="report-1-processed.pdf",
            ),
        )
        verify_hub_report_artifact(self.report)

    def test_manually_corrected_report_is_retained_and_eligible_after_acceptance(
        self,
    ) -> None:
        self.report.sensitive_meta = create_hub_sensitive_meta(center=self.center)
        self.report.save(update_fields=["sensitive_meta"])
        corrected_bytes = hub_report_pdf_bytes("Manually anonymized report")
        correction = self.client.post(
            f"/api/media/pdfs/{self.report.pk}/apply-redactions/",
            data={
                "file": SimpleUploadedFile(
                    "corrected.pdf", corrected_bytes, content_type="application/pdf"
                ),
                "source_type": "raw",
                "client_source_sha256": get_file_hash(self.report.file),
                "redaction_manifest": json.dumps(
                    {
                        "version": 1,
                        "normalized": True,
                        "pages": [
                            {
                                "page": 1,
                                "boxes": [
                                    {"x": 0.1, "y": 0.1, "width": 0.2, "height": 0.1}
                                ],
                            }
                        ],
                    }
                ),
            },
        )
        self.assertEqual(correction.status_code, 201, correction.content)
        self.report.refresh_from_db()
        corrected_name = self.report.processed_file.name
        self.report_state.refresh_from_db()
        self.assertFalse(self.report_state.anonymization_validated)
        with self.captureOnCommitCallbacks(execute=True):
            accepted = validate_report_metadata_annotation(
                self.report,
                {
                    "patient_first_name": "Test",
                    "patient_last_name": "Patient",
                    "patient_dob": "1980-01-01",
                    "anonymized_text": "Manually anonymized report",
                },
            )
        self.assertTrue(accepted)
        self.report.refresh_from_db()
        self.assertEqual(self.report.processed_file.name, corrected_name)
        self.assertEqual(
            get_file_hash(self.report.processed_file),
            hashlib.sha256(corrected_bytes).hexdigest(),
        )
        self.assertTrue(file_exists(self.report.processed_file))
        self.assertFalse(file_exists(self.report.file))
        overview = self.client.get("/api/hub-export/overview/")
        self.assertEqual(overview.status_code, 200, overview.content)
        self.assertTrue(overview.json()["items"][0]["eligible"])

    def test_hub_export_overview_lists_eligible_items(self):
        empty_center = Center.objects.create(
            name="Empty Center",
            center_key="empty-center",
        )
        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["config_ready"])
        self.assertEqual(payload["selected_target_node_key"], "hub-node")
        self.assertEqual(payload["source_node_key"], "site-node")
        self.assertEqual(len(payload["items"]), 1)
        self.assertTrue(payload["items"][0]["eligible"])
        self.assertEqual(
            payload["items"][0]["segment_annotation_status"],
            "not_started",
        )
        self.assertEqual(
            payload["items"][0]["export_integrity_status"],
            "persisted_verified",
        )
        self.assertFalse(payload["items"][0]["marked_for_upload"])
        self.assertIsNone(payload["items"][0]["outbound_job_id"])
        self.assertIsNone(payload["items"][0]["marked_by_username"])
        self.assertIsNone(payload["items"][0]["marked_at"])
        self.assertEqual(payload["privacy_summary"]["min_k"], 5)
        self.assertEqual(payload["privacy_summary"]["eligible_resource_count"], 1)
        self.assertEqual(
            payload["privacy_summary"]["smallest_equivalence_class_size"],
            1,
        )
        self.assertFalse(payload["privacy_summary"]["passes_k_anonymity"])
        sync_summary = payload["sync_summary"]
        self.assertEqual(sync_summary["processed_file_count"], 1)
        self.assertEqual(sync_summary["candidate_count"], 1)
        self.assertEqual(sync_summary["rejections"], [])
        self.assertEqual(sync_summary["duplicates"], [])
        centers_by_key = {
            center["center_key"]: center for center in sync_summary["centers"]
        }
        self.assertNotIn(empty_center.center_key, centers_by_key)
        self.assertEqual(
            centers_by_key[self.center.center_key]["active_node_keys"],
            ["hub-node", "site-node"],
        )

    def test_mark_and_unmark_report_for_hub_upload(self):
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).count(),
            1,
        )
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        self.assertEqual(job.marked_by, self.operator)

        overview_response = self.client.get("/api/hub-export/overview/")
        overview_payload = overview_response.json()
        self.assertTrue(overview_payload["items"][0]["marked_for_upload"])
        self.assertEqual(
            overview_payload["items"][0]["marked_by_username"],
            self.operator.get_username(),
        )
        self.assertEqual(
            overview_payload["items"][0]["marked_at"],
            job.marked_at.isoformat(),
        )
        self.assertEqual(len(overview_payload["sync_summary"]["duplicates"]), 1)
        self.assertEqual(
            overview_payload["sync_summary"]["duplicates"][0]["reason"],
            "transfer_already_registered",
        )

        unmark_response = self.client.post(
            "/api/hub-export/unmark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(unmark_response.status_code, 200)
        self.assertEqual(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).count(),
            0,
        )

    def test_mark_rejects_client_supplied_operator_identity(self) -> None:
        response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "marked_by": "client-supplied-actor",
                "resources": [
                    {"id": self.report.id, "resource_kind": "report"},
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

    def test_overview_exposes_typed_failure_class_for_operator_triage(self) -> None:
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        job.failure_class = OutboundHubTransferJob.FailureClass.AUTHORIZATION_DENIAL
        job.last_error = (
            "Hub transfer authorization denied for /protected/clinical/report.pdf "
            "with secret super-secret."
        )
        job.save(update_fields=["local_status", "failure_class", "last_error"])

        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertEqual(item["outbound_job_id"], str(job.pk))
        self.assertEqual(item["failure_class"], "authorization_denial")
        self.assertEqual(item["last_error"], "Hub transfer authorization was denied.")
        self.assertNotIn("super-secret", item["last_error"])
        self.assertNotIn("/protected/clinical", item["last_error"])

    def test_overview_explains_only_allowlisted_payload_failures(self) -> None:
        from lx_annotate.hub.hub_export_jobs import _operator_failure_detail

        job = OutboundHubTransferJob(
            local_status=OutboundHubTransferJob.LocalStatus.FAILED,
            failure_class=OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION,
        )
        cases = [
            (
                "SensitiveMeta with patient_hash and examination_hash is required for hub transfer.",
                "Complete metadata review",
            ),
            (
                "SensitiveMeta must include patient_hash and examination_hash for hub transfer.",
                "identity hashes are missing",
            ),
            (
                "Actual frame provenance is unavailable for this recording",
                "Retrying alone cannot repair",
            ),
            (
                "Actual frame provenance is unavailable for this recording /private secret",
                "configuration or payload was rejected",
            ),
        ]
        for reason, expected in cases:
            with self.subTest(reason=reason):
                job.last_error = (
                    "Hub transfer configuration or payload rejected: " + reason
                )
                detail = _operator_failure_detail(job)
                self.assertIn(expected, detail)
                self.assertNotIn("/private", detail)
                self.assertNotIn("secret", detail)

    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_operator_retry_locks_base_row_and_requeues_same_failed_job(
        self,
        delay_mock,
    ) -> None:
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        original_job_id = job.pk
        original_transfer_key = job.transfer_key
        job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        job.failure_class = OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION
        job.last_error = "Outbound hub transfer requires mTLS client files."
        job.save(update_fields=["local_status", "failure_class", "last_error"])

        with CaptureQueriesContext(connection) as queries:
            with getattr(self, "captureOnCommitCallbacks")(execute=True):
                response = self.client.post(
                    f"/api/hub-export/jobs/{job.pk}/retry/",
                    data={},
                    content_type="application/json",
                )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "outbound_job_id": str(original_job_id),
                "transfer_key": original_transfer_key,
                "local_status": "queued",
            },
        )
        job.refresh_from_db()
        self.assertEqual(job.pk, original_job_id)
        self.assertEqual(job.transfer_key, original_transfer_key)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        self.assertEqual(
            job.failure_class,
            OutboundHubTransferJob.FailureClass.NO_FAILURE,
        )
        self.assertEqual(job.last_error, "")
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)
        job_selects = [
            query["sql"]
            for query in queries.captured_queries
            if query["sql"].lstrip().upper().startswith("SELECT")
            and OutboundHubTransferJob._meta.db_table in query["sql"]
        ]
        self.assertGreaterEqual(len(job_selects), 2)
        self.assertNotIn(" JOIN ", job_selects[0].upper())
        self.assertIn(" JOIN ", job_selects[1].upper())

    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_operator_retry_preserves_failure_until_identity_metadata_is_repaired(
        self,
        delay_mock,
    ) -> None:
        response = self.client.post(
            "/api/hub-export/mark/",
            data={"resources": [{"id": self.report.pk, "resource_kind": "report"}]},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        job.failure_class = OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION
        job.last_error = (
            "Hub transfer configuration or payload rejected: SensitiveMeta with "
            "patient_hash and examination_hash is required for hub transfer."
        )
        job.save(update_fields=["local_status", "failure_class", "last_error"])
        original_error, original_key = job.last_error, job.transfer_key
        self.report.sensitive_meta = None
        self.report.save(update_fields=["sensitive_meta"])

        response = self.client.post(
            f"/api/hub-export/jobs/{job.pk}/retry/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("Complete metadata review", response.content.decode())
        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(job.last_error, original_error)
        self.assertEqual(job.transfer_key, original_key)
        delay_mock.assert_not_called()

    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_operator_retry_rejects_non_failed_job(self, delay_mock) -> None:
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)

        response = self.client.post(
            f"/api/hub-export/jobs/{job.pk}/retry/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn("Only failed", response.json()["detail"])
        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.MARKED)
        delay_mock.assert_not_called()

    def test_hub_export_operator_endpoints_require_authentication(self):
        self.client.logout()

        for method, path, data in (
            ("get", "/api/hub-export/overview/", None),
            (
                "post",
                "/api/hub-export/mark/",
                {
                    "target_node_key": "hub-node",
                    "resources": [{"id": self.report.id, "resource_kind": "report"}],
                },
            ),
            (
                "post",
                "/api/hub-export/unmark/",
                {
                    "target_node_key": "hub-node",
                    "resources": [{"id": self.report.id, "resource_kind": "report"}],
                },
            ),
            (
                "post",
                "/api/hub-export/jobs/11111111-1111-1111-1111-111111111111/retry/",
                {},
            ),
        ):
            response = getattr(self.client, method)(
                path,
                data=data,
                content_type="application/json" if data is not None else None,
            )
            self.assertIn(response.status_code, {401, 403})

    def test_hub_export_rejects_camel_case_request_aliases(self) -> None:
        resource_alias_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resourceKind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(resource_alias_response.status_code, 400)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

        NetworkNode.objects.create(
            display_name="Second Hub Node",
            node_key="hub-node-2",
            role=NetworkNode.Role.CENTRAL_HUB,
            base_url="https://hub-2.example/",
            owning_center=self.center,
        )
        target_alias_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "targetNodeKey": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )

        self.assertEqual(target_alias_response.status_code, 400)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

    def test_bulk_mark_is_atomic_when_one_resource_is_invalid(self):
        response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [
                    {"id": self.report.id, "resource_kind": "report"},
                    {"id": 999999, "resource_kind": "report"},
                ],
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=self.report).exists(),
        )

    def test_bulk_unmark_is_atomic_and_only_marked_jobs_are_reversible(self):
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)

        failed_unmark = self.client.post(
            "/api/hub-export/unmark/",
            data={
                "target_node_key": "hub-node",
                "resources": [
                    {"id": self.report.id, "resource_kind": "report"},
                    {"id": self.report.id, "resource_kind": "unsupported"},
                ],
            },
            content_type="application/json",
        )
        self.assertEqual(failed_unmark.status_code, 400)
        self.assertTrue(OutboundHubTransferJob.objects.filter(pk=job.pk).exists())

        job.local_status = OutboundHubTransferJob.LocalStatus.QUEUED
        job.save(update_fields=["local_status", "updated_at"])
        queued_unmark = self.client.post(
            "/api/hub-export/unmark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(queued_unmark.status_code, 200)
        self.assertEqual(queued_unmark.json()["unmarked_count"], 0)
        self.assertTrue(OutboundHubTransferJob.objects.filter(pk=job.pk).exists())

    def test_mark_history_remains_visible_to_another_operator(self):
        mark_response = self.client.post(
            "/api/hub-export/mark/",
            data={
                "target_node_key": "hub-node",
                "resources": [{"id": self.report.id, "resource_kind": "report"}],
            },
            content_type="application/json",
        )
        self.assertEqual(mark_response.status_code, 200)

        reviewing_operator = User.objects.create_user(username="reviewing-operator")
        reviewing_operator.groups.add(Group.objects.get_or_create(name="data:read")[0])
        PortalUserInfo.objects.get_or_create(user=reviewing_operator)[0].centers.add(
            self.center
        )
        self.client.force_login(reviewing_operator)
        overview = self.client.get("/api/hub-export/overview/")

        self.assertEqual(overview.status_code, 200)
        item = overview.json()["items"][0]
        self.assertEqual(item["marked_by_username"], self.operator.get_username())
        self.assertIsNotNone(item["marked_at"])

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=True)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_mark_dispatches_secure_transfer_worker(self, delay_mock):
        with getattr(self, "captureOnCommitCallbacks")(execute=True):
            response = self.client.post(
                "/api/hub-export/mark/",
                data={
                    "target_node_key": "hub-node",
                    "resources": [{"id": self.report.id, "resource_kind": "report"}],
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=False)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_bulk_video_offload_fresh_verifies_and_explicitly_queues(self, delay_mock):
        processed_content = b"eligible-anonymized-video"
        processed_hash = hashlib.sha256(processed_content).hexdigest()
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
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
            raw_video_hash="eligible-video-hash",
            processed_video_hash=processed_hash,
            original_file_name="eligible-video.mp4",
            processed_file=ContentFile(processed_content, name="eligible-video.mp4"),
        )
        VideoFile.objects.create(
            center=self.center,
            raw_video_hash="ineligible-video-hash",
            original_file_name="ineligible-video.mp4",
        )

        with getattr(self, "captureOnCommitCallbacks")(execute=True):
            response = self.client.post(
                "/api/hub-export/offload-eligible-videos/",
                data={
                    "target_node_key": "hub-node",
                    "retain_local_processed_media": False,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "target_node_key": "hub-node",
                "discovered_count": 2,
                "eligible_count": 1,
                "queued_count": 1,
                "already_registered_count": 0,
                "skipped_count": 1,
            },
        )
        job = OutboundHubTransferJob.objects.get(video_file=video)
        self.assertEqual(
            job.local_cleanup_policy,
            OutboundHubTransferJob.LocalCleanupPolicy.ELIGIBLE_AFTER_VERIFIED_APPLY,
        )
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        self.assertEqual(job.marked_by, self.operator)
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)

    @override_settings(LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE=False)
    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_bulk_video_offload_retries_existing_failed_job(self, delay_mock):
        source_hash, processed_content = hub_video_artifact()
        processed_hash = hashlib.sha256(processed_content).hexdigest()
        video_state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
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
            raw_video_hash=source_hash,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            suffix=".mp4",
            fps=25.0,
            duration=1.0,
            frame_count=25,
            width=320,
            height=240,
            processed_video_hash=processed_hash,
            original_file_name="retryable-video.mp4",
            processed_file=ContentFile(processed_content, name="retryable-video.mp4"),
        )

        with getattr(self, "captureOnCommitCallbacks")(execute=True):
            first_response = self.client.post(
                "/api/hub-export/offload-eligible-videos/",
                data={"target_node_key": "hub-node"},
                content_type="application/json",
            )
        self.assertEqual(first_response.status_code, 200)
        job = OutboundHubTransferJob.objects.get(video_file=video)
        original_job_id = job.pk
        original_transfer_key = job.transfer_key
        job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        job.failure_class = OutboundHubTransferJob.FailureClass.TRANSIENT_RETRY
        job.last_error = "temporary transfer failure"
        job.save(
            update_fields=[
                "local_status",
                "failure_class",
                "last_error",
                "updated_at",
            ],
        )
        delay_mock.reset_mock()

        with getattr(self, "captureOnCommitCallbacks")(execute=True):
            retry_response = self.client.post(
                "/api/hub-export/offload-eligible-videos/",
                data={"target_node_key": "hub-node"},
                content_type="application/json",
            )

        self.assertEqual(retry_response.status_code, 200)
        self.assertEqual(retry_response.json()["queued_count"], 1)
        self.assertEqual(retry_response.json()["already_registered_count"], 0)
        job.refresh_from_db()
        self.assertEqual(job.pk, original_job_id)
        self.assertEqual(job.transfer_key, original_transfer_key)
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.QUEUED)
        self.assertEqual(
            job.failure_class,
            OutboundHubTransferJob.FailureClass.NO_FAILURE,
        )
        self.assertEqual(job.last_error, "")
        delay_mock.assert_called_once_with(str(job.pk), self.site_node.node_key)

        from endoreg_db.models.media.video.frame_provenance import VideoFrameProvenance

        VideoFrameProvenance.objects.all().delete()
        job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        job.failure_class = OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION
        job.last_error = "Actual frame provenance is unavailable for this recording"
        job.save(update_fields=["local_status", "failure_class", "last_error"])
        delay_mock.reset_mock()
        with self.captureOnCommitCallbacks(execute=True):
            blocked = self.client.post(
                "/api/hub-export/offload-eligible-videos/",
                data={"target_node_key": "hub-node"},
                content_type="application/json",
            )
        self.assertEqual(blocked.status_code, 200)
        self.assertEqual(blocked.json()["queued_count"], 0)
        self.assertEqual(blocked.json()["skipped_count"], 1)
        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.FAILED)
        self.assertEqual(job.transfer_key, original_transfer_key)
        delay_mock.assert_not_called()

    def test_hub_export_overview_reports_not_ready_when_multiple_hubs_exist(self):
        NetworkNode.objects.create(
            display_name="Hub Node 2",
            node_key="hub-node-2",
            role=NetworkNode.Role.CENTRAL_HUB,
            base_url="https://hub-2.example/",
            owning_center=self.center,
        )

        response = self.client.get("/api/hub-export/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertFalse(payload["config_ready"])
        self.assertIn("exactly one active central hub node", payload["config_error"])

    def test_wrong_center_mark_and_unmark_are_atomic(self):
        other_center = Center.objects.create(name="Other", center_key="other")
        other_report = RawPdfFile.objects.create(
            center=other_center, pdf_hash="other-report"
        )
        body = {
            "target_node_key": "hub-node",
            "resources": [{"id": self.report.pk, "resource_kind": "report"}],
        }
        self.assertEqual(
            self.client.post(
                "/api/hub-export/mark/", body, content_type="application/json"
            ).status_code,
            200,
        )
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        body["resources"].append({"id": other_report.pk, "resource_kind": "report"})
        for action in ("mark", "unmark"):
            response = self.client.post(
                f"/api/hub-export/{action}/", body, content_type="application/json"
            )
            self.assertEqual(response.status_code, 403)
        self.assertTrue(OutboundHubTransferJob.objects.filter(pk=job.pk).exists())
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(raw_pdf_file=other_report).exists()
        )

    def test_wrong_center_retry_is_denied(self):
        body = {
            "target_node_key": "hub-node",
            "resources": [{"id": self.report.pk, "resource_kind": "report"}],
        }
        self.assertEqual(
            self.client.post(
                "/api/hub-export/mark/", body, content_type="application/json"
            ).status_code,
            200,
        )
        job = OutboundHubTransferJob.objects.get(raw_pdf_file=self.report)
        job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        job.save(update_fields=["local_status"])
        other_center = Center.objects.create(name="Other", center_key="other")
        PortalUserInfo.objects.get(user=self.operator).centers.set([other_center])
        response = self.client.post(
            f"/api/hub-export/jobs/{job.pk}/retry/", {}, content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)
        job.refresh_from_db()
        self.assertEqual(job.local_status, OutboundHubTransferJob.LocalStatus.FAILED)

    def test_bulk_offload_and_overview_only_discover_allowed_centers(self):
        other_center = Center.objects.create(name="Other", center_key="other")
        hidden = VideoFile.objects.create(
            center=other_center, raw_video_hash="other-video"
        )
        own = VideoFile.objects.create(center=self.center, raw_video_hash="own-video")
        overview = self.client.get("/api/hub-export/overview/")
        self.assertEqual(overview.status_code, 200)
        video_ids = [
            item["id"]
            for item in overview.json()["items"]
            if item["resource_kind"] == "video"
        ]
        self.assertEqual(video_ids, [own.pk])
        response = self.client.post(
            "/api/hub-export/offload-eligible-videos/",
            {},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["discovered_count"], 1)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(video_file=hidden).exists()
        )

    def test_overview_denies_centerless_operator(self):
        PortalUserInfo.objects.get(user=self.operator).centers.clear()
        self.assertEqual(self.client.get("/api/hub-export/overview/").status_code, 403)

    def _recovery_video(self, *, provenance=True, source=True):
        raw_hash, content = hub_video_artifact()
        digest = hashlib.sha256(content).hexdigest()
        state = VideoState.objects.create(
            anonymized=True,
            sensitive_meta_processed=True,
            processing_started=True,
            anonymization_validated=True,
            outside_segments_removed=True,
            segment_annotations_created=True,
            segment_annotations_validated=True,
            ready_for_export=True,
            ready_for_export_at=timezone.now(),
            ready_for_export_by="test-suite",
            processed_file_sha256=digest,
        )
        return VideoFile.objects.create(
            center=self.center,
            state=state,
            sensitive_meta=create_hub_sensitive_meta(center=self.center),
            raw_video_hash=raw_hash if provenance else "a" * 64,
            raw_file=ContentFile(b"retained source", name="recovery-source.mp4")
            if source
            else "",
            processed_video_hash=digest,
            processed_file=ContentFile(content, name="recovery.mp4"),
            fps=25,
            duration=1,
            frame_count=25,
            width=320,
            height=240,
        )

    @patch("lx_annotate.tasks.run_outbound_hub_transfer_job_task.delay")
    def test_preflight_without_job_verifies_sender_payload_without_mutation(
        self, dispatch
    ):
        from endoreg_db.models.media.operation_lease import MediaOperationLease

        video = self._recovery_video()
        before = VideoState.objects.filter(pk=video.state_id).values().get()
        response = self.client.post(f"/api/hub-export/videos/{video.pk}/preflight/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["blockers"], [])
        self.assertEqual(response.json()["verification"], "fresh_payload")
        self.assertEqual(response.json()["allowed_actions"], ["mark"])
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(video_file=video).exists()
        )
        self.assertFalse(MediaOperationLease.objects.filter(video=video).exists())
        self.assertEqual(
            before, VideoState.objects.filter(pk=video.state_id).values().get()
        )
        dispatch.assert_not_called()

    def test_stored_ready_missing_provenance_offers_retained_source_repair(self):
        video = self._recovery_video(provenance=False)
        overview = self.client.get("/api/hub-export/overview/").json()
        row = next(
            item for item in overview["items"] if item["resource_kind"] == "video"
        )
        self.assertEqual(row["recovery"]["verification"], "stored_metadata")
        response = self.client.post(f"/api/hub-export/videos/{video.pk}/preflight/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["blockers"][0]["code"], "provenance")
        self.assertEqual(response.json()["allowed_actions"], ["repair_processing"])

    def test_missing_source_provenance_recovery_requires_administrator(self):
        video = self._recovery_video(provenance=False, source=False)
        response = self.client.post(f"/api/hub-export/videos/{video.pk}/preflight/")
        self.assertEqual(response.json()["allowed_actions"], ["administrator_recovery"])
        video.refresh_from_db()
        self.assertTrue(video.processed_file.storage.exists(video.processed_file.name))

    def test_identity_and_export_proof_are_distinct_recovery_blockers(self):
        video = self._recovery_video()
        video.sensitive_meta = None
        video.save(update_fields=["sensitive_meta"])
        video.state.ready_for_export = False
        video.state.save(update_fields=["ready_for_export"])
        overview = self.client.get("/api/hub-export/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertFalse(
            next(
                row
                for row in overview.json()["items"]
                if row["resource_kind"] == "video"
            )["eligible"]
        )
        response = self.client.post(f"/api/hub-export/videos/{video.pk}/preflight/")
        self.assertEqual(
            {b["code"] for b in response.json()["blockers"]},
            {"identity_evidence", "export_proof"},
        )

    def test_preflight_rejects_wrong_center_and_missing_permission(self):
        video = self._recovery_video()
        PortalUserInfo.objects.get(user=self.operator).centers.clear()
        self.assertEqual(
            self.client.post(
                f"/api/hub-export/videos/{video.pk}/preflight/"
            ).status_code,
            403,
        )
        PortalUserInfo.objects.get(user=self.operator).centers.add(self.center)
        self.operator.groups.clear()
        self.assertEqual(
            self.client.post(
                f"/api/hub-export/videos/{video.pk}/preflight/"
            ).status_code,
            403,
        )

    def test_cleanup_inspection_requires_administrator(self):
        video = self._recovery_video()
        self.assertEqual(
            self.client.post(
                f"/api/hub-export/videos/{video.pk}/inspect-recovery/"
            ).status_code,
            403,
        )

    @patch("celery.current_app.control.inspect")
    def test_cleanup_inspection_old_live_and_unknown_never_restarts_work(self, inspect):
        from datetime import timedelta

        from endoreg_db.models.media.video.video_processing import (
            VideoProcessingHistory,
        )
        from endoreg_db.services.annotations.segment_validation_workflow import (
            blackening_history_config,
        )

        self.operator.is_superuser = True
        self.operator.save(update_fields=["is_superuser"])
        video = self._recovery_video()
        history = VideoProcessingHistory.objects.create(
            video=video,
            operation="reprocessing",
            status="running",
            task_id="cleanup-task",
            config=blackening_history_config(
                only_validated=False, queue="frame_extraction"
            ),
        )
        VideoProcessingHistory.objects.filter(pk=history.pk).update(
            created_at=timezone.now() - timedelta(days=2)
        )
        inspector = inspect.return_value
        inspector.active_queues.return_value = {
            "worker": [{"name": "frame_extraction"}]
        }
        inspector.active.return_value = {"worker": [{"id": "cleanup-task"}]}
        inspector.reserved.return_value = {"worker": []}
        inspector.scheduled.return_value = {"worker": []}
        url = f"/api/hub-export/videos/{video.pk}/inspect-recovery/"
        data = self.client.post(url).json()
        self.assertTrue(data["stale_candidate"])
        self.assertTrue(data["task_observed"])
        self.assertFalse(data["recovery_allowed"])
        inspector.active.return_value = None
        data = self.client.post(url).json()
        self.assertIsNone(data["task_observed"])
        history.refresh_from_db()
        self.assertEqual(history.status, "running")

    def test_preflight_wrong_storage_key_rejects_without_altering_proof(self):
        from endoreg_db.utils.encryption.encrypted import EncryptedStorage

        video = self._recovery_video()
        field = VideoFile._meta.get_field("processed_file")
        storage = field.storage
        with storage.open(video.processed_file.name, "rb") as handle:
            content = handle.read()
        digest = hashlib.sha256(content).hexdigest()
        wrong = EncryptedStorage(location=storage.path(""), master_key=b"1" * 32)
        with patch.object(field, "storage", wrong):
            response = self.client.post(f"/api/hub-export/videos/{video.pk}/preflight/")
        self.assertEqual(response.json()["blockers"][0]["code"], "integrity")
        self.assertNotEqual(response.json()["verification"], "fresh_payload")
        video.state.refresh_from_db()
        self.assertEqual(video.state.processed_file_sha256, digest)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(video_file=video).exists()
        )

    def test_preflight_requires_receipt_for_the_current_artifact(self):
        from lx_dtypes.models.contracts.hub_media_envelope import (
            HubMediaEnvelopeReceipt,
        )

        video = self._recovery_video()
        key = f"site-node__video__{video.raw_video_hash}__processed_v1"
        receipt = HubMediaEnvelopeReceipt(
            transfer_key=key,
            source_node_key="site-node",
            source_center_key=self.center.center_key,
            target_node_key="hub-node",
            resource_kind="video",
            resource_hash=video.raw_video_hash,
            processed_media_hash=video.processed_video_hash,
            plaintext_sha256=video.processed_video_hash,
            plaintext_size=video.processed_file.size,
            ciphertext_size=video.processed_file.size,
            recipient_key_id="a" * 64,
            ciphertext_sha256="b" * 64,
            envelope_fingerprint_sha256="c" * 64,
            receiver_transfer_id="receiver-id",
            processing_decision="skip_processing_preserved_state",
        )
        job = OutboundHubTransferJob.objects.create(
            video_file=video,
            source_center=self.center,
            target_node=self.hub_node,
            resource_kind="video",
            transfer_key=key,
            local_status="completed",
            remote_transfer_id="receiver-id",
            remote_transfer_status="applied",
            envelope_receipt=receipt.model_dump(mode="json"),
        )
        url = f"/api/hub-export/videos/{video.pk}/preflight/"
        self.assertTrue(self.client.post(url).json()["completed_current_artifact"])
        stale_receipt = receipt.model_copy(
            update={"processed_media_hash": "d" * 64, "plaintext_sha256": "d" * 64}
        )
        # Simulate historical persisted evidence; normal model writes reject this mismatch.
        OutboundHubTransferJob.objects.filter(pk=job.pk).update(
            envelope_receipt=stale_receipt.model_dump(mode="json")
        )
        result = self.client.post(url).json()
        self.assertFalse(result["completed_current_artifact"])
        self.assertEqual(result["blockers"][0]["code"], "receipt")
        job.refresh_from_db()
        self.assertEqual(job.local_status, "completed")

    def _cleanup_recovery_fixture(self, inspect, *, source=True):
        from datetime import timedelta

        from endoreg_db.config.env import get_celery_ffmpeg_media_queue
        from endoreg_db.models.media.video.video_processing import (
            VideoProcessingHistory,
        )
        from endoreg_db.services.annotations.segment_validation_workflow import (
            blackening_history_config,
        )

        queue = get_celery_ffmpeg_media_queue()
        self.operator.is_superuser = True
        self.operator.save(update_fields=["is_superuser"])
        video = self._recovery_video(source=source)
        history = VideoProcessingHistory.objects.create(
            video=video,
            operation="reprocessing",
            status="pending",
            task_id="old-cleanup-task",
            config=blackening_history_config(only_validated=True, queue=queue),
        )
        VideoProcessingHistory.objects.filter(pk=history.pk).update(
            created_at=timezone.now() - timedelta(days=2)
        )
        inspector = inspect.return_value
        inspector.active_queues.return_value = {"worker": [{"name": queue}]}
        inspector.active.return_value = {"worker": []}
        inspector.reserved.return_value = {"worker": []}
        inspector.scheduled.return_value = {"worker": []}
        return video, history

    @patch.dict(
        os.environ,
        {
            "VIDEO_POST_VALIDATION_JOB_MODE": "celery",
            "CELERY_FFMPEG_MEDIA_REQUIRE_SECURE_TRANSPORT": "false",
        },
    )
    @patch("endoreg_db.tasks.run_video_post_validation_rebuild_task.apply_async")
    @patch("celery.current_app.control.inspect")
    def test_reviewed_cleanup_restart_reuses_dispatcher_and_rejects_replay(
        self, inspect, dispatch
    ):
        from types import SimpleNamespace

        video, history = self._cleanup_recovery_fixture(inspect)
        dispatch.return_value = SimpleNamespace(id="new-cleanup-task")
        preview = self.client.post(
            f"/api/hub-export/videos/{video.pk}/inspect-recovery/"
        ).json()
        self.assertTrue(preview["recovery_allowed"])
        request = {
            "preview_token": preview["preview_token"],
            "queue_and_consumers_reviewed": True,
            "confirm_frame_rollback": True,
        }
        url = f"/api/hub-export/videos/{video.pk}/restart-cleanup/"
        response = self.client.post(
            url, data=json.dumps(request), content_type="application/json"
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["status"], "queued")
        self.assertNotEqual(response.json()["history_id"], history.pk)
        history.refresh_from_db()
        self.assertEqual(history.status, "failure")
        self.assertTrue(dispatch.call_args.kwargs["kwargs"]["only_validated"])
        self.assertEqual(dispatch.call_count, 1)
        replay = self.client.post(
            url, data=json.dumps(request), content_type="application/json"
        )
        self.assertEqual(replay.status_code, 409)
        self.assertEqual(dispatch.call_count, 1)
        self.assertFalse(
            OutboundHubTransferJob.objects.filter(video_file=video).exists()
        )

    @patch(
        "endoreg_db.services.jobs.video_post_validation_jobs.dispatch_video_post_validation_rebuild"
    )
    @patch("celery.current_app.control.inspect")
    def test_cleanup_restart_rechecks_live_task_review_and_permission(
        self, inspect, dispatch
    ):
        video, history = self._cleanup_recovery_fixture(inspect)
        preview = self.client.post(
            f"/api/hub-export/videos/{video.pk}/inspect-recovery/"
        ).json()
        request = {
            "preview_token": preview["preview_token"],
            "queue_and_consumers_reviewed": False,
            "confirm_frame_rollback": True,
        }
        url = f"/api/hub-export/videos/{video.pk}/restart-cleanup/"
        self.assertEqual(
            self.client.post(
                url, data=json.dumps(request), content_type="application/json"
            ).status_code,
            400,
        )
        request["queue_and_consumers_reviewed"] = True
        inspect.return_value.active.return_value = {
            "worker": [{"id": "old-cleanup-task"}]
        }
        self.assertEqual(
            self.client.post(
                url, data=json.dumps(request), content_type="application/json"
            ).status_code,
            409,
        )
        self.operator.is_superuser = False
        self.operator.save(update_fields=["is_superuser"])
        self.assertEqual(
            self.client.post(
                url, data=json.dumps(request), content_type="application/json"
            ).status_code,
            403,
        )
        history.refresh_from_db()
        self.assertEqual(history.status, "pending")
        dispatch.assert_not_called()

    @patch("celery.current_app.control.inspect")
    def test_cleanup_restart_refuses_missing_source_and_active_media(self, inspect):
        from endoreg_db.services.media.operation_gate import create_video_stream_lease

        video, history = self._cleanup_recovery_fixture(inspect, source=False)
        url = f"/api/hub-export/videos/{video.pk}/inspect-recovery/"
        self.assertFalse(self.client.post(url).json()["recovery_allowed"])
        video.raw_file.save("retained-source.mp4", ContentFile(b"retained source"))
        create_video_stream_lease(video, file_type="processed")
        preview = self.client.post(url).json()
        self.assertFalse(preview["recovery_allowed"])
        self.assertIsNone(preview["preview_token"])

    @patch(
        "endoreg_db.services.jobs.video_post_validation_jobs.dispatch_video_post_validation_rebuild"
    )
    @patch("celery.current_app.control.inspect")
    def test_cleanup_restart_rejects_tampered_and_expired_preview(
        self, inspect, dispatch
    ):
        import time

        video, history = self._cleanup_recovery_fixture(inspect)
        preview = self.client.post(
            f"/api/hub-export/videos/{video.pk}/inspect-recovery/"
        ).json()
        self.assertTrue(preview["recovery_allowed"], preview)
        request = {
            "preview_token": preview["preview_token"],
            "queue_and_consumers_reviewed": True,
            "confirm_frame_rollback": True,
        }
        url = f"/api/hub-export/videos/{video.pk}/restart-cleanup/"
        with patch("django.core.signing.time.time", return_value=time.time() + 301):
            self.assertEqual(
                self.client.post(
                    url, data=json.dumps(request), content_type="application/json"
                ).status_code,
                409,
            )
        request["preview_token"] += "tampered"
        self.assertEqual(
            self.client.post(
                url, data=json.dumps(request), content_type="application/json"
            ).status_code,
            409,
        )
        history.refresh_from_db()
        self.assertEqual(history.status, "pending")
        dispatch.assert_not_called()

    @patch.dict(
        os.environ,
        {
            "VIDEO_POST_VALIDATION_JOB_MODE": "celery",
            "CELERY_FFMPEG_MEDIA_REQUIRE_SECURE_TRANSPORT": "false",
        },
    )
    @patch("endoreg_db.tasks.run_video_post_validation_rebuild_task.apply_async")
    @patch("celery.current_app.control.inspect")
    def test_reviewed_running_cleanup_restarts_and_retains_media(
        self, inspect, dispatch
    ):
        from types import SimpleNamespace

        video, history = self._cleanup_recovery_fixture(inspect)
        history.status = "running"
        history.save(update_fields=["status"])
        processed_hash = get_file_hash(video.processed_file)
        dispatch.return_value = SimpleNamespace(id="restarted-running-task")
        preview = self.client.post(
            f"/api/hub-export/videos/{video.pk}/inspect-recovery/"
        ).json()
        self.assertTrue(preview["recovery_allowed"], preview)
        request = {
            "preview_token": preview["preview_token"],
            "queue_and_consumers_reviewed": True,
            "confirm_frame_rollback": True,
        }
        response = self.client.post(
            f"/api/hub-export/videos/{video.pk}/restart-cleanup/",
            data=json.dumps(request),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["status"], "queued")
        history.refresh_from_db()
        self.assertEqual(history.status, "failure")
        video.refresh_from_db()
        self.assertEqual(get_file_hash(video.processed_file), processed_hash)
        self.assertTrue(video.raw_file.storage.exists(video.raw_file.name))
