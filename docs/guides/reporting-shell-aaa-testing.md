# ReportingShell AAA Testing Contract

## Scope

This guide owns the unit-test inventory for the first-party caller and callee
graph of `frontend/src/views/reporting/ReportingShell.vue`. The readiness state
and acceptance evidence remain in
`feature-tracking/ReportingShellAAATestCoverage.yml`.

A test in this matrix follows Arrange-Act-Assert (AAA):

1. Arrange typed inputs, isolated stores, deterministic clocks or promises, and
   the exact dependency behavior required by the case.
2. Act once through the public component, store, service, route, contract, or
   persistence boundary under test.
3. Assert returned or rendered output, state and durable mutations, exact
   collaborator arguments, and forbidden side effects for failure or stale
   contexts.

Large snapshots, line execution without behavioral assertions, and an
end-to-end happy path alone do not establish unit coverage. Async tests must
control completion order and must not use real network access. Each test owns a
fresh Pinia where applicable and resets mocks, fake timers, and pending
promises.

## Frontend Caller And Component Matrix

| Production boundary | Direction | Owning suites | Covered behavior |
| --- | --- | --- | --- |
| `frontend/src/main.ts` | caller | `stores/__tests__/reportingFlow.template.spec.ts` | Auth-subject binding and isolation exercised through the public store action invoked at bootstrap. |
| `frontend/src/router/index.ts` | caller | `router/__tests__/reportingFlow.test.ts` | Shell registration, direct and legacy routes, deep links, context-preserving navigation, guarded draft flush, and failure cancellation. |
| `ReportingShell.vue` | component | `views/reporting/__tests__/ReportingShell.mediaPreload.test.ts` | Context creation and restore, immutable resolution, templates, draft hydration, media preload, imports, lifecycle events, stale work, and guarded navigation. |
| `ReportingWorklistPage.vue` | nested caller | `ReportingWorklistPage.test.ts` | Worklist rendering and reporting entry. |
| `ReportTemplateBuilderPage.vue` | nested caller | `ReportTemplateBuilderPage.test.ts` | Exact-version builder loading, lifecycle mutations, delayed responses, and errors. |
| `CaseResolutionPage.vue` | nested caller | `CaseResolutionPage.test.ts` | Case resolution and reporting-flow handoff. |
| `CaseSetupPage.vue` | nested caller | `CaseSetupPage.test.ts` | Patient/examination setup, typed context, and invalid resolution. |
| `FindingsCapturePage.vue` | nested caller | `FindingsCapturePage.test.ts` | Catalog loading, findings mutation, draft persistence, and missing context. |
| `ReportEditorPage.vue` | nested caller | `ReportEditorPage.test.ts` | Template validation, editor state, report submission, identity guards, and persisted artifacts. |
| `FrameSelectorPage.vue` | nested caller | `FrameSelectorPage.test.ts` | Frame-selection context and persistence calls. |
| `ReportExportPage.vue` | nested caller | `ReportExportPage.test.ts` | Verified-draft gate, exact make-report payload, text export, and artifact links. |
| `FinalizedResultPage.vue` | nested caller | `FinalizedResultPage.test.ts` | Latest-final read, technical details, PDF links, and timeline filtering. |
| `ReportImportPanel.vue` | direct child | `components/Reporting/__tests__/ReportImportPanel.test.ts`, `ReportingShell.mediaPreload.test.ts` | Import request/result and shell completion handoff. |

## Frontend Store, Service, And Helper Matrix

