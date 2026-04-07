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
- `IO_DIR`: import/export/workflow subtree root. In the current deployment
  model it remains inside `LX_ANNOTATE_ENCRYPTED_DATA_DIR`, not as a second
  independent runtime root.

For new deployment code and operator docs, prefer
`LX_ANNOTATE_ENCRYPTED_DATA_DIR` and describe the others relative to it.

The application should not generate or manage encryption keys itself. A
dedicated LuxNix service or external KMS/secrets system should own key
management and unlock policy.

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
