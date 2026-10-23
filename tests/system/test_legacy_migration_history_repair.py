from __future__ import annotations

from contextlib import nullcontext
from io import StringIO
from types import SimpleNamespace
from typing import cast

import pytest
from django.core.management.base import CommandError
from django.db.backends.base.base import BaseDatabaseWrapper

from lx_annotate import migration_history_safety as safety
from lx_annotate.management.commands import repair_legacy_migration_history as command


def _contract() -> safety.MigrationHistoryContract:
    return safety.MigrationHistoryContract(
        app_label="example",
        distribution="example",
        legacy_names=frozenset(
            {"0001_initial", "0002_legacy", "0003_legacy"},
        ),
        canonical_module="example.migrations",
        legacy_checkpoints=(
            safety.LegacyMigrationCheckpoint("0002_legacy", "0003_canonical"),
            safety.LegacyMigrationCheckpoint("0003_legacy", "0004_new"),
        ),
    )


def _manifests() -> dict[str, safety.MigrationManifest]:
    return {
        "example": safety.MigrationManifest(
            frozenset(
                {
                    "0001_initial",
                    "0002_canonical",
                    "0003_canonical",
                    "0004_new",
                    "0005_future",
                },
            ),
            "not-pinned",
        ),
    }


def test_plan_repairs_a_complete_legacy_prefix_only_through_its_checkpoint() -> None:
    plan = safety.build_repair_plan(
        {("example", "0001_initial"), ("example", "0002_legacy")},
        (_contract(),),
        _manifests(),
    )

    assert plan == (
        safety.MigrationHistoryRepairPlan(
            app_label="example",
            legacy_leaf="0002_legacy",
            canonical_through="0003_canonical",
            additions=("0002_canonical", "0003_canonical"),
            status="ready_to_repair",
        ),
    )


def test_endoreg_0038_prefix_maps_through_canonical_0059_only() -> None:
    contract = next(item for item in safety.CONTRACTS if item.app_label == "endoreg_db")
    manifests = safety.verify_canonical_contract_manifests((contract,))
    applied = {
        (contract.app_label, name)
        for name in contract.legacy_names
        if int(name[:4]) <= 38
    }

    plan = safety.build_repair_plan(applied, (contract,), manifests)[0]

    assert plan.legacy_leaf == "0038_videohlsartifact_encoding_profile_name_and_more"
    assert plan.canonical_through == "0059_videohlsartifact_encoding_profile_name"
    assert "0059_videohlsartifact_encoding_profile_name" in plan.additions
    assert not any(int(name[:4]) >= 60 for name in plan.additions)


def test_plan_allows_fresh_and_canonical_histories_without_writes() -> None:
    fresh = safety.build_repair_plan(set(), (_contract(),), _manifests())
    canonical = safety.build_repair_plan(
        {("example", "0001_initial"), ("example", "0002_canonical")},
        (_contract(),),
        _manifests(),
    )

    assert fresh[0].status == "canonical_or_fresh"
    assert canonical[0].status == "canonical_or_fresh"
    assert fresh[0].additions == canonical[0].additions == ()


def test_plan_rejects_gapped_unknown_and_unreviewed_legacy_leaves() -> None:
    with pytest.raises(safety.MigrationHistorySafetyError, match="has gaps"):
        safety.build_repair_plan(
            {("example", "0002_legacy")},
            (_contract(),),
            _manifests(),
        )
    with pytest.raises(safety.MigrationHistorySafetyError, match="unknown"):
        safety.build_repair_plan(
            {("example", "0099_unknown")},
            (_contract(),),
            _manifests(),
        )

    unsupported = safety.MigrationHistoryContract(
        app_label="example",
        distribution="example",
        legacy_names=_contract().legacy_names,
        canonical_module="example.migrations",
        legacy_checkpoints=(_contract().legacy_checkpoints[0],),
    )
    with pytest.raises(safety.MigrationHistorySafetyError, match="cannot be repaired"):
        safety.build_repair_plan(
            {
                ("example", "0001_initial"),
                ("example", "0002_legacy"),
                ("example", "0003_legacy"),
            },
            (unsupported,),
            _manifests(),
        )


