# Hub storage load balancing and production-test runbook

## Safety status

This subsystem is disabled unless `ENDOREG_ENABLE_STORAGE_BALANCING=1` and the
versioned node contract, endoreg-db storage contracts, fresh authenticated
telemetry, transfer worker, and storage-node data plane all agree. A missing or
stale dependency closes placement admission. Local persistent storage remains
the source of truth until the migration procedure below has completed and its
rollback window has closed.

Do not begin a production test while the gc-06 mutual-TLS deployment workflow or
the gs-02 central-hub identity is being changed. The test starts only after the
certificate owner has supplied the completed external gate evidence listed
below; automated preparation must not inspect or mutate either host.

The declared first topology is gs-02 as central hub and gs-01 as the sole,
non-redundant storage node (`172.16.255.22` → `172.16.255.21` over `tun0`). The
gs-01 service is deliberately guarded by `/dev/mapper/gs-01-storage` backing
`/archive`; the existing plain archive layout does not satisfy that contract.
Consequently a gs-01 switch must not be attempted until the archive has been
inventoried, backed up, migrated to the approved encrypted mapping, restored,
and hash-verified. The gs-02 node contract is declared, but scheduled balancing
stays disabled until the certificate, disk, package, and acceptance gates pass.

## Ownership and data boundary

The central hub is the only control plane. endoreg-db owns immutable node,
capability, reservation, placement, transfer-evidence, rotation, and cleanup
records. LX-Annotate owns placement admission, envelope production, transfer,
stream resolution, scheduling, and operator authorization. LuxNix owns mounts,
encrypted backing devices, private networking, mTLS material, recipient keys,
services, and firewall rules. A storage node stores content-addressed opaque
ciphertext and cannot choose placement or mutate application metadata.

Only processed artifacts (`anonymized_video`, `processed_report`, `video_hls`,
`streamable_video`, `sidecar`, and `manifest`) may cross this boundary. Raw media
is prohibited. Each transfer uses a fresh AES-256-GCM data key wrapped to the
selected node's X25519 recipient public key with the
`x25519-hkdf-sha256-aes256gcm-v1` profile. No application master key or reusable
plaintext is sent to a node. Plaintext staging is hub-local, mode 0700, removed
after commit, and never a fallback placement.

Residency and artifact capability are mandatory filters. Failure domain and
placement weight influence deterministic selection; the immutable node key is
the final tie-breaker. One configured node is operational but explicitly
non-redundant, not highly available or load balanced.

## Lifecycle invariants

Admission atomically reserves capacity before transfer. Reservation expiry,
release, and consumption reconcile accounting and the associated target
placement. Rotation proceeds REQUESTED → COPYING → COPIED → VERIFIED → COMMITTED.
Only verified transfer evidence can publish a new canonical primary. Source
cleanup is separate and requires committed publication, exact transfer evidence,
authoritative absence of active media leases for streamable media, replica and
reconciliation observations, and a verified node deletion receipt. Restart
reconciliation re-dispatches every persisted non-terminal rotation with the same
idempotency keys.

Before copying starts, an operator may cancel one persisted balance work item.
Cancellation is accepted only while the rotation is `REQUESTED`, the reservation
is `ACTIVE`, and the target placement is `RESERVED`. One immutable cancellation
receipt atomically fails the rotation, releases the reservation, fails the target,
and reconciles node counters. Changed replay evidence is rejected. Once copying
has started, cancellation is refused; normal recovery must finish the lifecycle.

Pause, resume, manual reconciliation, manual rebalance, and failed-work retry are
persisted as immutable, attributable operator-control receipts before queue
submission. LX-Annotate creates a local pending dispatch receipt in the same
database transaction. A bounded periodic outbox dispatcher recovers broker
submission failures. Retry never reopens a failed rotation or reuses its released
reservation; its receipt changes the deterministic planning fingerprint so a new
placement, reservation, rotation, and work item are required.

Recipient-key rotation first deploys both current and retiring private keys to
the storage node, then publishes the new public key to the hub contract. The
rekey worker creates and verifies a new envelope before retiring the old
evidence. The old ciphertext remains until lease-aware cleanup records deletion.
Remove the retiring private key only after no non-deleted evidence references its
recipient key ID.

## Pre-production gates

Record exact revisions and command output for all of these before requesting a
production window:

1. Build the new endoreg-db wheel and prove migrations 0060 through 0071 apply to
   a restored production-like database and reverse/restore without drift.
2. Build the LX-Annotate wheel against that exact endoreg-db release; install both
   in a clean environment and run the cross-contract, backend, frontend, and
   migration suites without compatibility skips.
3. Evaluate and build the LuxNix storage-node data-plane derivation and the
   central-hub configuration with the exact wheel versions. Do not activate a
   host.
