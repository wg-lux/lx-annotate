from __future__ import annotations

from datetime import date

import pytest
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from endoreg_db.models import (
    AIDataSet,
    Center,
    Examination,
    Frame,
    ImageClassificationAnnotation,
    Label,
    Patient,
    PatientExamination,
    PortalUserInfo,
    VideoFile,
    VideoState,
)
from rest_framework.test import APIClient

from lx_annotate.models import StudyCohort

pytestmark = pytest.mark.django_db
BASE = "/endoreg-api/media/studies/cohorts/"


@pytest.fixture
def setup_cohorts(master_key):
    user = User.objects.create_user(username="cohort-owner")
    center = Center.objects.create(name="cohort-center")
    PortalUserInfo.objects.create(user=user).centers.add(center)
    client = APIClient()
    client.force_authenticate(user)
    datasets = [AIDataSet.objects.create(name=f"Cohort dataset {i}") for i in range(2)]
    return client, user, center, datasets


def definition(dataset_ids=()):
    return {
        "name": "Follow-up study",
        "hypothesis": "Explicit study hypothesis",
        "filters": {"limit": 100},
        "dataset_ids": list(dataset_ids),
    }


def test_bidirectional_many_to_many_links_survive_reload_and_unlink(setup_cohorts):
    client, user, _, datasets = setup_cohorts
    first = client.post(BASE, definition([row.pk for row in datasets]), format="json")
    second = client.post(BASE, definition(), format="json")
    assert first.status_code == second.status_code == 201
    url = (
        f"/endoreg-api/settings/application/ai_datasets/{datasets[0].pk}/study_cohorts/"
    )
    link = {"cohort_id": second.data["id"], "linked": True}
    assert client.post(url, link, format="json").status_code == 200
    assert client.post(url, link, format="json").status_code == 200
    assert len(client.get(url).data) == 2
    assert StudyCohort.objects.get(pk=first.data["id"]).datasets.count() == 2
    assert client.post(url, {**link, "linked": False}, format="json").status_code == 200
    assert len(client.get(url).data) == 1
    assert (
        StudyCohort.objects.get(pk=second.data["id"], created_by=user).datasets.count()
        == 0
    )
    assert datasets[0].image_annotations.count() == 0


def test_cohort_definition_validated_at_model_and_api_boundaries(setup_cohorts):
    client, user, _, _ = setup_cohorts
    assert (
        client.post(
            BASE, {**definition(), "filters": {"has_video": "false"}}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.post(BASE, {**definition(), "name": " "}, format="json").status_code
        == 400
    )
    assert client.post(BASE, definition([999999]), format="json").status_code == 400
    assert StudyCohort.objects.count() == 0
    with pytest.raises(ValidationError):
        StudyCohort.objects.create(
            created_by=user, name="Study", hypothesis="Why", filters={"limit": 501}
        )


def test_saved_cohorts_require_authentication_and_ownership(setup_cohorts):
    client, _, _, datasets = setup_cohorts
    cohort_id = client.post(BASE, definition(), format="json").data["id"]
    other = User.objects.create_user(username="other-cohort-owner", is_superuser=True)
    client.force_authenticate(other)
    assert client.get(BASE).data == []
    assert (
        client.put(f"{BASE}{cohort_id}/", definition(), format="json").status_code
        == 404
    )
    url = (
        f"/endoreg-api/settings/application/ai_datasets/{datasets[0].pk}/study_cohorts/"
    )
    assert (
        client.post(
            url, {"cohort_id": cohort_id, "linked": True}, format="json"
        ).status_code
        == 404
    )
    client.force_authenticate(None)
    assert client.get(BASE).status_code in (401, 403)


def add_video(center, dataset, *, linked=True, real=False, validated=True):
    patient = Patient.objects.create(
        first_name="Pseudonym",
        last_name="Study",
        dob=date(1970, 1, 1),
        center=center,
        patient_hash=f"cohort-patient-{dataset.pk}-{linked}-{real}-{validated}",
        is_real_person=real,
    )
    examination = PatientExamination.objects.create(
        patient=patient,
        examination=Examination.objects.get_or_create(name="cohort-examination")[0],
        date_start=date(2026, 1, 1),
    )
    video = VideoFile.objects.create(
        center=center,
        patient=patient,
        examination=examination if linked else None,
        state=VideoState.objects.create(
            anonymization_validated=validated, processed_file_sha256="a" * 64
        ),
        raw_video_hash=f"cohort-video-{dataset.pk}-{linked}-{real}-{validated}",
        processed_file=SimpleUploadedFile(
            "cohort.mp4", b"processed study test artifact"
        ),
    )
    frame = Frame.objects.create(video=video, frame_number=1)
    annotation = ImageClassificationAnnotation.objects.create(
        frame=frame,
        label=Label.objects.get_or_create(name="cohort-label")[0],
        value=True,
    )
    dataset.image_annotations.add(annotation)
    return examination, video


def test_preview_uses_union_of_datasets_and_explains_exclusions(setup_cohorts):
    client, _, center, datasets = setup_cohorts
    first, video = add_video(center, datasets[0])
    second, _ = add_video(center, datasets[1])
    add_video(center, datasets[0], linked=False)
    add_video(center, datasets[0], real=True)
    add_video(center, datasets[0], validated=False)
    # Shared annotation membership must not duplicate patients or videos.
    datasets[1].image_annotations.add(
        datasets[0].image_annotations.filter(frame__video=video).get()
    )
    response = client.post(
        f"{BASE}preview/", definition([row.pk for row in datasets]), format="json"
    )
    assert response.status_code == 200, response.data
    assert {row["patient_examination_id"] for row in response.data["cases"]} == {
        first.pk,
        second.pk,
    }
    assert response.data["eligibility"] == {
        "dataset_count": 2,
        "dataset_video_count": 5,
        "missing_examination_video_count": 1,
        "conflicting_patient_video_count": 0,
        "candidate_examination_count": 4,
        "pseudonymous_examination_count": 3,
        "displayed_patient_count": 2,
    }
    empty = AIDataSet.objects.create(name="Empty cohort dataset")
    response = client.post(f"{BASE}preview/", definition([empty.pk]), format="json")
    assert response.data["cases"] == []
    assert response.data["eligibility"]["candidate_examination_count"] == 0


def test_dataset_outside_center_scope_is_rejected(setup_cohorts):
    client, _, _, datasets = setup_cohorts
    foreign = Center.objects.create(name="foreign-cohort-center")
    add_video(foreign, datasets[0])
    response = client.post(BASE, definition([datasets[0].pk]), format="json")
    assert response.status_code == 403
    assert StudyCohort.objects.count() == 0
    assert (
        client.post(
            f"{BASE}preview/", definition([datasets[0].pk]), format="json"
        ).status_code
        == 403
    )


def test_empty_dataset_scope_does_not_expose_other_centers(setup_cohorts):
    client, _, center, datasets = setup_cohorts
    expected, _ = add_video(center, datasets[0])
    add_video(Center.objects.create(name="other-center"), datasets[1])
    response = client.post(f"{BASE}preview/", definition(), format="json")
    assert response.status_code == 200
    assert [row["patient_examination_id"] for row in response.data["cases"]] == [
        expected.pk
    ]
