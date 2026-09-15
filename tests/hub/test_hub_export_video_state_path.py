from __future__ import annotations

import base64
import os
from typing import cast
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import TestCase
from endoreg_db.models import Center, NetworkNode, VideoFile, VideoState
from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.models.state.video_segment_validation import (
    SegmentAnnotationStatus,
    mark_post_validation_complete,
    mark_segment_annotations_stale,
)
from endoreg_db.services.export_ready import mark_video_ready_for_export

from lx_annotate.hub import hub_export_state
from lx_annotate.hub.hub_export_jobs import mark_resources_for_hub_upload
from lx_annotate.models import OutboundHubTransferJob

TEST_MASTER_KEY = base64.urlsafe_b64encode(b"0" * 32).decode("ascii")
os.environ.setdefault("LX_ANNOTATE_MASTER_KEY", TEST_MASTER_KEY)


class HubExportVideoStatePathTests(TestCase):
    center: Center
    user: User
    site_node: NetworkNode
    hub_node: NetworkNode

    def setUp(self) -> None:
        suffix = uuid4().hex[:8]
        self.center = Center.objects.create(
            name=f"hub-path-center-{suffix}",
            center_key=f"hub-path-center-{suffix}",
        )
        self.user = User.objects.create_user(
            username=f"hub-path-user-{suffix}",
            password="test-password",
            is_staff=True,
        )
        self.site_node = NetworkNode.objects.create(
            display_name="Hub Path Site Node",
            node_key=f"hub-path-site-{suffix}",
            role=NetworkNode.Role.SITE_NODE,
            owning_center=self.center,
        )
        self.hub_node = NetworkNode.objects.create(
            display_name="Hub Path Central Node",
            node_key=f"hub-path-central-{suffix}",
            role=NetworkNode.Role.CENTRAL_HUB,
            owning_center=self.center,
            base_url="https://hub.example/",
        )

    def _imported_video(self) -> VideoFile:
        suffix = uuid4().hex[:8]
        state = VideoState.objects.create(processing_started=True)
        return VideoFile.objects.create(
            center=self.center,
            state=state,
            video_hash=f"imported-video-{suffix}",
            original_file_name=f"imported-video-{suffix}.mp4",
            processed_file=ContentFile(
                b"anonymized-processed-video",
                name=f"imported-video-{suffix}-processed.mp4",
            ),
        )

    @staticmethod
    def _reload(video: VideoFile) -> VideoFile:
        return VideoFile.objects.select_related("state").get(pk=video.pk)

    def _finish_import_processing(self, video: VideoFile) -> VideoFile:
        state = cast(VideoState, self._reload(video).state)
        state.mark_anonymized()
        state.mark_sensitive_meta_processed()
        return self._reload(video)

    def _validate_anonymization(self, video: VideoFile) -> VideoFile:
        state = cast(VideoState, self._reload(video).state)
        state.mark_anonymization_validated()
        return self._reload(video)

    def _finish_segment_cleanup(self, video: VideoFile) -> VideoFile:
        mark_post_validation_complete(self._reload(video))
        return self._reload(video)

    def _promote_ready_for_export(self, video: VideoFile) -> VideoFile:
        with patch(
            "endoreg_db.services.export_ready.ensure_within_protected_media_root",
            side_effect=lambda path: path,
        ):
            mark_video_ready_for_export(
                video=self._reload(video),
                user=self.user,
                center_key=self.center.center_key,
            )
        return self._reload(video)

    def _assert_pre_promotion_state(
        self,
        video: VideoFile,
        *,
        anonymization_status: AnonymizationState,
        segment_status: SegmentAnnotationStatus,
    ) -> None:
        readiness = hub_export_state.resolve_video_hub_export_state(video)

        assert readiness.anonymization_status is anonymization_status
        assert readiness.segment_annotation_status is segment_status
        assert readiness.export_ready_state is False
        assert readiness.transfer_eligible is False
        assert readiness.blocked_reason == "not ready for export"

    def test_import_created_video_is_not_transfer_eligible(self) -> None:
        self._assert_pre_promotion_state(
            self._imported_video(),
            anonymization_status=AnonymizationState.EXTRACTING_FRAMES,
            segment_status=SegmentAnnotationStatus.NOT_STARTED,
        )

    def test_processed_anonymization_is_not_transfer_eligible(self) -> None:
        self._assert_pre_promotion_state(
            self._finish_import_processing(self._imported_video()),
            anonymization_status=AnonymizationState.DONE_PROCESSING_ANONYMIZATION,
            segment_status=SegmentAnnotationStatus.NOT_STARTED,
        )

    def test_anonymization_validation_alone_is_not_transfer_eligible(self) -> None:
        self._assert_pre_promotion_state(
            self._validate_anonymization(
                self._finish_import_processing(self._imported_video()),
            ),
            anonymization_status=AnonymizationState.VALIDATED,
            segment_status=SegmentAnnotationStatus.NOT_STARTED,
        )

    def test_final_segment_cleanup_without_promotion_is_not_transfer_eligible(
        self,
    ) -> None:
        self._assert_pre_promotion_state(
            self._finish_segment_cleanup(
                self._validate_anonymization(
                    self._finish_import_processing(self._imported_video()),
                ),
            ),
            anonymization_status=AnonymizationState.VALIDATED,
            segment_status=SegmentAnnotationStatus.VALIDATED,
        )

    def test_authenticated_ready_promotion_makes_final_video_eligible(self) -> None:
        video = self._promote_ready_for_export(
            self._finish_segment_cleanup(
                self._validate_anonymization(
                    self._finish_import_processing(self._imported_video()),
                ),
            ),
        )

        readiness = hub_export_state.resolve_video_hub_export_state(
            video,
            verify_processed_media=True,
        )

        assert readiness.transfer_eligible is True
        assert readiness.blocked_reason == ""
        assert readiness.processed_video_hash
        assert readiness.processed_video_hash == readiness.state_processed_file_sha256
        assert readiness.processed_video_hash == readiness.actual_processed_file_sha256
        assert cast(VideoState, video.state).ready_for_export_by == self.user.username

    def test_segment_change_revokes_reached_transfer_eligibility(self) -> None:
        video = self._promote_ready_for_export(
            self._finish_segment_cleanup(
                self._validate_anonymization(
                    self._finish_import_processing(self._imported_video()),
                ),
            ),
        )
        mark_segment_annotations_stale(video)

        readiness = hub_export_state.resolve_video_hub_export_state(
            self._reload(video),
        )

        assert readiness.transfer_eligible is False
        assert (
            readiness.segment_annotation_status is SegmentAnnotationStatus.NOT_STARTED
        )
        assert readiness.export_ready_state is False

    def test_import_to_operator_queue_path_is_reachable(self) -> None:
        video = self._promote_ready_for_export(
            self._finish_segment_cleanup(
                self._validate_anonymization(
                    self._finish_import_processing(self._imported_video()),
                ),
            ),
        )

        jobs = mark_resources_for_hub_upload(
            resource_refs=[{"resource_kind": "video", "id": video.pk}],
            target_node=self.hub_node,
            marked_by=self.user,
        )
        job = jobs[0]

        assert job.local_status == OutboundHubTransferJob.LocalStatus.MARKED
        assert job.marked_by == self.user
        with patch.object(hub_export_state, "_schedule_outbound_job") as schedule:
            queued = hub_export_state.queue_outbound_job(job)

        assert queued is True
        job.refresh_from_db()
        assert job.local_status == OutboundHubTransferJob.LocalStatus.QUEUED
        schedule.assert_called_once_with(job)
