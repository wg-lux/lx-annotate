# Hub Export Todo

This file tracks the work needed for `lx-annotate` to send processed data to a
hub after anonymization has finished and the resource has been explicitly marked
for upload. All changes should be conservative of present features and idempotent and type safe.

Scope:

- sender-side orchestration in `lx-annotate`
- reuse of the upstream `endoreg_db` hub transfer contract
- operator-facing export workflow for anonymized videos and reports

Out of scope for this file:

- watcher/API ingest hardening already tracked in
  [INGRESS_MODES_TODO.md](/home/admin/dev/lx-annotate/INGRESS_MODES_TODO.md)
- hub receive-side transfer validation already implemented in `endoreg_db`

## Decisions

- `center_key` remains the canonical machine-facing center identifier
- transfer is allowed only for anonymized resources
- sender uploads only anonymized processed media, never raw media
- outbound transfer must be restart-safe and idempotent
- the UI entrypoint will be a new export workflow page derived from the
  anonymization overview, not from the legacy segment export screen in
  [ExportAnnotations.vue](/home/admin/dev/lx-annotate/frontend/src/components/VideoExamination/ExportAnnotations.vue)

## Now

### 1. Define the Sender-Side Workflow Contract

- [x] Define what “marked for upload” means in domain terms
- [x] Decide whether marking is per resource only or supports bulk marking
- [x] Define the sender state machine:
  `not_marked -> marked -> queued -> registering -> awaiting_media -> uploading -> completed | failed`
- [x] Define deterministic `transfer_key` construction for videos and reports
- [x] Define which anonymization states are export-eligible locally
- [x] Define when a completed transfer may be retried and when it must be reused

Acceptance criteria:

- one written contract exists for sender-side eligibility and retries
- the contract is consistent with upstream `TransferJob`
- no raw media is eligible for outbound hub transfer

Decision record:

- sender contract documented in
  [docs/guides/hub-export-workflow.md](/home/admin/dev/lx-annotate/docs/guides/hub-export-workflow.md)
- marking is per resource; bulk actions remain a UI convenience over repeated
  per-resource marks
- sender transfer mode is `metadata_and_processed_media`
- eligible anonymization states are `ANONYMIZED`,
  `DONE_PROCESSING_ANONYMIZATION`, and `VALIDATED`
- retries must reuse a deterministic
  `"{source_node_key}__{resource_kind}__{resource_hash}__processed_v1"`
  transfer key
 
### 2. Add a Local Outbound Transfer Ledger

- [x] Add a local model for sender-side outbound transfer tracking
- [x] Store resource kind, local object id, source center key, target node key,
  transfer key, local state, last error, retry counters, and timestamps
- [x] Enforce uniqueness so the same resource and transfer intent do not create
  duplicate outbound work
- [x] Add migrations and admin/debug visibility

Acceptance criteria:

- restart-safe local transfer state exists independent of remote hub state
- the same resource cannot be queued repeatedly without explicit intent

Implementation notes:

- local model added in
  [lx_annotate/models.py](/home/admin/dev/lx-annotate/lx_annotate/models.py)
- initial migration added in
  [0001_outboundhubtransferjob.py](/home/admin/dev/lx-annotate/lx_annotate/migrations/0001_outboundhubtransferjob.py)
- admin visibility added in
  [admin.py](/home/admin/dev/lx-annotate/lx_annotate/admin.py)
- the ledger tracks actual transfer intent; `not_marked` is represented by the
  absence of a ledger row

### 3. Build Sender Payload Constructors

- [x] Add a video transfer payload builder
- [x] Add a report transfer payload builder
- [x] Serialize canonical `resource_rows` for the upstream transfer contract
- [x] Include `processing_snapshot` and stable content hashes
- [x] Validate sender payloads before any HTTP request is made

Acceptance criteria:

- payloads match the schema expected by
  [transfer_job.py](/home/admin/endoreg-db/endoreg_db/serializers/hub/transfer_job.py)
- sender payload generation fails locally and clearly on inconsistent state

Implementation notes:

- sender payload builders added in
  [hub_export_payloads.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_payloads.py)
- local validation uses the upstream
  `TransferJobCreateSerializer` before any network call is attempted

### 4. Add an Outbound Transfer Worker

- [x] Add a task/service that registers a transfer with the hub
- [x] Upload processed media when the hub responds with `awaiting_media`
- [x] Persist sender-side status transitions to the local transfer ledger
- [x] Reuse the same transfer key across retries
- [x] Handle network failure, 409 reuse, and partial upload failure safely

