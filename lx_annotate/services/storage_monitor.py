"""Local metadata inventory; media deletion remains with its owning service."""

from __future__ import annotations

import json
import os
import stat
from contextlib import ExitStack
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Literal

from django.apps import apps
from django.core import signing
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone
from endoreg_db.models import Frame, RawPdfFile, UploadJob, VideoFile
from endoreg_db.models.hub.quarantine_item import QuarantineItem
from endoreg_db.models.media.operation_lease import MediaOperationLease
from endoreg_db.models.media.video.hls_artifact import VideoHlsArtifact
from endoreg_db.utils.file_operations import safe_unlink_file
from endoreg_db.utils.hashs import get_file_hash
from endoreg_db.utils.paths import get_runtime_paths
from pydantic import BaseModel, ConfigDict

from lx_annotate.models import OutboundHubTransferJob

SALT = "storage-monitor-observation-v1"
MAX_ENTRIES = 100_000


class Observation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    kind: Literal["video", "report", "file", "upload"]
    identity: str
    version: str


@dataclass
class Entry:
    id: str
    kind: str
    name: str
    status: str
    path: str = ""
    size: int | None = None
    modified: str = ""
    owners: list[str] = field(default_factory=list)
    details: dict[str, str] = field(default_factory=dict)
    token: str = ""
    blocker: str = ""


def roots() -> tuple[Path, ...]:
    paths = get_runtime_paths()
    candidates = (
        paths.storage,
        paths.import_dir,
        paths.transcoding,
        paths.quarantine,
        paths.migration_staging,
    )
    return tuple(
        p
        for p in candidates
        if not any(p != other and p.is_relative_to(other) for other in candidates)
    )


def safe_path(path: Path) -> bool:
    return (
        path.is_absolute()
        and ".." not in path.parts
        and any(path.is_relative_to(root) for root in roots())
        and not any(p.is_symlink() for p in (path, *path.parents))
    )


def relative(path: Path) -> str:
    return str(path.relative_to(get_runtime_paths().runtime_root))


def version(path: Path, observed: os.stat_result | None = None) -> str:
    info = observed if observed is not None else path.lstat()
    return f"{info.st_dev}:{info.st_ino}:{info.st_size}:{info.st_mtime_ns}:{info.st_ctime_ns}"


def token(
    kind: Literal["video", "report", "file", "upload"], identity: str, revision: str
) -> str:
    return signing.dumps(
        Observation(kind=kind, identity=identity, version=revision).model_dump(),
        salt=SALT,
    )


