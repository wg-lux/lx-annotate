from __future__ import annotations

import logging
import time
from datetime import datetime
from functools import lru_cache
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Callable

from django.apps import apps
from django.conf import settings
from django.db import DatabaseError
from django.utils import timezone
from packaging.version import Version
from pydantic import JsonValue

from lx_annotate.checks import runtime_configuration_messages

from .configuration import load_configuration
from .contracts import (
    MonitoringCheck,
    MonitoringConfiguration,
    MonitoringSnapshot,
    aggregate_status,
)
from .database import (
    JOB_SOURCES,
    check_connectivity,
    diagnostic_connection,
    migration_check,
    processing_check,
)
from .runtime import service_checks, storage_check

logger = logging.getLogger(__name__)


class NonPackagedResourceConfiguration(ValueError):
    """Active custom resources cannot be verified by the packaged resource API."""


def installed_version(distribution: str) -> str | None:
    try:
        return str(Version(version(distribution)))
    except (PackageNotFoundError, ValueError):
        return None


@lru_cache(maxsize=8)
def _verified_packaged_resources(
    registry: str, signature: tuple[int, int], package_version: str | None, bucket: int
) -> dict[str, JsonValue]:
    del signature, package_version, bucket
    from lx_dtypes.knowledge_base_registry import ProviderSource, read_registry
    from lx_dtypes.knowledge_bases import (
        BUILTIN_KNOWLEDGE_BASE_PROVIDER,
        get_packaged_knowledge_base,
        list_packaged_knowledge_bases,
    )

    if registry:
        payload = read_registry(Path(registry))
        if payload.active is None:
            raise ValueError("Active resource identity absent")
        entry = payload.modules[payload.active.module_name][payload.active.version]
        if not entry.sources or any(
            not isinstance(item, ProviderSource)
            or item.provider != BUILTIN_KNOWLEDGE_BASE_PROVIDER
            for item in entry.sources
        ):
            raise NonPackagedResourceConfiguration()
        descriptors = [
            get_packaged_knowledge_base(
                payload.active.module_name, payload.active.version
            )
        ]
        # Verify the active provider digest as well as the installed bundle.
        for item in entry.sources:
            if (
                isinstance(item, ProviderSource)
                and item.content_sha256 != descriptors[0].content_sha256
            ):
                raise ValueError("Active resource identity mismatch")
    else:
        descriptors = [item for item in list_packaged_knowledge_bases() if item.default]
    if not descriptors:
        raise ValueError("No packaged default resource")
    identities: list[JsonValue] = []
    for descriptor in descriptors:
        descriptor.verified_resource_directory()
        identities.append(
            {
                "module_name": descriptor.module_name,
                "version": descriptor.version,
                "default": descriptor.default,
            }
        )
    return {
        "resources": identities,
        "selection": "active_registry" if registry else "packaged_defaults",
        "verification_cache_max_seconds": 300,
    }


