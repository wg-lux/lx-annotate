# Dtypes Findings Migration (Incremental, Endoreg-Safe)

Last updated: 2026-06-03
Owner: reporting/frontend/backend

## Scope
Migrate findings read/write flows to a dtypes-driven API surface exposed by
`lx_dtypes` under `/base_api/**` without breaking existing `endoreg_db`
behavior mounted under `/api/**`.

In the current frontend, `dtypesApi()` defaults to `/dtypes-api/**` and
`endoregApi()` defaults to `/endoreg-api/**`; those prefixes are reverse-proxy
front doors for the underlying `/base_api/**` and `/api/**` services. Some
legacy frontend call sites still hard-code `/api/**`.

## Current-State Inventory

### Uses dtypes today
- Frontend `findingsApi` supports backend mode flag `VITE_FINDINGS_BACKEND`
  (`endoreg`, `dtypes_read`, `dtypes`).
- In `dtypes_read` and `dtypes` modes, frontend findings reads use
  `/dtypes-api/examinations/{examination_id}/findings/`,
  `/dtypes-api/findings/{finding_id}/classifications/`, and
  `/dtypes-api/classifications/{classification_id}/choices/`.
- Those `/dtypes-api/**` routes proxy to `lx_dtypes` `/base_api/**` endpoints.
- In `dtypes` mode, patient finding CRUD uses `/dtypes-api/patient-findings/**`
  and validates finding/examination compatibility plus classification/choice
  consistency before persistence.
- The frontend default is now `dtypes` when `VITE_FINDINGS_BACKEND` is unset or
  invalid, so read and patient-finding write traffic defaults to `/dtypes-api/**`.

### Uses endoreg_db today
- `/api/**` remains the backend endoreg_db route namespace.
- The current frontend helper default for endoreg routes is `/endoreg-api/**`;
  older stores/components still call `/api/**` directly.
- Explicit `VITE_FINDINGS_BACKEND=endoreg` remains available as a rollback mode.
- In explicit `endoreg` mode, findings reads use:
  `/api/examinations/{examination_id}/findings/` and
  `/api/findings/{finding_id}/classifications/`.
- `findingsApi.getClassificationChoices()` still exposes the endoreg
  `/api/classifications/{classification_id}/choices/` route, but no current
  frontend source call site invokes it outside the service definition.
- Patient finding persistence is still on endoreg_db tables (`PatientFinding`, `PatientFindingClassification`) for `/base_api/patient-findings/**`.
- Patient finding row CRUD uses `/api/patient-findings/**` only in explicit
  `VITE_FINDINGS_BACKEND=endoreg` or `VITE_FINDINGS_BACKEND=dtypes_read` modes.
  In `endoreg` mode, classification replacement still goes through
  `/dtypes-api/patient-findings/{id}/classifications/`.
- Patient, gender, center, and patient-examination workflows still use
  endoreg_db routes from `patient.py` and `examination.py`.
- Report save flows still submit to `/api/patient-examination-reports/save-submission/`.

## Route Usage Audit (2026-06-03)

Question checked: are routes from these backend URL modules still used by the
frontend?

- `/home/admin/endoreg-db/endoreg_db/urls/examination.py`
- `/home/admin/endoreg-db/endoreg_db/urls/classification.py`
- `/home/admin/endoreg-db/endoreg_db/urls/patient.py`

### `examination.py`

