from __future__ import annotations

import json
from pathlib import Path
from typing import Literal, cast

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from endoreg_db.models import StorageNodeState

from lx_annotate.hub.storage_telemetry import sync_storage_node_telemetry
from lx_annotate.hub.storage_transfer_client import (
    WIRE_CONTRACT_VERSION,
    StorageCapacity,
    StorageHealth,
    StorageTransferClient,
    StorageTransferPeer,
)


class _HealthyClient:
    def __init__(self, peer: StorageTransferPeer) -> None:
        self.peer = peer

    def health(self) -> StorageHealth:
        return StorageHealth(
            contract_version=cast(Literal["lx-hub-storage-v1"], WIRE_CONTRACT_VERSION),
            node_id=self.peer.node_key,
            status="ready",
            accepting_writes=True,
            used_percent=20,
            available_bytes=7_000,
            recipient_key_ids=[self.peer.recipient_key_id()],
        )

    def capacity(self) -> StorageCapacity:
        return StorageCapacity(
            total_bytes=10_000,
            free_bytes=8_000,
            available_bytes=7_000,
            used_percent=20,
            accepting_writes=True,
        )


def _contract_file(tmp_path: Path) -> Path:
    recipient_path = (tmp_path / "recipient.pub").resolve()
    recipient_path.write_bytes(
        X25519PrivateKey.generate()
        .public_key()
        .public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    path = (tmp_path / "nodes.json").resolve()
    path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "deployment_role": "central_hub",
                "nodes": [
                    {
                        "node_key": "storage-telemetry-01",
                        "display_name": "Storage telemetry 01",
                        "failure_domain": "rack-a",
                        "residency_key": "de",
                        "placement_weight": 100,
                        "artifact_kinds": ["anonymized_video", "sidecar"],
                        "endpoint": "https://storage-telemetry-01.internal:9443",
                        "ca_certificate_file": "/run/ca",
                        "client_certificate_file": "/run/cert",
                        "client_key_file": "/run/key",
                        "recipient_public_key_file": str(recipient_path),
                    },
                ],
            },
        ),
        encoding="utf-8",
    )
    return path


@pytest.mark.django_db
def test_sync_reconciles_exact_configured_identity_and_capacity(tmp_path: Path) -> None:
    path = _contract_file(tmp_path)
    summary = sync_storage_node_telemetry(
        environment={"HUB_STORAGE_NODES_FILE": str(path)},
        client_factory=lambda peer: cast(StorageTransferClient, _HealthyClient(peer)),
    )
    assert summary.configured == summary.healthy == 1
    state = StorageNodeState.objects.get(node__node_key="storage-telemetry-01")
    assert state.is_reachable
    assert state.accepting_writes
    assert state.policy_usable_bytes == 7_000


@pytest.mark.django_db
def test_sync_persists_probe_failure_without_reusing_stale_health(
    tmp_path: Path,
) -> None:
    path = _contract_file(tmp_path)

    def unavailable(_peer: StorageTransferPeer) -> StorageTransferClient:
        raise ConnectionError("unreachable")

    summary = sync_storage_node_telemetry(
        environment={"HUB_STORAGE_NODES_FILE": str(path)},
        client_factory=unavailable,
    )
    assert summary.failed == 1
    state = StorageNodeState.objects.get(node__node_key="storage-telemetry-01")
    assert not state.is_reachable
    assert not state.accepting_writes
    assert state.last_error_code == "connectionerror"


@pytest.mark.django_db
def test_sync_fails_closed_on_recipient_or_observation_skew(tmp_path: Path) -> None:
    path = _contract_file(tmp_path)

    class _SkewedClient(_HealthyClient):
        def health(self) -> StorageHealth:
            return (
                super()
                .health()
                .model_copy(
                    update={
                        "available_bytes": 6_999,
                        "recipient_key_ids": ["f" * 64],
                    },
                )
            )

    summary = sync_storage_node_telemetry(
        environment={"HUB_STORAGE_NODES_FILE": str(path)},
        client_factory=lambda peer: cast(StorageTransferClient, _SkewedClient(peer)),
    )

    assert summary.failed == 1
    state = StorageNodeState.objects.get(node__node_key="storage-telemetry-01")
    assert not state.is_reachable
    assert not state.accepting_writes
    assert state.last_error_code == "valueerror"
