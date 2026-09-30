from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models

User = get_user_model()


class AIDatasetSplitPlan(models.Model):
    """Immutable, validated annotation membership snapshot."""

    dataset = models.ForeignKey("endoreg_db.AIDataSet", on_delete=models.PROTECT)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    snapshot = models.JSONField()

    def clean(self):
        from pydantic import ValidationError as SchemaError

        from lx_annotate.schemas.ai_dataset_splits import SplitSnapshot

        super().clean()
        try:
            self.snapshot = SplitSnapshot.model_validate(self.snapshot).model_dump(
                mode="json"
            )
        except SchemaError as error:
            raise ValidationError(
                {"snapshot": "Invalid split membership snapshot."}
            ) from error

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Split plans are immutable; create a new plan.")
        self.full_clean()
        return super().save(*args, **kwargs)

    class Meta:
        ordering = ["-created_at", "-pk"]
