from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from enum import StrEnum
from importlib import import_module
from typing import Any, Protocol, cast
from uuid import UUID

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Count
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from lx_annotate.models import StorageNodeActionReceipt, StorageOperatorDispatchReceipt


class StorageOrchestrationError(RuntimeError):
    """Base error for the fail-closed LX storage orchestration boundary."""


class StorageContractUnavailable(StorageOrchestrationError):
    """The installed endoreg-db does not provide the required storage contract."""


class StorageActionConflict(StorageOrchestrationError):
    """The requested operator transition conflicts with persisted state."""


class StoragePlanningRejected(StorageOrchestrationError):
    """The public placement planner rejected a read-only preview request."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


class _StorageOperatorState(Protocol):
    is_paused: bool
    version: int


class StorageAction(StrEnum):
    DRAIN = "drain"
    RESUME = "resume"


class StorageOperatorControlAction(StrEnum):
    PAUSE = "pause"
    RESUME = "resume"
    RECONCILE = "reconcile"
    REBALANCE = "rebalance"
    RETRY = "retry"


class StorageTopologyState(StrEnum):
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"
    SINGLE_NODE_NON_REDUNDANT = "single_node_non_redundant"
    MULTI_NODE_CONTROL_PLANE_ONLY = "multi_node_control_plane_only"
    MULTI_NODE_OPERATIONAL = "multi_node_operational"


class StoragePlannerStatus(StrEnum):
    CONTRACT_UNAVAILABLE = "contract_unavailable"
    CONTRACT_INCOMPATIBLE = "contract_incompatible"
    CONTROL_PLANE_ONLY = "control_plane_only"


class StorageArtifactKind(StrEnum):
    ANONYMIZED_VIDEO = "anonymized_video"
    PROCESSED_REPORT = "processed_report"
    VIDEO_HLS = "video_hls"
    STREAMABLE_VIDEO = "streamable_video"
    SIDECAR = "sidecar"
    MANIFEST = "manifest"


class StorageActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    action: StorageAction
    node_key: str = Field(min_length=1, max_length=255)
    expected_is_draining: bool
    reason: str = Field(min_length=1, max_length=1000)
    idempotency_key: str = Field(min_length=1, max_length=255)

    @field_validator("node_key", "reason", "idempotency_key")
    @classmethod
    def reject_blank_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value must not be blank")
        return normalized

    @model_validator(mode="after")
    def expected_state_must_precede_action(self) -> StorageActionRequest:
        if self.action == StorageAction.DRAIN and self.expected_is_draining:
            raise ValueError("drain requires expected_is_draining=false")
        if self.action == StorageAction.RESUME and not self.expected_is_draining:
            raise ValueError("resume requires expected_is_draining=true")
        return self


class StorageWorkCancellationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    work_item_id: UUID
    reason: str = Field(min_length=1, max_length=237)
    idempotency_key: str = Field(min_length=1, max_length=255)

    @field_validator("reason", "idempotency_key")
    @classmethod
    def normalize_cancellation_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value must not be blank")
        return normalized


class StorageWorkCancellationResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    work_item_id: UUID
    cancellation_receipt_id: UUID
    rotation_id: UUID
    reservation_id: UUID
    rotation_state: str
    reservation_status: str
    actor: str
    reason: str
    replayed: bool
    correlation_id: str


class StorageOperatorControlRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    action: StorageOperatorControlAction
    reason: str = Field(min_length=1, max_length=255)
    idempotency_key: str = Field(min_length=1, max_length=255)
    node_key: str | None = Field(default=None, min_length=1, max_length=255)
    work_item_id: UUID | None = None

    @field_validator("reason", "idempotency_key", "node_key")
    @classmethod
    def normalize_operator_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("value must not be blank")
        return normalized

    @model_validator(mode="after")
    def validate_action_target(self) -> StorageOperatorControlRequest:
        if self.action is StorageOperatorControlAction.RETRY:
            if self.work_item_id is None or self.node_key is not None:
                raise ValueError("retry requires only work_item_id")
        elif self.action in {
            StorageOperatorControlAction.RECONCILE,
            StorageOperatorControlAction.REBALANCE,
        }:
            if self.work_item_id is not None:
                raise ValueError(
                    "manual reconcile/rebalance cannot target work_item_id",
                )
            if self.node_key is not None:
                raise ValueError("node-scoped manual controls are not available")
        elif self.node_key is not None or self.work_item_id is not None:
            raise ValueError("pause/resume cannot target a node or work item")
        return self


class StorageOperatorControlResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    receipt_id: UUID
    action: StorageOperatorControlAction
    control_version: int
    is_paused: bool
    node_key: str | None
    work_item_id: UUID | None
    retry_target_semantics: str
    replayed: bool
    correlation_id: str


class StorageBalanceWorkOverview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    work_item_id: UUID
    artifact_key: str
    artifact_kind: str
    expected_size_bytes: int
    reason: str
    status: str
    source_node_key: str
    target_node_key: str | None
    rotation_state: str | None
    reservation_status: str | None
    cancellable: bool
    retryable: bool
    cancellation_receipt_id: UUID | None
    terminal_reason: str
    created_at: str


class StorageNodeOverview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    node_key: str
    display_name: str
    active: bool
    is_draining: bool
    is_reachable: bool
    accepting_writes: bool
    failure_domain: str
    residency_key: str
    placement_weight: int
    total_bytes: int
    filesystem_free_bytes: int
    policy_usable_bytes: int
    reserved_bytes: int
    in_flight_bytes: int
    committed_bytes: int
    cleanup_reclaimable_bytes: int
    available_bytes: int
    observed_at: str
    last_probe_at: str | None
    last_error_code: str
    health_freshness_seconds: int
    observation_version: int
    capabilities: list[str]
    current_placement_count: int
    available_action: StorageAction


class StoragePlannerOverview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    status: StoragePlannerStatus
    expected_contract_version: str
    contract_version: str | None
    compatible: bool
    planner_available: bool
    placement_requests_accepted: bool
    queue_execution_enabled: bool
    operator_paused: bool
    operator_control_version: int


class StoragePlanPreviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    artifact_key: str = Field(min_length=1, max_length=255)
    artifact_kind: StorageArtifactKind
    expected_size_bytes: int = Field(gt=0)
    sha256: str = Field(pattern=r"^[0-9a-fA-F]{64}$")
    residency_key: str = Field(min_length=1, max_length=128)
    idempotency_key: str = Field(min_length=1, max_length=255)
    excluded_failure_domains: frozenset[str] = frozenset()
    policy_version: str = Field(min_length=1, max_length=64)
    telemetry_max_age_seconds: int = Field(gt=0, le=86400)
    safety_margin_bytes: int = Field(ge=0)
    reservation_ttl_seconds: int = Field(gt=0, le=86400)

    @field_validator(
        "artifact_key",
        "residency_key",
        "idempotency_key",
        "policy_version",
    )
    @classmethod
    def normalize_preview_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value must not be blank")
        return normalized


class StoragePlanPreview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    contract_version: str
    policy_version: str
    storage_node_id: int
    storage_node_key: str
    observation_version: int
    observed_at: str
    required_bytes: int
    policy_available_bytes: int
    filesystem_available_bytes: int
    persisted: bool = False
    data_plane_operational: bool = False


class StorageOverview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    contract_available: bool
    control_plane_ready: bool
    data_plane_operational: bool
    topology_state: StorageTopologyState
    policy_version: str | None
    policy_versions: list[str]
    nodes: list[StorageNodeOverview]
    placement_count: int
    active_reservation_count: int
    queued_rotation_count: int
    failed_rotation_count: int
    failed_transfer_count: int
    retired_transfer_count: int
    overdue_reservation_count: int
    reservation_counts: dict[str, int]
    rotation_counts: dict[str, int]
    work_items: list[StorageBalanceWorkOverview]
    reconciliation_run_count: int
    reconciliation_alert_counts: dict[str, int]
    reconciliation_critical_count: int
    reconciliation_warning_count: int
    last_reconciliation_at: str | None
    planner: StoragePlannerOverview
    available_actions: list[StorageAction]
    readiness_blockers: list[str]
    blocked_reason: str


class StorageBackend(Protocol):
    def overview(self) -> dict[str, Any]: ...

    def preview_placement(
        self,
        *,
        request: StoragePlanPreviewRequest,
    ) -> dict[str, Any]: ...

    def set_drain_state(
        self,
        *,
        request: StorageActionRequest,
        actor: Any,
        correlation_id: str,
    ) -> dict[str, Any]: ...

    def cancel_work(
        self,
        *,
        request: StorageWorkCancellationRequest,
        actor: Any,
        correlation_id: str,
    ) -> dict[str, Any]: ...

    def apply_operator_control(
        self,
        *,
        request: StorageOperatorControlRequest,
        actor: Any,
        correlation_id: str,
    ) -> dict[str, Any]: ...


class _StoragePlacementPlanLike(Protocol):
    contract_version: str
    policy_version: str
    storage_node_id: int
    storage_node_key: str
    observation_version: int
    observed_at: datetime
    required_bytes: int
    policy_available_bytes: int
    filesystem_available_bytes: int


class _StorageBalanceCancellationLike(Protocol):
    pk: UUID
    work_item_id: UUID
    rotation_id: UUID
    reservation_id: UUID
    rotation_target_state: str
    reservation_target_status: str
    actor: str
    reason: str


class _StorageOperatorReceiptLike(Protocol):
    pk: UUID
    action: str
    control_version: int
    storage_node_id: int | None
    work_item_id: UUID | None
    retry_target_semantics: str


_EXPECTED_PLACEMENT_CONTRACT_VERSION = "hub-storage-control-v1"


_READINESS_DETAILS = {
    "storage_data_plane_not_integrated": (
        "The remote storage data plane is not integrated with this hub release or "
        "verified operational."
    ),
    "storage_node_unreachable": "A configured storage node is unreachable.",
    "storage_node_read_only": "A configured storage node is not accepting writes.",
    "storage_node_telemetry_stale": "A configured storage node has stale telemetry.",
    "no_storage_nodes": "No storage-node state is configured.",
    "no_active_undrained_storage_node": (
        "No active, undrained storage node is available for placement."
    ),
    "telemetry_freshness_policy_unavailable": (
        "No persisted telemetry-freshness policy is available to assess node health."
    ),
    "no_storage_node_capabilities": (
        "Eligible storage nodes do not advertise an artifact capability."
    ),
    "no_policy_available_capacity": (
        "Eligible storage nodes have no policy-available capacity."
    ),
    "placement_policy_version_unresolved": (
        "No persisted placement policy version is available."
    ),
    "placement_policy_version_skew": (
        "Persisted placements reference multiple policy versions."
    ),
    "placement_contract_version_unavailable": (
        "The installed endoreg-db does not publish a storage placement contract version."
    ),
    "placement_contract_version_mismatch": (
        "The installed endoreg-db storage placement contract version is incompatible."
    ),
    "placement_planner_unavailable": (
        "The installed endoreg-db does not publish a non-mutating placement planner."
    ),
    "storage_transfer_integrity_failure": (
        "At least one storage transfer has terminal integrity failure evidence."
    ),
    "storage_reservation_overdue": (
        "At least one active storage reservation is past its persisted expiry."
    ),
    "storage_reconciliation_critical": (
        "The latest storage reconciliation contains critical discrepancies."
    ),
}


def storage_contract_unavailable_overview(detail: str) -> dict[str, Any]:
    return {
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
            "expected_contract_version": _EXPECTED_PLACEMENT_CONTRACT_VERSION,
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
        "blocked_reason": detail,
    }


def storage_access_denied_overview() -> dict[str, Any]:
    payload = storage_contract_unavailable_overview(
        "Explicit storage monitoring permission is required.",
    )
    payload["readiness_blockers"] = ["storage_monitor_permission_required"]
    return StorageOverview.model_validate(payload).model_dump(mode="json")


def _require_central_hub_role() -> None:
    deployment_role = str(getattr(settings, "ENDOREG_DEPLOYMENT_ROLE", "")).strip()
    if deployment_role != "central_hub":
        raise StorageContractUnavailable(
            "Storage orchestration is available only in the central_hub deployment role.",
        )


class _DjangoStorageBackend:
    def __init__(self) -> None:
        try:
            models = import_module("endoreg_db.models")
            self._network_node = models.NetworkNode
            self._artifact_kind = models.StorageArtifactKind
            self._node_state = models.StorageNodeState
            self._placement = models.StorageArtifactPlacement
            self._reservation = models.StorageReservation
            self._rotation = models.StorageRotation
            self._transfer_evidence = models.StorageTransferEvidence
            self._balance_cancellation_receipt = (
                models.StorageBalanceCancellationReceipt
            )
            self._balance_work = models.StorageBalanceWorkItem
            self._reconciliation_run = models.StorageReconciliationRun
            self._reconciliation_event = models.StorageReconciliationEvent
            self._health_snapshot = models.StorageHealthSnapshot
            placement_service = import_module(
                "endoreg_db.services.hub.storage_placement",
            )
            raw_contract_version = getattr(
                placement_service,
                "STORAGE_CONTROL_CONTRACT_VERSION",
                None,
            )
            self._placement_contract_version = (
                raw_contract_version if isinstance(raw_contract_version, str) else None
            )
            self._placement_planner = getattr(
                placement_service,
                "plan_storage_placement",
                None,
            )
            self._placement_policy = getattr(
                placement_service,
                "PlacementPolicy",
                None,
            )
            self._placement_request = getattr(
                placement_service,
                "PlacementRequest",
                None,
            )
            self._placement_error = getattr(
                placement_service,
                "PlacementError",
                None,
            )
            balancing_service = import_module(
                "endoreg_db.services.hub.storage_balancing",
            )
            self._balance_cancellation_request = getattr(
                balancing_service,
                "StorageBalanceCancellationRequest",
                None,
            )
            self._cancel_storage_balance_work = getattr(
                balancing_service,
                "cancel_storage_balance_work",
                None,
            )
            self._balancing_error = getattr(
                balancing_service,
                "BalancingError",
                None,
            )
            operator_service = import_module(
                "endoreg_db.services.hub.storage_operator_control",
            )
            self._operator_contract_version = getattr(
                operator_service,
                "STORAGE_OPERATOR_CONTROL_CONTRACT_VERSION",
                None,
            )
            self._operator_pause_request = getattr(
                operator_service,
                "StorageBalancingPauseRequest",
                None,
            )
            self._operator_manual_request = getattr(
                operator_service,
                "StorageManualActionRequest",
                None,
            )
            self._operator_retry_request = getattr(
                operator_service,
                "StorageBalanceRetryRequest",
                None,
            )
            self._operator_action = models.StorageOperatorAction
            self._set_operator_paused = getattr(
                operator_service,
                "set_storage_balancing_paused",
                None,
            )
            self._request_manual_action = getattr(
                operator_service,
                "request_manual_storage_action",
                None,
            )
            self._request_balance_retry = getattr(
                operator_service,
                "request_storage_balance_retry",
                None,
            )
            self._get_operator_state = getattr(
                operator_service,
                "get_storage_balancing_control_state",
                None,
            )
            self._operator_error = getattr(
                operator_service,
                "StorageOperatorControlError",
                None,
            )
            audit_module = import_module("endoreg_db.models.state.audit_ledger")
            self._audit_ledger = audit_module.AuditLedger
        except (ImportError, AttributeError) as exc:
            raise StorageContractUnavailable(
                "The installed endoreg-db storage orchestration contract is unavailable.",
            ) from exc

        if not hasattr(self._network_node.Role, "STORAGE_NODE"):
            raise StorageContractUnavailable(
                "The installed endoreg-db does not define the storage-node role.",
            )

    def _planner_overview(self) -> dict[str, Any]:
        planner_available = all(
            callable(value)
            for value in (
                self._placement_planner,
                self._placement_policy,
                self._placement_request,
                self._placement_error,
            )
        )
        compatible = (
            self._placement_contract_version == _EXPECTED_PLACEMENT_CONTRACT_VERSION
            and planner_available
        )
        contract_published = (
            self._placement_contract_version is not None and planner_available
        )
        if compatible:
            status = StoragePlannerStatus.CONTROL_PLANE_ONLY
        elif contract_published:
            status = StoragePlannerStatus.CONTRACT_INCOMPATIBLE
        else:
            status = StoragePlannerStatus.CONTRACT_UNAVAILABLE
        get_operator_state = self._get_operator_state
        operator_compatible = (
            self._operator_contract_version == "hub-storage-operator-control-v1"
            and callable(get_operator_state)
        )
        operator_state: _StorageOperatorState | None = None
        try:
            if operator_compatible:
                operator_state = cast(
                    Callable[[], _StorageOperatorState],
                    get_operator_state,
                )()
        except (OperationalError, ProgrammingError):
            operator_compatible = False
        operator_paused = bool(
            operator_state is None or getattr(operator_state, "is_paused", True),
        )
        operator_control_version = int(
            getattr(operator_state, "version", 0) if operator_state is not None else 0,
        )
        execution_enabled = (
            bool(getattr(settings, "ENDOREG_ENABLE_STORAGE_BALANCING", False))
            and operator_compatible
            and not operator_paused
        )
        return {
            "status": status.value,
            "expected_contract_version": _EXPECTED_PLACEMENT_CONTRACT_VERSION,
            "contract_version": self._placement_contract_version,
            "compatible": compatible,
            "planner_available": planner_available,
            # Planning remains read-only until an independently authenticated,
            # encrypted data plane and a persisted operator policy are available.
            "placement_requests_accepted": compatible and execution_enabled,
            "queue_execution_enabled": compatible and execution_enabled,
            "operator_paused": operator_paused,
            "operator_control_version": operator_control_version,
        }

    def preview_placement(
        self,
        *,
        request: StoragePlanPreviewRequest,
    ) -> dict[str, Any]:
        planner = self._planner_overview()
        if not planner["compatible"]:
            raise StorageContractUnavailable(
                "The installed endoreg-db placement planner is not compatible.",
            )
        policy_factory = self._placement_policy
        request_factory = self._placement_request
        planner_function = self._placement_planner
        error_type = self._placement_error
        if (
            not callable(policy_factory)
            or not callable(request_factory)
            or not callable(planner_function)
            or not isinstance(error_type, type)
            or not issubclass(error_type, Exception)
        ):
            raise StorageContractUnavailable(
                "The installed endoreg-db placement planner is incomplete.",
            )
        policy = policy_factory(
            version=request.policy_version,
            telemetry_max_age=timedelta(seconds=request.telemetry_max_age_seconds),
            safety_margin_bytes=request.safety_margin_bytes,
            reservation_ttl=timedelta(seconds=request.reservation_ttl_seconds),
        )
        placement_request = request_factory(
            artifact_key=request.artifact_key,
            artifact_kind=self._artifact_kind(request.artifact_kind.value),
            expected_size_bytes=request.expected_size_bytes,
            sha256=request.sha256,
            residency_key=request.residency_key,
            idempotency_key=request.idempotency_key,
            excluded_failure_domains=request.excluded_failure_domains,
        )
        try:
            result = cast(
                _StoragePlacementPlanLike,
                planner_function(request=placement_request, policy=policy),
            )
        except error_type as exc:
            raise StoragePlanningRejected(
                str(getattr(exc, "code", "planning_rejected")),
                str(exc),
            ) from exc
        return StoragePlanPreview(
            contract_version=str(result.contract_version),
            policy_version=str(result.policy_version),
            storage_node_id=int(result.storage_node_id),
            storage_node_key=str(result.storage_node_key),
            observation_version=int(result.observation_version),
            observed_at=result.observed_at.isoformat(),
            required_bytes=int(result.required_bytes),
            policy_available_bytes=int(result.policy_available_bytes),
            filesystem_available_bytes=int(result.filesystem_available_bytes),
        ).model_dump(mode="json")

    def overview(self) -> dict[str, Any]:
        try:
            states = list(
                self._node_state.objects.select_related("node")
                .prefetch_related("capability_rows")
                .order_by("node__node_key"),
            )
            committed_state = self._placement.State.COMMITTED
            failed_state = self._rotation.State.FAILED
            terminal_states = [self._rotation.State.CLEANED, failed_state]
            placement_counts = {
                row["storage_node_id"]: row["count"]
                for row in self._placement.objects.filter(state=committed_state)
                .values("storage_node_id")
                .annotate(count=Count("pk"))
            }
            active_rotations = self._rotation.objects.exclude(state__in=terminal_states)
            failed_rotations = self._rotation.objects.filter(state=failed_state)
            reservation_counts = {
                str(row["status"]): int(row["count"])
                for row in self._reservation.objects.values("status")
                .annotate(count=Count("pk"))
                .order_by("status")
            }
            rotation_counts = {
                str(row["state"]): int(row["count"])
                for row in self._rotation.objects.values("state")
                .annotate(count=Count("pk"))
                .order_by("state")
            }
            work_rows = list(
                self._balance_work.objects.select_related(
                    "source_placement__storage_node__node",
                    "target_placement__storage_node__node",
                    "reservation",
                    "rotation",
                    "cancellation_receipt",
                ).order_by("-created_at", "-pk")[:50],
            )
            reconciliation_run_count = int(self._reconciliation_run.objects.count())
            latest_reconciliation = self._reconciliation_run.objects.order_by(
                "-completed_at",
                "-pk",
            ).first()
            latest_snapshot = None
            reconciliation_alert_counts: dict[str, int] = {}
            if latest_reconciliation is not None:
                latest_snapshot = self._health_snapshot.objects.filter(
                    run=latest_reconciliation,
                ).first()
                reconciliation_alert_counts = {
                    str(row["alert_code"]): int(row["count"])
                    for row in self._reconciliation_event.objects.filter(
                        run=latest_reconciliation,
                    )
                    .exclude(alert_code="none")
                    .values("alert_code")
                    .annotate(count=Count("pk"))
                    .order_by("alert_code")
                }
            policy_versions = sorted(
                {
                    str(version)
                    for version in self._placement.objects.exclude(policy_version="")
                    .values_list("policy_version", flat=True)
                    .distinct()
                },
            )
        except (OperationalError, ProgrammingError) as exc:
            raise StorageContractUnavailable(
                "The endoreg-db storage orchestration schema is unavailable.",
            ) from exc

        nodes: list[dict[str, Any]] = []
        for state in states:
            available_bytes = max(
                int(state.policy_usable_bytes)
                - int(state.reserved_bytes)
                - int(state.in_flight_bytes)
                - int(state.committed_bytes),
                0,
            )
            observed_at = state.observed_at
            freshness_seconds = max(
                int((timezone.now() - observed_at).total_seconds()),
                0,
            )
            nodes.append(
                {
                    "node_key": str(state.node.node_key),
                    "display_name": str(state.node.display_name),
                    "active": bool(state.node.is_active),
                    "is_draining": bool(state.is_draining),
                    "is_reachable": bool(state.is_reachable),
                    "accepting_writes": bool(state.accepting_writes),
                    "failure_domain": str(state.failure_domain),
                    "residency_key": str(state.residency_key),
                    "placement_weight": int(state.placement_weight),
                    "total_bytes": int(state.total_bytes),
                    "filesystem_free_bytes": int(state.filesystem_free_bytes),
                    "policy_usable_bytes": int(state.policy_usable_bytes),
                    "reserved_bytes": int(state.reserved_bytes),
                    "in_flight_bytes": int(state.in_flight_bytes),
                    "committed_bytes": int(state.committed_bytes),
                    "cleanup_reclaimable_bytes": int(state.cleanup_reclaimable_bytes),
                    "available_bytes": available_bytes,
                    "observed_at": observed_at.isoformat(),
                    "last_probe_at": (
                        state.last_probe_at.isoformat()
                        if state.last_probe_at is not None
                        else None
                    ),
                    "last_error_code": str(state.last_error_code),
                    "health_freshness_seconds": freshness_seconds,
                    "observation_version": int(state.observation_version),
                    "capabilities": sorted(
                        str(capability.artifact_kind)
                        for capability in state.capability_rows.all()
                    ),
                    "current_placement_count": int(placement_counts.get(state.pk, 0)),
                    "available_action": (
                        StorageAction.RESUME.value
                        if state.is_draining
                        else StorageAction.DRAIN.value
                    ),
                },
            )

        work_items: list[dict[str, Any]] = []
        for work in work_rows:
            cancellation = getattr(work, "cancellation_receipt", None)
            rotation = work.rotation
            reservation = work.reservation
            target = work.target_placement
            cancellable = bool(
                cancellation is None
                and rotation is not None
                and reservation is not None
                and target is not None
                and str(rotation.state) == "requested"
                and str(reservation.status) == "active"
                and str(target.state) == "reserved",
            )
            retryable = bool(
                cancellation is None
                and rotation is not None
                and reservation is not None
                and target is not None
                and str(rotation.state) == "failed"
                and rotation.committed_at is None
                and str(work.source_placement.state) == "committed"
                and str(target.state) == "failed"
                and str(reservation.status) in {"released", "expired"},
            )
            work_items.append(
                {
                    "work_item_id": str(work.pk),
                    "artifact_key": str(work.artifact_key),
                    "artifact_kind": str(work.artifact_kind),
                    "expected_size_bytes": int(work.expected_size_bytes),
                    "reason": str(work.reason),
                    "status": str(work.status),
                    "source_node_key": str(
                        work.source_placement.storage_node.node.node_key,
                    ),
                    "target_node_key": (
                        str(target.storage_node.node.node_key)
                        if target is not None
                        else None
                    ),
                    "rotation_state": str(rotation.state) if rotation else None,
                    "reservation_status": (
                        str(reservation.status) if reservation else None
                    ),
                    "cancellable": cancellable,
                    "retryable": retryable,
                    "cancellation_receipt_id": (
                        str(cancellation.pk) if cancellation else None
                    ),
                    "terminal_reason": str(work.terminal_reason),
                    "created_at": work.created_at.isoformat(),
                },
            )
        telemetry_max_age = int(
            getattr(settings, "HUB_STORAGE_TELEMETRY_MAX_AGE_SECONDS", 0) or 0,
        )
        eligible_nodes = [
            node
            for node in nodes
            if node["active"]
            and node["is_reachable"]
            and node["accepting_writes"]
            and not node["is_draining"]
            and telemetry_max_age > 0
            and node["health_freshness_seconds"] <= telemetry_max_age
        ]
        execution_enabled = bool(
            getattr(settings, "ENDOREG_ENABLE_STORAGE_BALANCING", False),
        )
        readiness_blockers: list[str] = []
        if not execution_enabled:
            readiness_blockers.append("storage_data_plane_not_integrated")
        planner = self._planner_overview()
        if planner["status"] == StoragePlannerStatus.CONTRACT_INCOMPATIBLE.value:
            readiness_blockers.append("placement_contract_version_mismatch")
        elif planner["contract_version"] is None:
            readiness_blockers.append("placement_contract_version_unavailable")
        if not planner["planner_available"]:
            readiness_blockers.append("placement_planner_unavailable")
        if not nodes:
            topology_state = "not_configured"
            readiness_blockers.append("no_storage_nodes")
        elif len(nodes) == 1:
            topology_state = "single_node_non_redundant"
        else:
            topology_state = (
                "multi_node_operational"
                if execution_enabled
                else "multi_node_control_plane_only"
            )
        if nodes and not eligible_nodes:
            readiness_blockers.append("no_active_undrained_storage_node")
        if telemetry_max_age <= 0:
            readiness_blockers.append("telemetry_freshness_policy_unavailable")
        if any(not node["is_reachable"] for node in nodes):
            readiness_blockers.append("storage_node_unreachable")
        if any(node["is_reachable"] and not node["accepting_writes"] for node in nodes):
            readiness_blockers.append("storage_node_read_only")
        if telemetry_max_age > 0 and any(
            node["health_freshness_seconds"] > telemetry_max_age for node in nodes
        ):
            readiness_blockers.append("storage_node_telemetry_stale")
        if eligible_nodes and not any(node["capabilities"] for node in eligible_nodes):
            readiness_blockers.append("no_storage_node_capabilities")
        if eligible_nodes and not any(
            node["available_bytes"] > 0 for node in eligible_nodes
        ):
            readiness_blockers.append("no_policy_available_capacity")
        failed_transfer_count = int(
            self._transfer_evidence.objects.filter(
                state=self._transfer_evidence.State.FAILED,
            ).count(),
        )
        retired_transfer_count = int(
            self._transfer_evidence.objects.filter(
                state=self._transfer_evidence.State.RETIRED,
            ).count(),
        )
        overdue_reservation_count = int(
            self._reservation.objects.filter(
                status=self._reservation.Status.ACTIVE,
                expires_at__lte=timezone.now(),
            ).count(),
        )
        if failed_transfer_count:
            readiness_blockers.append("storage_transfer_integrity_failure")
        if overdue_reservation_count:
            readiness_blockers.append("storage_reservation_overdue")
        reconciliation_critical_count = (
            int(latest_snapshot.critical_alert_count)
            if latest_snapshot is not None
            else 0
        )
        reconciliation_warning_count = (
            int(latest_snapshot.warning_alert_count)
            if latest_snapshot is not None
            else 0
        )
        if reconciliation_critical_count:
            readiness_blockers.append("storage_reconciliation_critical")
        configured_policy_version = str(
            getattr(settings, "HUB_STORAGE_POLICY_VERSION", "") or "",
        ).strip()
        if configured_policy_version:
            policy_versions = sorted(set(policy_versions) | {configured_policy_version})
        if len(policy_versions) == 0:
            readiness_blockers.append("placement_policy_version_unresolved")
        elif len(policy_versions) > 1:
            readiness_blockers.append("placement_policy_version_skew")
        blocked_reason = " ".join(
            _READINESS_DETAILS[blocker] for blocker in readiness_blockers
        )
        operational = (
            execution_enabled
            and planner["compatible"]
            and bool(eligible_nodes)
            and not readiness_blockers
        )
        return {
            "contract_available": True,
            "control_plane_ready": operational,
            "data_plane_operational": operational,
            "topology_state": topology_state,
            "policy_version": policy_versions[0] if len(policy_versions) == 1 else None,
            "policy_versions": policy_versions,
            "nodes": nodes,
            "placement_count": int(
                self._placement.objects.filter(state=committed_state).count(),
            ),
            "active_reservation_count": int(
                self._reservation.objects.filter(
                    status=self._reservation.Status.ACTIVE,
                ).count(),
            ),
            "queued_rotation_count": int(active_rotations.count()),
            "failed_rotation_count": int(failed_rotations.count()),
            "failed_transfer_count": failed_transfer_count,
            "retired_transfer_count": retired_transfer_count,
            "overdue_reservation_count": overdue_reservation_count,
            "reservation_counts": reservation_counts,
            "rotation_counts": rotation_counts,
            "work_items": work_items,
            "reconciliation_run_count": reconciliation_run_count,
            "reconciliation_alert_counts": reconciliation_alert_counts,
            "reconciliation_critical_count": reconciliation_critical_count,
            "reconciliation_warning_count": reconciliation_warning_count,
            "last_reconciliation_at": (
                latest_reconciliation.completed_at.isoformat()
                if latest_reconciliation is not None
                else None
            ),
            "planner": planner,
            "available_actions": [action.value for action in StorageAction],
            "readiness_blockers": readiness_blockers,
            "blocked_reason": blocked_reason,
        }

    def set_drain_state(
        self,
        *,
        request: StorageActionRequest,
        actor: Any,
        correlation_id: str,
    ) -> dict[str, Any]:
        planner = self._planner_overview()
        if not planner["compatible"]:
            raise StorageContractUnavailable(
                "Storage mutations are blocked because the installed placement "
                "contract is not compatible.",
            )
        desired_state = request.action == StorageAction.DRAIN
        audit_action = "storage_node_drain_changed"
        try:
            with transaction.atomic():
                replay_result = self._storage_action_replay(
                    request=request,
                    actor=actor,
                )
                if replay_result is not None:
                    return replay_result

                try:
                    state = (
                        self._node_state.objects.select_for_update()
                        .select_related("node")
                        .get(node__node_key=request.node_key)
                    )
                except self._node_state.DoesNotExist as exc:
                    raise StorageActionConflict("Storage node was not found.") from exc
                # A concurrent request may have committed while this transaction waited
                # for the node lock. Re-read the unique receipt before comparing state.
                replay_result = self._storage_action_replay(
                    request=request,
                    actor=actor,
                )
                if replay_result is not None:
                    return replay_result
                if state.node.role != self._network_node.Role.STORAGE_NODE:
                    raise StorageActionConflict(
                        "The selected network node is not a storage node.",
                    )
                if bool(state.is_draining) != request.expected_is_draining:
                    raise StorageActionConflict(
                        "Storage drain state changed before the requested action.",
                    )

                state.is_draining = desired_state
                state.save(update_fields=["is_draining", "updated_at"])
                receipt = StorageNodeActionReceipt.objects.create(
                    idempotency_key=request.idempotency_key,
                    node_key=request.node_key,
                    action=request.action.value,
                    expected_is_draining=request.expected_is_draining,
                    resulting_is_draining=desired_state,
                    reason=request.reason,
                    actor=actor,
                    correlation_id=correlation_id,
                )
                audit = self._audit_ledger.objects.create(
                    user=actor,
                    object_type="StorageNodeState",
                    object_pk=str(state.pk),
                    action=audit_action,
                    data={
                        "node_key": request.node_key,
                        "action": request.action.value,
                        "previous_is_draining": request.expected_is_draining,
                        "is_draining": desired_state,
                        "reason": request.reason,
                        "idempotency_key": request.idempotency_key,
                        "correlation_id": correlation_id,
                        "receipt_id": str(receipt.pk),
                    },
                )
                if not self._audit_ledger.objects.filter(pk=audit.pk).exists():
                    raise StorageContractUnavailable(
                        "The storage action audit ledger is unavailable.",
                    )
                return {
                    "node_key": request.node_key,
                    "is_draining": desired_state,
                    "changed": True,
                    "replayed": False,
                    "correlation_id": correlation_id,
                }
        except IntegrityError as exc:
            replay_result = self._storage_action_replay(request=request, actor=actor)
            if replay_result is not None:
                return replay_result
            raise StorageActionConflict(
                "The storage action conflicted with a concurrent mutation.",
            ) from exc
        except (OperationalError, ProgrammingError) as exc:
            raise StorageContractUnavailable(
                "The storage action receipt or audit schema is unavailable.",
            ) from exc

    def cancel_work(
        self,
        *,
        request: StorageWorkCancellationRequest,
        actor: Any,
        correlation_id: str,
    ) -> dict[str, Any]:
        planner = self._planner_overview()
        if not planner["compatible"]:
            raise StorageContractUnavailable(
                "Storage cancellation is blocked because the installed placement "
                "contract is not compatible.",
            )
        request_factory = self._balance_cancellation_request
        cancel_function = self._cancel_storage_balance_work
        error_type = self._balancing_error
        if (
            not callable(request_factory)
            or not callable(cancel_function)
            or not isinstance(error_type, type)
            or not issubclass(error_type, Exception)
        ):
            raise StorageContractUnavailable(
                "The installed endoreg-db cancellation contract is unavailable.",
            )
        actor_reference = f"django-user:{actor.pk}:{actor.username}"
        if len(actor_reference) > 255:
            raise StorageActionConflict("Storage cancellation actor is too long.")
        try:
            with transaction.atomic():
                cancellation = cast(
                    _StorageBalanceCancellationLike,
                    cancel_function(
                        request=request_factory(
                            work_item_id=request.work_item_id,
                            actor=actor_reference,
                            reason=request.reason,
                            idempotency_key=request.idempotency_key,
                        ),
                    ),
                )
                audit_filter = self._audit_ledger.objects.filter(
                    object_type="StorageBalanceCancellationReceipt",
                    object_pk=str(cancellation.pk),
                    action="storage_balance_work_cancelled",
                )
                replayed = audit_filter.exists()
                if not replayed:
                    self._audit_ledger.objects.create(
                        user=actor,
                        object_type="StorageBalanceCancellationReceipt",
                        object_pk=str(cancellation.pk),
                        action="storage_balance_work_cancelled",
                        data={
                            "work_item_id": str(cancellation.work_item_id),
                            "rotation_id": str(cancellation.rotation_id),
                            "reservation_id": str(cancellation.reservation_id),
                            "reason": request.reason,
                            "idempotency_key": request.idempotency_key,
                            "correlation_id": correlation_id,
                        },
                    )
                return StorageWorkCancellationResult(
                    work_item_id=cancellation.work_item_id,
                    cancellation_receipt_id=cancellation.pk,
                    rotation_id=cancellation.rotation_id,
                    reservation_id=cancellation.reservation_id,
                    rotation_state=str(cancellation.rotation_target_state),
                    reservation_status=str(cancellation.reservation_target_status),
                    actor=str(cancellation.actor),
                    reason=str(cancellation.reason),
                    replayed=replayed,
                    correlation_id=correlation_id,
                ).model_dump(mode="json")
        except error_type as exc:
            code = str(getattr(exc, "code", "cancellation_conflict"))
            raise StorageActionConflict(f"{code}: {exc}") from exc
        except (OperationalError, ProgrammingError) as exc:
            raise StorageContractUnavailable(
                "The storage cancellation or audit schema is unavailable.",
            ) from exc

    def apply_operator_control(
        self,
        *,
        request: StorageOperatorControlRequest,
        actor: Any,
        correlation_id: str,
    ) -> dict[str, Any]:
        if self._operator_contract_version != "hub-storage-operator-control-v1":
            raise StorageContractUnavailable(
                "The installed storage operator-control contract is incompatible.",
            )
        error_type = self._operator_error
        if not isinstance(error_type, type) or not issubclass(error_type, Exception):
            raise StorageContractUnavailable(
                "The installed storage operator-control errors are unavailable.",
            )
        actor_reference = f"django-user:{actor.pk}:{actor.username}"
        if len(actor_reference) > 255:
            raise StorageActionConflict("Storage operator actor is too long.")
        try:
            with transaction.atomic():
                if request.action in {
                    StorageOperatorControlAction.PAUSE,
                    StorageOperatorControlAction.RESUME,
                }:
                    if not callable(self._operator_pause_request) or not callable(
                        self._set_operator_paused,
                    ):
                        raise StorageContractUnavailable(
                            "Storage pause/resume is unavailable.",
                        )
                    receipt = cast(
                        _StorageOperatorReceiptLike,
                        self._set_operator_paused(
                            request=self._operator_pause_request(
                                paused=request.action
                                is StorageOperatorControlAction.PAUSE,
                                actor=actor_reference,
                                reason=request.reason,
                                idempotency_key=request.idempotency_key,
                            ),
                        ),
                    )
                elif request.action is StorageOperatorControlAction.RETRY:
                    if (
                        request.work_item_id is None
                        or not callable(self._operator_retry_request)
                        or not callable(self._request_balance_retry)
                    ):
                        raise StorageContractUnavailable(
                            "Storage retry intent is unavailable.",
                        )
                    receipt = cast(
                        _StorageOperatorReceiptLike,
                        self._request_balance_retry(
                            request=self._operator_retry_request(
                                work_item_id=request.work_item_id,
                                actor=actor_reference,
                                reason=request.reason,
                                idempotency_key=request.idempotency_key,
                            ),
                        ),
                    )
                else:
                    if not callable(self._operator_manual_request) or not callable(
                        self._request_manual_action,
                    ):
                        raise StorageContractUnavailable(
                            "Manual storage reconcile/rebalance is unavailable.",
                        )
                    storage_node_id = None
                    if request.node_key is not None:
                        try:
                            storage_node_id = self._node_state.objects.get(
                                node__node_key=request.node_key,
                            ).pk
                        except self._node_state.DoesNotExist as exc:
                            raise StorageActionConflict(
                                "Storage node was not found.",
                            ) from exc
                    receipt = cast(
                        _StorageOperatorReceiptLike,
                        self._request_manual_action(
                            request=self._operator_manual_request(
                                action=self._operator_action(request.action.value),
                                actor=actor_reference,
                                reason=request.reason,
                                idempotency_key=request.idempotency_key,
                                storage_node_id=storage_node_id,
                            ),
                        ),
                    )
                audit = self._audit_ledger.objects.filter(
                    object_type="StorageOperatorControlReceipt",
                    object_pk=str(receipt.pk),
                    action="storage_operator_control_requested",
                )
                replayed = audit.exists()
                if not replayed:
                    self._audit_ledger.objects.create(
                        user=actor,
                        object_type="StorageOperatorControlReceipt",
                        object_pk=str(receipt.pk),
                        action="storage_operator_control_requested",
                        data={
                            "operator_action": request.action.value,
                            "node_key": request.node_key,
                            "work_item_id": (
                                str(request.work_item_id)
                                if request.work_item_id is not None
                                else None
                            ),
                            "reason": request.reason,
                            "idempotency_key": request.idempotency_key,
                            "control_version": int(receipt.control_version),
                            "correlation_id": correlation_id,
                        },
                    )
                if not callable(self._get_operator_state):
                    raise StorageContractUnavailable(
                        "Storage operator control state is unavailable.",
                    )
                dispatch, _dispatch_created = (
                    StorageOperatorDispatchReceipt.objects.get_or_create(
                        operator_receipt_id=receipt.pk,
                        defaults={
                            "action": request.action.value,
                            "control_version": int(receipt.control_version),
                        },
                    )
                )
                if (
                    dispatch.action != request.action.value
                    or dispatch.control_version != int(receipt.control_version)
                ):
                    raise StorageActionConflict(
                        "Storage operator dispatch identity is inconsistent.",
                    )
                state = cast(
                    Callable[[], _StorageOperatorState],
                    self._get_operator_state,
                )()
                return StorageOperatorControlResult(
                    receipt_id=receipt.pk,
                    action=request.action,
                    control_version=int(receipt.control_version),
                    is_paused=bool(state.is_paused),
                    node_key=request.node_key,
                    work_item_id=request.work_item_id,
                    retry_target_semantics=str(receipt.retry_target_semantics),
                    replayed=replayed,
                    correlation_id=correlation_id,
                ).model_dump(mode="json")
        except error_type as exc:
            code = str(getattr(exc, "code", "operator_control_conflict"))
            raise StorageActionConflict(f"{code}: {exc}") from exc
        except (OperationalError, ProgrammingError) as exc:
            raise StorageContractUnavailable(
                "The storage operator-control schema is unavailable.",
            ) from exc

    def _storage_action_replay(
        self,
        *,
        request: StorageActionRequest,
        actor: Any,
    ) -> dict[str, Any] | None:
        replay = StorageNodeActionReceipt.objects.filter(
            idempotency_key=request.idempotency_key,
        ).first()
        if replay is None:
            return None
        if (
            replay.node_key != request.node_key
            or replay.action != request.action.value
            or bool(replay.expected_is_draining) != request.expected_is_draining
            or bool(replay.resulting_is_draining)
            != (request.action == StorageAction.DRAIN)
            or replay.reason != request.reason
            or replay.actor_id != actor.pk
        ):
            raise StorageActionConflict(
                "The idempotency key is bound to a different storage action.",
            )
        return {
            "node_key": request.node_key,
            "is_draining": bool(replay.resulting_is_draining),
            "changed": False,
            "replayed": True,
            "correlation_id": str(replay.correlation_id),
        }


def _load_backend() -> StorageBackend:
    _require_central_hub_role()
    return _DjangoStorageBackend()


def build_storage_overview() -> dict[str, Any]:
    try:
        payload = _load_backend().overview()
    except StorageContractUnavailable as exc:
        payload = storage_contract_unavailable_overview(str(exc))
    return StorageOverview.model_validate(payload).model_dump(mode="json")


def apply_storage_action(
    *,
    request: StorageActionRequest,
    actor: Any,
    correlation_id: str,
) -> dict[str, Any]:
    return _load_backend().set_drain_state(
        request=request,
        actor=actor,
        correlation_id=correlation_id,
    )


def preview_storage_placement(*, request: StoragePlanPreviewRequest) -> dict[str, Any]:
    return _load_backend().preview_placement(request=request)


def cancel_storage_work(
    *,
    request: StorageWorkCancellationRequest,
    actor: Any,
    correlation_id: str,
) -> dict[str, Any]:
    return _load_backend().cancel_work(
        request=request,
        actor=actor,
        correlation_id=correlation_id,
    )


def apply_storage_operator_control(
    *,
    request: StorageOperatorControlRequest,
    actor: Any,
    correlation_id: str,
) -> dict[str, Any]:
    return _load_backend().apply_operator_control(
        request=request,
        actor=actor,
        correlation_id=correlation_id,
    )


__all__ = [
    "StorageAction",
    "StorageActionConflict",
    "StorageActionRequest",
    "StorageBalanceWorkOverview",
    "StorageContractUnavailable",
    "StorageNodeOverview",
    "StorageOperatorControlAction",
    "StorageOperatorControlRequest",
    "StorageOperatorControlResult",
    "StorageOverview",
    "StoragePlanPreview",
    "StoragePlanPreviewRequest",
    "StoragePlannerOverview",
    "StoragePlannerStatus",
    "StoragePlanningRejected",
    "StorageTopologyState",
    "StorageWorkCancellationRequest",
    "StorageWorkCancellationResult",
    "apply_storage_action",
    "apply_storage_operator_control",
    "build_storage_overview",
    "cancel_storage_work",
    "preview_storage_placement",
    "storage_access_denied_overview",
]
