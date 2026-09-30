from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

if TYPE_CHECKING:
    from endoreg_db.models import AIDataSet

User = get_user_model()


class StudyCohort(models.Model):
    """User-owned cohort definition with shared dataset references, not copied annotations."""

    if TYPE_CHECKING:
        created_by_id: int

    name = models.CharField(max_length=255)
    hypothesis = models.TextField()
    filters = models.JSONField(default=dict)
    definition_snapshot = models.JSONField(default=dict, blank=True)
    definition_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    study_metadata = models.JSONField(default=dict, blank=True)
    datasets: models.ManyToManyField[AIDataSet, models.Model] = models.ManyToManyField(
        "endoreg_db.AIDataSet", related_name="study_cohorts", blank=True
    )
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        from lx_dtypes.models.contracts.study_setup import StudySetupDefinition
        from pydantic import ValidationError as SchemaError

        from lx_annotate.schemas.study_cohorts import CohortDefinition

        super().clean()
        try:
            definition = CohortDefinition.model_validate(
                {
                    "name": self.name,
                    "hypothesis": self.hypothesis,
                    "filters": self.filters,
                    "study_metadata": self.study_metadata,
                }
            )
            if self.definition_snapshot != {}:
                self.definition_snapshot = StudySetupDefinition.model_validate(
                    self.definition_snapshot
                ).model_dump(mode="json")
        except SchemaError as error:
            raise ValidationError("Invalid study cohort definition.") from error
        self.name = definition.name
        self.hypothesis = definition.hypothesis
        self.filters = definition.filters.model_dump(mode="json")
        self.study_metadata = definition.study_metadata.model_dump(mode="json")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    class Meta:
        ordering = ["name", "pk"]
