# Feature tracking for production readiness

This directory is the authoritative production-readiness tracker for
`lx-annotate` and its LuxNix deployment contract. It is based on the tracker in
the `endoreg_db` source repository.

A percentage communicates progress; it is not a release approval. A feature is
`PRODUCTION_READY` only when every required criterion is `verified` with stable
evidence and an identified assessor.

## Commands

Run commands from the repository root:

```bash
./feature-tracking/tracker.py
./feature-tracking/tracker.py overview --all
./feature-tracking/tracker.py show lx_annotate_pressing_issues
./feature-tracking/tracker.py show luxnix_pressing_issues
./feature-tracking/tracker.py validate
./feature-tracking/tracker.py check lx_annotate_pressing_issues
```

`check` exits with status `1` until all required criteria for the selected
feature are verified. Invalid YAML, policy violations, and unsafe verification
commands exit with status `2`.

## Updating assessments

Record manual evidence through the tracker:

```bash
./feature-tracking/tracker.py update lx_annotate_pressing_issues \
  production_secret_contract \
  --status verified \
  --assessed-by "reviewer@example.org" \
  --evidence test "tests/system/test_settings.py"
```

Record a blocker with an explicit reason:

```bash
./feature-tracking/tracker.py update luxnix_pressing_issues \
  eager_runtime_directory_contract \
  --status blocked \
  --assessed-by "operator@example.org" \
  --note "Clean-boot acceptance has not been completed"
```

Reset an assessment when its evidence is no longer valid:

```bash
./feature-tracking/tracker.py update lx_annotate_pressing_issues \
  production_secret_contract \
  --status not_assessed
```

Command-based criteria can run without modifying YAML:

```bash
./feature-tracking/tracker.py verify lx_annotate_pressing_issues automated_quality_gates
```

Add `--update --assessed-by ...` only when the result should update the
assessment. Updates use the canonical atomic file-operation wrapper.

## Assessment states

- `not_assessed`: no durable assessment has been recorded.
- `in_progress`: implementation or verification is underway.
- `blocked`: a named blocker prevents completion.
- `verified`: all acceptance statements are satisfied and evidence is recorded.

Clinical and security criteria do not receive implicit exemptions. A genuinely
optional criterion must use `required: false` and be explicitly reviewed as
such.

## Evidence

Evidence must be stable and reviewable. Suitable references include tests,
reproducible commands, code locations, reviewed documents, runbooks,
monitoring dashboards, and deployment demonstrations. “Works locally” or a
percentage without supporting evidence is insufficient.

Verification commands are represented as argument lists and execute without
shell expansion.

## Completion and reopening

A feature can be marked done only after all required criteria are verified:

```bash
./feature-tracking/tracker.py done lx_annotate_pressing_issues \
  --assessed-by "release-owner@example.org" \
  --note "Approved for the 2026-08 production release"
```

New requirements reopen a completed feature and reset the named criterion:

```bash
./feature-tracking/tracker.py reopen lx_annotate_pressing_issues \
  production_secret_contract \
  --assessed-by "security-owner@example.org" \
  --note "Secret rotation contract changed"
```

Do not create parallel completion trackers. Architecture and operational
documents may remain as references, but readiness state and evidence belong in
these YAML definitions.

## Multi-agent orchestration contracts

Use multiple workers only for independently executable branches. Sequential or
interdependent work stays in one context-rich agent. Every run is described by
a strict JSON contract that selects `single_agent` or
`centralized_multi_agent`, identifies one orchestrator, caps workers at four,
caps each worker at one or two turns, and limits the total token budget to
50,000. Parallel plans require at least two non-blocking root work units;
dependency chains cannot be mislabeled as parallel work.

Each work unit has one responsibility and returns only a schema-validated
result containing `task_status`, sourced `findings`, confidence, and explicit
`gaps`. Workers report to the named orchestrator; the contract does not model a
peer-to-peer mesh.

Centralized plans must also select one typed execution backend:

- `native_subagent` delegates bounded work to child threads owned by the current
  Codex session. An optional `agent_profile` names a built-in or configured
  custom agent. Project custom-agent files live under `.codex/agents/` and must
  define `name`, `description`, and `developer_instructions`; model and sandbox
  settings are optional overrides.
- `external_codex_exec` delegates to processes managed by an external
  orchestrator. The contract permits only `read-only` or `workspace-write`
  sandboxes and fixes the non-interactive approval policy to `never`. Launchers
  must use `codex exec --sandbox <mode> --ask-for-approval never`; plain
  interactive `codex` invocation is not a headless worker contract.

Native subagents inherit the parent session's permission boundary. External
workers remain subject to the same feature locks, stable owner identity,
structured results, token allocation, and checkpoints as native workers.
Neither backend permits peer-to-peer delegation or silently launches work while
validating a contract.

Validate a plan before delegation:

```bash
./feature-tracking/tracker.py orchestration validate run-contract.json
```

Persist stage boundaries with the atomic checkpoint command. A work unit moves
from `pending` to `in_progress`, then to `complete` or `blocked`; blocked work
may resume. Repeating the same checkpoint is idempotent, while invalid
transitions fail loudly. Completed and blocked checkpoints require a matching
worker-result JSON file.

```bash
./feature-tracking/tracker.py orchestration checkpoint run-contract.json audit_api \
  --status in_progress
./feature-tracking/tracker.py orchestration checkpoint run-contract.json audit_api \
  --status complete --result-file audit-api-result.json
```
