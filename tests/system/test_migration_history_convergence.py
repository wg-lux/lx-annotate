from __future__ import annotations

from contextlib import nullcontext
from io import StringIO
from types import SimpleNamespace
from typing import cast

import pytest
from django.core.management.base import CommandError
from django.db.backends.base.base import BaseDatabaseWrapper

from lx_annotate.management.commands import converge_migration_history as command


def _contract(app_label: str = "example") -> command.MigrationHistoryContract:
    return command.MigrationHistoryContract(
        app_label=app_label,
        distribution="example-distribution",
        distribution_version="1.0",
        legacy_module="legacy.migrations",
        legacy_leaf="0002_legacy_leaf",
        legacy_manifest_sha256="legacy-hash",
        canonical_module="canonical.migrations",
        canonical_leaf="0003_canonical_leaf",
        canonical_manifest_sha256="canonical-hash",
    )


def _manifests() -> dict[
    str,
    tuple[command.MigrationManifest, command.MigrationManifest],
]:
    return {
        "example": (
            command.MigrationManifest(
                frozenset({"0001_initial", "0002_legacy_leaf"}),
                "legacy-hash",
            ),
            command.MigrationManifest(
                frozenset(
                    {"0001_initial", "0002_canonical_step", "0003_canonical_leaf"},
                ),
                "canonical-hash",
            ),
        ),
    }


class _MigrationResource:
    def __init__(self, filename: str, contents: bytes) -> None:
        self.name = filename
        self._contents = contents

    def read_bytes(self) -> bytes:
        return self._contents


class _MigrationModuleResource:
    def __init__(self, entries: list[_MigrationResource]) -> None:
        self._entries = entries

    def iterdir(self) -> list[_MigrationResource]:
        return self._entries


def test_manifest_hash_ignores_formatting_but_detects_semantic_changes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    module_resource = _MigrationModuleResource(
        [
            _MigrationResource(
                "0001_initial.py",
                b"from example import first\nfrom example import second\nvalue = {'key': 1}\n",
            ),
        ],
    )
    monkeypatch.setattr(command.resources, "files", lambda _module: module_resource)
    original = command.load_migration_manifest("example.migrations")

    module_resource._entries[0] = _MigrationResource(
        "0001_initial.py",
        b'# formatting-only change\nfrom example import second, first\nvalue={"key":1}\n',
    )
    reformatted = command.load_migration_manifest("example.migrations")
    module_resource._entries[0] = _MigrationResource(
        "0001_initial.py",
        b'from example import first, second\nvalue={"key":2}\n',
    )
    changed = command.load_migration_manifest("example.migrations")

    assert reformatted == original
    assert changed.names == original.names
    assert changed.sha256 != original.sha256


def test_reviewed_contracts_match_pinned_packages(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        command.settings,
        "MIGRATION_MODULES",
        {contract.app_label: contract.legacy_module for contract in command.CONTRACTS},
    )

    manifests = command.verify_contract_manifests(command.CONTRACTS)
    legacy_applied = {
        (contract.app_label, migration_name)
        for contract in command.CONTRACTS
        for migration_name in manifests[contract.app_label][0].names
    }
    plan = command.build_convergence_plan(legacy_applied, command.CONTRACTS, manifests)

    assert {item.app_label: len(item.additions) for item in plan} == {
        "endoreg_db": 60,
        "lx_dtypes_django": 0,
    }


def test_plan_requires_complete_legacy_history() -> None:
    with pytest.raises(CommandError, match="legacy history is incomplete"):
        command.build_convergence_plan(
            {("example", "0001_initial")},
            (_contract(),),
            _manifests(),
        )


def test_plan_rejects_unknown_and_partial_canonical_histories() -> None:
    legacy = {("example", "0001_initial"), ("example", "0002_legacy_leaf")}
    with pytest.raises(CommandError, match="unexpected migration records"):
        command.build_convergence_plan(
            legacy | {("example", "0099_unknown")},
            (_contract(),),
            _manifests(),
        )
    with pytest.raises(CommandError, match="partially converged"):
        command.build_convergence_plan(
            legacy | {("example", "0002_canonical_step")},
            (_contract(),),
            _manifests(),
        )


def test_plan_is_idempotent_after_all_canonical_identities_exist() -> None:
    applied = {
        ("example", "0001_initial"),
        ("example", "0002_legacy_leaf"),
        ("example", "0002_canonical_step"),
        ("example", "0003_canonical_leaf"),
    }
    plan = command.build_convergence_plan(applied, (_contract(),), _manifests())

    assert plan == (
        command.AppConvergencePlan(
            app_label="example",
            canonical_leaf="0003_canonical_leaf",
            additions=(),
            already_converged=True,
        ),
    )


def test_apply_locks_and_records_only_missing_identities(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    applied = {
        ("example", "0001_initial"),
        ("example", "0002_legacy_leaf"),
    }
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
    expected = command.build_convergence_plan(applied, (_contract(),), _manifests())

    result = command.apply_convergence_plan(
        connection,
        (_contract(),),
        _manifests(),
        expected,
    )

    assert sql == ['LOCK TABLE "django_migrations" IN SHARE ROW EXCLUSIVE MODE']
    assert recorded == [
        ("example", "0002_canonical_step"),
        ("example", "0003_canonical_leaf"),
    ]
    assert result[0].already_converged is True


def test_apply_rejects_non_postgresql_database() -> None:
    connection = cast(
        BaseDatabaseWrapper,
        SimpleNamespace(vendor="sqlite", alias="default"),
    )
    with pytest.raises(CommandError, match="only on PostgreSQL"):
        command.apply_convergence_plan(
            connection,
            (_contract(),),
            _manifests(),
            command.build_convergence_plan(
                {
                    ("example", "0001_initial"),
                    ("example", "0002_legacy_leaf"),
                },
                (_contract(),),
                _manifests(),
            ),
        )


def test_command_defaults_to_read_only_dry_run(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    plan = (
        command.AppConvergencePlan(
            app_label="example",
            canonical_leaf="0003_canonical_leaf",
            additions=("0002_canonical_step", "0003_canonical_leaf"),
            already_converged=False,
        ),
    )
    monkeypatch.setattr(command, "verify_contract_manifests", lambda _items: {})
    monkeypatch.setattr(command, "assert_runtime_checks_pass", lambda: None)
    monkeypatch.setattr(command, "MigrationRecorder", lambda _connection: object())
    monkeypatch.setattr(command, "_applied_migration_keys", lambda _recorder: set())
    monkeypatch.setattr(command, "build_convergence_plan", lambda *args: plan)
    monkeypatch.setattr(
        command,
        "apply_convergence_plan",
        lambda *args: pytest.fail("dry-run attempted a write"),
    )
    monkeypatch.setattr(
        command,
        "connections",
        {"default": SimpleNamespace(alias="default")},
    )
    stdout = StringIO()

    command.Command(stdout=stdout).handle(apply=False)

    assert '"applied":false' in stdout.getvalue()
    assert '"missing_identity_count":2' in stdout.getvalue()
