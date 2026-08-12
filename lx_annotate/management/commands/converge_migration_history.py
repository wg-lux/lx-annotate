from __future__ import annotations

import ast
import hashlib
import json
import re
from collections.abc import Collection, Mapping
from dataclasses import dataclass
from importlib import resources
from importlib.metadata import PackageNotFoundError, version
from typing import Protocol

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import DEFAULT_DB_ALIAS, connections, transaction
from django.db.backends.base.base import BaseDatabaseWrapper
from django.db.migrations.recorder import MigrationRecorder

from lx_annotate.checks import assert_runtime_checks_pass

_MIGRATION_FILENAME = re.compile(r"^(?P<name>\d{4}_.+)\.py$")


@dataclass(frozen=True)
class MigrationHistoryContract:
    app_label: str
    distribution: str
    distribution_version: str
    legacy_module: str
    legacy_leaf: str
    legacy_manifest_sha256: str
    canonical_module: str
    canonical_leaf: str
    canonical_manifest_sha256: str


@dataclass(frozen=True)
class MigrationManifest:
    names: frozenset[str]
    sha256: str


@dataclass(frozen=True)
class AppConvergencePlan:
    app_label: str
    canonical_leaf: str
    additions: tuple[str, ...]
    already_converged: bool


class MigrationRecorderProtocol(Protocol):
    def applied_migrations(self) -> Mapping[tuple[str, str], object]: ...

    def record_applied(self, app: str, name: str) -> None: ...


class _ImportSyntaxNormalizer(ast.NodeTransformer):
    """Canonicalize equivalent import grouping and ordering for hashing."""

    @staticmethod
    def _normalize_statement_block(statements: list[ast.stmt]) -> list[ast.stmt]:
        normalized: list[ast.stmt] = []
        import_block: list[ast.stmt] = []

        def flush_import_block() -> None:
            normalized.extend(
                sorted(import_block, key=lambda node: ast.dump(node)),
            )
            import_block.clear()

        for statement in statements:
            if isinstance(statement, ast.Import):
                import_block.extend(
                    ast.Import(names=[ast.alias(name=alias.name, asname=alias.asname)])
                    for alias in statement.names
                )
                continue
            if isinstance(statement, ast.ImportFrom):
                import_block.extend(
                    ast.ImportFrom(
                        module=statement.module,
                        names=[ast.alias(name=alias.name, asname=alias.asname)],
                        level=statement.level,
                    )
                    for alias in statement.names
                )
                continue
            flush_import_block()
            normalized.append(statement)
        flush_import_block()
        return normalized

    def generic_visit(self, node: ast.AST) -> ast.AST:
        visited = super().generic_visit(node)
        for field_name, field_value in ast.iter_fields(visited):
            if field_name not in {"body", "orelse", "finalbody"}:
                continue
            if isinstance(field_value, list) and all(
                isinstance(statement, ast.stmt) for statement in field_value
            ):
                setattr(
                    visited,
                    field_name,
                    self._normalize_statement_block(field_value),
                )
        return visited


CONTRACTS: tuple[MigrationHistoryContract, ...] = (
    MigrationHistoryContract(
        app_label="endoreg_db",
        distribution="endoreg-db",
        distribution_version="1.0.13.0",
        legacy_module="lx_annotate.migration_overrides.endoreg_db",
        legacy_leaf="0050_storage_operator_control",
        legacy_manifest_sha256=(
            "2e3cbd4ae7bcebb9c7bc2218ef587077c2898adea72504c4b7376e60f4ab5675"
        ),
        canonical_module="endoreg_db.migrations",
        canonical_leaf="0071_storage_operator_control",
        canonical_manifest_sha256=(
            "6ac320ce7021ff542b2bd20769b5ef4256c07894b605cbb6df6adb67dafd90a9"
        ),
    ),
    MigrationHistoryContract(
        app_label="lx_dtypes_django",
        distribution="lx-dtypes",
        distribution_version="0.2.15",
        legacy_module="lx_annotate.migration_overrides.lx_dtypes_django",
        legacy_leaf="0005_videofiledjango",
        legacy_manifest_sha256=(
            "6604d5dc3bd34b526f7e92b3aa5ead666a2553a533dc62103ea70c475e5fc194"
        ),
        canonical_module="lx_dtypes.django.migrations",
        canonical_leaf="0005_videofiledjango",
        canonical_manifest_sha256=(
            "9db57c3c5d98404e8112df756d5f89155dcbbc879e9c004b36b631414496e98f"
        ),
    ),
)


