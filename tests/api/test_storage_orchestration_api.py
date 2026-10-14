from __future__ import annotations

from importlib.metadata import version
from pathlib import Path
from typing import Any, cast
from uuid import UUID

import pytest
from django.test import override_settings
from django.utils import timezone
from packaging.version import Version
from rest_framework.test import APIClient

from lx_annotate.hub import storage_orchestration
from lx_annotate.hub.storage_balance_worker import StorageBalanceWorkerConfig
from lx_annotate.hub.storage_resolver import ResolvedStorageArtifact
from lx_annotate.views import administration


def _storage_contract_models():
    try:
        from endoreg_db.models import (
            NetworkNode,
            StorageArtifactKind,
            StorageArtifactPlacement,
            StorageNodeCapability,
            StorageNodeState,
        )
        from endoreg_db.models.state.audit_ledger import AuditLedger
    except ImportError:
        return None
    return (
        NetworkNode,
        StorageArtifactKind,
        StorageArtifactPlacement,
        StorageNodeCapability,
        StorageNodeState,
        AuditLedger,
    )


@pytest.fixture
def authenticated_client(django_user_model):
    user = django_user_model.objects.create_user(username="storage-reader")
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def global_admin_client(django_user_model):
    user = django_user_model.objects.create_user(
        username="storage-operator",
        is_superuser=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_global_admin_can_stream_only_resolved_verified_storage_artifact(
    global_admin_client: APIClient,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    placement_id = UUID("21f850c1-743c-43fc-9054-835e1e10c515")
    resolution = ResolvedStorageArtifact(
        placement_id=placement_id,
        artifact_key="artifact:processed:1",
        artifact_kind="sidecar",
        node_key="storage-01",
        ciphertext_sha256="a" * 64,
        plaintext_sha256="b" * 64,
        plaintext_size=7,
        media_lease_video_id=None,
    )
    monkeypatch.setattr(
        administration,
        "resolve_committed_storage_artifact",
        lambda **_kwargs: resolution,
    )
    monkeypatch.setattr(
        administration.StorageBalanceWorkerConfig,
        "from_environment",
        lambda: StorageBalanceWorkerConfig(staging_directory=tmp_path),
    )

    def fetch(**kwargs):
        kwargs["destination"].write_bytes(b"payload")

    monkeypatch.setattr(administration, "fetch_committed_storage_artifact", fetch)
    response = global_admin_client.get(
        f"/api/administration/storage-artifacts/{placement_id}/stream/",
    )
    assert response.status_code == 200
    assert b"".join(cast(Any, response).streaming_content) == b"payload"


@pytest.mark.django_db
def test_ordinary_authenticated_user_cannot_stream_storage_artifact(
    authenticated_client: APIClient,
) -> None:
    response = authenticated_client.get(
        "/api/administration/storage-artifacts/"
        "21f850c1-743c-43fc-9054-835e1e10c515/stream/",
    )
    assert response.status_code == 403


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
)
def test_overview_fails_closed_when_storage_contract_is_not_installed(
    authenticated_client,
    monkeypatch,
) -> None:
    def unavailable():
        raise storage_orchestration.StorageContractUnavailable(
            "The installed endoreg-db storage orchestration contract is unavailable.",
        )

    monkeypatch.setattr(storage_orchestration, "_load_backend", unavailable)
    monkeypatch.setattr(administration, "user_has_exact_group", lambda *_args: True)
    response = authenticated_client.get("/api/administration/overview/")

    assert response.status_code == 200
    storage = response.json()["storage_balancing"]
    assert storage == {
        "contract_available": False,
        "control_plane_ready": False,
        "data_plane_operational": False,
        "topology_state": "unavailable",
        "policy_version": None,
        "policy_versions": [],
        "nodes": [],
        "placement_count": 0,
        "active_reservation_count": 0,
        "queued_rotation_count": 0,
        "failed_rotation_count": 0,
        "failed_transfer_count": 0,
        "retired_transfer_count": 0,
        "overdue_reservation_count": 0,
        "reservation_counts": {},
        "rotation_counts": {},
        "work_items": [],
        "reconciliation_run_count": 0,
        "reconciliation_alert_counts": {},
        "reconciliation_critical_count": 0,
        "reconciliation_warning_count": 0,
        "last_reconciliation_at": None,
        "planner": {
            "status": "contract_unavailable",
            "expected_contract_version": "hub-storage-control-v1",
            "contract_version": None,
            "compatible": False,
            "planner_available": False,
            "placement_requests_accepted": False,
            "queue_execution_enabled": False,
            "operator_paused": True,
            "operator_control_version": 0,
        },
        "available_actions": [],
        "readiness_blockers": ["storage_contract_unavailable"],
        "blocked_reason": (
            "The installed endoreg-db storage orchestration contract is unavailable."
        ),
    }


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
)
def test_storage_capacity_is_redacted_without_explicit_monitor_permission(
    authenticated_client,
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        administration,
        "build_storage_overview",
        lambda: (_ for _ in ()).throw(AssertionError("storage queried")),
    )

    response = authenticated_client.get("/api/administration/overview/")

    assert response.status_code == 200
    assert response.json()["effective_permissions"]["storage_monitor_read"] is False
    storage = response.json()["storage_balancing"]
    assert storage["nodes"] == []
    assert storage["readiness_blockers"] == ["storage_monitor_permission_required"]
    assert (
        storage["blocked_reason"]
        == "Explicit storage monitoring permission is required."
    )


