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
    Finding,
    Frame,
    ImageClassificationAnnotation,
    Label,
    Patient,
    PatientExamination,
    PatientFinding,
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


def test_definition_download_round_trips_shared_yaml_and_stays_outside_terminology(
    setup_cohorts, settings, tmp_path
):
    from lx_dtypes.utils.study_setup_yaml import parse_study_setup_yaml

    settings.CONFIG_ROOT = tmp_path / "config"
    settings.TERMINOLOGY_ROOT = tmp_path / "terminology"
    client, user, _, datasets = setup_cohorts
    response = client.post(BASE, definition([datasets[0].pk]), format="json")
    assert response.status_code == 201, response.data
    cohort_id = response.data["id"]
    artifacts = list(settings.CONFIG_ROOT.rglob("*.yml"))
    assert len(artifacts) == 1
    response = client.get(f"{BASE}{cohort_id}/definition/")
    assert response.status_code == 200
    assert response.content == artifacts[0].read_bytes()
    parsed = parse_study_setup_yaml(response.content.decode())
    assert parsed.cohorts[0].name == definition()["name"]
    assert parsed.cohorts[0].dataset_refs == [parsed.datasets[0].definition_id]
    assert not settings.TERMINOLOGY_ROOT.exists()
    other = User.objects.create_user(username="definition-non-owner")
    client.force_authenticate(other)
    assert client.get(f"{BASE}{cohort_id}/definition/").status_code == 404


def test_definition_write_failure_rolls_back_cohort(setup_cohorts, monkeypatch):
    def fail(**kwargs):
        raise OSError("configuration volume unavailable")

    monkeypatch.setattr(
        "lx_annotate.services.study_definitions.atomic_write_file", fail
    )
    client, _, _, _ = setup_cohorts
    with pytest.raises(OSError, match="configuration volume unavailable"):
        client.post(BASE, definition(), format="json")
    assert not StudyCohort.objects.exists()


def test_saved_definition_revisions_and_metadata_are_stable(setup_cohorts):
    from lx_dtypes.utils.study_setup_yaml import parse_study_setup_yaml

    client, _, center, datasets = setup_cohorts
    data = definition([datasets[0].pk])
    data["study_metadata"] = {
        "participating_centers": [
            {"center_key": center.center_key, "name": center.name}
        ],
        "age_groups": [{"name": "Adults", "minimum_age": 18, "maximum_age": 65}],
    }
    created = client.post(BASE, data, format="json")
    assert created.status_code == 201, created.data
    url = f"{BASE}{created.data['id']}/"
    initial = client.get(f"{url}definition/").content
    parsed = parse_study_setup_yaml(initial.decode())
    assert parsed.cohorts[0].study_metadata.age_groups[0].minimum_age == 18
    assert parsed.definition_version == "1.0.0"
    datasets[0].name = "Renamed after study saved"
    datasets[0].save()
    assert client.get(f"{url}definition/").content == initial
    assert client.put(url, data, format="json").status_code == 200
    revised = parse_study_setup_yaml(client.get(f"{url}definition/").content.decode())
    assert revised.definition_version == "1.0.1"
    assert revised.datasets[0].name == datasets[0].name
    assert client.put(url, data, format="json").status_code == 200
    assert (
        parse_study_setup_yaml(client.get(f"{url}definition/").content.decode())
        == revised
    )


def add_eligible_media(case):
    return VideoFile.objects.create(
        center=case.patient.center,
        patient=case.patient,
        examination=case,
        state=VideoState.objects.create(
            anonymization_validated=True,
            processed_file_sha256="b" * 64,
        ),
        raw_video_hash=f"eligibility-video-{case.pk}",
        processed_file=SimpleUploadedFile("eligibility.mp4", b"processed test video"),
    )


def test_preview_enforces_age_at_examination_and_participating_center(setup_cohorts):
    client, _, center, _ = setup_cohorts
    examination = Examination.objects.create(name="age-study-examination")
    expected = []
    for i, (dob, start, accepted) in enumerate(
        [
            (date(2008, 6, 15), date(2026, 6, 14), False),
            (date(2008, 6, 15), date(2026, 6, 15), True),
            (date(1960, 6, 15), date(2026, 6, 14), True),
            (date(1960, 6, 15), date(2026, 6, 15), False),
            (None, date(2026, 6, 15), False),
            (date(2000, 1, 1), None, False),
            (date(2030, 1, 1), date(2026, 1, 1), False),
            (date(2008, 2, 29), date(2026, 2, 28), False),
            (date(2008, 2, 29), date(2026, 3, 1), True),
        ]
    ):
        patient = Patient.objects.create(
            first_name="Study",
            last_name="Age",
            dob=dob,
            center=center,
            is_real_person=False,
            patient_hash=f"age-boundary-{i}",
        )
        case = PatientExamination.objects.create(
            patient=patient, examination=examination, date_start=start
        )
        add_eligible_media(case)
        if accepted:
            expected.append(case.pk)
    data = definition()
    data["study_metadata"] = {
        "participating_centers": [
            {"center_key": center.center_key, "name": center.name}
        ],
        "age_groups": [{"name": "18 through 65", "minimum_age": 18, "maximum_age": 65}],
    }
    result = client.post(f"{BASE}preview/", data, format="json")
    assert result.status_code == 200, result.data
    assert {row["patient_examination_id"] for row in result.data["cases"]} == set(
        expected
    )
    data["study_metadata"]["participating_centers"][0]["center_key"] = "other-center"
    assert client.post(f"{BASE}preview/", data, format="json").data["cases"] == []