Acceptance criteria:

- retries are idempotent
- duplicate outbound jobs are not created on restart
- failed jobs preserve enough state for operator diagnosis

Implementation notes:

- sender worker added in
  [hub_export_worker.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_worker.py)
- optional Celery entrypoint added in
  [tasks.py](/home/admin/dev/lx-annotate/lx_annotate/tasks.py)
- sender auth currently requires an explicit secret or
  `LX_ANNOTATE_HUB_SOURCE_NODE_SECRET[_<NODE_KEY>]` environment variable,
  because the database stores only the hashed inbound verification secret
- 409 reuse now resolves through the hub status endpoint instead of creating a
  second logical transfer
- network registration failures now mark the sender job as `failed` and bump
  `retry_count`

## Next

### 5. Build the New Export UI From the Anonymization Overview

- [x] Create a new export page/view based on
  [AnonymizationOverview.vue](/home/admin/dev/lx-annotate/frontend/src/views/AnonymizationOverview.vue)
- [x] Derive the main table and filters from
  [AnonymizationOverviewComponent.vue](/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationOverviewComponent.vue)
- [x] Show only resources eligible for outbound transfer by default
- [x] Add explicit “mark for hub upload” and “unmark” actions
- [x] Add bulk actions for eligible selections
- [x] Show transfer readiness columns:
  anonymization state, processed media present, target hub, mark state,
  outbound transfer state, last transfer timestamp, last error
- [x] Keep the legacy annotation-segment export workflow separate
- [x] Add a dedicated route and sidebar entry for the hub export workflow

Acceptance criteria:

- the new export UI is recognizably derived from the anonymization overview
- operators can mark/unmark eligible resources without leaving the overview flow
- the legacy `/export` segment export screen is not conflated with hub transfer

Implementation notes:

- export UI added in
  [HubExportOverviewComponent.vue](/home/admin/dev/lx-annotate/frontend/src/components/Export/HubExportOverviewComponent.vue)
- route added in
  [router/index.ts](/home/admin/dev/lx-annotate/frontend/src/router/index.ts)
- sidebar entry added in
  [SidebarComponent.vue](/home/admin/dev/lx-annotate/frontend/src/components/Menus/SidebarComponent.vue)
- app-local API and store support added in
  [hub_export.py](/home/admin/dev/lx-annotate/lx_annotate/views/hub_export.py),
  [hub_export_jobs.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_jobs.py),
  and
  [hubExportStore.ts](/home/admin/dev/lx-annotate/frontend/src/stores/hubExportStore.ts)

### 6. Add Configuration and Node Selection UX

- [x] Surface local site node and central hub node configuration in the UI
- [x] Require exactly one active hub target in normal sender mode
- [x] Show source center key and selected hub node on the export page
- [x] Block transfer actions when node configuration is incomplete

Acceptance criteria:

- operators can see where data will be sent before queueing transfers
- missing hub configuration blocks transfer cleanly

### 7. Add Post-Processing Queue Hooks

- [x] When anonymization reaches an eligible state, allow the resource to appear
  in the new export workflow immediately
- [x] If auto-queue is later supported, keep it behind an explicit setting
- [x] Ensure watcher and manual processing converge on the same post-processing
  eligibility logic

Acceptance criteria:

- eligible resources appear consistently regardless of how they were ingested
- there is a single code path for transfer eligibility

Implementation notes:

- shared eligibility and post-processing sync added in
  [hub_export_state.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_state.py)
- Django signals added in
  [signals.py](/home/admin/dev/lx-annotate/lx_annotate/signals.py)
- auto-queue remains explicit and disabled by default through
  `LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE`
- this hook path is compatible with upstream ingest because both watcher/API
  ingest and manual workflows ultimately persist `VideoState` and `RawPdfState`

## Later

### 8. Audit, Observability, and Reconciliation

- [x] Add structured sender audit events for mark, queue, register, upload,
  retry, success, and failure
- [x] Add a reconciliation task that compares local outbound state with hub
  transfer status
- [x] Add stale-job recovery for interrupted uploads

Acceptance criteria:

- operators can trace who marked a resource and what happened afterward
- interrupted transfers can be resumed or clearly flagged

Implementation notes:

- structured sender audit events added in
  [hub_export_audit.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_audit.py)
- worker transitions now emit structured audit events in
  [hub_export_worker.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_worker.py)
- local reconciliation and stale recovery added in
  [hub_export_reconciliation.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_reconciliation.py)
