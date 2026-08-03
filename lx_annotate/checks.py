from __future__ import annotations

import json
import os
from importlib import import_module
from pathlib import Path
from typing import Mapping, Protocol, cast

from django.conf import settings
from django.core.checks import CRITICAL, CheckMessage, Critical, Warning
from django.core.exceptions import ImproperlyConfigured
from django.db import DEFAULT_DB_ALIAS, connections
from django.db.utils import OperationalError, ProgrammingError

from endoreg_db.services.environment_readiness import check_environment_readiness
from endoreg_db.utils.rust_backend import has_native_capability


class DatabaseIntrospectionWithDescriptions(Protocol):
    def table_names(self) -> list[str]: ...

    def get_table_description(self, cursor, table_name: str): ...

    def get_constraints(
        self, cursor, table_name: str
    ) -> Mapping[str, Mapping[str, object]]: ...


# These checks are intentionally not registered with Django's system check
# framework. Django runs registered checks before `migrate`, which creates a
# chicken-and-egg failure for production deployment units whose only job is to
# apply the missing migrations. Runtime startup calls `assert_runtime_checks_pass`
# directly after management commands such as `migrate` have had a chance to heal
# the schema.
_ENDOREG_DB_REQUIRED_COLUMNS: dict[str, tuple[str, ...]] = {
    "endoreg_db_sensitivemeta": ("validation_comment",),
    "endoreg_db_uploadjob": (
        "error_code",
        "next_retry_at",
        "processing_fencing_token",
        "processing_heartbeat_at",
        "processing_lease_expires_at",
        "processing_lease_owner",
        "retry_count",
        "retryable",
        "status",
    ),
    "endoreg_db_videofile": (
        "storage_mode",
        "processed_streamable_relative_path",
        "raw_streamable_relative_path",
    ),
    "endoreg_db_videohlsartifact": (
        "encoding_profile_name",
        "error_code",
        "status",
    ),
    "endoreg_db_medicalledgerwritereceipt": (
        "created_at",
        "idempotency_key",
        "patient_id",
        "record_ids",
        "request_hash",
    ),
    "report_import_attempt": (
        "fencing_token",
        "heartbeat_at",
        "lease_expires_at",
        "owner_id",
        "status",
    ),
}

_ENDOREG_DB_REQUIRED_TABLES: tuple[str, ...] = (
    "endoreg_db_videofile",
    "endoreg_db_sensitivemeta",
    "endoreg_db_sensitivemeta_tags",
    "endoreg_db_auditledger",
    "endoreg_db_ledgerhead",
    "endoreg_db_uploadjob",
    "endoreg_db_videohlsartifact",
    "endoreg_db_medicalledgerwritereceipt",
    "report_import_attempt",
)

_ENDOREG_DB_REQUIRED_CONSTRAINTS: dict[str, tuple[str, ...]] = {
    "endoreg_db_uploadjob": (
        "upload_job_lease_state_consistent",
        "upload_job_retry_state_consistent",
        "upload_job_terminal_error_coded",
    ),
    "endoreg_db_videohlsartifact": (
        "unique_active_video_hls_attempt",
        "unique_ready_video_hls_artifact_kind",
        "video_hls_failure_coded",
    ),
    "endoreg_db_medicalledgerwritereceipt": (
        "medled_receipt_patient_key_uq",
        "medled_receipt_key_nonempty",
        "medled_receipt_hash_nonempty",
    ),
    "report_import_attempt": ("report_attempt_lease_state_consistent",),
}

_ENDOREG_DB_CONSTRAINT_QUERIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "upload_job_retry_state_consistent",
        "endoreg_db_uploadjob",
        """
        (status = %s AND (
            retryable = FALSE
            OR next_retry_at IS NULL
            OR retry_count <= 0
            OR error_code = %s
        ))
        OR (status <> %s AND (retryable = TRUE OR next_retry_at IS NOT NULL))
        """,
        ("retrying", "", "retrying"),
    ),
    (
        "upload_job_terminal_error_coded",
        "endoreg_db_uploadjob",
        "status IN (%s, %s) AND error_code = %s",
        ("error", "lost", ""),
    ),
    (
        "video_hls_failure_coded",
        "endoreg_db_videohlsartifact",
        """
        (status = %s AND error_code = %s)
        OR (status <> %s AND error_code <> %s)
        """,
        ("failed", "", "failed", ""),
    ),
)


def _table_columns(
    table_name: str, *, using: str = DEFAULT_DB_ALIAS
) -> set[str] | None:
    connection = connections[using]
    introspection = cast(
        DatabaseIntrospectionWithDescriptions,
        connection.introspection,
    )

    try:
        table_names = set(introspection.table_names() or [])
    except (OperationalError, ProgrammingError):
        return None

    if table_name not in table_names:
        return set()

    with connection.cursor() as cursor:
        description = introspection.get_table_description(cursor, table_name)
    return {column.name for column in (description or [])}


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


