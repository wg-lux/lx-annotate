# Runtime environment migration and rollback record

## Scope

This change reduces the Secretspec environment by the agreed removal subset,
keeps environment variables that still have runtime consumers, and verifies the
ownership boundary between LuxNix and the packaged LX-Annotate runtime.

The 29 deployment inputs in `REQUIRED_HOST_ENVIRONMENT_KEYS` remain available
in the default Secretspec profile. Application-owned derived paths, development
and test controls, and other values with confirmed consumers also remain
declared. They are not part of the host-only subset, but removing them before
their consumers are migrated would break the development or test runtime.

The following unused entries were removed:

- `DJANGO_CORS_ALLOWED_HOSTS`
- `ENABLE_FILE_WATCHER`
- `ENDOSCOPY_PROCESSOR_NAME`
- `EXPORT_OUTPUT_DIR`
- `HF_HOME`
- `HF_HUB_CACHE`
- `HF_HUB_ENABLE_HF_TRANSFER`
- `OLLAMA_KEEP_ALIVE`
- `OLLAMA_MODELS`
- `SECRETSPEC_PROFILE`
- `TRANSFORMERS_CACHE`

The following inline-secret entries were removed:

- `DJANGO_DB_PASSWORD`
- `DJANGO_SECRET_KEY`
- `DJANGO_SALT`
- `LX_ANNOTATE_MASTER_KEY`
- `OIDC_RP_CLIENT_SECRET`
- `SECRET_KEY`

Runtime secrets now use `DJANGO_DB_PASSWORD_FILE`,
`DJANGO_SECRET_KEY_FILE`, `DJANGO_KEYCLOAK_CLIENT_SECRET_FILE`, and
`LX_ANNOTATE_MASTER_KEY_FILE`. No secret contents are printed by the tests.

## Changed files

### `secretspec.toml`

- Removes the eleven unused entries and six inline-secret entries listed
  above.
- Retains host-owned deployment values and still-consumed application,
  development, test, video, watcher, and compatibility settings.
- Retains the development and production profile overrides.

### `devenv.nix`

- Uses `nix/runtime-environment.nix` to derive application-owned storage and
  URL values.
- Uses guarded Secretspec lookups with explicit development defaults, so the
  removal subset no longer causes evaluation failures.
- Exports secret-file handles instead of recreating plaintext secrets.
- Continues to allow local `.env.systemd` overrides for development.

### `nix/runtime-environment.nix`

- Declares application-owned and host-owned environment names separately.
- Classifies all literal Python runtime consumers found by the AST audit,
  including Hub export/mTLS policy, Hub queue settings, upload limits,
  `DJANGO_DEBUG`, and the OIDC token endpoint.
- Derives application-owned storage roots and the LX-DTypes registry/import
  paths from the canonical data directory.

### `lx_annotate/settings/settings_prod.py`

- Keeps the upstream Keycloak settings bundle, but sources
  `OIDC_RP_CLIENT_SECRET` from the validated local `AppConfig`. This prevents
  the upstream module from overwriting a secret loaded through
  `DJANGO_KEYCLOAK_CLIENT_SECRET_FILE` with an empty value.

### `tests/system/test_secretspec_environment_contract.py`

- Asserts that all required host inputs and all confirmed consumers remain
  declared.
- Asserts that the unused removal subset and inline secrets stay absent.
- Parses `nix/runtime-environment.nix` and verifies host ownership.
- Uses Python's AST to collect literal `os.getenv`, `os.environ.get`,
  `os.environ.setdefault`, `os.environ.pop`, and `os.environ[...]` accesses
  under `lx_annotate`; every discovered key must be classified as app-owned,
  host-owned, process-internal, or a forbidden legacy inline secret.

### `tests/system/test_focused_coverage.py`

- Makes the production missing-secret branch independent of the development
  shell's `DJANGO_DEBUG` value.
- Changes the LuxNix-style production fixture to deliver Django, database, and
  OIDC secrets through files and verifies that production settings consume
  them.

