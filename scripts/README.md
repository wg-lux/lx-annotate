# Scripts Directory

Utility scripts for LX-Annotate.

## Current Structure

```text
scripts/
├── README.md
├── README_FileWatcher.md
├── DOCUMENTATION_INDEX.md
├── SCRIPT_REFERENCE.md
├── cuda/
├── database/
├── utilities/
├── file_watcher.py
├── start_filewatcher.sh
├── diagnose_watcher.py
├── cleanup_invalid_videos.py
├── storage_monitor.py
├── hf_cache_manager.py
├── assert_dirs.py
├── environment.py
├── set_development_settings.py
├── set_production_settings.py
├── set_central_settings.py
└── lx-filewatcher.service
```

## Key Scripts

- `file_watcher.py`: watches `data/import/video_import/` and `data/import/report_import/` and processes new files
- `start_filewatcher.sh`: setup and service control wrapper for the watcher
- `diagnose_watcher.py`: diagnostics for watcher configuration/runtime issues
- `cleanup_invalid_videos.py`: removes or reports invalid/corrupted video files
- `storage_monitor.py`: storage usage checks
- `hf_cache_manager.py`: manage Hugging Face cache location and cleanup

## Database Scripts (`scripts/database/`)

- `ensure_psql.py`: checks PostgreSQL availability
- `fetch_db_pwd_file.py`: fetches database password file content

## CUDA Scripts (`scripts/cuda/`)

- `minimal_cuda_test.py`
- `debug_cuda_pytorch.py`
- `test_cuda_paths.py`
- `test_cuda_detailed.py`

See `scripts/cuda/README.md` for usage details.

## Utility Scripts (`scripts/utilities/`)

- `gpu-check.py`: quick GPU availability check
- `test_luxnix_compatibility.py`: environment compatibility checks

## Common Commands

File watcher (development):

```bash
./scripts/start_filewatcher.sh dev
```

Run watcher directly:

```bash
python manage.py run_filewatcher
```

CUDA quick test:

```bash
python scripts/cuda/minimal_cuda_test.py
```

GPU check:

```bash
python scripts/utilities/gpu-check.py
```

## Notes on Legacy Paths

Some older docs in this repository refer to `scripts/core/*` paths.
Those paths are not present in the current tree. Use the script locations documented in this file.
