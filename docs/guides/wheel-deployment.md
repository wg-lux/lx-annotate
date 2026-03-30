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
protected data mount. Keep `LX_ANNOTATE_DATA_DIR` only as a compatibility alias
for older code paths.

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
