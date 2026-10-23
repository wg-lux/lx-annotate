from __future__ import annotations

import json
from io import StringIO
from pathlib import Path

import pytest
from django.core.management.base import CommandError


def test_hub_node_spec_accepts_deployment_json_aliases(tmp_path: Path) -> None:
    from lx_annotate.hub.node_provisioning import HubNodeSpec

    secret_path = tmp_path / "node-secret"
    spec = HubNodeSpec.model_validate(
        {
            "nodeKey": "site-01",
            "displayName": "Site 01",
            "role": "site_node",
            "baseUrl": "https://site-01.example",
            "centerKey": "site-01",
            "sharedSecretFile": str(secret_path),
        },
    )

    assert spec.node_key == "site-01"
    assert spec.display_name == "Site 01"
    assert spec.shared_secret_file == secret_path


def test_runtime_acceptance_validates_manifest_target(tmp_path: Path) -> None:
    from lx_annotate.management.commands.runtime_acceptance import (
        validate_static_assets,
    )

    static_root = tmp_path / "staticfiles"
    manifest = static_root / ".vite" / "manifest.json"
    asset = static_root / "assets" / "main.js"
    manifest.parent.mkdir(parents=True)
    asset.parent.mkdir(parents=True)
    asset.write_text("console.log('ok')", encoding="utf-8")
    manifest.write_text(
        json.dumps({"src/main.ts": {"file": "assets/main.js", "isEntry": True}}),
        encoding="utf-8",
    )

    validate_static_assets(static_root)
    asset.unlink()
    with pytest.raises(CommandError, match="static asset validation failed"):
        validate_static_assets(static_root)


def test_recovery_state_reader_uses_last_matching_value(tmp_path: Path) -> None:
    from lx_annotate.services.runtime_recovery import state_value

    state = tmp_path / "state.env"
    state.write_text(
        "LAST_EFFECTIVE_DATA_DIR=/old\nLAST_EFFECTIVE_DATA_DIR=/current\n",
        encoding="utf-8",
    )

    assert state_value(state, "LAST_EFFECTIVE_DATA_DIR") == "/current"


@pytest.mark.parametrize("compatible", [True, False])
def test_recovery_checks_history_before_migrations_or_payload_changes(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    compatible: bool,
) -> None:
    from endoreg_db.utils.paths import EndoregPathsModel

    from lx_annotate.services import runtime_recovery

    target = tmp_path / "target"
    source = tmp_path / "source"
    source.mkdir()
    state_file = tmp_path / "state.env"
    events: list[str] = []

    def command(name: str, **kwargs: object) -> None:
        events.append(name)
        if name == "check_migration_compatibility" and not compatible:
            raise CommandError("incompatible migration history")
        if name == "migrate":
            assert kwargs == {"interactive": False}

    service = runtime_recovery.RuntimeRecoveryService(lambda _: None)
    monkeypatch.setattr(runtime_recovery, "call_command", command)
    monkeypatch.setattr(
        runtime_recovery,
        "get_runtime_paths",
        lambda: EndoregPathsModel.from_root(target),
    )
    monkeypatch.setattr(
        service,
        "_copy_missing_overlay",
        lambda **_: events.append("copy_overlay"),
    )

    def mark_eligible() -> int:
        events.append("mark_quarantined_eligible")
        return 0

    monkeypatch.setattr(
        service, "_mark_quarantined_upload_jobs_eligible", mark_eligible
    )
    options = dict(
        target=target,
        state_file=state_file,
        sources=[source],
        force=False,
        force_repair=False,
        skip_repair=True,
    )
    if compatible:
        service.run(**options)
        assert events == [
            "check_migration_compatibility",
            "migrate",
            "copy_overlay",
            "migrate_media_storage",
            "migration_mark_eligible",
            "mark_quarantined_eligible",
            "reap_upload_job_sources",
        ]
        assert runtime_recovery.state_value(
            state_file, "LAST_EFFECTIVE_DATA_DIR"
        ) == str(target)
        assert runtime_recovery.state_value(
            target / "logs/data_recovery_complete", "completed_at"
        )
    else:
        with pytest.raises(CommandError, match="incompatible migration history"):
            service.run(**options)
        assert events == ["check_migration_compatibility"]
        assert not state_file.exists()
        assert not (target / "logs/data_recovery_complete").exists()


