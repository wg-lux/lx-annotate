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

4. Shared release and acceptance guard:
`lx_annotate_assets` validates the `src/main.ts` entry point, every manifest
file/CSS/asset reference, and all static and dynamic import targets. Referenced
files must be readable and nonempty. Absolute paths, traversal, and symlinks
escaping the static root are rejected. It never creates or repairs assets.

The package uses only the Python standard library and does not import
`lx_annotate`, Celery, Django, settings, or secrets. This keeps discovery output
independent of application startup logging.

Use the installed command:

```bash
lx-annotate-check-static --installed
lx-annotate-check-static --root /var/lib/lx-annotate/staticfiles
lx-annotate-check-static --wheel dist/lx_annotate-<version>-py3-none-any.whl
```

`--installed` discovers assets from wheel distribution metadata and prints only
the validated directory. Use `--root` for a Nix collected static tree. Root and
wheel checks produce no stdout on success; failures return nonzero and write a
diagnostic without manifest contents to stderr. From a checkout, use
`python lx_annotate_assets/__init__.py --root staticfiles` without installing
application dependencies.

## Deployment Flow

1. Build frontend:
`devenv shell -- vue-build`

2. Verify manifest contract:
`make verify-vite-manifest`

3. Build distributable artifacts:
`make package`

`make package` forces a frontend rebuild, checks that committed frontend artifacts
did not drift, and publishes Sphinx HTML into `static/docs` and `staticfiles/docs`.
Make, CI, the Nix package build, and `runtime_acceptance` share the same validator.

The [Hatch build hook](https://hatch.pypa.io/dev/plugins/build-hook/custom/)
also validates the source static tree before wheel/sdist builds and checks the
finished wheel archive. This covers direct `python -m build` invocations and
wheels rebuilt from an sdist. Editable development installs skip the release
gate because they can precede frontend compilation. A failed build must not be
published, even if its output directory contains a rejected artifact.

These checks establish static asset integrity and readability, not Django
readiness, TLS reachability, or database migration compatibility. Validate the
installed tree as the service user before copying it into the served directory.

## Regression Tests

Run the dependency-free checker and packaging tests, as CI does:

```bash
uv run --no-sync --no-project --with pytest --with 'hatchling>=1.29.0' --with editables \
  python -m pytest -q -c /dev/null --noconftest -p no:cacheprovider \
  tests/system/test_static_assets_contract.py
```

The tests cover invalid manifests and paths, missing/empty assets, source and
finished-wheel rejection, sdist-to-wheel rebuilding, editable development installs,
and an installed console command running without application dependencies.
Packaging tests require Hatchling and are explicitly skipped if it is absent
from an ordinary application test environment. Run the command above for full
coverage. Runtime acceptance integration is covered by
`tests/system/test_operational_commands.py`.

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