def knowledge_base_check(now: datetime) -> MonitoringCheck:
    registry = str(getattr(settings, "LX_DTYPES_KB_REGISTRY", "") or "").strip()
    stat = Path(registry).stat() if registry else None
    try:
        metadata = _verified_packaged_resources(
            registry,
            (stat.st_mtime_ns, stat.st_size) if stat else (0, 0),
            installed_version("lx-dtypes"),
            int(time.monotonic() // 300),
        )
    except NonPackagedResourceConfiguration:
        return MonitoringCheck(
            key="resources.knowledge_base",
            status="unknown",
            summary="Active custom resources require deployment-specific verification.",
            detail="This check verifies packaged providers; it does not download or load custom filesystem resources.",
            observed_at=now,
            metadata={"reason_code": "non_packaged_sources"},
        )
    return MonitoringCheck(
        key="resources.knowledge_base",
        status="ok",
        summary="Packaged knowledge-base and terminology resources resolve and pass integrity verification.",
        observed_at=now,
        metadata=metadata,
    )


def configuration_check(now: datetime) -> MonitoringCheck:
    messages = runtime_configuration_messages()
    errors = sum(message.level >= 40 for message in messages)
    return MonitoringCheck(
        key="application.configuration",
        status="error" if errors else "warning" if messages else "ok",
        summary="Runtime configuration requires attention."
        if messages
        else "Required runtime configuration resolves.",
        detail="Run the deployment runtime checks for protected operator diagnostics."
        if messages
        else None,
        observed_at=now,
        metadata={
            "error_count": errors,
            "warning_count": len(messages) - errors,
            "check_codes": [str(message.id) for message in messages],
        },
    )


def _guard(
    key: str,
    now: datetime,
    run: Callable[[], MonitoringCheck],
    *,
    required: bool = True,
) -> MonitoringCheck:
    try:
        return run()
    except Exception as exc:
        # Exception text, repr and traceback can contain credentials or clinical paths.
        # Debug-only structured context avoids warning/error spam on refresh.
        reason = next(
            (
                code
                for kind, code in (
                    (DatabaseError, "database_query_failed"),
                    (TimeoutError, "probe_timed_out"),
                    (OSError, "filesystem_access_failed"),
                    (ImportError, "runtime_dependency_unavailable"),
                    (ValueError, "resource_or_configuration_invalid"),
                )
                if isinstance(exc, kind)
            ),
            "probe_failed",
        )
        logger.debug(
            "monitoring.check_failed",
            extra={
                "check_key": key,
                "subsystem": key.split(".")[0],
                "reason_code": reason,
            },
        )
        return MonitoringCheck(
            key=key,
            status="error" if required else "unknown",
            summary="The check could not complete.",
            detail="Inspect protected runtime logs for this subsystem.",
            observed_at=now,
            metadata={"reason_code": reason},
        )


def build_monitoring_snapshot() -> MonitoringSnapshot:
    now = timezone.now()
    app_version = installed_version("lx-annotate")
    checks = [
        MonitoringCheck(
            key="application.startup",
            status="ok" if apps.ready else "error",
            summary="Django application registry is ready."
            if apps.ready
            else "Django startup is incomplete.",
            observed_at=now,
        ),
        MonitoringCheck(
            key="application.version",
            status="ok" if app_version else "unknown",
            summary="Installed application version is identifiable."
            if app_version
            else "Installed application version is unavailable.",
            observed_at=now,
            metadata={
                "version": app_version,
                "django_version": installed_version("Django"),
                "endoreg_db_version": installed_version("endoreg-db"),
                "lx_dtypes_version": installed_version("lx-dtypes"),
            },
        ),
    ]
    try:
        config, declared = load_configuration()
    except Exception:
        config, declared = MonitoringConfiguration(), False
        checks.append(
            MonitoringCheck(
                key="monitoring.configuration",
                status="error",
                summary="Monitoring configuration is invalid or unreadable.",
                observed_at=now,
            )
        )
    else:
        checks.append(
            MonitoringCheck(
                key="monitoring.configuration",
                status="ok" if declared else "unknown",
                summary="Deployment monitoring expectations are declared."
                if declared
                else "Deployment service expectations have not been declared; application storage defaults are used.",
                observed_at=now,
            )
        )
    checks.append(
        MonitoringCheck(
            key="application.revision",
            status="ok" if config.deployment_revision else "unknown",
            summary="Deployment revision is declared."
            if config.deployment_revision
            else "Deployment revision is unavailable.",
            observed_at=now,
            metadata={"revision": config.deployment_revision},
        )
    )
    checks.append(
        _guard("application.configuration", now, lambda: configuration_check(now))
    )
    checks.append(
        _guard("resources.knowledge_base", now, lambda: knowledge_base_check(now))
    )
    for location in config.storage:
        checks.append(
            _guard(
                f"storage.{location.key}",
                now,
                lambda location=location: storage_check(location, config, now),
                required=location.required,
            )
        )
    database_checks: list[MonitoringCheck] = []
    try:
        with diagnostic_connection() as connection:
            check_connectivity(connection)
            database_checks.append(
                MonitoringCheck(
                    key="database.connectivity",
                    status="ok",
                    summary="Database query succeeded.",
                    observed_at=now,
                )
            )
            database_checks.append(
                _guard(
                    "database.migrations", now, lambda: migration_check(connection, now)
                )
            )
            for source in JOB_SOURCES:
                database_checks.append(
                    _guard(
                        f"processing.{source.key}",
                        now,
                        lambda source=source: processing_check(
                            connection, source, config, now
                        ),
                    )
                )
    except Exception:
        database_checks = []
        database_checks.append(
            MonitoringCheck(
                key="database.connectivity",
                status="error",
                summary="Database is unreachable or cannot execute queries.",
                observed_at=now,
                metadata={"reason_code": "database_unavailable"},
            )
        )
        database_checks.append(
            MonitoringCheck(
                key="database.migrations",
                status="unknown",
                summary="Migration state cannot be inspected while the database is unavailable.",
                observed_at=now,
            )
        )
        database_checks.extend(
            MonitoringCheck(
                key=f"processing.{source.key}",
                status="unknown",
                summary="Processing state cannot be inspected while the database is unavailable.",
                observed_at=now,
            )
            for source in JOB_SOURCES
        )
    checks.extend(database_checks)
    try:
        checks.extend(service_checks(config, now))
    except Exception:
        checks.extend(
            MonitoringCheck(
                key=f"services.{service.key}",
                status="unknown",
                summary="Service state could not be observed within the read-only privilege boundary.",
                observed_at=now,
            )
            for service in config.services
        )
    return MonitoringSnapshot(
        status=aggregate_status(checks),
        observed_at=now,
        version=app_version,
        checks=checks,
    )