4. Run a local two-node integration with independently generated disposable
   certificates and recipient keys: ingest, hub fetch/stream, drain, rotation,
   worker restart at every transition, lease-deferred cleanup, rekey, corruption,
   lost acknowledgement, full disk, stale telemetry, and recovery.
5. Run PostgreSQL concurrency tests for simultaneous admission, balancing,
   cleanup, stream leases, drain, and retries. Confirm one canonical primary,
   bounded accounting, and no early deletion.
6. Confirm monitoring covers unreachable/stale nodes, warning/stop/recovery
   capacity, stuck rotation, repeated retry, integrity mismatch, reservation
   leak, cleanup failure, and loss of the only verified copy.
7. Have application, database, security, storage, and deployment owners approve
   the archived evidence and rollback plan.

The external certificate gate is complete only when the operations owner confirms
that gs-02 presents the intended central-hub SAN, each storage node trusts the
issuing CA, the hub client key is readable only by the service identity, old and
new certificates overlap for the planned rotation window, revocation/expiry
behavior is known, and private routing/firewall policy has been independently
verified.

## Archived local readiness evidence (2026-08-11)

This section records historical candidate evidence; it does not describe the
current package versions and must not be used as release or production
approval. The previously recorded local candidate was typed and
regression-tested, but it was not approved for a production test. Candidate
`endoreg-db 1.0.10.0` and `lx-annotate 0.9.62`
wheels migrated a fresh disposable PostgreSQL 17 database through the expected
leaves (`endoreg_db 0047`, `lx_annotate 0004`, and `lx_dtypes_django 0004`), and
`makemigrations --check --dry-run` reported no drift. A separate real PostgreSQL
admission race admitted exactly one of two competing reservations without
over-accounting.

The live cross-repository test uses disposable certificates and exact public
types. Its isolated child imports `StorageTransferArtifactKind`,
`StorageTransferClient`, `StorageTransferClientContract`, `StorageTransferPeer`,
and `prepare_storage_envelope` only from the installed candidate wheel. It also
asserts that LX-Annotate and its imported dependencies resolve inside the supplied
no-system-site-packages environment. Lux's Python test modules do not import the
undeclared LX package. It negotiated TLS 1.3 with
client-certificate and URI-SAN authorization, created a fresh
X25519/AES-256-GCM envelope in the wheel client, stored opaque ciphertext in the
Lux data plane, verified and decrypted it, and completed idempotent deletion.
Focused results were Lux/Nix 47 passed, LX 68
passed, endoreg storage 49 passed/1 PostgreSQL-only skip (with that skipped race
passing separately on PostgreSQL), combined Pyright 0 errors, Lux MyPy clean,
and storage-scoped Ruff clean.

The later reconciliation, operator-control/outbox, and deterministic fresh-retry
code extends that candidate through endoreg-db migration 0071 and LX-Annotate
migration 0005/override 0050. Per owner instruction, those latest changes have
not been executed or re-certified here; the evidence owner must run the commands
below against the final wheels before this document can support a production-test
request.

The later publication delta adds LX-Annotate migration 0006.
An immutable publication row is keyed by the database resource and its approved
processed SHA-256 generation. Signals only persist that row; workers receive its
UUID, reload the resource, require the current video `ready_for_export` proof or
human-validated completed-report proof, verify the managed filename and digest,
and only then call the envelope-producing wheel client. A bounded dispatcher
backfills approvals that predate the migration and recovers broker loss. Raw
media and arbitrary filesystem task arguments are excluded, and successful
publication does not delete the local copy.

Endoreg-db owns the corresponding
`hub-storage-artifact-resolution-v1` selector. It accepts only the current
approved processed generation and returns one committed primary placement with
one exact verified transfer record. LX implements dependency-inverted remote
providers for internal video-master materialization and processed-PDF streaming.
PDF access retains the existing object permission, range/416, disposition, and
CORS behavior; raw PDF access remains local. Ready HLS playlist/key/segment
serving is deliberately unchanged because it is a separate generation-bound
multi-object lifecycle. No command evidence has been collected for this latest
delta at the owner's request.

The blockers recorded with that candidate were external and release-bound:

- publish and lock the approved endoreg-db artifact, then build the official LX
  and LuxNix release artifacts from the archived revisions;
- migrate `/archive` on gs-01 from its current plaintext Btrfs layout to the
  approved encrypted `/dev/mapper/gs-01-storage` mapping, restore it, and verify
  its inventory and hashes;
- complete and independently approve the gc-06/gs-02 mTLS identity, overlap,
  private-route, firewall, and credential-readability workflow;
- migrate a restored production-like database and complete the remaining
  multi-node fault, monitoring/alert, rollback, and operator-approval gates.