def load_migration_manifest(module_name: str) -> MigrationManifest:
    migration_files: list[tuple[str, bytes]] = []
    migration_names: set[str] = set()
    try:
        module_root = resources.files(module_name)
    except (ModuleNotFoundError, TypeError) as exc:
        raise CommandError(
            f"Migration module '{module_name}' is unavailable: {exc}",
        ) from exc

    for entry in module_root.iterdir():
        if not entry.name.endswith(".py") or entry.name == "__init__.py":
            continue
        try:
            contents = entry.read_bytes()
        except OSError as exc:
            raise CommandError(
                f"Unable to read migration manifest entry '{entry.name}': {exc}",
            ) from exc
        migration_files.append((entry.name, contents))
        match = _MIGRATION_FILENAME.fullmatch(entry.name)
        if match is not None:
            migration_names.add(match.group("name"))

    digest = hashlib.sha256()
    for filename, contents in sorted(migration_files):
        try:
            syntax_tree = ast.parse(contents, filename=filename)
        except SyntaxError as exc:
            raise CommandError(
                f"Migration manifest entry '{filename}' is invalid Python: {exc}",
            ) from exc
        normalized_tree = _ImportSyntaxNormalizer().visit(syntax_tree)
        normalized_syntax = ast.dump(
            normalized_tree,
            annotate_fields=True,
            include_attributes=False,
        ).encode("utf-8")
        digest.update(filename.encode("utf-8"))
        digest.update(b"\0")
        digest.update(normalized_syntax)
        digest.update(b"\0")
    return MigrationManifest(frozenset(migration_names), digest.hexdigest())


def verify_contract_manifests(
    contracts: Collection[MigrationHistoryContract],
) -> dict[str, tuple[MigrationManifest, MigrationManifest]]:
    configured_modules = getattr(settings, "MIGRATION_MODULES", None)
    if not isinstance(configured_modules, Mapping):
        raise CommandError("MIGRATION_MODULES is not the supported override mapping.")

    manifests: dict[str, tuple[MigrationManifest, MigrationManifest]] = {}
    for contract in contracts:
        if configured_modules.get(contract.app_label) != contract.legacy_module:
            raise CommandError(
                f"{contract.app_label} is not using the expected legacy migration module.",
            )
        try:
            installed_version = version(contract.distribution)
        except PackageNotFoundError as exc:
            raise CommandError(
                f"Required distribution '{contract.distribution}' is not installed.",
            ) from exc
        if installed_version != contract.distribution_version:
            raise CommandError(
                f"Unsupported {contract.distribution} version {installed_version}; "
                f"expected {contract.distribution_version}.",
            )

        legacy = load_migration_manifest(contract.legacy_module)
        canonical = load_migration_manifest(contract.canonical_module)
        if legacy.sha256 != contract.legacy_manifest_sha256:
            raise CommandError(
                f"{contract.app_label} legacy migration manifest does not match "
                "the reviewed contract.",
            )
        if canonical.sha256 != contract.canonical_manifest_sha256:
            raise CommandError(
                f"{contract.app_label} canonical migration manifest does not match "
                "the reviewed contract.",
            )
        if contract.legacy_leaf not in legacy.names:
            raise CommandError(
                f"{contract.app_label} legacy leaf {contract.legacy_leaf} is missing.",
            )
        if contract.canonical_leaf not in canonical.names:
            raise CommandError(
                f"{contract.app_label} canonical leaf {contract.canonical_leaf} is missing.",
            )
        manifests[contract.app_label] = (legacy, canonical)
    return manifests


