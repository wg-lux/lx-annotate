from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from endoreg_db.models.administration.center.center import Center
from endoreg_db.models.medical.examination.examination import Examination
from endoreg_db.models.other.gender import Gender
from endoreg_db.models.other.study_table_import import StudyTableImport
from endoreg_db.services.studies.table_parser import parse_table_mapping
from rest_framework.test import APIClient

from lx_annotate.models.study_cohort import StudyCohort

pytestmark = pytest.mark.django_db

SPEC = """
schema_version: '1.0'
mapping_id: 9366490f-b799-41f5-b9dc-1cd899d9784b
name: Cohort table
knowledge_base:
  knowledge_base_module: dgvs_reporting
  knowledge_base_version: 0.1.0
row_id: id
first_name: first
last_name: last
dob: dob
gender: gender
examination_date: date
examination: {value: colonoscopy}
"""
CSV = b"id,first,last,dob,gender,date\none,Erika,Mustermann,1980-02-01,female,2026-01-10\n"
MAPPINGS = "/endoreg-api/media/studies/table-mappings/"
COHORTS = "/endoreg-api/media/studies/cohorts/"


@pytest.fixture
def table_context(packaged_registry, master_key):
    user = User.objects.create_user(username="table-import-owner", is_superuser=True)
    center = Center.objects.create(name="Table center")
    Gender.objects.get_or_create(name="female")
    Examination.objects.get_or_create(name="colonoscopy")
    cohort = StudyCohort.objects.create(
        created_by=user,
        name="Imported table",
        hypothesis="Test membership",
        filters={"limit": 100},
    )
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(MAPPINGS, {"yaml": SPEC}, format="json")
    assert response.status_code == 201, response.data
    return client, user, center, cohort, response.data["id"]


def upload(client, cohort, center, mapping_id, mode="import"):
    return client.post(
        f"{COHORTS}{cohort.pk}/table-import/",
        {
            "file": SimpleUploadedFile("table.csv", CSV, content_type="text/csv"),
            "mapping_id": mapping_id,
            "center_id": str(center.pk),
            "mode": mode,
        },
        format="multipart",
    )


def test_validate_import_replay_and_saved_cohort_preview(table_context):
    client, _, center, cohort, mapping_id = table_context
    validation = upload(client, cohort, center, mapping_id, "validate")
    assert validation.status_code == 200, validation.data
    assert not StudyTableImport.objects.exists()
    assert cohort.imported_examinations.count() == 0
    first = upload(client, cohort, center, mapping_id)
    assert first.status_code == 200, first.data
    second = upload(client, cohort, center, mapping_id)
    assert second.status_code == 200, second.data
    assert second.data["replayed"] == 1
    assert cohort.imported_examinations.count() == 0
    assert cohort.datasets.get().examinations.count() == 1
    assert first.data["dataset_id"] == second.data["dataset_id"]
    preview = client.post(
        f"{COHORTS}preview/",
        {
            "cohort_id": cohort.pk,
            "name": cohort.name,
            "hypothesis": cohort.hypothesis,
            "filters": {},
            "dataset_ids": [first.data["dataset_id"]],
        },
        format="json",
    )
    assert preview.status_code == 200, preview.data
    assert len(preview.data["cases"]) == 1
    assert not preview.data["cases"][0]["videos"]
    assert "Erika" not in str(preview.data)


def test_mapping_and_cohort_owner_scope(table_context):
    client, _, center, cohort, mapping_id = table_context
    other = User.objects.create_user(username="table-other-owner", is_superuser=True)
    client.force_authenticate(other)
    assert client.get(MAPPINGS).data["mappings"] == []
    assert client.get(f"{MAPPINGS}{mapping_id}/").status_code == 404
    assert upload(client, cohort, center, mapping_id).status_code == 404
    preview = client.post(
        f"{COHORTS}preview/",
        {
            "cohort_id": cohort.pk,
            "name": "Forbidden",
            "hypothesis": "Forbidden",
        },
        format="json",
    )
    assert preview.status_code == 404


def test_template_creates_new_mapping_identity(table_context):
    client, _, _, _, _ = table_context
    first = parse_table_mapping(client.get(MAPPINGS).data["template"])
    second = parse_table_mapping(client.get(MAPPINGS).data["template"])
    assert first.mapping_id != second.mapping_id
    assert first.first_name.columns == ["Patient.Vorname"]


def test_writes_require_role_even_in_debug(table_context):
    client, user, center, cohort, mapping_id = table_context
    user.is_superuser = False
    user.save(update_fields=["is_superuser"])
    client.force_authenticate(user)
    assert upload(client, cohort, center, mapping_id).status_code == 403
    assert client.post(MAPPINGS, {"yaml": SPEC}, format="json").status_code == 403
    assert not StudyTableImport.objects.exists()


def test_invalid_upload_does_not_change_cohort(table_context):
    client, _, center, cohort, mapping_id = table_context
    response = client.post(
        f"{COHORTS}{cohort.pk}/table-import/",
        {
            "file": SimpleUploadedFile("table.csv", CSV.replace(b"Erika", b"")),
            "mapping_id": mapping_id,
            "center_id": str(center.pk),
            "mode": "import",
        },
        format="multipart",
    )
    assert response.status_code == 400
    assert response.data["row_number"] == 2
    assert "Mustermann" not in str(response.data)
    assert cohort.imported_examinations.count() == 0
    assert not StudyTableImport.objects.exists()


@pytest.mark.parametrize("suffix", ["csv", "xlsx", "xls"])
def test_corrupt_upload_returns_validation_response(table_context, suffix):
    client, _, center, cohort, mapping_id = table_context
    response = client.post(
        f"{COHORTS}{cohort.pk}/table-import/",
        {
            "file": SimpleUploadedFile(f"table.{suffix}", b'"unclosed'),
            "mapping_id": mapping_id,
            "center_id": str(center.pk),
            "mode": "import",
        },
        format="multipart",
    )
    assert response.status_code == 400
    assert not StudyTableImport.objects.exists()