The deployed wire remains the additive `lx-hub-storage-v1` contract. Do not add
a breaking envelope or endpoint version as part of gs-01 activation. The hub
validates the exact response contract header, node identity, recipient-key ID,
capacity agreement, object digest, and receipts. The bounded inventory endpoint
is an additive v1 extension using the same mTLS operation authorization and an
opaque cursor; it does not change existing response fields or activation checks.
Its final wheel-to-node and database-only/unreachable reconciliation evidence is
still an owner-run production-test gate.

Until those gates are recorded, gs-02 keeps
`ENDOREG_ENABLE_STORAGE_BALANCING=0`; gs-01's mount/device preflight also fails
closed. Neither host has been activated by this preparation.

## Production test sequence (manual approval required)

1. Take database and configuration backups; record hashes, versions, certificate
   fingerprints, recipient key IDs, and current local-storage inventory.
2. Deploy schema and packages with balancing disabled. Run migration and runtime
   preflight, then confirm ordinary application reads are unchanged.
3. Deploy one storage node with writes disabled. Verify mount/device identity,
   encrypted-at-rest state, private route, health/capacity, mTLS allowlists, and
   operation-scoped authorization. Wrong identities and operations must fail.
4. Enable writes for one disposable processed artifact. Verify plaintext and
   ciphertext hashes, envelope recipient, committed placement, hub-only stream,
   audit records, accounting, and replay behavior.
5. Add the second node and repeat with deterministic placement. Exercise drain,
   interrupted rotation, restart recovery, active-lease cleanup deferral, and
   final source deletion.
6. Exercise recipient and certificate overlap rotation independently. Do not
   remove retiring keys or trust anchors while any evidence or live connection
   requires them.
7. Run the bounded soak and alert drill. Only then approve a staged migration of
   existing processed artifacts. Raw media remains excluded.

## Rollback and incident response

Disable placement admission and beat scheduling first; do not delete remote
objects. Keep the hub stream resolver able to read already committed placements.
Drain new work, preserve database and node receipts, and restore the prior LX
wheel/config if application behavior is affected. A pre-commit transfer can be
released and quarantined; a post-commit transfer must retain both verified copies
until leases and reconciliation prove the selected rollback primary. Never infer
canonical state from filesystem presence alone.

On integrity mismatch, unreachable only-copy placement, accounting skew, unknown
recipient key, topology-contract mismatch, or mTLS identity ambiguity: close
admission, preserve evidence, alert operators, and require explicit audited repair.
Do not automatically fall back to hub-local storage or rewrite artifact identity.

## Commands for the evidence owner

Run these only after building the final candidate wheels. They do not activate a
host or touch the certificate workflow:

```bash
cd /home/admin/endoreg-db
.devenv/state/venv/bin/pyright \
  endoreg_db/services/hub/storage_balancing.py \
  endoreg_db/services/hub/storage_operator_control.py \
  endoreg_db/services/hub/storage_reconciliation.py \
  endoreg_db/services/hub/storage_artifact_resolution.py \
  endoreg_db/services/hub/remote_processed_media.py \
  endoreg_db/services/hub/remote_processed_report.py \
  endoreg_db/views/report/report_stream.py
.devenv/state/venv/bin/pytest -q \
  tests/services/test_hub_storage_balancing.py \
  tests/services/test_hub_storage_operator_control.py \
  tests/services/test_hub_storage_reconciliation.py

cd /home/admin/dev/lx-annotate
PYTHONPATH=/home/admin/endoreg-db .venv/bin/pytest -q \
  tests/hub/test_tasks.py \
  tests/hub/test_storage_transfer_client.py \
  tests/hub/test_storage_balance_worker.py \
  tests/hub/test_storage_recovery.py \
  tests/hub/test_storage_reconciliation.py \
  tests/hub/test_storage_telemetry.py \
  tests/api/test_storage_orchestration_api.py \
  tests/hub/test_hub_export_hooks.py \
  tests/api/test_api_integration.py \
  tests/system/test_submodule_migration_coverage.py
cd frontend
npm run type-check
npm run test:unit -- AdministrationPage.test.ts

cd /home/admin/luxnix
.venv/bin/pytest -q \
  tests/test_package_import_boundaries.py \
  tests/storage_manager/test_storage_manager.py \
  tests/storage_manager/test_storage_data_plane.py \
  tests/hub-storage-node/test_hub_storage_node_deployment_contract.py
.venv/bin/python tests/hub-storage-node/verify_lx_annotate_wheel_contract.py \
  --python /path/to/isolated-venv/bin/python \
  --wheel-site-packages /path/to/isolated-venv/lib/python3.12/site-packages
```

Archive wheel hashes, the harness package-origin JSON, PostgreSQL migration leaves,
and tracker output with the production-test approval record.
