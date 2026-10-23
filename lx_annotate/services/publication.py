"""Build encrypted, manifest-bound candidates; never authorize public disclosure."""

from __future__ import annotations

import hashlib
import io
from collections.abc import Iterator, Mapping
from uuid import UUID, uuid4

from django.core.files.base import ContentFile, File
from django.db import transaction
from endoreg_db.models import (
    Frame,
    ImageClassificationAnnotation,
    LabelVideoSegment,
    PatientExamination,
    VideoFile,
)
from endoreg_db.models.state.audit_ledger import AuditLedger
from endoreg_db.models.state.video import VideoState
from endoreg_db.schemas.video_storage import (
    CanonicalFrameTimeline,
    CanonicalTimelineHistoryEntry,
)
from endoreg_db.services.centers.access import resolve_allowed_center_ids
from endoreg_db.services.media.export_downloads import leased_video_bytes
from endoreg_db.utils.encryption.encrypted import EncryptedStorage
from endoreg_db.utils.model_fields import model_int, model_optional_int
from pydantic import TypeAdapter

from lx_annotate.hub.hub_export_state import resolve_video_hub_export_state
from lx_annotate.models import AIDatasetSplitPlan
from lx_annotate.schemas.ai_dataset_splits import SplitSnapshot, VideoMembership
from lx_annotate.schemas.publication import (
    Age,
    ReleaseAnnotation,
    ReleaseEntry,
    ReleaseManifest,
    ReleaseVideo,
)
from lx_annotate.services.ai_dataset_splits import validate_snapshot_patients


class _ChunkReader(io.RawIOBase):
    """Bounded adapter from the existing leased stream to encrypted storage."""

    def __init__(self, chunks: Iterator[bytes], expected_digest: str):
        self.chunks = chunks
        self.pending = b""
        self.digest = hashlib.sha256()
        self.expected_digest = expected_digest
        self.size = 0

    def readable(self) -> bool:
        return True

    def readinto(self, buffer) -> int:
        if not self.pending:
            self.pending = next(self.chunks, b"")
            if not self.pending:
                if self.digest.hexdigest() != self.expected_digest:
                    raise ValueError("Processed media changed during packaging.")
                return 0
            self.digest.update(self.pending)
            self.size += len(self.pending)
        size = min(len(buffer), len(self.pending))
        buffer[:size], self.pending = self.pending[:size], self.pending[size:]
        return size


def _annotations(
    member: VideoMembership, labels: Mapping[int, str], timeline: CanonicalFrameTimeline
) -> tuple[ReleaseAnnotation, ...]:
    frames = list(
        ImageClassificationAnnotation.objects.select_for_update(of=("self",))
        .filter(
            pk__in=member.image_annotation_ids,
            frame__video_id=member.video_id,
        )
        .select_related("frame")
        .order_by("pk")
    )
    segments = list(
        LabelVideoSegment.objects.select_for_update()
        .filter(
            pk__in=member.segment_ids,
            video_file_id=member.video_id,
        )
        .order_by("pk")
    )
    if len(frames) != len(member.image_annotation_ids) or len(segments) != len(
        member.segment_ids
    ):
        raise ValueError("Saved annotation membership is stale.")
    if {a.frame.pk for a in frames} != set(member.frame_ids):
        raise ValueError("Saved frame membership is stale.")
    for annotation in frames:
        frame = annotation.frame
        if (
            frame.frame_number < 0
            or frame.frame_number >= len(timeline.presentation_timestamps)
            or frame.presentation_timestamp
            != timeline.presentation_timestamps[frame.frame_number]
        ):
            raise ValueError("Frame coordinates do not match the processed timeline.")
    if any(
        s.prediction_meta is not None
        or (s.source is not None and s.source.name == "prediction")
        for s in segments
    ):
        raise ValueError(
            "Prediction segments require a separately reviewed release representation."
        )
    return tuple(
        [
            ReleaseAnnotation(
                kind="frame",
                start_frame=a.frame.frame_number,
                end_frame=a.frame.frame_number + 1,
                label=labels[model_int(a, "label_id")],
                value=a.value,
            )
            for a in frames
        ]
        + [
            ReleaseAnnotation(
                kind="segment",
                start_frame=s.start_frame_number,
                end_frame=s.end_frame_number,
                label=labels[model_int(s, "label_id")],
                value=True,
            )
            for s in segments
        ]
    )


