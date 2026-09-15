from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import cast
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from django.utils import timezone
from endoreg_db.models import (
    NetworkNode,
    StorageArtifactKind,
    StorageArtifactPlacement,
    StorageNodeCapability,
    StorageNodeState,
    StorageRotation,
    StorageTransferEvidence,
)
from endoreg_db.services.hub.storage_balancing import (
    BalancingPolicy,
    reconcile_storage_balancing,
)
from endoreg_db.services.hub.storage_placement import PlacementPolicy
from endoreg_db.services.hub.storage_transfer import (
    StoredTransferEvidenceRequest,
    VerifiedTransferEvidenceRequest,
    record_stored_transfer_evidence,
    record_verified_transfer_evidence,
)

from lx_annotate.hub.storage_balance_worker import (
    StorageBalanceWorkerConfig,
    StorageBalancingRuntimeConfig,
    StorageTransferPeerClient,
    _record_terminal_balance_failure,
    execute_storage_balance_work_item,
    execute_storage_rotation_cleanup,
    expire_due_storage_reservations,
)
from lx_annotate.hub.storage_ingest import (
    ProcessedStorageIngestRequest,
    ingest_processed_storage_artifact,
)
from lx_annotate.hub.storage_rekey import (
    StorageRekeyRequest,
    cleanup_retired_rekey_evidence,
    rekey_storage_placement,
)
from lx_annotate.hub.storage_resolver import (
    ResolvedStorageArtifact,
    fetch_committed_storage_artifact,
    resolve_committed_storage_artifact,
)
from lx_annotate.hub.storage_transfer_client import (
    PreparedStorageEnvelope,
    StorageDeleteResult,
    StorageTransferArtifactKind,
    StorageTransferPeer,
    StorageVerifyResult,
    StorageWriteReceipt,
    prepare_storage_envelope,
)

PAYLOAD = b"processed-storage-artifact"


