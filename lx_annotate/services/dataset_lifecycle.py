"""Dataset membership operations; clinical objects are never copied."""

from __future__ import annotations

import json
import logging
from collections.abc import Iterable
from typing import TYPE_CHECKING, cast
from uuid import UUID, uuid5

from django.contrib.auth.models import User
from django.core import signing
from django.db import models, transaction
from django.db.models.deletion import Collector, ProtectedError
from endoreg_db.models.administration.center.center import Center
from endoreg_db.models.aidataset.aidataset import (
    AIDataSet,
    AIDataSetExportArtifact,
    AIModelTrainingRun,
)
from endoreg_db.models.media.video.video_file import (
    VideoFile,
    get_default_joined_dataset_id,
)
from endoreg_db.models.medical.patient.patient_examination import PatientExamination
from endoreg_db.models.other.study_cohort import StudyCohort
from endoreg_db.models.other.study_table_import import StudyTableImport
from endoreg_db.models.state.sensitive_meta import SensitiveMetaState
from endoreg_db.services.centers.access import resolve_allowed_center_ids
from lx_dtypes.models.contracts.dataset_lifecycle import (
    DatasetCombine,
    DatasetDelete,
    DatasetDetails,
    DatasetSplit,
)
from lx_dtypes.models.contracts.dtypes_record_persistence import (
    DtypesRecordPersistencePayload,
)
from lx_dtypes.models.contracts.json_types import JsonValue
from lx_dtypes.models.contracts.table_import import TableImportReceiptPayload
from rest_framework.exceptions import PermissionDenied

from lx_annotate.services.study_definitions import persist_study_definition

logger = logging.getLogger(__name__)


if TYPE_CHECKING:
    from django.utils.datastructures import _IndexableCollection


def dataset_video_ids(dataset: AIDataSet) -> set[int]:
    ids = set(dataset.image_annotations.values_list("frame__video_id", flat=True))
    ids.update(dataset.video_annotations.values_list("video_file_id", flat=True))
    ids.update(dataset.videos.values_list("pk", flat=True))
    ids.update(
        VideoFile.objects.filter(joined_dataset=dataset).values_list("pk", flat=True)
    )
    if None in ids:
        raise ValueError("Dataset contains annotations without a video")
    return cast(set[int], ids)


def require_dataset_access(
    user: object, dataset: AIDataSet, *, write: bool = False
) -> None:
    allowed = resolve_allowed_center_ids(user)
    if allowed is not None:
        centers = set(
            VideoFile.objects.filter(pk__in=dataset_video_ids(dataset)).values_list(
                "center_id", flat=True
            )
        )
        centers.update(
            dataset.examinations.values_list("patient__center_id", flat=True)
        )
        if not allowed or not centers.issubset(allowed):
            raise PermissionDenied(
                "Dataset contains records outside your authorized centers"
            )
    if write:
        if dataset.is_default_video_dataset:
            raise PermissionDenied("The system default dataset cannot be modified here")
        if not getattr(user, "is_superuser", False) and dataset.owner_id != getattr(
            user, "pk", None
        ):
            raise PermissionDenied("Only the dataset owner may modify it")


def _lock_datasets(
    user: User, ids: list[int], *, write: bool = False
) -> list[AIDataSet]:
    """Match table import lock order: centers, datasets, examinations, cohorts."""
    sources = list(AIDataSet.objects.filter(pk__in=ids).order_by("pk"))
    if len(sources) != len(ids):
        raise ValueError("A source dataset no longer exists")
    centers: set[int] = set()
    for source in sources:
        require_dataset_access(user, source, write=write)
        centers.update(source.examinations.values_list("patient__center_id", flat=True))
        centers.update(
            VideoFile.objects.filter(pk__in=dataset_video_ids(source)).values_list(
                "center_id", flat=True
            )
        )
    list(Center.objects.select_for_update().filter(pk__in=centers).order_by("pk"))
    locked = list(
        AIDataSet.objects.select_for_update().filter(pk__in=ids).order_by("pk")
    )
    examinations = {
        pk
        for source in locked
        for pk in source.examinations.values_list("pk", flat=True)
    }
    videos = {pk for source in locked for pk in dataset_video_ids(source)}
    list(
        PatientExamination.objects.select_for_update()
        .filter(pk__in=examinations)
        .order_by("pk")
    )
    list(VideoFile.objects.select_for_update().filter(pk__in=videos).order_by("pk"))
    for source in locked:
        require_dataset_access(user, source, write=write)
        current = set(source.examinations.values_list("patient__center_id", flat=True))
        current.update(
            VideoFile.objects.filter(pk__in=dataset_video_ids(source)).values_list(
                "center_id", flat=True
            )
        )
        if not current.issubset(centers):
            raise ValueError("Dataset centers changed; reload and retry")
    if len(locked) != len(ids):
        raise ValueError("A source dataset no longer exists")
    return locked