@pytest.mark.django_db
@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
def test_storage_action_requires_global_administration(authenticated_client) -> None:
    response = authenticated_client.post(
        "/api/administration/storage-balancing/actions/",
        data={
            "action": "drain",
            "node_key": "storage-1",
            "expected_is_draining": False,
            "reason": "Planned disk replacement",
            "idempotency_key": "drain-storage-1-20260811",
        },
        format="json",
    )

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Global center-scope administration is required.",
    }


class _RecordingBackend:
    def __init__(self) -> None:
        self.call: dict[str, Any] | None = None

    def overview(self) -> dict[str, Any]:
        raise AssertionError("overview was not expected")

    def set_drain_state(self, **kwargs: Any) -> dict[str, Any]:
        self.call = kwargs
        return {
            "node_key": kwargs["request"].node_key,
            "is_draining": True,
            "changed": True,
            "replayed": False,
            "correlation_id": kwargs["correlation_id"],
        }

    def cancel_work(self, **kwargs: Any) -> dict[str, Any]:
        self.call = kwargs
        return {
            "work_item_id": str(kwargs["request"].work_item_id),
            "cancellation_receipt_id": "4d6cf8f6-eae1-495b-85b9-b351701b85dc",
            "rotation_id": "20e302ef-6940-47f0-981a-39b419018f81",
            "reservation_id": "83373927-8e42-459b-bf8b-1d8110d89ab6",
            "rotation_state": "failed",
            "reservation_status": "released",
            "actor": f"django-user:{kwargs['actor'].pk}:{kwargs['actor'].username}",
            "reason": kwargs["request"].reason,
            "replayed": False,
            "correlation_id": kwargs["correlation_id"],
        }

    def apply_operator_control(self, **kwargs: Any) -> dict[str, Any]:
        self.call = kwargs
        return {
            "receipt_id": "9e08bd12-0cc6-456f-b9a3-cd0f4d40ec4a",
            "action": kwargs["request"].action.value,
            "control_version": 1,
            "is_paused": kwargs["request"].action.value == "pause",
            "node_key": kwargs["request"].node_key,
            "work_item_id": (
                str(kwargs["request"].work_item_id)
                if kwargs["request"].work_item_id is not None
                else None
            ),
            "retry_target_semantics": "",
            "replayed": False,
            "correlation_id": kwargs["correlation_id"],
        }


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
)
def test_global_admin_can_apply_typed_attributable_drain_action(
    global_admin_client,
    monkeypatch,
) -> None:
    backend = _RecordingBackend()
    monkeypatch.setattr(storage_orchestration, "_load_backend", lambda: backend)
    monkeypatch.setattr(
        administration,
        "apply_storage_action",
        storage_orchestration.apply_storage_action,
    )

    response = global_admin_client.post(
        "/api/administration/storage-balancing/actions/",
        data={
            "action": "drain",
            "node_key": "storage-1",
            "expected_is_draining": False,
            "reason": "Planned disk replacement",
            "idempotency_key": "drain-storage-1-20260811",
        },
        format="json",
        HTTP_X_REQUEST_ID="storage-request-123",
    )

    assert response.status_code == 200
    assert response.json() == {
        "node_key": "storage-1",
        "is_draining": True,
        "changed": True,
        "replayed": False,
        "correlation_id": "storage-request-123",
    }
    assert backend.call is not None
    assert backend.call["actor"].username == "storage-operator"
    assert backend.call["request"].reason == "Planned disk replacement"


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
)
def test_balance_work_cancellation_is_global_admin_typed_and_attributable(
    global_admin_client: APIClient,
    authenticated_client: APIClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    work_item_id = UUID("a41c1700-95d1-47ea-a975-8f810df47b2c")
    endpoint = (
        f"/api/administration/storage-balancing/work-items/{work_item_id}/cancel/"
    )
    payload = {
        "reason": "Operator paused the drain before copying",
        "idempotency_key": "cancel-storage-work-20260811",
    }
    forbidden = authenticated_client.post(endpoint, data=payload, format="json")
    assert forbidden.status_code == 403

    backend = _RecordingBackend()
    monkeypatch.setattr(storage_orchestration, "_load_backend", lambda: backend)
    monkeypatch.setattr(
        administration,
        "cancel_storage_work",
        storage_orchestration.cancel_storage_work,
    )
    response = global_admin_client.post(
        endpoint,
        data=payload,
        format="json",
        HTTP_X_REQUEST_ID="cancel-request-123",
    )

    assert response.status_code == 200
    response_json = cast(Any, response).json()
    assert response_json["rotation_state"] == "failed"
    assert response_json["reservation_status"] == "released"
    assert response_json["correlation_id"] == "cancel-request-123"
    assert backend.call is not None
    assert backend.call["request"].work_item_id == work_item_id
    assert backend.call["actor"].username == "storage-operator"


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
)
def test_operator_pause_is_global_admin_typed_attributable_and_dispatched(
    global_admin_client: APIClient,
    authenticated_client: APIClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    endpoint = "/api/administration/storage-balancing/operator-controls/"
    payload = {
        "action": "pause",
        "reason": "Pause during storage maintenance",
        "idempotency_key": "pause-storage-20260811",
    }
    forbidden = authenticated_client.post(endpoint, data=payload, format="json")
    assert forbidden.status_code == 403

    backend = _RecordingBackend()
    monkeypatch.setattr(storage_orchestration, "_load_backend", lambda: backend)
    monkeypatch.setattr(
        administration,
        "apply_storage_operator_control",
        storage_orchestration.apply_storage_operator_control,
    )
    monkeypatch.setattr(
        "lx_annotate.tasks.dispatch_storage_operator_control_receipt_task.delay",
        lambda _receipt_id: None,
    )
    response = global_admin_client.post(
        endpoint,
        data=payload,
        format="json",
        HTTP_X_REQUEST_ID="pause-request-123",
    )

    assert response.status_code == 202
    response_json = cast(Any, response).json()
    assert response_json["action"] == "pause"
    assert response_json["is_paused"] is True
    assert response_json["dispatch_queued"] is True
    assert backend.call is not None
    assert backend.call["actor"].username == "storage-operator"


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
)
def test_operator_intent_survives_initial_broker_submission_failure(
    global_admin_client: APIClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    backend = _RecordingBackend()
    monkeypatch.setattr(storage_orchestration, "_load_backend", lambda: backend)
    monkeypatch.setattr(
        administration,
        "apply_storage_operator_control",
        storage_orchestration.apply_storage_operator_control,
    )
    monkeypatch.setattr(
        "lx_annotate.tasks.dispatch_storage_operator_control_receipt_task.delay",
        lambda _receipt_id: (_ for _ in ()).throw(ConnectionError("broker down")),
    )

    response = global_admin_client.post(
        "/api/administration/storage-balancing/operator-controls/",
        data={
            "action": "reconcile",
            "reason": "Verify storage inventory",
            "idempotency_key": "reconcile-storage-20260811",
        },
        format="json",
    )

    assert response.status_code == 202
    response_json = cast(Any, response).json()
    assert response_json["dispatch_queued"] is False
    assert response_json["receipt_id"]


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
)
def test_storage_action_returns_service_unavailable_without_contract(
    global_admin_client,
    monkeypatch,
) -> None:
    def unavailable(**_kwargs: Any):
        raise storage_orchestration.StorageContractUnavailable(
            "The installed endoreg-db storage orchestration contract is unavailable.",
        )

    monkeypatch.setattr(administration, "apply_storage_action", unavailable)
    response = global_admin_client.post(
        "/api/administration/storage-balancing/actions/",
        data={
            "action": "resume",
            "node_key": "storage-1",
            "expected_is_draining": True,
            "reason": "Replacement verified",
            "idempotency_key": "resume-storage-1-20260811",
        },
        format="json",
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "The installed endoreg-db storage orchestration contract is unavailable.",
    }


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
)
def test_public_endoreg_contract_drives_overview_and_idempotent_drain(
    global_admin_client,
) -> None:
    contract_models = _storage_contract_models()
    if contract_models is None:
        installed_version = version("endoreg-db")
        assert Version(installed_version) < Version("1.0.10.0"), (
            "endoreg-db >=1.0.10.0 must expose the storage-node contract"
        )
        storage = storage_orchestration.build_storage_overview()
        assert storage["contract_available"] is False
        assert storage["readiness_blockers"] == ["storage_contract_unavailable"]
        return
    (
        NetworkNode,
        _StorageArtifactKind,
        _StorageArtifactPlacement,
        _StorageNodeCapability,
        StorageNodeState,
        AuditLedger,
    ) = contract_models
    node = NetworkNode.objects.create(
        display_name="Protected Storage 1",
        node_key="storage-1",
        role=NetworkNode.Role.STORAGE_NODE,
        is_active=True,
    )
    StorageNodeState.objects.create(
        node=node,
        is_draining=False,
        is_reachable=True,
        accepting_writes=True,
        failure_domain="rack-a",
        residency_key="de-clinical",
        placement_weight=100,
        total_bytes=10_000,
        filesystem_free_bytes=8_000,
        policy_usable_bytes=7_000,
        reserved_bytes=500,
        in_flight_bytes=250,
        committed_bytes=1_000,
        cleanup_reclaimable_bytes=100,
        observed_at=timezone.now(),
        observation_version=3,
    )

    overview = global_admin_client.get("/api/administration/overview/")

    assert overview.status_code == 200
    storage = overview.json()["storage_balancing"]
    assert storage["contract_available"] is True
    assert storage["control_plane_ready"] is False
    assert storage["data_plane_operational"] is False
    assert storage["topology_state"] == "single_node_non_redundant"
    assert storage["nodes"][0]["available_bytes"] == 5_250
    assert storage["nodes"][0]["available_action"] == "drain"
    assert "storage_data_plane_not_integrated" in storage["readiness_blockers"]
    assert "telemetry_freshness_policy_unavailable" in storage["readiness_blockers"]
    assert storage["planner"] == {
        "status": "control_plane_only",
        "expected_contract_version": "hub-storage-control-v1",
        "contract_version": "hub-storage-control-v1",
        "compatible": True,
        "planner_available": True,
        "placement_requests_accepted": False,
        "queue_execution_enabled": False,
        "operator_paused": False,
        "operator_control_version": 0,
    }
    assert storage["reservation_counts"] == {}
    assert storage["rotation_counts"] == {}

    request = {
        "action": "drain",
        "node_key": "storage-1",
        "expected_is_draining": False,
        "reason": "Planned disk replacement",
        "idempotency_key": "drain-storage-1-20260811",
    }
    drain = global_admin_client.post(
        "/api/administration/storage-balancing/actions/",
        data=request,
        format="json",
        HTTP_X_REQUEST_ID="storage-request-123",
    )
    replay = global_admin_client.post(
        "/api/administration/storage-balancing/actions/",
        data=request,
        format="json",
        HTTP_X_REQUEST_ID="different-request-id",
    )
    conflicting_replay = global_admin_client.post(
        "/api/administration/storage-balancing/actions/",
        data={**request, "reason": "A different operation"},
        format="json",
        HTTP_X_REQUEST_ID="conflicting-request-id",
    )

    assert drain.status_code == 200
    assert drain.json()["changed"] is True
    assert replay.status_code == 200
    assert replay.json() == {
        "node_key": "storage-1",
        "is_draining": True,
        "changed": False,
        "replayed": True,
        "correlation_id": "storage-request-123",
    }
    assert conflicting_replay.status_code == 409
    assert StorageNodeState.objects.get(pk=node.storage_state.pk).is_draining is True
    audit = AuditLedger.objects.get(action="storage_node_drain_changed")
    assert audit.user.username == "storage-operator"
    assert audit.data["reason"] == "Planned disk replacement"
    receipt = storage_orchestration.StorageNodeActionReceipt.objects.get(
        idempotency_key="drain-storage-1-20260811",
    )
    assert receipt.actor.username == "storage-operator"
    assert receipt.expected_is_draining is False
    assert receipt.reason == "Planned disk replacement"


