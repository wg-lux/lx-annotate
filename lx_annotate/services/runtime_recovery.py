from __future__ import annotations

import os
from collections.abc import Callable
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.utils import timezone as django_timezone

from lx_annotate.operational_support import render_operational_event

REPAIR_REVISION = "v2"


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_text(path: Path, value: str) -> None:
    from endoreg_db.utils.file_operations import atomic_write_file

    payload = value.encode("utf-8")
    atomic_write_file(
        destination=path,
        content=[payload],
        required_bytes=len(payload),
        file_mode=0o640,
        dir_mode=0o750,
    )


def state_value(path: Path, key: str) -> str:
    if not path.is_file():
        return ""
    prefix = f"{key}="
    value = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(prefix):
            value = line.removeprefix(prefix).strip()
    return value


class RuntimeRecoveryService:
    """Application-owned recovery orchestration behind the CLI adapter."""

    def __init__(self, emit: Callable[[str], None]) -> None:
        self.emit = emit

    def run(
        self,
        *,
        target: Path,
        state_file: Path,
        sources: list[Path],
        force: bool,
        force_repair: bool,
        skip_repair: bool,
    ) -> None:
        from endoreg_db.utils.file_operations import ensure_directory

        ensure_directory(target, dir_mode=0o750)
        log_dir = ensure_directory(target / "logs", dir_mode=0o750)
        ensure_directory(state_file.parent, dir_mode=0o750)
        recovery_marker = log_dir / "data_recovery_complete"
        repair_marker = log_dir / f"managed_payload_repair_{REPAIR_REVISION}"
        previous_target = state_value(state_file, "LAST_EFFECTIVE_DATA_DIR")
        recovery_current = (
            previous_target == str(target)
            and recovery_marker.is_file()
            and bool(state_value(recovery_marker, "completed_at"))
        )
        repair_current = state_value(
            repair_marker, "repair_revision"
        ) == REPAIR_REVISION and bool(state_value(repair_marker, "completed_at"))

        if force or not recovery_current:
            self._heavy_recovery(
                target=target,
                sources=[Path(previous_target), *sources]
                if previous_target
                else sources,
            )
            _write_text(
                state_file,
                f"LAST_EFFECTIVE_DATA_DIR={target}\nUPDATED_AT={_timestamp()}\n",
            )
            _write_text(recovery_marker, f"completed_at={_timestamp()}\n")
        else:
            self.emit(
                render_operational_event(
                    "lx_annotate.runtime_recovery",
                    status="skipped",
                    target=str(target),
                    reason="recovery_already_current",
                )
            )

        if skip_repair:
            self.emit(
                render_operational_event(
                    "lx_annotate.managed_payload_repair",
                    status="skipped",
                    target=str(target),
                    reason="repair_explicitly_skipped",
                )
            )
        elif force_repair or not repair_current:
            self._repair_payloads(target=target, marker=repair_marker)
        else:
            self.emit(
                render_operational_event(
                    "lx_annotate.managed_payload_repair",
                    status="skipped",
                    target=str(target),
                    reason="repair_already_current",
                )
            )

    def _heavy_recovery(self, *, target: Path, sources: list[Path]) -> None:
        call_command("migrate", interactive=False)
        migrated_sources: list[str] = []
        for source in dict.fromkeys(sources):
            resolved = source.expanduser().resolve()
            if resolved == target or not resolved.is_dir():
                continue
            call_command("migrate_data_dir", str(resolved))
            self._copy_missing_overlay(source=resolved, target=target)
            migrated_sources.append(str(resolved))
        call_command("migration_mark_eligible", apply=True)
        updated = self._mark_quarantined_upload_jobs_eligible()
        call_command("reap_upload_job_sources")
        self.emit(
            render_operational_event(
                "lx_annotate.runtime_recovery",
                status="ok",
                target=str(target),
                sources=migrated_sources,
                quarantined_jobs_updated=updated,
            )
        )

    @staticmethod
    def _copy_missing_overlay(*, source: Path, target: Path) -> None:
        from endoreg_db.utils.file_operations import atomic_copy_file

        resolved_target = target.resolve()
        for source_path in sorted(source.rglob("*")):
            if source_path.is_symlink() or not source_path.is_file():
                continue
            destination = (resolved_target / source_path.relative_to(source)).resolve()
            if resolved_target not in destination.parents or destination.exists():
                continue
            atomic_copy_file(
                source=source_path,
                destination=destination,
                preserve_metadata=True,
                file_mode=0o640,
                dir_mode=0o750,
            )

    @staticmethod
    def _mark_quarantined_upload_jobs_eligible() -> int:
        from endoreg_db.models.hub.upload_job import UploadJob

        updated = 0
        now = django_timezone.now()
        jobs = UploadJob.objects.filter(
            retention_policy=UploadJob.RetentionPolicy.DELETE_AFTER_SUCCESS,
            source_file_persisted=True,
            cleanup_status=UploadJob.CleanupStatus.PENDING,
            status__in=[UploadJob.Status.ERROR, UploadJob.Status.LOST],
        ).order_by("created_at")
        for upload_job in jobs.iterator():
            provenance = upload_job.processing_provenance or {}
            if not (
                str(provenance.get("quarantined_path", "")).strip()
                or str(provenance.get("quarantined_sidecar_path", "")).strip()
            ):
                continue
            update_fields = ["cleanup_status", "updated_at"]
            if upload_job.source_file_delete_eligible_at is None:
                upload_job.source_file_delete_eligible_at = now
                update_fields.append("source_file_delete_eligible_at")
            upload_job.cleanup_status = UploadJob.CleanupStatus.ELIGIBLE
            upload_job.save(update_fields=update_fields)
            updated += 1
        return updated

    def _repair_payloads(self, *, target: Path, marker: Path) -> None:
        if not (
            os.environ.get("LX_ANNOTATE_MASTER_KEY")
            or os.environ.get("LX_ANNOTATE_MASTER_KEY_FILE")
        ):
            self.emit(
                render_operational_event(
                    "lx_annotate.managed_payload_repair",
                    status="skipped",
                    target=str(target),
                    reason="no_master_key_configured",
                )
            )
            return
        output = StringIO()
        call_command("repair_managed_payloads", stdout=output)
        _write_text(
            marker,
            (
                f"repair_revision={REPAIR_REVISION}\n"
                f"completed_at={_timestamp()}\n"
                f"target_dir={target}\n"
                f"{output.getvalue()}"
            ),
        )
        self.emit(
            render_operational_event(
                "lx_annotate.managed_payload_repair",
                status="ok",
                target=str(target),
                repair_revision=REPAIR_REVISION,
            )
        )
