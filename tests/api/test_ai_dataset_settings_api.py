from __future__ import annotations

import json

import pytest
from django.test import override_settings
from endoreg_db.models import AIDataSet
from rest_framework import status
from rest_framework.test import APIRequestFactory

from lx_annotate.views.ai_dataset_settings import ai_datasets_dropdown

pytestmark = pytest.mark.django_db


@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_ai_dataset_dropdown_creates_named_dataset(client):
    response = client.post(
        "/api/settings/application/dropdowns/ai_datasets/",
        data=json.dumps(
            {
                "name": "Koloskopie Training Mai 2026",
                "dataset_type": "image",
                "ai_model_type": "image_multilabel_classification",
                "is_active": True,
            }
        ),
        content_type="application/json",
        secure=True,
    )

    assert response.status_code == status.HTTP_201_CREATED, response.content.decode()
    payload = response.json()
    assert payload["label"] == "Koloskopie Training Mai 2026"
    assert payload["dataset_type"] == AIDataSet.DATASET_TYPE_IMAGE
    assert payload["ai_model_type"] == AIDataSet.AI_MODEL_TYPE_IMAGE_MULTILABEL

    dataset = AIDataSet.objects.get(pk=payload["id"])
    assert dataset.name == "Koloskopie Training Mai 2026"
    assert dataset.is_active is True

    list_response = client.get(
        "/api/settings/application/dropdowns/ai_datasets/",
        secure=True,
    )
    assert list_response.status_code == status.HTTP_200_OK
    assert any(entry["id"] == dataset.pk for entry in list_response.json())


@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_ai_dataset_dropdown_rejects_empty_dataset_name(client):
    response = client.post(
        "/api/settings/application/dropdowns/ai_datasets/",
        data=json.dumps({"name": "   ", "dataset_type": "image"}),
        content_type="application/json",
        secure=True,
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["errors"]["name"] == "name is required."


@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        ({"name": 7}, "name", "name must be a string."),
        ({"name": "  "}, "name", "name is required."),
        ({"name": "x" * 256}, "name", "name must be 255 characters or fewer."),
        (
            {"name": "dataset", "dataset_type": 7},
            "dataset_type",
            "dataset_type must be a string.",
        ),
        (
            {"name": "dataset", "dataset_type": "audio"},
            "dataset_type",
            "dataset_type must be one of: image, video.",
        ),
        (
            {"name": "dataset", "ai_model_type": 7},
            "ai_model_type",
            "ai_model_type must be a string.",
        ),
        (
            {
                "name": "dataset",
                "dataset_type": "video",
                "ai_model_type": "image_multilabel_classification",
            },
            "ai_model_type",
            "ai_model_type is not compatible with dataset_type.",
        ),
        (
            {"name": "dataset", "description": []},
            "description",
            "description must be a string.",
        ),
        (
            {"name": "dataset", "is_active": "yes"},
            "is_active",
            "is_active must be a boolean.",
        ),
    ],
)
@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_ai_dataset_dropdown_rejects_invalid_field_types_and_combinations(
    payload, field, message
):
    request = APIRequestFactory().post("/", payload, format="json")
    response = ai_datasets_dropdown(request)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["errors"][field] == message
    assert not AIDataSet.objects.exists()


@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_ai_dataset_dropdown_applies_video_defaults():
    request = APIRequestFactory().post(
        "/",
        {
            "name": "  Video Training  ",
            "dataset_type": "video",
            "description": None,
            "is_active": False,
        },
        format="json",
    )
    response = ai_datasets_dropdown(request)

    assert response.status_code == status.HTTP_201_CREATED
    dataset = AIDataSet.objects.get(pk=response.data["id"])
    assert dataset.name == "Video Training"
    assert dataset.ai_model_type == AIDataSet.AI_MODEL_TYPE_VIDEO_SEGMENT_CLASSIFICATION
    assert dataset.description == ""
    assert dataset.is_active is False

    list_response = ai_datasets_dropdown(APIRequestFactory().get("/"))
    assert list_response.status_code == status.HTTP_200_OK
    assert list_response.data == [
        {
            "id": dataset.pk,
            "value": "Video Training",
            "label": "Video Training",
            "dataset_type": AIDataSet.DATASET_TYPE_VIDEO,
            "ai_model_type": AIDataSet.AI_MODEL_TYPE_VIDEO_SEGMENT_CLASSIFICATION,
            "is_active": False,
            "name_count": 1,
        }
    ]
