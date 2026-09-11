"""Central-hub users retain processed training data after raw-video cleanup."""

from __future__ import annotations

import base64
import hashlib
import json
import subprocess
from pathlib import Path

import pytest
from django.contrib.auth.models import Group, User
from django.core.files.base import ContentFile
from django.test import override_settings
from django.utils import timezone
from endoreg_db.helpers.typing import m2m_add_relation
from endoreg_db.models import (
    AIDataSet,
    Center,
    Frame,
    ImageClassificationAnnotation,
    InformationSource,
    Label,
    LabelSet,
    PortalUserInfo,
    VideoFile,
    VideoState,
)
from endoreg_db.services.frames.materialize_training_frames import (
    materialize_frames_for_annotation_ids,
)
from endoreg_db.utils.file_operations import safe_rmtree
from endoreg_db.utils.storage.files import delete_field_file
from PIL import Image
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def retained_video(
    monkeypatch: pytest.MonkeyPatch,
) -> tuple[VideoFile, AIDataSet, LabelSet, int]:
    monkeypatch.setenv("DJANGO_DEBUG", "false")
    monkeypatch.setenv(
        "LX_ANNOTATE_MASTER_KEY", base64.urlsafe_b64encode(b"0" * 32).decode()
    )
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY_FILE", raising=False)
    # Generate a real, non-clinical video so decoding and training use actual media.
    media = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=c=black:s=64x48:r=25",
            "-frames:v",
            "2",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "frag_keyframe+empty_moov",
            "-f",
            "mp4",
            "pipe:1",
        ],
        check=True,
        capture_output=True,
    ).stdout
    center = Center.objects.create(name="Hub source", center_key="hub-source")
    digest = hashlib.sha256(media).hexdigest()
    state = VideoState.objects.create(
        anonymized=True,
        sensitive_meta_processed=True,
        anonymization_validated=True,
        processing_started=True,
        frames_extracted=True,
        outside_segments_removed=True,
        segment_annotations_created=True,
        segment_annotations_validated=True,
        ready_for_export=True,
        ready_for_export_at=timezone.now(),
        ready_for_export_by="test-suite",
        processed_file_sha256=digest,
    )
    video = VideoFile.objects.create(
        center=center,
        state=state,
        video_hash=digest,
        processed_video_hash=digest,
        fps=25.0,
        frame_count=2,
        duration=0.08,
        width=64,
        height=48,
        raw_file=ContentFile(media, name="hub-source.mp4"),
        processed_file=ContentFile(media, name="hub-processed.mp4"),
    )
    raw_name = video.raw_file.name
    assert raw_name is not None
    assert video.raw_file.storage.exists(raw_name)
    assert delete_field_file(video, "raw_file", missing_ok=False, save=True)
    video.refresh_from_db()
    assert not video.raw_file.name
    assert not video.raw_file.storage.exists(raw_name)
    processed_name = video.processed_file.name
    assert processed_name is not None
    assert video.processed_file.storage.exists(processed_name)
    frame = Frame.objects.create(
        video=video,
        frame_number=0,
        timestamp=0.0,
        relative_path="frame_0000000.jpg",
    )
    label = Label.objects.create(name="hub-training-label")
    label_set = LabelSet.objects.create(name="hub-training-labels", version=1)
    label_set.labels.add(label)
    annotation = ImageClassificationAnnotation.objects.create(
        frame=frame,
        label=label,
        value=True,
        annotator="test-suite",
        information_source=InformationSource.objects.get_or_create(
            name="manual_annotation"
        )[0],
    )
    dataset = AIDataSet.objects.create(
        name="hub-training",
        dataset_type=AIDataSet.DATASET_TYPE_IMAGE,
        ai_model_type=AIDataSet.AI_MODEL_TYPE_IMAGE_MULTILABEL,
    )
    dataset.image_annotations.add(annotation)
    return video, dataset, label_set, int(annotation.pk)


