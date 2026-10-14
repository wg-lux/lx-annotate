from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from endoreg_db.models import AIDataSet, PatientExamination, SensitiveMeta, VideoFile
from endoreg_db.models.other.study_table_import import StudyTableImport

from tests.api.test_study_table_import import table_context as table_context
from tests.api.test_study_table_import import upload

pytestmark = pytest.mark.django_db
BASE = "/endoreg-api/media/studies/datasets/"


def imported(table_context):
    client, user, center, cohort, mapping = table_context
    response = upload(client, cohort, center, mapping)
    assert response.status_code == 200, response.data
    return (
        client,
        user,
        center,
        cohort,
        AIDataSet.objects.get(pk=response.data["dataset_id"]),
    )


def test_create_update_read_and_study_crud(table_context):
    client, _, _, cohort, dataset = imported(table_context)
    response = client.post(BASE, {"name": "Independent dataset"}, format="json")
    assert response.status_code == 201, response.data
    assert response.data["modality"] == "clinical"
    detail = f"{BASE}{dataset.pk}/"
    response = client.put(
        detail, {"name": "Renamed dataset", "description": "Test"}, format="json"
    )
    assert response.status_code == 200, response.data
    assert client.get(detail).data["name"] == "Renamed dataset"
    assert len(client.get(detail + "?members=true").data["patients"]) == 1
    study = f"/endoreg-api/media/studies/cohorts/{cohort.pk}/"
    assert client.get(study).status_code == 200
    assert client.delete(study).status_code == 204
    assert AIDataSet.objects.filter(pk=dataset.pk).exists()
    assert dataset.examinations.exists()


def test_combine_deduplicates_and_split_preserves_patient_groups(table_context):
    client, user, _, cohort, first = imported(table_context)
    exam = first.examinations.get()
    second = AIDataSet.objects.create(
        owner=user, name="Second", dataset_type="clinical", ai_model_type=None
    )
    second.examinations.add(exam)
    combined = client.post(
        f"{BASE}combine/",
        {"name": "Union", "sources": [first.pk, second.pk]},
        format="json",
    )
    assert combined.status_code == 201, combined.data
    target = AIDataSet.objects.get(pk=combined.data["id"])
    assert target.examinations.count() == 1
    assert first.examinations.count() == second.examinations.count() == 1
    from endoreg_db.models import Patient

    other_patient = Patient.objects.create(
        center=exam.patient.center, patient_hash="b" * 64, is_real_person=False
    )
    other_exam = PatientExamination.objects.create(patient=other_patient, hash="c" * 64)
    first.examinations.add(other_exam)
    split = client.post(
        f"{BASE}{first.pk}/split/",
        {
            "partitions": [
                {"name": "One", "patients": [exam.patient_id]},
                {"name": "Two", "patients": [other_patient.pk]},
            ]
        },
        format="json",
    )
    assert split.status_code == 201, split.data
    results = [AIDataSet.objects.get(pk=row["id"]) for row in split.data]
    assert list(results[0].examinations.values_list("pk", flat=True)) == [exam.pk]
    assert list(results[1].examinations.values_list("pk", flat=True)) == [other_exam.pk]
    assert first.examinations.count() == 2
    link = (
        f"/endoreg-api/settings/application/ai_datasets/{results[0].pk}/study_cohorts/"
    )
    assert (
        client.post(
            link, {"cohort_id": cohort.pk, "linked": True}, format="json"
        ).status_code
        == 200
    )
    assert cohort.datasets.filter(pk=results[0].pk).exists()
    assert (
        client.post(
            link, {"cohort_id": cohort.pk, "linked": False}, format="json"
        ).status_code
        == 200
    )


@pytest.mark.parametrize("mode", ["memberships_only", "exclusive_imported_records"])
def test_deletion_requires_choice_and_respects_it(table_context, mode):
    client, _, _, cohort, dataset = imported(table_context)
    exam = dataset.examinations.get()
    preview = client.get(f"{BASE}{dataset.pk}/deletion-preview/")
    assert preview.status_code == 200, preview.data
    assert preview.data["removable"] == [exam.pk]
    url = f"{BASE}{dataset.pk}/"
    assert (
        client.delete(
            url, {"preview": preview.data["preview"]}, format="json"
        ).status_code
        == 400
    )
    response = client.delete(
        url, {"preview": preview.data["preview"], "mode": mode}, format="json"
    )
    assert response.status_code == 200, response.data
    assert not AIDataSet.objects.filter(pk=dataset.pk).exists()
    assert not cohort.datasets.exists()
    assert PatientExamination.objects.filter(pk=exam.pk).exists() == (
        mode == "memberships_only"
    )
    receipt = StudyTableImport.objects.get()
    assert (receipt.patient_examination is None) == (
        mode == "exclusive_imported_records"
    )
    if mode == "exclusive_imported_records":
        assert not SensitiveMeta.objects.filter(pseudo_examination_id=exam.pk).exists()


@pytest.mark.parametrize(
    "protection", ["shared", "media", "edited", "legacy", "verified", "date"]
)
def test_shared_linked_edited_and_unproven_records_are_retained(
    table_context, protection
):
    client, user, center, _, dataset = imported(table_context)
    exam = dataset.examinations.get()
    if protection == "shared":
        other = AIDataSet.objects.create(name="Shared", owner=user)
        other.examinations.add(exam)
    elif protection == "media":
        VideoFile.objects.create(
            center=center,
            examination=exam,
            sensitive_meta=SensitiveMeta.objects.get(pseudo_examination=exam),
        )
    elif protection == "edited":
        PatientExamination.objects.filter(pk=exam.pk).update(
            report_draft={"edited": True}
        )
    elif protection == "verified":
        from endoreg_db.models.state.sensitive_meta import SensitiveMetaState

        meta = SensitiveMeta.objects.get(pseudo_examination=exam)
        SensitiveMetaState.objects.update_or_create(
            origin=meta, defaults={"dob_verified": True}
        )
    elif protection == "date":
        from datetime import timedelta

        PatientExamination.objects.filter(pk=exam.pk).update(
            date_start=exam.date_start + timedelta(days=1)
        )
    else:
        StudyTableImport.objects.filter(patient_examination=exam).update(
            owns_examination=False
        )
    preview = client.get(f"{BASE}{dataset.pk}/deletion-preview/")
    assert preview.status_code == 200, preview.data
    assert preview.data["removable"] == []
    response = client.delete(
        f"{BASE}{dataset.pk}/",
        {"preview": preview.data["preview"], "mode": "exclusive_imported_records"},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert PatientExamination.objects.filter(pk=exam.pk).exists()


@pytest.mark.parametrize("status", ["queued", "retry_wait"])
def test_pending_training_protects_dataset(table_context, status):
    from endoreg_db.models.aidataset.aidataset import AIModelTrainingRun

    client, _, _, _, dataset = imported(table_context)
    AIModelTrainingRun.objects.create(dataset=dataset, status=status)
    preview = client.get(f"{BASE}{dataset.pk}/deletion-preview/")
    response = client.delete(
        f"{BASE}{dataset.pk}/",
        {"preview": preview.data["preview"], "mode": "memberships_only"},
        format="json",
    )
    assert response.status_code == 400
    assert AIDataSet.objects.filter(pk=dataset.pk).exists()


def test_training_snapshot_survives_dataset_deletion(table_context):
    from lx_annotate.models import AIDatasetSplitPlan
    from lx_annotate.schemas.ai_dataset_splits import SplitConfig
    from lx_annotate.services.ai_dataset_splits import build_snapshot
    from tests.api.test_ai_dataset_splits import membership

    client, user, _, _, dataset = imported(table_context)
    snapshot = build_snapshot(
        SplitConfig(name="Plan", k=5, test_percent=20, seed=42), membership()
    ).model_dump(mode="json")
    plan = AIDatasetSplitPlan.objects.create(
        dataset=dataset, created_by=user, snapshot=snapshot
    )
    preview = client.get(f"{BASE}{dataset.pk}/deletion-preview/")
    response = client.delete(
        f"{BASE}{dataset.pk}/",
        {"preview": preview.data["preview"], "mode": "memberships_only"},
        format="json",
    )
    assert response.status_code == 200, response.data
    plan.refresh_from_db()
    assert plan.dataset_id is None
    assert plan.snapshot == snapshot


def test_stale_preview_and_foreign_owner_cannot_delete(table_context):
    client, _, _, _, dataset = imported(table_context)
    preview = client.get(f"{BASE}{dataset.pk}/deletion-preview/").data["preview"]
    dataset.name = "Changed after preview"
    dataset.save()
    command = {"preview": preview, "mode": "memberships_only"}
    assert (
        client.delete(f"{BASE}{dataset.pk}/", command, format="json").status_code == 400
    )
    other = User.objects.create_user(username="other-dataset-owner")
    from django.contrib.auth.models import Group
    from endoreg_db.models import PortalUserInfo

    other.groups.add(Group.objects.get_or_create(name="researcher")[0])
    PortalUserInfo.objects.create(user=other).centers.add(
        dataset.examinations.get().patient.center
    )
    client.force_authenticate(other)
    assert (
        client.delete(f"{BASE}{dataset.pk}/", command, format="json").status_code == 403
    )
    assert AIDataSet.objects.filter(pk=dataset.pk).exists()


def test_invalid_partition_rolls_back(table_context):
    client, _, _, _, dataset = imported(table_context)
    before = AIDataSet.objects.count()
    patient = dataset.examinations.get().patient_id
    response = client.post(
        f"{BASE}{dataset.pk}/split/",
        {
            "partitions": [
                {"name": "A", "patients": [patient]},
                {"name": "B", "patients": [patient]},
            ]
        },
        format="json",
    )
    assert response.status_code == 400
    assert AIDataSet.objects.count() == before


def test_legacy_import_memberships_migrate_to_datasets(table_context):
    from importlib import import_module
    from types import SimpleNamespace

    from django.apps import apps
    from django.db import connection

    legacy_apps = SimpleNamespace(
        get_model=lambda app, model: apps.get_model(
            "endoreg_db" if model == "StudyCohort" else app, model
        )
    )

    client, _, _, cohort, dataset = imported(table_context)
    examination = dataset.examinations.get()
    cohort.imported_examinations.add(examination)
    dataset.delete()
    StudyTableImport.objects.update(owns_examination=False, deletion_record={})
    migration = import_module("lx_annotate.migrations.0013_dataset_lifecycle")
    migration.migrate_imported_membership(legacy_apps, connection.schema_editor())
    migrated = cohort.datasets.get()
    assert migrated.examinations.get() == examination
    assert migrated.import_receipts.count() == 1
    assert not cohort.imported_examinations.exists()
    assert client.get(f"{BASE}{migrated.pk}/deletion-preview/").data["removable"] == []
    migration.migrate_imported_membership(legacy_apps, connection.schema_editor())
    assert cohort.datasets.count() == 1


def test_video_memberships_survive_dataset_deletion(table_context):
    from endoreg_db.models import (
        Frame,
        ImageClassificationAnnotation,
        Label,
        LabelVideoSegment,
    )

    client, _, center, _, dataset = imported(table_context)
    exam = dataset.examinations.get()
    video = VideoFile.objects.create(
        center=center, patient=exam.patient, examination=exam, joined_dataset=dataset
    )
    label = Label.objects.create(name="dataset-lifecycle-label")
    frame = Frame.objects.create(video=video, frame_number=0, timestamp=0)
    annotation = ImageClassificationAnnotation.objects.create(
        frame=frame, label=label, value=True
    )
    segment = LabelVideoSegment.objects.create(
        video_file=video, label=label, start_frame_number=0, end_frame_number=1
    )
    dataset.image_annotations.add(annotation)
    dataset.video_annotations.add(segment)
    other = AIDataSet.objects.create(owner=dataset.owner, name="Another dataset")
    combined = client.post(
        f"{BASE}combine/",
        {"name": "Combined videos", "sources": [dataset.pk, other.pk]},
        format="json",
    )
    assert combined.status_code == 201, combined.data
    target = AIDataSet.objects.get(pk=combined.data["id"])
    assert target.image_annotations.get() == annotation
    assert target.video_annotations.get() == segment
    assert target.videos.get() == video
    preview = client.get(f"{BASE}{dataset.pk}/deletion-preview/").data
    response = client.delete(
        f"{BASE}{dataset.pk}/",
        {"preview": preview["preview"], "mode": "exclusive_imported_records"},
        format="json",
    )
    assert response.status_code == 200, response.data
    video.refresh_from_db()
    assert video.joined_dataset.is_default_video_dataset
    assert ImageClassificationAnnotation.objects.filter(pk=annotation.pk).exists()
    assert LabelVideoSegment.objects.filter(pk=segment.pk).exists()
    assert target.examinations.filter(pk=exam.pk).exists()
