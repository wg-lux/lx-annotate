from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, JsonValue, model_validator

CheckStatus = Literal["ok", "warning", "error", "unknown"]
SnapshotStatus = Literal["ok", "warning", "error"]
SafeKey = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_.-]{0,63}$")]


class MonitoringCheck(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    key: str = Field(pattern=r"^[a-z][a-z0-9_.-]{0,95}$")
    status: CheckStatus
    summary: str
    detail: str | None = None
    observed_at: datetime
    metadata: dict[str, JsonValue] = Field(default_factory=dict)


def aggregate_status(checks: list[MonitoringCheck]) -> SnapshotStatus:
    if any(check.status == "error" for check in checks):
        return "error"
    if not checks or any(check.status in {"warning", "unknown"} for check in checks):
        return "warning"
    return "ok"


class MonitoringSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal[1] = 1
    status: SnapshotStatus
    observed_at: datetime
    version: str | None
    checks: list[MonitoringCheck]

    @model_validator(mode="after")
    def consistent_status(self) -> Self:
        if self.status != aggregate_status(self.checks):
            raise ValueError("Snapshot status must match its checks")
        if len({check.key for check in self.checks}) != len(self.checks):
            raise ValueError("Check keys must be unique")
        return self


class StorageLocation(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    key: SafeKey
    path: Path
    required: bool = True
    writable: bool = True

    @model_validator(mode="after")
    def absolute_path(self) -> Self:
        if not self.path.is_absolute():
            raise ValueError("Storage locations must be absolute")
        return self


class ServiceExpectation(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    key: SafeKey
    unit: str = Field(
        pattern=r"^[A-Za-z0-9][A-Za-z0-9_.@:-]*\.(service|timer|socket|path)$",
        max_length=160,
    )
    required: bool = True
    expected_active: bool = True


class MonitoringConfiguration(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    schema_version: Literal[1] = 1
    deployment_revision: str | None = Field(
        default=None, pattern=r"^[0-9a-fA-F]{7,64}$"
    )
    services: list[ServiceExpectation] = Field(default_factory=list, max_length=40)
    storage: list[StorageLocation] = Field(default_factory=list, max_length=24)
    disk_warning_free_percent: float = Field(default=10, gt=0, lt=100)
    disk_error_free_percent: float = Field(default=5, ge=0, lt=100)
    pending_warning_seconds: int = Field(default=3600, ge=60, le=604800)
    recent_failure_window_seconds: int = Field(default=86400, ge=60, le=604800)
    systemctl_path: Path | None = None
    systemctl_timeout_seconds: int = Field(default=3, ge=1, le=5)

    @model_validator(mode="after")
    def validate_invariants(self) -> Self:
        if self.disk_error_free_percent >= self.disk_warning_free_percent:
            raise ValueError("Disk error threshold must be below warning threshold")
        for values in (self.services, self.storage):
            if len({value.key for value in values}) != len(values):
                raise ValueError("Monitoring aliases must be unique")
        if self.systemctl_path is not None and not self.systemctl_path.is_absolute():
            raise ValueError("systemctl executable must be absolute")
        return self
