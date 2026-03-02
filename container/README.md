# Container Infrastructure

This directory contains container-related files for LX-Annotate.

## Container Files

### Dockerfiles

- `Dockerfile.dev`: development container
- `Dockerfile.prod`: production container with multi-stage build

### Entrypoint Scripts

- `docker-entrypoint.sh`: development container entrypoint
- `docker-entrypoint-prod.sh`: production container entrypoint

## Development Container (`Dockerfile.dev`)

Purpose: fast local iteration.

Features:

- Python 3.12 slim base
- `uv` dependency installation from lockfile
- FFmpeg preinstalled
- Source mounted workflow support

Build and run:

```bash
docker build -f container/Dockerfile.dev -t lx-annotate-dev .
docker run --rm -p 8117:8117 -v "$(pwd)/data:/app/data" lx-annotate-dev
```

## Production Container (`Dockerfile.prod`)

Purpose: optimized production runtime.

Features:

- Locked dependency install (`uv sync --frozen --no-dev`)
- Runtime checks for required settings
- Database readiness + migrations on start

Build and run:

```bash
docker build -f container/Dockerfile.prod -t lx-annotate-prod .
docker run --rm -p 8117:8117 \
  -e DJANGO_SECRET_KEY="your-secret-key" \
  -e DJANGO_ALLOWED_HOSTS="example.com" \
  -e DJANGO_CSRF_TRUSTED_ORIGINS="https://example.com" \
  -e DJANGO_CORS_ALLOWED_ORIGINS="https://example.com" \
  -v "$(pwd)/data:/app/data" \
  lx-annotate-prod
```

## Environment Variables

Important variables:

- `DJANGO_ENV`: `development`, `production`, or `central`
- `DJANGO_SETTINGS_MODULE`: Django settings module
- `DJANGO_SECRET_KEY`: required in production
- `DJANGO_HOST`, `DJANGO_PORT`: bind host and port
- `STORAGE_DIR`: data root in container (default `/app/data`)

Notes:

- In development images, set `DJANGO_SETTINGS_MODULE` explicitly to
  `lx_annotate.settings.settings_dev`.
- In production images, default is `lx_annotate.settings.settings_prod`.
- `CENTRAL_NODE=true` switches to central-mode logic in entrypoints.

## Volumes

Typical mounts:

- `/app/data`: application data
- `/app/conf`: optional configuration files
- `/app/staticfiles`: optional static output
- `/app/logs`: optional logs

## GPU Support

For NVIDIA GPU access:

1. Install NVIDIA drivers on host
2. Configure Docker NVIDIA runtime
3. Run with `--gpus all`

Example:

```bash
docker run --rm --gpus all -p 8117:8117 lx-annotate-dev
```

## Management Command Wrapper

If your shell includes the project `manage` helper (from `devenv`), you can use:

```bash
manage dev && manage build && manage run
manage prod && manage build && manage run
```

## Troubleshooting

Build issues:

```bash
docker builder prune
docker build --no-cache -f container/Dockerfile.dev -t lx-annotate-dev .
```

Runtime issues:

```bash
docker logs <container-name>
docker exec -it <container-name> /bin/bash
```

## Related Documentation

- `docs/NATIVE_DEVENV_CONTAINERS_GUIDE.md`
- `docs/CENTRALIZED_CONFIG_GUIDE.md`
- `README.md`