@pytest.mark.parametrize("membership", ["source", "other", "none"])
@override_settings(DEBUG=False, ENDOREG_DEPLOYMENT_ROLE="central_hub")
def test_hub_read_and_training_after_raw_deletion(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
    membership: str,
) -> None:
    video, dataset, label_set, _ = retained_video
    user = User.objects.create_user(username=f"hub-reader-{membership}")
    m2m_add_relation(getattr(user, "groups")).add(
        Group.objects.get_or_create(name="video:read")[0]
    )
    portal = PortalUserInfo.objects.create(user=user)
    if membership == "source":
        portal.centers.add(video.center)
    elif membership == "other":
        portal.centers.add(Center.objects.create(name="Other", center_key="other"))
    client = APIClient()
    client.force_authenticate(user)
    listing = client.get("/api/media/videos/")
    assert listing.status_code == 200, listing.content
    assert video.pk in {row["id"] for row in json.loads(listing.content)["results"]}
    detail = client.get(f"/api/media/videos/{video.pk}/details/")
    assert detail.status_code == 200, detail.content
    if membership != "source":
        assert "original_file_name" not in json.loads(detail.content)
        assert "patient_first_name" not in json.loads(detail.content)
    playback = client.get(f"/api/media/videos/{video.pk}/stream/")
    assert playback.status_code == 302, playback.content
    assert "type=processed" in playback["Location"]
    decoded = client.get(
        f"/api/media/videos/{video.pk}/frames/0/decoded-stream/?type=processed",
    )
    assert decoded.status_code == 200, decoded.content
    assert decoded["Content-Type"] == "image/jpeg"
    assert decoded.content.startswith(b"\xff\xd8")
    manifest = client.post(
        f"/api/settings/application/ai_datasets/{dataset.pk}/training_manifest/",
        {"label_set_id": label_set.pk},
        format="json",
    )
    assert manifest.status_code == 200, manifest.content
    assert json.loads(manifest.content)["summary"]["sample_count"] == 1
    assert json.loads(manifest.content)["manifest"]["provenance"][
        "source_video_kind_by_video_uuid"
    ] == {
        str(video.uuid): "processed",
    }


@override_settings(DEBUG=False, ENDOREG_DEPLOYMENT_ROLE="central_hub")
def test_training_decodes_retained_processed_video(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
    tmp_path: Path,
) -> None:
    video, _, _, annotation_id = retained_video
    output = tmp_path / "training"
    try:
        frames = materialize_frames_for_annotation_ids(
            annotation_ids=[annotation_id],
            output_root=output,
            fps=25.0,
        )
        with Image.open(frames[annotation_id]) as image:
            assert image.size == (64, 48)
        assert not video.raw_file.name
    finally:
        safe_rmtree(output, missing_ok=True)
    assert not output.exists()


@pytest.mark.parametrize("role", ["standalone", "site_node", "local_study_server"])
@override_settings(DEBUG=False)
def test_raw_deletion_does_not_unscope_non_hub_reads(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
    role: str,
) -> None:
    video, _, _, _ = retained_video
    user = User.objects.create_user(username="non-hub-reader")
    m2m_add_relation(getattr(user, "groups")).add(
        Group.objects.get_or_create(name="video:read")[0]
    )
    portal = PortalUserInfo.objects.create(user=user)
    portal.centers.add(Center.objects.create(name="Other", center_key="other"))
    client = APIClient()
    client.force_authenticate(user)
    with override_settings(ENDOREG_DEPLOYMENT_ROLE=role):
        response = client.get("/api/media/videos/")
        assert response.status_code == 200
        assert json.loads(response.content)["results"] == []
        detail = client.get(f"/api/media/videos/{video.pk}/details/")
        assert detail.status_code in (403, 404)