def references() -> tuple[dict[Path, list[str]], dict[Path, list[str]]]:
    """Index every local FileField, plus path-valued media provenance and derivatives."""
    exact: dict[Path, list[str]] = {}
    directories: dict[Path, list[str]] = {}
    paths = get_runtime_paths()

    def add(name: str, owner: str, *, directory: bool = False) -> None:
        if not name:
            return
        path = Path(name)
        if not path.is_absolute():
            path = paths.storage / path
        # Aliased references still protect their target. Inventory traversal and
        # deletion never follow links, but ignoring a reference alias would make
        # its real file look unowned.
        for candidate in {path, path.resolve()}:
            if ".." not in candidate.parts and any(
                candidate.is_relative_to(root) for root in roots()
            ):
                (directories if directory else exact).setdefault(candidate, []).append(
                    owner
                )

    for model in apps.get_app_config("endoreg_db").get_models():
        for model_field in model._meta.fields:
            if not isinstance(model_field, models.FileField):
                continue
            for pk, name in (
                model.objects.exclude(**{model_field.name: ""})
                .values_list("pk", model_field.name)
                .iterator()
            ):
                if isinstance(name, str) and name:
                    try:
                        location = model_field.storage.path(name)
                    except NotImplementedError:
                        continue  # Remote objects have no local filesystem artifact.
                    add(location, f"{model._meta.model_name}:{pk}")
    for video in VideoFile.objects.all().iterator():
        owner = f"videofile:{video.pk}"
        for stream_root in (
            paths.streamable_videos_raw_media,
            paths.streamable_videos_processed_media,
        ):
            add(str(stream_root / "hls" / str(video.uuid)), owner, directory=True)
        for name in (
            video.raw_streamable_relative_path,
            video.processed_streamable_relative_path,
        ):
            add(name or "", owner)
        if video.frame_dir:
            add(str(video.frame_dir), owner, directory=True)
        from endoreg_db.schemas.processed_video_cleanup import cleanup_receipts

        for receipt in cleanup_receipts(video.meta):
            add(receipt.source_name, owner)
            add(receipt.replacement_name, owner)
    for artifact in VideoHlsArtifact.objects.all().iterator():
        owner = f"videofile:{artifact.video_id}"
        add(artifact.segment_directory_relative_path, owner, directory=True)
        add(artifact.playlist_relative_path, owner)
        for role in ("hls_key_material", "hls_output", "hls_plaintext_source"):
            add(
                str(
                    paths.transcoding
                    / role
                    / str(artifact.video_id)
                    / str(artifact.key_id)
                ),
                owner,
                directory=True,
            )
    for job in UploadJob.objects.select_related("source_center").all().iterator():
        from endoreg_db.schemas.hub_payloads import UploadProvenancePayload

        provenance = UploadProvenancePayload.model_validate(job.processing_provenance)
        for name in (
            provenance.watched_path,
            provenance.watcher_processing_path,
            provenance.stored_upload_path,
            provenance.legacy_source_path,
            provenance.migrated_destination_path,
        ):
            if name:
                add(name, f"uploadjob:{job.pk}")
    for quarantined in QuarantineItem.objects.all().iterator():
        add(quarantined.path, f"quarantineitem:{quarantined.pk}")
    media_owners: dict[tuple[str, str], list[str]] = {}
    for video in VideoFile.objects.all().iterator():
        media_owners.setdefault(
            (video.raw_video_hash, str(video.center_id)), []
        ).append(f"videofile:{video.pk}")
    for report in RawPdfFile.objects.all().iterator():
        media_owners.setdefault((report.pdf_hash, str(report.center_id)), []).append(
            f"rawpdffile:{report.pk}"
        )
    associated: dict[str, list[str]] = {
        f"frame:{frame_id}": [f"videofile:{video_id}"]
        for frame_id, video_id in Frame.objects.values_list("pk", "video_id").iterator()
    }
    for job in UploadJob.objects.select_related("source_center").all().iterator():
        center = str(job.source_center.pk) if job.source_center is not None else "None"
        associated[f"uploadjob:{job.pk}"] = media_owners.get(
            (job.content_hash, center), []
        )
    for owners in exact.values():
        owners.extend(
            owner for source in tuple(owners) for owner in associated.get(source, [])
        )
    return exact, directories


def owners_for(
    path: Path, exact: dict[Path, list[str]], directories: dict[Path, list[str]]
) -> list[str]:
    return sorted(
        set(
            exact.get(path, [])
            + [
                owner
                for root, owners in directories.items()
                if path.is_relative_to(root)
                for owner in owners
            ]
        )
    )


def media_status(values: dict[str, str]) -> str:
    if values.get("anonymization_validated") == "True":
        return "Anonymisierung validiert"
    if values.get("anonymized") == "True":
        return "Anonymisiert, Prüfung ausstehend"
    if values.get("processing_failed") == "True":
        return "Verarbeitung fehlgeschlagen"
    if (
        values.get("processing_started") == "True"
        and values.get("processing_finished") != "True"
    ):
        return "In Verarbeitung"
    return (
        " / ".join(k for k, value in values.items() if value == "True")
        or "Noch nicht verarbeitet"
    )