### `nix/tests/service_vm_test.nix`

- Reads the evaluated `lx-annotate.service` environment with `systemctl show`.
- Parses systemd quoting with `shlex` and reports missing and empty variables
  without printing values.
- Enables migrations against a local SQLite database so the packaged service
  can pass its fail-closed schema readiness check.
- Exercises packaged recovery, the strict lx-dtypes knowledge-base bootstrap,
  Hub provisioning, storage-relief, and acceptance command entry points.

## Verification commands and results

Formatting and static checks:

```console
nixfmt --check devenv.nix nix/runtime-environment.nix \
  nix/tests/service_vm_test.nix
devenv shell -- ruff check \
  tests/system/test_secretspec_environment_contract.py \
  tests/system/test_focused_coverage.py \
  lx_annotate/settings/settings_prod.py
git diff --check -- secretspec.toml devenv.nix \
  nix/runtime-environment.nix nix/tests/service_vm_test.nix \
  lx_annotate/settings/settings_prod.py \
  tests/system/test_secretspec_environment_contract.py \
  tests/system/test_focused_coverage.py \
  docs/guides/runtime-environment-contract-test.md
```

All three checks passed on 2026-08-03.

Python environment and branch contracts:

```console
devenv shell -- pytest -q \
  tests/system/test_secretspec_environment_contract.py \
  tests/system/test_environment_checks.py \
  tests/system/test_runtime_check_bundle_contract.py \
  tests/system/test_focused_coverage.py
```

Result: **51 passed**.

Nix runner build:

```console
nix build .#checks.x86_64-linux.nixtest --no-write-lock-file
```

Result: passed.

NixOS VM execution:

```console
result/bin/nixtests:run --no-color --workers 1 \
  --skip packaged-runtime-entrypoints-are-pure
```

The latest run did not reach the VM environment assertion. The frontend
derivation failed first because the workspace `frontend/package-lock.json`
contains package version `0.9.52`, while the fixed-output NPM dependency copy
contains `0.0.0`; Nix reports `npmDepsHash is out of date`. This packaging
metadata mismatch is outside this environment migration and was not modified.
An earlier VM run, before that unrelated workspace change, reached the service
and passed the missing/non-empty environment assertion, but it is not treated
as verification of the latest complete working tree.

LuxNix evaluation remains independently blocked before an individual service
environment can be returned: the current LuxNix module graph either supplies a
set where `services.lx-annotate.extraEnv` expects a list or, with a filtered
current checkout, references the missing `services.luxnix.endoAi` option.
LuxNix files were not changed as part of this work.

## Rollback

Revert only the following scoped changes; do not reset the repository because
the worktree contains unrelated user changes.

1. In `secretspec.toml`, restore the eleven unused entries and six inline-secret
   declarations listed in **Scope** if the old contract is intentionally
   required.
2. In `devenv.nix`, restore direct Secretspec lookups, plaintext secret exports,
   legacy storage-path exports, and the previous shell-hook directory lookups.
3. In `nix/runtime-environment.nix`, remove the added ownership classifications,
   `LX_DTYPES_KB_REGISTRY` output, and the shared app-/host-owned environment
   helper usage introduced by this migration.
4. In `lx_annotate/settings/settings_prod.py`, restore
   `OIDC_RP_CLIENT_SECRET = KEYCLOAK.OIDC_RP_CLIENT_SECRET`.
5. Delete `tests/system/test_secretspec_environment_contract.py`.
6. In `tests/system/test_focused_coverage.py`, restore the three inline-secret
   fixture variables, remove their temporary secret files, and remove the
   explicit `DJANGO_DEBUG` cleanup from the missing-secret test.
7. In `nix/tests/service_vm_test.nix`, remove
   `requiredServiceEnvironmentVariables`, the `systemctl show` parsing and
   assertions, the SQLite migration fixture, and the operational-command VM
   test.
8. Delete this document and rerun the verification commands above.
