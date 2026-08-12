"""Release-B safety contract for databases created by the retired migration graph."""

from __future__ import annotations

import ast
import hashlib
import re
from collections.abc import Collection
from dataclasses import dataclass
from importlib import resources

_MIGRATION_FILENAME = re.compile(r"^(?P<name>\d{4}_.+)\.py$")


class MigrationHistorySafetyError(RuntimeError):
    """The installed canonical graph or recorded database history is unsafe."""


@dataclass(frozen=True)
class MigrationHistoryContract:
    app_label: str
    distribution: str
    legacy_names: frozenset[str]
    canonical_module: str
    canonical_leaf: str
    canonical_manifest_sha256: str


@dataclass(frozen=True)
class MigrationManifest:
    names: frozenset[str]
    sha256: str


class _ImportSyntaxNormalizer(ast.NodeTransformer):
    """Canonicalize equivalent import grouping and ordering for hashing."""

    @staticmethod
    def _normalize_statement_block(statements: list[ast.stmt]) -> list[ast.stmt]:
        normalized: list[ast.stmt] = []
        import_block: list[ast.stmt] = []

        def flush_import_block() -> None:
            normalized.extend(sorted(import_block, key=ast.dump))
            import_block.clear()

        for statement in statements:
            if isinstance(statement, ast.Import):
                import_block.extend(
                    ast.Import(names=[ast.alias(name=alias.name, asname=alias.asname)])
                    for alias in statement.names
                )
                continue
            if isinstance(statement, ast.ImportFrom):
                import_block.extend(
                    ast.ImportFrom(
                        module=statement.module,
                        names=[ast.alias(name=alias.name, asname=alias.asname)],
                        level=statement.level,
                    )
                    for alias in statement.names
                )
                continue
            flush_import_block()
            normalized.append(statement)
        flush_import_block()
        return normalized

    def generic_visit(self, node: ast.AST) -> ast.AST:
        visited = super().generic_visit(node)
        for field_name, field_value in ast.iter_fields(visited):
            if field_name not in {"body", "orelse", "finalbody"}:
                continue
            if isinstance(field_value, list) and all(
                isinstance(statement, ast.stmt) for statement in field_value
            ):
                setattr(
                    visited,
                    field_name,
                    self._normalize_statement_block(field_value),
                )
        return visited


CONTRACTS: tuple[MigrationHistoryContract, ...] = (
    MigrationHistoryContract(
        app_label="endoreg_db",
        distribution="endoreg-db",
        legacy_names=frozenset(
            """
            0001_initial
            0001_squashed_0001_initial
            0002_export_flags
            0003_patientexaminationreport_report_and_more
            0004_videofile_uuid
            0005_rawpdffile_uuid
            0006_applicationsettings
            0007_pdfprocessinghistory
            0008_imageclassificationannotation_upsert_fields
            0009_patientexamination_draft_updated_at_and_more
            0010_remove_requirementset_reqset_exam_links_and_more
            0011_hub_ingest_metadata
            0012_networknode_transferjob
            0013_remove_legacy_requirement_models
            0014_sensitivemeta_tags_sensitivemeta_validation_comment_and_more
            0015_uploadjob_content_hash_and_more
            0016_rename_streamable_relative_path_videofile_raw_streamable_relative_path_and_more
            0017_auditledger_ledgerhead_and_more
            0018_alter_rawpdffile_file_and_more
            0019_videostate_outside_segments_removed_and_more
            0020_alter_videoprocessinghistory_operation_and_more
            0021_anonymizationfieldmetric_and_more
            0022_anonymizationvalidationmetric_missing_sensitive_meta_deletion_count_and_more
            0023_reportllminferencejob_and_more
            0024_alter_videofile_processed_file
            0025_rename_datetime_patientlabvalue_timestamp_and_more
            0026_quarantineitem_videohlsartifact
            0027_rawpdfstate_processed_file_sha256
            0028_alter_videohlsartifact_status
            0029_dicomexportjob_dicominstance_dicomseries_dicomstudy_and_more
            0030_labelvideosegment_source_identity
            0031_uploadjob_error_code_uploadjob_last_attempt_at_and_more
            0032_frame_presentation_timestamp
            0033_portaluserinfo_centers
            0034_case_case_id_case_patient_lab_samples_and_more
            0035_reportimportattempt_and_more
            0036_alter_videohlsartifact_error_code
            0037_patientexamination_multiple_documents
            0038_videohlsartifact_encoding_profile_name_and_more
            0039_hub_storage_placement
            0040_storage_control_plane_hardening
            0041_storage_balance_work_item
            0042_storage_transfer_evidence
            0043_bind_rotation_transfer_evidence
            0044_storage_transfer_commit_and_rekey
            0045_storage_placement_media_lease_subject
            0046_storage_transfer_delete_evidence
            0047_storage_node_probe_state
            0048_storage_balance_cancellation_receipt
            0049_storage_reconciliation
            0050_storage_operator_control
            """.split(),
        ),
        canonical_module="endoreg_db.migrations",
        canonical_leaf="0071_storage_operator_control",
        canonical_manifest_sha256=(
            "6ac320ce7021ff542b2bd20769b5ef4256c07894b605cbb6df6adb67dafd90a9"
        ),
    ),
    MigrationHistoryContract(
        app_label="lx_dtypes_django",
        distribution="lx-dtypes",
        legacy_names=frozenset(
            """
            0001_initial
            0001_initial_squashed_0004_merge_20260402_0343
            0002_pexaminationdjango_knowledge_base_identity
            0003_findingdjango_caused_by_interventions
            0003_findingdjango_caused_by_interventions_and_more
            0004_merge_20260402_0343
            0005_videofiledjango
            """.split(),
        ),
        canonical_module="lx_dtypes.django.migrations",
        canonical_leaf="0005_videofiledjango",
        canonical_manifest_sha256=(
            "9db57c3c5d98404e8112df756d5f89155dcbbc879e9c004b36b631414496e98f"
        ),
    ),
)


