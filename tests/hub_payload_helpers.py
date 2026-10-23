from __future__ import annotations

import hashlib
from datetime import date, datetime, timezone
from random import Random
from typing import Any

import pymupdf
from endoreg_db.models import Center, RawPdfFile, SensitiveMeta
from endoreg_db.services.raw_pdf_files import (
    verify_and_persist_processed_report_sha256,
)


def hub_report_pdf_bytes(text: str, *, attachment_size: int = 0) -> bytes:
    """Build parseable PDF fixtures without random document identifiers."""
    if attachment_size < 0:
        raise ValueError("attachment_size must be non-negative")
    with pymupdf.open() as document:
        document.new_page().insert_text((72, 72), text)
        if attachment_size:
            # Incompressible fixture data keeps the streaming test above its byte budget.
            document.embfile_add(
                "fixture-padding.bin", Random(0).randbytes(attachment_size)
            )
        return document.tobytes(no_new_id=True)


def create_hub_sensitive_meta(
    *,
    center: Center,
    first_name: str = "Test",
    last_name: str = "Patient",
) -> SensitiveMeta:
    return SensitiveMeta.objects.create(
        center=center,
        patient_first_name=first_name,
        patient_last_name=last_name,
        patient_dob=datetime(1980, 1, 1, tzinfo=timezone.utc),
        examination_date=date(2024, 1, 2),
    )


def verify_hub_report_artifact(report: RawPdfFile) -> str:
    """Verify a test report through the production processed-artifact boundary."""
    return verify_and_persist_processed_report_sha256(report)


def hub_transfer_status_payload(
    *,
    job: Any,
    source_node_key: str,
    remote_transfer_id: str,
    transfer_status: str,
    processing_decision: str,
) -> dict[str, str]:
    if str(job.resource_kind) == "video":
        resource_hash = str(job.video_file.raw_video_hash)
        processed_media_hash = str(job.video_file.processed_video_hash)
    else:
        resource_hash = str(job.raw_pdf_file.pdf_hash)
        processed_media_hash = str(job.raw_pdf_file.state.processed_file_sha256)
    return {
        "id": remote_transfer_id,
        "transfer_key": str(job.transfer_key),
        "source_node_key": source_node_key,
        "target_node_key": str(job.target_node.node_key),
        "source_center_key": str(job.source_center.center_key),
        "resource_kind": str(job.resource_kind),
        "resource_hash": resource_hash,
        "processed_media_hash": processed_media_hash,
        "transfer_mode": str(job.transfer_mode),
        "transfer_status": transfer_status,
        "processing_decision": processing_decision,
        "payload_schema_version": "7.0",
        "status_detail": "",
    }


def valid_report_resource_rows(*, pdf_hash: str = "hash-1") -> dict[str, Any]:
    processed_file_sha256 = hashlib.sha256(f"processed:{pdf_hash}".encode()).hexdigest()
    return {
        "raw_pdf_file": {
            "pdf_hash": pdf_hash,
            "anonymized_text": "Anonymized report text",
        },
        "sensitive_meta": {
            "patient_uuid": "821d81f1-fb20-8e38-b777-01c67fe03001",
            "examination_uuid": "821d81f1-fb20-8e38-b777-01c67fe03002",
        },
        "raw_pdf_state": {
            "processing_started": True,
            "text_meta_extracted": True,
            "sensitive_meta_processed": True,
            "anonymized": True,
            "anonymization_validated": True,
            "processed_file_sha256": processed_file_sha256,
        },
        "processing_history": {
            "file_hash": pdf_hash,
            "success": True,
        },
    }


def hub_video_artifact(*, reprocessed: bool = False) -> tuple[str, bytes]:
    """Encode a real anonymous fixture and retain its production lineage receipt."""
    import subprocess

    from endoreg_db.utils.file_operations import protected_temporary_directory
    from endoreg_db.utils.hashs import get_file_hash
    from endoreg_db.utils.transcode_execution import _run_ffmpeg_command
    from endoreg_db.utils.video.executable_discovery import resolve_ffmpeg_executable

    ffmpeg = resolve_ffmpeg_executable()
    if ffmpeg is None:
        raise RuntimeError("Hub video contract tests require FFmpeg")
    with protected_temporary_directory(prefix="hub-video-contract-") as directory:
        source, output = directory / "source.nut", directory / "processed.mp4"
        subprocess.run(
            [
                ffmpeg,
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                "testsrc2=size=320x240:rate=25:duration=1",
                "-c:v",
                "ffv1",
                str(source),
            ],
            check=True,
            capture_output=True,
        )
        result = _run_ffmpeg_command(
            [
                ffmpeg,
                "-v",
                "error",
                "-copyts",
                "-i",
                str(source),
                "-vf",
                "hue=h=90" if reprocessed else "null",
                "-c:v",
                "libx264",
                "-fps_mode",
                "passthrough",
                "-enc_time_base",
                "demux",
                str(output),
            ]
        )
        if result[0]:
            raise RuntimeError(result[1])
        return get_file_hash(source), output.read_bytes()
