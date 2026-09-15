from __future__ import annotations

import json
from collections.abc import Collection, Mapping
from typing import Protocol

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import DEFAULT_DB_ALIAS, connections, transaction
from django.db.backends.base.base import BaseDatabaseWrapper
from django.db.migrations.recorder import MigrationRecorder

from lx_annotate.migration_history_safety import (
    CONTRACTS,
    MigrationHistoryContract,
    MigrationHistoryRepairPlan,
    MigrationHistorySafetyError,
    MigrationManifest,
    build_repair_plan,
    verify_canonical_contract_manifests,
)


class MigrationRecorderProtocol(Protocol):
    def applied_migrations(self) -> Mapping[tuple[str, str], object]: ...

    def record_applied(self, app: str, name: str) -> None: ...


def _applied_migration_keys(
    recorder: MigrationRecorderProtocol,
) -> set[tuple[str, str]]:
    return set(recorder.applied_migrations())


def apply_repair_plan(
    connection: BaseDatabaseWrapper,
    contracts: Collection[MigrationHistoryContract],
    manifests: Mapping[str, MigrationManifest],
    expected_plan: tuple[MigrationHistoryRepairPlan, ...],
) -> tuple[MigrationHistoryRepairPlan, ...]:
    if not any(plan.additions for plan in expected_plan):
        return expected_plan

    recorder = MigrationRecorder(connection)
    using = connection.alias
    with transaction.atomic(using=using):
        if connection.vendor == "postgresql":
            table_name = connection.ops.quote_name(recorder.Migration._meta.db_table)
            with connection.cursor() as cursor:
                cursor.execute(f"LOCK TABLE {table_name} IN SHARE ROW EXCLUSIVE MODE")

        locked_plan = build_repair_plan(
            _applied_migration_keys(recorder),
            contracts,
            manifests,
        )
        if locked_plan != expected_plan:
            raise CommandError(
                "Migration history changed after preflight; no records were written.",
            )

        for app_plan in locked_plan:
            for migration_name in app_plan.additions:
                recorder.record_applied(app_plan.app_label, migration_name)

        verified_plan = build_repair_plan(
            _applied_migration_keys(recorder),
            contracts,
            manifests,
        )
        if any(plan.additions for plan in verified_plan):
            raise CommandError(
                "Canonical migration identities were not recorded completely.",
            )
    return verified_plan


def _render_result(
    plans: Collection[MigrationHistoryRepairPlan],
    *,
    applied: bool,
) -> str:
    return json.dumps(
        {
            "applied": applied,
            "apps": [
                {
                    "app_label": plan.app_label,
                    "canonical_through": plan.canonical_through,
                    "legacy_leaf": plan.legacy_leaf,
                    "missing_identity_count": len(plan.additions),
                    "status": plan.status,
                }
                for plan in plans
            ],
            "event": "lx_annotate.legacy_migration_history_repair",
            "status": "ok",
        },
        sort_keys=True,
        separators=(",", ":"),
    )


class Command(BaseCommand):
    help = (
        "Inspect recognized legacy dependency migration prefixes and, with "
        "--apply, atomically record only their reviewed canonical equivalents. "
        "The command never runs schema operations or deletes migration records."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Record the planned canonical identities atomically.",
        )
        parser.add_argument(
            "--database",
            default=DEFAULT_DB_ALIAS,
            help="Database alias to inspect and repair (default: default).",
        )

    def handle(self, *args: object, **options: object) -> None:
        _ = args
        using = str(options["database"])
        try:
            connection = connections[using]
        except KeyError as exc:
            raise CommandError(f"Unknown database alias: {using}.") from exc

        try:
            manifests = verify_canonical_contract_manifests(CONTRACTS)
            recorder = MigrationRecorder(connection)
            plan = build_repair_plan(
                _applied_migration_keys(recorder),
                CONTRACTS,
                manifests,
            )
            should_apply = bool(options["apply"])
            if should_apply:
                plan = apply_repair_plan(connection, CONTRACTS, manifests, plan)
        except MigrationHistorySafetyError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(_render_result(plan, applied=should_apply))