def _count_constraint_violations(
    table_name: str,
    predicate_sql: str,
    parameters: tuple[str, ...],
    *,
    using: str = DEFAULT_DB_ALIAS,
) -> int | None:
    connection = connections[using]
    quoted_table_name = connection.ops.quote_name(table_name)
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT COUNT(*) FROM {quoted_table_name} WHERE {predicate_sql}",
                parameters,
            )
            row = cursor.fetchone()
    except (OperationalError, ProgrammingError):
        return None
    return int(row[0]) if row else 0


def _table_constraint_names(
    table_name: str, *, using: str = DEFAULT_DB_ALIAS
) -> set[str] | None:
    connection = connections[using]
    introspection = cast(
        DatabaseIntrospectionWithDescriptions,
        connection.introspection,
    )
    try:
        with connection.cursor() as cursor:
            constraints = introspection.get_constraints(cursor, table_name)
    except (OperationalError, ProgrammingError):
        return None
    return set(constraints)


def _required_constraint_messages(
    table_name: str,
    required_constraints: tuple[str, ...],
) -> list[CheckMessage]:
    columns = _table_columns(table_name)
    required_columns = set(_ENDOREG_DB_REQUIRED_COLUMNS[table_name])
    if columns is None or not required_columns.issubset(columns):
        return []

    constraint_names = _table_constraint_names(table_name)
    if constraint_names is None:
        return [
            Critical(
                "Unable to inspect endoreg_db database constraints. Verify "
                "database connectivity and service-user introspection permissions.",
                id="lx_annotate.endoreg_db_constraint_introspection_failed",
                obj=table_name,
            )
        ]

    missing_constraints = [
        name for name in required_constraints if name not in constraint_names
    ]
    if not missing_constraints:
        return []
    return [
        Critical(
            "endoreg_db schema is behind the lx_annotate migration override "
            f"set. Table '{table_name}' is missing required constraints: "
            f"{', '.join(missing_constraints)}.",
            id="lx_annotate.endoreg_db_schema_constraint_missing",
            obj=table_name,
        )
    ]


def _constraint_violation_message(
    constraint_name: str,
    table_name: str,
    predicate_sql: str,
    parameters: tuple[str, ...],
) -> CheckMessage | None:
    columns = _table_columns(table_name)
    required_columns = set(_ENDOREG_DB_REQUIRED_COLUMNS[table_name])
    if columns is not None and not required_columns.issubset(columns):
        # The schema check reports missing tables and columns. Avoid running a
        # query that is guaranteed to fail before migrations have created them.
        return None

    violation_count = _count_constraint_violations(
        table_name,
        predicate_sql,
        parameters,
    )
    if violation_count is None:
        return Critical(
            "Unable to inspect endoreg_db constraint data. Verify database "
            "connectivity and service-user query permissions.",
            id="lx_annotate.endoreg_db_constraint_introspection_failed",
            obj=constraint_name,
        )
    if not violation_count:
        return None
    return Critical(
        f"Constraint '{constraint_name}' would be violated by "
        f"{violation_count} existing row(s) in '{table_name}'.",
        id="lx_annotate.endoreg_db_constraint_violated",
        obj=constraint_name,
    )


def lx_annotate_endoreg_db_constraint_checks(app_configs, **kwargs):  # type: ignore[unused-argument]
    messages: list[CheckMessage] = []

    for table_name, required_constraints in _ENDOREG_DB_REQUIRED_CONSTRAINTS.items():
        messages.extend(_required_constraint_messages(table_name, required_constraints))

    for (
        constraint_name,
        table_name,
        predicate_sql,
        parameters,
    ) in _ENDOREG_DB_CONSTRAINT_QUERIES:
        message = _constraint_violation_message(
            constraint_name,
            table_name,
            predicate_sql,
            parameters,
        )
        if message is not None:
            messages.append(message)

    return messages


def _native_capability_messages() -> list[CheckMessage]:
    if not has_native_capability("hls_state_machine", "hls_state_v1"):
        return [
            Critical(
                "The endoreg_db native Rust extension does not provide the required "
                "hls_state_machine/hls_state_v1 capability.",
                id="lx_annotate.hls_native_state_machine_missing",
            )
        ]
    return []


def _environment_readiness_messages() -> list[CheckMessage]:
    messages: list[CheckMessage] = []
    for issue in check_environment_readiness():
        check_cls = Critical if issue.severity == "critical" else Warning
        messages.append(
            check_cls(
                issue.message,
                id=f"lx_annotate.{issue.code}",
                obj=issue.path,
            )
        )
    return messages


def _protected_media_url_messages() -> list[CheckMessage]:
    protected_url = str(os.environ.get("NGINX_PROTECTED_MEDIA_URL", "") or "").strip()
    if not protected_url:
        return [
            Critical(
                "NGINX_PROTECTED_MEDIA_URL must be set for protected media handoff.",
                id="lx_annotate.nginx_protected_media_url_missing",
            )
        ]
    if not protected_url.startswith("/"):
        return [
            Critical(
                "NGINX_PROTECTED_MEDIA_URL must start with '/'.",
                id="lx_annotate.nginx_protected_media_url_invalid",
                obj=protected_url,
            )
        ]
    return []


