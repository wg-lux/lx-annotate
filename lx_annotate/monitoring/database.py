from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterator

from django.apps import apps
from django.db import DatabaseError, connections
from django.db.backends.base.base import BaseDatabaseWrapper
from django.db.migrations.exceptions import InconsistentMigrationHistory
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from lx_annotate.migration_history_safety import (
    MigrationHistorySafetyError,
    check_migration_compatibility,
)

from .contracts import MonitoringCheck, MonitoringConfiguration


@contextmanager
def diagnostic_connection() -> Iterator[BaseDatabaseWrapper]:
    original = connections["default"]
    if original.vendor == "sqlite":
        # A copied in-memory SQLite connection is a different database.
        yield original
        return
    connection = original.copy()
    if connection.vendor == "postgresql":
        options = dict(connection.settings_dict.get("OPTIONS", {}))
        options["connect_timeout"] = 2
        options["options"] = (
            str(options.get("options", ""))
            + " -c statement_timeout=2000 -c default_transaction_read_only=on"
        )
        connection.settings_dict["OPTIONS"] = options
    try:
        yield connection
    finally:
        connection.close()


def check_connectivity(connection: BaseDatabaseWrapper) -> None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        if cursor.fetchone() != (1,):
            raise DatabaseError("Database probe did not return expected result")


def migration_check(connection: BaseDatabaseWrapper, now: datetime) -> MonitoringCheck:
    try:
        plans = check_migration_compatibility(connection)
        executor = MigrationExecutor(connection)
        loader = executor.loader
        loader.check_consistent_history(connection)
        recognized = set(loader.disk_migrations)
        for migration in loader.replacements.values():
            recognized.update(migration.replaces)
        unknown = set(loader.applied_migrations) - recognized
        if unknown or any(
            plan.status not in {"canonical", "empty", "current", "no_history"}
            and plan.additions
            for plan in plans
        ):
            return MonitoringCheck(
                key="database.migrations",
                status="error",
                summary="Recorded migrations are incompatible with installed packages.",
                observed_at=now,
                metadata={
                    "reason_code": "unknown_or_legacy_history",
                    "unknown_count": len(unknown),
                },
            )
        pending = executor.migration_plan(loader.graph.leaf_nodes())
        return MonitoringCheck(
            key="database.migrations",
            status="warning" if pending else "ok",
            summary="Unapplied migrations require attention."
            if pending
            else "Migration history is consistent and current.",
            observed_at=now,
            metadata={
                "reason_code": "unapplied" if pending else "current",
                "unapplied_count": len(pending),
            },
        )
    except (MigrationHistorySafetyError, InconsistentMigrationHistory):
        return MonitoringCheck(
            key="database.migrations",
            status="error",
            summary="Recorded migrations are incompatible with installed packages.",
            detail="Run check_migration_compatibility and review the installed release before migrating.",
            observed_at=now,
            metadata={"reason_code": "incompatible_history"},
        )


@dataclass(frozen=True)
class JobSource:
    key: str
    model_name: str
    pending: tuple[str, ...]
    processing: tuple[str, ...]
    failed: tuple[str, ...]
    lease_field: str | None = None


JOB_SOURCES = (
    JobSource(
        "ingestion",
        "UploadJob",
        ("pending", "retrying"),
        ("processing",),
        ("error", "lost"),
        "processing_lease_expires_at",
    ),
    JobSource(
        "hls",
        "VideoHlsArtifact",
        ("queued",),
        ("materializing", "validated"),
        ("failed",),
    ),
    JobSource(
        "video_processing",
        "VideoProcessingHistory",
        ("pending",),
        ("running",),
        ("failure",),
    ),
    JobSource(
        "report_import",
        "ReportImportAttempt",
        ("idle",),
        ("active",),
        ("failed", "lost"),
        "lease_expires_at",
    ),
)


def processing_check(
    connection: BaseDatabaseWrapper,
    source: JobSource,
    config: MonitoringConfiguration,
    now: datetime,
) -> MonitoringCheck:
    """Single aggregate query per existing ledger; no jobs or patient data leave it."""
    model = apps.get_model("endoreg_db", source.model_name)
    quote = connection.ops.quote_name
    table = quote(model._meta.db_table)
    status_column = quote(model._meta.get_field("status").column)
    created = quote(model._meta.get_field("created_at").column)
    updated = quote(model._meta.get_field("updated_at").column)
    parameters: list[str | datetime] = []

    def predicate(states: tuple[str, ...]) -> str:
        parameters.extend(states)
        return f"{status_column} IN ({','.join(['%s'] * len(states))})"

    expressions = [
        f"COUNT(CASE WHEN {predicate(states)} THEN 1 END)"
        for states in (source.pending, source.processing, source.failed)
    ]
    expressions.append(
        f"COUNT(CASE WHEN {predicate(source.failed)} AND {updated} >= %s THEN 1 END)"
    )
    parameters.append(now - timedelta(seconds=config.recent_failure_window_seconds))
    expressions.append(f"MIN(CASE WHEN {predicate(source.pending)} THEN {created} END)")
    if source.lease_field:
        lease = quote(model._meta.get_field(source.lease_field).column)
        expressions.append(
            f"COUNT(CASE WHEN {predicate(source.processing)} AND {lease} <= %s THEN 1 END)"
        )
        parameters.append(now)
    else:
        expressions.append("0")
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT {', '.join(expressions)} FROM {table}", parameters)
        row = cursor.fetchone()
    if row is None:
        raise DatabaseError("Missing aggregate result")
    pending, processing, failed, recent, oldest, expired = row
    if isinstance(oldest, str):
        oldest = parse_datetime(oldest)
    if isinstance(oldest, datetime) and timezone.is_naive(oldest):
        oldest = timezone.make_aware(oldest)
    age = (
        max(0, int((now - oldest).total_seconds()))
        if isinstance(oldest, datetime)
        else None
    )
    stalled = bool(expired) or (
        age is not None and age >= config.pending_warning_seconds
    )
    return MonitoringCheck(
        key=f"processing.{source.key}",
        status="warning" if failed or stalled else "ok",
        summary="Processing failures or delayed work require attention."
        if failed or stalled
        else "No processing failures or overdue pending work observed.",
        observed_at=now,
        metadata={
            "pending": int(pending),
            "processing": int(processing),
            "failed": int(failed),
            "recent_failure_count": int(recent),
            "recent_failure_window_seconds": config.recent_failure_window_seconds,
            "oldest_pending_at": oldest.isoformat()
            if isinstance(oldest, datetime)
            else None,
            "oldest_pending_age_seconds": age,
            "pending_warning_seconds": config.pending_warning_seconds,
            "expired_processing_leases": int(expired),
            "pending_overdue": age is not None
            and age >= config.pending_warning_seconds,
        },
    )
