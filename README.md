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

- `data/raw_videos/`
- `data/raw_pdfs/`

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

## Containers

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