def test_provision_command_emits_standard_event(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from django.core.management import call_command

    from lx_annotate.management.commands import provision_hub_nodes as command_module

    config = tmp_path / "nodes.json"
    config.write_text("[]", encoding="utf-8")
    monkeypatch.setattr(
        command_module,
        "provision_hub_nodes",
        lambda specs, *, require_existing_centers: [
            {
                "event": "hub.node_provisioned",
                "status": "ok",
                "node_key": "site-01",
                "role": "site_node",
                "created": True,
                "secret_changed": False,
            },
        ],
    )
    stdout = StringIO()

    call_command("provision_hub_nodes", "--config", str(config), stdout=stdout)

    assert json.loads(stdout.getvalue()) == {
        "created": True,
        "event": "hub.node_provisioned",
        "node_key": "site-01",
        "role": "site_node",
        "secret_changed": False,
        "status": "ok",
    }


def test_provision_command_translates_invalid_input_to_command_error(
    tmp_path: Path,
) -> None:
    from django.core.management import call_command

    config = tmp_path / "nodes.json"
    config.write_text("not-json", encoding="utf-8")

    with pytest.raises(CommandError):
        call_command("provision_hub_nodes", "--config", str(config))


def test_recovery_command_normalizes_paths_and_prefers_cli_target(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from django.core.management import call_command

    from lx_annotate.management.commands import recover_runtime_data as command_module

    observed: list[dict[str, object]] = []

    class RecoveryServiceStub:
        def __init__(self, emit: object) -> None:
            _ = emit

        def run(self, **kwargs: object) -> None:
            observed.append(kwargs)

    monkeypatch.setattr(command_module, "RuntimeRecoveryService", RecoveryServiceStub)
    monkeypatch.setenv(
        "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
        str(tmp_path / "environment-target"),
    )
    target = tmp_path / "cli-target"
    state_file = tmp_path / "state" / "recovery.env"
    sources = [tmp_path / "source-a", tmp_path / "source-b"]

    call_command(
        "recover_runtime_data",
        "--target",
        str(target),
        "--state-file",
        str(state_file),
        "--source",
        str(sources[0]),
        "--source",
        str(sources[1]),
        "--skip-repair",
    )

    assert observed == [
        {
            "target": target.resolve(),
            "state_file": state_file.resolve(),
            "sources": [source.resolve() for source in sources],
            "force": False,
            "force_repair": False,
            "skip_repair": True,
        },
    ]


def test_recovery_command_rejects_conflicting_repair_modes(tmp_path: Path) -> None:
    from django.core.management import call_command

    with pytest.raises(CommandError, match="not allowed with argument"):
        call_command(
            "recover_runtime_data",
            "--target",
            str(tmp_path / "target"),
            "--state-file",
            str(tmp_path / "state.env"),
            "--force-repair",
            "--skip-repair",
        )


def test_recovery_command_rejects_invalid_environment_boolean(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from django.core.management import call_command

    monkeypatch.setenv("LX_ANNOTATE_FORCE_DATA_RECOVERY", "sometimes")

    with pytest.raises(CommandError, match="must be 'true' or 'false'"):
        call_command(
            "recover_runtime_data",
            "--target",
            str(tmp_path / "target"),
            "--state-file",
            str(tmp_path / "state.env"),
        )


def test_recovery_skip_repair_overrides_force_repair_environment(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from django.core.management import call_command

    from lx_annotate.management.commands import recover_runtime_data as command_module

    observed: list[dict[str, object]] = []

    class RecoveryServiceStub:
        def __init__(self, emit: object) -> None:
            _ = emit

        def run(self, **kwargs: object) -> None:
            observed.append(kwargs)

    monkeypatch.setattr(command_module, "RuntimeRecoveryService", RecoveryServiceStub)
    monkeypatch.setenv("LX_ANNOTATE_FORCE_MANAGED_PAYLOAD_REPAIR", "true")

    call_command(
        "recover_runtime_data",
        "--target",
        str(tmp_path / "target"),
        "--state-file",
        str(tmp_path / "state.env"),
        "--skip-repair",
    )

    assert observed[0]["force_repair"] is False
    assert observed[0]["skip_repair"] is True


def test_acceptance_command_prefers_cli_static_root_and_emits_json(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from django.core.management import call_command as django_call_command

    from lx_annotate.management.commands import runtime_acceptance as command_module

    nested_commands: list[tuple[str, dict[str, object]]] = []
    validated_roots: list[Path] = []
    monkeypatch.setattr(
        command_module,
        "call_command",
        lambda name, **kwargs: nested_commands.append((name, kwargs)),
    )
    monkeypatch.setattr(
        command_module,
        "validate_static_assets",
        validated_roots.append,
    )
    monkeypatch.setenv("DJANGO_STATIC_ROOT", str(tmp_path / "environment-static"))
    static_root = tmp_path / "cli-static"
    stdout = StringIO()

    django_call_command(
        "runtime_acceptance",
        "--skip-storage",
        "--skip-hls",
        "--static-root",
        str(static_root),
        stdout=stdout,
    )

    assert nested_commands == [("check", {"fail_level": "CRITICAL"})]
    assert validated_roots == [static_root.resolve()]
    assert json.loads(stdout.getvalue()) == {
        "event": "lx_annotate.runtime_acceptance",
        "status": "ok",
    }


def test_runtime_recovery_skip_messages_are_structured(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from lx_annotate.services.runtime_recovery import RuntimeRecoveryService

    target = tmp_path / "target"
    log_dir = target / "logs"
    log_dir.mkdir(parents=True)
    state_file = tmp_path / "state.env"
    state_file.write_text(f"LAST_EFFECTIVE_DATA_DIR={target}\n", encoding="utf-8")
    (log_dir / "data_recovery_complete").write_text(
        "completed_at=2026-08-03T00:00:00+00:00\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY", raising=False)
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY_FILE", raising=False)
    emitted: list[str] = []

    from endoreg_db.utils.paths import EndoregPathsModel

    monkeypatch.setattr(
        "lx_annotate.services.runtime_recovery.get_runtime_paths",
        lambda: EndoregPathsModel.from_root(target),
    )
    monkeypatch.setattr(
        "lx_annotate.services.runtime_recovery.call_command",
        lambda *_, **__: None,
    )

    RuntimeRecoveryService(emitted.append).run(
        target=target,
        state_file=state_file,
        sources=[],
        force=False,
        force_repair=False,
        skip_repair=False,
    )

    assert [json.loads(item) for item in emitted] == [
        {
            "event": "lx_annotate.runtime_recovery",
            "reason": "recovery_already_current",
            "status": "skipped",
            "target": str(target),
        },
        {
            "event": "lx_annotate.managed_payload_repair",
            "reason": "no_master_key_configured",
            "status": "skipped",
            "target": str(target),
        },
    ]


@pytest.mark.parametrize("force", [False, True])
def test_recovery_reuses_resolved_markers_but_forced_recovery_repeats_repair(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    force: bool,
) -> None:
    from endoreg_db.utils.paths import EndoregPathsModel

    from lx_annotate.services import runtime_recovery

    target = tmp_path / "target"
    logs = target / "logs"
    logs.mkdir(parents=True)
    state_file = tmp_path / "state.env"
    state_file.write_text(f"LAST_EFFECTIVE_DATA_DIR={target}/../target\n")
    (logs / "data_recovery_complete").write_text("completed_at=previous\n")
    marker = logs / "managed_payload_repair_v2"
    marker.write_text("repair_revision=v2\ncompleted_at=previous\n")
    events: list[str] = []
    monkeypatch.setattr(
        runtime_recovery,
        "get_runtime_paths",
        lambda: EndoregPathsModel.from_root(target),
    )
    monkeypatch.setattr(
        runtime_recovery, "call_command", lambda name, **_: events.append(name)
    )
    service = runtime_recovery.RuntimeRecoveryService(lambda _: None)
    monkeypatch.setattr(
        service, "_heavy_recovery", lambda **_: events.append("recover")
    )
    monkeypatch.setattr(
        service, "_repair_payloads", lambda **_: events.append("repair")
    )

    service.run(
        target=target,
        state_file=state_file,
        sources=[],
        force=force,
        force_repair=False,
        skip_repair=False,
    )

    assert events == (
        ["check_migration_compatibility", "migrate", "recover", "repair"]
        if force
        else []
    )


@pytest.mark.parametrize("failure", [None, "command", "missing_key"])
def test_repair_invalidates_old_marker_and_only_publishes_success(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    failure: str | None,
) -> None:
    from lx_annotate.services import runtime_recovery

    marker = tmp_path / "managed_payload_repair_v2"
    marker.write_text("repair_revision=v2\ncompleted_at=previous\n")
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY", raising=False)
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY_FILE", raising=False)
    if failure != "missing_key":
        # Only the presence check is exercised; no key is read by the stub.
        monkeypatch.setenv("LX_ANNOTATE_MASTER_KEY_FILE", str(tmp_path / "host-key"))
    events: list[str] = []

    def repair(name: str, **options: object) -> None:
        assert name == "repair_managed_payloads"
        assert not marker.exists()
        assert options["stdout"] is options["stderr"]
        if failure == "command":
            raise CommandError("payload repair rejected")

    monkeypatch.setattr(runtime_recovery, "call_command", repair)
    service = runtime_recovery.RuntimeRecoveryService(events.append)
    if failure == "command":
        with pytest.raises(CommandError, match="payload repair rejected"):
            service._repair_payloads(target=tmp_path, marker=marker)
    else:
        service._repair_payloads(target=tmp_path, marker=marker)

    assert marker.exists() is (failure is None)
    log = tmp_path / "data_migration_repair_latest.log"
    assert log.is_file()
    assert log.stat().st_mode & 0o777 == 0o640
    assert (
        json.loads(events[-1])["status"]
        == {
            None: "ok",
            "command": "failed",
            "missing_key": "skipped",
        }[failure]
    )
    if failure == "command":
        assert runtime_recovery.state_value(log, "failed_at")
        assert "payload repair rejected" in log.read_text()
    elif failure is None:
        assert runtime_recovery.state_value(marker, "completed_at")


def test_repair_only_run_also_rejects_incompatible_history(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    from endoreg_db.utils.paths import EndoregPathsModel

    from lx_annotate.services import runtime_recovery

    logs = tmp_path / "logs"
    logs.mkdir()
    marker = logs / "data_recovery_complete"
    marker.write_text("completed_at=previous\n")
    state_file = tmp_path / "state.env"
    state_file.write_text(f"LAST_EFFECTIVE_DATA_DIR={tmp_path}\n")
    monkeypatch.setattr(
        runtime_recovery,
        "get_runtime_paths",
        lambda: EndoregPathsModel.from_root(tmp_path),
    )
    calls: list[str] = []

    def reject(name: str, **_: object) -> None:
        calls.append(name)
        raise CommandError("incompatible migration history")

    monkeypatch.setattr(runtime_recovery, "call_command", reject)
    with pytest.raises(CommandError, match="incompatible migration history"):
        runtime_recovery.RuntimeRecoveryService(lambda _: None).run(
            target=tmp_path,
            state_file=state_file,
            sources=[],
            force=False,
            force_repair=False,
            skip_repair=False,
        )
    assert calls == ["check_migration_compatibility"]
    assert marker.read_text() == "completed_at=previous\n"
    assert not (logs / "managed_payload_repair_v2").exists()