def test_apply_locks_postgresql_and_records_only_planned_identities(
    monkeypatch,
) -> None:
    applied = {("example", "0001_initial"), ("example", "0002_legacy")}
    recorded: list[tuple[str, str]] = []
    sql: list[str] = []

    class Recorder:
        Migration = SimpleNamespace(_meta=SimpleNamespace(db_table="django_migrations"))

        def __init__(self, _connection: object) -> None:
            pass

        def applied_migrations(self) -> dict[tuple[str, str], object]:
            return {identity: object() for identity in applied}

        def record_applied(self, app: str, name: str) -> None:
            identity = (app, name)
            applied.add(identity)
            recorded.append(identity)

    class Cursor:
        def __enter__(self) -> Cursor:
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def execute(self, statement: str) -> None:
            sql.append(statement)

    connection = cast(
        BaseDatabaseWrapper,
        SimpleNamespace(
            vendor="postgresql",
            alias="default",
            ops=SimpleNamespace(quote_name=lambda value: f'"{value}"'),
            cursor=lambda: Cursor(),
        ),
    )
    monkeypatch.setattr(command, "MigrationRecorder", Recorder)
    monkeypatch.setattr(command.transaction, "atomic", lambda **_kwargs: nullcontext())
    expected = safety.build_repair_plan(applied, (_contract(),), _manifests())

    result = command.apply_repair_plan(
        connection,
        (_contract(),),
        _manifests(),
        expected,
    )

    assert sql == ['LOCK TABLE "django_migrations" IN SHARE ROW EXCLUSIVE MODE']
    assert recorded == [
        ("example", "0002_canonical"),
        ("example", "0003_canonical"),
    ]
    assert result[0].status == "already_repaired"


def test_command_is_dry_run_by_default(monkeypatch) -> None:
    plan = safety.build_repair_plan(
        {("example", "0001_initial"), ("example", "0002_legacy")},
        (_contract(),),
        _manifests(),
    )
    monkeypatch.setattr(command, "CONTRACTS", (_contract(),))
    monkeypatch.setattr(
        command,
        "verify_canonical_contract_manifests",
        lambda _contracts: _manifests(),
    )
    monkeypatch.setattr(command, "MigrationRecorder", lambda _connection: object())
    monkeypatch.setattr(
        command,
        "_applied_migration_keys",
        lambda _recorder: {
            ("example", "0001_initial"),
            ("example", "0002_legacy"),
        },
    )
    monkeypatch.setattr(
        command,
        "apply_repair_plan",
        lambda *_args: pytest.fail("dry-run attempted a write"),
    )
    monkeypatch.setattr(
        command,
        "connections",
        {"default": SimpleNamespace(alias="default")},
    )
    stdout = StringIO()

    command.Command(stdout=stdout).handle(apply=False, database="default")

    assert plan[0].additions
    assert '"applied":false' in stdout.getvalue()
    assert '"canonical_through":"0003_canonical"' in stdout.getvalue()


def test_apply_aborts_if_history_changes_after_preflight(monkeypatch) -> None:
    connection = cast(
        BaseDatabaseWrapper,
        SimpleNamespace(vendor="sqlite", alias="default"),
    )
    expected = safety.build_repair_plan(
        {("example", "0001_initial"), ("example", "0002_legacy")},
        (_contract(),),
        _manifests(),
    )
    monkeypatch.setattr(command.transaction, "atomic", lambda **_kwargs: nullcontext())
    monkeypatch.setattr(command, "MigrationRecorder", lambda _connection: object())
    monkeypatch.setattr(
        command,
        "_applied_migration_keys",
        lambda _recorder: {
            ("example", "0001_initial"),
            ("example", "0002_legacy"),
            ("example", "0003_legacy"),
        },
    )

    with pytest.raises(CommandError, match="changed after preflight"):
        command.apply_repair_plan(
            connection,
            (_contract(),),
            _manifests(),
            expected,
        )
