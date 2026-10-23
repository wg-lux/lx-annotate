from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from uuid import uuid4

import pytest
from django.contrib.auth.models import AnonymousUser, User
from django.core.files.base import ContentFile
from django.core.management import call_command
from django.utils import timezone
from endoreg_db.models import (
    AIDataSet,
    Center,
    Frame,
    ImageClassificationAnnotation,
    Label,
    Patient,
    VideoFile,
    VideoState,
)
from endoreg_db.models.state.video_segment_validation import (
    mark_post_validation_complete,
)
from endoreg_db.utils.encryption.encrypted import MAGIC, EncryptedStorage
from endoreg_db.utils.file_operations import atomic_write_file
from pydantic import ValidationError

from lx_annotate.models import AIDatasetSplitPlan
from lx_annotate.schemas.ai_dataset_splits import SplitConfig
from lx_annotate.schemas.publication import (
    ReleaseAnnotation,
    ReleaseEntry,
    ReleaseManifest,
    ReleaseVideo,
)
from lx_annotate.services import publication
from lx_annotate.services.ai_dataset_splits import build_snapshot, collect_membership
from lx_annotate.services.publication import (
    build_release_candidate,
    verify_release_candidate,
)


@pytest.fixture
def candidate_inputs(db, tmp_path, monkeypatch):
    source_storage = EncryptedStorage(
        location=tmp_path / "source", master_key=os.urandom(32)
    )
    storage = EncryptedStorage(
        location=tmp_path / "candidate", master_key=os.urandom(32)
    )
    monkeypatch.setattr(
        VideoFile._meta.get_field("processed_file"), "storage", source_storage
    )
    user = User.objects.create_user(username="release-reviewer", is_superuser=True)
    center = Center.objects.create(name="release-test", center_key="release-test")
    label = Label.objects.create(name="internal-label")
    dataset = AIDataSet.objects.create(name="internal-cohort")
    videos = []
    for index in range(3):
        content = f"synthetic processed artifact {index}".encode()
        digest = hashlib.sha256(content).hexdigest()
        timeline = dict(
            content_hash=digest,
            time_base_num=1,
            time_base_den=1000,
            presentation_timestamps=[0, 40],
        )
        patient = Patient.objects.create(
            first_name="Synthetic", last_name=str(index), center=center
        )
        video = VideoFile.objects.create(
            center=center,
            patient=patient,
            raw_video_hash=f"internal-raw-{index}",
            state=VideoState.objects.create(),
            processed_file=ContentFile(content, name=f"internal-name-{index}.mp4"),
            meta={
                "canonical_timeline_history": [
                    dict(
                        schema_version="1",
                        artifact_kind="processed",
                        before=timeline,
                        after=timeline,
                    )
                ]
            },
        )
        frame = Frame.objects.create(
            video=video, frame_number=0, timestamp=0, presentation_timestamp=0
        )
        annotation = ImageClassificationAnnotation.objects.create(
            frame=frame, label=label, value=True
        )
        dataset.image_annotations.add(annotation)
        mark_post_validation_complete(video)
        VideoState.objects.filter(pk=video.state.pk).update(
            anonymization_validated=True,
            ready_for_export=True,
            ready_for_export_by=user.username,
            ready_for_export_at=timezone.now(),
            processed_file_sha256=digest,
        )
        VideoFile.objects.filter(pk=video.pk).update(processed_video_hash=digest)
        video.refresh_from_db()
        videos.append(video)
    snapshot = build_snapshot(
        SplitConfig(name="release", k=2, test_percent=20, seed=1),
        collect_membership(dataset),
    )
    plan = AIDatasetSplitPlan.objects.create(
        dataset=dataset, created_by=user, snapshot=snapshot.model_dump(mode="json")
    )
    return dict(
        plan=plan,
        user=user,
        label_codes={label.pk: "finding"},
        ages_at_examination={v.pk: age for v, age in zip(videos, [4, 5, 125])},
        transformation_version="reviewed-v1",
        storage=storage,
    ), videos


