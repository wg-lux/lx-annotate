"""Operator guidance and non-mutating sender preflight; clinical rules stay shared."""

from __future__ import annotations

from cryptography.exceptions import InvalidTag
from django.contrib.auth.base_user import AbstractBaseUser
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from endoreg_db.models import VideoFile
from endoreg_db.services.annotations.segment_validation_workflow import (
    latest_post_validation_rebuild,
)
from endoreg_db.services.media.operation_gate import (
    MediaOperationDeferred,
    create_video_stream_lease,
)
from rest_framework.exceptions import PermissionDenied

from .hub_export_contracts import (
    HubCleanupPreviewIdentity,
    HubCleanupRestartRequest,
    HubPayloadRejected,
    HubRecoveryAssessment,
    HubRecoveryBlocker,
    HubRecoveryBlockerCode,
)
from .hub_export_contracts import (
    HubRecoveryAction as Action,
)
from .hub_export_payloads import (
    build_transfer_payload,
    require_local_identity_records,
    validate_transfer_payload,
)
from .hub_export_state import VideoHubExportReadiness, resolve_video_hub_export_state


def _block(
    code: HubRecoveryBlockerCode, detail: str, action: Action
) -> HubRecoveryBlocker:
    return HubRecoveryBlocker(code=code, detail=detail, action=action)


def retained_source_present(video: VideoFile) -> bool:
    raw = video.raw_file
    try:
        return bool(raw and raw.name and raw.storage.exists(raw.name) and raw.size > 0)
    except (OSError, ValueError):
        return False


def video_recovery_assessment(
    video: VideoFile,
    readiness: VideoHubExportReadiness,
) -> HubRecoveryAssessment:
    blockers: list[HubRecoveryBlocker] = []
    try:
        require_local_identity_records(video.sensitive_meta)
    except HubPayloadRejected as exc:
        blockers.append(exc.blocker)
    if video.center is None:
        blockers.append(
            _block(
                "identity_evidence",
                "The recording needs an authenticated center assignment.",
                Action.ADMINISTRATOR_RECOVERY,
            )
        )
    if video.meta and video.meta.get("integrity_status") == "lost":
        blockers.append(
            _block(
                "integrity",
                "Media integrity is lost; administrator investigation is required.",
                Action.ADMINISTRATOR_RECOVERY,
            )
        )
    elif (
        not readiness.processed_media_present
        or not readiness.state_present
        or (video.state and video.state.processing_error)
    ):
        action = (
            Action.REPAIR_PROCESSING
            if retained_source_present(video)
            else Action.ADMINISTRATOR_RECOVERY
        )
        blockers.append(
            _block(
                "processing"
                if action == Action.REPAIR_PROCESSING
                else "source_missing",
                "Processing requires recovery from authenticated source material.",
                action,
            )
        )
    elif not readiness.anonymization_ready:
        blockers.append(
            _block(
                "anonymization_review",
                "Human anonymization review is required.",
                Action.REVIEW_ANONYMIZATION,
            )
        )
    elif readiness.segment_annotation_status.value in {
        "cleanup_queued",
        "cleanup_running",
    }:
        blockers.append(
            _block(
                "cleanup_pending",
                "Inspect task and queue activity before recovery.",
                Action.INSPECT_RECOVERY,
            )
        )
    elif readiness.segment_annotation_status.value == "cleanup_failed":
        blockers.append(
            _block(
                "cleanup_failed",
                "Review the cleanup failure before restarting validation.",
                Action.REVIEW_SEGMENTS,
            )
        )
    elif not readiness.segment_annotations_final:
        blockers.append(
            _block(
                "segment_review",
                "Review segments and complete their cleanup.",
                Action.REVIEW_SEGMENTS,
            )
        )
    elif (
        not readiness.export_ready_state
        or readiness.export_integrity_status.value == "missing_hash"
    ):
        blockers.append(
            _block(
                "export_proof",
                "The current generation needs an attributable export proof.",
                Action.CHECK_EXPORT_READINESS,
            )
        )
    elif not readiness.export_integrity_ready:
        blockers.append(
            _block(
                "integrity",
                "Processed-media integrity must be investigated.",
                Action.ADMINISTRATOR_RECOVERY,
            )
        )
    return HubRecoveryAssessment(
        blockers=blockers,
        allowed_actions=list(dict.fromkeys(b.action for b in blockers))
        or [Action.PREFLIGHT],
    )


