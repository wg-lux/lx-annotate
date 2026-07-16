# LX-Annotate

LX-Annotate is a Django + Vue application for annotating AI-generated outputs,
with a media ingestion pipeline for videos and PDFs. This project was created by a team at Universitätsklinikum Würzburg, Bavaria.  

## Highlights

- Django backend with REST APIs and optional OIDC authentication
- Vue 3 SPA frontend integrated with Django via `django-vite`
- File watcher for automated video and PDF processing
- Reproducible environments via `devenv`/Nix and Docker

## Repository Layout

- `lx_annotate/` Django app and settings
- `frontend/` Vue 3 application
- `scripts/` operational tooling and file watcher scripts
- `data/` runtime data (raw videos, PDFs, model cache)
- `conf_template/` sample configuration templates
- `container/` Dockerfiles and container docs

## Requirements

- Python 3.12
- Node.js 18+ (frontend)
- PostgreSQL (main app)
- Optional: `uv`, `direnv`, `devenv`, Nix, Docker

## Quick Start (Development)

1. `direnv allow` (if you use `devenv`)
2. `uv sync` (or install dependencies with `pip`)
3. `cp conf_template/default.env .env` and update values
4. `export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev`
5. `python manage.py load_base_db_data`
6. `python manage.py runserver`

Open `http://127.0.0.1:8000/`.

## Backend Test Execution

If native Python dependencies such as NumPy fail to import because the shell is
missing Nix runtime libraries, run backend tests through the repo wrapper so
`devenv` exports the expected environment first:

```bash
./scripts/run-backend-checks.sh
```

Equivalent Make target:

```bash
make test-real
```

## Environment Variables and Secrets

Production secrets are injected by the host system, LuxNix, or another secret
manager. For local development, use either `secretspec.toml` defaults or a
local `.env` file.

`secretspec.toml` is the tracked environment contract. It defines profile
defaults and variable names, but it must not contain real production secrets.
The Django settings flow is:

- `secretspec.toml`: declares environment variables and profile defaults.
- `lx_annotate/settings/config.py`: parses environment values into typed app
  config.
- `lx_annotate/settings/settings_prod.py`: applies production security policy
  and fails startup when required settings are missing.

Production should prefer secret-file variables such as
`DJANGO_SECRET_KEY_FILE`, `DJANGO_DB_PASSWORD_FILE`,
`DJANGO_KEYCLOAK_CLIENT_SECRET_FILE`, and `LX_ANNOTATE_MASTER_KEY_FILE`.
Compatibility aliases from the current secretspec contract are also accepted,
including `ALLOWED_HOSTS`, `OIDC_RP_CLIENT_ID`, `OIDC_RP_CLIENT_SECRET`, and
`TIME_ZONE`.

Development example:

```bash
direnv allow
secretspec --provider dotenv --profile development python manage.py runserver
```

Production check example:

```bash
secretspec --provider dotenv --profile production \
  python -m django check --settings=lx_annotate.settings.settings_prod
```

See `docs/guides/wheel-deployment.md` for the full runtime contract and
<https://secretspec.dev/> for secretspec usage.

## Frontend

```bash
cd frontend
npm install
npm run build
```

Hot-reload development:

```bash
cd frontend
npm run dev
```

In another terminal:

```bash
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
python manage.py runserver
```

## File Watcher

The file watcher ingests media placed in:

- `data/import/video_import/`
- `data/import/report_import/`

```bash
./scripts/start_filewatcher.sh dev
# or
python manage.py run_filewatcher
```

## Production HLS Materialization

Production video playback uses HLS as the safe streaming path. The watcher or
API first creates an `UploadJob`. The import then stores the source video behind
the encrypted storage boundary, creates the anonymized `processed_file`, and
finalizes the video record. After that point the processed video can be
materialized into HLS.

Materialization is handled by the Django/Celery task
`endoreg_db.tasks.video_hls_materialization`. The task creates or updates a
`VideoHlsArtifact` record, reads the processed video through the storage
boundary, and streams it to FFmpeg. FFmpeg writes a `playlist.m3u8` file and
`seg_*.ts` segments into the protected streamable video root. The HLS segments
are encrypted with FFmpeg's native HLS encryption, while the HLS content key is
managed separately and served through the key endpoint.

Nginx does not serve proprietary `LXENC01` encrypted storage files. Django
returns protected media responses with `X-Accel-Redirect`, and Nginx only
offloads the standard HLS artifacts from the protected media area. Progressive
MP4 streaming is legacy compatibility behavior and redirects to the processed
HLS playlist in production.

The LuxNix runtime exposes two HLS systemd services:

- `lx-annotate-hls-backfill.service`: automatic boot and upgrade dispatcher for
  missing processed-video HLS artifacts. It runs after migrations, base data
  loading, and encrypted-storage validation.
- `lx-annotate-hls-materialization.service`: manual dispatcher for audited
  repair runs. It is exposed but not started by any target.

Both services call the same guarded wrapper,
`runLxAnnotateHlsMaterialization`. The wrapper always uses processed HLS,
dispatches work to the `ffmpeg_media` queue, and rejects unsafe overrides such
as `--force`, `--inline`, and `--artifact-kind`.

Operational requirements:

- the migration containing the `VideoHlsArtifact` model must be applied to the
  production database
- `SERVE_WITH_NGINX=true` and `NGINX_PROTECTED_MEDIA_URL` must match the Nginx
  protected-media configuration
- the `ffmpeg_media` Celery worker must be running and able to reach Redis
- the master key must be readable for encrypted storage and HLS key operations
- `check_production_hls_readiness` must pass against the production database

Upgrade behavior is intentionally idempotent. The backfill dispatcher runs
without `--force`; existing READY artifacts with valid playlist and segment
files are returned as `already_ready`, while missing or inconsistent artifacts
are materialized or fail loudly.

## Ingress Modes

`lx-annotate` supports two first-class ingest boundaries:

- `watcher`: trusted local drop-folder ingestion for files written into the
  runtime import directories
- `api`: authenticated web/API upload ingestion for remote clients and hub-style
  integrations

These are parallel ingress modes, not competing ones. The contract for new
development is:

- both ingress modes remain supported
- both ingress modes create `UploadJob` records
- both ingress modes converge on the shared ingest and managed-storage services
  after boundary-specific checks

The watcher remains the right boundary for local system dropoff and SAP-style
handoff flows. The API remains the right boundary for authenticated remote
uploads and future hub integrations.

## Hub Contract Upgrade

When upgrading to the hub-aware ingest model in `endoreg_db`, treat these as
deployment requirements for LuxNix and host environments:

- use `center_key` for machine-facing API payloads and automation (not mutable
  center display names)
- set `ENDOREG_DEPLOYMENT_ROLE` explicitly to one of:
  `central_hub`, `site_node`, `standalone`
- for `central_hub`, require authenticated API uploads with declared
  `center_key`; do not rely on default-center fallback for API ingest
- keep `STORAGE_DIR` inside
  `LX_ANNOTATE_ENCRYPTED_DATA_DIR`
- run package migrations during upgrade so upload-job and content-hash lifecycle
  changes are active

Deployment role matrix:

- `standalone`: local deployment, no hub transfer receiver behavior
- `site_node`: networked node behavior without central hub receiver policy
- `central_hub`: strict hub ingest policy, authenticated API uploads with
  explicit `center_key`, and production mTLS transfer contract

## Hub Export

Outbound hub transfer is tracked as a separate sender workflow from ingest.

- only anonymized resources are eligible for outbound transfer
- the sender exports processed media only
- resources must be explicitly marked for upload before they are queued
- the export UI is planned as a new workflow page derived from the
  anonymization overview, not from the legacy annotation segment export screen

The sender-side workflow contract is documented in
[docs/guides/hub-export-workflow.md](/home/admin/dev/lx-annotate/docs/guides/hub-export-workflow.md).

## Configuration

- Development `.env` is read from the repository root or `~/.local/share/lx-annotate/.env`.
- Settings are driven by environment variables (see `secretspec.toml` defaults).
- Sample configs live in `conf_template/`.

## Nix Builds

The Nix package exposes stable runtime entrypoints that do not clone the repo,
run `uv sync`, or install Python packages at service start:

```bash
nix build .#lx-annotate
./result/bin/lx-annotate-web
```

```bash
./result/bin/lx-annotate-manage check
./result/bin/lx-annotate-worker --hostname="maintenance@%h" --queues=maintenance,default
LX_ANNOTATE_FILEWATCHER_ARGS=--process-existing-once ./result/bin/lx-annotate-watch
```

The primary entrypoints are `lx-annotate-web`, `lx-annotate-manage`,
`lx-annotate-worker`, and `lx-annotate-watch`. `lx-annotate-server` remains as
a compatibility alias for the web command.

The repository flake also exposes the existing `devenv` environment as a Nix
dev shell:

```bash
nix develop --no-pure-eval
```

This evaluates [`devenv.nix`](/home/admin/dev/lx-annotate/devenv.nix) through
the top-level `flake.nix`, so the same shell can be entered either with
`devenv`/`direnv` or directly through `nix develop`.

## Wheel Deployment