def test_packaging_is_encrypted_minimized_partitioned_and_verifiable(candidate_inputs):
    kwargs, videos = candidate_inputs
    manifest = build_release_candidate(**kwargs)
    storage = kwargs["storage"]
    assert (
        verify_release_candidate(
            storage=storage,
            release_id=manifest.release_id,
            expected_manifest_sha256=manifest.sha256(),
        )
        == manifest
    )
    assert {entry.record.validation_fold for entry in manifest.entries} == {None, 0, 1}
    assert {entry.record.age_band_start for entry in manifest.entries} == {0, 5, 125}
    payload = manifest.canonical_bytes()
    for private in [
        b"internal",
        b"annotator",
        b"center",
        b"raw_video_hash",
        b"date_of_birth",
    ]:
        assert private not in payload
    for path in Path(storage.location).rglob("*"):
        if path.is_file() and path.suffix != ".lock":
            assert path.read_bytes().startswith(MAGIC)
            assert b"synthetic processed" not in path.read_bytes()
    next_manifest = build_release_candidate(**kwargs)
    assert next_manifest.release_id != manifest.release_id
    assert {e.record.patient_id for e in next_manifest.entries}.isdisjoint(
        e.record.patient_id for e in manifest.entries
    )
    assert {e.record.media_sha256 for e in manifest.entries} == {
        v.processed_video_hash for v in videos
    }


@pytest.mark.parametrize(
    "damage",
    [
        "stale_patient",
        "missing_annotation",
        "wrong_key",
        "tamper",
        "digest",
        "timeline",
        "not_reviewed",
        "label",
        "scope",
        "missing_age",
        "invalid_age",
    ],
)
def test_invalid_candidate_never_publishes_manifest(
    candidate_inputs, damage, monkeypatch
):
    kwargs, videos = candidate_inputs
    video = videos[0]
    if damage == "stale_patient":
        VideoFile.objects.filter(pk=video.pk).update(patient=videos[1].patient)
    elif damage == "missing_annotation":
        ImageClassificationAnnotation.objects.filter(frame__video=video).delete()
    elif damage == "wrong_key":
        monkeypatch.setattr(
            video.processed_file.storage, "_explicit_master_key", os.urandom(32)
        )
    elif damage == "tamper":
        path = Path(video.processed_file.storage.path(video.processed_file.name))
        data = path.read_bytes()
        atomic_write_file(destination=path, content=[data[:-1] + bytes([data[-1] ^ 1])])
    elif damage == "digest":
        VideoFile.objects.filter(pk=video.pk).update(processed_video_hash="f" * 64)
    elif damage == "timeline":
        Frame.objects.filter(video=video).update(presentation_timestamp=99)
    elif damage == "not_reviewed":
        VideoState.objects.filter(pk=video.state.pk).update(
            anonymization_validated=False, ready_for_export=False
        )
    elif damage == "label":
        kwargs["label_codes"] = {}
    elif damage == "missing_age":
        kwargs["ages_at_examination"] = {}
    elif damage == "invalid_age":
        kwargs["ages_at_examination"][video.pk] = True
    else:
        kwargs["user"] = AnonymousUser()
    with pytest.raises((ValueError, KeyError, PermissionError)):
        build_release_candidate(**kwargs)
    assert not list(Path(kwargs["storage"].location).rglob("*.json"))
    assert not [
        p
        for p in Path(kwargs["storage"].location).rglob("*")
        if p.is_file() and p.suffix != ".lock"
    ]


def test_verifier_rejects_changed_manifest_and_media(candidate_inputs):
    kwargs, _ = candidate_inputs
    manifest = build_release_candidate(**kwargs)
    storage = kwargs["storage"]
    with pytest.raises(ValueError, match="Manifest digest"):
        verify_release_candidate(
            storage=storage,
            release_id=manifest.release_id,
            expected_manifest_sha256="f" * 64,
        )
    record = manifest.entries[0].record
    name = f"release_candidates/{manifest.release_id}/{record.media_name}"
    storage.delete(name)
    storage.save(name, ContentFile(b"changed content"))
    with pytest.raises(ValueError, match="media integrity"):
        verify_release_candidate(
            storage=storage,
            release_id=manifest.release_id,
            expected_manifest_sha256=manifest.sha256(),
        )


def test_strict_canonical_record_vector_and_unknown_fields():
    annotation = ReleaseAnnotation(
        kind="frame", start_frame=0, end_frame=1, label="finding", value=True
    )
    assert (
        annotation.canonical_bytes()
        == b'{"end_frame":1,"kind":"frame","label":"finding","start_frame":0,"value":true}'
    )
    assert (
        annotation.sha256() == hashlib.sha256(annotation.canonical_bytes()).hexdigest()
    )
    with pytest.raises(ValidationError):
        ReleaseAnnotation.model_validate(
            {**annotation.model_dump(), "annotator": "private"}
        )
    with pytest.raises(ValidationError):
        ReleaseAnnotation.model_validate(
            {**annotation.model_dump(), "start_frame": 0.5}
        )


