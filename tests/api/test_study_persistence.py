from __future__ import annotations

from importlib import import_module
from types import SimpleNamespace

import pytest
from django.apps import apps
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import connection
from endoreg_db.models.other.study import Study

from lx_annotate.models import StudyCohort
from tests.api.test_study_cohorts import definition
from tests.api.test_study_cohorts import setup_cohorts as setup_cohorts

pytestmark = pytest.mark.django_db
BASE = "/endoreg-api/media/studies/cohorts/"


def test_cohorts_share_persisted_parent_and_keep_dataset_memberships(setup_cohorts):
    client, owner, _, datasets = setup_cohorts
    first = client.post(BASE, definition([datasets[0].pk]), format="json")
    assert first.status_code == 201, first.data
    study = Study.objects.get(pk=first.data["study_id"])
    assert study.created_by_id == owner.pk
    second = client.post(BASE, {**definition(), "study_id": study.pk}, format="json")
    assert second.status_code == 201, second.data
    assert StudyCohort.objects.filter(study=study).count() == 2
    update = client.put(f"{BASE}{second.data['id']}/", definition(), format="json")
    assert update.status_code == 200
    assert update.data["study_id"] == study.pk
    assert Study.objects.count() == 1
    # Removing a cohort does not implicitly delete its parent study.
    assert client.delete(f"{BASE}{second.data['id']}/").status_code == 204
    assert Study.objects.filter(pk=study.pk).exists()
    study.delete()
    assert not StudyCohort.objects.exists()
    assert datasets[0].__class__.objects.filter(pk=datasets[0].pk).exists()


def test_foreign_study_rejected_at_api_and_model_boundaries(setup_cohorts):
    client, owner, _, _ = setup_cohorts
    other = User.objects.create_user(username="foreign-study-owner")
    study = Study.objects.create(created_by=other, name="Private")
    response = client.post(BASE, {**definition(), "study_id": study.pk}, format="json")
    assert response.status_code == 404
    assert not StudyCohort.objects.exists()
    with pytest.raises(ValidationError, match="same owner"):
        StudyCohort.objects.create(
            created_by=owner, study=study, name="Cohort", hypothesis="Question"
        )


def test_migration_backfills_parent_without_changing_dataset_links(setup_cohorts):
    _, owner, _, datasets = setup_cohorts
    cohort = StudyCohort.objects.create(
        created_by=owner,
        **{k: v for k, v in definition().items() if k != "dataset_ids"},
    )
    cohort.datasets.add(datasets[0])
    migrate = import_module(
        "lx_annotate.migrations.0014_studycohort_study"
    ).create_parent_studies
    legacy_apps = SimpleNamespace(
        get_model=lambda app, model: apps.get_model(
            "endoreg_db" if model == "StudyCohort" else app, model
        )
    )
    migrate(legacy_apps, SimpleNamespace(connection=connection))
    migrate(legacy_apps, SimpleNamespace(connection=connection))
    cohort.refresh_from_db()
    assert cohort.study.name == cohort.name
    assert cohort.study.uuid == cohort.definition_uuid
    assert cohort.study.created_by_id == owner.pk
    assert list(cohort.datasets.values_list("pk", flat=True)) == [datasets[0].pk]
    assert Study.objects.count() == 1
