# Scripts Documentation Index

Index of maintained documentation for `scripts/`.

## Main Docs

- `scripts/README.md`: current scripts overview and common commands
- `scripts/SCRIPT_REFERENCE.md`: script-by-script quick reference
- `scripts/README_FileWatcher.md`: watcher service operations
- `scripts/cuda/README.md`: CUDA diagnostics workflow

## Use-Case Navigation

First-time setup:

1. `scripts/README.md`
2. `scripts/SCRIPT_REFERENCE.md`

File watcher setup and operations:

1. `scripts/README_FileWatcher.md`
2. `scripts/SCRIPT_REFERENCE.md`

GPU/CUDA diagnostics:

1. `scripts/utilities/gpu-check.py`
2. `scripts/cuda/README.md`

## Quick Help

```bash
python scripts/environment.py --help
python scripts/cleanup_invalid_videos.py --help
python scripts/hf_cache_manager.py --help
```

## Documentation Scope

This index intentionally tracks only files currently present in `scripts/`.
If you see references to `scripts/core/*` or removed planning docs, treat them as legacy references.