def _save_exact(
    storage: EncryptedStorage, name: str, content: File, written: list[str]
) -> None:
    if storage.exists(name):
        raise ValueError(
            "Release candidates are immutable; destination already exists."
        )
    saved = storage.save(name, content)
    written.append(saved)
    if saved != name:
        raise ValueError("Release destination collision.")


def build_release_candidate(
    *,
    plan: AIDatasetSplitPlan,
    user: object,
    label_codes: Mapping[int, str],
    ages_at_examination: Mapping[int, int],
    transformation_version: str,
    storage: EncryptedStorage,
) -> ReleaseManifest:
    """Freeze a saved video split into encrypted candidate artifacts.

    The caller must supply curator-selected label codes and transformation version.
    No source identifiers, staff metadata, demographics or raw digests are emitted.
    A manifest is written last. Its digest is the reference for subsequent review.
    """
    if not getattr(user, "is_authenticated", False) or not getattr(
        user, "is_active", False
    ):
        raise PermissionError("Authentication is required.")
    if not isinstance(storage, EncryptedStorage):
        raise TypeError("Candidates require encrypted storage.")
    allowed = resolve_allowed_center_ids(user)
    release_id = uuid4()
    prefix = f"release_candidates/{release_id}"
    written: list[str] = []
    try:
        with transaction.atomic():
            saved_plan = AIDatasetSplitPlan.objects.select_for_update().get(pk=plan.pk)
            snapshot = SplitSnapshot.model_validate(saved_plan.snapshot)
            members = [v for p in snapshot.patients for v in p.videos]
            ages = TypeAdapter(dict[int, Age]).validate_python(
                dict(ages_at_examination), strict=True
            )
            if set(ages) != {m.video_id for m in members}:
                raise ValueError(
                    "Curator-verified ages are required for exactly the saved video membership."
                )
            videos = {
                v.pk: v
                for v in VideoFile.objects.select_for_update()
                .filter(
                    pk__in=[m.video_id for m in members],
                )
                .order_by("pk")
            }
            list(
                PatientExamination.objects.select_for_update()
                .filter(
                    pk__in=[
                        key
                        for video in videos.values()
                        if (key := model_optional_int(video, "examination_id"))
                        is not None
                    ],
                )
                .order_by("pk")
            )
            validate_snapshot_patients(snapshot)
            # Lock persisted frame coordinates as well as annotation rows.
            list(
                Frame.objects.select_for_update()
                .filter(
                    pk__in=[f for m in members for f in m.frame_ids],
                )
                .order_by("pk")
            )
            entries: list[ReleaseEntry] = []
            for patient in snapshot.patients:
                patient_id = uuid4()
                for member in patient.videos:
                    video = videos[member.video_id]
                    if video.state is not None:
                        video.state = VideoState.objects.select_for_update().get(
                            pk=video.state.pk
                        )
                    if video.center_id != member.center_id or (
                        allowed is not None and video.center_id not in allowed
                    ):
                        raise PermissionError(
                            "Video is outside the authorized center scope."
                        )
                    readiness = resolve_video_hub_export_state(
                        video, verify_processed_media=True
                    )
                    if not readiness.transfer_eligible:
                        raise ValueError(readiness.transfer_validation_error)
                    source_name = video.processed_file.name
                    if not source_name or not source_name.lower().endswith(".mp4"):
                        raise ValueError(
                            "The v1 release format requires processed MP4 media."
                        )
                    history = (video.meta or {}).get("canonical_timeline_history", [])
                    if not isinstance(history, list):
                        raise ValueError("Canonical timeline history must be a list.")
                    timelines = [
                        entry.after
                        for raw in history
                        if (
                            entry := CanonicalTimelineHistoryEntry.model_validate(raw)
                        ).artifact_kind
                        == "processed"
                        and entry.after.content_hash == readiness.processed_video_hash
                    ]
                    if not timelines or any(t != timelines[0] for t in timelines):
                        raise ValueError(
                            "An unambiguous processed-artifact timeline is required."
                        )
                    timeline = timelines[0]
                    annotations = _annotations(member, label_codes, timeline)
                    artifact_id = uuid4()
                    name = f"{prefix}/media/{artifact_id}.mp4"
                    with video.processed_file.storage.open(source_name, "rb") as source:
                        reader = _ChunkReader(
                            leased_video_bytes(video, source.chunks()),
                            readiness.processed_video_hash,
                        )
                        with io.BufferedReader(reader) as stream:
                            _save_exact(storage, name, File(stream), written)
                    record = ReleaseVideo(
                        release_id=release_id,
                        id=artifact_id,
                        patient_id=patient_id,
                        age_band_start=(ages[member.video_id] // 5) * 5,
                        validation_fold=patient.validation_fold,
                        media_sha256=readiness.processed_video_hash,
                        media_bytes=reader.size,
                        time_base_num=timeline.time_base_num,
                        time_base_den=timeline.time_base_den,
                        presentation_timestamps=tuple(timeline.presentation_timestamps),
                        annotations=annotations,
                    )
                    entries.append(
                        ReleaseEntry(record=record, record_sha256=record.sha256())
                    )
            manifest = ReleaseManifest(
                release_id=release_id,
                transformation_version=transformation_version,
                label_codes=tuple(sorted(set(label_codes.values()))),
                folds=snapshot.config.k,
                entries=tuple(entries),
            )
            _save_exact(
                storage,
                f"{prefix}/manifest.json",
                ContentFile(manifest.canonical_bytes()),
                written,
            )
            verify_release_candidate(
                storage=storage,
                release_id=release_id,
                expected_manifest_sha256=manifest.sha256(),
            )
            audit = AuditLedger.objects.create(
                user=user,
                object_type="ReleaseCandidate",
                object_pk=str(release_id),
                action="release_candidate_built",
                data={
                    "schema_version": manifest.schema_version,
                    "release_id": str(release_id),
                    "manifest_sha256": manifest.sha256(),
                    "split_plan_id": saved_plan.pk,
                },
            )
            if not AuditLedger.objects.filter(pk=audit.pk).exists():
                raise RuntimeError("Release candidate audit persistence failed.")
            return manifest
    except BaseException:
        # The manifest is removed first; cleanup failures propagate, never vanish.
        for name in reversed(written):
            storage.delete(name)
        raise


def verify_release_candidate(
    *,
    storage: EncryptedStorage,
    release_id: UUID,
    expected_manifest_sha256: str,
) -> ReleaseManifest:
    """Verify a frozen candidate against an independently retained manifest digest."""
    prefix = f"release_candidates/{release_id}"
    with storage.open(f"{prefix}/manifest.json", "rb") as source:
        payload = source.read()
    if hashlib.sha256(payload).hexdigest() != expected_manifest_sha256:
        raise ValueError("Manifest digest mismatch.")
    manifest = ReleaseManifest.model_validate_json(payload)
    if manifest.release_id != release_id or manifest.canonical_bytes() != payload:
        raise ValueError("Noncanonical manifest or release identity mismatch.")
    for entry in manifest.entries:
        digest, size = hashlib.sha256(), 0
        with storage.open(f"{prefix}/{entry.record.media_name}", "rb") as source:
            for chunk in source.chunks():
                digest.update(chunk)
                size += len(chunk)
        if (
            digest.hexdigest() != entry.record.media_sha256
            or size != entry.record.media_bytes
        ):
            raise ValueError("Packaged media integrity mismatch.")
    return manifest
