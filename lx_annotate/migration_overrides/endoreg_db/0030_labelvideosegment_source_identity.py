from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        (
            "endoreg_db",
            "0029_dicomexportjob_dicominstance_dicomseries_dicomstudy_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="labelvideosegment",
            name="source_node_key",
            field=models.CharField(
                blank=True,
                editable=False,
                help_text="Immutable source node key for an imported segment.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="labelvideosegment",
            name="source_segment_id",
            field=models.CharField(
                blank=True,
                editable=False,
                help_text="Immutable source-local identifier for an imported segment.",
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name="labelvideosegment",
            constraint=models.CheckConstraint(
                condition=(
                    Q(source_node_key__isnull=True, source_segment_id__isnull=True)
                    | Q(source_node_key__isnull=False, source_segment_id__isnull=False)
                ),
                name="segment_source_identity_complete",
            ),
        ),
        migrations.AddConstraint(
            model_name="labelvideosegment",
            constraint=models.UniqueConstraint(
                condition=Q(source_node_key__isnull=False),
                fields=("source_node_key", "source_segment_id"),
                name="unique_segment_source_identity",
            ),
        ),
    ]
