# Wheel Deployment

This guide documents the production deployment path for `lx-annotate` when the
application is built in CI as a Python wheel with frontend staticfiles included.

## Scope

- CI builds the frontend with Node.js and packages the result with `hatchling`.
- Production installs the wheel into a regular Python virtualenv.
- Production still needs host-level binaries for media and OCR workloads.

## Host Packages

For Debian/Ubuntu hosts:

```bash
sudo ./deploy/bootstrap-host.sh
```

That script installs:

- `python3`, `python3-venv`
- `ffmpeg`
- `tesseract-ocr`, `tesseract-ocr-eng`, `tesseract-ocr-deu`
- `libgl1`, `libglib2.0-0`, `libxcb1`

The extra shared libraries match the runtime expectations currently modeled in
`devenv.nix` and the CI workflow.

Because these host binaries come from the OS package manager rather than Nix,
minor package drift is now an operational concern. Treat FFmpeg and Tesseract
updates as deployment changes: review them, pin or hold them if needed, and
update `deploy/bootstrap-host.sh` whenever runtime dependencies change.

## Runtime Contract

Create `/var/lib/lx-annotate/.env.systemd` from
`deploy/.env.systemd.example` and set real values for:

- `DJANGO_SECRET_KEY`
- `DJANGO_DB_*`
- `OIDC_RP_CLIENT_SECRET`
- host/origin values such as `BASE_URL`, `DJANGO_ALLOWED_HOSTS`,
  `DJANGO_CSRF_TRUSTED_ORIGINS`, and `DJANGO_CORS_ALLOWED_ORIGINS`

Keep these runtime values explicitly defined:

- `TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata`
- `PYTORCH_ALLOC_CONF=expandable_segments:True`

Set deployment role explicitly:

- `ENDOREG_DEPLOYMENT_ROLE=central_hub|site_node|standalone`

Role matrix:

- `standalone`: local deployment behavior
- `site_node`: networked node behavior without central receiver policy
- `central_hub`: strict ingest + transfer receiver profile

Keep secret-bearing values in `.env.systemd` only. Do not add shell tracing
such as `set -x` to deployment scripts or service wrappers, and restrict `journalctl` access to trusted operators on the host.

The runtime layout is intentionally split:

- code and virtualenv under the service user home
- data, staticfiles, and `.env.systemd` under `/var/lib/lx-annotate`

This split is required for encrypted data storage and tighter filesystem access
control around patient data.

Use `LX_ANNOTATE_ENCRYPTED_DATA_DIR` as the canonical runtime variable for the
protected data mount. The current code and LuxNix wrappers still export
`LX_ANNOTATE_DATA_DIR` as a compatibility alias for older code paths, so treat
the environment as transitional rather than fully cleaned up.

The path-variable contract is:

- `LX_ANNOTATE_ENCRYPTED_DATA_DIR`: canonical protected runtime root.
- `LX_ANNOTATE_DATA_DIR`: compatibility alias for the same root.
- `DATA_DIR`: legacy compatibility alias for the same root.
- `STORAGE_DIR`: managed storage subtree, normally
  `${LX_ANNOTATE_ENCRYPTED_DATA_DIR}/storage`.


For new deployment code and operator docs, prefer
`LX_ANNOTATE_ENCRYPTED_DATA_DIR` and describe the others relative to it.

The application should not generate or manage encryption keys itself. A
dedicated LuxNix service or external KMS/secrets system should own key
management and unlock policy.

## Ingress Contract

`lx-annotate` supports two first-class ingest boundaries:

- `api`: authenticated remote upload intake through `/api/upload/`

Both boundaries now converge on the shared `endoreg_db.services.hub` ingest services
and create `UploadJob` records with normalized provenance. The watcher
is not a separate import stack anymore; it is a boundary adapter over the same
core ingest contract.

Hub-mode policy is intentionally asymmetric:

- `watcher` may keep default-center behavior for trusted local drop zones
- `api` in `ENDOREG_DEPLOYMENT_ROLE=central_hub` requires authenticated callers and declared
  `center_key`
- `/api/upload/` is the primary hub boundary
- `/api/media/hub/transfers/` is the secondary boundary in `central_hub` role

For `ENDOREG_DEPLOYMENT_ROLE=central_hub`:

- API uploads must be authenticated
- API uploads must declare `center_key` and do not use default-center fallback
- production deployments must use a non-SQLite database

For production hub deployments, operators should assume that incorrect center
resolution is a clinical data-isolation failure. Treat `center_key` as the only
machine-facing center identifier in automation and integrations.

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
- keep `STORAGE_DIR` inside the protected
  `LX_ANNOTATE_ENCRYPTED_DATA_DIR` root
- for hub deployments, use durable shared or object-backed storage semantics
  for managed media and upload artifacts; node-local ephemeral disks are not
  sufficient

## Hub Deployment Profile

For `ENDOREG_DEPLOYMENT_ROLE=central_hub`, the minimum deployment contract is:

