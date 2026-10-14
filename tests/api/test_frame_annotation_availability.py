from __future__ import annotations

import json

import pytest
from django.test import override_settings
from django.urls import resolve
from endoreg_db.models import AIDataSet
from endoreg_db.views.media.frame_media import DecodedFrameStreamView
from rest_framework import status
from rest_framework.response import Response

from lx_annotate.views.frame_annotation import (
    _decode_admission,
    _DecodeAdmission,
    _DecodeAdmissionController,
)

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "path",
    (
        "/api/settings/application/",
        "/endoreg-api/settings/application/",
    ),
)
def test_primary_annotation_settings_route_precedes_endoreg_include(path):
    match = resolve(path)

    assert match.url_name == "primary-annotation-settings-detail"
    assert match.func.__module__ == "lx_annotate.views.application_settings"


def _dataset(*, name: str, dataset_type: str, model_type: str, active: bool = True):
    return AIDataSet.objects.create(
        name=name,
        dataset_type=dataset_type,
        ai_model_type=model_type,
        is_active=active,
    )


@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
def test_primary_annotation_dataset_accepts_active_image_dataset(client):
    dataset = _dataset(
        name="Labels",
        dataset_type=AIDataSet.DATASET_TYPE_IMAGE,
        model_type=AIDataSet.AI_MODEL_TYPE_IMAGE_MULTILABEL,
    )

    response = client.patch(
        "/api/settings/application/",
        data=json.dumps(
            {
                "ai_dataset_id": dataset.pk,
                "ai_dataset_name": dataset.name,
                "ai_dataset_type": dataset.dataset_type,
            },
        ),
        content_type="application/json",
        secure=True,
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["ai_dataset_id"] == dataset.pk
    assert response.json()["primary_annotation_dataset_valid"] is True


@pytest.mark.parametrize(
    ("dataset_type", "model_type", "active", "message"),
    [
        (
            AIDataSet.DATASET_TYPE_VIDEO,
            AIDataSet.AI_MODEL_TYPE_VIDEO_SEGMENT_CLASSIFICATION,
            True,
            "must use the image dataset type",
        ),
        (
            AIDataSet.DATASET_TYPE_IMAGE,
            AIDataSet.AI_MODEL_TYPE_IMAGE_MULTILABEL,
            False,
            "must be active",
        ),
        (
            AIDataSet.DATASET_TYPE_IMAGE,
            "unsupported_image_model",
            True,
            "incompatible model type",
        ),
    ],
)
@override_settings(DEBUG=True, ALLOWED_HOSTS=["testserver"])
def test_primary_annotation_dataset_rejects_ineligible_dataset(
    client,
    dataset_type,
    model_type,
    active,
    message,
):
    dataset = _dataset(
        name="Ineligible",
        dataset_type=dataset_type,
        model_type=model_type,
        active=active,
    )

    response = client.patch(
        "/api/settings/application/",
        data=json.dumps({"ai_dataset_id": dataset.pk}),
        content_type="application/json",
        secure=True,
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert message in response.json()["errors"]["ai_dataset_id"]


def test_decode_admission_bounds_capacity_and_duplicate_work():
    controller = _DecodeAdmissionController()
    first_key = (1, 10, "processed")
    second_key = (1, 11, "processed")

    assert controller.acquire(first_key, limit=1).accepted is True
    duplicate = controller.acquire(first_key, limit=1)
    saturated = controller.acquire(second_key, limit=1)

    assert duplicate == _DecodeAdmission(False, "duplicate_in_flight", 1)
    assert saturated == _DecodeAdmission(False, "capacity", 1)
    assert controller.release(first_key) == 0
    assert controller.acquire(second_key, limit=1).accepted is True


@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    LX_ANNOTATE_FRAME_DECODE_MAX_CONCURRENCY=2,
    LX_ANNOTATE_FRAME_DECODE_RETRY_AFTER_SECONDS=3,
)
def test_decoded_frame_route_returns_typed_retryable_throttle(client, monkeypatch):
    monkeypatch.setattr(
        _decode_admission,
        "acquire",
        lambda key, *, limit: _DecodeAdmission(False, "capacity", limit),
    )

    response = client.get(
        "/api/media/videos/7/frames/42/decoded-stream/?file_type=processed",
        secure=True,
    )

    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert response["Retry-After"] == "3"
    assert response.json() == {
        "status": "frame_decode_throttled",
        "video_id": 7,
        "frame_number": 42,
        "file_type": "processed",
        "reason": "capacity",
        "retry_after_seconds": 3,
    }


@override_settings(
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
    LX_ANNOTATE_FRAME_DECODE_MAX_CONCURRENCY=2,
)
def test_decoded_frame_route_releases_admission_after_response(client, monkeypatch):
    releases: list[tuple[int, int, str]] = []
    monkeypatch.setattr(
        _decode_admission,
        "acquire",
        lambda key, *, limit: _DecodeAdmission(True, None, 1),
    )
    monkeypatch.setattr(
        _decode_admission,
        "release",
        lambda key: releases.append(key) or 0,
    )
    monkeypatch.setattr(
        DecodedFrameStreamView,
        "get",
        lambda self, request, video_id=None, frame_number=None: Response(
            {"ok": True},
            status=status.HTTP_200_OK,
        ),
    )

    response = client.get(
        "/api/media/videos/7/frames/42/decoded-stream/?file_type=processed",
        secure=True,
    )

    assert response.status_code == status.HTTP_200_OK
    assert releases == [(7, 42, "processed")]
