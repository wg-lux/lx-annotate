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
