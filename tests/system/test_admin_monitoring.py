from __future__ import annotations

from contextlib import nullcontext
from datetime import timedelta
from io import StringIO
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import OperationalError, connection
from django.utils import timezone
from pydantic import ValidationError

from lx_annotate.migration_history_safety import MigrationHistorySafetyError
from lx_annotate.monitoring import database, runtime, service
from lx_annotate.monitoring.configuration import load_configuration
from lx_annotate.monitoring.contracts import (
    MonitoringCheck,
    MonitoringConfiguration,
    MonitoringSnapshot,
    ServiceExpectation,
    StorageLocation,
    aggregate_status,
)


def check(key="test", status="ok"):
    return MonitoringCheck(
        key=key, status=status, summary="Test observation", observed_at=timezone.now()
    )


@pytest.fixture
def healthy(monkeypatch, tmp_path):
    config = MonitoringConfiguration(
        deployment_revision="a" * 40,
        storage=[StorageLocation(key="media", path=tmp_path)],
        services=[ServiceExpectation(key="web", unit="lx-annotate.service")],
        systemctl_path="/nix/store/test-systemd/bin/systemctl",
    )
    monkeypatch.setattr(service, "load_configuration", lambda: (config, True))
    monkeypatch.setattr(service, "installed_version", lambda _: "1.2.3")
    monkeypatch.setattr(service, "runtime_configuration_messages", lambda: [])
    monkeypatch.setattr(
        service, "knowledge_base_check", lambda now: check("resources.knowledge_base")
    )
    monkeypatch.setattr(
        service, "diagnostic_connection", lambda: nullcontext(MagicMock())
    )
    monkeypatch.setattr(service, "check_connectivity", lambda _: None)
    monkeypatch.setattr(
        service, "migration_check", lambda *_: check("database.migrations")
    )
    monkeypatch.setattr(
        service,
        "processing_check",
        lambda conn, source, config, now: check(f"processing.{source.key}"),
    )
    monkeypatch.setattr(
        runtime,
        "read_systemd",
        lambda *_: {
            "lx-annotate.service": {
                "LoadState": "loaded",
                "ActiveState": "active",
                "SubState": "running",
                "Result": "success",
            }
        },
    )
    monkeypatch.setattr(
        runtime.os,
        "statvfs",
        lambda _: SimpleNamespace(f_flag=0, f_bavail=50, f_frsize=1024, f_blocks=100),
    )
    return config


def test_healthy_snapshot(healthy):
    snapshot = service.build_monitoring_snapshot()
    assert snapshot.status == "ok"
    assert snapshot.version == "1.2.3"
    assert (
        MonitoringSnapshot.model_validate_json(snapshot.model_dump_json()) == snapshot
    )
    assert len(snapshot.checks) == 14


@pytest.mark.parametrize(
    "states,expected",
    [
        (["ok"], "ok"),
        (["unknown"], "warning"),
        (["warning", "ok"], "warning"),
        (["warning", "error"], "error"),
        ([], "warning"),
    ],
)
def test_aggregation(states, expected):
    assert (
        aggregate_status([check(f"check{i}", state) for i, state in enumerate(states)])
        == expected
    )


@pytest.mark.parametrize(
    "active,load,expected",
    [
        ("inactive", "loaded", "ok"),
        ("active", "loaded", "ok"),
        ("failed", "loaded", "error"),
        ("inactive", "not-found", "error"),
    ],
)
def test_on_demand_services_distinguish_idle_from_failure(
    monkeypatch, active, load, expected
):
    config = MonitoringConfiguration(
        systemctl_path="/nix/store/systemd/bin/systemctl",
        services=[
            ServiceExpectation(
                key="worker", unit="worker.service", expected_active=False
            )
        ],
    )
    monkeypatch.setattr(
        runtime,
        "read_systemd",
        lambda *_: {
            "worker.service": {
                "LoadState": load,
                "ActiveState": active,
                "Result": "success",
            }
        },
    )
    result = runtime.service_checks(config, timezone.now())[0]
    assert result.status == expected
    assert result.metadata["expected_active"] is False


