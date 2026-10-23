"""Versioned, deliberately narrow representation for protected release candidates."""

from __future__ import annotations

import hashlib
import json
from typing import Annotated, Literal, Self
from uuid import UUID

from pydantic import UUID4, BaseModel, ConfigDict, Field, model_validator

Digest = Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]
Code = Annotated[str, Field(pattern=r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$")]
Index = Annotated[int, Field(ge=0, le=9007199254740991)]
Age = Annotated[int, Field(ge=0, le=125)]


class ReleaseContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)

    def canonical_bytes(self) -> bytes:
        # v1 has no floats, dates or free text. ASCII codes and UUIDs avoid
        # Unicode normalization and cross-language number-format ambiguity.
        return json.dumps(
            self.model_dump(mode="json"),
            ensure_ascii=True,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        ).encode("ascii")

    def sha256(self) -> str:
        return hashlib.sha256(self.canonical_bytes()).hexdigest()


class ReleaseAnnotation(ReleaseContract):
    kind: Literal["frame", "segment"]
    start_frame: Index
    end_frame: Index
    label: Code
    value: bool

    @model_validator(mode="after")
    def valid_interval(self) -> Self:
        if self.end_frame <= self.start_frame:
            raise ValueError("Annotation intervals must be nonempty and half-open.")
        if self.kind == "frame" and self.end_frame != self.start_frame + 1:
            raise ValueError("Frame annotations must cover exactly one frame.")
        return self


class ReleaseVideo(ReleaseContract):
    schema_version: Literal["lx-public-video-record-v1"] = "lx-public-video-record-v1"
    release_id: UUID4
    id: UUID4
    patient_id: UUID4
    age_band_start: Annotated[int, Field(ge=0, le=125, multiple_of=5)]
    validation_fold: Index | None
    media_sha256: Digest
    media_bytes: Annotated[int, Field(gt=0, le=9007199254740991)]
    time_base_num: Annotated[int, Field(gt=0, le=9007199254740991)]
    time_base_den: Annotated[int, Field(gt=0, le=9007199254740991)]
    presentation_timestamps: tuple[Index, ...] = Field(min_length=1)
    annotations: tuple[ReleaseAnnotation, ...] = Field(min_length=1)

    @property
    def media_name(self) -> str:
        return f"media/{self.id}.mp4"

    @model_validator(mode="after")
    def valid_timeline(self) -> Self:
        if any(
            a >= b
            for a, b in zip(
                self.presentation_timestamps, self.presentation_timestamps[1:]
            )
        ):
            raise ValueError("Presentation timestamps must increase strictly.")
        if any(
            a.end_frame > len(self.presentation_timestamps) for a in self.annotations
        ):
            raise ValueError("Annotation lies outside the packaged timeline.")
        return self


class ReleaseEntry(ReleaseContract):
    record: ReleaseVideo
    record_sha256: Digest

    @model_validator(mode="after")
    def verify_digest(self) -> Self:
        if self.record.sha256() != self.record_sha256:
            raise ValueError("Record digest mismatch.")
        return self


class ReleaseManifest(ReleaseContract):
    schema_version: Literal["lx-public-video-v1"] = "lx-public-video-v1"
    release_id: UUID4
    transformation_version: Code
    label_codes: tuple[Code, ...] = Field(min_length=1)
    folds: Annotated[int, Field(ge=2, le=20)]
    entries: tuple[ReleaseEntry, ...] = Field(min_length=3)

    @model_validator(mode="after")
    def verify_membership(self) -> Self:
        patients: dict[UUID, int | None] = {}
        ids: set[UUID] = set()
        digests: set[str] = set()
        if len(set(self.label_codes)) != len(self.label_codes):
            raise ValueError("Duplicate label code.")
        for entry in self.entries:
            record = entry.record
            if record.release_id != self.release_id:
                raise ValueError("Record belongs to a different release.")
            if record.id in ids or record.media_sha256 in digests:
                raise ValueError("Duplicate video identity or media content.")
            ids.add(record.id)
            digests.add(record.media_sha256)
            if (
                record.patient_id in patients
                and patients[record.patient_id] != record.validation_fold
            ):
                raise ValueError("Patient crosses partitions.")
            patients[record.patient_id] = record.validation_fold
            if any(a.label not in self.label_codes for a in record.annotations):
                raise ValueError("Unknown label code.")
        if set(patients.values()) != {None, *range(self.folds)}:
            raise ValueError("A test holdout and every validation fold are required.")
        return self
