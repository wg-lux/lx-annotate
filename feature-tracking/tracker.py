#!/usr/bin/env python3
"""Validate, display, verify, and update production feature readiness."""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Callable, Literal, Sequence, cast
from uuid import uuid4

_REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
_VENV_ROOT = _REPOSITORY_ROOT / ".devenv/state/venv"
_VENV_PYTHON = _REPOSITORY_ROOT / ".devenv/state/venv/bin/python"

try:
    import yaml
    from pydantic import (
        BaseModel,
        ConfigDict,
        Field,
        ValidationError,
        field_validator,
        model_validator,
    )
except ModuleNotFoundError as exc:
    if _VENV_PYTHON.is_file() and Path(sys.prefix).resolve() != _VENV_ROOT.resolve():
        os.execv(
            str(_VENV_PYTHON),
            [str(_VENV_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]],
        )
    raise RuntimeError(
        "Feature-Tracker-Abhängigkeiten fehlen. Zuerst "
        "'devenv tasks run agent:sync' ausführen."
    ) from exc

from endoreg_db.utils.file_operations import (
    advisory_file_lock,
    atomic_create_file,
    atomic_write_file,
    safe_unlink_file,
)

TRACKING_DIR = Path(__file__).resolve().parent
REPOSITORY_ROOT = _REPOSITORY_ROOT
POLICY_FILE_NAME = "policy.yml"
NON_FEATURE_FILES = frozenset({POLICY_FILE_NAME, "schema.example.yml"})
LOCK_DIRECTORY_NAME = ".locks"
LOCK_MUTEX_FILE_NAME = ".registry.lock"
MESSAGE_DIRECTORY_NAME = ".messages"
MESSAGE_MUTEX_FILE_NAME = ".mailbox.lock"
DEFAULT_LOCK_TTL_MINUTES = 240
MAXIMUM_LOCK_TTL_MINUTES = 1440
DEFAULT_MESSAGE_TTL_HOURS = 168
MAXIMUM_MESSAGE_TTL_HOURS = 720


class TrackerError(RuntimeError):
    """Raised when the readiness registry cannot be loaded or updated safely."""


class CriterionCategory(StrEnum):
    REQUIREMENTS = "requirements"
    FUNCTIONALITY = "functionality"
    TESTING = "testing"
    SECURITY = "security"
    DATA_INTEGRITY = "data_integrity"
    INTEROPERABILITY = "interoperability"
    MAINTAINABILITY = "maintainability"
    OBSERVABILITY = "observability"
    OPERATIONS = "operations"
    DOCUMENTATION = "documentation"


class AssessmentStatus(StrEnum):
    NOT_ASSESSED = "not_assessed"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    VERIFIED = "verified"


class EvidenceKind(StrEnum):
    TEST = "test"
    CODE = "code"
    DOCUMENT = "document"
    REVIEW = "review"
    RUNBOOK = "runbook"
    MONITORING = "monitoring"
    DEMONSTRATION = "demonstration"
    COMMAND = "command"


class VerificationKind(StrEnum):
    COMMAND = "command"
    MANUAL = "manual"


class ReadinessStatus(StrEnum):
    EVALUATED = "evaluated"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    PRODUCTION_READY = "production_ready"


class FeatureTrackingState(StrEnum):
    ACTIVE = "active"
    DONE = "done"


class FeatureTrackingAction(StrEnum):
    DONE = "done"
    REOPENED = "reopened"


class FeatureTrackingEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    action: FeatureTrackingAction
    changed_by: str = Field(min_length=1)
    changed_at: datetime
    note: str = Field(min_length=1)

    @model_validator(mode="after")
    def validate_timestamp(self) -> "FeatureTrackingEvent":
        if self.changed_at.tzinfo is None:
            raise ValueError("tracking event changed_at must include a timezone")
        return self


class FeatureTracking(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    state: FeatureTrackingState = FeatureTrackingState.ACTIVE
    history: tuple[FeatureTrackingEvent, ...] = ()

    @model_validator(mode="after")
    def validate_history(self) -> "FeatureTracking":
        if not self.history:
            if self.state is FeatureTrackingState.DONE:
                raise ValueError("done tracking state requires a completion event")
            return self
        expected_state = (
            FeatureTrackingState.DONE
            if self.history[-1].action is FeatureTrackingAction.DONE
            else FeatureTrackingState.ACTIVE
        )
        if self.state is not expected_state:
            raise ValueError("tracking state must match the latest history event")
        return self


class SourceDisposition(StrEnum):
    MIGRATED = "migrated"
    REFERENCE = "reference"


class SourceDocument(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    path: str = Field(min_length=1, pattern=r"^.+\.md$")
    disposition: SourceDisposition
    note: str = Field(min_length=1)


class Evidence(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    kind: EvidenceKind
    reference: str = Field(min_length=1)
    note: str | None = Field(default=None, min_length=1)


class Assessment(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    status: AssessmentStatus = AssessmentStatus.NOT_ASSESSED
    evidence: tuple[Evidence, ...] = ()
    note: str | None = Field(default=None, min_length=1)
    assessed_by: str | None = Field(default=None, min_length=1)
    assessed_at: datetime | None = None

    @model_validator(mode="after")
    def validate_assessment(self) -> "Assessment":
        references = tuple(item.reference for item in self.evidence)
        if len(references) != len(set(references)):
            raise ValueError("assessment evidence references must be unique")

        if self.status is AssessmentStatus.NOT_ASSESSED:
            if (
                self.evidence
                or self.assessed_by is not None
                or self.assessed_at is not None
            ):
                raise ValueError(
                    "not_assessed criteria cannot contain evidence or assessment metadata"
                )
            return self

        if self.assessed_by is None or self.assessed_at is None:
            raise ValueError("assessed criteria require assessed_by and assessed_at")
        if self.assessed_at.tzinfo is None:
            raise ValueError("assessed_at must include a timezone")
        if self.status is AssessmentStatus.VERIFIED and not self.evidence:
            raise ValueError("verified criteria require evidence")
        if self.status is AssessmentStatus.BLOCKED and self.note is None:
            raise ValueError("blocked criteria require a note describing the blocker")
        return self


class Verification(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    kind: VerificationKind
    command: tuple[str, ...] | None = Field(default=None, min_length=1)
    instructions: str | None = Field(default=None, min_length=1)
    timeout_seconds: int = Field(default=300, ge=1, le=3600)

    @model_validator(mode="after")
    def validate_verification(self) -> "Verification":
        if self.kind is VerificationKind.COMMAND:
            if self.command is None:
                raise ValueError("command verification requires command")
            if self.instructions is not None:
                raise ValueError(
                    "command verification cannot also define manual instructions"
                )
        else:
            if self.instructions is None:
                raise ValueError("manual verification requires instructions")
            if self.command is not None:
                raise ValueError("manual verification cannot define command")
        return self


class DoneCriterion(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    category: CriterionCategory
    title: str = Field(min_length=1)
    acceptance: tuple[str, ...] = Field(min_length=1)
    required: bool = True
    verification: Verification
    assessment: Assessment = Field(default_factory=Assessment)

    @model_validator(mode="after")
    def validate_acceptance(self) -> "DoneCriterion":
        if len(self.acceptance) != len(set(self.acceptance)):
            raise ValueError(f"acceptance statements for {self.id} must be unique")
        return self


class FeatureDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    schema_version: Literal["1.0"] = "1.0"
    id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    name: str = Field(min_length=1)
    description: str = Field(min_length=1)
    owners: tuple[str, ...] = Field(min_length=1)
    production_critical: bool = True
    tracking: FeatureTracking = Field(default_factory=FeatureTracking)
    source_documents: tuple[SourceDocument, ...] = ()
    definition_of_done: tuple[DoneCriterion, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_feature(self) -> "FeatureDefinition":
        criterion_ids = tuple(item.id for item in self.definition_of_done)
        if len(criterion_ids) != len(set(criterion_ids)):
            raise ValueError(f"criterion ids for {self.id} must be unique")
        if len(self.owners) != len(set(self.owners)):
            raise ValueError(f"owners for {self.id} must be unique")
        source_paths = tuple(item.path for item in self.source_documents)
        if len(source_paths) != len(set(source_paths)):
            raise ValueError(f"source documents for {self.id} must be unique")
        return self


class ReadinessPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    schema_version: Literal["1.0"] = "1.0"
    required_categories: tuple[CriterionCategory, ...] = Field(min_length=1)
    minimum_required_criteria: int = Field(ge=1)
    require_owner: bool = True
    verified_evidence_minimum: int = Field(default=1, ge=1)
    migrated_markdown_trackers: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_policy(self) -> "ReadinessPolicy":
        if len(self.required_categories) != len(set(self.required_categories)):
            raise ValueError("required_categories must be unique")
        if len(self.migrated_markdown_trackers) != len(
            set(self.migrated_markdown_trackers)
        ):
            raise ValueError("migrated_markdown_trackers must be unique")
        return self


class FeatureReadiness(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    feature: FeatureDefinition
    status: ReadinessStatus
    verified_required: int = Field(ge=0)
    required_total: int = Field(ge=1)
    score_percent: int = Field(ge=0, le=100)


class FeatureLock(BaseModel):
    """One time-limited, owner-bound claim on feature work."""

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    schema_version: Literal["1.0"] = "1.0"
    lock_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    feature_id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    criterion_id: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_]*$")
    files: tuple[str, ...] = ()
    owner: str = Field(min_length=1)
    acquired_at: datetime
    expires_at: datetime
    note: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_lock(self) -> "FeatureLock":
        if self.acquired_at.tzinfo is None or self.expires_at.tzinfo is None:
            raise ValueError("feature lock timestamps must include a timezone")
        if self.expires_at <= self.acquired_at:
            raise ValueError("feature lock expiry must follow acquisition")
        if len(self.files) != len(set(self.files)):
            raise ValueError("feature lock files must be unique")
        if any(not path or Path(path).is_absolute() for path in self.files):
            raise ValueError("feature lock files must be relative repository paths")
        return self

    @property
    def is_feature_wide(self) -> bool:
        return self.criterion_id is None and not self.files


class AgentMessageSeverity(StrEnum):
    INFO = "info"
    REVIEW = "review"
    BLOCKING = "blocking"


class AgentMessage(BaseModel):
    """One local, owner-addressed coordination message for Codex CLI agents."""

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    schema_version: Literal["1.0"] = "1.0"
    message_id: str = Field(pattern=r"^[0-9a-f]{32}$")
    sender: str = Field(
        min_length=1,
        max_length=200,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._/@:-]*$",
    )
    recipient: str = Field(
        min_length=1,
        max_length=200,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._/@:-]*$",
    )
    severity: AgentMessageSeverity = AgentMessageSeverity.REVIEW
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=4000)
    feature_id: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_]*$")
    criterion_id: str | None = Field(default=None, pattern=r"^[a-z][a-z0-9_]*$")
    reply_to: str | None = Field(default=None, pattern=r"^[0-9a-f]{32}$")
    created_at: datetime
    expires_at: datetime
    acknowledged_at: datetime | None = None
    acknowledged_by: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._/@:-]*$",
    )

    @field_validator("subject", "body")
    @classmethod
    def reject_terminal_control_characters(cls, value: str) -> str:
        if any(ord(character) < 32 and character not in "\n\t" for character in value):
            raise ValueError("agent messages cannot contain terminal control characters")
        return value

    @model_validator(mode="after")
    def validate_message(self) -> "AgentMessage":
        if self.created_at.tzinfo is None or self.expires_at.tzinfo is None:
            raise ValueError("agent message timestamps must include a timezone")
        if self.expires_at <= self.created_at:
            raise ValueError("agent message expiry must follow creation")
        if self.criterion_id is not None and self.feature_id is None:
            raise ValueError("criterion_id requires feature_id")
        if (self.acknowledged_at is None) != (self.acknowledged_by is None):
            raise ValueError("message acknowledgement fields must be set together")
        if self.acknowledged_at is not None:
            if self.acknowledged_at.tzinfo is None:
                raise ValueError("acknowledged_at must include a timezone")
            if self.acknowledged_at < self.created_at:
                raise ValueError("message acknowledgement cannot precede creation")
            if self.acknowledged_by != self.recipient:
                raise ValueError("only the recipient can acknowledge a message")
        return self


class TaskTopology(StrEnum):
    """Dependency shape used to choose a safe agent execution mode."""

    INDEPENDENT_PARALLEL = "independent_parallel"
    SEQUENTIAL_INTERDEPENDENT = "sequential_interdependent"


class ExecutionMode(StrEnum):
    SINGLE_AGENT = "single_agent"
    CENTRALIZED_MULTI_AGENT = "centralized_multi_agent"


class NativeSubagentBackend(BaseModel):
    """In-session child threads managed by the current Codex session."""

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    kind: Literal["native_subagent"] = "native_subagent"
    agent_profile: str | None = Field(
        default=None,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]*$",
    )