def build_convergence_plan(
    applied: Collection[tuple[str, str]],
    contracts: Collection[MigrationHistoryContract],
    manifests: Mapping[str, tuple[MigrationManifest, MigrationManifest]],
) -> tuple[AppConvergencePlan, ...]:
    plans: list[AppConvergencePlan] = []
    for contract in contracts:
        legacy, canonical = manifests[contract.app_label]
        existing = {name for app, name in applied if app == contract.app_label}
        allowed = legacy.names | canonical.names
        unexpected = sorted(existing - allowed)
        if unexpected:
            raise CommandError(
                f"{contract.app_label} has unexpected migration records: "
                f"{', '.join(unexpected)}.",
            )
        missing_legacy = sorted(legacy.names - existing)
        if missing_legacy:
            raise CommandError(
                f"{contract.app_label} legacy history is incomplete; missing: "
                f"{', '.join(missing_legacy)}.",
            )

        bridge_identities = canonical.names - legacy.names
        present_bridge_identities = bridge_identities & existing
        if present_bridge_identities and present_bridge_identities != bridge_identities:
            missing = sorted(bridge_identities - present_bridge_identities)
            raise CommandError(
                f"{contract.app_label} canonical history is partially converged; "
                f"missing: {', '.join(missing)}.",
            )
        additions = tuple(sorted(bridge_identities - existing))
        plans.append(
            AppConvergencePlan(
                app_label=contract.app_label,
                canonical_leaf=contract.canonical_leaf,
                additions=additions,
                already_converged=not additions,
            ),
        )
    return tuple(plans)


def _applied_migration_keys(
    recorder: MigrationRecorderProtocol,
) -> set[tuple[str, str]]:
    return set(recorder.applied_migrations())


def apply_convergence_plan(
    connection: BaseDatabaseWrapper,
    contracts: Collection[MigrationHistoryContract],
    manifests: Mapping[str, tuple[MigrationManifest, MigrationManifest]],
    expected_plan: tuple[AppConvergencePlan, ...],
) -> tuple[AppConvergencePlan, ...]:
    if connection.vendor != "postgresql":
        raise CommandError(
            "Migration history convergence writes are supported only on PostgreSQL.",
        )

    recorder = MigrationRecorder(connection)
    using = connection.alias
    with transaction.atomic(using=using):
        table_name = connection.ops.quote_name(recorder.Migration._meta.db_table)
        with connection.cursor() as cursor:
            cursor.execute(f"LOCK TABLE {table_name} IN SHARE ROW EXCLUSIVE MODE")

        locked_plan = build_convergence_plan(
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

        verified_plan = build_convergence_plan(
            _applied_migration_keys(recorder),
            contracts,
            manifests,
        )
        if any(not app_plan.already_converged for app_plan in verified_plan):
            raise CommandError(
                "Canonical migration identities were not recorded completely.",
            )
    return verified_plan


def _render_result(plans: Collection[AppConvergencePlan], *, applied: bool) -> str:
    return json.dumps(
        {
            "applied": applied,
            "apps": [
                {
                    "app_label": plan.app_label,
                    "canonical_leaf": plan.canonical_leaf,
                    "missing_identity_count": len(plan.additions),
                    "status": (
                        "already_converged"
                        if plan.already_converged
                        else "ready_to_converge"
                    ),
                }
                for plan in plans
            ],
            "event": "lx_annotate.migration_history_convergence",
            "status": "ok",
        },
        sort_keys=True,
        separators=(",", ":"),
    )


class Command(BaseCommand):
    help = (
        "Verify legacy migration history and, with --apply, atomically record "
        "the reviewed canonical dependency migration identities. The command "
        "does not run schema migrations or delete legacy records."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Record missing canonical identities after all checks pass.",
        )

    def handle(self, *args: object, **options: object) -> None:
        _ = args
        connection = connections[DEFAULT_DB_ALIAS]

        manifests = verify_contract_manifests(CONTRACTS)
        assert_runtime_checks_pass()
        recorder = MigrationRecorder(connection)
        plan = build_convergence_plan(
            _applied_migration_keys(recorder),
            CONTRACTS,
            manifests,
        )
        should_apply = bool(options["apply"])
        if should_apply:
            plan = apply_convergence_plan(connection, CONTRACTS, manifests, plan)
        self.stdout.write(_render_result(plan, applied=should_apply))