def patient_membership(dataset: AIDataSet) -> dict[int, dict[str, list[int]]]:
    groups: dict[int, dict[str, list[int]]] = {}
    for examination in dataset.examinations.order_by("pk"):
        if examination.patient_id is None:
            raise ValueError("Examination has no patient")
        groups.setdefault(examination.patient_id, {"examinations": [], "videos": []})[
            "examinations"
        ].append(examination.pk)
    for video in (
        VideoFile.objects.filter(pk__in=dataset_video_ids(dataset))
        .select_related("examination")
        .order_by("pk")
    ):
        patient = video.patient_id
        linked = video.examination.patient_id if video.examination else None
        if patient is not None and linked is not None and patient != linked:
            raise ValueError("Conflicting video patient links prevent splitting")
        patient = patient if patient is not None else linked
        if patient is None:
            raise ValueError("Link every video to a patient before splitting")
        groups.setdefault(patient, {"examinations": [], "videos": []})["videos"].append(
            video.pk
        )
    return groups


def dataset_response(dataset: AIDataSet, *, members: bool = False) -> dict[str, object]:
    result: dict[str, object] = {
        "id": dataset.pk,
        "name": dataset.name or "",
        "description": dataset.description or "",
        "modality": dataset.dataset_type,
        "active": dataset.is_active,
        "owner": dataset.owner_id,
        "system": dataset.is_default_video_dataset,
        "examinations": dataset.examinations.count(),
        "images": dataset.image_annotations.count(),
        "segments": dataset.video_annotations.count(),
        "videos": len(dataset_video_ids(dataset)),
    }
    if members:
        result["patients"] = [
            {"id": key, **value} for key, value in patient_membership(dataset).items()
        ]
    return result


def _copy_membership(
    target: AIDataSet, sources: Iterable[AIDataSet], *, patients: set[int] | None = None
) -> None:
    for source in sources:
        examinations = source.examinations.all()
        video_ids = dataset_video_ids(source)
        if patients is not None:
            examinations = examinations.filter(patient_id__in=patients)
            groups = patient_membership(source)
            video_ids = {
                video for patient in patients for video in groups[patient]["videos"]
            }
        target.examinations.add(*examinations)
        target.videos.add(*video_ids)
        target.image_annotations.add(
            *source.image_annotations.filter(frame__video_id__in=video_ids)
        )
        target.video_annotations.add(
            *source.video_annotations.filter(video_file_id__in=video_ids)
        )
        target.import_receipts.add(
            *source.import_receipts.filter(patient_examination__in=examinations)
        )


@transaction.atomic
def combine_datasets(user: User, command: DatasetCombine) -> AIDataSet:
    sources = _lock_datasets(user, command.sources)
    if len(sources) != len(command.sources):
        raise ValueError("A source dataset no longer exists")
    for source in sources:
        require_dataset_access(user, source)
    kinds = {(source.dataset_type, source.ai_model_type) for source in sources}
    modality, model = next(iter(kinds)) if len(kinds) == 1 else ("clinical", None)
    target = AIDataSet.objects.create(
        owner=user,
        dataset_type=modality,
        ai_model_type=model,
        **command.model_dump(exclude={"sources"}),
    )
    _copy_membership(target, sources)
    return target


@transaction.atomic
def split_dataset(
    user: User, dataset_id: int, command: DatasetSplit
) -> list[AIDataSet]:
    source = _lock_datasets(user, [dataset_id])[0]
    require_dataset_access(user, source)
    membership = patient_membership(source)
    if {patient for part in command.partitions for patient in part.patients} != set(
        membership
    ):
        raise ValueError("Partitions must cover every source patient exactly once")
    targets: list[AIDataSet] = []
    for part in command.partitions:
        target = AIDataSet.objects.create(
            owner=user,
            dataset_type=source.dataset_type,
            ai_model_type=source.ai_model_type,
            **part.model_dump(exclude={"patients"}),
        )
        _copy_membership(target, [source], patients=set(part.patients))
        targets.append(target)
    return targets


