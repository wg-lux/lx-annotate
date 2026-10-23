"""Compatibility imports for the shared YAML and HTTP cohort contracts."""

from __future__ import annotations

from typing import Literal

from lx_dtypes.models.contracts.cohort_definition import (
    CohortDatasetLink,
    CohortDefinition,
    CohortFilters,
    PositiveId,
)
from pydantic import BaseModel, ConfigDict, Field


class StudyCohortDelete(BaseModel):
    """Explicit confirmation to remove a cohort with its immutable ledger entries."""

    model_config = ConfigDict(extra="forbid", strict=True)
    delete_collection_entries: Literal[True]
    # Guards against deleting entries captured after the operator reviewed the count.
    collection_entry_count: int = Field(ge=1)


__all__ = [
    "CohortDatasetLink",
    "CohortDefinition",
    "CohortFilters",
    "PositiveId",
    "StudyCohortDelete",
]