def test_maximum_storage_alias_fits_check_contract(tmp_path, monkeypatch):
    monkeypatch.setattr(
        runtime.os,
        "statvfs",
        lambda _: SimpleNamespace(f_flag=0, f_bavail=50, f_frsize=1024, f_blocks=100),
    )
    result = runtime.storage_check(
        StorageLocation(key="a" * 64, path=tmp_path),
        MonitoringConfiguration(),
        timezone.now(),
    )
    assert result.key == "storage." + "a" * 64


def test_database_failure_is_distinct_and_sanitized(healthy, monkeypatch):
    def unavailable(_):
        raise OperationalError("password=top-secret host=/clinical/patient-name")

    monkeypatch.setattr(service, "check_connectivity", unavailable)
    snapshot = service.build_monitoring_snapshot()
    statuses = {c.key: c.status for c in snapshot.checks}
    assert statuses["database.connectivity"] == "error"
    assert statuses["database.migrations"] == "unknown"
    assert statuses["processing.ingestion"] == "unknown"
    assert snapshot.status == "error"
    assert "top-secret" not in snapshot.model_dump_json()
    assert "/clinical" not in snapshot.model_dump_json()


def test_probe_logging_uses_structured_reason_without_exception_text(caplog):
    import logging

    def unavailable():
        raise FileNotFoundError("/private/patient secret-token")

    with caplog.at_level(logging.DEBUG, logger=service.__name__):
        result = service._guard("storage.media", timezone.now(), unavailable)
    record = caplog.records[-1]
    assert record.check_key == "storage.media"
    assert record.subsystem == "storage"
    assert record.reason_code == "filesystem_access_failed"
    assert "secret-token" not in caplog.text + result.model_dump_json()
    assert record.levelno == logging.DEBUG


def test_connection_cleanup_failure_does_not_duplicate_checks(healthy, monkeypatch):
    from contextlib import contextmanager

    @contextmanager
    def connection_with_failed_cleanup():
        yield MagicMock()
        raise OperationalError("private connection detail")

    monkeypatch.setattr(
        service, "diagnostic_connection", connection_with_failed_cleanup
    )
    snapshot = service.build_monitoring_snapshot()
    assert snapshot.status == "error"
    assert len({item.key for item in snapshot.checks}) == len(snapshot.checks)


def test_packaged_resources_use_public_integrity_api(settings, monkeypatch):
    import lx_dtypes.knowledge_bases as resources

    settings.LX_DTYPES_KB_REGISTRY = ""
    descriptor = SimpleNamespace(
        module_name="star_upper_gi",
        version="1.0.0",
        default=True,
        verified_resource_directory=MagicMock(),
    )
    monkeypatch.setattr(
        resources, "list_packaged_knowledge_bases", lambda: [descriptor]
    )
    service._verified_packaged_resources.cache_clear()
    try:
        result = service.knowledge_base_check(timezone.now())
        assert result.status == "ok"
        descriptor.verified_resource_directory.assert_called_once_with()
        assert result.metadata["selection"] == "packaged_defaults"
    finally:
        service._verified_packaged_resources.cache_clear()


def test_custom_resource_configuration_is_not_reported_as_packaged_healthy(
    settings, monkeypatch, tmp_path
):
    import lx_dtypes.knowledge_base_registry as registry

    registry_file = tmp_path / "registry.json"
    registry_file.write_text("{}")
    settings.LX_DTYPES_KB_REGISTRY = str(registry_file)
    payload = registry.RegistryPayload.model_validate(
        {
            "active": {"module_name": "custom", "version": "1.0"},
            "modules": {"custom": {"1.0": {"input_dirs": ["/private/patient"]}}},
        }
    )
    monkeypatch.setattr(registry, "read_registry", lambda _: payload)
    service._verified_packaged_resources.cache_clear()
    result = service.knowledge_base_check(timezone.now())
    assert result.status == "unknown"
    assert "/private" not in result.model_dump_json()