def inventory() -> list[Entry]:
    exact, directories = references()
    entries: list[Entry] = []
    paths = get_runtime_paths()
    for model in (VideoFile, RawPdfFile):
        kind: Literal["video", "report"] = "video" if model is VideoFile else "report"
        for media in model.objects.select_related("state").all().iterator():
            state = media.state
            state_values = (
                {
                    f.name: str(getattr(state, f.name))
                    for f in state._meta.fields
                    if isinstance(f, (models.BooleanField, models.CharField))
                }
                if state is not None
                else {}
            )
            revision = media_revision(media)
            blocker = media_blocker(media)
            entries.append(
                Entry(
                    id=f"{model._meta.model_name}:{media.pk}",
                    kind=kind,
                    name=str(
                        getattr(media, "original_file_name", "") or f"{kind} {media.pk}"
                    ),
                    status=media_status(state_values),
                    details={
                        "database_id": str(media.pk),
                        "center_id": str(media.center_id),
                        **{
                            key: str(getattr(media, key))
                            for key in (
                                "raw_video_hash",
                                "processed_video_hash",
                                "pdf_hash",
                                "duration",
                                "fps",
                                "frame_count",
                                "width",
                                "height",
                                "storage_mode",
                                "date_created",
                                "date_modified",
                            )
                            if hasattr(media, key)
                        },
                        **state_values,
                    },
                    token=token(kind, str(media.pk), revision) if not blocker else "",
                    blocker=blocker,
                    modified=str(media.date_modified),
                )
            )
    for job in UploadJob.objects.select_related("source_center").all().iterator():
        source_blocker = upload_blocker(job, exact)
        entries.append(
            Entry(
                id=f"uploadjob:{job.pk}",
                kind="upload",
                name=str(job.original_filename or job.pk),
                status=str(job.status),
                modified=str(job.updated_at),
                details={
                    "content_hash": str(job.content_hash),
                    "center_id": str(job.source_center.pk)
                    if job.source_center is not None
                    else "",
                    "cleanup_status": str(job.cleanup_status),
                    "retention_policy": str(job.retention_policy),
                    "retryable": str(job.retryable),
                },
                blocker=source_blocker,
                token=token("upload", str(job.pk), str(job.updated_at))
                if not source_blocker
                else "",
            )
        )
    for job in OutboundHubTransferJob.objects.all().iterator():
        owner = (
            f"videofile:{job.video_file_id}"
            if job.video_file_id
            else f"rawpdffile:{job.raw_pdf_file_id}"
        )
        for entry in entries:
            if entry.id == owner:
                entry.details[f"transfer_{job.pk}"] = (
                    f"{job.local_status} / {job.remote_transfer_status} / {job.local_cleanup_status}"
                )
    seen: set[Path] = set()
    for root in roots():
        if not root.exists():
            continue
        if not safe_path(root):
            raise ValueError("Unsafe inventory root")

        def failed(error: OSError) -> None:
            raise error

        for directory, subdirs, files in os.walk(
            root, followlinks=False, onerror=failed
        ):
            # Expose links as blocked entries, but never descend into them.
            links = [name for name in subdirs if (Path(directory) / name).is_symlink()]
            subdirs[:] = sorted(name for name in subdirs if name not in links)
            for name in sorted(files + links):
                path = Path(directory) / name
                info = path.lstat()
                seen.add(path)
                owners = owners_for(path, exact, directories)
                regular = stat.S_ISREG(info.st_mode) and safe_path(path)
                deletable = (
                    regular
                    and not owners
                    and path.is_relative_to(paths.import_dir)
                    and info.st_nlink == 1
                    and not name.endswith(".lock")
                )
                entries.append(
                    Entry(
                        id=f"file:{relative(path)}",
                        kind="artifact",
                        name=name,
                        path=relative(path),
                        size=info.st_size,
                        modified=datetime.fromtimestamp(
                            info.st_mtime, tz=timezone.get_current_timezone()
                        ).isoformat(),
                        status="zugeordnet" if owners else "ohne Datenbankzuordnung",
                        owners=owners,
                        details={
                            "file_type": path.suffix.lower(),
                            "links": str(info.st_nlink),
                        },
                        token=token("file", relative(path), version(path, info))
                        if deletable
                        else "",
                        blocker=""
                        if deletable
                        else (
                            "Über das zugehörige Medium löschen"
                            if owners
                            else "Zuordnung oder Dateisicherheit muss zuerst geklärt werden"
                        ),
                    )
                )
                if len(entries) > MAX_ENTRIES:
                    raise ValueError("Inventory exceeds supported bound")
    for path, owners in exact.items():
        if path not in seen:
            entries.append(
                Entry(
                    id=f"missing:{relative(path)}",
                    kind="artifact",
                    name=path.name,
                    path=relative(path),
                    status="Datei fehlt",
                    owners=sorted(set(owners)),
                    blocker="Datei fehlt",
                )
            )
    by_owner: dict[str, list[Entry]] = {}
    for entry in entries:
        if entry.kind == "artifact":
            for owner in entry.owners:
                by_owner.setdefault(owner, []).append(entry)
    for entry in entries:
        if entry.kind != "artifact":
            artifacts = by_owner.get(entry.id, [])
            entry.size = sum(artifact.size or 0 for artifact in artifacts)
            entry.details["artifact_count"] = str(len(artifacts))
            entry.details["missing_artifacts"] = str(
                sum(artifact.status == "Datei fehlt" for artifact in artifacts)
            )
    return entries


