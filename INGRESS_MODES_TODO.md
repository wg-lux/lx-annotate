# Hub Transition Todo

This file tracks the remaining `lx-annotate` work to finish the watcher + API
dual-ingress model and harden the repo for hub-style deployment.

## Baseline

- [x] `watcher` and `api` are documented as first-class ingress modes in
  [README.md](/home/admin/dev/lx-annotate/README.md)
- [x] The dual-ingress contract is documented in
  [docs/guides/deployment-strategy.md](/home/admin/dev/lx-annotate/docs/guides/deployment-strategy.md)
- [x] Repo-local watcher defaults use `center_key`
- [x] Frontend upload helper supports `center_key`, `source_system`, and
  `Idempotency-Key`
- [x] Patient create/update flows are key-first in the core API
- [x] Core center APIs expose `center_key`

## Now

### 1. Tests for UploadJob Metadata and Scoped Upload Behavior

- [x] Add API tests for upload with valid `center_key`
- [x] Add API tests for upload with invalid `center_key`
- [x] Add API tests for upload outside authenticated center scope
- [x] Add API tests for upload status endpoint enforcing center scope
- [x] Add API tests for repeated upload with the same idempotency key reusing a
  single logical `UploadJob`

Acceptance criteria:

- authenticated upload with valid `center_key` succeeds
- invalid `center_key` returns a 4xx error
- cross-center upload attempts are rejected for scoped users
- upload status cannot be read outside the caller's allowed center scope
- duplicate API retries with the same idempotency key do not create duplicate
  logical records

### 2. Tests for Watcher/API Convergence

- [x] Add watcher tests that confirm watcher ingest creates `UploadJob` records
- [x] Add watcher/API comparison tests that confirm both boundaries converge on
  the same shared ingest expectations
- [x] Add patient API tests for `center_key` and reject legacy name writes

Acceptance criteria:

- watcher ingest still creates `UploadJob` records with watcher provenance
- watcher default-center behavior remains intact
- watcher and API ingest produce equivalent canonical managed-storage outcomes
- patient APIs use `center_key` for writes and keep center names as display data only

### 3. Hub-Mode Policy Switch

- [x] Add an explicit hub-mode setting/profile flag
- [x] Reject unauthenticated API uploads in hub mode
- [x] Require declared `center_key` on API ingest in hub mode
- [x] Reject API fallback-to-default-center behavior in hub mode
- [x] Keep watcher default-center fallback behavior in all current watcher
  deployments

Acceptance criteria:

- hub mode changes API ingest policy without breaking watcher ingestion
- non-hub mode preserves current compatibility behavior

## Next

### 4. Hub Ingest Operational Validation

- [x] Verify deduplication behavior for repeated watcher and hub uploads of the
  same media content across retries, renames, and re-drops
- [x] Decide and document the canonical deduplication rule:
  content-hash only, content-hash plus center, or explicit client idempotency
  plus content reconciliation
- [x] Add tests proving that the same video content is not imported multiple
  times when re-seen by watcher or hub ingest
- [x] Audit directory ownership and permissions for watcher intake/runtime
  directories against the LuxNix service contract in
  `/home/admin/luxnix/modules/nixos/services/lx-annotate-local/scripts.nix`
- [x] Document the minimum required directory permissions for watcher,
  application, and reverse proxy processes
- [x] Add core readiness checks for protected root, watcher intake directories,
  streamable roots, and same-filesystem atomic move assumptions
- [x] Add Django system checks for protected-media environment contract
- [ ] Review storage pressure points in watcher and hub ingest, especially
  transcoding temp files, duplicate upload artifacts, and cleanup cadence
- [x] Define regular cleanup/reconciliation operations for duplicate artifacts,
  completed delete-after-success watcher sources, and content-hash duplicate
  re-drops
- [ ] Extend cleanup/reconciliation operations to stale transcoding outputs and
  failed transcode graveyards

Acceptance criteria:

- repeated ingest of identical media does not create duplicate effective media
  records without an explicit reason
- watcher/runtime directory permissions are documented and verified against the
  real deployment scripts
- storage cleanup is not ad hoc; it has an explicit operational path and test
  coverage where feasible

