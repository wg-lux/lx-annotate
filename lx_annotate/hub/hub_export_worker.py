from __future__ import annotations

import os
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator, TypedDict, cast
from urllib.parse import urljoin
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.utils import timezone

from endoreg_db.models import NetworkNode
from endoreg_db.utils.storage import ensure_local_file

from .hub_export_audit import emit_hub_export_audit_event
from .hub_export_cleanup import apply_completed_export_cleanup_policy
from .hub_export_payloads import build_transfer_payload, validate_transfer_payload
from ..models import OutboundHubTransferJob

_MULTIPART_UPLOAD_CHUNK_SIZE = 1024 * 1024


class HubTransportRequestKwargs(TypedDict, total=False):
    allow_redirects: bool
    verify: str | bool
    cert: tuple[str, str]


@dataclass(frozen=True)
class HubTransportConfig:
    cert: tuple[str, str] | None
    verify: str | bool

    def request_kwargs(self) -> HubTransportRequestKwargs:
        kwargs: HubTransportRequestKwargs = {
            "allow_redirects": False,
            "verify": self.verify,
        }
        if self.cert is not None:
            kwargs["cert"] = self.cert
        return kwargs


class RemoteTransferStatusPayload(TypedDict, total=False):
    id: str
    transfer_status: str
    processing_decision: str
    status_detail: str


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
        f"Missing outbound hub node secret for source_node_key={source_node_key!r}."
    )


def _require_readable_file(value: str, *, label: str) -> Path:
    path = Path(value).expanduser()
    if not path.is_file() or not os.access(path, os.R_OK):
        raise ValueError(f"{label} must point to a readable regular file: {path}")
    return path


def resolve_hub_transport_config() -> HubTransportConfig:
    require_mtls = bool(getattr(settings, "LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS", True))
    cert_value = str(
        getattr(settings, "LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE", "") or ""
    ).strip()
    key_value = str(
        getattr(settings, "LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE", "") or ""
    ).strip()
    ca_value = str(
        getattr(settings, "LX_ANNOTATE_HUB_EXPORT_CA_FILE", "") or ""
    ).strip()

    cert: tuple[str, str] | None = None
    if require_mtls:
        if not cert_value or not key_value:
            raise ValueError(
                "Outbound hub transfer requires mTLS client certificate and key files."
            )
        cert_path = _require_readable_file(
            cert_value, label="LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE"
        )
        key_path = _require_readable_file(
            key_value, label="LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE"
        )
        cert = (str(cert_path), str(key_path))
    elif cert_value or key_value:
        raise ValueError(
            "Outbound hub client certificate and key must not be partially configured."
        )

    verify: str | bool = True
    if ca_value:
        verify = str(
            _require_readable_file(ca_value, label="LX_ANNOTATE_HUB_EXPORT_CA_FILE")
        )
    return HubTransportConfig(cert=cert, verify=verify)


def _raise_for_hub_response(response: requests.Response) -> None:
    status_code = response.status_code
    if isinstance(status_code, int) and 300 <= status_code < 400:
        raise requests.RequestException(
            "Hub transfer redirects are prohibited to prevent credential disclosure."
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


def _multipart_header_value(value: str) -> str:
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\r", "")
        .replace("\n", "")
    )


class MultipartUploadStream:
    def __init__(
        self,
        *,
        media_path: Path,
        media_role: str,
        upload_file_name: str,
        chunk_size: int = _MULTIPART_UPLOAD_CHUNK_SIZE,
    ) -> None:
        self.media_path = media_path
        self.media_role = media_role
        self.upload_file_name = Path(upload_file_name).name
        self.chunk_size = chunk_size
        self.boundary = f"lx-annotate-{uuid.uuid4().hex}"
        self.content_type = f"multipart/form-data; boundary={self.boundary}"
        self._prefix = self._build_prefix()
        self._suffix = f"\r\n--{self.boundary}--\r\n".encode("utf-8")
        self.content_length = (
            len(self._prefix) + media_path.stat().st_size + len(self._suffix)
        )

    def _build_prefix(self) -> bytes:
        file_name = _multipart_header_value(self.upload_file_name)
        media_role = _multipart_header_value(self.media_role)
        return (
            f"--{self.boundary}\r\n"
            'Content-Disposition: form-data; name="media_role"\r\n\r\n'
            f"{media_role}\r\n"
            f"--{self.boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'
            "Content-Type: application/octet-stream\r\n\r\n"
        ).encode("utf-8")

    def __iter__(self) -> Iterator[bytes]:
        yield self._prefix
        with self.media_path.open("rb") as media_handle:
            while True:
                chunk = media_handle.read(self.chunk_size)
                if not chunk:
                    break
                yield chunk
        yield self._suffix

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


