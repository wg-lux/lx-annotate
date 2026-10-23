from __future__ import annotations

from io import StringIO
from typing import Any, Generator, Literal

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import OperationalError, connection
from django.db.migrations.recorder import MigrationRecorder
from pytest import MonkeyPatch

from lx_annotate import checks
from lx_annotate import migration_history_safety as safety
from lx_annotate.apps import LxAnnotateConfig


@pytest.fixture
def recorded_history(transactional_db) -> Generator[MigrationRecorder, Any, None]:
    recorder = MigrationRecorder(connection)
    recorder.ensure_schema()
    existing_ids = list(recorder.migration_qs.values_list("pk", flat=True))
    yield recorder
    recorder.migration_qs.exclude(pk__in=existing_ids).delete()


def _reject_writes(execute, sql, params, many, context):
    assert sql.lstrip().upper().startswith("SELECT"), sql
    return execute(sql, params, many, context)


@pytest.mark.parametrize(
    "unknown", ["0076_operation_ownership_ledgers", "9999_unknown"]
)
def test_newer_database_rejected_without_mutation(
    recorded_history,
    monkeypatch,
    unknown,
):
    contract = next(c for c in safety.CONTRACTS if c.app_label == "endoreg_db")
    manifests = safety.verify_canonical_contract_manifests()
    manifests[contract.app_label] = safety.MigrationManifest(
        frozenset(n for n in manifests[contract.app_label].names if int(n[:4]) <= 56),
        "older-installed-manifest",
    )
    monkeypatch.setattr(
        safety, "verify_canonical_contract_manifests", lambda _: manifests
    )
    recorded_history.record_applied("endoreg_db", unknown)
    before = set(recorded_history.applied_migrations())

    with connection.execute_wrapper(_reject_writes):
        with pytest.raises(CommandError, match="unknown migration records"):
            call_command("check_migration_compatibility", stdout=StringIO())
    assert set(recorded_history.applied_migrations()) == before


@pytest.mark.parametrize("history_kind", ["fresh", "canonical", "legacy", "squashed"])
def test_recognized_histories_remain_read_only(
    recorded_history: MigrationRecorder,
    history_kind: Literal["fresh", "canonical", "legacy", "squashed"],
):
    contract = next(c for c in safety.CONTRACTS if c.app_label == "endoreg_db")

    if history_kind == "canonical":
        names: set[str] = set(
            safety.verify_canonical_contract_manifests()[contract.app_label].names
        )
    elif history_kind in {"legacy", "squashed"}:
        names = {n for n in contract.legacy_names if int(n[:4]) <= 38}
        if history_kind == "legacy":
            names.discard("0001_squashed_0001_initial")
    else:
        names = set()

    for name in names:
        recorded_history.record_applied(contract.app_label, name)

    before = set(recorded_history.applied_migrations())
    output = StringIO()

    with connection.execute_wrapper(_reject_writes):
        call_command("check_migration_compatibility", stdout=output)

    assert '"status": "compatible"' in output.getvalue()
    assert set(recorded_history.applied_migrations()) == before


def test_runtime_assertion_rejects_newer_history(
    recorded_history: MigrationRecorder, monkeypatch: MonkeyPatch
):
    recorded_history.record_applied("endoreg_db", "9999_unknown")
    for name in (
        "lx_annotate_endoreg_db_schema_checks",
        "lx_annotate_endoreg_db_constraint_checks",
        "lx_annotate_environment_checks",
    ):
        monkeypatch.setattr(checks, name, lambda _: [])
    with pytest.raises(ImproperlyConfigured, match="migration_history_incompatible"):
        checks.assert_runtime_checks_pass()


def test_explicit_command_can_run_before_schema_migrations():
    assert (
        "check_migration_compatibility" in LxAnnotateConfig._SKIP_RUNTIME_CHECK_COMMANDS
    )
    with pytest.raises(CommandError, match="doesn't exist"):
        call_command("check_migration_compatibility", database="missing-database")


def test_unavailable_database_fails_closed_without_exposing_driver_detail(monkeypatch):
    def unavailable(_self):
        raise OperationalError("private connection diagnostic")

    monkeypatch.setattr(MigrationRecorder, "applied_migrations", unavailable)
    with pytest.raises(CommandError, match="Unable to inspect") as error:
        call_command("check_migration_compatibility")
    assert "private connection diagnostic" not in str(error.value)
