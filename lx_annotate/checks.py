from __future__ import annotations

import os
from pathlib import Path

from django.conf import settings
from django.core.checks import CRITICAL, CheckMessage, Critical, Warning
from django.core.exceptions import ImproperlyConfigured
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.utils import OperationalError, ProgrammingError

from endoreg_db.services.environment_readiness import check_environment_readiness


# These checks are intentionally not registered with Django's system check
# framework. Django runs registered checks before `migrate`, which creates a
# chicken-and-egg failure for production deployment units whose only job is to
# apply the missing migrations. Runtime startup calls `assert_runtime_checks_pass`
# directly after management commands such as `migrate` have had a chance to heal
# the schema.
_ENDOREG_DB_REQUIRED_COLUMNS: dict[str, tuple[str, ...]] = {
    "endoreg_db_sensitivemeta": ("validation_comment",),
    "endoreg_db_videofile": (
        "storage_mode",
        "processed_streamable_relative_path",
        "raw_streamable_relative_path",
    ),
}

_ENDOREG_DB_REQUIRED_TABLES: tuple[str, ...] = (
    "endoreg_db_videofile",
    "endoreg_db_rawpdf",
    "endoreg_db_sensitivemeta",
    "endoreg_db_sensitivemeta_tags",
    "endoreg_db_auditledger",
    "endoreg_db_ledgerhead",
)


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


def lx_annotate_endoreg_db_schema_checks(app_configs, **kwargs):  # type: ignore[unused-argument]
    messages: list[CheckMessage] = []

    for table_name in _ENDOREG_DB_REQUIRED_TABLES:
        columns = _table_columns(table_name)
        if columns is None:
            messages.append(
                Critical(
                    "Unable to inspect endoreg_db schema. Verify database connectivity "
                    "and service-user introspection permissions before serving traffic.",
                    id="lx_annotate.endoreg_db_schema_introspection_failed",
                    obj=table_name,
                )
            )
            continue
        if columns:
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
            messages.append(
                Critical(
                    "Unable to inspect endoreg_db schema. Verify database connectivity "
                    "and service-user introspection permissions before serving traffic.",
                    id="lx_annotate.endoreg_db_schema_introspection_failed",
                    obj=table_name,
                )
            )
            continue
        if not columns:
            continue

        missing_columns = [
            column for column in required_columns if column not in columns
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
        message
        for check in (
            lx_annotate_endoreg_db_schema_checks,
            lx_annotate_environment_checks,
        )
        for message in check(None)
        if message.level >= CRITICAL
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