def media_blocker(media: VideoFile | RawPdfFile) -> str:
    selection = (
        Q(video_file_id=media.pk)
        if isinstance(media, VideoFile)
        else Q(raw_pdf_file_id=media.pk)
    )
    if (
        OutboundHubTransferJob.objects.filter(selection)
        .exclude(local_status__in=["completed", "failed"])
        .exists()
    ):
        return "Transfer ist vorgemerkt oder läuft"
    if isinstance(media, VideoFile):
        from endoreg_db.models.media.video.video_processing import (
            VideoProcessingHistory,
        )

        from lx_annotate.services.video_transcode_jobs import has_active_import

        if (
            has_active_import(media)
            or MediaOperationLease.objects.filter(
                video_id=media.pk, expires_at__gt=timezone.now()
            ).exists()
            or VideoProcessingHistory.objects.filter(
                video_id=media.pk, status__in=["pending", "running"]
            ).exists()
        ):
            return "Video wird verarbeitet oder verwendet"
    elif UploadJob.objects.filter(
        content_hash=media.pdf_hash,
        source_center_id=media.center_id,
        status__in=["pending", "processing", "retrying", "cancel_requested"],
    ).exists():
        return "Befund wird verarbeitet"
    return ""


def media_revision(media: VideoFile | RawPdfFile) -> str:
    fields = (
        (media.raw_file, media.processed_file)
        if isinstance(media, VideoFile)
        else (media.file, media.processed_file)
    )
    return json.dumps(
        [
            str(media.date_modified),
            *[str(f.name or "") for f in fields],
            str(media.state_id),
        ],
        separators=(",", ":"),
    )


def assert_exclusive_files(media: VideoFile | RawPdfFile) -> None:
    exact, directories = references()
    owner = f"{media._meta.model_name}:{media.pk}"
    fields = (
        (media.raw_file, media.processed_file)
        if isinstance(media, VideoFile)
        else (media.file, media.processed_file)
    )
    for stored in fields:
        if stored.name:
            path = Path(stored.storage.path(stored.name))
            if not safe_path(path) or any(
                reference != owner for reference in owners_for(path, exact, directories)
            ):
                raise ValueError("Media has unsafe or shared files")


