"""Patient separation, immutable membership, and actual API persistence."""

from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as ModelValidationError
from endoreg_db.models import (
    AIDataSet,
    Center,
    Frame,
    ImageClassificationAnnotation,
    Label,
    LabelVideoSegment,
    Patient,
    PatientExamination,
    PortalUserInfo,
    VideoFile,
)
from pydantic import ValidationError
from rest_framework.test import APIClient

from lx_annotate.models import AIDatasetSplitPlan
from lx_annotate.schemas.ai_dataset_splits import (
    SplitConfig,
    SplitSnapshot,
    VideoMembership,
)
from lx_annotate.services.ai_dataset_splits import build_snapshot, collect_membership


def membership(count=12):
    return {
        i: [
            VideoMembership(
                video_id=i,
                center_id=1,
                frame_ids=[i],
                image_annotation_ids=[i],
                segment_ids=[i],
            )
        ]
        for i in range(1, count + 1)
    }


def test_fixed_test_and_rotating_folds_are_reproducible_and_exhaustive():
    config = SplitConfig(name="Five fold", k=5, test_percent=20, seed=42)
    snapshot = build_snapshot(config, membership())
    assert snapshot == build_snapshot(
        config, dict(reversed(list(membership().items())))
    )
    assert snapshot != build_snapshot(
        config.model_copy(update={"seed": 43}), membership()
    )
    holdout = {p.patient_id for p in snapshot.patients if p.validation_fold is None}
    assert len(holdout) == 2
    other_k = build_snapshot(config.model_copy(update={"k": 2}), membership())
    assert holdout == {
        p.patient_id for p in other_k.patients if p.validation_fold is None
    }
    validation_seen = set()
    for fold in range(5):
        validation = {
            p.patient_id for p in snapshot.patients if p.validation_fold == fold
        }
        training = {
            p.patient_id
            for p in snapshot.patients
            if p.validation_fold is not None and p.validation_fold != fold
        }
        assert not (holdout & validation or holdout & training or training & validation)
        assert training | validation | holdout == set(membership())
        assert not validation_seen & validation
        validation_seen |= validation
    assert validation_seen | holdout == set(membership())


@pytest.mark.parametrize(
    "field,value",
    [
        ("k", 1),
        ("k", 21),
        ("k", True),
        ("test_percent", 0),
        ("test_percent", 51),
        ("seed", -1),
        ("name", "  "),
        ("k", "5"),
    ],
)
def test_invalid_config(field, value):
    with pytest.raises(ValidationError):
        SplitConfig.model_validate(
            {**dict(name="Plan", k=5, test_percent=20, seed=42), field: value}
        )


def test_small_dataset_and_duplicate_membership_rejected():
    config = SplitConfig(name="Plan", k=5, test_percent=20, seed=42)
    with pytest.raises(ValueError, match="Too few"):
        build_snapshot(config, membership(5))
    snapshot = build_snapshot(config, membership()).model_dump()
    snapshot["patients"][1]["videos"] = snapshot["patients"][0]["videos"]
    with pytest.raises(ValidationError, match="Duplicate"):
        SplitSnapshot.model_validate(snapshot)


@pytest.fixture
def dataset(db):
    center = Center.objects.create(name="Split test center", center_key="split-test")
    label = Label.objects.create(name="split-test-label")
    result = AIDataSet.objects.create(name="Split test dataset")
    for index in range(6):
        patient = Patient.objects.create(
            first_name="Test", last_name=str(index), center=center
        )
        # Two videos per patient must always move together.
        for number in range(2):
            video = VideoFile.objects.create(
                center=center, patient=patient, video_hash=f"split-{index}-{number}"
            )
            frame = Frame.objects.create(video=video, frame_number=0, timestamp=0)
            annotation = ImageClassificationAnnotation.objects.create(
                frame=frame, label=label, value=True
            )
            result.image_annotations.add(annotation)
            segment = LabelVideoSegment.objects.create(
                video_file=video, label=label, start_frame_number=0, end_frame_number=1
            )
            result.video_annotations.add(segment)
    return result


@pytest.fixture
def client(db):
    user = User.objects.create_user(username="split-admin", is_staff=True)
    client = APIClient()
    client.force_authenticate(user)
    return client


def path(dataset):
    return f"/api/settings/application/ai_datasets/{dataset.pk}/split_plans/"


def test_create_reload_detail_and_snapshot_isolation(dataset, client):
    payload = dict(name="Plan", k=5, test_percent=20, seed=42)
    response = client.post(path(dataset), payload, format="json")
    assert response.status_code == 201, response.content
    plan = response.json()
    assert plan["total"] == dict(
        patient_count=6,
        video_count=12,
        frame_count=12,
        image_annotation_count=12,
        segment_count=12,
    )
    assert plan["test"]["patient_count"] == 1
    assert all(fold["training"]["patient_count"] == 4 for fold in plan["folds"])
    detail = client.get(f"{path(dataset)}{plan['id']}/")
    assert detail.status_code == 200
    assert all(len(p["videos"]) == 2 for p in detail.json()["membership"]["patients"])
    dataset.image_annotations.clear()
    dataset.video_annotations.clear()
    assert client.get(path(dataset)).json() == [plan]
    persisted = AIDatasetSplitPlan.objects.get(pk=plan["id"])
    with pytest.raises(ModelValidationError, match="immutable"):
        persisted.save()
    with pytest.raises(ModelValidationError):
        AIDatasetSplitPlan.objects.create(
            dataset=dataset, created_by=persisted.created_by, snapshot={}
        )


def test_missing_and_conflicting_patient_links_fail_without_save(dataset, client):
    video = VideoFile.objects.first()
    original_patient_id = video.patient_id
    video.patient = None
    video.save(update_fields=["patient"])
    response = client.post(
        path(dataset), dict(name="Plan", k=2, test_percent=20, seed=42), format="json"
    )
    assert response.status_code == 400
    assert "Missing patient" in response.json()["detail"]
    video.patient_id = original_patient_id
    other = Patient.objects.exclude(pk=original_patient_id).first()
    video.examination = PatientExamination.objects.create(patient=other)
    video.save(update_fields=["patient", "examination"])
    with pytest.raises(ValueError, match="Conflicting"):
        collect_membership(dataset)
    assert AIDatasetSplitPlan.objects.count() == 0


def test_permissions_and_invalid_api_payloads(dataset, client):
    assert APIClient().get(path(dataset)).status_code in (401, 403)
    response = client.post(
        path(dataset), dict(name="Plan", k=5, test_percent=20, seed=42), format="json"
    )
    plan_id = response.json()["id"]
    for payload in ({}, dict(name="Plan", k=5, test_percent=20, seed=42, extra=True)):
        assert client.post(path(dataset), payload, format="json").status_code == 400
    user = User.objects.create_user(username="split-scoped")
    client.force_authenticate(user)
    assert client.get(path(dataset)).status_code == 403
    portal = PortalUserInfo.objects.create(user=user)
    portal.centers.add(Center.objects.get(center_key="split-test"))
    assert client.get(path(dataset)).status_code == 200
    portal.centers.clear()
    assert client.get(f"{path(dataset)}{plan_id}/").status_code == 403
