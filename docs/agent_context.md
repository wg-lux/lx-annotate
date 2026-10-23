# Hierarchical agent context

Start with `../structure.yml`, then follow only the `submodules` relevant to
the task. The graph separates Django orchestration, Vue UI, hub transfer,
frontend API adapters, asset checks, generated contracts, development tooling,
tests, documentation, and feature governance. Small example/configuration
folders stay in the root manifest instead of acquiring artificial tiers.

The 13 manifests live at the repository root and in `lx_annotate`,
`lx_annotate/hub`, `frontend`, `frontend/src/api`, `lx_annotate_assets`, `openapi`,
`devenv`, `nix`, `scripts`, `tests`, `docs`, and `feature-tracking`.

`endoreg_db` owns the shared clinical models, ingestion, and encrypted storage;
`lx_dtypes` owns knowledge-base and lookup schemas. These installed dependencies
are not repository submodules. Backend route mounts and frontend adapters define
their integration boundaries. Hub export must preserve anonymization gates,
typed envelopes, encrypted storage, and required mTLS. Deployment readiness is
governed separately by `feature-tracking/DeploymentSourceHygiene.yml`.

## Schema and paths

Every manifest uses version 1 and the required fields `tier`, `path`, `parent`,
`summary`, `responsibilities`, `boundaries`, `entrypoints`, `dependencies`,
`submodules`, `contracts`, and `tests`. Lists may be empty where appropriate;
responsibilities must contain at least one item. Custom metadata is allowed and
must be preserved when maintaining manifests.

`path` and `dependencies.internal` are repository-relative. All other references
are relative to the containing manifest's directory, including `parent`,
`entrypoints[].file`, `submodules[].path` and `.manifest`, `contracts[].doc`,
and `tests.directory`. Root has `path: .`, `tier: root`, and `parent: null`.
Optional `files` lists record additional source/specification references; custom
`file`, `files`, and `doc` fields are also checked recursively. References must
exist inside the checkout and belong to Git's tracked or nonignored source set.
External dependencies are library/protocol names, not filesystem references.

## Validation and maintenance

Run from the repository root with Python and PyYAML installed (the repository
development environment already supplies it):

```sh
python scripts/lint_structure.py
make lint-structure
python -m pytest tests/system/test_structure_manifests.py -q
pre-commit run structure-manifests --all-files
```

The pre-commit hook installs its own PyYAML dependency. The linter reads Git's
tracked and nonignored untracked file list, without walking media, virtualenvs,
build outputs, or dependency caches. Missing tracked manifests remain errors.
It rejects malformed schemas, duplicate YAML keys, broken or escaping paths,
incorrect parents, duplicate child links, cycles, and unreachable manifests.
`make test`, `make test-real`, and `make lint` require this gate; a repository
graph regression test includes it in ordinary pytest runs as well.

When adding, removing, or renaming source files or changing ownership boundaries,
update the owning manifest in the same changeset. These are architectural maps,
not exhaustive file inventories: record new entrypoints/contracts and changed
responsibilities without listing every implementation file. Validation checks
structural drift; reviewers still verify semantic accuracy and boundary changes.

If delegating work, give each subagent a specific local directory tree, its
ancestor manifests, relevant contracts, and a verification command. Cross-boundary
changes require reading both affected domain manifests. Use targeted searches
inside the selected scope after traversal; do not load the entire repository.
Run the linter before concluding any prompt or submitting a pull request.
