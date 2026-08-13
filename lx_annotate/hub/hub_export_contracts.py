from __future__ import annotations

from enum import StrEnum

from endoreg_db.models.state.anonymization import AnonymizationState
from endoreg_db.models.state.video_segment_validation import SegmentAnnotationStatus
from pydantic import BaseModel, ConfigDict, Field, PositiveInt, model_validator


class HubExportResourceKind(StrEnum):
    VIDEO = "video"
    REPORT = "report"


class HubExportResourceRef(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: PositiveInt
    resource_kind: HubExportResourceKind


class HubExportMutationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    target_node_key: str | None = None
    resources: list[HubExportResourceRef] = Field(min_length=1)


class HubEligibleVideoOffloadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    target_node_key: str | None = None


class HubEligibleVideoOffloadResult(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    target_node_key: str
    discovered_count: int
    eligible_count: int
    queued_count: int
    already_registered_count: int
    skipped_count: int


class HubExportPrivacyStatus(StrEnum):
    PASS = "pass"
    WARNING = "warning"
    UNAVAILABLE = "unavailable"


class HubExportFailureClass(StrEnum):
    CONFIGURATION_REJECTION = "configuration_rejection"
    AUTHORIZATION_DENIAL = "authorization_denial"
    INTEGRITY_INCONSISTENCY = "integrity_inconsistency"
    TRANSIENT_RETRY = "transient_retry"


class HubExportIntegrityStatus(StrEnum):
    NOT_READY = "not_ready"
    MISSING_PROCESSED_MEDIA = "missing_processed_media"
    MISSING_HASH = "missing_hash"
    HASH_METADATA_MISMATCH = "hash_metadata_mismatch"
    PERSISTED_VERIFIED = "persisted_verified"
    VERIFIED = "verified"
    PROCESSED_MEDIA_UNREADABLE = "processed_media_unreadable"
    PROCESSED_MEDIA_HASH_MISMATCH = "processed_media_hash_mismatch"


class HubExportRejectionReason(StrEnum):
    MISSING_CENTER = "missing_center"
    NOT_READY_FOR_EXPORT = "not_ready_for_export"
    MISSING_PROCESSED_FILE = "missing_processed_file"
    MISSING_PROCESSED_HASH = "missing_processed_hash"
    PROCESSED_HASH_METADATA_MISMATCH = "processed_hash_metadata_mismatch"
    PROCESSED_FILE_HASH_MISMATCH = "processed_file_hash_mismatch"
    PROCESSED_FILE_UNREADABLE = "processed_file_unreadable"
    SEGMENT_CLEANUP_PENDING = "segment_cleanup_pending"
    SEGMENT_CLEANUP_FAILED = "segment_cleanup_failed"


class HubExportDuplicateReason(StrEnum):
    TRANSFER_ALREADY_REGISTERED = "transfer_already_registered"


class HubNodeSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    node_key: str
    display_name: str
    base_url: str
    owning_center_key: str | None


class HubExportPrivacySummary(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    min_k: int
    eligible_resource_count: int
    eligible_case_count: int
    marked_resource_count: int
    smallest_equivalence_class_size: int | None
    violating_equivalence_class_count: int
    passes_k_anonymity: bool
    status: HubExportPrivacyStatus


class HubExportItem(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: int
    resource_kind: HubExportResourceKind
    filename: str
    anonymization_status: AnonymizationState
    segment_annotation_status: SegmentAnnotationStatus
    export_integrity_status: HubExportIntegrityStatus
    processed_media_present: bool
    source_center_key: str | None
    source_center_name: str | None
    marked_for_upload: bool
    marked_by_username: str | None
    marked_at: str | None
    outbound_status: str
    failure_class: HubExportFailureClass | None
    last_error: str
    blocked_reason: str
    last_transfer_timestamp: str | None
    target_node_key: str | None
    eligible: bool
    created_at: str | None


class HubProcessedFile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    resource_kind: HubExportResourceKind
    resource_id: int
    filename: str
    resource_hash: str
    processed_file_hash: str | None
    center_key: str
    center_name: str
    eligible: bool
    transfer_registered: bool
    transfer_key: str | None
    transfer_status: str
    target_node_key: str | None


class HubSyncRejection(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    resource_kind: HubExportResourceKind
    resource_id: int
    filename: str
    center_key: str | None
    reason: HubExportRejectionReason
    detail: str


class HubSyncDuplicate(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    resource_kind: HubExportResourceKind
    resource_id: int
    filename: str
    center_key: str | None
    reason: HubExportDuplicateReason
    transfer_key: str
    transfer_status: str
    target_node_key: str


class HubCenterSyncState(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    center_key: str
    display_name: str
    active_node_keys: list[str]
    processed_files: list[HubProcessedFile]
    candidate_count: int
    rejection_count: int
    duplicate_count: int

    @model_validator(mode="after")
    def validate_file_counts(self) -> HubCenterSyncState:
        candidates = sum(
            file.eligible and not file.transfer_registered
            for file in self.processed_files
        )
        if self.candidate_count != candidates:
            raise ValueError("candidate_count does not match processed_files")
        return self


class HubFileSyncSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    centers: list[HubCenterSyncState]
    rejections: list[HubSyncRejection]
    duplicates: list[HubSyncDuplicate]
    processed_file_count: int
    candidate_count: int

    @model_validator(mode="after")
    def validate_summary_counts(self) -> HubFileSyncSummary:
        center_keys = [center.center_key for center in self.centers]
        if len(center_keys) != len(set(center_keys)):
            raise ValueError("sync summary contains duplicate center_key values")
        if self.processed_file_count != sum(
            len(center.processed_files) for center in self.centers
        ):
            raise ValueError("processed_file_count does not match centers")
        if self.candidate_count != sum(
            center.candidate_count for center in self.centers
        ):
            raise ValueError("candidate_count does not match centers")
        centered_duplicates = sum(
            duplicate.center_key is not None for duplicate in self.duplicates
        )
        if centered_duplicates != sum(
            center.duplicate_count for center in self.centers
        ):
            raise ValueError("duplicates do not match center counts")
        centered_rejections = sum(
            rejection.center_key is not None for rejection in self.rejections
        )
        if centered_rejections != sum(
            center.rejection_count for center in self.centers
        ):
            raise ValueError("rejections do not match center counts")
        return self


class HubExportOverview(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    selected_target_node_key: str | None
    source_node_key: str | None
    hub_nodes: list[HubNodeSummary]
    config_ready: bool
    config_error: str
    privacy_summary: HubExportPrivacySummary
    sync_summary: HubFileSyncSummary
    items: list[HubExportItem]


__all__ = [
    "HubCenterSyncState",
    "HubExportDuplicateReason",
    "HubExportIntegrityStatus",
    "HubExportItem",
    "HubEligibleVideoOffloadRequest",
    "HubEligibleVideoOffloadResult",
    "HubExportMutationRequest",
    "HubExportOverview",
    "HubExportPrivacyStatus",
    "HubExportPrivacySummary",
    "HubExportRejectionReason",
    "HubExportResourceKind",
    "HubExportResourceRef",
    "HubFileSyncSummary",
    "HubNodeSummary",
    "HubProcessedFile",
    "HubSyncDuplicate",
    "HubSyncRejection",
]
