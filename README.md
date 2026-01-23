# LX-Annotate

LX-Annotate is a Django + Vue application for annotating AI-generated outputs,
with a media ingestion pipeline for videos and PDFs.

## Highlights

- Django backend with REST APIs and optional OIDC authentication
- Vue 3 SPA frontend integrated via django-vite
- File watcher for automated video/PDF processing
- Reproducible environments via Nix/devenv and Docker

## Repository layout

- `lx_annotate/` Django app and settings
- `frontend/` Vue 3 application
- `scripts/` operational tooling and file watcher
- `data/` runtime data (raw videos, PDFs, model cache)
- `conf_template/` sample configuration templates
- `container/` Dockerfiles and container docs

## Requirements

- Python 3.12
- Node.js 18+ (frontend)
- PostgreSQL (for the main app)
- Optional: `uv`, `direnv`, `devenv`, `nix`, Docker

## Quick start (dev)

1. `direnv allow` (if you use devenv)
2. `uv sync` (or install deps with pip)
3. `cp conf_template/default.env .env` and update values as needed
4. `export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev`
5. `python manage.py load_base_db_data`
6. `python manage.py runserver`

Open `http://127.0.0.1:8000/`.

## Environment Variables

In a production environment, the secrets of lx annotate are deployed using the system service on the local machine (NixOS Variables are injected from a secure place).

To run locally, using your own secrets, either change your defaults in secretspec.toml or add a local .env file.

CAUTION: DONT PUBLISH YOUR SECRETS! Secretspec.toml is not in gitignore.

run 

```bash
direnv allow
secretspec --provider dotenv -- profile development python manage.py runserver
```

to verify. To inject the secrets, running the server or shell with secretspec is required.

See https://secretspec.dev/ for further reference.

A .env.example comes with the project. Possibly, you will need to set dotenv = true in devenv.nix as well.
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

## File watcher

The file watcher ingests media placed in `data/raw_videos/` and
`data/raw_pdfs/`.

```bash
./scripts/start_filewatcher.sh dev
# or
python scripts/file_watcher.py
```

## Configuration

- Dev `.env` is read from the repo root or `~/.local/share/lx-annotate/.env`.
- Settings are driven by environment variables; see `secretspec.toml` for
  defaults.
- Sample configs live in `conf_template/`.

## Nix builds

THIS NEEDS FURTHER IMPLEMENTATION; AI ON FULL NIX BUILD IS HARD. FLAKES ARE LOCATED IN /build

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
