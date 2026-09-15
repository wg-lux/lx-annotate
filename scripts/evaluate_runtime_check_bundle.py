#!/usr/bin/env python3
"""Verify that the shipped migration bundle satisfies runtime schema checks."""

from __future__ import annotations

import os
import sys
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from django.apps import AppConfig

REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class SchemaContract:
    tables: frozenset[str]
    columns: Mapping[str, frozenset[str]]
    constraints: Mapping[str, frozenset[str]]


class BundleEvaluationEndoregConfig(AppConfig):
    """Load endoreg_db models without invoking deployment startup hooks."""

    name = "endoreg_db"


def find_contract_gaps(
    *, required: SchemaContract, provided: SchemaContract,
) -> list[str]:
    """Return stable, human-readable gaps without duplicating missing tables."""
    gaps = [
        f"missing table: {table_name}"
        for table_name in sorted(required.tables - provided.tables)
    ]

    for table_name, required_columns in sorted(required.columns.items()):
        if table_name not in provided.tables:
            if table_name not in required.tables:
                gaps.append(f"missing table: {table_name}")
            continue
        missing_columns = required_columns - provided.columns.get(
            table_name, frozenset(),
        )
        gaps.extend(
            f"missing column: {table_name}.{column_name}"
            for column_name in sorted(missing_columns)
        )

    for table_name, required_constraints in sorted(required.constraints.items()):
        if table_name not in provided.tables:
            if table_name not in required.tables:
                gaps.append(f"missing table: {table_name}")
            continue
        missing_constraints = required_constraints - provided.constraints.get(
            table_name, frozenset(),
        )
        gaps.extend(
            f"missing constraint: {table_name}.{constraint_name}"
            for constraint_name in sorted(missing_constraints)
        )

    return list(dict.fromkeys(gaps))


def _configure_django() -> None:
    """Configure only the apps needed to render the migration bundle."""
    from django.conf import settings

    if settings.configured:
        raise RuntimeError(
            "Bundle evaluation must run in a fresh Python process before Django "
            "settings are configured.",
        )

    settings.configure(
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": ":memory:",
            },
        },
        INSTALLED_APPS=[
            "django.contrib.auth",
            "django.contrib.contenttypes",
            "scripts.evaluate_runtime_check_bundle.BundleEvaluationEndoregConfig",
        ],
        MEDIA_ROOT=str(REPO_ROOT),
        USE_TZ=True,
    )

    import django

    django.setup()


def _required_contract() -> SchemaContract:
    from lx_annotate import checks

    return SchemaContract(
        tables=frozenset(checks._ENDOREG_DB_REQUIRED_TABLES),
        columns={
            table_name: frozenset(column_names)
            for table_name, column_names in checks._ENDOREG_DB_REQUIRED_COLUMNS.items()
        },
        constraints={
            table_name: frozenset(constraint_names)
            for table_name, constraint_names in (
                checks._ENDOREG_DB_REQUIRED_CONSTRAINTS.items()
            )
        },
    )


def _provided_contract() -> SchemaContract:
    from django.db import DEFAULT_DB_ALIAS, connections
    from django.db.migrations.loader import MigrationLoader

    loader = MigrationLoader(
        connections[DEFAULT_DB_ALIAS],
        ignore_no_migrations=True,
    )
    project_apps = loader.project_state().apps
    models_by_table = {
        model._meta.db_table: model
        for model in project_apps.get_models(include_auto_created=True)
    }

    return SchemaContract(
        tables=frozenset(models_by_table),
        columns={
            table_name: frozenset(
                field.column
                for field in model._meta.local_fields
                if field.column is not None
            )
            for table_name, model in models_by_table.items()
        },
        constraints={
            table_name: frozenset(
                constraint.name
                for constraint in model._meta.constraints
                if constraint.name is not None
            )
            for table_name, model in models_by_table.items()
        },
    )


def main() -> int:
    os.chdir(REPO_ROOT)
    try:
        _configure_django()
        required = _required_contract()
        provided = _provided_contract()
    except Exception as exc:
        print(
            "Runtime-check bundle evaluation could not load the canonical "
            f"dependency migration graph: {type(exc).__name__}: {exc}",
            file=sys.stderr,
        )
        return 1

    gaps = find_contract_gaps(required=required, provided=provided)
    if gaps:
        print(
            "Runtime-check bundle contract failed. The configured endoreg_db "
            "migration bundle does not provide requirements declared in "
            "lx_annotate/checks.py:",
            file=sys.stderr,
        )
        for gap in gaps:
            print(f"- {gap}", file=sys.stderr)
        return 1

    print(
        "Runtime-check bundle contract passed: all required tables, columns, "
        "and constraints are provided.",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
