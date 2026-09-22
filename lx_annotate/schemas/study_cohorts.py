"""Validated saved cohort definitions; membership is recomputed on explicit preview."""

from __future__ import annotations

from typing import Annotated, Self

from endoreg_db.services.study_cohort import parse_study_cohort_filters
from pydantic import BaseModel, ConfigDict, Field, model_validator

PositiveId = Annotated[int, Field(strict=True, gt=0)]


class CohortFilters(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    date_from: str | None = None
    date_to: str | None = None
    center_key: str | None = None
    examination_name: str | None = None
    document_type: str | None = None
    finding: str | None = None
    annotation_label: str | None = None
    has_report: bool | None = None
    has_video: bool | None = None
    limit: int = Field(default=100, ge=1, le=500)

    @model_validator(mode="after")
    def valid_filters(self) -> Self:
        parse_study_cohort_filters(self.model_dump())
        return self


class CohortDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    hypothesis: str = Field(min_length=1, max_length=10000)
    filters: CohortFilters = Field(default_factory=CohortFilters)
    dataset_ids: list[PositiveId] = Field(default_factory=list, max_length=500)

    @model_validator(mode="after")
    def unique_datasets(self) -> Self:
        if len(self.dataset_ids) != len(set(self.dataset_ids)):
            raise ValueError("Dataset IDs must be unique.")
        return self


class CohortDatasetLink(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    cohort_id: PositiveId
    linked: bool