def _protected_media_root_messages() -> list[CheckMessage]:
    protected_root = str(os.environ.get("PROTECTED_MEDIA_ROOT", "") or "").strip()
    if not protected_root:
        return [
            Critical(
                "PROTECTED_MEDIA_ROOT must be set for Nginx protected media routing.",
                id="lx_annotate.protected_media_root_missing",
            )
        ]

    protected_root_path = Path(protected_root).expanduser().resolve()
    expected_media_root = Path(settings.MEDIA_ROOT).expanduser().resolve()
    if not protected_root_path.exists():
        return [
            Critical(
                f"PROTECTED_MEDIA_ROOT does not exist: {protected_root_path}",
                id="lx_annotate.protected_media_root_not_found",
                obj=str(protected_root_path),
            )
        ]
    if protected_root_path != expected_media_root:
        return [
            Warning(
                "PROTECTED_MEDIA_ROOT does not match Django MEDIA_ROOT. "
                "Verify Nginx alias and X-Accel-Redirect expectations.",
                id="lx_annotate.protected_media_root_mismatch",
                obj=f"{protected_root_path} != {expected_media_root}",
            )
        ]
    return []


def _host_models_module_messages() -> list[CheckMessage]:
    host_models_module = str(
        getattr(settings, "LX_DTYPES_HOST_MODELS_MODULE", "") or ""
    ).strip()
    if not host_models_module:
        return [
            Critical(
                "LX_DTYPES_HOST_MODELS_MODULE must identify the endoreg_db host adapter.",
                id="lx_annotate.lx_dtypes_host_models_module_missing",
            )
        ]
    try:
        import_module(host_models_module)
    except (ImportError, AttributeError, RuntimeError) as exc:
        return [
            Critical(
                "LX_DTYPES_HOST_MODELS_MODULE is not importable: "
                f"{type(exc).__name__}.",
                id="lx_annotate.lx_dtypes_host_models_module_invalid",
                obj=host_models_module,
            )
        ]
    return []


def _knowledge_base_registry_messages() -> list[CheckMessage]:
    configured_path = str(
        getattr(settings, "LX_DTYPES_KB_REGISTRY", "")
        or os.environ.get("LX_DTYPES_KB_REGISTRY", "")
    ).strip()
    if not configured_path:
        return [
            Warning(
                "LX_DTYPES_KB_REGISTRY must identify the governed knowledge-base registry.",
                id="lx_annotate.lx_dtypes_kb_registry_missing",
            )
        ]

    registry_path = Path(configured_path).expanduser().resolve()
    try:
        payload = json.loads(registry_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return [
            Warning(
                f"LX_DTYPES_KB_REGISTRY is not readable valid JSON: {type(exc).__name__}.",
                id="lx_annotate.lx_dtypes_kb_registry_invalid",
            )
        ]
    if not isinstance(payload, dict) or not isinstance(payload.get("modules"), dict):
        return [
            Warning(
                "LX_DTYPES_KB_REGISTRY must contain a modules object.",
                id="lx_annotate.lx_dtypes_kb_registry_schema_invalid",
            )
        ]
    active = payload.get("active")
    if not isinstance(active, dict):
        return [
            Warning(
                "LX_DTYPES_KB_REGISTRY must contain an explicit active bundle identity.",
                id="lx_annotate.lx_dtypes_kb_registry_active_missing",
            )
        ]
    module_name = active.get("module_name")
    version = active.get("version")
    versions = payload["modules"].get(module_name, {})
    if (
        not isinstance(module_name, str)
        or not module_name.strip()
        or not isinstance(version, str)
        or not version.strip()
        or not isinstance(versions, dict)
        or version not in versions
    ):
        return [
            Warning(
                "The active knowledge-base identity is not registered in LX_DTYPES_KB_REGISTRY.",
                id="lx_annotate.lx_dtypes_kb_registry_active_invalid",
            )
        ]

    try:
        from lx_dtypes.models.interface.KnowledgeBaseResolver import load_knowledge_base

        load_knowledge_base(module_name, version=version)
    except Exception as exc:
        return [
            Warning(
                f"The active registered knowledge base cannot be loaded: {type(exc).__name__}.",
                id="lx_annotate.lx_dtypes_kb_registry_active_unloadable",
            )
        ]
    return []


def lx_annotate_environment_checks(app_configs, **kwargs):  # type: ignore[unused-argument]
    messages: list[CheckMessage] = []
    messages.extend(_native_capability_messages())
    messages.extend(_environment_readiness_messages())
    messages.extend(_protected_media_url_messages())
    messages.extend(_protected_media_root_messages())
    messages.extend(_host_models_module_messages())
    messages.extend(_knowledge_base_registry_messages())

    return messages


def assert_runtime_checks_pass() -> None:
    critical_messages = [
        message
        for check in (
            lx_annotate_endoreg_db_schema_checks,
            lx_annotate_endoreg_db_constraint_checks,
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