Audit notes:

- LuxNix already provisions the main runtime roots with the expected service
  ownership and restrictive modes:
  - protected runtime root and storage roots at `0750`
  - import root at `0770`
  - streamable roots at `0750`
  - Nginx is added to the service group and `/protected_media/` aliases the
    protected storage root
- The service also exports the required runtime contract:
  `LX_ANNOTATE_ENCRYPTED_DATA_DIR`, `PROTECTED_MEDIA_ROOT`, `STORAGE_DIR`,
  `IO_DIR`, `NGINX_PROTECTED_MEDIA_URL`, and streamable video roots
- The remaining LuxNix gap is subdirectory provisioning under
  `${IO_DIR}/import/`: `video_import/`, `report_import/`,
  `preanonymized_import/`, `sap_import/`, `sap_import_processed/`, and
  `sap_import_failed/` are not all created by `tmpfiles` or the main boot
  pre-start path. Some are created lazily by SAP helper scripts instead
- Operationally, that means watcher readiness can still fail after a clean boot
  unless those subdirectories are provisioned explicitly

### 4. Documentation and Deployment Profile

- [x] Update
  [docs/guides/wheel-deployment.md](/home/admin/dev/lx-annotate/docs/guides/wheel-deployment.md)
  for dual-ingress and hub deployment expectations
- [x] Document hub-mode policy differences for API ingest versus watcher ingest
- [x] Document PostgreSQL as required for hub deployments
- [x] Document encrypted managed storage as required for hub deployments
- [x] Document durable shared or object-like media storage semantics for hub
  deployments
- [x] Audit remaining docs for outdated watcher-only wording

Acceptance criteria:

- operator docs clearly distinguish local trusted watcher ingest from remote
  authenticated hub/API ingest
- hub deployment docs are explicit about PostgreSQL and storage requirements

### 5. Devenv Runtime Validation

- [ ] Verify that the intended `devenv` shell exports the required
  `LD_LIBRARY_PATH`
- [ ] Fix test/runtime startup so NumPy and related native dependencies load in
  the project shell without ad hoc manual exports

Acceptance criteria:

- `pytest` can start inside the intended repo shell without `libstdc++.so.6`
  failures

## Later

### 6. AI Access Contract

- [ ] Define AI-facing read APIs as center-scoped service surfaces rather than
  path access
- [ ] Document approved media/report retrieval patterns for AI applications
- [ ] Audit center scoping across AI-facing and export-facing read flows

Acceptance criteria:

- AI consumers do not need direct `STORAGE_DIR` access
- read APIs enforce center scope consistently

### 7. Transfer Support Decision

- [x] Decide whether to expose `TransferJob` / network-node transfer routes in
  `lx-annotate`
- [x] Make transfer support opt-in and disabled by default in the upstream
  package
- [x] Document that upload-job hub ingest remains the primary hub boundary
  unless transfer support is explicitly enabled

Acceptance criteria:

- transfer support is intentionally gated and tested rather than accidentally
  exposed
- `/api/upload/` remains the primary hub boundary by default
- transfer endpoints require explicit enablement before they become reachable

### 8. Provenance and Cleanup Hardening

- [x] Confirm all ingest provenance is recorded through the shared hub service
  layer
- [x] Confirm no watcher-only post-acceptance branches bypass shared ingest
  tracking
- [x] Define cleanup and retention expectations for preserved API sources versus
  watcher sources

Acceptance criteria:

- provenance and cleanup behavior are consistent across both ingress modes
- `preserve_source` uploads do not become cleanup-eligible on successful
  completion
- watcher ingest remains `delete_after_success` and becomes cleanup-eligible
  after success
- transfer jobs record normalized provenance and cleanup intent at creation time

## Notes

- Current local test execution is blocked in this shell by a native library
  loading failure during NumPy startup. The repo already contains a
  `devenv`-level `LD_LIBRARY_PATH` strategy, so this should be fixed in the
  environment profile rather than by one-off shell exports.
- Outbound processed-media transfer to a hub is tracked separately in
  [HUB_EXPORT_TODO.md](/home/admin/dev/lx-annotate/HUB_EXPORT_TODO.md).