def upload_blocker(
    job: UploadJob, exact: dict[Path, list[str]], *, require_sources: bool = True
) -> str:
    if (
        job.status not in {"error", "cancelled", "anonymized"}
        or job.retryable
        or job.next_retry_at is not None
        or job.cleanup_status == "deleting"
        or (
            job.processing_lease_expires_at is not None
            and job.processing_lease_expires_at > timezone.now()
        )
    ):
        return "Importauftrag ist aktiv oder für einen erneuten Versuch vorgesehen"
    paths = get_runtime_paths()
    owner = f"uploadjob:{job.pk}"
    sources = [
        path for path, owners in exact.items() if owner in owners and path.exists()
    ]
    if not sources and require_sources:
        return "Keine vorhandenen Quelldateien"
    if any(
        not safe_path(path)
        or not path.is_file()
        or path.stat().st_nlink != 1
        or not (
            path.is_relative_to(paths.import_dir)
            or path.is_relative_to(paths.ingest_uploads)
        )
        or set(exact[path]) != {owner}
        for path in sources
    ):
        return "Quellen sind gemeinsam referenziert oder nicht sicher löschbar"
    return ""


def delete_upload_sources(observation: Observation) -> None:
    from endoreg_db.import_files.context.file_lock import file_lock

    with transaction.atomic():
        job = UploadJob.objects.select_for_update().get(pk=observation.identity)
        exact, _directories = references()
        if str(job.updated_at) != observation.version or upload_blocker(
            job, exact, require_sources=False
        ):
            raise ValueError("Upload changed or its sources are protected")
        owner = f"uploadjob:{job.pk}"
        sources = sorted(
            path for path, owners in exact.items() if owner in owners and path.exists()
        )
        with ExitStack() as locks:
            # Identical basenames share the import lock, even across directories.
            for name in sorted({path.name for path in sources}):
                locks.enter_context(file_lock(name))
            exact, _directories = references()
            if upload_blocker(job, exact, require_sources=False):
                raise ValueError("Upload sources changed while acquiring locks")
            observations = {path: version(path) for path in sources}
            for path in sources:
                if get_file_hash(path) != job.content_hash:
                    raise ValueError("Upload source content changed")
            for path in sources:
                if not safe_path(path) or version(path) != observations[path]:
                    raise ValueError("Upload source changed during validation")
                safe_unlink_file(path, missing_ok=False)
            job.file.name = ""
            job.source_file_persisted = False
            job.cleanup_status = UploadJob.CleanupStatus.COMPLETED
            job.cleanup_completed_at = timezone.now()
            job.save(
                update_fields=[
                    "file",
                    "source_file_persisted",
                    "cleanup_status",
                    "cleanup_completed_at",
                    "updated_at",
                ]
            )


def delete_observation(value: str) -> None:
    observation = Observation.model_validate(
        signing.loads(value, salt=SALT, max_age=300)
    )
    if observation.kind == "upload":
        delete_upload_sources(observation)
        return
    if observation.kind == "file":
        from endoreg_db.import_files.context.file_lock import file_lock

        path = get_runtime_paths().runtime_root / observation.identity
        if not safe_path(path) or not path.is_relative_to(
            get_runtime_paths().import_dir
        ):
            raise ValueError("Unsafe deletion target")
        with file_lock(path):
            exact, directories = references()
            info = path.lstat()
            if (
                not safe_path(path)
                or owners_for(path, exact, directories)
                or not stat.S_ISREG(info.st_mode)
                or info.st_nlink != 1
                or version(path) != observation.version
            ):
                raise ValueError("File changed or acquired an owner")
            safe_unlink_file(path, missing_ok=False)
        return
    with transaction.atomic():
        if observation.kind == "video":
            video = VideoFile.objects.select_for_update().get(
                pk=int(observation.identity)
            )
            if media_revision(video) != observation.version or media_blocker(video):
                raise ValueError("Video changed or is being imported")
            assert_exclusive_files(video)
            video.delete()
        else:
            report = RawPdfFile.objects.select_for_update().get(
                pk=int(observation.identity)
            )
            if media_revision(report) != observation.version or media_blocker(report):
                raise ValueError("Report changed or is being processed")
            assert_exclusive_files(report)
            report.delete()
