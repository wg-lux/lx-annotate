# Script Reference Guide

Quick reference for scripts currently present under `scripts/`.

## Environment and Setup

### `scripts/environment.py`

Purpose:

- Update `.env` values for `development`, `production`, or `central` mode.

Usage:

```bash
python scripts/environment.py development
python scripts/environment.py production
python scripts/environment.py central
python scripts/environment.py show
python scripts/environment.py development --env-file .env
```

### `scripts/assert_dirs.py`

Purpose:

- Small helper to assert required directories exist.

Usage:

```bash
python scripts/assert_dirs.py
```

## File Watcher and Operations

### `python manage.py run_filewatcher`

Purpose:

- Watch media import directories and trigger processing through Django services.
- Skip in-progress handoff names such as `.part`, `.tmp`, `.partial`,
  `.crdownload`, and `.download` until they are atomically renamed to final
  watched media names.

Usage:

```bash
python manage.py run_filewatcher
```

### `scripts/start_filewatcher.sh`

Purpose:

- Wrapper for watcher setup, development run, systemd install, and service control.

Usage:

```bash
./scripts/start_filewatcher.sh setup
./scripts/start_filewatcher.sh dev
./scripts/start_filewatcher.sh status
./scripts/start_filewatcher.sh logs
```

Systemd operations:

```bash
sudo ./scripts/start_filewatcher.sh install-service
sudo ./scripts/start_filewatcher.sh start
sudo ./scripts/start_filewatcher.sh stop
sudo ./scripts/start_filewatcher.sh restart
```

### `scripts/diagnose_watcher.py`

Purpose:

- Diagnostic checks for watcher CPU load and observer behavior.

Usage:

```bash
python scripts/diagnose_watcher.py
```

## Database Helpers

### `scripts/database/ensure_psql.py`

Purpose:

- Ensures local PostgreSQL role/database prerequisites and tests connectivity.

Usage:

```bash
python scripts/database/ensure_psql.py
```

### `scripts/database/fetch_db_pwd_file.py`

Purpose:

- Copies DB password file from source path env var to target path env var.

Required env vars:

- `DB_PWD_FILE`
- `LX_MAINTENANCE_PASSWORD_FILE`

Usage:

```bash
python scripts/database/fetch_db_pwd_file.py
```

### `scripts/fetch_db_pwd_file.py`

Purpose:

- Legacy wrapper/helper retained in the script root.

Usage:

```bash
python scripts/fetch_db_pwd_file.py
```

## Media and Storage Utilities

### `scripts/cleanup_invalid_videos.py`

Purpose:

- Finds and optionally deletes invalid videos and related records.

Usage:

```bash
python scripts/cleanup_invalid_videos.py
python scripts/cleanup_invalid_videos.py --min-frames 10
python scripts/cleanup_invalid_videos.py --execute
```

### `scripts/storage_monitor.py`

Purpose:

- Runs periodic storage management command for cleanup/threshold enforcement.

Usage:

```bash
python scripts/storage_monitor.py
```

### `scripts/hf_cache_manager.py`

Purpose:

- Manage Hugging Face cache usage and cleanup.

Usage:

```bash
python scripts/hf_cache_manager.py --help
```

## GPU and CUDA Diagnostics

### `scripts/utilities/gpu-check.py`

Purpose:

- Lightweight GPU/CUDA availability check.

Usage:

```bash
python scripts/utilities/gpu-check.py
```

### `scripts/gpu-check.py`

Purpose:

- Legacy GPU check variant in the script root.

Usage:

```bash
python scripts/gpu-check.py
```

### `scripts/cuda/*`

Purpose:

- Detailed CUDA diagnostics (`minimal_cuda_test.py`, `debug_cuda_pytorch.py`, `test_cuda_paths.py`, `test_cuda_detailed.py`).

Usage:

```bash
python scripts/cuda/minimal_cuda_test.py
python scripts/cuda/debug_cuda_pytorch.py
python scripts/cuda/test_cuda_paths.py
python scripts/cuda/test_cuda_detailed.py
```

## Legacy Environment Scripts

These are retained for compatibility:

- `scripts/set_development_settings.py`
- `scripts/set_production_settings.py`
- `scripts/set_central_settings.py`

Prefer `scripts/environment.py` for current workflows.