def attach_import_dataset(
    user: User,
    cohort: StudyCohort,
    *,
    mapping_id: UUID,
    source_hash: str,
    center_id: int,
    name: str,
    examination_ids: list[int],
    publish_definition: bool = True,
) -> AIDataSet:
    """Called inside the import's transaction, after its center serialization lock."""
    identity = uuid5(mapping_id, f"{user.pk}:{center_id}:{source_hash}")
    dataset, created = AIDataSet.objects.get_or_create(
        import_identity=identity,
        defaults={
            "name": name,
            "dataset_type": "clinical",
            "ai_model_type": None,
            "owner": user,
        },
    )
    if not created:
        require_dataset_access(user, dataset, write=True)
        if set(dataset.examinations.values_list("pk", flat=True)) != set(
            examination_ids
        ):
            raise ValueError("Imported dataset membership was modified")
    dataset.examinations.add(*examination_ids)
    dataset.import_receipts.add(
        *StudyTableImport.objects.filter(
            owner=user,
            center_id=center_id,
            mapping_id=mapping_id,
            patient_examination_id__in=examination_ids,
        )
    )
    cohort = StudyCohort.objects.select_for_update().get(pk=cohort.pk, created_by=user)
    cohort.datasets.add(dataset)
    if publish_definition:
        persist_study_definition(cohort)
    return dataset


@transaction.atomic
def update_dataset(user: User, dataset_id: int, command: DatasetDetails) -> AIDataSet:
    dataset = _lock_datasets(user, [dataset_id], write=True)[0]
    require_dataset_access(user, dataset, write=True)
    for field, value in command.model_dump().items():
        setattr(dataset, field, value)
    dataset.save(update_fields=["name", "description", "is_active", "updated_at"])
    for cohort in (
        StudyCohort.objects.select_for_update().filter(datasets=dataset).order_by("pk")
    ):
        persist_study_definition(cohort)
    return dataset


def _semantic_record(value: JsonValue) -> JsonValue:
    # Ledger reconstruction generates presentation UUIDs/timestamps for groups;
    # these are not clinical changes. Finding instance identity is checked below.
    if isinstance(value, dict):
        return {
            key: _semantic_record(item)
            for key, item in value.items()
            if key not in {"uuid", "created_at"}
        }
    if isinstance(value, list):
        return [_semantic_record(item) for item in value]
    return value


def _clinical_collector(
    dataset: AIDataSet, examination: PatientExamination
) -> tuple[Collector | None, str]:
    receipts = list(
        StudyTableImport.objects.filter(patient_examination=examination).order_by("pk")
    )
    if not receipts or not any(receipt.owns_examination for receipt in receipts):
        return None, "unproven_import_ownership"
    owned = set(dataset.import_receipts.values_list("pk", flat=True))
    if any(receipt.pk not in owned for receipt in receipts):
        return None, "shared_import"
    if (
        AIDataSet.objects.filter(examinations=examination)
        .exclude(pk=dataset.pk)
        .exists()
    ):
        return None, "shared_dataset"
    if StudyCohort.objects.filter(imported_examinations=examination).exists():
        return None, "direct_study_membership"
    baseline = receipts[-1].deletion_record
    if not baseline or examination.report_draft:
        return None, "unproven_or_edited_record"
    if (
        SensitiveMetaState.objects.filter(origin__pseudo_examination=examination)
        .filter(models.Q(dob_verified=True) | models.Q(names_verified=True))
        .exists()
    ):
        return None, "edited_record"
    identity = TableImportReceiptPayload.model_validate(receipts[-1].payload)
    if (
        examination.hash != identity.examination_hash
        or examination.patient.patient_hash != identity.patient_hash
        or identity.record.date is None
        or examination.date_start != identity.record.date.date()
        or examination.date_end is not None
        or _semantic_record(examination.dtypes_record) != _semantic_record(baseline)
    ):
        return None, "edited_record"
    from endoreg_db.integrations import lx_dtypes_host_models
    from lx_dtypes.django.api.findings_routes import (
        build_p_examination_payload_from_host_ledger,
    )

    current = build_p_examination_payload_from_host_ledger(
        examination,
        route_module_name=examination.knowledge_base_module,
        orm_models=lambda: dict(lx_dtypes_host_models.orm_models()),
        active_patient_findings_queryset=lambda: (
            lx_dtypes_host_models.active_patient_findings_queryset()
        ),
    )
    expected = DtypesRecordPersistencePayload.model_validate(baseline)
    actual = DtypesRecordPersistencePayload.model_validate(
        current.model_dump(mode="json")
    )
    if (
        _semantic_record(actual.model_dump(mode="json"))
        != _semantic_record(expected.model_dump(mode="json"))
        or {str(finding.uuid) for finding in actual.patient_findings}
        != {str(finding.uuid) for finding in expected.patient_findings}
        or examination.patient_findings.filter(is_active=False).exists()
    ):
        return None, "edited_record"
    collector = Collector(using="default")
    try:
        collector.collect(
            cast("_IndexableCollection[models.Model | None]", [examination])
        )
    except ProtectedError:
        return None, "protected_relations"
    allowed = {
        "endoreg_db.patientexamination",
        "endoreg_db.patientfinding",
        "endoreg_db.patientfindingclassification",
        "endoreg_db.sensitivemeta",
        "endoreg_db.sensitivemetastate",
        "endoreg_db.sensitivemeta_examiners",
        "endoreg_db.aidataset_examinations",
    }
    affected = {model for model, rows in collector.data.items() if rows} | {
        query.model for query in collector.fast_deletes if query.exists()
    }
    if any(model._meta.label_lower not in allowed for model in affected):
        return None, "related_clinical_records_or_media"
    if any(
        (field.model != StudyTableImport or field.name != "patient_examination")
        and any(bool(rows) for rows in groups)
        for (field, _), groups in collector.field_updates.items()
    ):
        return None, "linked_media_or_other_references"
    return collector, ""


