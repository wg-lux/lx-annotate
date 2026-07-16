from __future__ import annotations

import json

import pytest
from django.test import override_settings
from rest_framework import status

from endoreg_db.models import AIDataSet


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
