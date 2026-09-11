"""Versioned immutable membership contracts for patient-grouped splits."""

from __future__ import annotations

from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

PositiveId = Annotated[int, Field(strict=True, gt=0)]


class SplitConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    name: str = Field(min_length=1, max_length=120)
    k: int = Field(ge=2, le=20)
    test_percent: int = Field(ge=1, le=50)
    seed: int = Field(ge=0, le=2147483647)

    @model_validator(mode="after")
    def nonblank_name(self) -> Self:
        self.name = self.name.strip()
        if not self.name:
            raise ValueError("A split name is required.")
        return self


class VideoMembership(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    video_id: PositiveId
    center_id: PositiveId
    frame_ids: list[PositiveId]
    image_annotation_ids: list[PositiveId]
    segment_ids: list[PositiveId]


class PatientMembership(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    patient_id: PositiveId
    # None is the fixed test holdout. Otherwise this is the validation fold.
    validation_fold: int | None = Field(ge=0)
    videos: list[VideoMembership] = Field(min_length=1)


class SplitSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    schema_version: Literal["1.0"] = "1.0"
    algorithm: Literal["patient_shuffle_v1"] = "patient_shuffle_v1"
    config: SplitConfig
    patients: list[PatientMembership] = Field(min_length=3)

    @model_validator(mode="after")
    def validate_partition(self) -> Self:
        seen: dict[str, set[int]] = {
            key: set()
            for key in (
                "patient",
                "video",
                "frame_ids",
                "image_annotation_ids",
                "segment_ids",
            )
        }

        def unique(key: str, ids: list[int]) -> None:
            if len(ids) != len(set(ids)) or seen[key].intersection(ids):
                raise ValueError(f"Duplicate {key} membership.")
            seen[key].update(ids)

        folds: set[int | None] = set()
        for patient in self.patients:
            unique("patient", [patient.patient_id])
            folds.add(patient.validation_fold)
            for video in patient.videos:
                unique("video", [video.video_id])
                for key in ("frame_ids", "image_annotation_ids", "segment_ids"):
                    unique(key, getattr(video, key))
                if not video.image_annotation_ids and not video.segment_ids:
                    raise ValueError("Every video must contain annotations.")
                if bool(video.frame_ids) != bool(video.image_annotation_ids):
                    raise ValueError(
                        "Frame and image annotation membership must agree."
                    )
        if folds != {None, *range(self.config.k)}:
            raise ValueError(
                "A nonempty test bucket and every validation fold are required."
            )
        return self