def scoped_video(video_id: int, allowed_center_ids: frozenset[int] | None) -> VideoFile:
    video = VideoFile.objects.get(pk=video_id)
    if allowed_center_ids is not None and video.center_id not in allowed_center_ids:
        raise PermissionDenied("Video is outside the assigned center scope.")
    return video


def preflight_video(
    video_id: int, *, allowed_center_ids: frozenset[int] | None
) -> HubRecoveryAssessment:
    from ..models import OutboundHubTransferJob
    from .hub_export_jobs import (
        build_transfer_key,
        get_default_source_node,
        require_normal_sender_target_hub,
    )

    scoped_video(video_id, allowed_center_ids)
    # Keep the publication row locked throughout byte verification. Roll back the
    # shared validators' temporary leases; this endpoint never persists approval.
    with transaction.atomic():
        video = VideoFile.objects.select_for_update().get(pk=video_id)
        if allowed_center_ids is not None and video.center_id not in allowed_center_ids:
            raise PermissionDenied("Video is outside the assigned center scope.")
        assessment = video_recovery_assessment(
            video, resolve_video_hub_export_state(video)
        )
        blockers = list(assessment.blockers)
        completed = False
        payload_verified = False
        transport_configuration = "not_checked"
        actions: list[Action] = []
        try:
            if not blockers:
                source = get_default_source_node()
                target = None
                try:
                    target = require_normal_sender_target_hub()
                    if source is None or source.owning_center != video.center:
                        raise ValueError("Sender center mismatch")
                except ValueError:
                    blockers.append(
                        _block(
                            "transport",
                            "An active sender and matching center/hub configuration are required.",
                            Action.ADMINISTRATOR_RECOVERY,
                        )
                    )
                if not blockers and source is not None and target is not None:
                    create_video_stream_lease(video, file_type="processed")
                    job = OutboundHubTransferJob.objects.filter(
                        video_file=video, target_node=target
                    ).first()
                    candidate = job or OutboundHubTransferJob(
                        video_file=video,
                        target_node=target,
                        source_center=video.center,
                        resource_kind=OutboundHubTransferJob.ResourceKind.VIDEO,
                        transfer_key=build_transfer_key(
                            source_node_key=source.node_key,
                            resource_kind="video",
                            resource_hash=video.raw_video_hash,
                        ),
                    )
                    validate_transfer_payload(
                        build_transfer_payload(
                            outbound_job=candidate, source_node=source
                        )
                    )
                    payload_verified = True
                    from .hub_export_worker import (
                        hub_transfer_url,
                        resolve_hub_transport_config,
                        resolve_outbound_node_secret,
                    )

                    try:
                        resolve_hub_transport_config()
                        resolve_outbound_node_secret(source_node_key=source.node_key)
                        hub_transfer_url(target)
                        transport_configuration = "configured"
                    except (ValueError, OSError):
                        transport_configuration = "unavailable"
                    if (
                        job
                        and job.local_status
                        == OutboundHubTransferJob.LocalStatus.COMPLETED
                    ):
                        from lx_dtypes.models.contracts.hub_media_envelope import (
                            HubMediaEnvelopeReceipt,
                        )

                        try:
                            job.clean()
                            receipt = HubMediaEnvelopeReceipt.model_validate(
                                job.envelope_receipt
                            )
                            completed = (
                                job.remote_transfer_status == "applied"
                                and receipt.source_node_key == source.node_key
                                and receipt.receiver_transfer_id
                                == str(job.remote_transfer_id)
                                and receipt.transfer_mode == job.transfer_mode
                                and receipt.plaintext_size == video.processed_file.size
                            )
                        except (ValueError, DjangoValidationError):
                            completed = False
                        if not completed:
                            blockers.append(
                                _block(
                                    "receipt",
                                    "The historical completion does not prove receipt of the current artifact.",
                                    Action.ADMINISTRATOR_RECOVERY,
                                )
                            )
                    elif (
                        job
                        and job.local_status
                        == OutboundHubTransferJob.LocalStatus.FAILED
                    ):
                        actions = [Action.RETRY]
                    elif job:
                        actions = [Action.SEND] if job.local_status == "marked" else []
                    else:
                        actions = [Action.MARK]
        except HubPayloadRejected as exc:
            blocker = exc.blocker
            if (
                blocker.action == Action.REPAIR_PROCESSING
                and not retained_source_present(video)
            ):
                blocker = blocker.model_copy(
                    update={"action": Action.ADMINISTRATOR_RECOVERY}
                )
                blockers.append(
                    _block(
                        "source_missing",
                        "The retained original is unavailable. An administrator must restore authenticated provenance or the matching original.",
                        Action.ADMINISTRATOR_RECOVERY,
                    )
                )
            blockers.append(blocker)
        except MediaOperationDeferred:
            blockers.append(
                _block(
                    "processing",
                    "A media operation is active; wait before checking again.",
                    Action.PREFLIGHT,
                )
            )
        except (InvalidTag, OSError, RuntimeError):
            blockers.append(
                _block(
                    "integrity",
                    "Protected media could not be verified. Administrator investigation is required.",
                    Action.ADMINISTRATOR_RECOVERY,
                )
            )
        except ValueError:
            blockers.append(
                _block(
                    "payload",
                    "The sender rejected the payload. Administrator review is required.",
                    Action.ADMINISTRATOR_RECOVERY,
                )
            )
        finally:
            transaction.set_rollback(True)
        return HubRecoveryAssessment(
            verification="fresh_payload" if payload_verified else "stored_metadata",
            transport_configuration=transport_configuration,
            blockers=blockers,
            allowed_actions=list(dict.fromkeys(b.action for b in blockers))
            if blockers
            else actions,
            checked_at=timezone.now().isoformat(),
            completed_current_artifact=completed,
        )


