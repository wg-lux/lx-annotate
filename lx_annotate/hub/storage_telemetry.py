"""Authenticated reconciliation of configured storage peers into endoreg-db."""

from __future__ import annotations

import os
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path

from django.utils import timezone

from .storage_transfer_client import (
    StorageTransferClient,
    StorageTransferClientContract,
    StorageTransferPeer,
)


@dataclass(frozen=True, slots=True)
class StorageTelemetrySyncSummary:
    configured: int
    healthy: int
    failed: int


def sync_storage_node_telemetry(
    *,
    environment: Mapping[str, str] | None = None,
    client_factory: Callable[[StorageTransferPeer], StorageTransferClient] = (
        StorageTransferClient
    ),
) -> StorageTelemetrySyncSummary:
    from endoreg_db.models import StorageArtifactKind, StorageNodeState
    from endoreg_db.services.hub.storage_telemetry import (
        STORAGE_TELEMETRY_CONTRACT_VERSION,
        StorageNodeTelemetry,
        StorageNodeTopology,
        record_storage_node_probe_failure,
        record_storage_node_telemetry,
    )

    if STORAGE_TELEMETRY_CONTRACT_VERSION != "hub-storage-telemetry-v1":
        raise RuntimeError("incompatible endoreg-db storage telemetry contract")
    values = os.environ if environment is None else environment
    path = Path(str(values.get("HUB_STORAGE_NODES_FILE", "")).strip())
    if not path.is_absolute() or not path.is_file():
        raise ValueError("HUB_STORAGE_NODES_FILE must be a readable absolute file")
    contract = StorageTransferClientContract.load_file(path)
    healthy = 0
    failed = 0
    for peer in contract.nodes:
        topology = StorageNodeTopology(
            node_key=peer.node_key,
            display_name=peer.display_name,
            failure_domain=peer.failure_domain,
            residency_key=peer.residency_key,
            placement_weight=peer.placement_weight,
            artifact_kinds=frozenset(
                StorageArtifactKind(kind.value) for kind in peer.artifact_kinds
            ),
        )
        existing = StorageNodeState.objects.filter(node__node_key=peer.node_key).first()
        expected_version = (
            existing.observation_version if existing is not None else None
        )
        observed_at = timezone.now()
        try:
            client = client_factory(peer)
            health = client.health()
            capacity = client.capacity()
            if health.node_id != peer.node_key:
                raise ValueError(
                    "storage health identity does not match configured node",
                )
            if peer.recipient_key_id() not in health.recipient_key_ids:
                raise ValueError(
                    "storage node does not expose the configured recipient key",
                )
            if (
                health.accepting_writes != capacity.accepting_writes
                or health.used_percent != capacity.used_percent
                or health.available_bytes != capacity.available_bytes
            ):
                raise ValueError("storage health and capacity observations disagree")
            record_storage_node_telemetry(
                request=StorageNodeTelemetry(
                    topology=topology,
                    expected_observation_version=expected_version,
                    total_bytes=capacity.total_bytes,
                    filesystem_free_bytes=capacity.free_bytes,
                    policy_available_bytes=capacity.available_bytes,
                    accepting_writes=(
                        capacity.accepting_writes
                        and health.accepting_writes
                        and health.status == "ready"
                    ),
                    observed_at=observed_at,
                ),
            )
            healthy += 1
        except Exception as exc:
            record_storage_node_probe_failure(
                topology=topology,
                expected_observation_version=expected_version,
                observed_at=observed_at,
                error_code=type(exc).__name__.lower()[:64],
            )
            failed += 1
    return StorageTelemetrySyncSummary(
        configured=len(contract.nodes),
        healthy=healthy,
        failed=failed,
    )


__all__ = ["StorageTelemetrySyncSummary", "sync_storage_node_telemetry"]