def test_committed_fetch_uses_the_authoritative_renewable_media_lease_gate(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from endoreg_db.services import media_operation_gate

    requests = []
    monkeypatch.setattr(
        media_operation_gate,
        "acquire_media_operation_lease",
        lambda *, request: requests.append(request),
    )

    class _FetchClient:
        def fetch_plaintext(
            self,
            *,
            ciphertext_sha256: str,
            expected_plaintext_sha256: str,
            expected_plaintext_size: int,
            destination: Path,
        ) -> Path:
            del ciphertext_sha256, expected_plaintext_sha256
            destination.write_bytes(PAYLOAD[:expected_plaintext_size])
            return destination

    placement_id = uuid4()
    destination = tmp_path / "leased-fetch.bin"
    result = fetch_committed_storage_artifact(
        resolution=ResolvedStorageArtifact(
            placement_id=placement_id,
            artifact_key="video:1",
            artifact_kind="streamable_video",
            node_key="storage-01",
            ciphertext_sha256="a" * 64,
            plaintext_sha256="b" * 64,
            plaintext_size=len(PAYLOAD),
            media_lease_video_id=42,
        ),
        destination=destination,
        client_factory=lambda _key: cast(StorageTransferPeerClient, _FetchClient()),
    )

    assert result == destination
    assert len(requests) == 1
    lease_request = requests[0]
    assert lease_request.video_id == 42
    assert lease_request.lease_type.value == "stream"
    assert lease_request.metadata == {"storage_placement_id": str(placement_id)}
    assert lease_request.renew_matching is True


def test_committed_fetch_fails_before_disclosure_when_cleanup_owns_lease_gate(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from endoreg_db.services import media_operation_gate

    def deferred(*, request: object) -> None:
        del request
        raise media_operation_gate.MediaOperationDeferred("cleanup pending")

    monkeypatch.setattr(
        media_operation_gate,
        "acquire_media_operation_lease",
        deferred,
    )
    client_called = False

    def client_factory(_key: str) -> StorageTransferPeerClient:
        nonlocal client_called
        client_called = True
        raise AssertionError("storage client must not run without a lease")

    with pytest.raises(ValueError, match="cleanup authorization"):
        fetch_committed_storage_artifact(
            resolution=ResolvedStorageArtifact(
                placement_id=uuid4(),
                artifact_key="video:2",
                artifact_kind="streamable_video",
                node_key="storage-01",
                ciphertext_sha256="a" * 64,
                plaintext_sha256="b" * 64,
                plaintext_size=len(PAYLOAD),
                media_lease_video_id=43,
            ),
            destination=tmp_path / "blocked-fetch.bin",
            client_factory=client_factory,
        )
    assert client_called is False


def test_runtime_policy_contract_is_strict_and_typed() -> None:
    values = {
        "HUB_STORAGE_POLICY_VERSION": "balance-v1",
        "HUB_STORAGE_TELEMETRY_MAX_AGE_SECONDS": "120",
        "HUB_STORAGE_SAFETY_MARGIN_BYTES": "1000",
        "HUB_STORAGE_RESERVATION_TTL_SECONDS": "600",
        "HUB_STORAGE_CAPACITY_PRESSURE_BASIS_POINTS": "9000",
        "HUB_STORAGE_CAPACITY_TARGET_BASIS_POINTS": "7000",
        "HUB_STORAGE_MINIMUM_FILESYSTEM_HEADROOM_BYTES": "1000",
        "HUB_STORAGE_MAX_WORK_ITEMS": "2",
    }
    runtime = StorageBalancingRuntimeConfig.from_environment(values)
    policy = runtime.balancing_policy()
    assert policy.version == "balance-v1"
    assert policy.max_work_items == 2

    values["HUB_STORAGE_CAPACITY_TARGET_BASIS_POINTS"] = "9500"
    with pytest.raises(ValueError, match="target < pressure"):
        StorageBalancingRuntimeConfig.from_environment(values)


@pytest.mark.django_db
def test_expiration_sweeper_releases_accounting_and_fails_target() -> None:
    from datetime import timedelta

    source_state = _node("storage-expiry-source", "rack-a", draining=True)
    target_state = _node("storage-expiry-target", "rack-b")
    digest = "a" * 64
    StorageArtifactPlacement.objects.create(
        storage_node=source_state,
        artifact_key="artifact:expiry:1",
        artifact_kind=StorageArtifactKind.SIDECAR,
        role=StorageArtifactPlacement.Role.PRIMARY,
        state=StorageArtifactPlacement.State.COMMITTED,
        generation=1,
        expected_size_bytes=len(PAYLOAD),
        sha256=digest,
        policy_version="placement-v1",
        committed_at=timezone.now(),
    )
    work = reconcile_storage_balancing(policy=_policy())[0]
    work.reservation.expires_at = timezone.now() - timedelta(seconds=1)
    work.reservation.save(update_fields=["expires_at"])

    assert expire_due_storage_reservations(maximum=1) == 1

    work.reservation.refresh_from_db()
    work.target_placement.refresh_from_db()
    target_state.refresh_from_db()
    assert work.reservation.status == "expired"
    assert work.target_placement.state == StorageArtifactPlacement.State.FAILED
    assert target_state.reserved_bytes == 0


@pytest.mark.django_db
def test_terminal_worker_failure_persists_evidence_and_releases_target() -> None:
    source_state = _node("storage-failure-source", "rack-a", draining=True)
    target_state = _node("storage-failure-target", "rack-b")
    digest = "a" * 64
    StorageArtifactPlacement.objects.create(
        storage_node=source_state,
        artifact_key="artifact:failure:1",
        artifact_kind=StorageArtifactKind.SIDECAR,
        role=StorageArtifactPlacement.Role.PRIMARY,
        state=StorageArtifactPlacement.State.COMMITTED,
        generation=1,
        expected_size_bytes=len(PAYLOAD),
        sha256=digest,
        policy_version="placement-v1",
        committed_at=timezone.now(),
    )
    work = reconcile_storage_balancing(policy=_policy())[0]
    from endoreg_db.services.hub.storage_rotation import advance_storage_rotation

    advance_storage_rotation(
        rotation_id=work.rotation.pk,
        expected_state=StorageRotation.State.REQUESTED,
        target_state=StorageRotation.State.COPYING,
        idempotency_key="failure-copying-0001",
    )
    evidence = record_stored_transfer_evidence(
        request=StoredTransferEvidenceRequest(
            placement_id=work.target_placement.pk,
            rotation_id=work.rotation.pk,
            node_key=target_state.node.node_key,
            artifact_kind=StorageArtifactKind.SIDECAR,
            envelope_profile="x25519-hkdf-sha256-aes256gcm-v1",
            recipient_key_id="b" * 64,
            plaintext_sha256=digest,
            plaintext_size=len(PAYLOAD),
            ciphertext_sha256="c" * 64,
            ciphertext_size=len(PAYLOAD) + 128,
            stored_at=timezone.now(),
            idempotency_key="failure-store-evidence-0001",
        ),
    )

    _record_terminal_balance_failure(
        work_item_id=work.pk,
        reason="worker_terminal:ValueError",
    )

    evidence.refresh_from_db()
    work.rotation.refresh_from_db()
    work.reservation.refresh_from_db()
    work.target_placement.refresh_from_db()
    target_state.refresh_from_db()
    assert evidence.state == "failed"
    assert work.rotation.state == StorageRotation.State.FAILED
    assert work.reservation.status == "released"
    assert work.target_placement.state == StorageArtifactPlacement.State.FAILED
    assert target_state.reserved_bytes == 0


def _node(key: str, domain: str, *, draining: bool = False) -> StorageNodeState:
    node = NetworkNode.objects.create(
        node_key=key,
        display_name=key,
        role=NetworkNode.Role.STORAGE_NODE,
    )
    state = StorageNodeState.objects.create(
        node=node,
        is_draining=draining,
        is_reachable=True,
        accepting_writes=True,
        failure_domain=domain,
        residency_key="de",
        total_bytes=100_000,
        filesystem_free_bytes=90_000,
        policy_usable_bytes=80_000,
        committed_bytes=len(PAYLOAD) if draining else 0,
        observed_at=timezone.now(),
    )
    StorageNodeCapability.objects.create(
        storage_node=state,
        artifact_kind=StorageArtifactKind.ANONYMIZED_VIDEO,
    )
    StorageNodeCapability.objects.create(
        storage_node=state,
        artifact_kind=StorageArtifactKind.SIDECAR,
    )
    return state


def _policy() -> BalancingPolicy:
    from datetime import timedelta

    return BalancingPolicy(
        version="balance-v1",
        placement_policy=PlacementPolicy(
            version="placement-v1",
            telemetry_max_age=timedelta(minutes=5),
            safety_margin_bytes=10,
            reservation_ttl=timedelta(minutes=10),
        ),
        capacity_pressure_basis_points=9_000,
        capacity_target_basis_points=7_000,
        minimum_filesystem_headroom_bytes=10,
        max_work_items=1,
    )


@dataclass
class _FakeClient:
    node_key: str
    peer: StorageTransferPeer
    source_payload: bytes
    invalid_verify: bool = False
    prepared: PreparedStorageEnvelope | None = None

    def fetch_plaintext(
        self,
        *,
        ciphertext_sha256: str,
        expected_plaintext_sha256: str,
        expected_plaintext_size: int,
        destination: Path,
    ) -> Path:
        del ciphertext_sha256
        assert len(self.source_payload) == expected_plaintext_size
        import hashlib

        assert (
            hashlib.sha256(self.source_payload).hexdigest() == expected_plaintext_sha256
        )
        destination.write_bytes(self.source_payload)
        return destination

    def prepare_and_store(
        self,
        *,
        source_path: Path,
        staging_directory: Path,
        idempotency_key: str,
        artifact_kind: StorageTransferArtifactKind,
    ) -> tuple[PreparedStorageEnvelope, StorageWriteReceipt]:
        self.prepared = prepare_storage_envelope(
            peer=self.peer,
            source_path=source_path,
            staging_directory=staging_directory,
            idempotency_key=idempotency_key,
            artifact_kind=artifact_kind,
        )
        return self.prepared, StorageWriteReceipt(
            ciphertext_sha256=self.prepared.ciphertext_sha256,
            ciphertext_size=self.prepared.ciphertext_size,
            plaintext_sha256=self.prepared.envelope.plaintext_sha256,
            plaintext_size=self.prepared.envelope.plaintext_size,
            recipient_key_id=self.prepared.envelope.recipient_key_id,
            created=True,
        )

    def verify(self, ciphertext_sha256: str) -> StorageVerifyResult:
        assert self.prepared is not None
        return StorageVerifyResult(
            ciphertext_sha256=ciphertext_sha256,
            plaintext_sha256=self.prepared.envelope.plaintext_sha256,
            plaintext_size=self.prepared.envelope.plaintext_size,
            valid=not self.invalid_verify,
        )

    def delete(
        self,
        ciphertext_sha256: str,
        *,
        idempotency_key: str,
    ) -> StorageDeleteResult:
        assert idempotency_key
        return StorageDeleteResult(deleted=True, digest=ciphertext_sha256)


@pytest.mark.django_db
def test_balance_worker_moves_verified_envelope_and_exactly_replays(
    tmp_path: Path,
) -> None:
    import hashlib

    source_state = _node("storage-source", "rack-a", draining=True)
    _node("storage-target", "rack-b")
    digest = hashlib.sha256(PAYLOAD).hexdigest()
    source = StorageArtifactPlacement.objects.create(
        storage_node=source_state,
        artifact_key="artifact:processed:1",
        artifact_kind=StorageArtifactKind.SIDECAR,
        role=StorageArtifactPlacement.Role.PRIMARY,
        state=StorageArtifactPlacement.State.COMMITTED,
        generation=1,
        expected_size_bytes=len(PAYLOAD),
        sha256=digest,
        policy_version="placement-v1",
        committed_at=timezone.now(),
    )
    source_evidence = record_stored_transfer_evidence(
        request=StoredTransferEvidenceRequest(
            placement_id=source.pk,
            rotation_id=None,
            node_key="storage-source",
            artifact_kind=source.artifact_kind,
            envelope_profile="x25519-hkdf-sha256-aes256gcm-v1",
            recipient_key_id="a" * 64,
            plaintext_sha256=digest,
            plaintext_size=len(PAYLOAD),
            ciphertext_sha256="b" * 64,
            ciphertext_size=len(PAYLOAD),
            stored_at=timezone.now(),
            idempotency_key="source-store-evidence-0001",
        ),
    )
    record_verified_transfer_evidence(
        request=VerifiedTransferEvidenceRequest(
            evidence_id=source_evidence.pk,
            ciphertext_sha256=source_evidence.ciphertext_sha256,
            plaintext_sha256=digest,
            plaintext_size=len(PAYLOAD),
            verifier="bootstrap:test",
            evidence_reference="bootstrap:test:1",
            verified_at=timezone.now(),
            idempotency_key="source-verify-evidence-0001",
        ),
    )
    work = reconcile_storage_balancing(policy=_policy())[0]

    recipient = X25519PrivateKey.generate().public_key()
    public_path = tmp_path / "recipient.pem"
    public_path.write_bytes(
        recipient.public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    peer = StorageTransferPeer(
        node_key="storage-target",
        display_name="Storage target",
        failure_domain="rack-b",
        residency_key="de",
        placement_weight=100,
        artifact_kinds={StorageTransferArtifactKind.SIDECAR},
        endpoint="https://storage-target.internal:9443",
        ca_certificate_file=tmp_path / "ca.pem",
        client_certificate_file=tmp_path / "client.pem",
        client_key_file=tmp_path / "client-key.pem",
        recipient_public_key_file=public_path,
    )
    clients = {
        "storage-source": _FakeClient("storage-source", peer, PAYLOAD),
        "storage-target": _FakeClient("storage-target", peer, PAYLOAD),
    }

    result = execute_storage_balance_work_item(
        work_item_id=work.pk,
        config=StorageBalanceWorkerConfig(staging_directory=tmp_path / "staging"),
        client_factory=lambda key: cast(StorageTransferPeerClient, clients[key]),
    )
    replay = execute_storage_balance_work_item(
        work_item_id=work.pk,
        config=StorageBalanceWorkerConfig(staging_directory=tmp_path / "staging"),
        client_factory=lambda key: cast(StorageTransferPeerClient, clients[key]),
    )

    assert result == replay
    assert result.state == StorageRotation.State.COMMITTED
    work.rotation.refresh_from_db()
    work.target_placement.refresh_from_db()
    work.reservation.refresh_from_db()
    assert work.target_placement.state == StorageArtifactPlacement.State.COMMITTED
    assert work.reservation.status == "consumed"
    assert list((tmp_path / "staging").glob("*")) == []
    cleanup = execute_storage_rotation_cleanup(
        rotation_id=work.rotation.pk,
        client_factory=lambda key: cast(StorageTransferPeerClient, clients[key]),
    )
    cleanup_replay = execute_storage_rotation_cleanup(
        rotation_id=work.rotation.pk,
        client_factory=lambda key: cast(StorageTransferPeerClient, clients[key]),
    )
    assert cleanup == cleanup_replay
    assert cleanup.state == StorageRotation.State.CLEANED


@pytest.mark.django_db
def test_processed_ingest_places_envelopes_and_exactly_replays(tmp_path: Path) -> None:
    target = _node("storage-ingest", "rack-ingest")
    source_path = (tmp_path / "processed.bin").resolve()
    source_path.write_bytes(PAYLOAD)
    recipient = X25519PrivateKey.generate().public_key()
    public_path = tmp_path / "recipient-ingest.pem"
    public_path.write_bytes(
        recipient.public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    peer = StorageTransferPeer(
        node_key=target.node.node_key,
        display_name="Storage ingest",
        failure_domain="rack-ingest",
        residency_key="de",
        placement_weight=100,
        artifact_kinds={StorageTransferArtifactKind.SIDECAR},
        endpoint="https://storage-ingest.internal:9443",
        ca_certificate_file=tmp_path / "ca.pem",
        client_certificate_file=tmp_path / "client.pem",
        client_key_file=tmp_path / "client-key.pem",
        recipient_public_key_file=public_path,
    )
    client = _FakeClient(target.node.node_key, peer, PAYLOAD)
    runtime = StorageBalancingRuntimeConfig(
        policy_version="placement-v1",
        telemetry_max_age_seconds=120,
        safety_margin_bytes=10,
        reservation_ttl_seconds=600,
        capacity_pressure_basis_points=9_000,
        capacity_target_basis_points=7_000,
        minimum_filesystem_headroom_bytes=10,
        max_work_items=1,
    )
    request = ProcessedStorageIngestRequest(
        artifact_key="artifact:processed:ingest",
        artifact_kind=StorageTransferArtifactKind.SIDECAR,
        source_path=source_path,
        residency_key="de",
        idempotency_key="processed-ingest-0001",
    )
    worker_config = StorageBalanceWorkerConfig(
        staging_directory=tmp_path / "staging-ingest",
    )
    first = ingest_processed_storage_artifact(
        request=request,
        runtime=runtime,
        worker_config=worker_config,
        client_factory=lambda _key: cast(StorageTransferPeerClient, client),
    )
    replay = ingest_processed_storage_artifact(
        request=request,
        runtime=runtime,
        worker_config=worker_config,
        client_factory=lambda _key: cast(StorageTransferPeerClient, client),
    )
    assert first == replay
    placement = StorageArtifactPlacement.objects.get(pk=first.placement_id)
    assert placement.state == StorageArtifactPlacement.State.COMMITTED
    assert first.node_key == "storage-ingest"
    assert list((tmp_path / "staging-ingest").glob("*")) == []

    replacement_public_path = tmp_path / "recipient-ingest-next.pem"
    replacement_public_path.write_bytes(
        X25519PrivateKey.generate()
        .public_key()
        .public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    replacement_peer = peer.model_copy(
        update={"recipient_public_key_file": replacement_public_path},
    )
    replacement_client = _FakeClient(target.node.node_key, replacement_peer, PAYLOAD)
    rekey_request = StorageRekeyRequest(
        placement_id=first.placement_id,
        idempotency_key="processed-rekey-0001",
    )
    rotated = rekey_storage_placement(
        request=rekey_request,
        worker_config=worker_config,
        client_factory=lambda _key: cast(StorageTransferPeerClient, replacement_client),
    )
    rotated_replay = rekey_storage_placement(
        request=rekey_request,
        worker_config=worker_config,
        client_factory=lambda _key: cast(StorageTransferPeerClient, replacement_client),
    )
    assert rotated == rotated_replay
    assert rotated.prior_evidence_id == first.transfer_evidence_id
    assert client.prepared is not None
    assert rotated.recipient_key_id != client.prepared.envelope.recipient_key_id
    resolution = resolve_committed_storage_artifact(placement_id=first.placement_id)
    served_path = tmp_path / "served-artifact.bin"
    fetch_committed_storage_artifact(
        resolution=resolution,
        destination=served_path,
        client_factory=lambda _key: cast(StorageTransferPeerClient, replacement_client),
    )
    assert served_path.read_bytes() == PAYLOAD
    cleanup = cleanup_retired_rekey_evidence(
        evidence_id=rotated.prior_evidence_id,
        client_factory=lambda _key: cast(StorageTransferPeerClient, replacement_client),
    )
    cleanup_replay = cleanup_retired_rekey_evidence(
        evidence_id=rotated.prior_evidence_id,
        client_factory=lambda _key: cast(StorageTransferPeerClient, replacement_client),
    )
    assert cleanup.deleted
    assert not cleanup_replay.deleted
    prior = StorageTransferEvidence.objects.get(pk=rotated.prior_evidence_id)
    assert prior.state == StorageTransferEvidence.State.DELETED
