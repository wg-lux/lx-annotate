from __future__ import annotations

from collections import Counter
from typing import Any

from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from endoreg_db.models import AIDataSet
from endoreg_db.utils.permissions import EnvironmentAwarePermission


AI_DATASET_DEFAULT_MODEL_TYPE_BY_DATASET_TYPE = {
    AIDataSet.DATASET_TYPE_IMAGE: AIDataSet.AI_MODEL_TYPE_IMAGE_MULTILABEL,
    AIDataSet.DATASET_TYPE_VIDEO: AIDataSet.AI_MODEL_TYPE_VIDEO_SEGMENT_CLASSIFICATION,
}


def _ai_dataset_entry(
    dataset: AIDataSet,
    *,
    dataset_counts: Counter[str] | None = None,
) -> dict[str, Any]:
    name = dataset.name or ""
    return {
        "id": dataset.pk,
        "value": name,
        "label": name,
        "dataset_type": dataset.dataset_type,
        "ai_model_type": dataset.ai_model_type,
        "is_active": dataset.is_active,
        "name_count": (dataset_counts or Counter()).get(name, 1),
    }


def _ai_dataset_entries() -> list[dict[str, Any]]:
    dataset_counts = Counter(
        AIDataSet.objects.exclude(name__exact="").values_list("name", flat=True)
    )
    return [
        _ai_dataset_entry(dataset, dataset_counts=dataset_counts)
        for dataset in AIDataSet.objects.exclude(name__exact="").order_by(
            "name",
            "dataset_type",
            "pk",
        )
    ]


@api_view(["GET", "POST"])
@permission_classes([EnvironmentAwarePermission])
def ai_datasets_dropdown(request):
    if request.method == "GET":
        return Response(_ai_dataset_entries(), status=status.HTTP_200_OK)

    payload: dict[str, Any] = request.data or {}
    errors: dict[str, str] = {}

    name_raw = payload.get("name")
    if not isinstance(name_raw, str):
        errors["name"] = "name must be a string."
        name = ""
    else:
        name = name_raw.strip()
        if not name:
            errors["name"] = "name is required."
        elif len(name) > 255:
            errors["name"] = "name must be 255 characters or fewer."

    dataset_type_raw = payload.get("dataset_type", AIDataSet.DATASET_TYPE_IMAGE)
    if not isinstance(dataset_type_raw, str):
        errors["dataset_type"] = "dataset_type must be a string."
        dataset_type = ""
    else:
        dataset_type = dataset_type_raw.strip() or AIDataSet.DATASET_TYPE_IMAGE
        if dataset_type not in AI_DATASET_DEFAULT_MODEL_TYPE_BY_DATASET_TYPE:
            errors["dataset_type"] = "dataset_type must be one of: image, video."

    default_model_type = AI_DATASET_DEFAULT_MODEL_TYPE_BY_DATASET_TYPE.get(
        dataset_type,
        AIDataSet.AI_MODEL_TYPE_IMAGE_MULTILABEL,
    )
    ai_model_type_raw = payload.get("ai_model_type", default_model_type)
    if not isinstance(ai_model_type_raw, str):
        errors["ai_model_type"] = "ai_model_type must be a string."
        ai_model_type = ""
    else:
        ai_model_type = ai_model_type_raw.strip() or default_model_type
        if ai_model_type != default_model_type:
            errors["ai_model_type"] = (
                "ai_model_type is not compatible with dataset_type."
            )

    description_raw = payload.get("description", "")
    if description_raw is None:
        description = ""
    elif isinstance(description_raw, str):
        description = description_raw.strip()
    else:
        errors["description"] = "description must be a string."
        description = ""

    is_active_raw = payload.get("is_active", True)
    if not isinstance(is_active_raw, bool):
        errors["is_active"] = "is_active must be a boolean."
        is_active = True
    else:
        is_active = is_active_raw

    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        dataset = AIDataSet.objects.create(
            name=name,
            description=description,
            dataset_type=dataset_type,
            ai_model_type=ai_model_type,
            is_active=is_active,
        )

    dataset_counts = Counter(
        AIDataSet.objects.exclude(name__exact="").values_list("name", flat=True)
    )
    return Response(
        _ai_dataset_entry(dataset, dataset_counts=dataset_counts),
        status=status.HTTP_201_CREATED,
    )