def inspect_cleanup(video: VideoFile) -> dict[str, object]:
    """Inspection is advisory: worker replies never prove broker queue absence."""
    from celery import current_app
    from endoreg_db.config.env import get_celery_ffmpeg_media_queue
    from endoreg_db.models.media.operation_lease import MediaOperationLease
    from endoreg_db.models.media.video.video_processing import VideoProcessingHistory
    from endoreg_db.services.jobs.video_post_validation_jobs import (
        STALE_REBUILD_RUNNING_TIMEOUT,
        STALE_REBUILD_TIMEOUT,
    )
    from kombu.exceptions import OperationalError

    history = latest_post_validation_rebuild(video)
    active_histories = VideoProcessingHistory.objects.filter(
        video=video, status__in=["pending", "running"]
    ).count()
    media_busy = MediaOperationLease.objects.filter(
        video=video, expires_at__gt=timezone.now()
    ).exists()
    source_present = retained_source_present(video)
    queue = get_celery_ffmpeg_media_queue()
    result: dict[str, object] = {
        "queue": queue,
        "active_media_operation": media_busy,
        "retained_source_present": source_present,
        "preview_token": None,
        "worker_available": None,
        "task_observed": None,
        "last_observed_progress": None,
        "inspection_at": timezone.now().isoformat(),
        "history_id": history.pk if history else None,
        "status": history.status if history else None,
        "age_seconds": max(
            0, int((timezone.now() - history.created_at).total_seconds())
        )
        if history
        else None,
        "stale_candidate": False,
        "recovery_allowed": False,
        "detail": "Worker inspection cannot exclude broker-queued work or nonresponding consumers. An administrator must inspect the queue and operation leases before using the existing validation workflow. Recovery can expire histories and roll back frame artifacts.",
    }
    if history is None:
        return result
    timeout = (
        STALE_REBUILD_RUNNING_TIMEOUT
        if history.status == "running"
        else STALE_REBUILD_TIMEOUT
    )
    result["stale_candidate"] = (
        history.status in {"pending", "running"}
        and timezone.now() - history.created_at > timeout
    )
    try:
        inspector = current_app.control.inspect(timeout=1.0)
        queues = inspector.active_queues()
        responses = [inspector.active(), inspector.reserved(), inspector.scheduled()]
    except (OperationalError, OSError, TimeoutError):
        return result
    if queues:
        result["worker_available"] = any(
            q.get("name") == queue
            for worker_queues in queues.values()
            for q in worker_queues
        )
    observed = any(
        (task.get("request") or task).get("id") == history.task_id
        for response in responses
        if response
        for tasks in response.values()
        for task in tasks
    )
    if observed:
        result["task_observed"] = True
    elif all(responses):
        result["task_observed"] = False
    result["recovery_allowed"] = bool(
        result["stale_candidate"]
        and result["task_observed"] is False
        and result["worker_available"] is True
        and source_present
        and not media_busy
        and active_histories == 1
        and history.task_id
    )
    return result