- PostgreSQL or another durable multi-user production database
- explicit `DJANGO_DB_*` configuration or `DATABASE_URL`
- explicit `LX_ANNOTATE_ENCRYPTED_DATA_DIR`
- encrypted managed storage enabled
- authenticated API access before exposing `/api/upload/`
- center-scoped operational monitoring and log retention

SQLite is not an acceptable hub database. A single-host dev profile can still
use SQLite, but a shared hub deployment must not.

## Secure Hub Transfer

If the deployment enables `/api/media/hub/transfers/`, treat it as a stricter
boundary than `/api/upload/`.

Current Phase 1 contract:

- secure transport is required:
  `ENDOREG_HUB_TRANSFER_REQUIRE_SECURE_TRANSPORT=true`
- proxy-verified mTLS is required:
  `ENDOREG_HUB_TRANSFER_REQUIRE_MTLS=true`
- Django must receive the proxy attestation through:
  `ENDOREG_HUB_TRANSFER_MTLS_META_KEY`
  and
  `ENDOREG_HUB_TRANSFER_MTLS_META_VALUE`

On LuxNix-managed hosts, the `lx-annotate-local` module now expresses that
contract directly:

- `hub.transferApi.enable = true` is opt-in
- transfer API enablement is rejected unless mTLS is enabled
- Nginx verifies client certificates against `hub.transferApi.clientCaFile`
- Nginx forwards the verification result as
  `X-Client-Cert-Verified`

Operationally, this means:

- transfer intake must be behind HTTPS
- transfer intake must be behind Nginx client-certificate verification
- sender nodes must present a client certificate trusted by the configured CA
- plain shared-secret authentication alone is not enough for transfer-enabled
  hub deployments

This is still Phase 1 of the security roadmap:

- transport confidentiality and node authentication are enforced through TLS
  and mTLS
- request authentication still uses `NetworkNode.shared_secret`
- exported artifacts are not yet envelope-encrypted at the application layer

## Deployment

1. Copy the built wheel from CI to the server.
2. Copy `deploy/lx-annotate.service` to `/etc/systemd/system/`.
3. Copy `deploy/lx-annotate-watcher.service` to `/etc/systemd/system/` if the
   file watcher should run in production.
4. Create the app user and directories:

```bash
sudo useradd --system --home /var/lib/lx-annotate --create-home lx-annotate || true
sudo mkdir -p /var/lib/lx-annotate
sudo chown -R lx-annotate:lx-annotate /var/lib/lx-annotate
```

5. Run the deployment script:

```bash
./deploy/deploy.sh /tmp/lx_annotate-0.0.1-py3-none-any.whl
```

That script now runs `deploy/acceptance-smoke.sh` by default after the service
restart. The smoke path verifies:

- Django runtime checks with the production environment
- encrypted-storage round-trip without plaintext on disk
- Nginx TLS/static handoff by fetching `/static/.vite/manifest.json`

Set `RUN_POST_DEPLOY_ACCEPTANCE=0` only when you need to separate rollout from
acceptance debugging.

6. Put a reverse proxy in front of Daphne. An example Nginx server block lives
   in `deploy/nginx-lx-annotate.conf`.

7. Enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lx-annotate.service
sudo systemctl enable --now lx-annotate-watcher.service
```

## Current Services

The current wheel deployment environment is expected to contain:

- `lx-annotate.service`: Daphne ASGI service
- `lx-annotate-watcher.service`: separate file watcher service
- `lx-annotate-sap-import.service`: one-shot SAP IS-H zip converter in LuxNix deployments
- `lx-annotate-sap-import.path`: path trigger watching `${DATA_DIR}/import/sap_import/*.zip` in LuxNix deployments
- Nginx: reverse proxy plus static/media handoff
- `/var/lib/lx-annotate/.env.systemd`: runtime environment source of truth

The shipped service units currently assume:

- app root: `/home/lx-annotate/lx-annotate-wheel`
- virtualenv: `/home/lx-annotate/lx-annotate-wheel/.venv`
- runtime state root: `/var/lib/lx-annotate`
- runtime data root: `/var/lib/lx-annotate/data`
- staticfiles root: `/var/lib/lx-annotate/staticfiles`

`lx-annotate.service` and `lx-annotate-watcher.service` both read the same
`/var/lib/lx-annotate/.env.systemd` file and both require write access to
`/var/lib/lx-annotate`.

The watcher unit and the web unit are intentionally separate processes, but
they are not allowed to diverge in ingest semantics. They share the same
runtime environment and the same upstream hub ingest contract.

In LuxNix-managed environments, SAP drops are also wired into the runtime data
tree:

- incoming SAP IS-H zip bundles: `/var/lib/lx-annotate/data/import/sap_import/`
- processed SAP zips: `/var/lib/lx-annotate/data/import/sap_import_processed/`
- failed SAP zips: `/var/lib/lx-annotate/data/import/sap_import_failed/`
- generated watcher payloads: `/var/lib/lx-annotate/data/import/preanonymized_import/`

The SAP unit runs `manage.py import_sap_ish_zip ... --output_dir ...` and
converts supported SAP IS-H `.zip` bundles into watcher-compatible
preanonymized `.txt` plus `.json` sidecar pairs. Those generated files then
feed the normal preanonymized watcher ingest path.

## LuxNix Permission Contract

The current LuxNix service definitions are broadly aligned with the application
readiness checks:

- `/protected_media/` is aliased to the protected storage root
- the service process runs with `LD_LIBRARY_PATH` set for NumPy/video runtime
  dependencies
- the protected runtime root, storage root, and streamable roots are created
  with service-user ownership and restrictive modes
- Nginx is added to the service group so protected media can be served without
  exposing the storage tree publicly

Observed LuxNix runtime modes:

- protected runtime root: `0750`
- managed storage root: `0750`
- streamable video roots: `0750`
- import root: `0770`
- static/runtime frontend output: `0775`

Minimum required process access:

- watcher service user: read, write, execute on and its import
  subdirectories; read, write, execute on `${STORAGE_DIR}` and streamable roots
- web application service user: read, write, execute on `${STORAGE_DIR}`,
  streamable roots, and protected runtime roots
- Nginx worker user: execute on parent directories and read on
  `${PROTECTED_MEDIA_ROOT}` through shared group membership only

LuxNix gap identified by the audit:

- the main roots are provisioned correctly, but watcher-facing import
  subdirectories are not all created eagerly by `tmpfiles` or the main boot
  pre-start step

Operational recommendation:

- keep `${STORAGE_DIR}` and `${LX_ANNOTATE_STREAMABLE_VIDEO_ROOT}` on the same
  filesystem when atomic move semantics are expected
- treat any missing import subtree as a failed deployment, not as a recoverable
  runtime surprise

## Data Recovery Behavior

In environments migrating from an older repo-local deployment, operators may
also install a one-shot `lx-annotate-data-recovery.service`.

Its observed behavior matches
[scripts/migrate_data_dir.py](/home/admin/dev/lx-annotate/scripts/migrate_data_dir.py)
running in merge mode:

- it treats the legacy repo-local `data/` tree as the source
- it copies missing entries into `/var/lib/lx-annotate/data`
- it skips paths already present in the target and logs warnings
- it preserves `/var/lib/lx-annotate/.env.systemd` if that file already exists

So a log like this:

- `copying /var/endoreg-service-user/lx-annotate/data/reports -> /var/lib/lx-annotate/data/reports`
- `WARNING: destination already exists, skipping: /var/lib/lx-annotate/data/sensitive_reports`
- `target env file already exists, leaving as source of truth: /var/lib/lx-annotate/.env.systemd`

means the recovery unit performed a non-destructive merge into the runtime data
directory. It did not replace already-present target directories, and it did
not treat the legacy tree as the current source of truth for environment
configuration.

The Python migration script in this repository writes `DATA_DIR/.migration-complete`
for a full migration. If your host logs mention a different marker such as
`data/logs/data_recovery_complete`, that marker comes from the host-side
recovery wrapper or unit, not from the Python script itself.

## Failure Recovery

If `deploy.sh` fails during `migrate`, the script stops before restarting the
service. The current wheel is not auto-rolled back. Recovery is manual:

1. Inspect the migration error and database lock state.
2. Restore the previous database state according to your backup/restore policy.
3. Reinstall the previous known-good wheel if application code must be rolled
   back together with the schema.
4. Restart `lx-annotate.service` only after the database is healthy again.

This flow should be rehearsed outside production before enabling unattended
deployments.

## Service Isolation

Run the file watcher as a separate `systemd` unit. A corrupted media file or
OOM in the watcher must not take down Daphne. The supplied
`deploy/lx-annotate-watcher.service` keeps that blast radius separate.

That isolation is operational only. Ingest logic, provenance, and cleanup
policy still live in the shared core package and should not be reimplemented in
the watcher unit.

## Auth Caveat

The current production settings still contain a repo-aware Keycloak shim. On a
fresh wheel-only host:

- with `ENFORCE_AUTH=0`, auth is disabled if Keycloak integration cannot load
- with `ENFORCE_AUTH=1`, startup fails hard

Do not treat wheel-only auth as complete until that legacy path dependency is
removed.

## Nginx Handoff

Daphne should not serve static bundles directly in production. Serve these
paths at the reverse proxy:

- `/static/` from `/var/lib/lx-annotate/staticfiles/`
- `/media/` from `/var/lib/lx-annotate/data/`
- `/protected_media/` as an internal Nginx location

The example Nginx config covers the proxy and static routing. Application code
still needs to emit the appropriate `X-Accel-Redirect` headers for protected
media responses.

## Notes

- The wheel includes Django templates and built frontend staticfiles.
- The application still expects an external `.env.systemd` file at runtime.
- Some settings still assume a repo-like layout under `BASE_DIR` for optional
  integrations. In particular, the production Keycloak path shim in
  `lx_annotate/settings/settings_prod.py` remains repo-aware even though the
  core app now ships as a wheel.
- `pip --force-reinstall` is run with `PIP_NO_CACHE_DIR=1` to avoid local pip
  cache growth on long-lived hosts.