class ExternalCodexExecBackend(BaseModel):
    """Headless Codex CLI workers launched by an external orchestrator."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    kind: Literal["external_codex_exec"] = "external_codex_exec"
    sandbox_mode: Literal["read-only", "workspace-write"]
    approval_policy: Literal["never"] = "never"

    @property
    def command_prefix(self) -> tuple[str, ...]:
        return (
            "codex",
            "exec",
            "--sandbox",
            self.sandbox_mode,
            "--ask-for-approval",
            self.approval_policy,
        )


AgentExecutionBackend = Annotated[
    NativeSubagentBackend | ExternalCodexExecBackend,
    Field(discriminator="kind"),
]


class WorkUnitStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETE = "complete"


class FindingConfidence(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class WorkerFinding(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    claim: str = Field(min_length=1, max_length=2000)
    source: str = Field(min_length=1, max_length=1000)
    confidence: FindingConfidence


class WorkerResult(BaseModel):
    """Schema-enforced worker-to-orchestrator response."""

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    task_status: Literal["complete", "blocked"]
    findings: tuple[WorkerFinding, ...] = ()
    gaps: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validate_result(self) -> "WorkerResult":
        if self.task_status == "complete" and not self.findings:
            raise ValueError("complete worker results require at least one finding")
        if self.task_status == "blocked" and not self.gaps:
            raise ValueError("blocked worker results require at least one gap")
        if len(self.gaps) != len(set(self.gaps)):
            raise ValueError("worker result gaps must be unique")
        return self


class WorkUnit(BaseModel):
    """One single-responsibility, budgeted, checkpointable worker task."""

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    responsibility: str = Field(min_length=1, max_length=500)
    criterion_id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    depends_on: tuple[str, ...] = ()
    max_turns: int = Field(default=1, ge=1, le=2)
    token_budget: int = Field(ge=1)
    status: WorkUnitStatus = WorkUnitStatus.PENDING
    result: WorkerResult | None = None

    @field_validator("responsibility")
    @classmethod
    def enforce_single_responsibility(cls, value: str) -> str:
        if re.search(r"\band\b", value, flags=re.IGNORECASE):
            raise ValueError(
                "work unit responsibility must describe one job; split conjunctions"
            )
        return value

    @model_validator(mode="after")
    def validate_checkpoint(self) -> "WorkUnit":
        if len(self.depends_on) != len(set(self.depends_on)):
            raise ValueError(f"work unit {self.id} dependencies must be unique")
        if self.id in self.depends_on:
            raise ValueError(f"work unit {self.id} cannot depend on itself")
        if self.status in {WorkUnitStatus.COMPLETE, WorkUnitStatus.BLOCKED}:
            if self.result is None or self.result.task_status != self.status.value:
                raise ValueError(
                    f"{self.status.value} work unit {self.id} requires a matching result"
                )
        elif self.result is not None:
            raise ValueError(
                f"{self.status.value} work unit {self.id} cannot contain a result"
            )
        return self


class OrchestrationContract(BaseModel):
    """Validated hub-and-spoke plan with explicit scaling guardrails."""

    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)

    schema_version: Literal["1.0"] = "1.0"
    run_id: str = Field(pattern=r"^[a-z][a-z0-9_-]*$")
    feature_id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    orchestrator: str = Field(min_length=1, max_length=200)
    topology: TaskTopology
    execution_mode: ExecutionMode
    agent_backend: AgentExecutionBackend | None = None
    max_workers: int = Field(ge=1, le=4)
    total_token_budget: int = Field(ge=1, le=50_000)
    work_units: tuple[WorkUnit, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_orchestration(self) -> "OrchestrationContract":
        units_by_id = {unit.id: unit for unit in self.work_units}
        if len(units_by_id) != len(self.work_units):
            raise ValueError("work unit ids must be unique")
        unknown_dependencies = {
            dependency
            for unit in self.work_units
            for dependency in unit.depends_on
            if dependency not in units_by_id
        }
        if unknown_dependencies:
            raise ValueError(
                "unknown work unit dependencies: "
                + ", ".join(sorted(unknown_dependencies))
            )
        _validate_acyclic_work_units(self.work_units)
        allocated_tokens = sum(unit.token_budget for unit in self.work_units)
        if allocated_tokens > self.total_token_budget:
            raise ValueError(
                f"work units allocate {allocated_tokens} tokens, exceeding the "
                f"{self.total_token_budget} token budget"
            )

        if self.topology is TaskTopology.SEQUENTIAL_INTERDEPENDENT:
            if self.execution_mode is not ExecutionMode.SINGLE_AGENT:
                raise ValueError("sequential topology requires single_agent mode")
            if self.max_workers != 1:
                raise ValueError("sequential topology requires max_workers=1")
            if self.agent_backend is not None:
                raise ValueError("single_agent mode cannot define an agent backend")
        elif len(self.work_units) == 1:
            if self.execution_mode is not ExecutionMode.SINGLE_AGENT:
                raise ValueError("one work unit requires single_agent mode")
            if self.max_workers != 1:
                raise ValueError("one work unit requires max_workers=1")
            if self.agent_backend is not None:
                raise ValueError("single_agent mode cannot define an agent backend")
        else:
            roots = tuple(unit for unit in self.work_units if not unit.depends_on)
            if len(roots) < 2:
                raise ValueError(
                    "parallel topology requires at least two non-blocking root work units"
                )
            if self.execution_mode is not ExecutionMode.CENTRALIZED_MULTI_AGENT:
                raise ValueError(
                    "parallel topology requires centralized_multi_agent mode"
                )
            if self.agent_backend is None:
                raise ValueError(
                    "centralized_multi_agent mode requires an explicit agent backend"
                )
            if not 2 <= self.max_workers <= min(4, len(self.work_units)):
                raise ValueError(
                    "parallel max_workers must be between 2 and the work unit count"
                )
        return self


def _validate_acyclic_work_units(work_units: Sequence[WorkUnit]) -> None:
    dependencies = {unit.id: set(unit.depends_on) for unit in work_units}
    remaining = set(dependencies)
    while remaining:
        ready = {
            unit_id
            for unit_id in remaining
            if not (dependencies[unit_id] & remaining)
        }
        if not ready:
            raise ValueError("work unit dependency graph must be acyclic")
        remaining -= ready


def _load_yaml(path: Path) -> object:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return cast(object, yaml.safe_load(handle))
    except OSError as exc:
        raise TrackerError(f"Datei kann nicht gelesen werden: {path}: {exc}") from exc
    except yaml.YAMLError as exc:
        raise TrackerError(f"Ungültiges YAML in {path}: {exc}") from exc


def _load_yaml_text(content: str, source: str) -> object:
    try:
        return cast(object, yaml.safe_load(content))
    except yaml.YAMLError as exc:
        raise TrackerError(f"Ungültiges YAML in {source}: {exc}") from exc


def load_policy(directory: Path = TRACKING_DIR) -> ReadinessPolicy:
    path = directory / POLICY_FILE_NAME
    try:
        return ReadinessPolicy.model_validate(_load_yaml(path))
    except ValidationError as exc:
        raise TrackerError(f"Ungültige Readiness-Policy in {path}:\n{exc}") from exc


def _validate_feature_payload(
    payload: object,
    *,
    source: str,
    file_stem: str,
) -> FeatureDefinition:
    try:
        feature = FeatureDefinition.model_validate(payload)
    except ValidationError as exc:
        raise TrackerError(f"Ungültige Feature-Definition in {source}:\n{exc}") from exc
    file_id = "".join(
        character for character in file_stem.casefold() if character.isalnum()
    )
    feature_id = "".join(
        character for character in feature.id.casefold() if character.isalnum()
    )
    if file_id != feature_id:
        raise TrackerError(
            "Dateiname und Feature-ID stimmen nicht überein: "
            f"{file_stem} != {feature.id}"
        )
    return feature


def load_feature_file(path: Path) -> FeatureDefinition:
    return _validate_feature_payload(
        _load_yaml(path),
        source=str(path),
        file_stem=path.stem,
    )


def validate_feature_against_policy(
    feature: FeatureDefinition,
    policy: ReadinessPolicy,
) -> None:
    required = tuple(item for item in feature.definition_of_done if item.required)
    if len(required) < policy.minimum_required_criteria:
        raise TrackerError(
            f"{feature.id}: mindestens {policy.minimum_required_criteria} "
            f"Pflichtkriterien erforderlich, gefunden: {len(required)}"
        )
    categories = {item.category for item in required}
    missing = set(policy.required_categories) - categories
    if missing:
        values = ", ".join(sorted(item.value for item in missing))
        raise TrackerError(f"{feature.id}: fehlende Pflichtkategorien: {values}")
    if policy.require_owner and not feature.owners:
        raise TrackerError(f"{feature.id}: mindestens ein Owner ist erforderlich")
    for criterion in required:
        assessment = criterion.assessment
        if (
            assessment.status is AssessmentStatus.VERIFIED
            and len(assessment.evidence) < policy.verified_evidence_minimum
        ):
            raise TrackerError(
                f"{feature.id}/{criterion.id}: mindestens "
                f"{policy.verified_evidence_minimum} Evidenznachweise erforderlich"
            )
    if feature.tracking.state is FeatureTrackingState.DONE and any(
        criterion.assessment.status is not AssessmentStatus.VERIFIED
        for criterion in required
    ):
        raise TrackerError(
            f"{feature.id}: done ist nur mit vollständig verifizierter DoD zulässig"
        )


def _validate_registry(
    policy: ReadinessPolicy,
    features: Sequence[FeatureDefinition],
    *,
    source_exists: Callable[[str], bool],
) -> tuple[ReadinessPolicy, tuple[FeatureDefinition, ...]]:
    if not features:
        raise TrackerError("Keine Feature-Definitionen gefunden")
    for feature in features:
        validate_feature_against_policy(feature, policy)
    ids = tuple(feature.id for feature in features)
    if len(ids) != len(set(ids)):
        raise TrackerError("Feature-IDs müssen über alle YAML-Dateien eindeutig sein")
    migrated_sources = tuple(
        source.path
        for feature in features
        for source in feature.source_documents
        if source.disposition is SourceDisposition.MIGRATED
    )
    if len(migrated_sources) != len(set(migrated_sources)):
        raise TrackerError(
            "Migrierte Markdown-Tracker dürfen nur einem Feature zugeordnet sein"
        )
    expected_sources = set(policy.migrated_markdown_trackers)
    actual_sources = set(migrated_sources)
    if expected_sources != actual_sources:
        missing = sorted(expected_sources - actual_sources)
        unexpected = sorted(actual_sources - expected_sources)
        details: list[str] = []
        if missing:
            details.append("nicht zugeordnet: " + ", ".join(missing))
        if unexpected:
            details.append("nicht in policy.yml: " + ", ".join(unexpected))
        raise TrackerError("Markdown-Migration unvollständig: " + "; ".join(details))
    all_sources = {
        source.path for feature in features for source in feature.source_documents
    }
    for source in all_sources:
        if not source_exists(source):
            raise TrackerError(f"Referenziertes Markdown-Dokument fehlt: {source}")
    return policy, tuple(features)


def load_registry(
    directory: Path = TRACKING_DIR,
) -> tuple[ReadinessPolicy, tuple[FeatureDefinition, ...]]:
    policy = load_policy(directory)
    features = tuple(
        load_feature_file(path)
        for path in sorted(directory.glob("*.yml"))
        if path.name not in NON_FEATURE_FILES
    )
    return _validate_registry(
        policy,
        features,
        source_exists=lambda source: (REPOSITORY_ROOT / source).is_file(),
    )


def _run_git(
    repository_root: Path,
    arguments: Sequence[str],
    *,
    allow_failure: bool = False,
) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            ("git", *arguments),
            cwd=repository_root,
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise TrackerError("Git ist nicht verfügbar") from exc
    if result.returncode != 0 and not allow_failure:
        detail = result.stderr.strip() or result.stdout.strip()
        raise TrackerError(
            f"Git-Befehl fehlgeschlagen ({shlex.join(arguments)}): {detail}"
        )
    return result


def _load_index_text(repository_root: Path, relative_path: str) -> str:
    result = _run_git(repository_root, ("show", f":{relative_path}"))
    return result.stdout


def _index_path_exists(repository_root: Path, relative_path: str) -> bool:
    result = _run_git(
        repository_root,
        ("cat-file", "-e", f":{relative_path}"),
        allow_failure=True,
    )
    return result.returncode == 0


def load_registry_from_git_index(
    repository_root: Path = REPOSITORY_ROOT,
) -> tuple[ReadinessPolicy, tuple[FeatureDefinition, ...]]:
    policy_path = f"feature-tracking/{POLICY_FILE_NAME}"
    try:
        policy = ReadinessPolicy.model_validate(
            _load_yaml_text(
                _load_index_text(repository_root, policy_path),
                f"Git-Index:{policy_path}",
            )
        )
    except ValidationError as exc:
        raise TrackerError(
            f"Ungültige Readiness-Policy im Git-Index:{policy_path}:\n{exc}"
        ) from exc

    listed = _run_git(
        repository_root,
        ("ls-files", "--cached", "--", ":(glob)feature-tracking/*.yml"),
    )
    feature_paths = tuple(
        Path(line)
        for line in listed.stdout.splitlines()
        if line and Path(line).name not in NON_FEATURE_FILES
    )
    features = tuple(
        _validate_feature_payload(
            _load_yaml_text(
                _load_index_text(repository_root, path.as_posix()),
                f"Git-Index:{path.as_posix()}",
            ),
            source=f"Git-Index:{path.as_posix()}",
            file_stem=path.stem,
        )
        for path in feature_paths
    )
    return _validate_registry(
        policy,
        features,
        source_exists=lambda source: _index_path_exists(repository_root, source),
    )


def derive_readiness(feature: FeatureDefinition) -> FeatureReadiness:
    required = tuple(item for item in feature.definition_of_done if item.required)
    verified = sum(
        item.assessment.status is AssessmentStatus.VERIFIED for item in required
    )
    statuses = {item.assessment.status for item in required}
    if verified == len(required):
        status = ReadinessStatus.PRODUCTION_READY
    elif AssessmentStatus.BLOCKED in statuses:
        status = ReadinessStatus.BLOCKED
    elif statuses == {AssessmentStatus.NOT_ASSESSED}:
        status = ReadinessStatus.EVALUATED
    else:
        status = ReadinessStatus.IN_PROGRESS
    return FeatureReadiness(
        feature=feature,
        status=status,
        verified_required=verified,
        required_total=len(required),
        score_percent=round(100 * verified / len(required)),
    )


def find_feature(
    features: Sequence[FeatureDefinition], feature_id: str
) -> FeatureDefinition:
    normalized = feature_id.casefold()
    for feature in features:
        if feature.id.casefold() == normalized:
            return feature
    available = ", ".join(feature.id for feature in features)
    raise TrackerError(f"Unbekanntes Feature '{feature_id}'. Verfügbar: {available}")


def find_criterion(feature: FeatureDefinition, criterion_id: str) -> DoneCriterion:
    normalized = criterion_id.casefold()
    for criterion in feature.definition_of_done:
        if criterion.id.casefold() == normalized:
            return criterion
    available = ", ".join(item.id for item in feature.definition_of_done)
    raise TrackerError(
        f"Unbekanntes Kriterium '{criterion_id}' für {feature.id}. "
        f"Verfügbar: {available}"
    )


def _lock_directory(directory: Path) -> Path:
    return directory / LOCK_DIRECTORY_NAME


def _lock_path(directory: Path, lock_id: str) -> Path:
    return _lock_directory(directory) / f"{lock_id}.json"


def _load_feature_lock(path: Path) -> FeatureLock:
    try:
        lock = FeatureLock.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise TrackerError(f"Ungültiger Feature-Lock in {path}: {exc}") from exc
    if path.stem != lock.lock_id:
        raise TrackerError(
            "Lock-Dateiname und Lock-ID stimmen nicht überein: "
            f"{path.stem} != {lock.lock_id}"
        )
    return lock


def _load_feature_locks(directory: Path) -> tuple[FeatureLock, ...]:
    return tuple(
        _load_feature_lock(path)
        for path in sorted(_lock_directory(directory).glob("*.json"))
    )


def _remove_expired_feature_locks(
    locks: Sequence[FeatureLock], *, directory: Path, now: datetime
) -> tuple[FeatureLock, ...]:
    active: list[FeatureLock] = []
    for lock in locks:
        if lock.expires_at <= now:
            safe_unlink_file(_lock_path(directory, lock.lock_id))
        else:
            active.append(lock)
    return tuple(active)


def active_feature_locks(
    directory: Path = TRACKING_DIR, *, now: datetime | None = None
) -> tuple[FeatureLock, ...]:
    current_time = now or datetime.now(timezone.utc)
    mutex_path = _lock_directory(directory) / LOCK_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        return _remove_expired_feature_locks(
            _load_feature_locks(directory), directory=directory, now=current_time
        )


def _normalize_locked_files(
    values: Sequence[str], *, repository_root: Path
) -> tuple[str, ...]:
    root = repository_root.resolve()
    normalized: list[str] = []
    for value in values:
        candidate = Path(value)
        resolved = (
            candidate.resolve()
            if candidate.is_absolute()
            else (root / candidate).resolve()
        )
        try:
            relative = resolved.relative_to(root)
        except ValueError as exc:
            raise TrackerError(
                f"Lock-Datei liegt außerhalb des Repositorys: {value}"
            ) from exc
        relative_path = relative.as_posix()
        if relative_path == "." or relative_path.startswith(
            f"feature-tracking/{LOCK_DIRECTORY_NAME}/"
        ):
            raise TrackerError(f"Ungültiger Datei-Scope für Feature-Lock: {value}")
        normalized.append(relative_path)
    if len(normalized) != len(set(normalized)):
        raise TrackerError("--file darf denselben Repository-Pfad nur einmal nennen")
    return tuple(normalized)


def _locks_conflict(first: FeatureLock, second: FeatureLock) -> bool:
    if set(first.files) & set(second.files):
        return True
    if first.feature_id != second.feature_id:
        return False
    if first.is_feature_wide or second.is_feature_wide:
        return True
    return first.criterion_id is not None and first.criterion_id == second.criterion_id


def _validate_lock_ttl(ttl_minutes: int) -> None:
    if not 1 <= ttl_minutes <= MAXIMUM_LOCK_TTL_MINUTES:
        raise TrackerError(
            f"--ttl-minutes muss zwischen 1 und {MAXIMUM_LOCK_TTL_MINUTES} liegen"
        )


def acquire_feature_lock(
    features: Sequence[FeatureDefinition],
    *,
    feature_id: str,
    owner: str,
    criterion_id: str | None = None,
    files: Sequence[str] = (),
    note: str | None = None,
    ttl_minutes: int = DEFAULT_LOCK_TTL_MINUTES,
    directory: Path = TRACKING_DIR,
    repository_root: Path = REPOSITORY_ROOT,
    now: datetime | None = None,
) -> FeatureLock:
    _validate_lock_ttl(ttl_minutes)
    feature = find_feature(features, feature_id)
    if feature.tracking.state is FeatureTrackingState.DONE:
        raise TrackerError(f"{feature.id} ist done und kann nicht gesperrt werden")
    criterion = (
        find_criterion(feature, criterion_id) if criterion_id is not None else None
    )
    current_time = now or datetime.now(timezone.utc)
    requested = FeatureLock(
        lock_id=uuid4().hex,
        feature_id=feature.id,
        criterion_id=criterion.id if criterion is not None else None,
        files=_normalize_locked_files(files, repository_root=repository_root),
        owner=owner,
        acquired_at=current_time,
        expires_at=current_time + timedelta(minutes=ttl_minutes),
        note=note,
    )
    mutex_path = _lock_directory(directory) / LOCK_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        active = _remove_expired_feature_locks(
            _load_feature_locks(directory), directory=directory, now=current_time
        )
        conflicting = tuple(lock for lock in active if _locks_conflict(lock, requested))
        if conflicting:
            details = ", ".join(
                f"{lock.lock_id} ({lock.owner}, bis {lock.expires_at.isoformat()})"
                for lock in conflicting
            )
            raise TrackerError(f"Feature-Lock kollidiert mit: {details}")
        serialized = requested.model_dump_json(indent=2).encode("utf-8") + b"\n"
        atomic_create_file(
            destination=_lock_path(directory, requested.lock_id),
            content=(serialized,),
            required_bytes=len(serialized),
            file_mode=0o600,
            dir_mode=0o700,
        )
    return requested


def renew_feature_lock(
    lock_id: str,
    *,
    owner: str,
    ttl_minutes: int = DEFAULT_LOCK_TTL_MINUTES,
    directory: Path = TRACKING_DIR,
    now: datetime | None = None,
) -> FeatureLock:
    _validate_lock_ttl(ttl_minutes)
    current_time = now or datetime.now(timezone.utc)
    mutex_path = _lock_directory(directory) / LOCK_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        path = _lock_path(directory, lock_id)
        if not path.is_file():
            raise TrackerError(f"Unbekannter Feature-Lock '{lock_id}'")
        current = _load_feature_lock(path)
        if current.owner != owner:
            raise TrackerError(
                f"Feature-Lock {lock_id} gehört '{current.owner}', nicht '{owner}'"
            )
        if current.expires_at <= current_time:
            safe_unlink_file(path)
            raise TrackerError(f"Feature-Lock {lock_id} ist bereits abgelaufen")
        renewed = current.model_copy(
            update={"expires_at": current_time + timedelta(minutes=ttl_minutes)}
        )
        serialized = renewed.model_dump_json(indent=2).encode("utf-8") + b"\n"
        atomic_write_file(
            destination=path,
            content=(serialized,),
            required_bytes=len(serialized),
            file_mode=0o600,
        )
    return renewed


def release_feature_lock(
    lock_id: str, *, owner: str, directory: Path = TRACKING_DIR
) -> FeatureLock:
    mutex_path = _lock_directory(directory) / LOCK_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        path = _lock_path(directory, lock_id)
        if not path.is_file():
            raise TrackerError(f"Unbekannter Feature-Lock '{lock_id}'")
        lock = _load_feature_lock(path)
        if lock.owner != owner:
            raise TrackerError(
                f"Feature-Lock {lock_id} gehört '{lock.owner}', nicht '{owner}'"
            )
        safe_unlink_file(path)
    return lock


def print_feature_locks(locks: Sequence[FeatureLock]) -> None:
    if not locks:
        print("Keine aktiven Feature-Locks.")
        return
    rows: list[tuple[str, ...]] = [
        ("Lock-ID", "Feature", "Kriterium", "Dateien", "Owner", "Läuft ab")
    ]
    for lock in locks:
        rows.append(
            (
                lock.lock_id,
                lock.feature_id,
                lock.criterion_id or ("*" if lock.is_feature_wide else "-"),
                ", ".join(lock.files) or "-",
                lock.owner,
                lock.expires_at.isoformat(),
            )
        )
    print(_render_table(rows))


def _message_directory(directory: Path) -> Path:
    return directory / MESSAGE_DIRECTORY_NAME


def _message_path(directory: Path, message_id: str) -> Path:
    if re.fullmatch(r"[0-9a-f]{32}", message_id) is None:
        raise TrackerError(f"Ungültige Nachrichten-ID '{message_id}'")
    return _message_directory(directory) / f"{message_id}.json"


def _load_agent_message(path: Path) -> AgentMessage:
    try:
        message = AgentMessage.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise TrackerError(f"Ungültige Agentennachricht in {path}: {exc}") from exc
    if path.stem != message.message_id:
        raise TrackerError(
            "Nachrichten-Dateiname und Nachrichten-ID stimmen nicht überein: "
            f"{path.stem} != {message.message_id}"
        )
    return message


def _load_agent_messages(directory: Path) -> tuple[AgentMessage, ...]:
    return tuple(
        _load_agent_message(path)
        for path in sorted(_message_directory(directory).glob("*.json"))
    )


def _remove_expired_agent_messages(
    messages: Sequence[AgentMessage], *, directory: Path, now: datetime
) -> tuple[AgentMessage, ...]:
    active: list[AgentMessage] = []
    for message in messages:
        if message.expires_at <= now:
            safe_unlink_file(_message_path(directory, message.message_id))
        else:
            active.append(message)
    return tuple(active)


def _serialize_agent_message(message: AgentMessage) -> bytes:
    return message.model_dump_json(indent=2).encode("utf-8") + b"\n"


def _validate_message_ttl(ttl_hours: int) -> None:
    if not 1 <= ttl_hours <= MAXIMUM_MESSAGE_TTL_HOURS:
        raise TrackerError(
            f"--ttl-hours muss zwischen 1 und {MAXIMUM_MESSAGE_TTL_HOURS} liegen"
        )


def _validate_message_feature_context(
    features: Sequence[FeatureDefinition],
    *,
    feature_id: str | None,
    criterion_id: str | None,
) -> tuple[str | None, str | None]:
    if feature_id is None:
        if criterion_id is not None:
            raise TrackerError("--criterion erfordert --feature")
        return None, None
    feature = find_feature(features, feature_id)
    criterion = (
        find_criterion(feature, criterion_id) if criterion_id is not None else None
    )
    return feature.id, criterion.id if criterion is not None else None


def send_agent_message(
    features: Sequence[FeatureDefinition],
    *,
    sender: str,
    recipient: str,
    subject: str,
    body: str,
    severity: AgentMessageSeverity = AgentMessageSeverity.REVIEW,
    feature_id: str | None = None,
    criterion_id: str | None = None,
    ttl_hours: int = DEFAULT_MESSAGE_TTL_HOURS,
    directory: Path = TRACKING_DIR,
    now: datetime | None = None,
) -> AgentMessage:
    _validate_message_ttl(ttl_hours)
    normalized_feature_id, normalized_criterion_id = _validate_message_feature_context(
        features, feature_id=feature_id, criterion_id=criterion_id
    )
    current_time = now or datetime.now(timezone.utc)
    message = AgentMessage(
        message_id=uuid4().hex,
        sender=sender,
        recipient=recipient,
        severity=severity,
        subject=subject,
        body=body,
        feature_id=normalized_feature_id,
        criterion_id=normalized_criterion_id,
        created_at=current_time,
        expires_at=current_time + timedelta(hours=ttl_hours),
    )
    mutex_path = _message_directory(directory) / MESSAGE_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        _remove_expired_agent_messages(
            _load_agent_messages(directory), directory=directory, now=current_time
        )
        serialized = _serialize_agent_message(message)
        atomic_create_file(
            destination=_message_path(directory, message.message_id),
            content=(serialized,),
            required_bytes=len(serialized),
            file_mode=0o600,
            dir_mode=0o700,
        )
    return message


def agent_inbox(
    *,
    recipient: str,
    include_acknowledged: bool = False,
    directory: Path = TRACKING_DIR,
    now: datetime | None = None,
) -> tuple[AgentMessage, ...]:
    current_time = now or datetime.now(timezone.utc)
    mutex_path = _message_directory(directory) / MESSAGE_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        active = _remove_expired_agent_messages(
            _load_agent_messages(directory), directory=directory, now=current_time
        )
    selected = tuple(
        message
        for message in active
        if message.recipient == recipient
        and (include_acknowledged or message.acknowledged_at is None)
    )
    return tuple(sorted(selected, key=lambda item: (item.created_at, item.message_id)))


def acknowledge_agent_message(
    message_id: str,
    *,
    owner: str,
    directory: Path = TRACKING_DIR,
    now: datetime | None = None,
) -> AgentMessage:
    current_time = now or datetime.now(timezone.utc)
    mutex_path = _message_directory(directory) / MESSAGE_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        path = _message_path(directory, message_id)
        if not path.is_file():
            raise TrackerError(f"Unbekannte Agentennachricht '{message_id}'")
        message = _load_agent_message(path)
        if message.expires_at <= current_time:
            safe_unlink_file(path)
            raise TrackerError(f"Agentennachricht {message_id} ist bereits abgelaufen")
        if message.recipient != owner:
            raise TrackerError(
                f"Agentennachricht {message_id} gehört '{message.recipient}', nicht '{owner}'"
            )
        if message.acknowledged_at is not None:
            return message
        acknowledged = AgentMessage.model_validate(
            {
                **message.model_dump(mode="python"),
                "acknowledged_at": current_time,
                "acknowledged_by": owner,
            }
        )
        serialized = _serialize_agent_message(acknowledged)
        atomic_write_file(
            destination=path,
            content=(serialized,),
            required_bytes=len(serialized),
            file_mode=0o600,
        )
    return acknowledged


def reply_to_agent_message(
    features: Sequence[FeatureDefinition],
    message_id: str,
    *,
    sender: str,
    body: str,
    severity: AgentMessageSeverity | None = None,
    ttl_hours: int = DEFAULT_MESSAGE_TTL_HOURS,
    directory: Path = TRACKING_DIR,
    now: datetime | None = None,
) -> AgentMessage:
    _validate_message_ttl(ttl_hours)
    current_time = now or datetime.now(timezone.utc)
    mutex_path = _message_directory(directory) / MESSAGE_MUTEX_FILE_NAME
    with advisory_file_lock(lock_path=mutex_path, timeout_seconds=10):
        source_path = _message_path(directory, message_id)
        if not source_path.is_file():
            raise TrackerError(f"Unbekannte Agentennachricht '{message_id}'")
        source = _load_agent_message(source_path)
        if source.expires_at <= current_time:
            safe_unlink_file(source_path)
            raise TrackerError(f"Agentennachricht {message_id} ist bereits abgelaufen")
        if source.recipient != sender:
            raise TrackerError(
                f"Nur Empfänger '{source.recipient}' darf auf {message_id} antworten"
            )
        _validate_message_feature_context(
            features, feature_id=source.feature_id, criterion_id=source.criterion_id
        )
        reply = AgentMessage(
            message_id=uuid4().hex,
            sender=sender,
            recipient=source.sender,
            severity=severity or source.severity,
            subject=(
                source.subject
                if source.subject.startswith("Re: ")
                else f"Re: {source.subject}"
            )[:200],
            body=body,
            feature_id=source.feature_id,
            criterion_id=source.criterion_id,
            reply_to=source.message_id,
            created_at=current_time,
            expires_at=current_time + timedelta(hours=ttl_hours),
        )
        serialized = _serialize_agent_message(reply)
        atomic_create_file(
            destination=_message_path(directory, reply.message_id),
            content=(serialized,),
            required_bytes=len(serialized),
            file_mode=0o600,
            dir_mode=0o700,
        )
    return reply


def print_agent_messages(
    messages: Sequence[AgentMessage], *, as_json: bool = False
) -> None:
    if as_json:
        print(
            json.dumps(
                [message.model_dump(mode="json") for message in messages],
                ensure_ascii=False,
                indent=2,
            )
        )
        return
    if not messages:
        print("Keine ungelesenen Agentennachrichten.")
        return
    for message in messages:
        context = message.feature_id or "allgemein"
        if message.criterion_id is not None:
            context = f"{context}/{message.criterion_id}"
        acknowledgement = "bestaetigt" if message.acknowledged_at else "ungelesen"
        print(
            f"[{message.severity.value}] {message.message_id} von {message.sender} "
            f"({context}, {acknowledgement})\n"
            f"  {message.subject}\n"
            f"  {message.body}"
        )


def load_orchestration_contract(path: Path) -> OrchestrationContract:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return OrchestrationContract.model_validate(payload)
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise TrackerError(f"Ungültiger Orchestrierungsvertrag in {path}: {exc}") from exc


def load_worker_result(path: Path) -> WorkerResult:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return WorkerResult.model_validate(payload)
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise TrackerError(f"Ungültiges Worker-Ergebnis in {path}: {exc}") from exc


def validate_orchestration_against_registry(
    contract: OrchestrationContract,
    features: Sequence[FeatureDefinition],
) -> None:
    feature = find_feature(features, contract.feature_id)
    if feature.tracking.state is FeatureTrackingState.DONE:
        raise TrackerError(
            f"{feature.id} ist done und kann nicht orchestriert werden"
        )
    for work_unit in contract.work_units:
        find_criterion(feature, work_unit.criterion_id)


def checkpoint_orchestration(
    contract: OrchestrationContract,
    *,
    work_unit_id: str,
    status: WorkUnitStatus,
    result: WorkerResult | None = None,
) -> OrchestrationContract:
    selected = next(
        (unit for unit in contract.work_units if unit.id == work_unit_id), None
    )
    if selected is None:
        available = ", ".join(unit.id for unit in contract.work_units)
        raise TrackerError(
            f"Unbekannte Work-Unit '{work_unit_id}'. Verfügbar: {available}"
        )
    if selected.status is status and selected.result == result:
        return contract

    allowed_transitions: dict[WorkUnitStatus, set[WorkUnitStatus]] = {
        WorkUnitStatus.PENDING: {WorkUnitStatus.IN_PROGRESS},
        WorkUnitStatus.IN_PROGRESS: {
            WorkUnitStatus.BLOCKED,
            WorkUnitStatus.COMPLETE,
        },
        WorkUnitStatus.BLOCKED: {WorkUnitStatus.IN_PROGRESS},
        WorkUnitStatus.COMPLETE: set(),
    }
    if status not in allowed_transitions[selected.status]:
        raise TrackerError(
            f"Ungültiger Checkpoint-Übergang für {work_unit_id}: "
            f"{selected.status.value} -> {status.value}"
        )
    try:
        updated_unit = WorkUnit.model_validate(
            {
                **selected.model_dump(mode="python"),
                "status": status,
                "result": result,
            }
        )
        updated_units = tuple(
            updated_unit if unit.id == work_unit_id else unit
            for unit in contract.work_units
        )
        return OrchestrationContract.model_validate(
            {
                **contract.model_dump(mode="python"),
                "work_units": updated_units,
            }
        )
    except ValidationError as exc:
        raise TrackerError(f"Ungültiger Checkpoint für {work_unit_id}: {exc}") from exc


def save_orchestration_contract(
    contract: OrchestrationContract,
    path: Path,
) -> None:
    serialized = contract.model_dump_json(indent=2).encode("utf-8") + b"\n"
    atomic_write_file(
        destination=path,
        content=(serialized,),
        required_bytes=len(serialized),
        file_mode=0o600,
    )


def update_assessment(
    feature: FeatureDefinition,
    *,
    criterion_id: str,
    status: AssessmentStatus,
    assessed_by: str | None,
    note: str | None,
    added_evidence: Sequence[Evidence] = (),
    clear_evidence: bool = False,
) -> FeatureDefinition:
    if feature.tracking.state is FeatureTrackingState.DONE:
        raise TrackerError(
            f"{feature.id} ist done; vor Bewertungsänderungen zuerst reopen ausführen"
        )
    current = find_criterion(feature, criterion_id)
    if status is AssessmentStatus.NOT_ASSESSED:
        assessment = Assessment()
    else:
        if assessed_by is None:
            raise TrackerError("--assessed-by ist für bewertete Kriterien erforderlich")
        evidence = () if clear_evidence else current.assessment.evidence
        evidence = (*evidence, *added_evidence)
        assessment = Assessment(
            status=status,
            evidence=evidence,
            note=note,
            assessed_by=assessed_by,
            assessed_at=datetime.now(timezone.utc),
        )
    replacement = current.model_copy(update={"assessment": assessment})
    criteria = tuple(
        replacement if item.id == current.id else item
        for item in feature.definition_of_done
    )
    return _copy_feature(feature, definition_of_done=criteria)


def _copy_feature(
    feature: FeatureDefinition,
    *,
    definition_of_done: tuple[DoneCriterion, ...] | None = None,
    tracking: FeatureTracking | None = None,
) -> FeatureDefinition:
    return FeatureDefinition(
        schema_version=feature.schema_version,
        id=feature.id,
        name=feature.name,
        description=feature.description,
        owners=feature.owners,
        production_critical=feature.production_critical,
        tracking=tracking if tracking is not None else feature.tracking,
        source_documents=feature.source_documents,
        definition_of_done=(
            definition_of_done
            if definition_of_done is not None
            else feature.definition_of_done
        ),
    )


def mark_feature_done(
    feature: FeatureDefinition,
    *,
    changed_by: str,
    note: str,
) -> FeatureDefinition:
    if feature.tracking.state is FeatureTrackingState.DONE:
        raise TrackerError(f"{feature.id} ist bereits done")
    readiness = derive_readiness(feature)
    if readiness.status is not ReadinessStatus.PRODUCTION_READY:
        raise TrackerError(
            f"{feature.id} kann nicht done gesetzt werden: "
            f"{readiness.verified_required}/{readiness.required_total} Pflichtkriterien verifiziert"
        )
    event = FeatureTrackingEvent(
        action=FeatureTrackingAction.DONE,
        changed_by=changed_by,
        changed_at=datetime.now(timezone.utc),
        note=note,
    )
    tracking = FeatureTracking(
        state=FeatureTrackingState.DONE,
        history=(*feature.tracking.history, event),
    )
    return _copy_feature(feature, tracking=tracking)


def reopen_feature(
    feature: FeatureDefinition,
    *,
    criterion_id: str,
    changed_by: str,
    note: str,
) -> FeatureDefinition:
    if feature.tracking.state is FeatureTrackingState.ACTIVE:
        raise TrackerError(f"{feature.id} wird bereits aktiv getrackt")
    current = find_criterion(feature, criterion_id)
    changed_at = datetime.now(timezone.utc)
    assessment = Assessment(
        status=AssessmentStatus.IN_PROGRESS,
        evidence=current.assessment.evidence,
        note=note,
        assessed_by=changed_by,
        assessed_at=changed_at,
    )
    replacement = current.model_copy(update={"assessment": assessment})
    criteria = tuple(
        replacement if item.id == current.id else item
        for item in feature.definition_of_done
    )
    event = FeatureTrackingEvent(
        action=FeatureTrackingAction.REOPENED,
        changed_by=changed_by,
        changed_at=changed_at,
        note=note,
    )
    tracking = FeatureTracking(
        state=FeatureTrackingState.ACTIVE,
        history=(*feature.tracking.history, event),
    )
    return _copy_feature(
        feature,
        definition_of_done=criteria,
        tracking=tracking,
    )


def save_feature(feature: FeatureDefinition, directory: Path = TRACKING_DIR) -> Path:
    feature_file_id = "".join(
        character for character in feature.id.casefold() if character.isalnum()
    )
    matching_paths = tuple(
        path
        for path in directory.glob("*.yml")
        if path.name not in NON_FEATURE_FILES
        and "".join(
            character for character in path.stem.casefold() if character.isalnum()
        )
        == feature_file_id
    )
    if len(matching_paths) > 1:
        names = ", ".join(sorted(path.name for path in matching_paths))
        raise TrackerError(f"Mehrere Feature-Dateien passen zu '{feature.id}': {names}")
    destination = (
        matching_paths[0] if matching_paths else directory / f"{feature.id}.yml"
    )
    payload = cast(
        dict[str, object], feature.model_dump(mode="json", exclude_none=True)
    )
    serialized = yaml.safe_dump(
        payload,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=100,
    ).encode("utf-8")
    atomic_write_file(
        destination=destination,
        content=(serialized,),
        required_bytes=len(serialized),
        file_mode=0o644,
    )
    return destination


STATUS_LABELS = {
    ReadinessStatus.EVALUATED: "evaluiert",
    ReadinessStatus.IN_PROGRESS: "in Arbeit",
    ReadinessStatus.BLOCKED: "blockiert",
    ReadinessStatus.PRODUCTION_READY: "PRODUKTIONSREIF",
}

ASSESSMENT_LABELS = {
    AssessmentStatus.NOT_ASSESSED: "○ nicht bewertet",
    AssessmentStatus.IN_PROGRESS: "◐ in Arbeit",
    AssessmentStatus.BLOCKED: "✗ blockiert",
    AssessmentStatus.VERIFIED: "✓ verifiziert",
}


def _render_table(rows: Sequence[Sequence[str]]) -> str:
    widths = [max(len(row[index]) for row in rows) for index in range(len(rows[0]))]
    rendered: list[str] = []
    for row_number, row in enumerate(rows):
        rendered.append(
            "  ".join(value.ljust(widths[index]) for index, value in enumerate(row))
        )
        if row_number == 0:
            rendered.append("  ".join("─" * width for width in widths))
    return "\n".join(rendered)


def actively_tracked_features(
    features: Sequence[FeatureDefinition],
) -> tuple[FeatureDefinition, ...]:
    return tuple(
        feature
        for feature in features
        if feature.tracking.state is FeatureTrackingState.ACTIVE
    )


def print_overview(
    features: Sequence[FeatureDefinition],
    *,
    include_done: bool = False,
) -> None:
    visible = tuple(features) if include_done else actively_tracked_features(features)
    readiness = tuple(derive_readiness(feature) for feature in visible)
    rows: list[tuple[str, ...]] = [
        ("Feature", "Evaluiert", "Reife", "Erfüllt", "Score", "Owner")
    ]
    for item in readiness:
        display_status = (
            "DONE"
            if item.feature.tracking.state is FeatureTrackingState.DONE
            else STATUS_LABELS[item.status]
        )
        rows.append(
            (
                item.feature.name,
                "ja",
                display_status,
                f"{item.verified_required}/{item.required_total}",
                f"{item.score_percent}%",
                ", ".join(item.feature.owners),
            )
        )
    print("Production readiness – lx-annotate and LuxNix\n")
    if readiness:
        print(_render_table(rows))
    else:
        print("Keine aktiv getrackten Features.")
    ready_count = sum(
        item.status is ReadinessStatus.PRODUCTION_READY for item in readiness
    )
    done_count = sum(
        feature.tracking.state is FeatureTrackingState.DONE for feature in features
    )
    print(f"\nProduktionsreif: {ready_count}/{len(readiness)} sichtbaren Features")
    print(
        f"Aktiv getrackt: {len(actively_tracked_features(features))}; Done: {done_count}"
    )
    print(
        "Ein Score ersetzt nicht das Gate: Alle Pflichtkriterien müssen verifiziert sein."
    )


def print_feature(feature: FeatureDefinition) -> None:
    readiness = derive_readiness(feature)
    print(f"{feature.name} ({feature.id})")
    print("Evaluation: evaluiert")
    print(f"Tracking: {feature.tracking.state.value}")
    print(f"Status: {STATUS_LABELS[readiness.status]}")
    print(
        f"Pflichtkriterien: {readiness.verified_required}/{readiness.required_total} "
        f"({readiness.score_percent}%)"
    )
    print(f"Owner: {', '.join(feature.owners)}")
    if feature.tracking.history:
        latest = feature.tracking.history[-1]
        print(
            f"Letzte Tracking-Aktion: {latest.action.value} durch "
            f"{latest.changed_by} am {latest.changed_at.isoformat()}"
        )
        print(f"Tracking-Hinweis: {latest.note}")
    if feature.source_documents:
        print("Quelldokumente:")
        for source in feature.source_documents:
            print(f"  - {source.path} ({source.disposition.value})")
    print(f"\n{feature.description}\n")
    for criterion in feature.definition_of_done:
        optional = " (optional)" if not criterion.required else ""
        print(
            f"[{criterion.category.value}] {criterion.id}{optional}: "
            f"{ASSESSMENT_LABELS[criterion.assessment.status]}"
        )
        print(f"  {criterion.title}")
        for acceptance in criterion.acceptance:
            print(f"  - {acceptance}")
        if criterion.assessment.note:
            print(f"  Hinweis: {criterion.assessment.note}")
        for evidence in criterion.assessment.evidence:
            print(f"  Evidenz: {evidence.kind.value}: {evidence.reference}")
        print()


def parse_evidence(values: Sequence[Sequence[str]] | None) -> tuple[Evidence, ...]:
    if values is None:
        return ()
    parsed: list[Evidence] = []
    for pair in values:
        if len(pair) != 2:
            raise TrackerError("--evidence erwartet KIND und REFERENZ")
        try:
            kind = EvidenceKind(pair[0])
        except ValueError as exc:
            allowed = ", ".join(item.value for item in EvidenceKind)
            raise TrackerError(f"Unbekannte Evidenzart '{pair[0]}': {allowed}") from exc
        parsed.append(Evidence(kind=kind, reference=pair[1]))
    return tuple(parsed)


def run_verification(criterion: DoneCriterion) -> tuple[bool, str]:
    verification = criterion.verification
    if (
        verification.kind is not VerificationKind.COMMAND
        or verification.command is None
    ):
        raise TrackerError(
            f"{criterion.id} ist eine manuelle Prüfung: {verification.instructions}"
        )
    command = verification.command
    display = shlex.join(command)
    print(f"\n$ {display}", flush=True)
    try:
        result = subprocess.run(
            command,
            cwd=REPOSITORY_ROOT,
            check=False,
            timeout=verification.timeout_seconds,
        )
    except FileNotFoundError:
        return False, f"Programm nicht gefunden: {command[0]}"
    except subprocess.TimeoutExpired:
        return False, f"Zeitlimit von {verification.timeout_seconds}s überschritten"
    if result.returncode == 0:
        return True, f"Erfolgreich: {display}"
    return False, f"Exit-Code {result.returncode}: {display}"


def _selected_features(
    features: Sequence[FeatureDefinition], feature_ids: Sequence[str]
) -> tuple[FeatureDefinition, ...]:
    if not feature_ids:
        return tuple(features)
    return tuple(find_feature(features, feature_id) for feature_id in feature_ids)


_REFERENCE_WORDS = re.compile(r"[^\W_]+", flags=re.UNICODE)


def _normalize_feature_reference(value: str) -> str:
    return " ".join(_REFERENCE_WORDS.findall(value.casefold()))


def find_feature_references(
    message: str,
    features: Sequence[FeatureDefinition],
) -> tuple[FeatureDefinition, ...]:
    normalized_message = f" {_normalize_feature_reference(message)} "
    matched: list[FeatureDefinition] = []
    for feature in features:
        if feature.tracking.state is FeatureTrackingState.DONE:
            continue
        references = {
            _normalize_feature_reference(feature.id),
            _normalize_feature_reference(feature.name),
        }
        if any(
            reference and f" {reference} " in normalized_message
            for reference in references
        ):
            matched.append(feature)
    return tuple(matched)


def unready_feature_references(
    message: str,
    features: Sequence[FeatureDefinition],
) -> tuple[FeatureReadiness, ...]:
    return tuple(
        readiness
        for readiness in (
            derive_readiness(feature)
            for feature in find_feature_references(message, features)
        )
        if readiness.status is not ReadinessStatus.PRODUCTION_READY
    )


def _read_commit_message(path: Path) -> str:
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise TrackerError(f"Commit-Message kann nicht gelesen werden: {path}") from exc
    return "\n".join(
        line for line in content.splitlines() if not line.lstrip().startswith("#")
    )


def guard_commit_message(
    message_path: Path,
    *,
    repository_root: Path = REPOSITORY_ROOT,
) -> int:
    _, features = load_registry_from_git_index(repository_root)
    message = _read_commit_message(message_path)
    matched = find_feature_references(message, features)
    if not matched:
        print("OK: Commit-Message referenziert kein getracktes Feature.")
        return 0

    failed = unready_feature_references(message, features)
    if failed:
        print(
            "COMMIT ABGELEHNT: referenzierte Features sind nicht produktionsreif:",
            file=sys.stderr,
        )
        for readiness in failed:
            print(
                f"- {readiness.feature.id}: {STATUS_LABELS[readiness.status]} "
                f"({readiness.verified_required}/{readiness.required_total})",
                file=sys.stderr,
            )
        print(
            "Definition of Done im gestagten feature-tracking-Stand vollständig "
            "verifizieren oder den Featurebezug aus der Commit-Message entfernen.",
            file=sys.stderr,
        )
        return 1

    names = ", ".join(feature.id for feature in matched)
    print(f"OK: referenzierte Features sind produktionsreif: {names}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Manage production readiness for lx-annotate and LuxNix features."
    )
    parser.set_defaults(include_done=False)
    parser.add_argument(
        "--directory",
        type=Path,
        default=TRACKING_DIR,
        help="Verzeichnis der Feature-YAML-Dateien",
    )
    subparsers = parser.add_subparsers(dest="command")

    overview = subparsers.add_parser("overview", help="Zentrale Übersicht anzeigen")
    overview.add_argument(
        "--all",
        action="store_true",
        dest="include_done",
        help="Auch als done abgeschlossene Features anzeigen",
    )

    show = subparsers.add_parser("show", help="Definition of Done eines Features")
    show.add_argument("feature_id")

    validate = subparsers.add_parser("validate", help="YAML und Policy validieren")
    validate.add_argument("feature_ids", nargs="*")

    check = subparsers.add_parser(
        "check", help="Nur bei vollständiger Produktionsreife erfolgreich beenden"
    )
    check.add_argument("feature_ids", nargs="*")

    update = subparsers.add_parser("update", help="Bewertung eines Kriteriums ändern")
    update.add_argument("feature_id")
    update.add_argument("criterion_id")
    update.add_argument("--status", required=True, choices=tuple(AssessmentStatus))
    update.add_argument("--assessed-by")
    update.add_argument("--note")
    update.add_argument(
        "--evidence",
        action="append",
        nargs=2,
        metavar=("KIND", "REFERENZ"),
    )
    update.add_argument("--clear-evidence", action="store_true")

    verify = subparsers.add_parser(
        "verify", help="Automatisierte Prüfkommandos ausführen"
    )
    verify.add_argument("feature_id")
    verify.add_argument("criterion_ids", nargs="*")
    verify.add_argument("--update", action="store_true")
    verify.add_argument("--assessed-by")

    done = subparsers.add_parser(
        "done",
        help="Produktionsreifes Feature abschließen und aus aktivem Tracking entfernen",
    )
    done.add_argument("feature_id")
    done.add_argument("--assessed-by", required=True)
    done.add_argument("--note", required=True)

    reopen = subparsers.add_parser(
        "reopen",
        help="Abgeschlossenes Feature wieder in aktives Tracking aufnehmen",
    )
    reopen.add_argument("feature_id")
    reopen.add_argument("criterion_id")
    reopen.add_argument("--assessed-by", required=True)
    reopen.add_argument("--note", required=True)

    lock = subparsers.add_parser(
        "lock", help="Zeitlich begrenzte Arbeits-Locks für Agenten verwalten"
    )
    lock_subparsers = lock.add_subparsers(dest="lock_command", required=True)
    lock_acquire = lock_subparsers.add_parser(
        "acquire", help="Scope prüfen und atomar sperren"
    )
    lock_acquire.add_argument("feature_id")
    lock_acquire.add_argument("--owner", required=True)
    lock_acquire.add_argument("--criterion")
    lock_acquire.add_argument("--file", action="append", default=[])
    lock_acquire.add_argument("--note")
    lock_acquire.add_argument(
        "--ttl-minutes", type=int, default=DEFAULT_LOCK_TTL_MINUTES
    )
    lock_status = lock_subparsers.add_parser(
        "status", help="Aktive Locks anzeigen und abgelaufene entfernen"
    )
    lock_status.add_argument("feature_id", nargs="?")
    lock_renew = lock_subparsers.add_parser(
        "renew", help="Eigenen aktiven Lock verlängern"
    )
    lock_renew.add_argument("lock_id")
    lock_renew.add_argument("--owner", required=True)
    lock_renew.add_argument("--ttl-minutes", type=int, default=DEFAULT_LOCK_TTL_MINUTES)
    lock_release = lock_subparsers.add_parser("release", help="Eigenen Lock freigeben")
    lock_release.add_argument("lock_id")
    lock_release.add_argument("--owner", required=True)

    message = subparsers.add_parser(
        "message", help="Lokale Nachrichten zwischen Codex-CLI-Agenten verwalten"
    )
    message_subparsers = message.add_subparsers(
        dest="message_command", required=True
    )
    message_send = message_subparsers.add_parser(
        "send", help="Owner-adressierte Nachricht atomar zustellen"
    )
    message_send.add_argument("--from", dest="sender", required=True)
    message_send.add_argument("--to", dest="recipient", required=True)
    message_send.add_argument("--subject", required=True)
    message_send.add_argument("--body", required=True)
    message_send.add_argument(
        "--severity",
        choices=tuple(AgentMessageSeverity),
        default=AgentMessageSeverity.REVIEW.value,
    )
    message_send.add_argument("--feature")
    message_send.add_argument("--criterion")
    message_send.add_argument(
        "--ttl-hours", type=int, default=DEFAULT_MESSAGE_TTL_HOURS
    )
    message_inbox = message_subparsers.add_parser(
        "inbox", help="Postfach eines Owners abrufen"
    )
    message_inbox.add_argument("--owner", required=True)
    message_inbox.add_argument(
        "--all", action="store_true", dest="include_acknowledged"
    )
    message_inbox.add_argument("--json", action="store_true", dest="as_json")
    message_ack = message_subparsers.add_parser(
        "ack", help="Nachricht als ihr Empfänger bestätigen"
    )
    message_ack.add_argument("message_id")
    message_ack.add_argument("--owner", required=True)
    message_reply = message_subparsers.add_parser(
        "reply", help="Als Empfänger auf eine Nachricht antworten"
    )
    message_reply.add_argument("message_id")
    message_reply.add_argument("--from", dest="sender", required=True)
    message_reply.add_argument("--body", required=True)
    message_reply.add_argument("--severity", choices=tuple(AgentMessageSeverity))
    message_reply.add_argument(
        "--ttl-hours", type=int, default=DEFAULT_MESSAGE_TTL_HOURS
    )

    orchestration = subparsers.add_parser(
        "orchestration",
        help="Typisierte Topologie-, Budget- und Checkpoint-Verträge verwalten",
    )
    orchestration_subparsers = orchestration.add_subparsers(
        dest="orchestration_command", required=True
    )
    orchestration_validate = orchestration_subparsers.add_parser(
        "validate", help="Orchestrierungsvertrag gegen Schema und Registry prüfen"
    )
    orchestration_validate.add_argument("contract_file", type=Path)
    orchestration_checkpoint = orchestration_subparsers.add_parser(
        "checkpoint", help="Work-Unit atomar und idempotent fortschreiben"
    )
    orchestration_checkpoint.add_argument("contract_file", type=Path)
    orchestration_checkpoint.add_argument("work_unit_id")
    orchestration_checkpoint.add_argument(
        "--status", required=True, choices=tuple(WorkUnitStatus)
    )
    orchestration_checkpoint.add_argument("--result-file", type=Path)

    guard = subparsers.add_parser(
        "guard-commit-message",
        help="Commit bei nicht erfüllter Feature-DoD ablehnen",
    )
    guard.add_argument("message_file", type=Path)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    directory = cast(Path, args.directory).resolve()
    command = cast(str | None, args.command) or "overview"

    if command == "guard-commit-message":
        return guard_commit_message(cast(Path, args.message_file).resolve())

    policy, features = load_registry(directory)

    if command == "overview":
        print_overview(features, include_done=cast(bool, args.include_done))
        return 0
    if command == "show":
        print_feature(find_feature(features, cast(str, args.feature_id)))
        return 0
    if command == "lock":
        lock_command = cast(str, args.lock_command)
        if lock_command == "acquire":
            owner = cast(str, args.owner)
            acquired = acquire_feature_lock(
                features,
                feature_id=cast(str, args.feature_id),
                criterion_id=cast(str | None, args.criterion),
                files=cast(Sequence[str], args.file),
                owner=owner,
                note=cast(str | None, args.note),
                ttl_minutes=cast(int, args.ttl_minutes),
                directory=directory,
                repository_root=REPOSITORY_ROOT,
            )
            print(f"Feature-Lock erworben: {acquired.lock_id}")
            unread = agent_inbox(recipient=owner, directory=directory)
            if unread:
                print(f"Ungelesene Agentennachrichten: {len(unread)}")
                print_agent_messages(unread)
            return 0
        if lock_command == "status":
            locks = active_feature_locks(directory)
            feature_id = cast(str | None, args.feature_id)
            if feature_id is not None:
                feature = find_feature(features, feature_id)
                locks = tuple(lock for lock in locks if lock.feature_id == feature.id)
            print_feature_locks(locks)
            return 0
        if lock_command == "renew":
            renewed = renew_feature_lock(
                cast(str, args.lock_id),
                owner=cast(str, args.owner),
                ttl_minutes=cast(int, args.ttl_minutes),
                directory=directory,
            )
            print(f"Feature-Lock verlängert bis {renewed.expires_at.isoformat()}")
            return 0
        if lock_command == "release":
            released = release_feature_lock(
                cast(str, args.lock_id),
                owner=cast(str, args.owner),
                directory=directory,
            )
            print(f"Feature-Lock freigegeben: {released.lock_id}")
            return 0
        raise TrackerError(f"Unbekannter Lock-Befehl: {lock_command}")
    if command == "message":
        message_command = cast(str, args.message_command)
        if message_command == "send":
            sent = send_agent_message(
                features,
                sender=cast(str, args.sender),
                recipient=cast(str, args.recipient),
                subject=cast(str, args.subject),
                body=cast(str, args.body),
                severity=AgentMessageSeverity(cast(str, args.severity)),
                feature_id=cast(str | None, args.feature),
                criterion_id=cast(str | None, args.criterion),
                ttl_hours=cast(int, args.ttl_hours),
                directory=directory,
            )
            print(f"Agentennachricht zugestellt: {sent.message_id}")
            return 0
        if message_command == "inbox":
            messages = agent_inbox(
                recipient=cast(str, args.owner),
                include_acknowledged=cast(bool, args.include_acknowledged),
                directory=directory,
            )
            print_agent_messages(messages, as_json=cast(bool, args.as_json))
            return 0
        if message_command == "ack":
            acknowledged = acknowledge_agent_message(
                cast(str, args.message_id),
                owner=cast(str, args.owner),
                directory=directory,
            )
            print(f"Agentennachricht bestätigt: {acknowledged.message_id}")
            return 0
        if message_command == "reply":
            severity_value = cast(str | None, args.severity)
            reply = reply_to_agent_message(
                features,
                cast(str, args.message_id),
                sender=cast(str, args.sender),
                body=cast(str, args.body),
                severity=(
                    AgentMessageSeverity(severity_value)
                    if severity_value is not None
                    else None
                ),
                ttl_hours=cast(int, args.ttl_hours),
                directory=directory,
            )
            print(f"Antwort zugestellt: {reply.message_id}")
            return 0
        raise TrackerError(f"Unbekannter Nachrichten-Befehl: {message_command}")
    if command == "orchestration":
        orchestration_command = cast(str, args.orchestration_command)
        contract_path = cast(Path, args.contract_file).resolve()
        contract = load_orchestration_contract(contract_path)
        validate_orchestration_against_registry(contract, features)
        if orchestration_command == "validate":
            print(
                f"OK: Orchestrierungsvertrag {contract.run_id} ist gültig "
                f"({contract.execution_mode.value}, {len(contract.work_units)} Work-Units)."
            )
            return 0
        if orchestration_command == "checkpoint":
            status = WorkUnitStatus(cast(str, args.status))
            result_path = cast(Path | None, args.result_file)
            result = load_worker_result(result_path) if result_path is not None else None
            updated = checkpoint_orchestration(
                contract,
                work_unit_id=cast(str, args.work_unit_id),
                status=status,
                result=result,
            )
            save_orchestration_contract(updated, contract_path)
            print(
                f"Checkpoint gespeichert: {contract.run_id}/"
                f"{cast(str, args.work_unit_id)} -> {status.value}"
            )
            return 0
        raise TrackerError(
            f"Unbekannter Orchestrierungs-Befehl: {orchestration_command}"
        )
    if command == "validate":
        selected = _selected_features(features, cast(Sequence[str], args.feature_ids))
        for feature in selected:
            validate_feature_against_policy(feature, policy)
        print(f"OK: {len(selected)} Feature-Definition(en) sind gültig.")
        return 0
    if command == "check":
        requested_features = cast(Sequence[str], args.feature_ids)
        selected = (
            _selected_features(features, requested_features)
            if requested_features
            else actively_tracked_features(features)
        )
        readiness = tuple(derive_readiness(feature) for feature in selected)
        failed = tuple(
            item
            for item in readiness
            if item.status is not ReadinessStatus.PRODUCTION_READY
        )
        if failed:
            for item in failed:
                print(
                    f"NICHT PRODUKTIONSREIF: {item.feature.id} "
                    f"({item.verified_required}/{item.required_total})",
                    file=sys.stderr,
                )
            return 1
        print(f"OK: {len(selected)} Feature(s) sind produktionsreif.")
        return 0
    if command == "update":
        feature = find_feature(features, cast(str, args.feature_id))
        evidence_values = cast(list[list[str]] | None, args.evidence)
        updated = update_assessment(
            feature,
            criterion_id=cast(str, args.criterion_id),
            status=AssessmentStatus(cast(str, args.status)),
            assessed_by=cast(str | None, args.assessed_by),
            note=cast(str | None, args.note),
            added_evidence=parse_evidence(evidence_values),
            clear_evidence=cast(bool, args.clear_evidence),
        )
        validate_feature_against_policy(updated, policy)
        destination = save_feature(updated, directory)
        print(f"Aktualisiert: {destination}")
        return 0
    if command == "verify":
        feature = find_feature(features, cast(str, args.feature_id))
        if (
            cast(bool, args.update)
            and feature.tracking.state is FeatureTrackingState.DONE
        ):
            raise TrackerError(
                f"{feature.id} ist done; vor Bewertungsänderungen zuerst reopen ausführen"
            )
        if cast(bool, args.update) and cast(str | None, args.assessed_by) is None:
            raise TrackerError("verify --update erfordert --assessed-by")
        requested = cast(Sequence[str], args.criterion_ids)
        criteria = (
            tuple(find_criterion(feature, item) for item in requested)
            if requested
            else tuple(
                item
                for item in feature.definition_of_done
                if item.verification.kind is VerificationKind.COMMAND
            )
        )
        if not criteria:
            raise TrackerError("Keine automatisierten Kriterien ausgewählt")
        updated = feature
        all_successful = True
        for criterion in criteria:
            successful, detail = run_verification(criterion)
            print(("✓ " if successful else "✗ ") + detail)
            all_successful = all_successful and successful
            if cast(bool, args.update):
                actor = cast(str | None, args.assessed_by)
                command_tuple = criterion.verification.command
                if command_tuple is None:
                    raise TrackerError(f"{criterion.id}: Prüfkommando fehlt")
                evidence = Evidence(
                    kind=EvidenceKind.COMMAND,
                    reference=shlex.join(command_tuple),
                    note="Exit-Code 0" if successful else "Prüfung fehlgeschlagen",
                )
                updated = update_assessment(
                    updated,
                    criterion_id=criterion.id,
                    status=(
                        AssessmentStatus.VERIFIED
                        if successful
                        else AssessmentStatus.BLOCKED
                    ),
                    assessed_by=actor,
                    note=None if successful else detail,
                    added_evidence=(evidence,),
                    clear_evidence=True,
                )
        if cast(bool, args.update):
            validate_feature_against_policy(updated, policy)
            destination = save_feature(updated, directory)
            print(f"Bewertungen aktualisiert: {destination}")
        return 0 if all_successful else 1
    if command == "done":
        feature = find_feature(features, cast(str, args.feature_id))
        updated = mark_feature_done(
            feature,
            changed_by=cast(str, args.assessed_by),
            note=cast(str, args.note),
        )
        validate_feature_against_policy(updated, policy)
        destination = save_feature(updated, directory)
        print(f"Done und aus aktivem Tracking entfernt: {destination}")
        return 0
    if command == "reopen":
        feature = find_feature(features, cast(str, args.feature_id))
        updated = reopen_feature(
            feature,
            criterion_id=cast(str, args.criterion_id),
            changed_by=cast(str, args.assessed_by),
            note=cast(str, args.note),
        )
        validate_feature_against_policy(updated, policy)
        destination = save_feature(updated, directory)
        print(f"Wieder aktiv getrackt: {destination}")
        return 0
    parser.error(f"Unbekannter Befehl: {command}")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except TrackerError as exc:
        print(f"FEHLER: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc
