from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path
from typing import Any, Literal, TypedDict, cast
from urllib.parse import urljoin, urlparse

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from endoreg_db.models import NetworkNode
from lx_dtypes.models.contracts.hub_media_envelope import (
    HubMediaEnvelopeReceipt,
    validate_hub_media_receipt_matches_envelope,
)

from ..models import OutboundHubTransferJob
from .hub_export_audit import emit_hub_export_audit_event
from .hub_export_cleanup import apply_completed_export_cleanup_policy
from .hub_export_envelope import (
    HubExportEnvelopeConfig,
    PreparedHubExportEnvelope,
    cleanup_persisted_hub_export_envelope,
    prepare_hub_export_envelope,
    resolve_hub_export_envelope_config,
)
from .hub_export_payloads import build_transfer_payload, validate_transfer_payload
from .transfer_transport import TransferTransportConfig

_RAW_UPLOAD_CHUNK_SIZE = 1024 * 1024
_HUB_MEDIA_CONTENT_TYPE = "application/octet-stream"
_HUB_MEDIA_ROLE_HEADER = "X-Hub-Media-Role"
_HUB_MEDIA_ENVELOPE_HEADER = "X-Hub-Media-Envelope"
_MAX_ENVELOPE_HEADER_BYTES = 4 * 1024
HubExportFailureClass = Literal[
    "configuration_rejection",
    "authorization_denial",
    "integrity_inconsistency",
    "transient_retry",
]


HubTransportConfig = TransferTransportConfig


class RemoteTransferStatusPayload(TypedDict, total=False):
    id: str
    transfer_key: str
    source_node_key: str
    target_node_key: str
    source_center_key: str
    resource_kind: str
    resource_hash: str
    processed_media_hash: str
    transfer_mode: str
    transfer_status: str
    processing_decision: str
    payload_schema_version: str
    status_detail: str
    envelope_receipt: dict[str, object]


class RemoteTransferIntegrityError(ValueError):
    """The hub acknowledgement does not match the outbound transfer identity."""


class RemoteTransferAuthorizationError(requests.RequestException):
    """The authenticated hub rejected the source node identity or scope."""