def test_postgres_diagnostics_have_isolated_read_only_timeout_options(monkeypatch):
    original = MagicMock(vendor="postgresql")
    original.settings_dict = {"OPTIONS": {"options": "-c timezone=UTC"}}
    isolated = MagicMock(vendor="postgresql")
    isolated.settings_dict = {"OPTIONS": dict(original.settings_dict["OPTIONS"])}
    original.copy.return_value = isolated
    monkeypatch.setattr(database, "connections", {"default": original})
    with database.diagnostic_connection() as observed:
        assert observed is isolated
        assert observed.settings_dict["OPTIONS"]["connect_timeout"] == 2
        assert (
            "default_transaction_read_only=on"
            in observed.settings_dict["OPTIONS"]["options"]
        )
        assert "statement_timeout=2000" in observed.settings_dict["OPTIONS"]["options"]
    assert original.settings_dict["OPTIONS"] == {"options": "-c timezone=UTC"}
    isolated.close.assert_called_once_with()


def test_incompatible_migrations_reuse_safety_mechanism(monkeypatch):
    def incompatible(_):
        raise MigrationHistorySafetyError("private migration path /clinical/patient")

    monkeypatch.setattr(database, "check_migration_compatibility", incompatible)
    result = database.migration_check(MagicMock(), timezone.now())
    assert result.status == "error"
    assert result.metadata["reason_code"] == "incompatible_history"
    assert "/clinical" not in result.model_dump_json()


@pytest.mark.parametrize(
    "pending,unknown,status,reason",
    [
        ([], set(), "ok", "current"),
        ([("migrate", False)], set(), "warning", "unapplied"),
        ([], {("foreign", "9999")}, "error", "unknown_or_legacy_history"),
    ],
)
def test_migration_states(monkeypatch, pending, unknown, status, reason):
    executor = MagicMock()
    executor.loader.disk_migrations = {("app", "0001"): object()}
    executor.loader.applied_migrations = {("app", "0001"), *unknown}
    executor.loader.replacements = {}
    executor.migration_plan.return_value = pending
    monkeypatch.setattr(database, "MigrationExecutor", lambda _: executor)
    monkeypatch.setattr(database, "check_migration_compatibility", lambda _: ())
    result = database.migration_check(MagicMock(), timezone.now())
    assert result.status == status
    assert result.metadata["reason_code"] == reason
    executor.loader.check_consistent_history.assert_called_once()


def test_missing_storage_and_private_path(healthy, tmp_path):
    result = runtime.storage_check(
        StorageLocation(key="required", path=tmp_path / "patient-sensitive"),
        healthy,
        timezone.now(),
    )
    assert result.status == "error"
    assert not result.metadata["exists"]
    assert "patient-sensitive" not in result.model_dump_json()
    assert str(tmp_path) not in result.model_dump_json()


@pytest.mark.parametrize(
    "free,status", [(12, "ok"), (10, "warning"), (5, "error"), (0, "error")]
)
def test_disk_thresholds(healthy, monkeypatch, free, status):
    monkeypatch.setattr(
        runtime.os,
        "statvfs",
        lambda _: SimpleNamespace(f_flag=0, f_bavail=free, f_frsize=1024, f_blocks=100),
    )
    assert (
        runtime.storage_check(healthy.storage[0], healthy, timezone.now()).status
        == status
    )


def test_read_only_mount_rejects_required_writes(healthy, monkeypatch):
    monkeypatch.setattr(
        runtime.os,
        "statvfs",
        lambda _: SimpleNamespace(
            f_flag=runtime.os.ST_RDONLY, f_bavail=90, f_frsize=1024, f_blocks=100
        ),
    )
    result = runtime.storage_check(healthy.storage[0], healthy, timezone.now())
    assert result.status == "error"
    assert not result.metadata["writable"]


def test_kb_failure_does_not_expose_exception(healthy, monkeypatch):
    def broken(_):
        raise RuntimeError("secret-token /site-packages/private/patient")

    monkeypatch.setattr(service, "knowledge_base_check", broken)
    snapshot = service.build_monitoring_snapshot()
    assert snapshot.status == "error"
    assert "secret-token" not in snapshot.model_dump_json()
    assert "site-packages" not in snapshot.model_dump_json()


@pytest.mark.parametrize("required,expected", [(True, "error"), (False, "warning")])
def test_service_unavailable(healthy, monkeypatch, required, expected):
    config = healthy.model_copy(
        update={
            "services": [
                ServiceExpectation(
                    key="web", unit="lx-annotate.service", required=required
                )
            ]
        }
    )
    monkeypatch.setattr(
        runtime,
        "read_systemd",
        lambda *_: {
            "lx-annotate.service": {
                "LoadState": "loaded",
                "ActiveState": "failed",
                "Result": "exit-code",
            }
        },
    )
    assert runtime.service_checks(config, timezone.now())[0].status == expected