_CLEANUP_PREVIEW_SALT = "hub-cleanup-recovery-v1"


def _cleanup_preview_identity(
    video: VideoFile, *, requested_by_id: int
) -> HubCleanupPreviewIdentity:
    history = latest_post_validation_rebuild(video)
    if history is None:
        raise ValueError("The cleanup history is no longer available.")
    return HubCleanupPreviewIdentity(
        video_id=video.pk,
        history_id=history.pk,
        task_id=str(history.task_id or ""),
        history_status=history.status,
        history_created_at=history.created_at.isoformat(),
        requested_by_id=requested_by_id,
    )


def preview_cleanup_recovery(
    video: VideoFile, *, requested_by_id: int
) -> dict[str, object]:
    from django.core import signing

    result = inspect_cleanup(video)
    if result["recovery_allowed"]:
        identity = _cleanup_preview_identity(video, requested_by_id=requested_by_id)
        # Bind to the inspected history, even if a new history appeared during inspection.
        if identity.history_id == result["history_id"]:
            result["preview_token"] = signing.dumps(
                identity.model_dump(mode="json"), salt=_CLEANUP_PREVIEW_SALT
            )
        else:
            result["recovery_allowed"] = False
    return result


def restart_cleanup(
    *,
    video_id: int,
    requested_by: AbstractBaseUser,
    allowed_center_ids: frozenset[int] | None,
    mutation: HubCleanupRestartRequest,
) -> dict[str, object]:
    from django.core import signing
    from endoreg_db.services.annotations.segment_validation_workflow import (
        resolve_blackening_run_config,
    )
    from endoreg_db.services.jobs.video_post_validation_jobs import (
        dispatch_video_post_validation_rebuild,
    )
    from endoreg_db.services.media.operation_gate import defer_if_video_media_busy

    from .hub_export_audit import emit_hub_export_audit_event

    scoped_video(video_id, allowed_center_ids)
    try:
        identity = HubCleanupPreviewIdentity.model_validate(
            signing.loads(
                mutation.preview_token,
                salt=_CLEANUP_PREVIEW_SALT,
                max_age=300,
            )
        )
    except (signing.BadSignature, ValueError) as exc:
        raise ValueError(
            "Recovery preview is invalid or expired. Inspect again."
        ) from exc
    with transaction.atomic():
        video = VideoFile.objects.select_for_update().get(pk=video_id)
        if allowed_center_ids is not None and video.center_id not in allowed_center_ids:
            raise PermissionDenied("Video is outside the assigned center scope.")
        current = _cleanup_preview_identity(video, requested_by_id=requested_by.pk)
        if identity != current:
            raise ValueError(
                "Cleanup ownership changed. Inspect again before restarting."
            )
        inspection = inspect_cleanup(video)
        if not inspection["recovery_allowed"]:
            raise ValueError(
                "Recovery is blocked by current task, worker, source or media-operation evidence. Inspect again."
            )
        defer_if_video_media_busy(video_id=video.pk)
        history = latest_post_validation_rebuild(video)
        config = resolve_blackening_run_config(history=history, only_validated=False)
        emit_hub_export_audit_event(
            "hub_export.cleanup_restart_reviewed",
            request_user=requested_by,
            video_id=video.pk,
            history_id=current.history_id,
            queue_and_consumers_reviewed=True,
            confirm_frame_rollback=True,
        )
        result = dispatch_video_post_validation_rebuild(
            video_id=video.pk, only_validated=config.only_validated
        )
        emit_hub_export_audit_event(
            "hub_export.cleanup_restart_dispatched",
            request_user=requested_by,
            video_id=video.pk,
            previous_history_id=current.history_id,
            history_id=result.history_id,
            dispatch_status=result.status,
        )
    return result.to_dict()
