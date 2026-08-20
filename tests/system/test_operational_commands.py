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
        json.dumps({"src/main.ts": {"file": "assets/main.js"}}),
        encoding="utf-8",
    )

    validate_static_assets(static_root)
    asset.unlink()
    with pytest.raises(CommandError, match="missing asset"):
        validate_static_assets(static_root)


def test_recovery_state_reader_uses_last_matching_value(tmp_path: Path) -> None:
    from lx_annotate.services.runtime_recovery import state_value

    state = tmp_path / "state.env"
    state.write_text(
        "LAST_EFFECTIVE_DATA_DIR=/old\nLAST_EFFECTIVE_DATA_DIR=/current\n",
        encoding="utf-8",
    )

    assert state_value(state, "LAST_EFFECTIVE_DATA_DIR") == "/current"


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
        lambda specs: [
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