def test_manifest_rejects_cross_partition_patient_and_record_mutation():
    patient = uuid4()
    release_id = uuid4()
    entries = []
    for index, fold in enumerate([None, 0, 1]):
        record = ReleaseVideo(
            release_id=release_id,
            id=uuid4(),
            patient_id=patient,
            age_band_start=45,
            validation_fold=fold,
            media_sha256=hashlib.sha256(str(index).encode()).hexdigest(),
            media_bytes=1,
            time_base_num=1,
            time_base_den=1,
            presentation_timestamps=(0,),
            annotations=(
                ReleaseAnnotation(
                    kind="frame",
                    start_frame=0,
                    end_frame=1,
                    label="finding",
                    value=True,
                ),
            ),
        )
        entries.append(ReleaseEntry(record=record, record_sha256=record.sha256()))
    with pytest.raises(ValidationError, match="crosses partitions"):
        ReleaseManifest(
            release_id=release_id,
            transformation_version="v1",
            label_codes=("finding",),
            folds=2,
            entries=tuple(entries),
        )
    payload = json.loads(entries[0].model_dump_json())
    payload["record"]["annotations"][0]["value"] = False
    with pytest.raises(ValidationError, match="digest mismatch"):
        ReleaseEntry.model_validate_json(json.dumps(payload))


def test_consumer_failure_removes_copies_and_cleanup_failure_propagates(
    candidate_inputs, monkeypatch
):
    kwargs, _ = candidate_inputs
    original = publication._save_exact

    def fail_manifest(storage, name, content, written):
        if name.endswith("manifest.json"):
            raise RuntimeError("consumer interrupted")
        original(storage, name, content, written)

    monkeypatch.setattr(publication, "_save_exact", fail_manifest)
    with pytest.raises(RuntimeError, match="consumer interrupted"):
        build_release_candidate(**kwargs)
    assert not list(Path(kwargs["storage"].location).rglob("*.mp4"))

    def fail_cleanup(name):
        raise OSError("cleanup failed")

    monkeypatch.setattr(kwargs["storage"], "delete", fail_cleanup)
    with pytest.raises(OSError, match="cleanup failed"):
        build_release_candidate(**kwargs)
    assert not list(Path(kwargs["storage"].location).rglob("manifest.json"))


def test_missing_audit_proof_removes_candidate(candidate_inputs, monkeypatch):
    kwargs, _ = candidate_inputs

    def fail_audit(**fields):
        raise RuntimeError("audit unavailable")

    monkeypatch.setattr(publication.AuditLedger.objects, "create", fail_audit)
    with pytest.raises(RuntimeError, match="audit unavailable"):
        build_release_candidate(**kwargs)
    assert not list(Path(kwargs["storage"].location).rglob("*.json"))
    assert not list(Path(kwargs["storage"].location).rglob("*.mp4"))


def test_management_command_builds_protected_candidate(
    candidate_inputs, tmp_path, monkeypatch
):
    from io import StringIO

    from lx_annotate.management.commands import build_release_candidate as command

    kwargs, _ = candidate_inputs
    label_id = next(iter(kwargs["label_codes"]))
    codes = tmp_path / "labels.yml"
    atomic_write_file(destination=codes, content=[f"{label_id}: finding\n".encode()])
    ages = tmp_path / "ages.yml"
    atomic_write_file(
        destination=ages,
        content=[
            "".join(
                f"{key}: {value}\n"
                for key, value in kwargs["ages_at_examination"].items()
            ).encode()
        ],
    )
    monkeypatch.setattr(
        command, "EncryptedStorage", lambda **options: kwargs["storage"]
    )
    output = StringIO()
    call_command(
        "build_release_candidate",
        plan_id=kwargs["plan"].pk,
        user_id=kwargs["user"].pk,
        label_codes=codes,
        ages_at_examination=ages,
        transformation_version="reviewed-v1",
        stdout=output,
    )
    result = json.loads(output.getvalue())
    assert result["published"] is False
    assert len(result["manifest_sha256"]) == 64