@override_settings(DEBUG=False, ENDOREG_DEPLOYMENT_ROLE="central_hub")
def test_hub_access_does_not_grant_anonymous_or_raw_or_write_access(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    video, dataset, label_set, _ = retained_video
    client = APIClient()
    assert client.get("/api/media/videos/").status_code in (401, 403)
    assert client.post(
        f"/api/settings/application/ai_datasets/{dataset.pk}/training_manifest/",
        {"label_set_id": label_set.pk},
        format="json",
    ).status_code in (401, 403)
    user = User.objects.create_user(username="foreign-reader")
    m2m_add_relation(getattr(user, "groups")).add(
        Group.objects.get_or_create(name="video:write")[0]
    )
    client.force_authenticate(user)
    assert client.patch(
        f"/api/media/videos/{video.pk}/details/",
        {"export_segments_by_video": True},
        format="json",
    ).status_code in (403, 404)
    assert client.get(
        f"/api/media/videos/{video.pk}/hls/playlist.m3u8?type=raw",
    ).status_code in (403, 404)


@override_settings(DEBUG=False, ENDOREG_DEPLOYMENT_ROLE="central_hub")
def test_pytorch_training_reads_processed_frame_without_cache(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
) -> None:
    from endoreg_db.utils.ai.model_training.dataset import EndoMultiLabelDataset
    from endoreg_db.utils.ai.multilabel_dataset_builder import (
        build_dataset_for_training,
    )

    _, dataset, _, _ = retained_video
    data = build_dataset_for_training(dataset)
    training = EndoMultiLabelDataset(
        data["image_paths"],
        data["label_vectors"],
        data["label_masks"],
        frame_ids=data["frame_ids"],
    )
    image, labels, mask = training[0]
    assert tuple(image.shape) == (3, 224, 224)
    assert tuple(labels.shape) == (1,) and labels[0].item() == 1.0
    assert tuple(mask.shape) == (1,) and mask[0].item() == 1.0


@pytest.mark.parametrize(
    "gate",
    ["anonymization_validated", "segment_annotations_validated", "ready_for_export"],
)
@override_settings(DEBUG=False, ENDOREG_DEPLOYMENT_ROLE="central_hub")
def test_virtual_training_frames_require_validation(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
    gate: str,
) -> None:
    from endoreg_db.services.aidataset_training_manifests import (
        build_frame_multilabel_training_manifest,
    )

    video, dataset, label_set, _ = retained_video
    state = video.state
    assert state is not None
    setattr(state, gate, False)
    state.ready_for_export = False
    state.save(update_fields=list({gate, "ready_for_export"}))
    with pytest.raises(
        ValueError, match="no extracted or validated processed frame annotations"
    ):
        build_frame_multilabel_training_manifest(dataset, label_set=label_set)


@pytest.mark.parametrize("damage", ["wrong_key", "tampered"])
def test_training_rejects_encrypted_media_damage_without_plaintext_leaks(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
    monkeypatch: pytest.MonkeyPatch,
    damage: str,
) -> None:
    from endoreg_db.services.frames.training_images import read_processed_training_image
    from endoreg_db.utils.encryption.encrypted import EncryptedStorage
    from endoreg_db.utils.file_operations import atomic_write_file

    video, _, _, annotation_id = retained_video
    frame = ImageClassificationAnnotation.objects.get(pk=annotation_id).frame
    # Raw filesystem reads here inspect ciphertext only, never a parser input.
    encrypted_path = Path(video.processed_file.path)
    ciphertext = encrypted_path.read_bytes()
    assert ciphertext.startswith(b"LXENC01")
    if damage == "wrong_key":
        frame.video.processed_file.storage = EncryptedStorage(
            location=video.processed_file.storage.path(""),
            master_key=b"1" * 32,
        )
    else:
        damaged = ciphertext[:-1] + bytes([ciphertext[-1] ^ 1])
        atomic_write_file(destination=encrypted_path, content=[damaged])
    before = set(Path("/tmp").glob("endoreg-fieldfile-*"))
    with pytest.raises(
        (ValueError, OSError, RuntimeError), match="authentication|decrypt|key"
    ):
        read_processed_training_image(frame)
    assert set(Path("/tmp").glob("endoreg-fieldfile-*")) == before


def test_training_plaintext_is_private_and_removed_after_decoder_error(
    retained_video: tuple[VideoFile, AIDataSet, LabelSet, int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from endoreg_db.services.frames import training_images
    from endoreg_db.utils.frame_stream import EncodedFrameSample

    _, _, _, annotation_id = retained_video
    frame = ImageClassificationAnnotation.objects.get(pk=annotation_id).frame
    seen: list[Path] = []

    def fail_decoder(
        path: Path,
        *,
        frame_number: int,
        timestamp: float | None,
    ) -> EncodedFrameSample:
        assert frame_number == 0
        assert timestamp == 0.0
        assert path.stat().st_mode & 0o777 == 0o600
        assert not path.read_bytes().startswith(b"LXENC01")
        seen.append(path)
        raise RuntimeError("decoder failure")

    monkeypatch.setattr(training_images, "read_video_path_frame_jpeg", fail_decoder)
    with pytest.raises(RuntimeError, match="decoder failure"):
        training_images.read_processed_training_image(frame)
    assert seen and all(not path.exists() for path in seen)
