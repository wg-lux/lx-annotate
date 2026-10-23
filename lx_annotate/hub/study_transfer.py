"""Explicit standalone study export over the existing authenticated hub channel."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

import requests
from django.contrib.auth.models import User
from django.db.models import QuerySet
from endoreg_db.models import NetworkNode, PatientExamination, Study
from endoreg_db.services.hub.hub_pseudonyms import hub_scoped_study_exchange
from endoreg_db.services.studies.exchange import export_study_exchange
from lx_dtypes.models.contracts.hub_transfer import (
    HubTransferStudyTransferPayload,
)
from lx_dtypes.study_exchange import study_exchange_digest
from pydantic import BaseModel, ConfigDict

from lx_annotate.hub.hub_export_audit import emit_hub_export_audit_event
from lx_annotate.hub.hub_export_worker import (
    hub_headers,
    hub_transfer_url,
    resolve_hub_request_timeout_seconds,
    resolve_hub_transport_config,
    resolve_outbound_node_secret,
)


class StudyTransferReceipt(BaseModel):
    """Verify the hub applied this exact immutable metadata transfer."""

    model_config = ConfigDict(extra="ignore")
    id: UUID
    transfer_key: str
    source_node_key: str
    target_node_key: str
    source_center_key: str
    resource_hash: str
    resource_kind: Literal["study"]
    transfer_mode: Literal["metadata_only"]
    payload_schema_version: Literal["7.0"]
    transfer_status: Literal["applied"]
    processing_policy: Literal["ingest_only_no_processing"]
    processing_intent: Literal["sender_requests_archive_only"]
    cleanup_policy: Literal["retain_all"]


def send_study_to_hub(
    *,
    owner: User,
    study: Study,
    source: NetworkNode,
    target: NetworkNode,
    examination_scope: QuerySet[PatientExamination],
) -> StudyTransferReceipt:
    if not source.is_active or source.role != NetworkNode.Role.SITE_NODE:
        raise ValueError("Study sender must be an active site node")
    if not target.is_active or target.role != NetworkNode.Role.CENTRAL_HUB:
        raise ValueError("Study receiver must be an active central hub")
    center = source.owning_center
    if center is None:
        raise ValueError("Study sender must have an owning center")
    if examination_scope.exclude(patient__center_id=center.pk).exists():
        raise ValueError("Study export scope must belong to the sender center")
    # Local UUIDs stay on the site; the hub receives its own salted pseudonyms.
    bundle = hub_scoped_study_exchange(
        export_study_exchange(
            owner=owner, study=study, examination_scope=examination_scope
        ),
        hub_node_key=target.node_key,
    )
    digest = study_exchange_digest(bundle)
    payload = HubTransferStudyTransferPayload.model_validate(
        {
            "transfer_key": f"{source.node_key}__study__{digest}__metadata_v1",
            "source_node_key": source.node_key,
            "target_node_key": target.node_key,
            "source_center_key": center.center_key,
            "resource_hash": digest,
            "payload_schema_version": "7.0",
            "processing_snapshot": {"sender_processing_success": True},
            "resource_rows": {"study_exchange": bundle},
        }
    )
    transport = resolve_hub_transport_config()
    secret = resolve_outbound_node_secret(source_node_key=source.node_key)
    audit = {
        "transfer_key": payload.transfer_key,
        "request_user": owner,
        "study_uuid": str(study.uuid),
        "source_node_key": source.node_key,
        "target_node_key": target.node_key,
        "collection_count": len(bundle.collections),
    }
    emit_hub_export_audit_event("hub_study.send_started", **audit)
    try:
        response = requests.post(
            hub_transfer_url(target),
            json=payload.model_dump(mode="json", exclude_none=True),
            headers=hub_headers(source_node=source, source_secret=secret),
            timeout=resolve_hub_request_timeout_seconds(),
            **transport.request_kwargs(),
        )
        if not 200 <= response.status_code < 300:
            raise ValueError("Hub did not accept study metadata")
        receipt = StudyTransferReceipt.model_validate(response.json())
        for key, value in receipt.model_dump(exclude={"id", "transfer_status"}).items():
            if getattr(payload, key) != value:
                raise ValueError("Hub study acknowledgement identity mismatch")
    except (requests.RequestException, ValueError):
        emit_hub_export_audit_event("hub_study.send_failed", **audit)
        raise
    emit_hub_export_audit_event(
        "hub_study.applied", remote_transfer_id=str(receipt.id), **audit
    )
    return receipt
