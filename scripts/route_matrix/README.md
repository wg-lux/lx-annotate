# Route Matrix CI Check

Minimal CI tooling to prevent frontend endpoint contract drift from causing backend `404` errors.

## What It Checks

- Exports Django routes from this repo at runtime (`manage.py export_route_manifest`)
- Exports frontend endpoint contract keys/paths from `frontend/src/types/api/endpoints.js`
- Compares normalized paths and fails if a frontend contract endpoint has no backend match

## Usage (Local / CI)

```bash
python scripts/route_matrix/check_route_matrix.py \
  --json-out temp/route-matrix.json \
  --md-out temp/route-matrix.md
```

Notes:
- Requires a working Django environment (`manage.py` imports must succeed).
- Requires Node (`node` or `nodejs`) to read the frontend endpoint manifest.
- The check focuses on route existence/path drift (404 prevention), not full request validation semantics.

## Useful Flags

- `--allow-missing-prefix auth.`: ignore a frontend namespace temporarily
- `--backend-manifest path.json`: compare against a pre-exported backend manifest
- `--frontend-manifest path.json`: compare against a pre-exported frontend manifest
- `--node-bin nodejs`: use alternate Node binary name

