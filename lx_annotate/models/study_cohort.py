"""Compatibility import; cohort persistence is owned by endoreg-db."""

from __future__ import annotations

from endoreg_db.models.other.study_cohort import StudyCohort

__all__ = ["StudyCohort"]
