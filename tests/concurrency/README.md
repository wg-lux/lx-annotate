# Concurrency pytest starter for lx-annotate / endoreg-db

This is a proposed learning and test scaffold, not a verified release or a
replacement state machine. It uses the API reviewed at endoreg-db commit
ff000ca3d4deabf61e8806c5de1ab12b026bf29c and lx-annotate commit
d4a0a0b2a68b52d6833798f4df278d686ba7c2aa. The installed wheel may differ.

Validation performed for this delivery: Python syntax compilation only.
The tests have NOT been executed against your native extension/PostgreSQL.

## Order of work

1. Write operation identity and failure assumptions.
2. Specify safety invariants and liveness obligations separately.
3. Define minimal state variables, guarded events, and intent boundaries.
4. Define transactional ownership and authoritative publication points.
5. Describe recovery for every crash boundary and ambiguous external outcome.
6. Check pure transitions and deterministic histories.
7. Test real database constraints, competing claims, and stale ownership.
8. Test real worker death, broker redelivery, filesystem effects, and restart.
9. Verify built artifacts and migration paths in isolated CI.
10. Measure and raise bounded concurrency only after the preceding checks pass.

## Using this scaffold

Copy the three Python files into the corresponding repository paths after
review. It does not replace pytest.ini or existing tests. It uses the existing
integration marker and pytest-django markers.

Dependencies: the project's complete test environment, pytest, pytest-django,
psycopg, and the real native extension advertising lifecycle_state_v3.

Provision a disposable PostgreSQL service and a test-only role that can create
test databases. Supply CI_PG_HOST, CI_PG_USER, CI_PG_PASSWORD and optionally
CI_PG_PORT. Do not supply production credentials, media mounts, or broker access.
The explicit connection names are conveniences, NOT a security boundary;
network and credential isolation must enforce the separation.

From the repository's test environment:

```bash
pytest tests/contracts/test_operation_lifecycle_contract.py \
  --ds=lx_annotate.settings.settings_test -q

pytest tests/concurrency/test_upload_lease_contract.py \
  --ds=lx_annotate.settings.settings_concurrency_test \
  --migrations --create-db -q
```

The reviewed pytest.ini contains --no-migrations and --reuse-db. The explicit
--migrations flag overrides the former; settings_concurrency_test also replaces
the inherited MIGRATION_MODULES=DisableMigrations() object with {}. Both are
necessary. --create-db rebuilds a reused test database.

The concurrency settings inherit fast-test auth/storage overrides. Use them
only for ownership and schema tests, not full production security acceptance.
A separate artifact lane should run the built production artifacts with
production-equivalent storage/auth behavior and synthetic inputs.

## What these checks establish

- The reducer exposes the required native contract.
- All currently declared state/event pairs match an explicit test table.
- Defined claim paths reduce to running (not that callers are authorized).
- Two claim attempts using separate database connections have one live winner.
- A live owner cannot reacquire its lease using the same owner identifier.
- Expired attempts cannot heartbeat, release, or finalize a replacement epoch.
- Heartbeats renew without changing the epoch.
- Selected constraints are present in a database built from migrations.

The competing-claim test coordinates entry with a Barrier. It does not exhaust
all internal schedules. Future.result timeouts do not kill threads; database
connection/statement/lock timeouts bound normal database waits. Give the CI job
an overall deadline as well. All worker exceptions propagate to the main test.

## Still required before increasing production concurrency

- Content deduplication behavior with a valid, non-null source center, including
  concurrent first insert and invalid/completed artifact reuse policies.
- Filename generation replacement while processing; cleanup must not delete a
  replacement or another attempt's output.
- Independent operations overlap; one busy/unstable candidate cannot block all.
- Retry scheduling, ownership-busy deferral, cancellation/completion races,
  cleanup/import exclusion, and completed-operation redelivery.
- Simulated failures before and after each durable boundary; repeat recovery.
- Actual worker process termination (not merely an exception) in isolated CI.
- Real broker redelivery and durable publication after crash/ack ambiguity.
- Old workers cannot publish/overwrite artifacts after a new epoch wins.
- Failed or unavailable optional segmentation does not block human review.
- Clock-boundary and timing-phase correctness; incomplete killed attempts are
  not counted as successful fast operations.
- Upgrade/mixed-version behavior or an explicitly enforced coordinated rollout.

Do not use mock locks to prove lock correctness, eager Celery to prove broker
behavior, sleeps to cause a race, pytest-xdist alone to exercise shared-row
contention, or production shell access as a release verification requirement.
