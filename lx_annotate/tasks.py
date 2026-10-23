from __future__ import annotations

from typing import TYPE_CHECKING

from celery import shared_task

if TYPE_CHECKING:
    from .hub.hub_export_reconciliation import HubExportReconciliationSummary


def _storage_balancing_enabled() -> bool:
    """Re-check the runtime kill switch when a queued task actually starts."""

    from django.conf import settings
    from django.db.utils import OperationalError, ProgrammingError

    if not bool(getattr(settings, "ENDOREG_ENABLE_STORAGE_BALANCING", False)):
        return False
    try:
        from endoreg_db.services.hub.storage_operator_control import (
            STORAGE_OPERATOR_CONTROL_CONTRACT_VERSION,
            get_storage_balancing_control_state,
        )

        if (
            STORAGE_OPERATOR_CONTROL_CONTRACT_VERSION
            != "hub-storage-operator-control-v1"
        ):
            return False
        return not bool(get_storage_balancing_control_state().is_paused)
    except (
        ImportError,
        AttributeError,
        OperationalError,
        ProgrammingError,
    ):
        return False


@shared_task(
    name="lx_annotate.dispatch_storage_operator_control_receipt",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def dispatch_storage_operator_control_receipt_task(
    _task,
    operator_receipt_id: str,
) -> bool:
    """Dispatch one persisted operator intent through an at-least-once outbox."""

    from uuid import UUID

    from celery import chain
    from django.db import transaction
    from django.utils import timezone
    from endoreg_db.models import StorageOperatorControlReceipt

    from .models import StorageOperatorDispatchReceipt

    receipt = StorageOperatorControlReceipt.objects.get(
        pk=UUID(str(operator_receipt_id)),
    )
    with transaction.atomic():
        dispatch, _created = (
            StorageOperatorDispatchReceipt.objects.select_for_update().get_or_create(
                operator_receipt_id=receipt.pk,
                defaults={
                    "action": str(receipt.action),
                    "control_version": int(receipt.control_version),
                },
            )
        )
        if dispatch.action != str(receipt.action) or dispatch.control_version != int(
            receipt.control_version,
        ):
            raise RuntimeError("operator dispatch identity does not match its receipt")
        if dispatch.status == StorageOperatorDispatchReceipt.Status.DISPATCHED:
            return False
        dispatch.attempt_count += 1
        dispatch.last_error = ""
        dispatch.save(update_fields=["attempt_count", "last_error"])

    action = str(receipt.action)
    try:
        if action == "reconcile":
            reconcile_storage_inventories_task.delay(str(receipt.pk))
        elif action in {"rebalance", "retry"}:
            chain(
                sync_storage_node_telemetry_task.si(),
                reconcile_storage_balancing_task.si(),
            ).delay()
        elif action not in {"pause", "resume"}:
            raise RuntimeError("unknown storage operator action")
    except Exception as exc:
        StorageOperatorDispatchReceipt.objects.filter(pk=dispatch.pk).update(
            last_error=f"{type(exc).__name__}: {exc}"[:255],
        )
        raise

    StorageOperatorDispatchReceipt.objects.filter(pk=dispatch.pk).update(
        status=StorageOperatorDispatchReceipt.Status.DISPATCHED,
        dispatched_at=timezone.now(),
        last_error="",
    )
    return True


@shared_task(
    name="lx_annotate.dispatch_pending_storage_operator_controls",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def dispatch_pending_storage_operator_controls_task(_task) -> int:
    """Requeue a bounded set of persisted operator intents after broker failure."""

    from endoreg_db.models import StorageOperatorControlReceipt

    from .models import StorageOperatorDispatchReceipt

    dispatched_ids = StorageOperatorDispatchReceipt.objects.filter(
        status=StorageOperatorDispatchReceipt.Status.DISPATCHED,
    ).values_list("operator_receipt_id", flat=True)
    pending_ids = list(
        StorageOperatorControlReceipt.objects.exclude(pk__in=dispatched_ids)
        .order_by("control_version", "pk")
        .values_list("pk", flat=True)[:100],
    )
    for receipt_id in pending_ids:
        dispatch_storage_operator_control_receipt_task.delay(str(receipt_id))
    return len(pending_ids)


@shared_task(
    name="lx_annotate.run_outbound_hub_transfer_job",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def run_outbound_hub_transfer_job_task(
    _task,
    outbound_job_id: str,
    source_node_key: str,
) -> bool:
    from .hub.hub_export_reconciliation import (
        hub_export_max_retries,
        is_retryable_outbound_failure,
    )
    from .hub.hub_export_worker import run_outbound_transfer_job

    result = run_outbound_transfer_job(
        outbound_job_id=str(outbound_job_id),
        source_node_key=str(source_node_key),
    )
    if is_retryable_outbound_failure(result):
        retry_count = max(int(result.retry_count or 0), 1)
        countdown = min(30 * (2 ** (retry_count - 1)), 15 * 60)
        raise _task.retry(
            exc=RuntimeError(result.last_error),
            countdown=countdown,
            max_retries=hub_export_max_retries(),
        )
    return True


@shared_task(
    name="lx_annotate.reconcile_outbound_hub_transfer_job",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def reconcile_outbound_hub_transfer_job_task(
    _task,
    outbound_job_id: str,
    source_node_key: str,
) -> bool:
    from .hub.hub_export_reconciliation import reconcile_outbound_transfer_job

    reconcile_outbound_transfer_job(
        outbound_job_id=str(outbound_job_id),
        source_node_key=str(source_node_key),
    )
    return True


@shared_task(
    name="lx_annotate.recover_stale_outbound_hub_transfer_jobs",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def recover_stale_outbound_hub_transfer_jobs_task(
    _task,
    source_node_key: str,
) -> HubExportReconciliationSummary:
    from .hub.hub_export_reconciliation import recover_stale_outbound_transfer_jobs

    return recover_stale_outbound_transfer_jobs(
        source_node_key=str(source_node_key),
    )


@shared_task(
    name="lx_annotate.execute_storage_balance_work_item",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=8,
)
def execute_storage_balance_work_item_task(_task, work_item_id: str) -> bool:
    if not _storage_balancing_enabled():
        return False
    from uuid import UUID

    from .hub.storage_balance_worker import (
        StorageBalanceWorkCancelled,
        execute_storage_balance_work_item,
    )

    try:
        result = execute_storage_balance_work_item(work_item_id=UUID(str(work_item_id)))
    except StorageBalanceWorkCancelled:
        return False
    execute_storage_rotation_cleanup_task.delay(str(result.rotation_id))
    return True


@shared_task(
    name="lx_annotate.reconcile_storage_balancing",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def reconcile_storage_balancing_task(_task) -> int:
    if not _storage_balancing_enabled():
        return 0
    from endoreg_db.services.hub.storage_balancing import reconcile_storage_balancing

    from .hub.storage_balance_worker import StorageBalancingRuntimeConfig

    runtime = StorageBalancingRuntimeConfig.from_environment()
    work_items = reconcile_storage_balancing(policy=runtime.balancing_policy())
    for work_item in work_items:
        execute_storage_balance_work_item_task.delay(str(work_item.pk))
    return len(work_items)


@shared_task(
    name="lx_annotate.recover_storage_balance_work_items",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def recover_storage_balance_work_items_task(_task) -> int:
    """Re-dispatch persisted, non-terminal rotations after worker loss/restart."""
    if not _storage_balancing_enabled():
        return 0
    from .hub.storage_balance_worker import StorageBalancingRuntimeConfig
    from .hub.storage_recovery import plan_storage_balance_recovery

    maximum = StorageBalancingRuntimeConfig.from_environment().max_work_items
    plan = plan_storage_balance_recovery(maximum=maximum)
    for work_item_id in plan.redispatch_ids:
        execute_storage_balance_work_item_task.delay(str(work_item_id))
    return len(plan.redispatch_ids)


@shared_task(
    name="lx_annotate.execute_storage_rotation_cleanup",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=8,
)
def execute_storage_rotation_cleanup_task(_task, rotation_id: str) -> str:
    if not _storage_balancing_enabled():
        return "paused"
    from uuid import UUID

    from .hub.storage_balance_worker import execute_storage_rotation_cleanup

    result = execute_storage_rotation_cleanup(rotation_id=UUID(str(rotation_id)))
    return result.state


@shared_task(
    name="lx_annotate.reconcile_storage_rotation_cleanup",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def reconcile_storage_rotation_cleanup_task(_task) -> int:
    if not _storage_balancing_enabled():
        return 0
    from endoreg_db.models import StorageRotation

    from .hub.storage_balance_worker import StorageBalancingRuntimeConfig

    maximum = StorageBalancingRuntimeConfig.from_environment().max_work_items
    rotation_ids = list(
        StorageRotation.objects.filter(
            state__in=[
                StorageRotation.State.COMMITTED,
                StorageRotation.State.CLEANUP_DEFERRED,
            ],
        )
        .order_by("updated_at", "pk")
        .values_list("pk", flat=True)[:maximum],
    )
    for rotation_id in rotation_ids:
        execute_storage_rotation_cleanup_task.delay(str(rotation_id))
    return len(rotation_ids)


@shared_task(
    name="lx_annotate.sync_storage_node_telemetry",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def sync_storage_node_telemetry_task(_task) -> dict[str, int]:
    from .hub.storage_telemetry import sync_storage_node_telemetry

    summary = sync_storage_node_telemetry()
    return {
        "configured": summary.configured,
        "healthy": summary.healthy,
        "failed": summary.failed,
    }


@shared_task(
    name="lx_annotate.reconcile_storage_inventories",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def reconcile_storage_inventories_task(
    _task,
    run_key: str | None = None,
) -> dict[str, int]:
    from uuid import uuid4

    from .hub.storage_reconciliation import reconcile_storage_inventories

    stable_run_key = run_key or getattr(_task.request, "id", None) or str(uuid4())
    summary = reconcile_storage_inventories(run_key=str(stable_run_key))
    return {
        "configured_nodes": summary.configured_nodes,
        "reconciled_nodes": summary.reconciled_nodes,
        "failed_nodes": summary.failed_nodes,
        "pages": summary.pages,
        "observations": summary.observations,
    }


@shared_task(
    name="lx_annotate.expire_storage_reservations",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def expire_storage_reservations_task(_task) -> int:
    from .hub.storage_balance_worker import (
        StorageBalancingRuntimeConfig,
        expire_due_storage_reservations,
    )

    maximum = StorageBalancingRuntimeConfig.from_environment().max_work_items
    return expire_due_storage_reservations(maximum=maximum)


@shared_task(
    name="lx_annotate.cleanup_retired_storage_envelope",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=8,
)
def cleanup_retired_storage_envelope_task(_task, evidence_id: str) -> bool:
    if not _storage_balancing_enabled():
        return False
    from uuid import UUID

    from .hub.storage_balance_worker import default_storage_client_factory
    from .hub.storage_rekey import cleanup_retired_rekey_evidence

    cleanup_retired_rekey_evidence(
        evidence_id=UUID(str(evidence_id)),
        client_factory=default_storage_client_factory,
    )
    return True


@shared_task(
    name="lx_annotate.reconcile_retired_storage_envelopes",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def reconcile_retired_storage_envelopes_task(_task) -> int:
    if not _storage_balancing_enabled():
        return 0
    from endoreg_db.models import StorageTransferEvidence

    from .hub.storage_balance_worker import StorageBalancingRuntimeConfig

    maximum = StorageBalancingRuntimeConfig.from_environment().max_work_items
    evidence_ids = list(
        StorageTransferEvidence.objects.filter(
            state=StorageTransferEvidence.State.RETIRED,
        )
        .order_by("retired_at", "pk")
        .values_list("pk", flat=True)[:maximum],
    )
    for evidence_id in evidence_ids:
        cleanup_retired_storage_envelope_task.delay(str(evidence_id))
    return len(evidence_ids)


@shared_task(
    name="lx_annotate.ingest_processed_storage_artifact",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=8,
)
def ingest_processed_storage_artifact_task(
    _task,
    *,
    artifact_key: str,
    artifact_kind: str,
    source_path: str,
    residency_key: str,
    idempotency_key: str,
    media_lease_video_id: int | None = None,
) -> str:
    if not _storage_balancing_enabled():
        raise RuntimeError("storage balancing is paused by deployment policy")
    from pathlib import Path

    from .hub.storage_ingest import (
        ProcessedStorageIngestRequest,
        ingest_processed_storage_artifact,
    )
    from .hub.storage_transfer_client import (
        StorageTransferArtifactKind,
        StorageTransferClient,
    )

    result = ingest_processed_storage_artifact(
        request=ProcessedStorageIngestRequest(
            artifact_key=artifact_key,
            artifact_kind=StorageTransferArtifactKind(artifact_kind),
            source_path=Path(source_path),
            residency_key=residency_key,
            idempotency_key=idempotency_key,
            media_lease_video_id=media_lease_video_id,
        ),
        client_factory=StorageTransferClient.from_environment,
    )
    return str(result.placement_id)


@shared_task(
    name="lx_annotate.publish_storage_artifact",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=8,
)
def publish_storage_artifact_task(_task, publication_id: str) -> str:
    """Publish one durable, hash-bound processed-media generation."""
    if not _storage_balancing_enabled():
        raise RuntimeError("storage balancing is paused by deployment policy")
    from uuid import UUID

    from .hub.storage_publication import publish_storage_artifact

    result = publish_storage_artifact(UUID(str(publication_id)))
    return str(result.placement_id)


@shared_task(
    name="lx_annotate.dispatch_pending_storage_publications",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def dispatch_pending_storage_publications_task(_task) -> int:
    """Recover broker loss and abandoned publication attempts."""
    if not _storage_balancing_enabled():
        return 0
    from .hub.storage_balance_worker import StorageBalancingRuntimeConfig
    from .hub.storage_publication import (
        discover_storage_publications,
        pending_storage_publication_ids,
    )

    limit = StorageBalancingRuntimeConfig.from_environment().max_work_items
    discover_storage_publications(limit=limit)
    publication_ids = pending_storage_publication_ids(limit=limit)
    for publication_id in publication_ids:
        publish_storage_artifact_task.delay(str(publication_id))
    return len(publication_ids)


@shared_task(
    name="lx_annotate.run_video_transcode_job",
    bind=True,
    acks_late=True,
    reject_on_worker_lost=True,
    track_started=True,
)
def run_video_transcode_job_task(_task, job_id: str) -> str:
    from .services.video_transcode_jobs import execute_video_transcode

    return execute_video_transcode(job_id)
