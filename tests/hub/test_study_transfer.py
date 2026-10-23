"""Study transfer verifies the exact acknowledgement before reporting success."""

from __future__ import annotations

from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from lx_dtypes.models.contracts.hub_transfer import HubTransferStudyTransferPayload
from lx_dtypes.models.contracts.study import StudyDefinition
from lx_dtypes.models.contracts.study_exchange import (
    StudyExchangeBundle,
    StudyExchangeStudy,
)
from lx_dtypes.study_exchange import study_exchange_digest

from lx_annotate.hub.study_transfer import send_study_to_hub
from lx_annotate.hub.transfer_transport import TransferTransportConfig


def _payload():
    bundle = StudyExchangeBundle(
        studies=[
            StudyExchangeStudy(
                study_uuid=uuid4(),
                definition=StudyDefinition(name="Study", hypothesis="", description=""),
            )
        ]
    )
    digest = study_exchange_digest(bundle)
    return HubTransferStudyTransferPayload.model_validate(
        {
            "transfer_key": f"site__study__{digest}__metadata_v1",
            "source_node_key": "site",
            "target_node_key": "hub",
            "source_center_key": "center",
            "resource_hash": digest,
            "payload_schema_version": "7.0",
            "processing_snapshot": {"sender_processing_success": True},
            "resource_rows": {"study_exchange": bundle},
        }
    )


def test_study_payload_roundtrip_and_digest_tamper():
    payload = _payload()
    raw = payload.model_dump(mode="json")
    assert HubTransferStudyTransferPayload.model_validate(raw) == payload
    raw["resource_rows"]["study_exchange"]["studies"][0]["definition"]["name"] = (
        "Changed"
    )
    with pytest.raises(ValueError, match="digest"):
        HubTransferStudyTransferPayload.model_validate(raw)


@pytest.mark.parametrize(
    "mismatch", [None, "resource_hash", "target_node_key", "transfer_status"]
)
def test_sender_rejects_wrong_receipt_without_media_transfer(mismatch):
    payload = _payload()
    source = Mock(is_active=True, role="site_node", node_key="site", owning_center_id=1)
    source.owning_center.center_key = "center"
    target = Mock(
        is_active=True,
        role="central_hub",
        node_key="hub",
        base_url="https://hub.invalid/",
    )
    scope = Mock()
    scope.exclude.return_value.exists.return_value = False
    reply = payload.model_dump(
        mode="json", exclude={"resource_rows", "processing_snapshot", "provenance"}
    )
    reply.update(id=str(uuid4()), transfer_status="applied")
    if mismatch:
        reply[mismatch] = "wrong"
    response = Mock(status_code=201)
    response.json.return_value = reply
    module = "lx_annotate.hub.study_transfer."
    with (
        patch(
            module + "export_study_exchange",
            return_value=payload.resource_rows.study_exchange,
        ),
        patch(
            module + "resolve_hub_transport_config",
            return_value=TransferTransportConfig(None, True),
        ),
        patch(module + "resolve_outbound_node_secret", return_value="test-only-secret"),
        patch(module + "resolve_hub_request_timeout_seconds", return_value=10),
        patch(module + "emit_hub_export_audit_event"),
        patch(module + "requests.post", return_value=response) as post,
    ):
        if mismatch:
            with pytest.raises(ValueError):
                send_study_to_hub(
                    owner=Mock(),
                    study=Mock(uuid=uuid4()),
                    source=source,
                    target=target,
                    examination_scope=scope,
                )
        else:
            receipt = send_study_to_hub(
                owner=Mock(),
                study=Mock(uuid=uuid4()),
                source=source,
                target=target,
                examination_scope=scope,
            )
            assert receipt.transfer_status == "applied"
        assert post.call_count == 1
        assert post.call_args.kwargs["allow_redirects"] is False
        assert post.call_args.kwargs["verify"] is True


def test_sender_rejects_other_center_before_bundle_or_network():
    source = Mock(is_active=True, role="site_node", owning_center_id=1)
    target = Mock(is_active=True, role="central_hub")
    scope = Mock()
    scope.exclude.return_value.exists.return_value = True
    with patch("lx_annotate.hub.study_transfer.requests.post") as post:
        with pytest.raises(ValueError, match="sender center"):
            send_study_to_hub(
                owner=Mock(),
                study=Mock(),
                source=source,
                target=target,
                examination_scope=scope,
            )
        post.assert_not_called()


def test_send_api_denies_sender_center_before_transport():
    from django.contrib.auth.models import User
    from rest_framework.test import APIRequestFactory, force_authenticate

    from lx_annotate.views.study_transfer import study_hub_transfer

    user = User(username="owner", is_active=True, is_superuser=True)
    request = APIRequestFactory().post(
        "/study-transfer/", {"source_node_key": "site"}, format="json"
    )
    force_authenticate(request, user=user)
    source = Mock()
    source.owning_center.pk = 2
    module = "lx_annotate.views.study_transfer."
    with (
        patch(module + "get_object_or_404", side_effect=[Mock(), source]),
        patch(module + "resolve_allowed_center_ids", return_value={1}),
        patch(module + "send_study_to_hub") as send,
    ):
        response = study_hub_transfer(request, study_id=uuid4())
    assert response.status_code == 403
    send.assert_not_called()


def test_accept_api_rejects_override_fields():
    from django.contrib.auth.models import User
    from rest_framework.test import APIRequestFactory, force_authenticate

    from lx_annotate.views.study_transfer import study_hub_accept

    request = APIRequestFactory().post(
        "/study-transfer/", {"owner": "other"}, format="json"
    )
    force_authenticate(
        request, user=User(username="owner", is_active=True, is_superuser=True)
    )
    response = study_hub_accept(request, transfer_id=uuid4())
    assert response.status_code == 400


def test_send_api_requires_complete_cohort_capture_before_transport():
    from django.contrib.auth.models import User
    from rest_framework.test import APIRequestFactory, force_authenticate

    from lx_annotate.views.study_transfer import study_hub_transfer

    request = APIRequestFactory().post(
        "/study-transfer/",
        {"source_node_key": "site", "target_node_key": "hub"},
        format="json",
    )
    force_authenticate(
        request, user=User(username="owner", is_active=True, is_superuser=True)
    )
    source = Mock()
    source.owning_center.pk = 1
    module = "lx_annotate.views.study_transfer."
    with (
        patch(module + "get_object_or_404", side_effect=[Mock(), source, Mock()]),
        patch(module + "resolve_allowed_center_ids", return_value={1}),
        patch(
            module + "require_study_capture_coverage",
            side_effect=ValueError("Missing records"),
        ) as coverage,
        patch(module + "send_study_to_hub") as send,
    ):
        response = study_hub_transfer(request, study_id=uuid4())
    assert response.status_code == 409
    coverage.assert_called_once()
    send.assert_not_called()
