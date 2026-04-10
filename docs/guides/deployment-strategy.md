# Deployment Strategy

This page documents the intended deployment model for `lx-annotate` and how the
different deployment assets in this repository fit together.

## Overview

`lx-annotate` now separates build-time concerns from runtime concerns.

- CI builds the frontend with Node.js.
- CI packages the Django app and built frontend assets into a Python wheel via
  `hatchling`.
- Production installs that wheel into a Python virtual environment.
- Production provides system binaries such as FFmpeg and Tesseract outside the
  wheel.

This means production no longer needs the full repository checkout, Node.js, or
the full `devenv` shell just to run the application.

## Preferred Production Path

The preferred production path is wheel-based deployment.

Build artifact:

- `dist/*.whl`

Runtime layout:

- application state root: `/var/lib/lx-annotate`
- wheel app root: service user home
- data directory: `/var/lib/lx-annotate/data`
- staticfiles directory: `/var/lib/lx-annotate/staticfiles`
- runtime environment file: `/var/lib/lx-annotate/.env.systemd`
- virtual environment: `/var/lib/lx-annotate/.venv` for the standalone deploy
  scripts, or under the service user home in LuxNix wheel mode

Runtime services:

- ASGI app via Daphne
- optional file watcher as a separate `systemd` unit
- optional SAP IS-H import path and conversion units in LuxNix deployments
- one-shot data recovery/migration unit during legacy-to-runtime data moves
- Nginx serving static and media paths directly

## Build Strategy

The GitHub Actions workflow in
[ci-cd.yml](/home/admin/dev/lx-annotate/.github/workflows/ci-cd.yml) performs
three deployment-related jobs:

1. Run backend and frontend tests.
2. Build the Vue frontend into `staticfiles/`.
3. Build a Python distribution with `python -m build`.

The wheel includes:

- Django application code
- Django templates
- built frontend staticfiles
- Vite manifest output required by Django at runtime

## Runtime Strategy

The wheel is only a Python artifact. It does not bundle host binaries such as:

- `ffmpeg`
- `tesseract-ocr`
- shared libraries required by video/OCR/image dependencies

Those are provisioned on the host by
[bootstrap-host.sh](/home/admin/dev/lx-annotate/deploy/bootstrap-host.sh).

The runtime deployment flow is:

1. Provision host packages.
2. Copy the wheel artifact to the server.
3. Install or reinstall the wheel into the runtime virtualenv.
4. Write or update `/var/lib/lx-annotate/.env.systemd`.
5. Run migrations.
6. Restart the ASGI service.

That flow is implemented by
[deploy.sh](/home/admin/dev/lx-annotate/deploy/deploy.sh).

The runtime split is deliberate:

- code and virtualenv under the service user home
- operational state and protected data under `/var/lib/lx-annotate`

This keeps the patient-data boundary clean for encrypted storage and future
mount-level access controls.

The canonical runtime variable for that boundary is
`LX_ANNOTATE_ENCRYPTED_DATA_DIR`. `LX_ANNOTATE_DATA_DIR` still appears in the
current code and service wrappers as a compatibility alias for older code
paths, so this part of the runtime contract remains transitional.

The runtime path variables currently mean:

- `LX_ANNOTATE_ENCRYPTED_DATA_DIR`: canonical protected runtime root. This is
  the primary path boundary for patient data and service-managed runtime state.
- `LX_ANNOTATE_DATA_DIR`: compatibility alias for the same protected runtime
  root. Prefer `LX_ANNOTATE_ENCRYPTED_DATA_DIR` in new code and deployment
  configuration.
- `DATA_DIR`: legacy compatibility alias for the protected runtime root. New
  deployment code should not treat it as a separate concept.
- `STORAGE_DIR`: managed storage subtree under the protected runtime root,
  typically `${LX_ANNOTATE_ENCRYPTED_DATA_DIR}/storage`.
- `IO_DIR`: runtime intake and workflow subtree root. In the current LuxNix
  topology it still resolves inside the protected runtime root rather than to a
  separate external mount.

