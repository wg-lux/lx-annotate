from __future__ import annotations

from uuid import uuid5

from django.db import migrations, models


def migrate_imported_membership(apps, schema_editor):
    alias = schema_editor.connection.alias
    Cohort = apps.get_model("lx_annotate", "StudyCohort")
    Dataset = apps.get_model("endoreg_db", "AIDataSet")
    Receipt = apps.get_model("endoreg_db", "StudyTableImport")
    for cohort in Cohort.objects.using(alias).all().iterator():
        remaining = set(cohort.imported_examinations.values_list("pk", flat=True))
        if not remaining:
            continue
        receipts = (
            Receipt.objects.using(alias)
            .filter(owner_id=cohort.created_by_id, patient_examination_id__in=remaining)
            .order_by("pk")
        )
        for receipt in receipts:
            identity = uuid5(
                receipt.mapping_id,
                f"{receipt.owner_id}:{receipt.center_id}:{receipt.source_hash}",
            )
            dataset, _ = Dataset.objects.using(alias).get_or_create(
                import_identity=identity,
                defaults={
                    "name": f"{cohort.name[:220]} — Tabellenimport",
                    "owner_id": cohort.created_by_id,
                    "dataset_type": "clinical",
                    "ai_model_type": None,
                },
            )
            dataset.examinations.add(receipt.patient_examination_id)
            dataset.import_receipts.add(receipt.pk)
            cohort.datasets.add(dataset)
            remaining.discard(receipt.patient_examination_id)
        if remaining:
            dataset = Dataset.objects.using(alias).create(
                import_identity=uuid5(cohort.definition_uuid, "legacy-imports"),
                name=f"{cohort.name[:220]} — Bestandsimport",
                owner_id=cohort.created_by_id,
                dataset_type="clinical",
                ai_model_type=None,
            )
            dataset.examinations.add(*remaining)
            cohort.datasets.add(dataset)
        cohort.imported_examinations.clear()
        # Regenerated from current relations on the next save/download.
        Cohort.objects.using(alias).filter(pk=cohort.pk).update(definition_snapshot={})


class Migration(migrations.Migration):
    dependencies = [
        ("lx_annotate", "0012_studycohort_imported_examinations"),
        ("endoreg_db", "0094_dataset_lifecycle"),
    ]
    operations = [
        migrations.AlterField(
            model_name="aidatasetsplitplan",
            name="dataset",
            field=models.ForeignKey(
                null=True, on_delete=models.SET_NULL, to="endoreg_db.aidataset"
            ),
        ),
        migrations.RunPython(migrate_imported_membership, migrations.RunPython.noop),
    ]
