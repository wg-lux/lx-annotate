from __future__ import annotations

from uuid import uuid4

import pytest
from django.utils import timezone
from endoreg_db.models import (
    NetworkNode,
    StorageArtifactKind,
    StorageArtifactPlacement,
    StorageNodeState,
)

from lx_annotate.hub.storage_reconciliation import (
    _observations_for_inventory,
    _request_key,
)
from lx_annotate.hub.storage_transfer_client import (
    StorageInventoryItem,
    StorageTransferArtifactKind,
)


def test_inventory_run_key_separates_fresh_runs_and_replays() -> None:
    item = StorageInventoryItem(
        ciphertext_sha256="1" * 64,
        ciphertext_size=17,
        plaintext_sha256="2" * 64,
        plaintext_size=1,
        recipient_key_id="3" * 64,
        artifact_kind=StorageTransferArtifactKind.ANONYMIZED_VIDEO,
    )

    first = _request_key(
        run_key="operator-receipt-1",
        node_key="gs-01",
        cursor_trace=("cursor-page-1",),
        items=(item,),
    )
    replay = _request_key(
        run_key="operator-receipt-1",
        node_key="gs-01",
        cursor_trace=("cursor-page-1",),
        items=(item,),
    )
    later = _request_key(
        run_key="operator-receipt-2",
        node_key="gs-01",
        cursor_trace=("cursor-page-1",),
        items=(item,),
    )

    assert first == replay
    assert later != first


@pytest.mark.django_db
def test_empty_inventory_emits_database_only_observation() -> None:
    network_node = NetworkNode.objects.create(
        node_key="gs-01",
        display_name="gs-01",
        role=NetworkNode.Role.STORAGE_NODE,
    )
    storage_node = StorageNodeState.objects.create(
        node=network_node,
        is_reachable=True,
        accepting_writes=True,
        failure_domain="gs-01",
        residency_key="de",
        total_bytes=10_000,
        filesystem_free_bytes=9_000,
        policy_usable_bytes=9_000,
        committed_bytes=1_000,
        observed_at=timezone.now(),
    )
    placement = StorageArtifactPlacement.objects.create(
        storage_node=storage_node,
        artifact_key="anonymized-video:17",
        artifact_kind=StorageArtifactKind.ANONYMIZED_VIDEO,
        role=StorageArtifactPlacement.Role.PRIMARY,
        state=StorageArtifactPlacement.State.COMMITTED,
        generation=1,
        expected_size_bytes=1_000,
        sha256="4" * 64,
        policy_version="placement-v1",
        committed_at=timezone.now(),
    )
    observed_at = timezone.now()

    observations = _observations_for_inventory(
        storage_node_id=storage_node.pk,
        node_key=network_node.node_key,
        items=(),
        observed_at=observed_at,
    )

    assert len(observations) == 1
    observation = observations[0]
    assert observation.placement_id == placement.pk
    assert observation.reachable is True
    assert observation.remote_present is False
    assert observation.remote_copy_count == 0
    assert observation.remote_sha256 == ""


def test_request_key_rejects_no_identity_collisions_for_distinct_nodes() -> None:
    item = StorageInventoryItem(
        ciphertext_sha256="5" * 64,
        ciphertext_size=17,
        plaintext_sha256="6" * 64,
        plaintext_size=1,
        recipient_key_id="7" * 64,
        artifact_kind=StorageTransferArtifactKind.MANIFEST,
    )
    run_key = str(uuid4())

    assert _request_key(
        run_key=run_key,
        node_key="gs-01",
        cursor_trace=(),
        items=(item,),
    ) != _request_key(
        run_key=run_key,
        node_key="gs-03",
        cursor_trace=(),
        items=(item,),
    )