When documenting or wiring new deployment code, treat
`LX_ANNOTATE_ENCRYPTED_DATA_DIR` as authoritative and derive `STORAGE_DIR` and
`IO_DIR` from it instead of inventing independent roots.

Do not treat app-generated random keys as a valid encryption design. The Django
app should consume an already-mounted or already-unlocked data path. Encryption
keys and unlock policy belong in a dedicated LuxNix service or external
secrets/KMS system.

## Storage Recommendations

Use filesystem-level encryption as the default for large media assets,
especially videos. For `lx-annotate`, the preferred production pattern is an
encrypted-at-rest filesystem or block device such as LUKS/dm-crypt, with Django
responsible for authentication and authorization only. After access is
approved, hand the file off to Nginx via `X-Accel-Redirect` so Nginx can serve
the asset directly with native byte-range support and efficient kernel-backed
I/O.

Application-level encrypted storage should be reserved for smaller,
higher-sensitivity artifacts where per-file cryptographic control is worth the
runtime cost. Examples include reports, exports, metadata bundles, and other
low-bandwidth payloads. Do not treat application-level encryption as the
preferred path for video streaming workloads, because it forces userspace
decryption and proxying through Django, which disables the normal Nginx fast
path and materially increases CPU, latency, and memory pressure under
concurrent range requests.

Operational guidance:

- use LUKS/dm-crypt or equivalent filesystem or block-device encryption for
  video and media roots
- keep Django as the policy gate for protected media access
- prefer `X-Accel-Redirect` for authorized video delivery through Nginx
- use application-layer encrypted storage only where fine-grained crypto
  controls are required and throughput is not the primary constraint

## Service Topology

The production service split is intentional:

- [lx-annotate.service](/home/admin/dev/lx-annotate/deploy/lx-annotate.service)
  runs Daphne
- [lx-annotate-watcher.service](/home/admin/dev/lx-annotate/deploy/lx-annotate-watcher.service)
  runs the file watcher separately

The watcher must remain isolated from the web process so media ingestion
failures, CPU spikes, or OOM events do not kill the ASGI service.

## Ingress Contract

`lx-annotate` supports two first-class ingress modes:

- `watcher`: trusted local filesystem dropoff monitored by the separate watcher
  service
- `api`: authenticated upload ingestion through the web application

These ingress modes must coexist. The intended contract is:

- both boundaries are supported in the product and deployment model
- both boundaries create `UploadJob` records for provenance and processing state
- both boundaries converge on the shared ingest services after
  boundary-specific validation and acceptance checks

This means the watcher is not a legacy path scheduled for removal, and the API
ingest path is not a separate product line. They are two ingress adapters over
the same managed ingest core.

Operationally, that split implies:

- watcher ingress remains appropriate for trusted local drop folders, SAP-style
  handoff, and system-local automation
- API ingest remains appropriate for authenticated remote uploads and hub-style
  centre-to-server submission
- downstream processing, upload-job tracking, and managed storage should be
  reasoned about as shared components rather than watcher-only or API-only logic

Role-driven API policy should be set explicitly with:

- `ENDOREG_DEPLOYMENT_ROLE=central_hub|site_node|standalone`

Role matrix:

- `standalone`: local operation, no central-hub receiver policy
- `site_node`: network node, but not the central receiver
- `central_hub`: strict API center scoping, authenticated API uploads, and
  hardened transfer security contract

## Hub Export Contract

Outbound transfer to a hub is a separate sender workflow from ingest.

- ingest covers how resources enter the local node
- hub export covers how already processed, anonymized resources leave the local
  node for a configured central hub

The sender-side rules are:

- only anonymized resources are export-eligible
- only processed media is exported
- resources must be explicitly marked for upload before queueing
- retries must reuse a deterministic transfer identity

The detailed sender workflow is documented in
[hub-export-workflow.md](/home/admin/dev/lx-annotate/docs/guides/hub-export-workflow.md).

## Current Service Environment

The current wheel-based environment in this repository has these runtime
components:

- `lx-annotate.service`: long-running ASGI app, started with Daphne from the
  wheel virtualenv under `/home/lx-annotate/lx-annotate-wheel/.venv`