The CI pipeline can now build a production wheel with frontend staticfiles
included via `hatchling`. Production runtime no longer needs Node.js or the
full `devenv` shell.

The current deployment strategy is:

- CI builds frontend assets and packages the app as a wheel
- production installs that wheel into a Python virtualenv
- host packages provide FFmpeg, Tesseract, and shared libraries
- `systemd` runs Daphne and the file watcher as separate services
- the web app and watcher remain parallel supported ingress boundaries, both
  feeding the same upload-job-driven ingest core
- LuxNix deployments can also run a SAP IS-H import path/unit pair that converts
  dropped SAP zip exports into watcher-ready preanonymized files
- some legacy-to-runtime cutovers also run a one-shot data recovery service
- Nginx serves static/media files directly

Use `make package` to build release artifacts locally. That target rebuilds the
frontend, verifies that `staticfiles/.vite/manifest.json` is valid and contains
the required `src/main.ts` mapping, and only then runs `python -m build` for
the wheel and sdist.

Runtime layout is intentionally split:

- runtime code and the Python virtualenv live under the service user home
- runtime data, media, staticfiles, and `.env.systemd` live under `/var/lib/lx-annotate`

This split is required for the next hardening step: encrypting the data path and
restricting access to the `endoreg-service-user` while keeping application code
and deployment mechanics separate from protected patient data.

The canonical host-owned runtime variable for this boundary is
`LX_ANNOTATE_ENCRYPTED_DATA_DIR`. The app derives compatibility aliases and
managed storage paths from that root.

Current runtime path roles:

- `LX_ANNOTATE_ENCRYPTED_DATA_DIR`: canonical protected runtime root
- `LX_ANNOTATE_DATA_DIR`: app-owned compatibility alias for the same root
- `DATA_DIR`: app-owned legacy compatibility alias for the same root
- `STORAGE_DIR`: managed storage subtree, usually `${LX_ANNOTATE_ENCRYPTED_DATA_DIR}/storage`
- `PROTECTED_MEDIA_ROOT` and `LX_ANNOTATE_STREAMABLE_VIDEO_*`: app-owned
  storage paths derived under `STORAGE_DIR`

The same app contract owns `DJANGO_SETTINGS_MODULE`, `DJANGO_ENV`,
`STATIC_URL`, `MEDIA_URL`, `NGINX_PROTECTED_MEDIA_URL`, and
`SERVE_WITH_NGINX`. Host environment files should provide only host paths,
network settings, service endpoints, and secret file references.

New deployment code should anchor path derivation on
`LX_ANNOTATE_ENCRYPTED_DATA_DIR` and leave the derived path variables out of
host-owned environment files.

For application-layer envelope encryption, `lx_annotate` uses
`lx_annotate.storage.encrypted.EncryptedStorage` as the default Django storage
backend. Runtime deployments must provide `LX_ANNOTATE_MASTER_KEY` or
`LX_ANNOTATE_MASTER_KEY_FILE`; production deployments should use the file form
through the host secret manager. The backend generates a per-file DEK, wraps it
with the service-level KEK, writes ciphertext only under
`LX_ANNOTATE_ENCRYPTED_DATA_DIR`, and encrypts/decrypts in chunks so large
uploads do not have to fit into memory. The KEK is intentionally
service-scoped rather than tied to a Keycloak session so background workers such
as `manage.py run_filewatcher` can still process stored files.

Encryption itself should not be implemented by generating random keys inside the
application process. The app only consumes the mounted/unlocked path. Key
management and unlock policy belong in a dedicated LuxNix service or external
secrets/KMS layer.

For the architecture and mode selection details, see
`docs/guides/deployment-strategy.md`.

Deployment assets live in `deployment_example/`:

- `deployment_example/bootstrap-host.sh`
- `deployment_example/deploy.sh`
- `deployment_example/lx-annotate.service`
- `deployment_example/.env.systemd.example`

See `docs/guides/wheel-deployment.md` for the full host bootstrap and `systemd`
flow.

For the current production-style service environment, including the
repo-local-data to `/var/lib/lx-annotate/data` recovery flow and the SAP IS-H
drop-to-watcher import path, see `docs/guides/deployment-strategy.md`.

## Containers

Docker images now install Python packages into `/app/.devenv/state/venv` so the
container path matches the repository's preferred virtualenv layout.

This does **not** mean Docker runs the full Nix/`devenv` shell. Inside the
container, `uv` creates and manages the environment at that path, and the image
`PATH` is configured to use `/app/.devenv/state/venv/bin`.

See `container/README.md` for development and production Docker usage.

## Tests

```bash
pytest
```

```bash
cd frontend
npm run test:unit
```

## License

MIT. See `LICENSE`.