def _deletion_state(user: User, dataset: AIDataSet) -> dict[str, object]:
    require_dataset_access(user, dataset, write=True)
    removable: list[int] = []
    retained: list[dict[str, object]] = []
    for examination in dataset.examinations.order_by("pk"):
        try:
            collector, reason = _clinical_collector(dataset, examination)
        except ValueError:
            # An invalid clinical record can be unlinked from a dataset, but
            # cannot be proven safe to delete. Surface this retention explicitly.
            collector, reason = None, "clinical_validation_failed"
        if collector is None:
            retained.append({"id": examination.pk, "reason": reason})
        else:
            removable.append(examination.pk)
    return {
        "actor": user.pk,
        "dataset": dataset.pk,
        "updated": dataset.updated_at.isoformat(),
        "examinations": list(
            dataset.examinations.order_by("pk").values_list("pk", flat=True)
        ),
        "images": list(
            dataset.image_annotations.order_by("pk").values_list("pk", flat=True)
        ),
        "segments": list(
            dataset.video_annotations.order_by("pk").values_list("pk", flat=True)
        ),
        "videos": sorted(dataset_video_ids(dataset)),
        "studies": list(
            StudyCohort.objects.filter(datasets=dataset)
            .order_by("pk")
            .values_list("pk", flat=True)
        ),
        "removable": removable,
        "retained": retained,
    }


def deletion_preview(user: User, dataset: AIDataSet) -> dict[str, object]:
    state = _deletion_state(user, dataset)
    return {
        **state,
        "preview": signing.dumps(state, salt="dataset-deletion-v1", compress=True),
    }


@transaction.atomic
def delete_dataset(
    user: User, dataset_id: int, command: DatasetDelete
) -> dict[str, object]:
    dataset = _lock_datasets(user, [dataset_id], write=True)[0]
    require_dataset_access(user, dataset, write=True)
    list(dataset.examinations.select_for_update().order_by("pk"))
    state = _deletion_state(user, dataset)
    if signing.loads(command.preview, salt="dataset-deletion-v1", max_age=900) != state:
        raise ValueError("Dataset changed; review a new deletion preview")
    if AIModelTrainingRun.objects.filter(
        dataset=dataset, status__in=["queued", "running", "retry_wait"]
    ).exists():
        raise ValueError("Dataset has an active training run")
    if AIDataSetExportArtifact.objects.filter(
        dataset=dataset, status="running"
    ).exists():
        raise ValueError("Dataset has an active export")
    cohorts = list(
        StudyCohort.objects.select_for_update().filter(datasets=dataset).order_by("pk")
    )
    deleted: list[int] = []
    if command.mode == "exclusive_imported_records":
        eligible = set(cast(list[int], state["removable"]))
        for examination in list(dataset.examinations.order_by("pk")):
            if examination.pk not in eligible:
                continue
            collector, _ = _clinical_collector(dataset, examination)
            if collector is not None:
                deleted.append(examination.pk)
                collector.delete()
    joined = VideoFile.objects.filter(joined_dataset=dataset)
    if joined.exists():
        joined.update(joined_dataset_id=get_default_joined_dataset_id())
    dataset.delete()
    for cohort in cohorts:
        persist_study_definition(cohort)
    event = {
        "event": "dataset_deleted",
        "actor_id": user.pk,
        "dataset_id": dataset_id,
        "mode": command.mode,
        "deleted_examinations": deleted,
    }
    transaction.on_commit(lambda: logger.info(json.dumps(event)))
    return {"deleted": deleted, "retained": state["retained"], "mode": command.mode}