| Production boundary | Direction | Owning suites | Covered behavior |
| --- | --- | --- | --- |
| `reportingFlowStore.ts` | callee/shared state | `reportingFlow.template.spec.ts`, `router/__tests__/reportingFlow.test.ts` | Subject isolation, template identity, dirty state, coalesced autosave, flush, conflict, failure, and final-save navigation. |
| `terminologyStore.ts` | callee | `terminologyStore.test.ts` | Exact bundle identity, revisions, stale load/select handling, import failures, and error state. |
| `patientStore.ts` | callee | `patientStore.reportingShell.test.ts` | Typed patient list, selector projection, malformed response, lookup, and Pinia isolation. |
| `examinationStore.ts` | callee | `examinationStore.test.ts` | Canonical dropdown normalization and fail-closed error state. |
| `patientExaminationStore.ts` | callee | `patientExaminationStore.reportingShell.test.ts` | Creation handoff, detail validation, selection, removal, and malformed response rejection. |
| `casesApi.ts` | callee | `api/__tests__/casesApi.test.ts` | Exact case requests, response validation, and malformed nested data. |
| `findingsApi.ts`, `findings.contract.ts` | callee | `findingsApi.test.ts`, `findings.contract.test.ts` | Catalog context, request identity, normalization, and invalid payloads. |
| `knowledgeBaseGraphApi.ts` | callee | `knowledgeBaseGraphApi.test.ts` | Exact-version reads, graph identity/hash/edge validation, and examination projection. |
| `reportDraftApi.ts` | callee | `reportDraftApi.test.ts` | GET/PUT paths, stable identity serialization, revision payload, normalization, and malformed responses. |
| `reportExportApi.ts` | callee | `reportExportApi.test.ts` | Exact make-report request/response and failure propagation. |
| `reportingLanguagesApi.ts` | callee | `reportingLanguagesApi.test.ts` | Supported languages, canonical labels, and unusable contracts. |
| `reportingTimelineApi.ts` | callee | `reportingTimelineApi.test.ts` | Latest history selection and stream preference. |
| `reportTemplatesApi.ts` | callee | `reportTemplatesApi.test.ts`, `reportTemplateKnowledgeBaseIdentity.test.ts` | Template normalization, runtime payload, exact identity, and fail-closed malformed responses. |
| `axiosInstance.ts`, `types/api/endpoints.ts` | transport callee | `apiPrefixContract.test.ts`, `axiosInstance.binary.test.ts`, service suites above | API ownership, prefix and casing conversion, binary behavior, exact endpoint paths, and HTTP methods. |
| `useAuthenticatedVideoStream.ts` | callee | `composables/__tests__/useAuthenticatedVideoStream.test.ts` | Credentialed HLS, artifact changes, native mode, cleanup, and fail-closed stream errors. |
| `reportingResolutionGraph.ts` | callee | `reportingResolutionGraph.test.ts`, `reportingResolutionGraph.aaa.test.ts` | Structure validation, immutable deterministic waves, barriers, rejection, supersession, and atomic commit. |
| `reportingKnowledgeBaseContext.ts`, `useReportingKnowledgeBase.ts` | callee | `reportingKnowledgeBaseContext.test.ts`, `useReportingKnowledgeBase.test.ts` | Identity casing/precedence, active/pinned matching, absent context, and mismatch rejection. |
| Reporting presentation, indication, examination, list, text, error, lifecycle, and coverage helpers | callee | Corresponding `views/reporting/__tests__/*.test.ts`, `utils/__tests__/reportConceptCoverage.test.ts` | Table-driven normalization, labels, errors, resolution, export, and negative boundaries. |

## Backend Graph And Persistence Matrix

