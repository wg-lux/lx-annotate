from __future__ import annotations

import os
import subprocess
from datetime import datetime
from pathlib import Path

from .contracts import MonitoringCheck, MonitoringConfiguration, StorageLocation


def storage_check(
    location: StorageLocation, config: MonitoringConfiguration, now: datetime
) -> MonitoringCheck:
    """Permissions + statvfs only: no write probes or media directory enumeration."""
    exists = location.path.is_dir()
    readable = exists and os.access(
        location.path, os.R_OK | os.X_OK, effective_ids=True
    )
    writable = exists and os.access(
        location.path, os.W_OK | os.X_OK, effective_ids=True
    )
    metadata = {
        "exists": exists,
        "readable": readable,
        "writable": writable,
        "write_required": location.writable,
        "required": location.required,
        "warning_free_percent": config.disk_warning_free_percent,
        "error_free_percent": config.disk_error_free_percent,
        "write_check": "permissions_and_mount_flags",
    }
    status = "ok"
    summary = "Storage is accessible."
    if exists:
        usage = os.statvfs(location.path)
        writable = writable and not bool(usage.f_flag & os.ST_RDONLY)
        metadata["writable"] = writable
        free = usage.f_bavail * usage.f_frsize
        total = usage.f_blocks * usage.f_frsize
        percent = 100 * free / total if total else 0
        metadata.update(
            free_bytes=free, total_bytes=total, free_percent=round(percent, 2)
        )
        if percent <= config.disk_error_free_percent:
            status, summary = "error", "Disk free space is below the safety threshold."
        elif percent <= config.disk_warning_free_percent:
            status, summary = (
                "warning",
                "Disk free space is approaching the safety threshold.",
            )
    if not exists or not readable or (location.writable and not writable):
        status = "error" if location.required else "warning"
        summary = (
            "Required storage access is unavailable."
            if location.required
            else "Optional storage access is unavailable."
        )
    return MonitoringCheck(
        key=f"storage.{location.key}",
        status=status,
        summary=summary,
        observed_at=now,
        metadata=metadata,
    )


def read_systemd(
    executable: Path, units: list[str], timeout: int = 3
) -> dict[str, dict[str, str]]:
    result = subprocess.run(
        [
            str(executable),
            "--no-pager",
            "show",
            "--property=Id,LoadState,ActiveState,SubState,Result",
            "--",
            *units,
        ],
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
        env={"PATH": "/usr/bin:/bin", "LC_ALL": "C", "SYSTEMD_COLORS": "0"},
    )
    if result.returncode != 0 or len(result.stdout) > 65536:
        raise RuntimeError("Service observations unavailable")
    observations: dict[str, dict[str, str]] = {}
    for block in result.stdout.strip().split("\n\n"):
        fields = dict(line.split("=", 1) for line in block.splitlines() if "=" in line)
        if fields.get("Id") in units:
            observations[fields["Id"]] = fields
    return observations


def service_checks(
    config: MonitoringConfiguration, now: datetime
) -> list[MonitoringCheck]:
    if not config.services:
        return [
            MonitoringCheck(
                key="services.configuration",
                status="unknown",
                summary="Expected services have not been declared.",
                observed_at=now,
            )
        ]
    observed = (
        read_systemd(
            config.systemctl_path,
            [s.unit for s in config.services],
            config.systemctl_timeout_seconds,
        )
        if config.systemctl_path
        else {}
    )
    results: list[MonitoringCheck] = []
    for service in config.services:
        state = observed.get(service.unit)
        if state is None:
            status, summary = "unknown", "Service state could not be observed."
        elif (
            state.get("LoadState") == "loaded"
            and state.get("ActiveState") == "inactive"
            and not service.expected_active
        ):
            status, summary = "ok", "Service is available for on-demand activation."
        elif state.get("LoadState") != "loaded" or state.get("ActiveState") not in {
            "active",
            "reloading",
        }:
            status = "error" if service.required else "warning"
            summary = "Expected service is not running."
        else:
            status, summary = "ok", "Service is running."
        # Only fixed systemd state vocabulary reaches the API; never journal text.
        allowed = {
            "loaded",
            "not-found",
            "masked",
            "active",
            "inactive",
            "failed",
            "activating",
            "deactivating",
            "reloading",
            "running",
            "exited",
            "dead",
            "waiting",
            "listening",
            "success",
            "exit-code",
            "signal",
            "timeout",
            "watchdog",
            "start-limit-hit",
            "resources",
            "core-dump",
        }
        metadata = {
            key: value if value in allowed else "unknown"
            for key, value in (state or {}).items()
            if key in {"LoadState", "ActiveState", "SubState", "Result"}
        }
        metadata["unit"] = service.unit
        results.append(
            MonitoringCheck(
                key=f"services.{service.key}",
                status=status,
                summary=summary,
                observed_at=now,
                metadata={
                    **metadata,
                    "required": service.required,
                    "expected_active": service.expected_active,
                },
            )
        )
    return results