def _pseudonymous_upload_file_name(
    outbound_job: OutboundHubTransferJob,
    *,
    media_path: Path,
) -> str:
    suffix = media_path.suffix.lower()
    if outbound_job.resource_kind == OutboundHubTransferJob.ResourceKind.VIDEO:
        video = outbound_job.video_file
        digest = str(getattr(video, "processed_video_hash", "") or "").strip()
        resource_hash = str(getattr(video, "video_hash", "") or "").strip()
    else:
        report = outbound_job.raw_pdf_file
        state = getattr(report, "state", None)
        digest = str(getattr(state, "processed_file_sha256", "") or "").strip()
        resource_hash = str(getattr(report, "pdf_hash", "") or "").strip()
    if not digest and not resource_hash:
        raise ValueError("Outbound transfer resource hash is missing.")
    return f"{digest or resource_hash}{suffix}"


@contextmanager
def _localized_processed_media_path(
    outbound_job: OutboundHubTransferJob,
) -> Iterator[tuple[Path, str]]:
    field_file, media_role = _processed_media_field(outbound_job)
    suffix = Path(str(field_file.name or "")).suffix or None
    with ensure_local_file(field_file, suffix=suffix) as local_path:
        yield local_path, media_role


def apply_remote_status(
    outbound_job: OutboundHubTransferJob,
    response_data: RemoteTransferStatusPayload,
) -> OutboundHubTransferJob:
    previous_status = outbound_job.local_status
    remote_transfer_id = str(response_data.get("id", "") or "")
    remote_transfer_status = str(response_data.get("transfer_status", "") or "")
    remote_processing_decision = str(response_data.get("processing_decision", "") or "")

    outbound_job.remote_transfer_id = remote_transfer_id
    outbound_job.remote_transfer_status = remote_transfer_status
    outbound_job.remote_processing_decision = remote_processing_decision

    if remote_transfer_status == "awaiting_media":
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA
    elif remote_transfer_status == "applied":
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.COMPLETED
        outbound_job.completed_at = timezone.now()
        outbound_job.last_error = ""
    elif remote_transfer_status in {"failed", "inconsistent"}:
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
        outbound_job.last_error = str(response_data.get("status_detail", "") or "")

    outbound_job.save(
        update_fields=[
            "remote_transfer_id",
            "remote_transfer_status",
            "remote_processing_decision",
            "local_status",
            "completed_at",
            "last_error",
            "updated_at",
        ]
    )
    if outbound_job.local_status == OutboundHubTransferJob.LocalStatus.COMPLETED:
        apply_completed_export_cleanup_policy(outbound_job)
    emit_hub_export_audit_event(
        "hub_export.completed"
        if outbound_job.local_status == OutboundHubTransferJob.LocalStatus.COMPLETED
        else "hub_export.registered"
        if previous_status == OutboundHubTransferJob.LocalStatus.REGISTERING
        else "hub_export.remote_status_updated",
        outbound_job=outbound_job,
        remote_transfer_status=remote_transfer_status,
        remote_processing_decision=remote_processing_decision,
    )
    return outbound_job


