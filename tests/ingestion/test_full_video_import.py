# pyright: reportAttributeAccessIssue=false, reportOperatorIssue=false
from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import uuid
from pathlib import Path
from types import SimpleNamespace

import pytest

pytestmark = [pytest.mark.django_db, pytest.mark.integration, pytest.mark.video]


def _fsync_file(path: Path) -> None:
    with path.open("ab") as handle:
        handle.flush()
        os.fsync(handle.fileno())


def _generate_ultrashort_mp4(path: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg is None:
        pytest.skip("ffmpeg is required for the full video import test")

    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc=size=32x32:rate=5:duration=1",
            "-an",
            "-c:v",
            "mpeg4",
            "-q:v",
            "5",
            "-pix_fmt",
            "yuv420p",
            "-metadata",
            f"comment=lx-full-import-{uuid.uuid4().hex}",
            "-movflags",
            "+faststart",
            "-f",
            "mp4",
            str(path),
        ],
        check=True,
    )
    _fsync_file(path)


def _configure_isolated_runtime(monkeypatch, settings, tmp_path: Path):
    protected_root = tmp_path / "protected"
    storage_root = protected_root / "storage"
    data_root = tmp_path / "runtime"

    monkeypatch.setenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", str(protected_root))
    monkeypatch.setenv("STORAGE_DIR", str(storage_root))
    monkeypatch.setenv("DATA_DIR", str(data_root))
    monkeypatch.setenv("PROTECTED_MEDIA_ROOT", str(storage_root))
    monkeypatch.setenv("WATCHER_STABLE_AFTER_SECONDS", "0")
    monkeypatch.setenv("WATCHER_POLL_INTERVAL_SECONDS", "0.01")

    settings.MEDIA_ROOT = storage_root
    settings.PROTECTED_MEDIA_ROOT = storage_root

    import endoreg_db.utils.paths as path_utils

    paths = path_utils.EndoregPathsModel.from_environment()
    path_utils.rebind_path_exports(paths)
    return paths


def _reset_video_file_storages() -> None:
    from endoreg_db.models import VideoFile

    for field_name in ("raw_file", "processed_file"):
        storage = VideoFile._meta.get_field(field_name).storage
        if hasattr(storage, "_wrapped"):
            storage._wrapped = None


def _verified_source_events(
    caplog: pytest.LogCaptureFixture,
) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    for record in caplog.records:
        message = record.getMessage()
        if "video.anonymizer_source_verified" not in message:
            continue
        events.append(json.loads(message))
    return events


class CopyThroughFrameCleaner:
    def clean_video(
        self,
        *,
        video_path: Path,
        output_path: Path,
        **_kwargs: object,
    ) -> tuple[Path, dict[str, object]]:
        from endoreg_db.utils.file_operations import atomic_copy_file

        return (
            atomic_copy_file(source=Path(video_path), destination=Path(output_path)),
            {},
        )


def test_watcher_video_import_with_ultrashort_mp4_passes_integrity_checks(
    monkeypatch,
    settings,
    tmp_path,
    master_key,
    caplog,
):
    paths = _configure_isolated_runtime(monkeypatch, settings, tmp_path)
    _reset_video_file_storages()

    import lx_annotate.file_watcher as file_watcher
    import lx_anonymizer
    from endoreg_db.import_files.processing.video_processing import video_anonymization
    from endoreg_db.models import Center, EndoscopyProcessor, UploadJob, VideoFile
    from endoreg_db.services.hub.ingest import _run_video_upload_import_job
    from endoreg_db.utils.file_operations import atomic_move_file

    monkeypatch.setattr(lx_anonymizer, "FrameCleaner", CopyThroughFrameCleaner)
    monkeypatch.setattr(
        video_anonymization,
        "FrameCleaner",
        CopyThroughFrameCleaner,
    )
    monkeypatch.setattr(file_watcher, "INTAKE_VIDEO_DIR", paths.watcher_video_drop)
    monkeypatch.setattr(file_watcher, "INTAKE_REPORT_DIR", paths.watcher_report_drop)
    monkeypatch.setattr(
        file_watcher,
        "INTAKE_PREANONYMIZED_DIR",
        paths.watcher_preanonymized_drop,
    )
    monkeypatch.setattr(file_watcher, "MANAGED_VAULT_ROOT", paths.storage.resolve())
    monkeypatch.setattr(
        "endoreg_db.tasks.process_upload_job.apply_async",
        lambda *args, **kwargs: SimpleNamespace(id="inline-upload-handoff"),
    )

    center = Center.objects.create(name="LX Full Import Test Center")
    processor = EndoscopyProcessor.objects.create(
        name="lx-full-import-test-processor",
        image_width=32,
        image_height=32,
        endoscope_image_x=0,
        endoscope_image_y=0,
        endoscope_image_width=32,
        endoscope_image_height=32,
        examination_date_x=0,
        examination_date_y=0,
        examination_date_width=1,
        examination_date_height=1,
        patient_first_name_x=0,
        patient_first_name_y=0,
        patient_first_name_width=1,
        patient_first_name_height=1,
        patient_last_name_x=0,
        patient_last_name_y=0,
        patient_last_name_width=1,
        patient_last_name_height=1,
        patient_dob_x=0,
        patient_dob_y=0,
        patient_dob_width=1,
        patient_dob_height=1,
    )
    processor.centers.add(center)

    part_path = paths.watcher_video_drop / "ultrashort-full-import.mp4.part"
    final_path = paths.watcher_video_drop / "ultrashort-full-import.mp4"
    _generate_ultrashort_mp4(part_path)
    atomic_move_file(source=part_path, destination=final_path)

    caplog.set_level(
        logging.INFO,
        logger="endoreg_db.import_files.processing.video_processing.video_anonymization",
    )

    upload_job = file_watcher.IntakeVideoImportService().import_from_intake(
        file_path=final_path,
        center_key=center.center_key,
        processor_name=processor.name,
    )

    assert final_path.exists() is False
    assert upload_job.status == UploadJob.Status.PROCESSING
    assert _run_video_upload_import_job(str(upload_job.id)) is True

    upload_job.refresh_from_db()
    video = VideoFile.objects.get(video_hash=upload_job.content_hash)

    assert upload_job.status == UploadJob.Status.ANONYMIZED
    assert upload_job.sensitive_meta_id == video.sensitive_meta_id
    assert video.video_meta is not None
    assert video.video_meta.width == 32
    assert video.video_meta.height == 32
    assert video.processed_file.name

    verified_events = _verified_source_events(caplog)
    assert len(verified_events) == 1
    verified_event = verified_events[0]
    assert verified_event["video_hash"] == video.video_hash
    assert verified_event["video_hash"] == upload_job.content_hash
    assert verified_event["size_bytes"] > 0
    assert verified_event["width"] == video.video_meta.width
    assert verified_event["height"] == video.video_meta.height
    assert isinstance(verified_event["sha256"], str)
    assert len(verified_event["sha256"]) == 64