| Production boundary | Repository | Owning suites | Covered behavior |
| --- | --- | --- | --- |
| `knowledge_base_graph_routes.py` | lx-data-models | `test_knowledge_base_graph_api.py`, `test_reporting_shell_graph_aaa.py` | Exact module/version loader calls, serialized graph/context, 404 unknown examination, and 409 incoherent graph. |
| `knowledge_base_graph.py` | lx-data-models | `test_knowledge_base_graph_api.py`, `test_reporting_shell_graph_aaa.py` | Deterministic hashes, closed projections, published-template filtering, identity and edge validation. |
| `KnowledgeBaseResolver` | lx-data-models | `test_knowledge_base_resolver.py` | Registry absence, exact versions, provider digests, unknown providers, and explicit sources. |
| `report_draft.py` | lx-data-models | `test_report_draft.py`, `test_reporting_shell_persistence_aaa.py` | Canonical JSON, strict nested types, identity aliases, revisions, non-finite values, and empty sentinel. |
| `patient_examination_report.py` contracts | lx-data-models | `test_patient_examination_report.py`, `test_reporting_shell_persistence_aaa.py` | Submission/make-report identities, versions, frame bounds, JSON safety, and persisted artifact payloads. |
| Patient-examination draft route, serializer, and model | endoreg-db | `test_patient_examination_draft_viewset.py` | GET/PUT round trip, 404, strict shape, unknown fields, optimistic conflict, legacy revision, direct model validation, and final-draft clearing. |
| PatientExaminationReport API routes | endoreg-db | `test_patient_examination_report_ninja_api.py`, `test_reporting_shell_finalization_aaa.py` | List scope, save validation/status mapping, make-report identity, frames, empty selections, artifacts, and finalization rollback. |
| `report_persistence.py` | endoreg-db | `test_report_persistence_service.py`, draft and API suites | Draft/final create/update, template validation, draft retention/clearing, artifact IDs, and transaction rollback. |
| Runtime validation, finding sync, patient context, and history services | endoreg-db | `test_report_runtime_validation.py`, `test_report_finding_sync.py`, `test_report_patient_context.py`, `test_report_history.py` | Typed validation snapshots, clinical ledger mutations, patient snapshots, history limits, negative relationships, and rollback. |
| PatientExaminationReport model and persisted JSON schemas | endoreg-db | `test_patient_examination_report_validation.py` | Canonical JSON/language provenance, lifecycle values, versions, and complete knowledge-base identity. |
| PDF and full-report artifacts | endoreg-db | `test_report_persistence_service.py`, `test_patient_examination_report_ninja_api.py`, `test_reporting_shell_finalization_aaa.py` | Strict renderer success/failure, durable IDs and links, rollback, zero-frame output, and no false final status. |

## Explicit Exclusions

- Vue, Vue Router, Pinia, Axios, Django, Django REST Framework, Django Ninja,
  Pydantic, and database-driver internals are third-party framework boundaries.
- Generated OpenAPI TypeScript declarations are checked for freshness by
  `npm run type-check`; their generators and consuming services are tested, so
  generated declarations do not receive handwritten unit suites.
- Type-only modules have no runtime behavior. They are verified by the strict
  TypeScript and Pyright lanes and by the runtime boundary that constructs the
  type.
- Shared infrastructure consumers unrelated to reporting are outside this
  graph. The shared helper itself remains in scope when ReportingShell invokes
  it, as shown in the matrix above.

## Verification Commands

Run from `/home/admin/dev/lx-annotate/frontend`:

```bash
npm run test:unit -- --run src/router/__tests__/reportingFlow.test.ts \
  src/api/__tests__ src/stores/__tests__ src/views/reporting/__tests__ \
  src/components/Reporting/__tests__ \
  src/composables/__tests__/useAuthenticatedVideoStream.test.ts
npm run type-check
npm run type-check:component-tests
```

Run from `/home/admin/lx-data-models`:

```bash
uv run pyright
uv run pytest \
  tests/unit/lx_dtypes/django/api/test_knowledge_base_graph_api.py \
  tests/unit/lx_dtypes/django/api/test_reporting_shell_graph_aaa.py \
  tests/unit/lx_dtypes/models/contracts/test_report_draft.py \
  tests/unit/lx_dtypes/models/contracts/test_patient_examination_report.py \
  tests/unit/lx_dtypes/models/contracts/test_reporting_shell_persistence_aaa.py \
  tests/unit/lx_dtypes/models/interface/test_knowledge_base_resolver.py -q
```

Run from `/home/admin/endoreg-db` after confirming no unrelated pytest process
is active:

```bash
.devenv/state/venv/bin/pyright
devenv shell -- .devenv/state/venv/bin/pytest \
  tests/views/report/test_reporting_shell_finalization_aaa.py \
  tests/views/report/test_patient_examination_report_ninja_api.py \
  tests/views/patient_examination/test_patient_examination_draft_viewset.py \
  tests/services/test_report_persistence_service.py \
  tests/services/test_report_runtime_validation.py \
  tests/services/test_report_history.py \
  tests/services/test_report_finding_sync.py \
  tests/services/test_report_patient_context.py \
  tests/models/test_patient_examination_report_validation.py -q
```