- `lx-annotate-watcher.service`: long-running file watcher, started from the
  same virtualenv and using the same runtime environment file
- `lx-annotate-sap-import.service`: one-shot SAP IS-H zip conversion unit in
  the active LuxNix topology
- `lx-annotate-sap-import.path`: path trigger watching the SAP import drop
  directory under the runtime data root
- Nginx: serves `/static/`, `/media/`, and `/protected_media/`, and proxies
  dynamic traffic to Daphne
- `.env.systemd`: host-owned runtime environment source of truth at
  `/var/lib/lx-annotate/.env.systemd`
- runtime data root: `/var/lib/lx-annotate/data`
- staticfiles root: `/var/lib/lx-annotate/staticfiles`

The shipped service units in `deploy/` are wheel-mode units. They assume:

- service user and group: `lx-annotate`
- app root: `/home/lx-annotate/lx-annotate-wheel`
- writable runtime state: `/var/lib/lx-annotate`
- `EnvironmentFile=/var/lib/lx-annotate/.env.systemd`

In LuxNix-managed environments, the runtime data tree also includes these SAP
handoff directories under `/var/lib/lx-annotate/data/import/`:

- `sap_import/`: incoming SAP IS-H zip bundles
- `sap_import_processed/`: successfully converted SAP zips
- `sap_import_failed/`: failed SAP zips retained for operator review
- `preanonymized_import/`: watcher-ready `.txt` plus `.json` sidecar pairs

The SAP conversion unit runs `manage.py import_sap_ish_zip` and writes
preanonymized watcher payloads into `preanonymized_import/`, where they then
enter the existing preanonymized watcher ingest path.

## LuxNix Audit Findings

The current LuxNix NixOS service is close to the runtime contract enforced by
the new readiness checks:

- `NGINX_PROTECTED_MEDIA_URL` is set to `/protected_media/`
- `PROTECTED_MEDIA_ROOT` is aligned with the managed storage root
- the service environment exports `STORAGE_DIR`, `IO_DIR`,
  `LX_ANNOTATE_ENCRYPTED_DATA_DIR`, and streamable video root variables
- the service user receives writable `ReadWritePaths` for the protected runtime
  tree
- main runtime roots are created through `systemd.tmpfiles` with restrictive
  ownership and mode settings

The remaining deployment weakness is not the main storage roots but the import
subtree:

- `tmpfiles` provisions `${IO_DIR}/import` itself
- watcher-facing subdirectories such as `video_import/`, `report_import/`, and
  `preanonymized_import/` are not all provisioned eagerly by `tmpfiles`
- some SAP-related subdirectories are created lazily by helper scripts instead
  of by the boot-time directory contract

For production operations, treat those watcher and SAP import directories as
required infrastructure, not convenience directories. A clean boot should not
depend on the first ingest helper script to make the runtime writable shape
exist.

The Nix module in [nix/module.nix](/home/admin/dev/lx-annotate/nix/module.nix)
documents a simpler packaged service shape. It does not cover the fuller
LuxNix topology described here, including the separate watcher, SAP-import,
and data-recovery units, so operators should treat the wheel deployment docs
plus active LuxNix host configuration as the current operational source of
truth for multi-service production setups.

## Data Recovery Unit

Some deployments also run a one-shot `systemd` unit named
`lx-annotate-data-recovery.service` before or during cutover from a legacy
repo-local layout to the runtime state layout under `/var/lib/lx-annotate`.

This repository does not currently ship that unit file directly, but the
behavior matches [migrate_data_dir.py](/home/admin/dev/lx-annotate/scripts/migrate_data_dir.py):

- source tree: legacy repository-local `./data`, for example
  `/var/endoreg-service-user/lx-annotate/data`
- target tree: canonical runtime data directory, typically
  `/var/lib/lx-annotate/data`
- env handoff: target `.env.systemd` at `/var/lib/lx-annotate/.env.systemd`

In `--allow-merge` mode, the migration script:

- copies source entries that do not already exist in the target
- skips target paths that already exist, logging a warning
- leaves the existing target `.env.systemd` in place as the source of truth
- does not delete the legacy source tree in that merge mode