| Backend route | Frontend status | Notes |
| --- | --- | --- |
| `/api/examinations/{examination_id}/findings/` | Used only in explicit endoreg mode | `findingsApi.getExaminationFindings()` now defaults to `/dtypes-api/examinations/{id}/findings/`; this route remains the `VITE_FINDINGS_BACKEND=endoreg` rollback path. |
| `/api/findings/{finding_id}/classifications/` | Used only in explicit endoreg mode | `findingsApi.getFindingClassifications()` now defaults to `/dtypes-api/findings/{id}/classifications/`; this route remains the `VITE_FINDINGS_BACKEND=endoreg` rollback path. |
| `/api/classifications/{classification_id}/choices/` | Exposed, not actively called | Implemented by `findingsApi.getClassificationChoices()`, but no frontend source call site invokes it today. |
| `/api/examinations/{exam_id}/indications/` | Not found in current frontend source | Reporting currently derives indication options from patient-examination detail and examination detail payloads instead. |
| `/api/indications/{indication_id}/choices/` | Not found in current frontend source | No current source call site found. |
| `/api/patient-examinations/create/` | Used | Used by reporting case setup and case resolution flows when creating a patient examination context. |
| `/api/patient-examinations/{pk}/` | Used | Used by the reporting shell and report editor for patient-examination detail hydration. |
| `/api/patient-examinations/list/` | Used | Used by reporting shell, case resolution, anonymization validation, and `patientExaminationStore`. |
| `/api/patient-examinations/{exam_id}/classifications/` | Not actively called | Present in `endpoints.ts`, but no current frontend source call site invokes it. |
| `/api/patient-examinations/{examination_id}/findings/` | Not actively called | Present in `endpoints.ts`, but current findings reads use `examinations/{id}/findings/` through `findingsApi`. |
| `/api/examinations/{exam_id}/interventions/` | Not found in current frontend source | No current source call site found. |
| `/api/examinations/{exam_id}/findings/{finding_id}/interventions/` | Not found in current frontend source | `SimpleExaminationForm.vue` has stale legacy calls under `examination/...`, but that component is not routed and the paths do not match this backend route. |

### `classification.py`

`classification.py` currently contributes an empty `url_patterns` list; the NICE,
PARIS, batch, and status paths are commented out. No frontend source call sites
for `/api/classifications/nice/`, `/api/classifications/paris/`,
`/api/classifications/batch/`, or `/api/classifications/status/{video_id}/`
were found.

### `patient.py`

| Backend route family | Frontend status | Notes |
| --- | --- | --- |
| `/api/patients/`, `/api/patients/{id}/` | Used | Used by `patientService`, `patientStore`, `PatientDashboard`, patient create/edit/detail components, and case-resolution patient creation. |
| `/api/patients/{id}/pseudonym/` | Used | Router-generated `PatientViewSet` action used by `patientService.generatePatientPseudonym()` and patient detail UI. |
| `/api/patients/{id}/check_deletion_safety/` | Used | Router-generated `PatientViewSet` action used by patient edit/detail deletion checks. |
| `/api/centers/` | Used | Used by patient lookup loading in `patientService`, `patientStore`, and patient forms. |
| `/api/genders/` | Used | Used by patient lookup loading in `patientService`, `patientStore`, and patient forms. |
| `/api/patient-findings/`, `/api/patient-findings/{id}/` | Used only in explicit endoreg or dtypes-read modes | Default row CRUD now uses `/dtypes-api/patient-findings/**`; these routes remain available for `VITE_FINDINGS_BACKEND=endoreg` and `VITE_FINDINGS_BACKEND=dtypes_read`. |
| `/api/check_pe_exist/{pk}/` | Used | Called by `patientExaminationStore.doesPatientExaminationExist()`. |

### Legacy/Residual Notes

- `frontend/src/components/Examination/SimpleExaminationForm.vue` remains in
  source but is not registered in the current router. Its legacy
  `examination/...` endpoint strings do not match the active
  `examination.py` routes.
- `frontend/src/components/CaseGenerator/FindingGenerator*.vue` are legacy/demo
  components and are not reachable from the current router.
- `frontend/src/views/PatientAdder.vue` exists but is not currently routed.
- The current routed reporting flow is under `/reporting/**`; the legacy
  `/untersuchung` and `/report-generator` routes redirect to
  `/reporting/case-setup`.

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
- [x] Route findings reads in the current reporting flow and stores through
  `findingsApi`.
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
- [x] Flip default `VITE_FINDINGS_BACKEND` from `endoreg` to `dtypes` when the
  env var is unset or invalid.

## Compatibility Matrix

