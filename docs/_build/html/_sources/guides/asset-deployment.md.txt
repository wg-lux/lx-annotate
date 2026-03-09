# Frontend Asset Deployment Contract

This guide defines the deployment contract for Vite assets in `lx-annotate`.

## Contract Summary

1. Build output directory:
`frontend/vite.config.ts` writes compiled assets to:
`<repo>/static`

2. Manifest location:
Vite manifest must exist at:
`static/.vite/manifest.json`

3. Django Vite config:
- Dev: `lx_annotate/settings/settings_dev.py` reads `BASE_DIR/static/.vite/manifest.json`
- Prod: `lx_annotate/settings/settings_prod.py` reads `STATIC_ROOT/.vite/manifest.json`

4. Runtime startup guard:
`devenv/management.nix` validates:
- manifest exists at `"$static_root/.vite/manifest.json"`
- `src/main.ts` entry resolves to a file that exists at `"$static_root/$entry_file"`

## Deployment Flow

1. Build frontend:
`devenv shell -- vue-build`

2. Verify committed artifacts:
`devenv tasks run deploy:verify-vite-artifacts --no-tui`

3. Apply Django migration/static pipeline:
`devenv tasks run deploy:full --no-tui`

The verification task fails if building the frontend changes tracked files under `static/`.
This prevents stale or missing frontend artifacts from reaching runtime.

## Why `emptyOutDir` Is Disabled

`vite.config.ts` uses `emptyOutDir: false` because `static/` is a mixed directory
containing both Vite output and non-Vite assets (for example, framework/static content).
Auto-emptying this directory would risk deleting non-Vite files.

## Smoke Tests

Run these checks after deployment changes:

1. Manifest exists:
`ls -l static/.vite/manifest.json`

2. Legacy folder is gone:
`test ! -d static/dist`

3. Entry mapping is valid:
`python - <<'PY'
import json
from pathlib import Path
m = json.loads(Path('static/.vite/manifest.json').read_text())
entry = m['src/main.ts']['file']
print(entry, (Path('static') / entry).exists())
PY`

## Label Studio Integration Note

Label Studio is loaded by the Vue wrapper component
`frontend/src/components/EndoAI/LabelStudioHost.vue` via CDN at runtime.
Do not duplicate a global Label Studio script include in `lx_annotate/templates/base.html`.
