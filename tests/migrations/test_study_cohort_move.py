"""Exercise real forward and reverse migrations with existing cohort relations."""

from __future__ import annotations

from uuid import uuid4

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from lx_dtypes.models.contracts.study_setup import (
    StudyCohortDefinition,
    StudySetupDefinition,
)


@pytest.mark.django_db(transaction=True)
def test_move_preserves_identity_snapshots_memberships_and_sequences():
    before = [
        ("endoreg_db", "0096_studycohort"),
        ("lx_annotate", "0014_studycohort_study"),
    ]
    after = [
        ("endoreg_db", "0096_studycohort"),
        ("lx_annotate", "0015_move_studycohort_to_endoreg"),
    ]
    executor = MigrationExecutor(connection)
    executor.migrate(before)
    try:
        old_apps = executor.loader.project_state(before).apps
        user = old_apps.get_model("auth", "User").objects.create(
            username="cohort-migration-owner"
        )
        study = old_apps.get_model("endoreg_db", "Study").objects.create(
            name="Parent", created_by_id=user.pk
        )
        dataset = old_apps.get_model("endoreg_db", "AIDataSet").objects.create(
            name="Membership", dataset_type="clinical", ai_model_type=None
        )
        patient = old_apps.get_model("endoreg_db", "Patient").objects.create(
            patient_hash="f" * 64, is_real_person=False
        )
        examination = old_apps.get_model(
            "endoreg_db", "PatientExamination"
        ).objects.create(patient_id=patient.pk, hash="a" * 64)
        identity = uuid4()
        snapshot = StudySetupDefinition(
            schema_version="1.0",
            definition_id="legacy",
            definition_version="1.0.0",
            cohorts=[
                StudyCohortDefinition(
                    definition_id="cohort", name="Cohort", hypothesis="Question"
                )
            ],
        ).model_dump(mode="json")
        source = old_apps.get_model("lx_annotate", "StudyCohort").objects.create(
            id=7001,
            created_by_id=user.pk,
            study_id=study.pk,
            name="Cohort",
            hypothesis="Question",
            filters={"limit": 25},
            definition_uuid=identity,
            definition_snapshot=snapshot,
        )
        source.datasets.add(dataset)
        source.imported_examinations.add(examination)
        original = (
            old_apps.get_model("lx_annotate", "StudyCohort")
            .objects.values()
            .get(pk=source.pk)
        )
        conflict = old_apps.get_model("endoreg_db", "StudyCohort").objects.create(
            created_by_id=user.pk, name="Existing core cohort", hypothesis="Question"
        )
        with pytest.raises(ValueError, match="Target cohort table is not empty"):
            MigrationExecutor(connection).migrate(after)
        assert source.datasets.count() == 1
        conflict.delete()
        executor = MigrationExecutor(connection)
        executor.migrate(after)
        moved_apps = executor.loader.project_state(after).apps
        target_model = moved_apps.get_model("endoreg_db", "StudyCohort")
        assert target_model.objects.values().get(pk=source.pk) == original
        target = target_model.objects.get(pk=source.pk)
        assert list(target.datasets.values_list("pk", flat=True)) == [dataset.pk]
        assert list(target.imported_examinations.values_list("pk", flat=True)) == [
            examination.pk
        ]
        assert "lx_annotate_studycohort" not in connection.introspection.table_names()
        next_row = target_model.objects.create(
            created_by_id=user.pk, name="Next", hypothesis="Question"
        )
        assert next_row.pk > source.pk
        # A rollback restores the previous schema and moves all rows back.
        executor = MigrationExecutor(connection)
        executor.migrate(before)
        restored = executor.loader.project_state(before).apps.get_model(
            "lx_annotate", "StudyCohort"
        )
        assert restored.objects.values().get(pk=source.pk) == original
        assert restored.objects.get(pk=source.pk).datasets.count() == 1
    finally:
        # Later ownership migrations may depend on this cutover. Restore the
        # complete current schema, not merely this test's historical target.
        current = MigrationExecutor(connection)
        current.migrate(current.loader.graph.leaf_nodes())