| Endpoint / Area | Read/Write Source | Persistence | Rollout Status |
| --- | --- | --- | --- |
| `/api/examinations/*/findings/` or `/endoreg-api/examinations/*/findings/` | endoreg_db | endoreg_db | Explicit `endoreg` fallback read path |
| `/api/findings/*/classifications/` or `/endoreg-api/findings/*/classifications/` | endoreg_db | endoreg_db | Explicit `endoreg` fallback read path |
| `/api/classifications/*/choices/` or `/endoreg-api/classifications/*/choices/` | endoreg_db | endoreg_db | Exposed by service, no active frontend caller found |
| `/api/patient-findings/**` or `/endoreg-api/patient-findings/**` | endoreg_db | endoreg_db | Explicit `endoreg`/`dtypes_read` fallback row CRUD path |
| `/base_api/examinations/*/findings/` via `/dtypes-api/examinations/*/findings/` | dtypes KB | n/a | Implemented; default active path |
| `/base_api/findings/*/classifications/` via `/dtypes-api/findings/*/classifications/` | dtypes KB + db mapping | n/a | Implemented; default active path |
| `/base_api/classifications/*/choices/` via `/dtypes-api/classifications/*/choices/` | dtypes KB + db mapping | n/a | Implemented; no active frontend caller found |
| `/base_api/patient-findings/**` via `/dtypes-api/patient-findings/**` | dtypes-validated API | endoreg_db tables | Implemented; default active CRUD path |
| Frontend findings integration | `findingsApi` mode switch | n/a | Implemented (default `dtypes`) |

## Decision Log

| Date | Decision | Rationale | Owner |
| --- | --- | --- | --- |
| 2026-03-09 | Keep `/api/**` as default while introducing `/base_api/**` in parallel. | Avoid production regressions during migration. | reporting/backend |
| 2026-03-09 | Use `VITE_FINDINGS_BACKEND` feature mode (`endoreg`, `dtypes_read`, `dtypes`). | Enables incremental rollout and targeted testing. | frontend |
| 2026-03-09 | Validate with dtypes but persist patient findings in existing endoreg tables for now. | Reduces schema/data migration risk while gaining validation parity. | backend |
| 2026-03-09 | Keep explicit create-then-classification flow for endoreg-safe mode. | Matches existing behavior and prevents nested-write ambiguity. | frontend/backend |
| 2026-03-09 | Pin pytest CI settings to a deterministic findings module (`report_template_examples`) when env var is unset. | Avoids environment-dependent `lx_knowledge_base` lookup failures in contract tests. | backend |
| 2026-06-03 | Document frontend route usage against `examination.py`, `classification.py`, and `patient.py`. | Clarifies which endoreg routes remain part of the active frontend contract during dtypes migration. | frontend/backend |
| 2026-06-03 | Default unset/invalid `VITE_FINDINGS_BACKEND` to `dtypes`. | Moves active findings read/write traffic to the dtypes API while preserving explicit `endoreg` rollback. | frontend |

## Progress Log

| Date | Reference | Status | Notes |
| --- | --- | --- | --- |
| 2026-03-09 | Working tree changes in `lx_dtypes/django/api/main.py` and `test_findings_api.py` | Completed | Added `/base_api` findings read/write endpoints + validation + tests. |
| 2026-03-09 | Working tree changes in `lx_dtypes/django_settings_ci_test.py`, `pyproject.toml`, and API error/deactivation handling | Completed | Fixed pytest execution path for backend contract tests; `pytest lx-data-models/lx_dtypes/django/api/tests/test_findings_api.py -q` passes locally from repo root. |
| 2026-03-09 | Working tree changes in `frontend/src/api/findingsApi.*` | Completed | Added unified service layer and backend mode switch. |
| 2026-03-09 | Working tree changes in findings components/stores/reporting views | Completed | Removed duplicate reload triggers and migrated key calls to `findingsApi`. |
| 2026-03-09 | Frontend validation (`vue-tsc`) + targeted vitest (`findingsApi`, requirement crash guard) | Completed | Type-check and targeted migration tests pass locally. |
| 2026-06-03 | Frontend route audit against endoreg URL modules | Completed | Confirmed active use of selected `examination.py` and `patient.py` routes; `classification.py` has no active routes. |
| 2026-06-03 | `frontend/src/api/findingsApi.ts` default backend mode | Completed | Missing or invalid `VITE_FINDINGS_BACKEND` now resolves to `dtypes`; focused routing tests updated. |

## Post-Cutover Follow-Up
Keep the `dtypes` default and consider retiring the explicit `endoreg` fallback
only when all are true:
- Contract tests pass for `/base_api` read/write findings endpoints.
- Frontend mode tests pass for `endoreg`, `dtypes_read`, and `dtypes`.
- End-to-end create/update/delete/classification flows pass in staging.
- No agreed regression during soak period.