- Celery reconciliation entrypoints added in
  [tasks.py](/home/admin/dev/lx-annotate/lx_annotate/tasks.py)

### 9. Cleanup Policy After Successful Export

- [x] Define whether local processed artifacts are always retained or may become
  cleanup-eligible after verified hub apply
- [x] Keep cleanup policy separate from hub receive-side cleanup semantics
- [x] Document the operational default

Acceptance criteria:

- local cleanup after export is explicit, not accidental

Implementation notes:

- local sender cleanup policy is now tracked on
  [OutboundHubTransferJob](/home/admin/dev/lx-annotate/lx_annotate/models.py)
  via `local_cleanup_policy`, `local_cleanup_status`, and
  `local_cleanup_eligible_at`
- cleanup policy application is isolated in
  [hub_export_cleanup.py](/home/admin/dev/lx-annotate/lx_annotate/hub_export_cleanup.py)
  and runs only after verified hub apply
- the operational default is conservative:
  `retain_processed_media`
- optional sender-side cleanup eligibility is available through
  `LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY=eligible_after_verified_apply`

### 10. Tests

- [x] Add model tests for the local outbound transfer ledger
- [x] Add service tests for payload builders
- [x] Add worker tests for idempotent retry and 409 reuse
- [x] Add backend API tests for overview, mark, and unmark
- [x] Add post-processing hook tests for eligibility transitions and auto-queue
- [x] Add UI/store tests for marking and bulk queueing
- [x] Add an end-to-end test for:
  marked anonymized video -> registered transfer -> processed media upload ->
  completed sender-side status
- [x] Add the same end-to-end path for reports

Acceptance criteria:

- sender-side export can be validated without manual clicking
- retry and restart behavior is covered by tests

Current coverage:

- model tests in
  [test_hub_export_ledger.py](/home/admin/dev/lx-annotate/tests/test_hub_export_ledger.py)
- payload builder tests in
  [test_hub_export_payloads.py](/home/admin/dev/lx-annotate/tests/test_hub_export_payloads.py)
- worker baseline tests in
  [test_hub_export_worker.py](/home/admin/dev/lx-annotate/tests/test_hub_export_worker.py)
- hook tests in
  [test_hub_export_hooks.py](/home/admin/dev/lx-annotate/tests/test_hub_export_hooks.py)
- reconciliation tests in
  [test_hub_export_reconciliation.py](/home/admin/dev/lx-annotate/tests/test_hub_export_reconciliation.py)
- sender end-to-end tests in
  [test_hub_export_end_to_end.py](/home/admin/dev/lx-annotate/tests/test_hub_export_end_to_end.py)
- cleanup policy tests in
  [test_hub_export_cleanup_policy.py](/home/admin/dev/lx-annotate/tests/test_hub_export_cleanup_policy.py)
- frontend store tests in
  [hubExportStore.spec.ts](/home/admin/dev/lx-annotate/frontend/src/stores/__tests__/hubExportStore.spec.ts)
- frontend component tests in
  [HubExportOverviewComponent.test.ts](/home/admin/dev/lx-annotate/frontend/src/components/Export/__tests__/HubExportOverviewComponent.test.ts)

## Initial File Targets

- [ ] [frontend/src/views/Export.vue](/home/admin/dev/lx-annotate/frontend/src/views/Export.vue)
- [ ] [frontend/src/components/Anonymizer/AnonymizationOverviewComponent.vue](/home/admin/dev/lx-annotate/frontend/src/components/Anonymizer/AnonymizationOverviewComponent.vue)
- [ ] [frontend/src/router/index.ts](/home/admin/dev/lx-annotate/frontend/src/router/index.ts)
- [ ] [frontend/src/components/Menus/SidebarComponent.vue](/home/admin/dev/lx-annotate/frontend/src/components/Menus/SidebarComponent.vue)
- [ ] `frontend/src/stores/*` for export queue state
- [ ] `lx_annotate/*` for sender-side orchestration glue if kept app-local
- [ ] `/home/admin/endoreg-db/endoreg_db/services/hub/transfers.py` only if the
  upstream sender helper surface needs extension

## Notes

- The current `/export` page is annotation-oriented and tied to segment export.
  It should not be overloaded with hub-transfer behavior without a clear split.
- The safest first UI is a new export workflow page that reuses the
  anonymization overview table shape and filtering model.
- For high-stakes production, explicit operator marking is safer than implicit
  auto-export.
