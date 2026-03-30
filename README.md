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

## Environment Variables and Secrets

Production secrets are typically injected by the host system.
For local development, use either `secretspec.toml` defaults or a local `.env` file.

Do not commit secrets. `secretspec.toml` is tracked in git.

Example:

```bash
direnv allow
secretspec --provider dotenv --profile development python manage.py runserver
```

See <https://secretspec.dev/> for details.

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
python scripts/file_watcher.py
```

## Configuration

- Development `.env` is read from the repository root or `~/.local/share/lx-annotate/.env`.
- Settings are driven by environment variables (see `secretspec.toml` defaults).
- Sample configs live in `conf_template/`.

## Nix Builds

Nix build targets are available, but deployment paths may still need project-specific adjustments.

```bash
nix build .#prod-server
./result/bin/run-prod-server
```

```bash
nix build .#file-watcher
./result/bin/run-file-watcher
```

## Wheel Deployment

The CI pipeline can now build a production wheel with frontend staticfiles
included via `hatchling`. Production runtime no longer needs Node.js or the
full `devenv` shell.

The current deployment strategy is:

- CI builds frontend assets and packages the app as a wheel
- production installs that wheel into a Python virtualenv
- host packages provide FFmpeg, Tesseract, and shared libraries
- `systemd` runs Daphne and the file watcher as separate services
- Nginx serves static/media files directly

Runtime layout is intentionally split:

- runtime code and the Python virtualenv live under the service user home
- runtime data, media, staticfiles, and `.env.systemd` live under `/var/lib/lx-annotate`

This split is required for the next hardening step: encrypting the data path and
restricting access to the `endoreg-service-user` while keeping application code
and deployment mechanics separate from protected patient data.

The runtime variable for this boundary is `LX_ANNOTATE_ENCRYPTED_DATA_DIR`. The
app and service layer may continue to export `LX_ANNOTATE_DATA_DIR` as a
compatibility alias, but the encrypted-data path is now the canonical runtime
contract.

For application-layer envelope encryption, `lx_annotate` also ships an opt-in
Django storage backend at `lx_annotate.storage.encrypted.EncryptedStorage`.
Enable it with `LX_ANNOTATE_USE_ENCRYPTED_STORAGE=1` and provide
`LX_ANNOTATE_MASTER_KEY` or `LX_ANNOTATE_MASTER_KEY_FILE`. The backend generates
a per-file DEK, wraps it with the service-level KEK, writes ciphertext only
under `LX_ANNOTATE_ENCRYPTED_DATA_DIR`, and encrypts/decrypts in chunks so large
video uploads do not have to fit into memory. The KEK is intentionally
service-scoped rather than tied to a Keycloak session so background workers such
as `manage.py run_filewatcher` can still process stored files.

Encryption itself should not be implemented by generating random keys inside the
application process. The app only consumes the mounted/unlocked path. Key
management and unlock policy belong in a dedicated LuxNix service or external
secrets/KMS layer.

For the architecture and mode selection details, see
`docs/guides/deployment-strategy.md`.

Deployment assets live in `deploy/`:

- `deploy/bootstrap-host.sh`
- `deploy/deploy.sh`
- `deploy/lx-annotate.service`
- `deploy/.env.systemd.example`

See `docs/guides/wheel-deployment.md` for the full host bootstrap and `systemd`
flow.

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