def test_systemd_timeout_is_unknown_not_healthy(healthy, monkeypatch):
    def unavailable(*_):
        raise TimeoutError("secret /path")

    monkeypatch.setattr(runtime, "read_systemd", unavailable)
    result = service.build_monitoring_snapshot()
    assert result.status == "warning"
    assert next(c for c in result.checks if c.key == "services.web").status == "unknown"


def test_no_shell_and_bounded_systemd_command(monkeypatch):
    run = MagicMock(
        return_value=SimpleNamespace(
            returncode=0,
            stdout="Id=lx-annotate.service\nLoadState=loaded\nActiveState=active\n",
        )
    )
    monkeypatch.setattr(runtime.subprocess, "run", run)
    runtime.read_systemd(
        runtime.Path("/nix/store/systemd/bin/systemctl"), ["lx-annotate.service"]
    )
    assert run.call_args.kwargs["timeout"] == 3
    assert not run.call_args.kwargs.get("shell", False)
    assert run.call_args.args[0][-2:] == ["--", "lx-annotate.service"]


def test_config_invalid_and_arbitrary_units_rejected(settings, tmp_path):
    config_file = tmp_path / "monitoring.json"
    config_file.write_text(
        '{"services":[{"key":"web","unit":"--system; touch /private"}]}'
    )
    settings.LX_ANNOTATE_MONITORING_CONFIG_FILE = str(config_file)
    with pytest.raises(ValidationError):
        load_configuration()
    with pytest.raises(ValidationError):
        MonitoringConfiguration(
            disk_error_free_percent=20, disk_warning_free_percent=10
        )


@pytest.mark.django_db
def test_processing_aggregates_are_read_only_and_private():
    from endoreg_db.models.hub.upload_job import UploadJob

    pending = UploadJob.objects.create(
        file="synthetic-patient-filename.mp4", status="pending"
    )
    UploadJob.objects.filter(pk=pending.pk).update(
        created_at=timezone.now() - timedelta(hours=3)
    )
    UploadJob.objects.create(
        file="synthetic-failed.mp4",
        status="error",
        error_code="processing_failed",
        error_detail="secret error text",
    )
    active = UploadJob.objects.create(
        file="synthetic-active.mp4",
        status="processing",
        processing_lease_owner="worker",
        processing_heartbeat_at=timezone.now() - timedelta(minutes=2),
        processing_lease_expires_at=timezone.now() - timedelta(minutes=1),
    )

    def reads_only(execute, sql, params, many, context):
        assert sql.lstrip().upper().startswith("SELECT")
        return execute(sql, params, many, context)

    with connection.execute_wrapper(reads_only):
        result = database.processing_check(
            connection,
            database.JOB_SOURCES[0],
            MonitoringConfiguration(),
            timezone.now(),
        )
    assert result.status == "warning"
    assert result.metadata["pending"] == 1
    assert result.metadata["recent_failure_count"] == 1
    assert result.metadata["expired_processing_leases"] == 1
    assert result.metadata["pending_overdue"]
    assert "synthetic" not in result.model_dump_json()
    assert str(active.pk) not in result.model_dump_json()
    assert "secret error" not in result.model_dump_json()


@pytest.mark.parametrize("status,exit_code", [("ok", 0), ("warning", 1), ("error", 2)])
def test_command_uses_canonical_snapshot(monkeypatch, status, exit_code):
    from lx_annotate.management.commands import monitoring_status

    snapshot = MonitoringSnapshot(
        status=status,
        version="1.2.3",
        observed_at=timezone.now(),
        checks=[check(status=status)],
    )
    monkeypatch.setattr(
        monitoring_status, "build_monitoring_snapshot", lambda: snapshot
    )
    output = StringIO()
    if exit_code:
        with pytest.raises(CommandError) as error:
            call_command("monitoring_status", stdout=output)
        assert error.value.returncode == exit_code
    else:
        call_command("monitoring_status", stdout=output)
    assert MonitoringSnapshot.model_validate_json(output.getvalue()) == snapshot