That matches journal lines such as:

- `copying .../data/reports -> /var/lib/lx-annotate/data/reports`
- `WARNING: destination already exists, skipping: .../sensitive_reports`
- `target env file already exists, leaving as source of truth: /var/lib/lx-annotate/.env.systemd`

If an operator-side wrapper also writes a marker such as
`/var/lib/lx-annotate/data/logs/data_recovery_complete`, that marker is outside
the Python migration script itself. The script shipped here writes its own
completion marker at `DATA_DIR/.migration-complete` when it performs a full
migration rather than an allow-merge recovery run.

## Reverse Proxy Strategy

Daphne should not serve large static bundles in production. The reverse proxy is
responsible for:

- serving `/static/` from `/var/lib/lx-annotate/staticfiles/`
- serving `/media/` from `/var/lib/lx-annotate/data/`
- handling `/protected_media/` as an internal location
- proxying dynamic requests to Daphne

The reference Nginx config lives in
[nginx-lx-annotate.conf](/home/admin/dev/lx-annotate/deploy/nginx-lx-annotate.conf).

## LuxNix Strategy

The LuxNix module supports two runtime modes:

- `runtime.mode = "repo"` keeps the legacy repository/devenv startup path
- `runtime.mode = "wheel"` installs and starts the packaged wheel

That switch lives in
[/home/admin/luxnix/modules/nixos/services/lx-annotate-local/default.nix](/home/admin/luxnix/modules/nixos/services/lx-annotate-local/default.nix).

Use `repo` mode for local development or legacy setups that still depend on a
live checkout. Use `wheel` mode for standardized production-style deployments.

In LuxNix wheel mode, the split is:

- app root and wheel virtualenv under the service user home
- runtime data and staticfiles under `/var/lib/lx-annotate`

### LuxNix Wheel Auxiliary Units

In the current LuxNix topology, the watcher and frame-export services are
conditional in wheel mode. They are only instantiated when explicit wheel-mode
commands are configured for them.

The current endoreg-client role now wires those commands by default:

- `runtime.commands.fileWatcher = "python manage.py start_filewatcher"`
- `runtime.commands.exportFrames = "export-frames"`

Without those command values, these wheel-mode artifacts drop out of the
evaluated system configuration:

- `runLocalFileWatcher`
- `unit-lx-annotate-filewatcher.service`
- `runLocalExportFrames`
- `unit-lx-annotate-export-frames.service`

SAP import is different in the current LuxNix module. Its wheel-mode helper and
units are unconditional, so `lx-annotate-sap-import.service` and
`lx-annotate-sap-import.path` still evaluate even when watcher and export
commands are unset.

### LuxNix Master Key Permissions

Wheel mode uses encrypted Django storage during boot-time repair and runtime
storage initialization. That means the application service user must be able to
read the configured master key file.

In the current LuxNix deployment model:

- the service user is `endoreg-service-user`
- the service user is a member of the sensitive secrets group
- `/etc/secrets/vault` is group-readable/traversable for that sensitive group

Because of that, the lx-annotate application master key must not be provisioned
as `root:root 0400`. That mode causes wheel-mode repair commands such as
`repair_managed_payloads` to fail with `PermissionError` when Django tries to
initialize `EncryptedStorage`.

The required LuxNix ownership model for the application master key is:

- owner: `root`
- group: sensitive secrets group, for example `sensitiveServices`
- mode: `0640`

This applies to both:

- auto-generated local master keys
- Vault-managed lx-annotate application master keys

The LUKS unlock key and LUKS UUID are different. Those are still intended for
the root-managed encrypted-data mount service and can remain root-only.

## Current Limits

- Some Keycloak integration still depends on repo-aware settings paths.
- Host-level package drift must be managed explicitly because those binaries are
  no longer pinned by Nix in production.
- Database rollback on failed migrations is still an operator procedure, not an
  automated rollback path.

## Related Guides

- [wheel-deployment.md](/home/admin/dev/lx-annotate/docs/guides/wheel-deployment.md)
- [asset-deployment.md](/home/admin/dev/lx-annotate/docs/guides/asset-deployment.md)
