# Core Concept Readiness Verdict

Date: 2026-03-06

## Purpose
Persist a stable, human-readable verdict on:
- which core concepts are ready for structured evaluation and automated reporting,
- which concepts are only type-contract-ready and still need domain input,
- and how to treat `report_templates.yaml` as a governed DSL.

This document is intended as session-memory for future implementation passes.

## Current Foundation (Implemented)
- Canonical 15-concept contract exists in `lx-data-models/lx_dtypes/models/contracts/core_concepts.py`.
- Canonical adapters exist in `lx-data-models/lx_dtypes/models/contracts/adapters.py` with CSV/list normalization isolation.
- Additive canonical API endpoint exists:
  - `GET /base_api/core-concepts/{module_name}` in `lx-data-models/lx_dtypes/django/api/main.py`.
- Frontend canonical types/client exist:
  - `frontend/src/types/coreConcepts.ts`
  - `frontend/src/api/coreConcepts.ts`
- Runtime validator engine exists for findings/examination validator execution:
  - `lx-data-models/lx_dtypes/models/knowledge_base/report_template/ValidatorRuntime.py`
- Type drift matrix exists:
  - `docs/guides/core-concept-type-matrix.md`
  - `docs/guides/core-concept-type-matrix.json`

## Verdict by Core Concept

### Ready for Structured Evaluation + Automated Reporting
- `Classification`
- `Examination`
- `Finding`

Rationale:
- Runtime engine directly evaluates finding presence and conditional classification requirements (`exists`, `missing`, `conditional`).
- Examination validators compose findings/examination dependencies with explicit issue reporting.

### Typed-Contract-Ready, But Still Needs Conceptual Input for Evaluation Logic
- `ClassificationChoice`
- `ClassificationChoiceDescriptor`
- `FindingType`
- `Indication`
- `IndicationType`
- `Intervention`
- `InterventionType`
- `Unit`
- `UnitType`
- `InformationSource`
- `InformationSourceType`
- `Citation`

Rationale:
- Canonical typing and transport are in place.
- Runtime rule semantics for these concepts are not yet explicitly defined in validator execution logic.

## Open Conceptual Decisions (Blocking Full Semantic Automation)
1. Should `report_finding.required` and section-level required findings be enforced by runtime validator execution, or remain UI guidance only?
2. Should `ClassificationChoiceDescriptor` constraints (`numeric_min/max`, selection cardinality, option membership) be enforced in runtime?
3. Should `FindingType`, `Indication`, and `Intervention` become first-class rule predicates/operators?
4. Should unit normalization/conversion be runtime-enforced (`Unit`/`UnitType`) for numeric classification comparisons?
5. Should provenance/citation (`InformationSource*`, `Citation`) support validation policies (for example: minimum source quality, mandatory citation for specific findings)?

## Opinion on `report_templates.yaml`

### Strengths
- Authoring ergonomics are good (readable, compact DSL).
- Supports meaningful conditional logic for reporting requirements.
- Supports modular composition via findings/examination validators.

### Risks to Address
- Duplicate name collisions are currently silently overwritten during KB load (`KnowledgeBase.create_from_config`), which is dangerous for production governance.
- Legacy alias model names are still accepted (`finding_validator` -> `findings_validator`), which increases ambiguity.
- Mixed style references (string vs inline object) are flexible but can increase authoring inconsistency.
- Structural + runtime validation functions exist but are not yet mandatory in the load/publish path.

## Governance Recommendation
Adopt strict template linting gates for CI and module publication:
1. Reject duplicate object names across template-related models.
2. Reject deprecated/alias model names in persisted YAML.
3. Reject dangling references (section/finding/validator).
4. Enforce one reference style policy where practical.
5. Require structure validation + runtime smoke evaluation before accepting template changes.

## Source-Of-Truth Order (Canonical)
1. Canonical contract model definitions (`core_concepts.py`)
2. Adapter conversion logic (`adapters.py`)
3. Storage representation (KB/YAML `ddict`, CSV-compatible)
4. Frontend canonical interfaces (`frontend/src/types/coreConcepts.ts`)
5. Store-local view models only as derived projections