@pytest.mark.django_db
@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    ENDOREG_DEPLOYMENT_ROLE="central_hub",
)
def test_public_planner_preview_is_non_mutating_and_reports_no_data_plane(
    global_admin_client,
) -> None:
    contract_models = _storage_contract_models()
    if contract_models is None:
        pytest.skip("installed endoreg-db predates the public storage planner")
    (
        NetworkNode,
        StorageArtifactKind,
        StorageArtifactPlacement,
        StorageNodeCapability,
        StorageNodeState,
        _AuditLedger,
    ) = contract_models
    node = NetworkNode.objects.create(
        display_name="Protected Storage 1",
        node_key="storage-1",
        role=NetworkNode.Role.STORAGE_NODE,
        is_active=True,
    )
    state = StorageNodeState.objects.create(
        node=node,
        is_draining=False,
        is_reachable=True,
        accepting_writes=True,
        failure_domain="rack-a",
        residency_key="de-clinical",
        placement_weight=100,
        total_bytes=10_000,
        filesystem_free_bytes=8_000,
        policy_usable_bytes=7_000,
        observed_at=timezone.now(),
        observation_version=3,
    )
    StorageNodeCapability.objects.create(
        storage_node=state,
        artifact_kind=StorageArtifactKind.ANONYMIZED_VIDEO,
    )

    response = global_admin_client.post(
        "/api/administration/storage-balancing/placement-preview/",
        data={
            "artifact_key": "video:42:processed",
            "artifact_kind": "anonymized_video",
            "expected_size_bytes": 1_000,
            "sha256": "a" * 64,
            "residency_key": "de-clinical",
            "idempotency_key": "preview-video-42",
            "excluded_failure_domains": [],
            "policy_version": "capacity-weighted-v1",
            "telemetry_max_age_seconds": 120,
            "safety_margin_bytes": 100,
            "reservation_ttl_seconds": 600,
        },
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["contract_version"] == "hub-storage-control-v1"
    assert payload["policy_version"] == "capacity-weighted-v1"
    assert payload["storage_node_id"] == state.pk
    assert payload["storage_node_key"] == "storage-1"
    assert payload["required_bytes"] == 1_100
    assert payload["policy_available_bytes"] == 7_000
    assert payload["filesystem_available_bytes"] == 8_000
    assert payload["persisted"] is False
    assert payload["data_plane_operational"] is False
    assert StorageArtifactPlacement.objects.count() == 0


@pytest.mark.django_db
@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
def test_storage_preview_requires_monitor_permission(authenticated_client) -> None:
    response = authenticated_client.post(
        "/api/administration/storage-balancing/placement-preview/",
        data={},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_planner_status_distinguishes_missing_and_mismatched_contract() -> None:
    contract_models = _storage_contract_models()
    if contract_models is None:
        pytest.skip("installed endoreg-db predates the storage control contract")
    backend = storage_orchestration._DjangoStorageBackend()

    backend._placement_contract_version = None
    backend._placement_planner = None
    missing = backend._planner_overview()
    assert missing["status"] == "contract_unavailable"
    assert missing["compatible"] is False
    assert missing["planner_available"] is False

    backend._placement_contract_version = "hub-storage-control-v999"
    backend._placement_planner = lambda **_kwargs: None
    mismatched = backend._planner_overview()
    assert mismatched["status"] == "contract_incompatible"
    assert mismatched["compatible"] is False
    assert mismatched["planner_available"] is True