class RemoteTransferConfigurationError(requests.RequestException):
    """The hub deterministically rejected the transfer request."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        rejection_code: str | None = None,
        rejection_phase: str | None = None,
        error_fields: tuple[str, ...] = (),
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.rejection_code = rejection_code
        self.rejection_phase = rejection_phase
        self.error_fields = error_fields


def _normalize_env_suffix(node_key: str) -> str:
    return str(node_key or "").strip().upper().replace("-", "_")


def resolve_outbound_node_secret(
    *,
    source_node_key: str,
    explicit_secret: str | None = None,
) -> str:
    if explicit_secret:
        return explicit_secret

    node_specific = (
        f"LX_ANNOTATE_HUB_SOURCE_NODE_SECRET_{_normalize_env_suffix(source_node_key)}"
    )
    for name in (node_specific, "LX_ANNOTATE_HUB_SOURCE_NODE_SECRET"):
        value = str(os.getenv(name, "") or "").strip()
        if value:
            return value

    for name in (f"{node_specific}_FILE", "LX_ANNOTATE_HUB_SOURCE_NODE_SECRET_FILE"):
        path_value = str(os.getenv(name, "") or "").strip()
        if not path_value:
            continue
        secret_path = _require_readable_file(path_value, label=name)
        value = secret_path.read_text(encoding="utf-8").strip()
        if value:
            return value
        raise ValueError(f"Outbound hub node secret file is empty: {secret_path}")

    raise ValueError(
        f"Missing outbound hub node secret for source_node_key={source_node_key!r}.",
    )


def _require_readable_file(value: str, *, label: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_file() or not os.access(path, os.R_OK):
        raise ValueError(f"{label} must point to a readable regular file: {path}")
    return path


def resolve_hub_transport_config() -> HubTransportConfig:
    require_mtls = bool(getattr(settings, "LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS", True))
    cert_value = str(
        getattr(settings, "LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE", "") or "",
    ).strip()
    key_value = str(
        getattr(settings, "LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE", "") or "",
    ).strip()
    ca_value = str(
        getattr(settings, "LX_ANNOTATE_HUB_EXPORT_CA_FILE", "") or "",
    ).strip()

    cert: tuple[str, str] | None = None
    if require_mtls:
        if not cert_value or not key_value:
            raise ValueError(
                "Outbound hub transfer requires mTLS client certificate and key files.",
            )
        cert_path = _require_readable_file(
            cert_value,
            label="LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE",
        )
        key_path = _require_readable_file(
            key_value,
            label="LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE",
        )
        cert = (str(cert_path), str(key_path))
    elif cert_value or key_value:
        raise ValueError(
            "Outbound hub client certificate and key must not be partially configured.",
        )

    verify: str | bool = True
    if ca_value:
        verify = str(
            _require_readable_file(ca_value, label="LX_ANNOTATE_HUB_EXPORT_CA_FILE"),
        )
    return HubTransportConfig(cert=cert, verify=verify)


def resolve_hub_request_timeout_seconds(explicit_timeout: int | None = None) -> int:
    timeout_seconds = (
        explicit_timeout
        if explicit_timeout is not None
        else getattr(settings, "LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS", 21600)
    )
    if not isinstance(timeout_seconds, int) or isinstance(timeout_seconds, bool):
        raise ValueError(
            "LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS must be an integer.",
        )
    if timeout_seconds <= 0:
        raise ValueError("request_timeout_s must be positive.")
    return timeout_seconds


def _safe_rejection_token(value: object) -> str | None:
    if not isinstance(value, str) or not 1 <= len(value) <= 64:
        return None
    if not value.isascii() or not value[0].isalpha():
        return None
    if any(
        character not in "abcdefghijklmnopqrstuvwxyz0123456789_" for character in value
    ):
        return None
    return value


def _remote_rejection_context(
    response: requests.Response,
) -> tuple[str | None, str | None, tuple[str, ...]]:
    content = response.content
    if isinstance(content, bytes) and len(content) > 16 * 1024:
        return None, None, ()
    try:
        payload = response.json()
    except (requests.JSONDecodeError, TypeError, ValueError):
        return None, None, ()
    if not isinstance(payload, dict):
        return None, None, ()
    rejection_code = _safe_rejection_token(payload.get("rejection_code"))
    rejection_phase = _safe_rejection_token(payload.get("rejection_phase"))
    raw_error_fields = payload.get("error_fields")
    error_fields = (
        tuple(
            field
            for item in raw_error_fields[:8]
            if (field := _safe_rejection_token(item)) is not None
        )
        if isinstance(raw_error_fields, list)
        else ()
    )
    return rejection_code, rejection_phase, error_fields


def _raise_for_hub_response(response: requests.Response) -> None:
    status_code = response.status_code
    if status_code in {401, 403}:
        raise RemoteTransferAuthorizationError(
            f"Hub transfer authorization denied with HTTP {status_code}.",
        )
    if status_code == 400:
        rejection_code, rejection_phase, error_fields = _remote_rejection_context(
            response
        )
        context_parts = [f"code={rejection_code}"] if rejection_code else []
        if rejection_phase:
            context_parts.append(f"phase={rejection_phase}")
        if error_fields:
            context_parts.append(f"fields={','.join(error_fields)}")
        context = f" ({'; '.join(context_parts)})" if context_parts else ""
        raise RemoteTransferConfigurationError(
            f"Hub transfer request rejected with HTTP {status_code}{context}.",
            status_code=status_code,
            rejection_code=rejection_code,
            rejection_phase=rejection_phase,
            error_fields=error_fields,
        )
    if isinstance(status_code, int) and 300 <= status_code < 400:
        raise requests.RequestException(
            "Hub transfer redirects are prohibited to prevent credential disclosure.",
        )
    response.raise_for_status()


def hub_headers(*, source_node: NetworkNode, source_secret: str) -> dict[str, str]:
    return {
        "X-Network-Node-Key": source_node.node_key,
        "X-Network-Node-Secret": source_secret,
    }


def hub_transfer_url(target_node: NetworkNode) -> str:
    if not target_node.base_url:
        raise ValueError("target_node.base_url must be configured for hub export.")
    parsed = urlparse(target_node.base_url)
    if parsed.scheme.lower() != "https":
        raise ValueError("target_node.base_url must use https for outbound hub export.")
    return urljoin(target_node.base_url.rstrip("/") + "/", "api/media/hub/transfers/")


def hub_transfer_media_url(target_node: NetworkNode, transfer_key: str) -> str:
    base = hub_transfer_url(target_node)
    return urljoin(base, f"{transfer_key}/media/")


def hub_transfer_status_url(target_node: NetworkNode, transfer_key: str) -> str:
    base = hub_transfer_url(target_node)
    return urljoin(base, f"{transfer_key}/status/")


def _registration_payload_metrics(payload: dict[str, Any]) -> dict[str, Any]:
    """Return privacy-safe payload dimensions for operational diagnostics."""
    resource_rows = payload.get("resource_rows")
    if not isinstance(resource_rows, dict):
        return {
            "registration_anonymized_text_characters": 0,
            "registration_collection_counts": {},
        }

    raw_pdf_file = resource_rows.get("raw_pdf_file")
    anonymized_text = (
        raw_pdf_file.get("anonymized_text") if isinstance(raw_pdf_file, dict) else None
    )
    collection_counts = {
        key: len(value)
        for key, value in resource_rows.items()
        if isinstance(value, list)
    }
    return {
        "registration_anonymized_text_characters": (
            len(anonymized_text) if isinstance(anonymized_text, str) else 0
        ),
        "registration_collection_counts": collection_counts,
    }


class CiphertextUploadStream:
    def __init__(
        self,
        *,
        media_path: Path,
        media_role: str,
        envelope_json: str,
        chunk_size: int = _RAW_UPLOAD_CHUNK_SIZE,
    ) -> None:
        self.media_path = media_path
        self.media_role = media_role
        self.envelope_json = envelope_json
        self.chunk_size = chunk_size
        self.content_type = _HUB_MEDIA_CONTENT_TYPE
        self.content_length = media_path.stat().st_size
        try:
            envelope_header_bytes = envelope_json.encode("ascii")
        except UnicodeEncodeError as exc:
            raise ValueError(
                "Hub media envelope header must contain ASCII JSON."
            ) from exc
        if len(envelope_header_bytes) > _MAX_ENVELOPE_HEADER_BYTES:
            raise ValueError("Hub media envelope metadata exceeds the header limit.")

    def __iter__(self) -> Iterator[bytes]:
        with self.media_path.open("rb") as media_handle:
            while True:
                chunk = media_handle.read(self.chunk_size)
                if not chunk:
                    break
                yield chunk

    def __len__(self) -> int:
        return self.content_length


def _processed_media_field(
    outbound_job: OutboundHubTransferJob,
) -> tuple[Any, str]:
    if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO:
        video = outbound_job.video_file
        if video is None or not video.processed_file or not video.processed_file.name:
            raise ValueError("Processed video file is missing for outbound transfer.")
        return video.processed_file, "processed"

    report = outbound_job.raw_pdf_file
    if report is None or not report.processed_file or not report.processed_file.name:
        raise ValueError("Processed report file is missing for outbound transfer.")
    return report.processed_file, "processed"


def _processed_media_envelope(
    outbound_job: OutboundHubTransferJob,
) -> tuple[Any, str]:
    field_file, media_role = _processed_media_field(outbound_job)
    return field_file, media_role


def _resource_hash(outbound_job: OutboundHubTransferJob) -> str:
    resource = (
        outbound_job.video_file
        if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO
        else outbound_job.raw_pdf_file
    )
    field_name = (
        "video_hash"
        if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO
        else "pdf_hash"
    )
    value = str(getattr(resource, field_name, "") or "").strip()
    if not value:
        raise ValueError("Outbound transfer resource hash is missing.")
    return value


def _prepare_media_envelope(
    *,
    outbound_job: OutboundHubTransferJob,
    source_node: NetworkNode,
    config: HubExportEnvelopeConfig,
) -> PreparedHubExportEnvelope:
    source_center = outbound_job.source_center
    source_center_key = str(getattr(source_center, "center_key", "") or "").strip()
    if not source_center_key:
        raise ValueError("Outbound transfer source center is missing.")
    field_file, _media_role = _processed_media_envelope(outbound_job)
    resource_kind: Literal["video", "report"] = (
        "video"
        if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO
        else "report"
    )
    return prepare_hub_export_envelope(
        field_file=field_file,
        config=config,
        transfer_key=str(outbound_job.transfer_key),
        source_node_key=str(source_node.node_key),
        source_center_key=source_center_key,
        target_node_key=str(outbound_job.target_node.node_key),
        resource_kind=resource_kind,
        resource_hash=_resource_hash(outbound_job),
        processed_media_hash=_expected_processed_media_hash(outbound_job),
    )


def _validated_envelope_receipt(
    *,
    response_data: RemoteTransferStatusPayload,
    prepared: PreparedHubExportEnvelope,
) -> HubMediaEnvelopeReceipt:
    raw_receipt = response_data.get("envelope_receipt")
    if not isinstance(raw_receipt, dict):
        raise RemoteTransferIntegrityError(
            "Hub applied media without a typed envelope receipt.",
        )
    try:
        receipt = HubMediaEnvelopeReceipt.model_validate(raw_receipt)
        validate_hub_media_receipt_matches_envelope(
            envelope=prepared.envelope,
            receipt=receipt,
        )
    except ValueError as exc:
        raise RemoteTransferIntegrityError(
            f"Hub envelope receipt mismatch: {exc}",
        ) from exc
    if (
        receipt.ciphertext_sha256 != prepared.ciphertext_sha256
        or receipt.ciphertext_size != prepared.ciphertext_size
    ):
        raise RemoteTransferIntegrityError(
            "Hub envelope receipt does not match the uploaded ciphertext.",
        )
    return receipt


@transaction.atomic
def apply_remote_status(
    outbound_job: OutboundHubTransferJob,
    response_data: RemoteTransferStatusPayload,
    *,
    expected_source_node_key: str,
    validated_receipt: HubMediaEnvelopeReceipt | None = None,
) -> OutboundHubTransferJob:
    _validate_remote_transfer_status(
        outbound_job,
        response_data,
        expected_source_node_key=expected_source_node_key,
    )
    previous_status = outbound_job.local_status
    remote_transfer_id = str(response_data.get("id", "") or "")
    remote_transfer_status = str(response_data.get("transfer_status", "") or "")
    remote_processing_decision = str(response_data.get("processing_decision", "") or "")

    outbound_job.remote_transfer_id = remote_transfer_id
    outbound_job.remote_transfer_status = remote_transfer_status
    outbound_job.remote_processing_decision = remote_processing_decision

    if remote_transfer_status == "awaiting_media":
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA
        outbound_job.failure_class = ""
    elif remote_transfer_status == "applied":
        if validated_receipt is None:
            raise RemoteTransferIntegrityError(
                "Hub applied media without a locally validated envelope receipt.",
            )
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.COMPLETED
        outbound_job.completed_at = timezone.now()
        outbound_job.failure_class = ""
        outbound_job.last_error = ""
        outbound_job.envelope_receipt = validated_receipt.model_dump(mode="json")
    elif remote_transfer_status in {"failed", "inconsistent"}:
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        outbound_job.failure_class = (
            OutboundHubTransferJob.FailureClass.INTEGRITY_INCONSISTENCY
            if remote_transfer_status == "inconsistent"
            else OutboundHubTransferJob.FailureClass.CONFIGURATION_REJECTION
        )
        outbound_job.last_error = str(response_data.get("status_detail", "") or "")

    outbound_job.save(
        update_fields=[
            "remote_transfer_id",
            "remote_transfer_status",
            "remote_processing_decision",
            "local_status",
            "failure_class",
            "completed_at",
            "last_error",
            "envelope_receipt",
            "updated_at",
        ],
    )
    if outbound_job.local_status == OutboundHubTransferJob.LocalStatus.COMPLETED:
        apply_completed_export_cleanup_policy(
            outbound_job,
            source_node_key=expected_source_node_key,
        )
    emit_hub_export_audit_event(
        "hub_export.completed"
        if outbound_job.local_status == OutboundHubTransferJob.LocalStatus.COMPLETED
        else "hub_export.registered"
        if previous_status == OutboundHubTransferJob.LocalStatus.REGISTERING
        else "hub_export.remote_status_updated",
        outbound_job=outbound_job,
        source_node_key=expected_source_node_key,
        remote_transfer_status=remote_transfer_status,
        remote_processing_decision=remote_processing_decision,
    )
    return outbound_job


def _expected_processed_media_hash(
    outbound_job: OutboundHubTransferJob,
) -> str:
    if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO:
        video = outbound_job.video_file
        return str(getattr(video, "processed_video_hash", "") or "").strip()

    report = outbound_job.raw_pdf_file
    state = getattr(report, "state", None)
    return str(getattr(state, "processed_file_sha256", "") or "").strip()


def _validate_remote_transfer_status(
    outbound_job: OutboundHubTransferJob,
    response_data: RemoteTransferStatusPayload,
    *,
    expected_source_node_key: str,
) -> None:
    source_center = outbound_job.source_center
    video = outbound_job.video_file
    report = outbound_job.raw_pdf_file
    expected_values = {
        "transfer_key": str(outbound_job.transfer_key),
        "source_node_key": expected_source_node_key,
        "target_node_key": str(outbound_job.target_node.node_key),
        "source_center_key": str(getattr(source_center, "center_key", "") or ""),
        "resource_kind": str(outbound_job.resource_kind),
        "resource_hash": (
            str(getattr(video, "video_hash", "") or "")
            if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO
            else str(getattr(report, "pdf_hash", "") or "")
        ),
        "processed_media_hash": _expected_processed_media_hash(outbound_job),
        "transfer_mode": str(outbound_job.transfer_mode),
        "payload_schema_version": "3.0",
    }
    mismatches = [
        field_name
        for field_name, expected_value in expected_values.items()
        if not expected_value
        or str(response_data.get(field_name, "") or "").strip() != expected_value
    ]
    if not str(response_data.get("id", "") or "").strip():
        mismatches.append("id")
    if mismatches:
        raise RemoteTransferIntegrityError(
            "Hub acknowledgement identity mismatch for: "
            + ", ".join(sorted(set(mismatches))),
        )


def mark_outbound_job_failure(
    outbound_job: OutboundHubTransferJob,
    *,
    error_message: str,
    source_node_key: str,
    failure_class: HubExportFailureClass,
    retryable: bool = True,
    remote_http_status: int | None = None,
    rejection_code: str | None = None,
    rejection_phase: str | None = None,
    rejection_error_fields: tuple[str, ...] = (),
) -> OutboundHubTransferJob:
    attempt_number = int(outbound_job.retry_count or 0) + 1
    remote_rejection_context: dict[str, object] = {}
    if remote_http_status is not None:
        remote_rejection_context["remote_http_status"] = remote_http_status
    if rejection_code is not None:
        remote_rejection_context["rejection_code"] = rejection_code
    if rejection_phase is not None:
        remote_rejection_context["rejection_phase"] = rejection_phase
    if rejection_error_fields:
        remote_rejection_context["rejection_error_fields"] = list(
            rejection_error_fields
        )
    outbound_job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
    outbound_job.failure_class = failure_class
    outbound_job.last_error = error_message
    if retryable:
        outbound_job.retry_count = int(outbound_job.retry_count or 0) + 1
    outbound_job.last_attempt_at = timezone.now()
    outbound_job.save(
        update_fields=[
            "local_status",
            "failure_class",
            "last_error",
            "retry_count",
            "last_attempt_at",
            "updated_at",
        ],
    )
    emit_hub_export_audit_event(
        "hub_export.failed",
        outbound_job=outbound_job,
        source_node_key=source_node_key,
        error=error_message,
        failure_class=failure_class,
        retry_count=int(outbound_job.retry_count or 0),
        attempt_number=attempt_number,
        **remote_rejection_context,
    )
    return outbound_job


def fetch_remote_transfer_status(
    *,
    outbound_job: OutboundHubTransferJob,
    source_node: NetworkNode,
    secret: str,
    request_timeout_s: int,
    transport: HubTransportConfig | None = None,
) -> RemoteTransferStatusPayload:
    resolved_transport = transport or resolve_hub_transport_config()
    response = requests.get(
        hub_transfer_status_url(outbound_job.target_node, outbound_job.transfer_key),
        headers=hub_headers(source_node=source_node, source_secret=secret),
        timeout=request_timeout_s,
        **resolved_transport.request_kwargs(),
    )
    _raise_for_hub_response(response)
    return cast(RemoteTransferStatusPayload, response.json())


def run_outbound_transfer_job(
    *,
    outbound_job_id: str,
    source_node_key: str,
    source_secret: str | None = None,
    request_timeout_s: int | None = None,
) -> OutboundHubTransferJob:
    resolved_request_timeout_s = resolve_hub_request_timeout_seconds(request_timeout_s)
    outbound_job = OutboundHubTransferJob.objects.select_related(
        "video_file__state",
        "video_file__sensitive_meta",
        "raw_pdf_file__state",
        "raw_pdf_file__sensitive_meta",
        "source_center",
        "target_node",
    ).get(pk=outbound_job_id)

    if outbound_job.local_status == OutboundHubTransferJob.LocalStatus.COMPLETED:
        return outbound_job

    try:
        transport = resolve_hub_transport_config()
        envelope_config = resolve_hub_export_envelope_config()
        source_node = NetworkNode.objects.get(
            node_key=source_node_key,
            is_active=True,
        )
        secret = resolve_outbound_node_secret(
            source_node_key=source_node_key,
            explicit_secret=source_secret,
        )
        payload = build_transfer_payload(
            outbound_job=outbound_job,
            source_node=source_node,
        )
        validate_transfer_payload(payload)
        registration_url = hub_transfer_url(outbound_job.target_node)
    except (NetworkNode.DoesNotExist, OSError, ValueError) as exc:
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer configuration or payload rejected: {exc}",
            source_node_key=source_node_key,
            failure_class="configuration_rejection",
            retryable=False,
        )

    now = timezone.now()
    if outbound_job.local_status in {
        OutboundHubTransferJob.LocalStatus.MARKED,
        OutboundHubTransferJob.LocalStatus.FAILED,
    }:
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.QUEUED
        outbound_job.queued_at = now
        emit_hub_export_audit_event(
            "hub_export.retry_queued"
            if outbound_job.retry_count
            else "hub_export.queued",
            outbound_job=outbound_job,
            source_node_key=source_node_key,
        )

    outbound_job.local_status = OutboundHubTransferJob.LocalStatus.REGISTERING
    outbound_job.failure_class = ""
    outbound_job.last_error = ""
    outbound_job.registration_started_at = now
    outbound_job.last_attempt_at = now
    outbound_job.save(
        update_fields=[
            "local_status",
            "failure_class",
            "last_error",
            "queued_at",
            "registration_started_at",
            "last_attempt_at",
            "updated_at",
        ],
    )
    emit_hub_export_audit_event(
        "hub_export.register_started",
        outbound_job=outbound_job,
        source_node_key=source_node_key,
        request_timeout_seconds=resolved_request_timeout_s,
        **_registration_payload_metrics(cast(dict[str, Any], payload)),
    )

    try:
        register_response = requests.post(
            registration_url,
            # The payload has already passed both typed sender validation and
            # the canonical lx_dtypes contract. Requests' recursive JSON type
            # cannot express this TypedDict boundary without a narrow cast.
            json=cast(Any, payload),
            headers=hub_headers(source_node=source_node, source_secret=secret),
            timeout=resolved_request_timeout_s,
            **transport.request_kwargs(),
        )
        if register_response.status_code == 409:
            cleanup_persisted_hub_export_envelope(
                config=envelope_config,
                transfer_key=str(outbound_job.transfer_key),
            )
            return mark_outbound_job_failure(
                outbound_job,
                error_message=(
                    "Hub transfer registration rejected as a canonical replay conflict"
                ),
                source_node_key=source_node.node_key,
                failure_class="integrity_inconsistency",
                retryable=False,
            )
        _raise_for_hub_response(register_response)
        register_payload = cast(RemoteTransferStatusPayload, register_response.json())
        applied_envelope: PreparedHubExportEnvelope | None = None
        if register_payload.get("transfer_status") == "applied":
            applied_envelope = _prepare_media_envelope(
                outbound_job=outbound_job,
                source_node=source_node,
                config=envelope_config,
            )
            validated_receipt = _validated_envelope_receipt(
                response_data=register_payload,
                prepared=applied_envelope,
            )
        else:
            validated_receipt = None
        apply_remote_status(
            outbound_job,
            register_payload,
            expected_source_node_key=source_node.node_key,
            validated_receipt=validated_receipt,
        )
        if applied_envelope is not None:
            applied_envelope.cleanup()
    except RemoteTransferIntegrityError as exc:
        cleanup_persisted_hub_export_envelope(
            config=envelope_config,
            transfer_key=str(outbound_job.transfer_key),
        )
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer acknowledgement inconsistent: {exc}",
            source_node_key=source_node.node_key,
            failure_class="integrity_inconsistency",
            retryable=False,
        )
    except RemoteTransferAuthorizationError as exc:
        cleanup_persisted_hub_export_envelope(
            config=envelope_config,
            transfer_key=str(outbound_job.transfer_key),
        )
        return mark_outbound_job_failure(
            outbound_job,
            error_message=str(exc),
            source_node_key=source_node.node_key,
            failure_class="authorization_denial",
            retryable=False,
        )
    except RemoteTransferConfigurationError as exc:
        cleanup_persisted_hub_export_envelope(
            config=envelope_config,
            transfer_key=str(outbound_job.transfer_key),
        )
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer registration rejected: {exc}",
            source_node_key=source_node.node_key,
            failure_class="configuration_rejection",
            retryable=False,
            remote_http_status=exc.status_code,
            rejection_code=exc.rejection_code,
            rejection_phase=exc.rejection_phase,
            rejection_error_fields=exc.error_fields,
        )
    except requests.RequestException as exc:
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer registration failed: {exc}",
            source_node_key=source_node.node_key,
            failure_class="transient_retry",
        )

    if outbound_job.local_status != OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA:
        return outbound_job

    prepared: PreparedHubExportEnvelope | None = None
    try:
        prepared = _prepare_media_envelope(
            outbound_job=outbound_job,
            source_node=source_node,
            config=envelope_config,
        )
        _field_file, media_role = _processed_media_envelope(outbound_job)
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.UPLOADING
        outbound_job.media_upload_started_at = timezone.now()
        outbound_job.last_attempt_at = outbound_job.media_upload_started_at
        outbound_job.save(
            update_fields=[
                "local_status",
                "media_upload_started_at",
                "last_attempt_at",
                "updated_at",
            ],
        )
        emit_hub_export_audit_event(
            "hub_export.upload_started",
            outbound_job=outbound_job,
            source_node_key=source_node.node_key,
            request_timeout_seconds=resolved_request_timeout_s,
            plaintext_bytes=prepared.envelope.plaintext_size,
            ciphertext_bytes=prepared.ciphertext_size,
            upload_chunk_bytes=_RAW_UPLOAD_CHUNK_SIZE,
        )

        upload_stream = CiphertextUploadStream(
            media_path=prepared.ciphertext_path,
            media_role=media_role,
            envelope_json=prepared.envelope.model_dump_json(),
        )
        headers = hub_headers(source_node=source_node, source_secret=secret)
        headers["Content-Type"] = upload_stream.content_type
        headers["Content-Length"] = str(upload_stream.content_length)
        headers[_HUB_MEDIA_ROLE_HEADER] = upload_stream.media_role
        headers[_HUB_MEDIA_ENVELOPE_HEADER] = upload_stream.envelope_json
        media_response = requests.post(
            hub_transfer_media_url(
                outbound_job.target_node,
                outbound_job.transfer_key,
            ),
            data=upload_stream,
            headers=headers,
            timeout=resolved_request_timeout_s,
            **transport.request_kwargs(),
        )
        _raise_for_hub_response(media_response)
        media_payload = cast(RemoteTransferStatusPayload, media_response.json())
        validated_receipt = _validated_envelope_receipt(
            response_data=media_payload,
            prepared=prepared,
        )
        apply_remote_status(
            outbound_job,
            media_payload,
            expected_source_node_key=source_node.node_key,
            validated_receipt=validated_receipt,
        )
        if outbound_job.local_status == OutboundHubTransferJob.LocalStatus.COMPLETED:
            prepared.cleanup()
    except RemoteTransferIntegrityError as exc:
        if prepared is not None:
            prepared.cleanup()
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer acknowledgement inconsistent: {exc}",
            source_node_key=source_node.node_key,
            failure_class="integrity_inconsistency",
            retryable=False,
        )
    except RemoteTransferAuthorizationError as exc:
        if prepared is not None:
            prepared.cleanup()
        return mark_outbound_job_failure(
            outbound_job,
            error_message=str(exc),
            source_node_key=source_node.node_key,
            failure_class="authorization_denial",
            retryable=False,
        )
    except RemoteTransferConfigurationError as exc:
        if prepared is not None:
            prepared.cleanup()
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer media upload rejected: {exc}",
            source_node_key=source_node.node_key,
            failure_class="configuration_rejection",
            retryable=False,
            remote_http_status=exc.status_code,
            rejection_code=exc.rejection_code,
            rejection_phase=exc.rejection_phase,
            rejection_error_fields=exc.error_fields,
        )
    except requests.RequestException as exc:
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer media upload failed: {exc}",
            source_node_key=source_node.node_key,
            failure_class="transient_retry",
        )
    except (OSError, ValueError) as exc:
        if prepared is not None:
            prepared.cleanup()
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer processed media rejected: {exc}",
            source_node_key=source_node.node_key,
            failure_class="configuration_rejection",
            retryable=False,
        )
    return outbound_job
