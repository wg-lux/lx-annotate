"""Create deterministic patient partitions without reading or copying media."""

from __future__ import annotations

import random
from collections import defaultdict

from endoreg_db.models import AIDataSet, VideoFile

from lx_annotate.schemas.ai_dataset_splits import (
    PatientMembership,
    SplitConfig,
    SplitSnapshot,
    VideoMembership,
)


def collect_membership(dataset: AIDataSet) -> dict[int, list[VideoMembership]]:
    frames: dict[int, set[int]] = defaultdict(set)
    annotations: dict[int, list[int]] = defaultdict(list)
    segments: dict[int, list[int]] = defaultdict(list)
    for annotation_id, frame_id, video_id in dataset.image_annotations.order_by(
        "pk"
    ).values_list("pk", "frame_id", "frame__video_id"):
        if video_id is None:
            raise ValueError("Every annotated frame must belong to a video.")
        frames[video_id].add(frame_id)
        annotations[video_id].append(annotation_id)
    for segment_id, video_id in dataset.video_annotations.order_by("pk").values_list(
        "pk", "video_file_id"
    ):
        if video_id is None:
            raise ValueError("Every segment must belong to a video.")
        segments[video_id].append(segment_id)
    video_ids = set(annotations) | set(segments)
    patients: dict[int, list[VideoMembership]] = defaultdict(list)
    videos = (
        VideoFile.objects.filter(pk__in=video_ids)
        .select_related("examination")
        .order_by("pk")
    )
    for video in videos:
        direct = video.patient_id
        examination = video.examination.patient_id if video.examination else None
        if direct is not None and examination is not None and direct != examination:
            raise ValueError(
                "Conflicting patient associations; repair video patient links before splitting."
            )
        patient_id = direct if direct is not None else examination
        if patient_id is None:
            raise ValueError(
                "Missing patient associations; link every video to a patient before splitting."
            )
        patients[patient_id].append(
            VideoMembership(
                video_id=video.pk,
                center_id=video.center_id,
                frame_ids=sorted(frames[video.pk]),
                image_annotation_ids=annotations[video.pk],
                segment_ids=segments[video.pk],
            )
        )
    return dict(patients)


def build_snapshot(
    config: SplitConfig, membership: dict[int, list[VideoMembership]]
) -> SplitSnapshot:
    patient_ids = sorted(membership)
    random.Random(config.seed).shuffle(patient_ids)
    test_count = max(1, (len(patient_ids) * config.test_percent + 50) // 100)
    if len(patient_ids) - test_count < config.k:
        raise ValueError(
            "Too few patients: reserve the test holdout and at least one patient per validation fold."
        )
    return SplitSnapshot(
        config=config,
        patients=[
            PatientMembership(
                patient_id=patient_id,
                validation_fold=(
                    None if index < test_count else (index - test_count) % config.k
                ),
                videos=membership[patient_id],
            )
            for index, patient_id in enumerate(patient_ids)
        ],
    )


def bucket_summary(patients: list[PatientMembership]) -> dict[str, int]:
    videos = [video for patient in patients for video in patient.videos]
    return {
        "patient_count": len(patients),
        "video_count": len(videos),
        "frame_count": sum(len(video.frame_ids) for video in videos),
        "image_annotation_count": sum(
            len(video.image_annotation_ids) for video in videos
        ),
        "segment_count": sum(len(video.segment_ids) for video in videos),
    }


def summarize_snapshot(snapshot: SplitSnapshot) -> dict:
    patients = snapshot.patients
    return {
        "config": snapshot.config.model_dump(),
        "total": bucket_summary(patients),
        "test": bucket_summary(
            [patient for patient in patients if patient.validation_fold is None]
        ),
        "folds": [
            {
                "index": index,
                "training": bucket_summary(
                    [
                        p
                        for p in patients
                        if p.validation_fold is not None and p.validation_fold != index
                    ]
                ),
                "validation": bucket_summary(
                    [p for p in patients if p.validation_fold == index]
                ),
            }
            for index in range(snapshot.config.k)
        ],
    }
