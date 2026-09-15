from __future__ import annotations

from typing import Self

from pydantic import BaseModel, ConfigDict, model_validator

from ..models import OutboundHubTransferJob
from .hub_export_reconciliation import hub_export_max_retries


class HubExportHealthSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    total_jobs: int
    active: int
    completed: int
    configuration_rejection: int
    authorization_denial: int
    integrity_inconsistency: int
    transient_retry: int
    retry_exhausted: int
    unclassified_failure: int
    critical_count: int
    healthy: bool

    @model_validator(mode="after")
    def validate_derived_fields(self) -> Self:
        expected_critical_count = (
            self.configuration_rejection
            + self.authorization_denial
            + self.integrity_inconsistency
            + self.retry_exhausted
            + self.unclassified_failure
        )
        if self.critical_count != expected_critical_count:
            raise ValueError("critical_count does not match terminal failure counts")
        if self.healthy != (expected_critical_count == 0):
            raise ValueError("healthy does not match critical_count")
        return self


_ACTIVE_STATUSES = {
    OutboundHubTransferJob.LocalStatus.MARKED,
    OutboundHubTransferJob.LocalStatus.QUEUED,
    OutboundHubTransferJob.LocalStatus.REGISTERING,
    OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA,
    OutboundHubTransferJob.LocalStatus.UPLOADING,
}


def build_hub_export_health_summary(
    *, max_retries: int | None = None
) -> HubExportHealthSummary:
    retry_limit = hub_export_max_retries() if max_retries is None else max_retries
    if retry_limit <= 0:
        raise ValueError("max_retries must be positive.")

    counts = {
        "active": 0,
        "completed": 0,
        "configuration_rejection": 0,
        "authorization_denial": 0,
        "integrity_inconsistency": 0,
        "transient_retry": 0,
        "retry_exhausted": 0,
        "unclassified_failure": 0,
    }
    jobs = OutboundHubTransferJob.objects.only(
        "local_status",
        "failure_class",
        "retry_count",
    )
    for job in jobs.iterator():
        if job.local_status in _ACTIVE_STATUSES:
            counts["active"] += 1
            continue
        if job.local_status == OutboundHubTransferJob.LocalStatus.COMPLETED:
            counts["completed"] += 1
            continue
        if job.local_status != OutboundHubTransferJob.LocalStatus.FAILED:
            counts["unclassified_failure"] += 1
            continue

        failure_class = str(job.failure_class or "")
        if failure_class == OutboundHubTransferJob.FailureClass.TRANSIENT_RETRY:
            bucket = (
                "retry_exhausted"
                if int(job.retry_count or 0) >= retry_limit
                else "transient_retry"
            )
            counts[bucket] += 1
        elif failure_class in {
            OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION,
            OutboundHubTransferJob.FailureClass.AUTHORIZATION_DENIAL,
            OutboundHubTransferJob.FailureClass.INTEGRITY_INCONSISTENCY,
        }:
            counts[failure_class] += 1
        else:
            counts["unclassified_failure"] += 1

    critical_count = sum(
        counts[field]
        for field in (
            "configuration_rejection",
            "authorization_denial",
            "integrity_inconsistency",
            "retry_exhausted",
            "unclassified_failure",
        )
    )
    return HubExportHealthSummary(
        total_jobs=jobs.count(),
        critical_count=critical_count,
        healthy=critical_count == 0,
        **counts,
    )
