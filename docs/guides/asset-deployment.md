# Frontend Asset Deployment Contract

This guide defines the deployment contract for Vite assets in `lx-annotate`.

## Canonical Ownership

- `frontend/src/assets/` owns source assets imported by the Vue application.
- `static/` owns non-Vite Django source assets and the published documentation
  tree under `static/docs/`.
- `staticfiles/` is disposable deployment output produced by Vite,
  `collectstatic`, and `docs-publish`; it is ignored by Git and packaged only
  after regeneration.

Do not create package-local copies under `lx_annotate/static/` or
`lx_annotate/staticfiles/`. Django and third-party application assets are
collected from their installed packages, while the generated top-level
`staticfiles/` tree is force-included in release artifacts.

Vite's dependency cache under `frontend/.vite/` is local and ignored. Legacy
dashboard bundles under `static/assets/` must not be restored; the maintained
dashboard source is imported from `frontend/src/assets/` and emitted by Vite.

## Contract Summary

1. Build output directory:
`frontend/vite.config.ts` writes compiled assets to:
`<repo>/staticfiles`

2. Manifest location:
Vite manifest must exist at:
`staticfiles/.vite/manifest.json`

3. Django Vite config:
- Dev: `lx_annotate/settings/settings_dev.py` reads `BASE_DIR/staticfiles/.vite/manifest.json`
- Prod: `lx_annotate/settings/settings_prod.py` reads `STATIC_ROOT/.vite/manifest.json`

4. Runtime startup guard:
`devenv/management.nix` validates:
- manifest exists at `"$static_root/.vite/manifest.json"`
- `src/main.ts` entry resolves to a file that exists at `"$static_root/$entry_file"`

## Deployment Flow

1. Build frontend:
`devenv shell -- vue-build`

2. Verify manifest contract:
`make verify-vite-manifest`

3. Build distributable artifacts:
`make package`

`make package` forces a frontend rebuild, checks that committed frontend artifacts
did not drift, publishes Sphinx HTML into `static/docs` and `staticfiles/docs`,
and then fails if `staticfiles/.vite/manifest.json` is empty, invalid JSON,
missing the `src/main.ts` entry, or points at a missing asset. This prevents
stale or broken frontend artifacts from reaching wheel or sdist packaging and
ensures the frontend `/documentation` page can load the packaged docs bundle.

## Why `emptyOutDir` Is Disabled

`vite.config.ts` uses `emptyOutDir: false` because `staticfiles/` is a mixed
generated directory containing Vite output plus assets produced by
`collectstatic` and `docs-publish`. Auto-emptying this directory would risk
deleting output owned by the other build stages.

## Smoke Tests

Run these checks after deployment changes:

1. Manifest exists:
`ls -l staticfiles/.vite/manifest.json`

2. Legacy folder is gone:
`test ! -d staticfiles/dist`

3. Entry mapping is valid:
`python - <<'PY'
import json
from pathlib import Path
m = json.loads(Path('staticfiles/.vite/manifest.json').read_text())
entry = m['src/main.ts']['file']
print(entry, (Path('staticfiles') / entry).exists())
PY`

## Frame Annotation Integration Note

Frame annotation is rendered directly by
`frontend/src/views/FrameAnnotation.vue` without third-party runtime widget
scripts. Keep `lx_annotate/templates/base.html` free of ad-hoc global script
includes.
