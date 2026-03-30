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
`LX_ANNOTATE_ENCRYPTED_DATA_DIR`. `LX_ANNOTATE_DATA_DIR` remains a compatibility
alias for older code paths.

Do not treat app-generated random keys as a valid encryption design. The Django
app should consume an already-mounted or already-unlocked data path. Encryption
keys and unlock policy belong in a dedicated LuxNix service or external
secrets/KMS system.

## Service Topology

The production service split is intentional:

- [lx-annotate.service](/home/admin/dev/lx-annotate/deploy/lx-annotate.service)
  runs Daphne
- [lx-annotate-watcher.service](/home/admin/dev/lx-annotate/deploy/lx-annotate-watcher.service)
  runs the file watcher separately

The watcher must remain isolated from the web process so media ingestion
failures, CPU spikes, or OOM events do not kill the ASGI service.

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

## Current Limits

- Some Keycloak integration still depends on repo-aware settings paths.
- Host-level package drift must be managed explicitly because those binaries are
  no longer pinned by Nix in production.
- Database rollback on failed migrations is still an operator procedure, not an
  automated rollback path.

## Related Guides

- [wheel-deployment.md](/home/admin/dev/lx-annotate/docs/guides/wheel-deployment.md)
- [asset-deployment.md](/home/admin/dev/lx-annotate/docs/guides/asset-deployment.md)