def test_versioned_criteria_use_all_criteria_any_exact_reference_and_active_findings(
    setup_cohorts, monkeypatch
):
    from types import SimpleNamespace

    client, _, center, _ = setup_cohorts
    examination = Examination.objects.create(name="versioned-examination")
    finding = Finding.objects.create(name="versioned-finding")
    loaded = []

    def load(module, *, version):
        loaded.append((module, version))
        return SimpleNamespace(
            get_examination=lambda name: {examination.name: examination}[name],
            get_finding=lambda name: {finding.name: finding}[name],
        )

    monkeypatch.setattr("lx_annotate.services.study_eligibility.load_module_kb", load)
    expected = []
    for i, (version, active) in enumerate(
        [
            ("1.0.0", True),
            ("2.0.0", True),
            ("3.0.0", True),
            ("", True),
            ("1.0.0", False),
        ]
    ):
        patient = Patient.objects.create(
            first_name="Study",
            last_name="Versions",
            center=center,
            is_real_person=False,
            patient_hash=f"versioned-{i}",
        )
        case = PatientExamination.objects.create(
            patient=patient,
            examination=examination,
            date_start=date(2026, 1, 1),
            knowledge_base_module="research" if version else "",
            knowledge_base_version=version,
        )
        if active:
            PatientFinding.objects.create(patient_examination=case, finding=finding)
        add_eligible_media(case)
        if version in ("1.0.0", "2.0.0") and active:
            expected.append(case.pk)
    versions = ("1.0.0", "2.0.0")
    data = definition()
    data["study_metadata"] = {
        "terminology_requirements": [
            {"module": "research", "version": v} for v in versions
        ],
        "inclusion_criteria": [
            {
                "name": kind,
                "concepts": [
                    {"module": "research", "version": v, "kind": kind, "name": name}
                    for v in versions
                ],
            }
            for kind, name in (
                ("examination", examination.name),
                ("finding", finding.name),
            )
        ],
    }
    result = client.post(f"{BASE}preview/", data, format="json")
    assert result.status_code == 200, result.data
    assert set(loaded) == {("research", v) for v in versions}
    assert {row["patient_examination_id"] for row in result.data["cases"]} == set(
        expected
    )
    data["study_metadata"]["inclusion_criteria"][0]["concepts"][0]["name"] = "missing"
    assert client.post(f"{BASE}preview/", data, format="json").status_code == 400
    assert client.post(BASE, data, format="json").status_code == 400
    assert not StudyCohort.objects.exists()


def test_unavailable_terminology_fails_before_save_or_preview(setup_cohorts):
    client, _, _, _ = setup_cohorts
    data = definition()
    data["study_metadata"] = {
        "terminology_requirements": [
            {"module": "missing-study-package", "version": "9.0.0"}
        ]
    }
    assert client.post(BASE, data, format="json").status_code == 400
    assert client.post(f"{BASE}preview/", data, format="json").status_code == 400
    assert not StudyCohort.objects.exists()


def test_real_packaged_terminology_resolves_and_round_trips_in_download(
    setup_cohorts, tmp_path, monkeypatch
):
    from lx_dtypes.knowledge_bases import get_packaged_knowledge_base
    from lx_dtypes.terminology import terminology_loader
    from lx_dtypes.terminology.terminology_loader import load_module_kb
    from lx_dtypes.terminology.terminology_service import TerminologyService
    from lx_dtypes.utils.study_setup_yaml import parse_study_setup_yaml

    descriptor = get_packaged_knowledge_base("coloreg", "0.1.0")
    service = TerminologyService(tmp_path / "registry.json")
    service.register_local(
        "coloreg", "0.1.0", input_dirs=[descriptor.installed_data_root()]
    )
    monkeypatch.setattr(terminology_loader, "get_terminology_service", lambda: service)
    package = load_module_kb("coloreg", version="0.1.0")
    name = next(iter(package.examination))
    client, _, _, _ = setup_cohorts
    data = definition()
    data["study_metadata"] = {
        "terminology_requirements": [{"module": "coloreg", "version": "0.1.0"}],
        "inclusion_criteria": [
            {
                "name": "Required examination",
                "concepts": [
                    {
                        "module": "coloreg",
                        "version": "0.1.0",
                        "kind": "examination",
                        "name": name,
                    }
                ],
            }
        ],
    }
    response = client.post(BASE, data, format="json")
    assert response.status_code == 201, response.data
    download = client.get(f"{BASE}{response.data['id']}/definition/")
    parsed = parse_study_setup_yaml(download.content.decode())
    concept = parsed.cohorts[0].study_metadata.inclusion_criteria[0].concepts[0]
    assert (concept.module, concept.version, concept.name) == ("coloreg", "0.1.0", name)


@pytest.mark.parametrize("snapshot", [[], None, False, {"schema_version": "unknown"}])
def test_invalid_persisted_definition_snapshot_rejected(setup_cohorts, snapshot):
    _, user, _, _ = setup_cohorts
    with pytest.raises(ValidationError):
        StudyCohort.objects.create(
            created_by=user,
            name="Study",
            hypothesis="Why",
            filters={"limit": 100},
            definition_snapshot=snapshot,
        )