def load_migration_manifest(module_name: str) -> MigrationManifest:
    migration_files: list[tuple[str, bytes]] = []
    migration_names: set[str] = set()
    try:
        module_root = resources.files(module_name)
    except (ModuleNotFoundError, TypeError) as exc:
        raise MigrationHistorySafetyError(
            f"Migration module '{module_name}' is unavailable: {exc}",
        ) from exc

    for entry in module_root.iterdir():
        if not entry.name.endswith(".py") or entry.name == "__init__.py":
            continue
        try:
            contents = entry.read_bytes()
        except OSError as exc:
            raise MigrationHistorySafetyError(
                f"Unable to read migration manifest entry '{entry.name}': {exc}",
            ) from exc
        migration_files.append((entry.name, contents))
        if match := _MIGRATION_FILENAME.fullmatch(entry.name):
            migration_names.add(match.group("name"))

    digest = hashlib.sha256()
    for filename, contents in sorted(migration_files):
        try:
            syntax_tree = ast.parse(contents, filename=filename)
        except SyntaxError as exc:
            raise MigrationHistorySafetyError(
                f"Migration manifest entry '{filename}' is invalid Python: {exc}",
            ) from exc
        normalized_tree = _ImportSyntaxNormalizer().visit(syntax_tree)
        normalized_syntax = ast.dump(
            normalized_tree,
            annotate_fields=True,
            include_attributes=False,
        ).encode("utf-8")
        digest.update(filename.encode("utf-8"))
        digest.update(b"\0")
        digest.update(normalized_syntax)
        digest.update(b"\0")
    return MigrationManifest(frozenset(migration_names), digest.hexdigest())


def verify_canonical_contract_manifests(
    contracts: Collection[MigrationHistoryContract] = CONTRACTS,
) -> dict[str, MigrationManifest]:
    manifests: dict[str, MigrationManifest] = {}
    for contract in contracts:
        canonical = load_migration_manifest(contract.canonical_module)
        if canonical.sha256 != contract.canonical_manifest_sha256:
            raise MigrationHistorySafetyError(
                f"{contract.app_label} canonical migration manifest does not match "
                "the reviewed release contract.",
            )
        if contract.canonical_leaf not in canonical.names:
            raise MigrationHistorySafetyError(
                f"{contract.app_label} canonical leaf {contract.canonical_leaf} is missing.",
            )
        manifests[contract.app_label] = canonical
    return manifests
