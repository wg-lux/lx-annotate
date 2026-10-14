from __future__ import annotations

from importlib.resources import files
from io import StringIO

import pytest
from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError
from django.core.management import CommandError, call_command
from endoreg_db.models import (
    AIDataSet,
    Center,
    PortalUserInfo,
    Study,
    StudyCohort,
    StudySetupImport,
)
from rest_framework.test import APIClient

from lx_annotate.services.study_setup_import import import_study_setup

pytestmark = pytest.mark.django_db
URL = "/endoreg-api/media/studies/setup-import/"


@pytest.fixture
def setup_import(settings):
    settings.DEBUG = True
    user = User.objects.create_user(username="setup-owner")
    user.groups.add(Group.objects.get_or_create(name="patient:write")[0])
    center = Center.objects.create(name="Setup center", center_key="setup-center")
    PortalUserInfo.objects.create(user=user).centers.add(center)
    client = APIClient()
    client.force_authenticate(user)
    raw = files("lx_dtypes").joinpath("data/study_metadata/research.yml").read_text()
    return client, user, raw, set(AIDataSet.objects.values_list("pk", flat=True))


def test_validate_dry_run_import_reload_and_idempotent_replay(setup_import):
    client, user, raw, baseline = setup_import
    for mode in ("validate", "dry_run"):
        response = client.post(URL, {"yaml": raw, "mode": mode}, format="json")
        assert response.status_code == 200, response.data
        assert response.data["status"] == "planned"
        assert not StudySetupImport.objects.exists()
        assert set(AIDataSet.objects.values_list("pk", flat=True)) == baseline
        assert not StudyCohort.objects.exists()
        assert not Study.objects.exists()
    response = client.post(URL, {"yaml": raw, "mode": "import"}, format="json")
    assert response.status_code == 201, response.data
    receipt = StudySetupImport.objects.get(owner=user)
    assert receipt.content_sha256 == response.data["content_sha256"]
    assert set(receipt.payload["datasets"]) == set(response.data["datasets"])
    image_dataset = AIDataSet.objects.get(
        pk=response.data["datasets"]["colorectal_images"]
    )
    assert image_dataset.owner == user
    assert image_dataset.is_active is True
    first = StudyCohort.objects.get(pk=response.data["cohorts"]["multimodal_review"])
    second = StudyCohort.objects.get(pk=response.data["cohorts"]["image_review"])
    assert first.datasets.count() == 2
    assert list(second.datasets.all()) == [image_dataset]
    assert first.study_id == second.study_id
    first.name = "Edited after import"
    first.save()
    repeated = client.post(
        URL, {"yaml": raw + "\n# Same definition\n", "mode": "import"}, format="json"
    )
    assert repeated.status_code == 200, repeated.data
    assert repeated.data == {**response.data, "status": "unchanged"}
    first.refresh_from_db()
    assert first.name == "Edited after import"
    assert StudySetupImport.objects.count() == 1
    with pytest.raises(ValidationError, match="immutable"):
        receipt.save()


def test_conflict_rejected_and_new_version_preserves_original(setup_import):
    client, _, raw, baseline = setup_import
    assert (
        client.post(URL, {"yaml": raw, "mode": "import"}, format="json").status_code
        == 201
    )
    changed = raw.replace("Colorectal research images", "Changed display name")
    assert (
        client.post(URL, {"yaml": changed, "mode": "import"}, format="json").status_code
        == 409
    )
    assert StudySetupImport.objects.count() == 1
    changed = changed.replace(
        "definition_version: '1.0.0'", "definition_version: '1.0.1'"
    )
    assert (
        client.post(URL, {"yaml": changed, "mode": "import"}, format="json").status_code
        == 201
    )
    assert StudySetupImport.objects.count() == 2
    assert AIDataSet.objects.count() == len(baseline) + 4


@pytest.mark.parametrize(
    "suffix", ["\nowner: 1\n", "\npermissions: [admin]\n", "\ncohorts: []\n"]
)
def test_invalid_document_does_not_partially_write(setup_import, suffix):
    client, _, raw, baseline = setup_import
    assert (
        client.post(
            URL, {"yaml": raw + suffix, "mode": "import"}, format="json"
        ).status_code
        == 422
    )
    assert set(AIDataSet.objects.values_list("pk", flat=True)) == baseline
    assert not StudySetupImport.objects.exists()


def test_late_failure_rolls_back_all_definition_rows(setup_import, monkeypatch):
    _, user, raw, baseline = setup_import
    save = StudyCohort.save
    calls = 0

    def failing_save(instance, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise ValidationError("Injected second cohort failure")
        return save(instance, **kwargs)

    monkeypatch.setattr(StudyCohort, "save", failing_save)
    with pytest.raises(ValidationError):
        import_study_setup(raw, actor=user, dry_run=False)
    assert calls == 2
    assert set(AIDataSet.objects.values_list("pk", flat=True)) == baseline
    assert not StudyCohort.objects.exists()
    assert not Study.objects.exists()
    assert not StudySetupImport.objects.exists()


def test_authorization_cannot_be_bypassed_in_debug_or_by_replay(setup_import):
    client, user, raw, baseline = setup_import
    assert (
        client.post(URL, {"yaml": raw, "mode": "import"}, format="json").status_code
        == 201
    )
    user.groups.clear()
    assert (
        client.post(URL, {"yaml": raw, "mode": "import"}, format="json").status_code
        == 403
    )
    user.groups.add(Group.objects.get(name="patient:write"))
    PortalUserInfo.objects.get(user=user).centers.clear()
    assert (
        client.post(URL, {"yaml": raw, "mode": "import"}, format="json").status_code
        == 403
    )
    client.force_authenticate(None)
    assert client.post(
        URL, {"yaml": raw, "mode": "import"}, format="json"
    ).status_code in (401, 403)
    assert StudySetupImport.objects.count() == 1


def test_unavailable_participating_center_is_rejected(setup_import):
    client, _, raw, baseline = setup_import
    raw = raw.replace(
        "    filters:",
        "    study_metadata:\n      participating_centers:\n        - center_key: foreign-center\n          name: Foreign center\n    filters:",
        1,
    )
    response = client.post(URL, {"yaml": raw, "mode": "import"}, format="json")
    assert response.status_code == 403, response.data
    assert set(AIDataSet.objects.values_list("pk", flat=True)) == baseline


def test_cli_uses_same_authorized_import_and_dry_run(setup_import, tmp_path):
    _, user, raw, baseline = setup_import
    source = tmp_path / "study.yml"
    source.write_text(raw)
    output = StringIO()
    call_command(
        "import_study_setup", "dry-run", str(source), actor_id=user.pk, stdout=output
    )
    assert '"status":"planned"' in output.getvalue()
    assert not StudySetupImport.objects.exists()
    call_command(
        "import_study_setup", "import", str(source), actor_id=user.pk, stdout=StringIO()
    )
    assert StudySetupImport.objects.count() == 1
    user.groups.clear()
    with pytest.raises(CommandError):
        call_command(
            "import_study_setup",
            "import",
            str(source),
            actor_id=user.pk,
            stdout=StringIO(),
        )


@pytest.mark.django_db(transaction=True)
def test_concurrent_first_imports_share_one_receipt_and_identity_mapping(setup_import):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    from django.db import connections

    _, user, raw, baseline = setup_import
    barrier = Barrier(2)

    def perform_import():
        try:
            actor = User.objects.get(pk=user.pk)
            barrier.wait(timeout=15)
            return import_study_setup(raw, actor=actor, dry_run=False)
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(perform_import)
        second = pool.submit(perform_import)
        results = [first.result(timeout=30), second.result(timeout=30)]
    assert sorted(result.status for result in results) == ["created", "unchanged"]
    assert results[0].datasets == results[1].datasets
    assert results[0].cohorts == results[1].cohorts
    assert StudySetupImport.objects.count() == 1
    assert AIDataSet.objects.count() == len(baseline) + 2
    assert StudyCohort.objects.count() == 3


def test_filter_center_and_missing_terminology_are_validated_before_mutation(
    setup_import,
):
    client, _, raw, baseline = setup_import
    documents = [
        raw.replace(
            "    filters:", "    filters:\n      center_key: foreign-center", 1
        ),
        raw.replace(
            "    filters:",
            "    study_metadata:\n      terminology_requirements:\n        - module: missing_study_package\n          version: '999.0.0'\n    filters:",
            1,
        ),
    ]
    for document, status in zip(documents, (403, 422), strict=True):
        response = client.post(URL, {"yaml": document, "mode": "import"}, format="json")
        assert response.status_code == status, response.data
        assert set(AIDataSet.objects.values_list("pk", flat=True)) == baseline
        assert not StudySetupImport.objects.exists()


def test_imported_download_contains_only_its_cohort_and_retains_source_receipt(
    setup_import,
):
    from lx_dtypes.utils.study_setup_yaml import parse_study_setup_yaml

    client, user, raw, _ = setup_import
    result = client.post(URL, {"yaml": raw, "mode": "import"}, format="json")
    assert result.status_code == 201
    cohort_id = result.data["cohorts"]["image_review"]
    response = client.get(f"/endoreg-api/media/studies/cohorts/{cohort_id}/definition/")
    assert response.status_code == 200
    downloaded = parse_study_setup_yaml(response.content.decode())
    assert len(downloaded.cohorts) == len(downloaded.datasets) == 1
    assert downloaded.cohorts[0].name == "Image review"
    receipt = StudySetupImport.objects.get(owner=user).validated_receipt()
    assert len(receipt.definition.cohorts) == 3
    assert receipt.definition == parse_study_setup_yaml(raw)


def test_replay_rejects_corrupt_receipt_and_foreign_current_dataset_link(setup_import):
    from datetime import date

    from endoreg_db.models import Examination, Patient, PatientExamination

    client, user, raw, _ = setup_import
    result = client.post(URL, {"yaml": raw, "mode": "import"}, format="json")
    assert result.status_code == 201
    receipt = StudySetupImport.objects.get(owner=user)
    original = receipt.payload
    corrupt = {
        **original,
        "definition": {**original["definition"], "definition_version": "9.0.0"},
    }
    StudySetupImport.objects.filter(pk=receipt.pk).update(payload=corrupt)
    assert (
        client.post(URL, {"yaml": raw, "mode": "import"}, format="json").status_code
        == 409
    )
    StudySetupImport.objects.filter(pk=receipt.pk).update(payload=original)
    foreign_center = Center.objects.create(name="Foreign linked center")
    patient = Patient.objects.create(
        first_name="Synthetic",
        last_name="Patient",
        dob=date(1980, 1, 1),
        center=foreign_center,
        is_real_person=False,
    )
    examination = PatientExamination.objects.create(
        patient=patient,
        examination=Examination.objects.create(name="foreign-study-exam"),
    )
    dataset = AIDataSet.objects.create(name="Added later", owner=user)
    dataset.examinations.add(examination)
    StudyCohort.objects.get(pk=result.data["cohorts"]["image_review"]).datasets.add(
        dataset
    )
    assert (
        client.post(URL, {"yaml": raw, "mode": "import"}, format="json").status_code
        == 403
    )


def test_schema_error_reports_location_without_echoing_values(setup_import):
    client, _, raw, _ = setup_import
    response = client.post(
        URL, {"yaml": raw + "\nowner: private-input\n", "mode": "import"}, format="json"
    )
    assert response.status_code == 422
    assert response.data["issues"] == [{"path": ("owner",), "code": "extra_forbidden"}]
    assert "private-input" not in str(response.data)
