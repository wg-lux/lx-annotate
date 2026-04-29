from __future__ import annotations

import os
import sys
from pathlib import Path

from django.conf import settings
from django.core.checks import (
    CRITICAL,
    CheckMessage,
    Critical,
    Warning,
    register,
    run_checks,
)
from django.core.exceptions import ImproperlyConfigured
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.migrations.executor import MigrationExecutor
from django.db.utils import OperationalError, ProgrammingError

from endoreg_db.services.environment_readiness import check_environment_readiness


_ENDOREG_DB_REQUIRED_COLUMNS: dict[str, dict[str, str]] = {
    "endoreg_db_sensitivemeta": {
        "validation_comment": "0014_sensitivemeta_tags_sensitivemeta_validation_comment_and_more",
    },
    "endoreg_db_videofile": {
        "storage_mode": "0015_uploadjob_content_hash_and_more",
        "processed_streamable_relative_path": "0015_uploadjob_content_hash_and_more",
        "raw_streamable_relative_path": "0016_rename_streamable_relative_path_videofile_raw_streamable_relative_path_and_more",
    },
}

_ENDOREG_DB_REQUIRED_TABLES: dict[str, str] = {
    "endoreg_db_videofile": "0001_initial",
    "endoreg_db_sensitivemeta": "0001_initial",
    "endoreg_db_sensitivemeta_tags": "0014_sensitivemeta_tags_sensitivemeta_validation_comment_and_more",
    "endoreg_db_auditledger": "0017_auditledger_ledgerhead_and_more",
    "endoreg_db_ledgerhead": "0017_auditledger_ledgerhead_and_more",
}


def _current_management_command() -> str:
    return sys.argv[1] if len(sys.argv) > 1 else ""


def _pending_migrations_for_app(
    app_label: str, *, using: str = DEFAULT_DB_ALIAS
) -> set[str] | None:
    connection = connections[using]

    try:
        executor = MigrationExecutor(connection)
        targets = [
            node for node in executor.loader.graph.leaf_nodes() if node[0] == app_label
        ]
        plan = executor.migration_plan(targets)
    except (OperationalError, ProgrammingError):
        return None

    return {
        migration.name
        for migration, backwards in plan
        if migration.app_label == app_label and not backwards
    }


def _is_expected_pending_schema_gap(
    *, pending_migrations: set[str] | None, required_by_migration: str
) -> bool:
    if _current_management_command() != "migrate":
        return False
    if pending_migrations is None:
        return False
    return required_by_migration in pending_migrations


def _table_columns(
    table_name: str, *, using: str = DEFAULT_DB_ALIAS
) -> set[str] | None:
    connection = connections[using]
    introspection = connection.introspection

    try:
        table_names = set(introspection.table_names())
    except (OperationalError, ProgrammingError):
        return None

    if table_name not in table_names:
        return set()

    with connection.cursor() as cursor:
        description = introspection.get_table_description(cursor, table_name)
    return {column.name for column in description}


@register()
def lx_annotate_endoreg_db_schema_checks(app_configs, **kwargs):  # type: ignore[unused-argument]
    messages: list[CheckMessage] = []
    pending_endoreg_db_migrations = _pending_migrations_for_app("endoreg_db")

    for table_name, required_by_migration in _ENDOREG_DB_REQUIRED_TABLES.items():
        columns = _table_columns(table_name)
        if columns is None:
            continue
        if columns:
            continue
        if _is_expected_pending_schema_gap(
            pending_migrations=pending_endoreg_db_migrations,
            required_by_migration=required_by_migration,
        ):
            continue
        messages.append(
            Critical(
                "endoreg_db schema is behind the lx_annotate migration override set. "
                f"Missing required table '{table_name}'. Apply the endoreg_db migrations before serving traffic.",
                id="lx_annotate.endoreg_db_schema_table_missing",
                obj=table_name,
            )
        )

    for table_name, required_columns in _ENDOREG_DB_REQUIRED_COLUMNS.items():
        columns = _table_columns(table_name)
        if columns is None:
            continue
        if not columns:
            continue

        missing_columns = [
            column
            for column, required_by_migration in required_columns.items()
            if column not in columns
            and not _is_expected_pending_schema_gap(
                pending_migrations=pending_endoreg_db_migrations,
                required_by_migration=required_by_migration,
            )
        ]
        if missing_columns:
            messages.append(
                Critical(
                    "endoreg_db schema is behind the lx_annotate migration override set. "
                    f"Table '{table_name}' is missing required columns: {', '.join(missing_columns)}. "
                    "Apply the endoreg_db migrations before serving traffic.",
                    id="lx_annotate.endoreg_db_schema_column_missing",
                    obj=table_name,
                )
            )

    return messages


@register()
def lx_annotate_environment_checks(app_configs, **kwargs):  # type: ignore[unused-argument]
    messages = []

    for issue in check_environment_readiness():
        check_cls = Critical if issue.severity == "critical" else Warning
        messages.append(
            check_cls(
                issue.message,
                id=f"lx_annotate.{issue.code}",
                obj=issue.path,
            )
        )

    protected_url = str(os.environ.get("NGINX_PROTECTED_MEDIA_URL", "") or "").strip()
    if not protected_url:
        messages.append(
            Critical(
                "NGINX_PROTECTED_MEDIA_URL must be set for protected media handoff.",
                id="lx_annotate.nginx_protected_media_url_missing",
            )
        )
    elif not protected_url.startswith("/"):
        messages.append(
            Critical(
                "NGINX_PROTECTED_MEDIA_URL must start with '/'.",
                id="lx_annotate.nginx_protected_media_url_invalid",
                obj=protected_url,
            )
        )

    protected_root = str(os.environ.get("PROTECTED_MEDIA_ROOT", "") or "").strip()
    if not protected_root:
        messages.append(
            Critical(
                "PROTECTED_MEDIA_ROOT must be set for Nginx protected media routing.",
                id="lx_annotate.protected_media_root_missing",
            )
        )
    else:
        protected_root_path = Path(protected_root).expanduser().resolve()
        expected_media_root = Path(settings.MEDIA_ROOT).expanduser().resolve()
        if not protected_root_path.exists():
            messages.append(
                Critical(
                    f"PROTECTED_MEDIA_ROOT does not exist: {protected_root_path}",
                    id="lx_annotate.protected_media_root_not_found",
                    obj=str(protected_root_path),
                )
            )
        elif protected_root_path != expected_media_root:
            messages.append(
                Warning(
                    "PROTECTED_MEDIA_ROOT does not match Django MEDIA_ROOT. "
                    "Verify Nginx alias and X-Accel-Redirect expectations.",
                    id="lx_annotate.protected_media_root_mismatch",
                    obj=f"{protected_root_path} != {expected_media_root}",
                )
            )

    return messages


def assert_runtime_checks_pass() -> None:
    critical_messages = [
        message for message in run_checks() if message.level >= CRITICAL
    ]
    if not critical_messages:
        return

    formatted_messages = "\n".join(
        f"[{message.id}] {message.msg}" for message in critical_messages
    )
    raise ImproperlyConfigured(
        "Critical runtime checks failed:\n"
        f"{formatted_messages}\n"
        "The service is refusing to start until the deployment is consistent."
    )