def mark_outbound_job_failure(
    outbound_job: OutboundHubTransferJob,
    *,
    error_message: str,
    retryable: bool = True,
) -> OutboundHubTransferJob:
    outbound_job.local_status = OutboundHubTransferJob.LocalStatus.FAILED
    outbound_job.last_error = error_message
    if retryable:
        outbound_job.retry_count = int(outbound_job.retry_count or 0) + 1
    outbound_job.last_attempt_at = timezone.now()
    outbound_job.save(
        update_fields=[
            "local_status",
            "last_error",
            "retry_count",
            "last_attempt_at",
            "updated_at",
        ]
    )
    emit_hub_export_audit_event(
        "hub_export.failed",
        outbound_job=outbound_job,
        error=error_message,
        retry_count=int(outbound_job.retry_count or 0),
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
    request_timeout_s: int = 60,
) -> OutboundHubTransferJob:
    if request_timeout_s <= 0:
        raise ValueError("request_timeout_s must be positive.")
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

    transport = resolve_hub_transport_config()

    source_node = NetworkNode.objects.get(node_key=source_node_key, is_active=True)
    secret = resolve_outbound_node_secret(
        source_node_key=source_node_key,
        explicit_secret=source_secret,
    )
    payload = build_transfer_payload(outbound_job=outbound_job, source_node=source_node)
    validate_transfer_payload(payload)

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
    outbound_job.registration_started_at = now
    outbound_job.last_attempt_at = now
    outbound_job.save(
        update_fields=[
            "local_status",
            "queued_at",
            "registration_started_at",
            "last_attempt_at",
            "updated_at",
        ]
    )
    emit_hub_export_audit_event(
        "hub_export.register_started",
        outbound_job=outbound_job,
        source_node_key=source_node_key,
    )

    try:
        register_response = requests.post(
            hub_transfer_url(outbound_job.target_node),
            json=payload,
            headers=hub_headers(source_node=source_node, source_secret=secret),
            timeout=request_timeout_s,
            **transport.request_kwargs(),
        )
        if register_response.status_code == 409:
            emit_hub_export_audit_event(
                "hub_export.registration_reused",
                outbound_job=outbound_job,
                source_node_key=source_node_key,
            )
            register_payload = fetch_remote_transfer_status(
                outbound_job=outbound_job,
                source_node=source_node,
                secret=secret,
                request_timeout_s=request_timeout_s,
                transport=transport,
            )
        else:
            _raise_for_hub_response(register_response)
            register_payload = cast(
                RemoteTransferStatusPayload, register_response.json()
            )
        apply_remote_status(outbound_job, register_payload)
    except requests.RequestException as exc:
        return mark_outbound_job_failure(
            outbound_job,
            error_message=f"Hub transfer registration failed: {exc}",
        )

    if outbound_job.local_status != OutboundHubTransferJob.LocalStatus.AWAITING_MEDIA:
        return outbound_job

    with _localized_processed_media_path(outbound_job) as (media_path, media_role):
        outbound_job.local_status = OutboundHubTransferJob.LocalStatus.UPLOADING
        outbound_job.media_upload_started_at = timezone.now()
        outbound_job.last_attempt_at = outbound_job.media_upload_started_at
        outbound_job.save(
            update_fields=[
                "local_status",
                "media_upload_started_at",
                "last_attempt_at",
                "updated_at",
            ]
        )
        emit_hub_export_audit_event(
            "hub_export.upload_started",
            outbound_job=outbound_job,
        )

        upload_stream = MultipartUploadStream(
            media_path=media_path,
            media_role=media_role,
            upload_file_name=_pseudonymous_upload_file_name(
                outbound_job,
                media_path=media_path,
            ),
        )
        headers = hub_headers(source_node=source_node, source_secret=secret)
        headers["Content-Type"] = upload_stream.content_type
        headers["Content-Length"] = str(upload_stream.content_length)
        try:
            media_response = requests.post(
                hub_transfer_media_url(
                    outbound_job.target_node,
                    outbound_job.transfer_key,
                ),
                data=upload_stream,
                headers=headers,
                timeout=request_timeout_s,
                **transport.request_kwargs(),
            )
            _raise_for_hub_response(media_response)
            media_payload = cast(RemoteTransferStatusPayload, media_response.json())
            apply_remote_status(outbound_job, media_payload)
        except requests.RequestException as exc:
            return mark_outbound_job_failure(
                outbound_job,
                error_message=f"Hub transfer media upload failed: {exc}",
            )
    return outbound_job
