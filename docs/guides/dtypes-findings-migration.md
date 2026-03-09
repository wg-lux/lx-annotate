# Dtypes Findings Migration (Incremental, Endoreg-Safe)

Last updated: 2026-03-09
Owner: reporting/backend

## Scope
Migrate findings read/write flows to a dtypes-driven API surface under `/base_api/**` without breaking existing `/api/**` endoreg_db behavior.

## Current-State Inventory

### Uses dtypes today
- `/base_api/examinations/{examination_id}/findings/` read path uses `lx_dtypes` loader with module default `lx_knowledge_base`.
- `/base_api/findings/{finding_id}/classifications/` read path uses dtypes lookup constraints.
- `/base_api/classifications/{classification_id}/choices/` read path available.
- `/base_api/patient-findings/**` write/read API includes dtypes validation (finding allowed for exam, classification/choice consistency).
- Frontend `findingsApi` supports backend mode flag `VITE_FINDINGS_BACKEND` (`endoreg`, `dtypes_read`, `dtypes`).

### Uses endoreg_db today
- `/api/**` remains production default and unchanged.
- Patient finding persistence is still on endoreg_db tables (`PatientFinding`, `PatientFindingClassification`) for `/base_api/patient-findings/**`.
- Default frontend mode is `VITE_FINDINGS_BACKEND=endoreg`.
- Report save flows still submit to `/api/patient-examination-reports/save-submission/`.

## Phased Checklist

### Phase 0: Stabilize current findings flow (no behavior break)
- [x] Remove duplicate findings reactive reload triggers in `FindingsDetail` and `AddableFindingsDetail`.
- [x] Normalize findings network calls through a single service layer (`findingsApi`) for edited components/stores.
- [x] Keep endoreg-safe create contract: create finding first, then dedicated classifications update route.
- [x] Add structured error parsing (`required-finding`, `duplicate-finding`, `invalid-choice`, `invalid-finding`).
- Acceptance criteria:
  - No repeated watcher-trigger loops for single finding render.
  - 400 errors surface actionable code/message.

### Phase 1: Frontend findings API abstraction
- [x] Add `frontend/src/api/findingsApi.ts` + `.js`.
- [x] Add `VITE_FINDINGS_BACKEND` env typing.
- [x] Route `patientFindingStore` and `examinationStore` through `findingsApi`.
- [x] Route findings reads in `AddableFindingsDetail`, `FindingsDetail`, `Report.vue`, `ReportEditorPage.vue` through `findingsApi`.
- Acceptance criteria:
  - Component/store layer remains camelCase-compatible.
  - Backend switching does not require component-level endpoint changes.

### Phase 2: dtypes read endpoints (parallel, non-breaking)
- [x] `GET /base_api/examinations/{examination_id}/findings/`
- [x] `GET /base_api/findings/{finding_id}/classifications/`
- [x] `GET /base_api/classifications/{classification_id}/choices/`
- [x] Compatibility-oriented payload shape preserved (`id`, `name`, `required`, `choices`, legacy fields where needed).
- Acceptance criteria:
  - Frontend can run in `dtypes_read` mode without `/api` findings reads.

### Phase 3: dtypes write endpoints (endoreg-safe persistence)
- [x] `GET /base_api/patient-findings/?patient_examination=...`
- [x] `POST /base_api/patient-findings/`
- [x] `PATCH /base_api/patient-findings/{id}/`
- [x] `DELETE /base_api/patient-findings/{id}/`
- [x] `POST /base_api/patient-findings/{id}/classifications/`
- [x] Validation rules enforced before persistence.
- [x] Persistence remains endoreg_db tables for compatibility.
- Acceptance criteria:
  - `/api/**` remains fully operational with no contract regression.

### Phase 4: Cutover governance
- [x] Track migration in this document.
- [ ] Parity test suite green in CI for all findings endpoints/modes.
- [ ] Soak window complete (no regressions in configured period).
- [ ] Flip default `VITE_FINDINGS_BACKEND` from `endoreg` to agreed dtypes mode.

## Compatibility Matrix

| Endpoint / Area | Read/Write Source | Persistence | Rollout Status |
| --- | --- | --- | --- |
| `/api/examinations/*/findings/` | endoreg_db | endoreg_db | Stable (default path) |
| `/api/findings/*/classifications/` | endoreg_db | endoreg_db | Stable (default path) |
| `/api/patient-findings/**` | endoreg_db | endoreg_db | Stable (default path) |
| `/base_api/examinations/*/findings/` | dtypes KB | n/a | Implemented |
| `/base_api/findings/*/classifications/` | dtypes KB + db mapping | n/a | Implemented |
| `/base_api/classifications/*/choices/` | dtypes KB + db mapping | n/a | Implemented |
| `/base_api/patient-findings/**` | dtypes-validated API | endoreg_db tables | Implemented |
| Frontend findings integration | `findingsApi` mode switch | n/a | Implemented (default `endoreg`) |

## Decision Log

| Date | Decision | Rationale | Owner |
| --- | --- | --- | --- |
| 2026-03-09 | Keep `/api/**` as default while introducing `/base_api/**` in parallel. | Avoid production regressions during migration. | reporting/backend |
| 2026-03-09 | Use `VITE_FINDINGS_BACKEND` feature mode (`endoreg`, `dtypes_read`, `dtypes`). | Enables incremental rollout and targeted testing. | frontend |
| 2026-03-09 | Validate with dtypes but persist patient findings in existing endoreg tables for now. | Reduces schema/data migration risk while gaining validation parity. | backend |
| 2026-03-09 | Keep explicit create-then-classification flow for endoreg-safe mode. | Matches existing behavior and prevents nested-write ambiguity. | frontend/backend |
| 2026-03-09 | Pin pytest CI settings to a deterministic findings module (`report_template_examples`) when env var is unset. | Avoids environment-dependent `lx_knowledge_base` lookup failures in contract tests. | backend |

## Progress Log

| Date | Reference | Status | Notes |
| --- | --- | --- | --- |
| 2026-03-09 | Working tree changes in `lx_dtypes/django/api/main.py` and `test_findings_api.py` | Completed | Added `/base_api` findings read/write endpoints + validation + tests. |
| 2026-03-09 | Working tree changes in `lx_dtypes/django_settings_ci_test.py`, `pyproject.toml`, and API error/deactivation handling | Completed | Fixed pytest execution path for backend contract tests; `pytest lx-data-models/lx_dtypes/django/api/tests/test_findings_api.py -q` passes locally from repo root. |
| 2026-03-09 | Working tree changes in `frontend/src/api/findingsApi.*` | Completed | Added unified service layer and backend mode switch. |
| 2026-03-09 | Working tree changes in findings components/stores/reporting views | Completed | Removed duplicate reload triggers and migrated key calls to `findingsApi`. |
| 2026-03-09 | Frontend validation (`vue-tsc`) + targeted vitest (`findingsApi`, requirement crash guard) | Completed | Type-check and targeted migration tests pass locally. |

## Cutover Gate
Default can move from `endoreg` only when all are true:
- Contract tests pass for `/base_api` read/write findings endpoints.
- Frontend mode tests pass for `endoreg`, `dtypes_read`, and `dtypes`.
- End-to-end create/update/delete/classification flows pass in staging.
- No agreed regression during soak period.
