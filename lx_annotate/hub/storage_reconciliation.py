"""Bounded storage-node inventory reconciliation into endoreg-db."""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import Any

from django.utils import timezone

from .storage_balance_worker import StorageBalancingRuntimeConfig
from .storage_transfer_client import (
    StorageInventoryItem,
    StorageTransferClient,
    StorageTransferClientContract,
    StorageTransferPeer,
)

_INVENTORY_PAGE_LIMIT = 1000
_MAX_INVENTORY_OBSERVATIONS = 10_000


@dataclass(frozen=True, slots=True)
class StorageReconciliationSummary:
    configured_nodes: int
    reconciled_nodes: int
    failed_nodes: int
    pages: int
    observations: int


def _request_key(
    *,
    run_key: str,
    node_key: str,
    cursor_trace: tuple[str, ...],
    items: tuple[StorageInventoryItem, ...],
) -> str:
    payload = json.dumps(
        {
            "run_key": run_key,
            "node_key": node_key,
            "cursor_trace": cursor_trace,
            "items": [item.model_dump(mode="json") for item in items],
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return f"lx-storage-inventory-v1:{hashlib.sha256(payload).hexdigest()}"


def _unreachable_request_key(
    *,
    run_key: str,
    node_key: str,
    resume_cursor: str,
    error_type: str,
) -> str:
    payload = json.dumps(
        {
            "run_key": run_key,
            "node_key": node_key,
            "resume_cursor": resume_cursor,
            "error_type": error_type,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return f"lx-storage-unreachable-v1:{hashlib.sha256(payload).hexdigest()}"


def _load_contract(environment: Mapping[str, str]) -> StorageTransferClientContract:
    if str(environment.get("HUB_STORAGE_DEPLOYMENT_ROLE", "")).strip() != (
        "central_hub"
    ):
        raise ValueError("storage reconciliation requires central_hub role")
    if str(environment.get("HUB_STORAGE_SCHEMA_VERSION", "")).strip() != "1":
        raise ValueError("unsupported hub storage reconciliation schema")
    path = Path(str(environment.get("HUB_STORAGE_NODES_FILE", "")).strip())
    if not path.is_absolute() or not path.is_file():
        raise ValueError("HUB_STORAGE_NODES_FILE must be a readable absolute file")
    return StorageTransferClientContract.load_file(path)


def _reconciliation_policy(runtime: StorageBalancingRuntimeConfig) -> Any:
    from endoreg_db.services.hub.storage_reconciliation import (
        STORAGE_RECONCILIATION_CONTRACT_VERSION,
        StorageReconciliationPolicy,
    )

    if STORAGE_RECONCILIATION_CONTRACT_VERSION != "hub-storage-reconciliation-v1":
        raise RuntimeError("incompatible endoreg-db storage reconciliation contract")
    stop_remaining = 10_000 - runtime.capacity_pressure_basis_points
    low_remaining = 10_000 - runtime.capacity_target_basis_points
    if not 0 < stop_remaining < low_remaining < 10_000:
        raise ValueError("storage policy cannot produce reconciliation thresholds")
    operational_maximum = min(runtime.max_work_items, _MAX_INVENTORY_OBSERVATIONS)
    return StorageReconciliationPolicy(
        version=runtime.policy_version,
        max_observations=_MAX_INVENTORY_OBSERVATIONS,
        max_expired_reservations=operational_maximum,
        max_stuck_rotations=operational_maximum,
        max_health_nodes=operational_maximum,
        health_max_age=timedelta(seconds=runtime.telemetry_max_age_seconds),
        rotation_stuck_after=timedelta(seconds=runtime.reservation_ttl_seconds),
        low_capacity_remaining_basis_points=low_remaining,
        stop_capacity_remaining_basis_points=stop_remaining,
        repeated_retry_threshold=3,
        max_utilization_skew_basis_points=(
            runtime.capacity_pressure_basis_points
            - runtime.capacity_target_basis_points
        ),
    )


def _observations_for_inventory(
    *,
    storage_node_id: int,
    node_key: str,
    items: tuple[StorageInventoryItem, ...],
    observed_at: Any,
) -> tuple[Any, ...]:
    from django.db.models import Q
    from endoreg_db.models import (
        StorageArtifactKind,
        StorageArtifactPlacement,
        StorageTransferEvidence,
    )
    from endoreg_db.services.hub.storage_reconciliation import (
        StorageArtifactObservation,
    )

    evidence_rows = list(
        StorageTransferEvidence.objects.select_related("placement")
        .filter(
            node_key=node_key,
            ciphertext_sha256__in=[item.ciphertext_sha256 for item in items],
        )
        .exclude(
            state__in=[
                StorageTransferEvidence.State.DELETED,
                StorageTransferEvidence.State.FAILED,
            ],
        )
        .order_by("pk"),
    )
    evidence_by_digest: dict[str, list[Any]] = {}
    for evidence in evidence_rows:
        evidence_by_digest.setdefault(evidence.ciphertext_sha256, []).append(evidence)

    resolved: list[tuple[StorageInventoryItem, Any | None]] = []
    for item in items:
        matches = [
            evidence
            for evidence in evidence_by_digest.get(item.ciphertext_sha256, [])
            if evidence.node_key == node_key
            and evidence.artifact_kind == item.artifact_kind.value
            and evidence.ciphertext_size == item.ciphertext_size
            and evidence.plaintext_sha256 == item.plaintext_sha256
            and evidence.plaintext_size == item.plaintext_size
            and evidence.recipient_key_id == item.recipient_key_id
            and evidence.placement.storage_node_id == storage_node_id
        ]
        resolved.append((item, matches[0] if len(matches) == 1 else None))

    placement_counts = Counter(
        evidence.placement_id for _item, evidence in resolved if evidence is not None
    )
    observations = []
    resolved_placement_ids: set[Any] = set()
    for item, evidence in resolved:
        placement = evidence.placement if evidence is not None else None
        if placement is not None:
            resolved_placement_ids.add(placement.pk)
        observations.append(
            StorageArtifactObservation(
                storage_node_id=storage_node_id,
                placement_id=placement.pk if placement is not None else None,
                artifact_key=(
                    placement.artifact_key
                    if placement is not None
                    else item.ciphertext_sha256
                ),
                artifact_kind=StorageArtifactKind(item.artifact_kind.value),
                reachable=True,
                remote_present=True,
                remote_copy_count=(
                    placement_counts[placement.pk] if placement is not None else 1
                ),
                remote_generation=placement.generation if placement is not None else 1,
                remote_size_bytes=item.plaintext_size,
                remote_sha256=item.plaintext_sha256,
                observed_at=observed_at,
            ),
        )
    relevant_placements = list(
        StorageArtifactPlacement.objects.filter(
            storage_node_id=storage_node_id,
        )
        .filter(
            Q(
                state__in=[
                    StorageArtifactPlacement.State.VERIFIED,
                    StorageArtifactPlacement.State.COMMITTED,
                    StorageArtifactPlacement.State.SUPERSEDED,
                ],
            )
            | Q(
                transfer_evidence__state__in=[
                    StorageTransferEvidence.State.STORED,
                    StorageTransferEvidence.State.VERIFIED,
                    StorageTransferEvidence.State.RETIRED,
                ],
            ),
        )
        .exclude(pk__in=resolved_placement_ids)
        .distinct()
        .order_by("artifact_kind", "artifact_key", "generation", "pk")[
            : _MAX_INVENTORY_OBSERVATIONS + 1
        ],
    )
    if len(observations) + len(relevant_placements) > _MAX_INVENTORY_OBSERVATIONS:
        raise ValueError("storage reconciliation observations exceed bounded scan")
    observations.extend(
        StorageArtifactObservation(
            storage_node_id=storage_node_id,
            placement_id=placement.pk,
            artifact_key=placement.artifact_key,
            artifact_kind=StorageArtifactKind(placement.artifact_kind),
            reachable=True,
            remote_present=False,
            remote_copy_count=0,
            remote_generation=None,
            remote_size_bytes=None,
            remote_sha256="",
            observed_at=observed_at,
        )
        for placement in relevant_placements
    )
    return tuple(observations)


def _persist_unreachable_page(
    *,
    storage_node_id: int,
    run_key: str,
    node_key: str,
    resume_cursor: str,
    error_type: str,
    policy: Any,
) -> int:
    from endoreg_db.models import (
        StorageArtifactKind,
        StorageArtifactPlacement,
        StorageReconciliationRun,
    )
    from endoreg_db.services.hub.storage_reconciliation import (
        StorageArtifactObservation,
        StorageReconciliationRequest,
        reconcile_storage_state,
    )

    placements = list(
        StorageArtifactPlacement.objects.filter(
            storage_node_id=storage_node_id,
            state__in=[
                StorageArtifactPlacement.State.COMMITTED,
                StorageArtifactPlacement.State.SUPERSEDED,
            ],
        ).order_by("artifact_kind", "artifact_key", "generation", "pk")[
            : policy.max_observations + 1
        ],
    )
    if len(placements) > policy.max_observations:
        raise ValueError(
            "unreachable storage placements exceed reconciliation page bound",
        )
    idempotency_key = _unreachable_request_key(
        run_key=run_key,
        node_key=node_key,
        resume_cursor=resume_cursor,
        error_type=error_type,
    )
    replay = (
        StorageReconciliationRun.objects.filter(idempotency_key=idempotency_key)
        .only("observed_at")
        .first()
    )
    observed_at = replay.observed_at if replay is not None else timezone.now()
    observations = tuple(
        StorageArtifactObservation(
            storage_node_id=storage_node_id,
            placement_id=placement.pk,
            artifact_key=placement.artifact_key,
            artifact_kind=StorageArtifactKind(placement.artifact_kind),
            reachable=False,
            remote_present=False,
            remote_copy_count=0,
            remote_generation=None,
            remote_size_bytes=None,
            remote_sha256="",
            observed_at=observed_at,
        )
        for placement in placements
    )
    reconcile_storage_state(
        request=StorageReconciliationRequest(
            idempotency_key=idempotency_key,
            requested_by="lx-annotate:storage-reconciliation-v1",
            resume_cursor=resume_cursor,
            next_cursor="",
            observations=observations,
            observed_at=observed_at,
        ),
        policy=policy,
        now=observed_at,
    )
    return len(observations)


def reconcile_storage_inventories(
    *,
    run_key: str,
    environment: Mapping[str, str] | None = None,
    client_factory: Callable[[StorageTransferPeer], StorageTransferClient] = (
        StorageTransferClient
    ),
) -> StorageReconciliationSummary:
    """Persist every configured node's inventory in bounded cursor pages."""

    from endoreg_db.models import StorageNodeState, StorageReconciliationRun
    from endoreg_db.services.hub.storage_reconciliation import (
        StorageReconciliationRequest,
        reconcile_storage_state,
    )

    values = os.environ if environment is None else environment
    normalized_run_key = str(run_key).strip()
    if not normalized_run_key or len(normalized_run_key) > 128:
        raise ValueError("storage reconciliation run_key is required and bounded")
    runtime = StorageBalancingRuntimeConfig.from_environment(values)
    contract = _load_contract(values)
    policy = _reconciliation_policy(runtime)
    page_limit = _INVENTORY_PAGE_LIMIT
    reconciled_nodes = 0
    failed_nodes = 0
    page_count = 0
    observation_count = 0
    failed_node_errors: list[str] = []
    for peer in contract.nodes:
        node = StorageNodeState.objects.select_related("node").get(
            node__node_key=peer.node_key,
        )
        client = client_factory(peer)
        cursor: str | None = None
        seen_cursors: set[str] = set()
        cursor_trace: list[str] = []
        inventory_items: list[StorageInventoryItem] = []
        node_failed = False
        while True:
            try:
                page = client.inventory(cursor=cursor, limit=page_limit)
            except Exception as exc:
                error_type = type(exc).__name__
                unreachable_count = _persist_unreachable_page(
                    storage_node_id=node.pk,
                    run_key=normalized_run_key,
                    node_key=peer.node_key,
                    resume_cursor=cursor or "",
                    error_type=error_type,
                    policy=policy,
                )
                page_count += 1
                observation_count += unreachable_count
                failed_nodes += 1
                failed_node_errors.append(f"{peer.node_key} ({error_type})")
                node_failed = True
                break
            page_count += 1
            inventory_items.extend(page.items)
            if len(inventory_items) > _MAX_INVENTORY_OBSERVATIONS:
                raise ValueError("storage inventory exceeds reconciliation bound")
            if page.next_cursor is None:
                break
            if page.next_cursor in seen_cursors:
                raise ValueError("storage inventory cursor cycle detected")
            seen_cursors.add(page.next_cursor)
            cursor_trace.append(page.next_cursor)
            cursor = page.next_cursor
        if not node_failed:
            bounded_items = tuple(inventory_items)
            inventory_digests = [item.ciphertext_sha256 for item in bounded_items]
            if inventory_digests != sorted(set(inventory_digests)):
                raise ValueError(
                    "storage inventory pages must be globally unique and ordered",
                )
            idempotency_key = _request_key(
                run_key=normalized_run_key,
                node_key=peer.node_key,
                cursor_trace=tuple(cursor_trace),
                items=bounded_items,
            )
            replay = (
                StorageReconciliationRun.objects.filter(idempotency_key=idempotency_key)
                .only("observed_at")
                .first()
            )
            observed_at = replay.observed_at if replay is not None else timezone.now()
            observations = _observations_for_inventory(
                storage_node_id=node.pk,
                node_key=peer.node_key,
                items=bounded_items,
                observed_at=observed_at,
            )
            if len(observations) > policy.max_observations:
                raise ValueError("storage reconciliation observations exceed policy")
            reconcile_storage_state(
                request=StorageReconciliationRequest(
                    idempotency_key=idempotency_key,
                    requested_by="lx-annotate:storage-reconciliation-v1",
                    resume_cursor="",
                    next_cursor="",
                    observations=observations,
                    observed_at=observed_at,
                ),
                policy=policy,
                now=observed_at,
            )
            observation_count += len(observations)
            reconciled_nodes += 1
    if failed_node_errors:
        failed = ", ".join(failed_node_errors)
        raise RuntimeError(f"storage inventory reconciliation failed for: {failed}")
    return StorageReconciliationSummary(
        configured_nodes=len(contract.nodes),
        reconciled_nodes=reconciled_nodes,
        failed_nodes=failed_nodes,
        pages=page_count,
        observations=observation_count,
    )


__all__ = ["StorageReconciliationSummary", "reconcile_storage_inventories"]
