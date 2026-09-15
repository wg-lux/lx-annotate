from __future__ import annotations

from typing import Any, cast

from endoreg_db.models import AIDataSet
from endoreg_db.utils.permissions import EnvironmentAwarePermission
from endoreg_db.utils.set_default_center import get_application_defaults
from endoreg_db.views.misc.application_settings import (
    _application_settings_payload_data,
    _patch_application_settings,
    _settings_payload,
)
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

_FRAME_ANNOTATION_MODEL_TYPES = {
    AIDataSet.AI_MODEL_TYPE_IMAGE_MULTILABEL,
    "phi_region_detector",
}


def _primary_dataset_error(dataset: AIDataSet | None) -> str | None:
    if dataset is None:
        return "Select an active image dataset as the primary annotation dataset."
    if not dataset.is_active:
        return "The primary annotation dataset must be active."
    if dataset.dataset_type != AIDataSet.DATASET_TYPE_IMAGE:
        return "The primary annotation dataset must use the image dataset type."
    if dataset.ai_model_type not in _FRAME_ANNOTATION_MODEL_TYPES:
        return "The primary annotation dataset has an incompatible model type."
    return None


def _configured_primary_dataset() -> AIDataSet | None:
    dataset_id = get_application_defaults().ai_dataset_id
    if dataset_id is None:
        return None
    return AIDataSet.objects.filter(pk=dataset_id).first()


def _settings_response_payload(request: Request) -> dict[str, Any]:
    payload = cast(
        dict[str, Any],
        _application_settings_payload_data(_settings_payload(request)),
    )
    error = _primary_dataset_error(_configured_primary_dataset())
    payload["primary_annotation_dataset_valid"] = error is None
    payload["primary_annotation_dataset_error"] = error
    return payload


def _requested_dataset(request: Request) -> tuple[AIDataSet | None, Response | None]:
    data = request.data if isinstance(request.data, dict) else {}
    raw_id = data.get("ai_dataset_id")
    if raw_id in (None, "", 0):
        return None, None
    try:
        dataset_id = int(str(raw_id).strip())
    except (TypeError, ValueError):
        return None, Response(
            {"errors": {"ai_dataset_id": "ai_dataset_id must be an integer."}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    dataset = AIDataSet.objects.filter(pk=dataset_id).first()
    if dataset is None:
        return None, Response(
            {"errors": {"ai_dataset_id": "AIDataSet not found."}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    error = _primary_dataset_error(dataset)
    if error is not None:
        return None, Response(
            {"errors": {"ai_dataset_id": error}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return dataset, None


def _validate_dataset_identity(
    request: Request,
    dataset: AIDataSet | None,
) -> Response | None:
    if dataset is None or not isinstance(request.data, dict):
        return None
    errors: dict[str, str] = {}
    supplied_name = request.data.get("ai_dataset_name")
    if supplied_name not in (None, "", dataset.name):
        errors["ai_dataset_name"] = "ai_dataset_name does not match ai_dataset_id."
    supplied_type = request.data.get("ai_dataset_type")
    if supplied_type not in (None, "", dataset.dataset_type):
        errors["ai_dataset_type"] = "ai_dataset_type does not match ai_dataset_id."
    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)
    return None


@api_view(["GET", "PATCH"])
@permission_classes([EnvironmentAwarePermission])
def primary_annotation_settings_detail(request: Request) -> Response:
    if request.method == "GET":
        return Response(_settings_response_payload(request), status=status.HTTP_200_OK)

    dataset, error_response = _requested_dataset(request)
    if error_response is not None:
        return error_response
    identity_error = _validate_dataset_identity(request, dataset)
    if identity_error is not None:
        return identity_error

    upstream_response = _patch_application_settings(request)
    if upstream_response.status_code >= status.HTTP_400_BAD_REQUEST:
        return upstream_response
    return Response(_settings_response_payload(request), status=status.HTTP_200_OK)
