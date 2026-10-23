# Secure Backup and Disaster Recovery

This is the canonical operator runbook for LX-Annotate backup verification and
disaster recovery. It defines the security boundary, approvals, recovery order,
and evidence required for a database-only recovery or a complete application
recovery.

This runbook does not authorize access by itself. It must be used with the
applicable incident procedure, change record, and access-control policy.

## Current Recovery Status

The following evidence was reported on 2026-07-28:

- An encrypted PostgreSQL archive is stored on `gs-02` at
  `/var/backup/postgresql/gc-10/gc-10-postgresql-all-20260728T094044CEST.sql.gz.age`.
- Its recorded size is `35188721` bytes, ownership is `root:root`, mode is
  `0600`, and SHA-256 is
  `1791ef7d8326dcde33b4dafb84609af0e0b914dc806724b9055863d479df8c17`.
- Its outer age decryption and gzip integrity were reported as successfully
  verified on `gs-02`.
- The archive is encrypted to the `gs-02` SSH host identity. Root on a
  surviving `gs-02` can use its local private host identity for decryption.
- An encrypted recovery bundle for the `gs-02` host identities is recorded at
  `/home/admin/.lxv/host-ssh-keys/gs-02/gs-02-ssh-host-keys-20260728.age`.
  Its recorded mode is `0600`, and its SHA-256 is
  `5ac78d6a7895d3dc31fb663d64a7813d4de53c60345b69fa9a4e799158431838`.
  It is encrypted to a separately held operator age identity.

These facts establish a recovery path for the archive's outer encryption. They
do **not** establish complete LX-Annotate recovery:

- application-encrypted database fields still require the correct version of
  the LX-Annotate application master key;
- the PostgreSQL archive does not contain protected video, report, HLS, or
  other managed media; and
- a clean-host, production-like restore has not yet been completed.

Treat the current state as **database-only recovery available, full disaster
recovery blocked**.

## Security Invariants

Every backup and recovery action must preserve these rules:

1. Never transmit the long-lived LX-Annotate application master key over the
   network, store it in application configuration, commit it to version
   control, or expose it in logs, shell history, process arguments, tickets, or
   chat.
2. `NetworkNode.shared_secret` is only for request authentication. It must
   never encrypt backup payloads or keys.
3. Use mTLS for node-to-node communication when the deployment profile
   requires it. Missing mTLS is a hard failure, not permission to fall back.
4. Raw media export is prohibited. Raw media must not be sent through the hub
   export path or copied off-node merely because the copy is encrypted.
5. A standalone permitted artifact that leaves its local storage boundary must
   use envelope encryption: a new per-transfer Data Encryption Key encrypts the
   payload and the receiving hub's public key wraps that key.
6. Private recovery identities must not be stored in plaintext beside the
   archives they decrypt. Recovery must not depend on one unescrowed host or
   operator identity.
7. Application-managed filesystem restores must use the typed wrappers in
   `endoreg_db.utils.file_operations`, atomic replacement, and structured JSON
   logging. Do not use ad hoc `cp`, `mv`, `rsync`, or `shutil` operations to
   mutate managed storage.
8. An inconsistent restore fails closed. Preserve the archive, logs, hashes,
   and database state; mark unrecoverable artifacts `LOST` where the
   application model supports it. Do not guess or silently reconstruct state.

## Recovery Classes

### Database-only recovery

A database-only recovery restores PostgreSQL into an isolated target and
validates its structural integrity. It can recover ordinary relational data
from the demonstrated archive.

It is not complete if application-encrypted fields cannot be decrypted or
managed media cannot be reconciled. Label every resulting environment
`DATABASE-ONLY / NOT FOR CLINICAL USE` until all full-recovery gates pass.

### Full recovery

A full recovery requires all of the following:

- a verified PostgreSQL restore;
- the exact approved application master-key version required by the restored
  data, provisioned through its independent recovery boundary;
- protected media and provenance restored through an approved storage path;
- reconciliation of database references, hashes, storage modes, ownership,
  permissions, reports, and representative playback;
- measured recovery point and recovery time within approved objectives; and
- documented technical, security, operational, and clinical approval.

Absence of any item means the recovery remains incomplete.

## Roles and Authorization

Before any decryption or restore, create an incident or planned-drill record
with:

- incident or change identifier and reason for recovery;
- source archive identifier and intended recovery class;
- named database, LuxNix, LX-Annotate, and security operators;
- clinical owner when restored data could become available for clinical use;
- two-person approval for use of an escrowed private identity or application
  master-key recovery mechanism;
- exact isolated target host, database instance, and storage boundary;
- expected recovery point and recovery time; and
- an explicit statement that the target is disposable and is not the
  production database.

The requester, approver, and operator should be different people where staffing
permits. Access only the specific identity needed for the approved recovery.
Never attach secrets or decrypted key material to the record.

Stop and escalate to security if authorization, archive provenance, expected
fingerprints, key version, or target isolation is uncertain.

## Phase 1: Preserve and Inspect

Do not alter the source archive, the surviving source backup, or recovery
identities during initial inspection.

On `gs-02`, an authorized root operator may perform read-only metadata checks
against the exact archive path:

```console
stat --format='path=%n size=%s owner=%U group=%G mode=%a' \
  /var/backup/postgresql/gc-10/gc-10-postgresql-all-20260728T094044CEST.sql.gz.age
sha256sum \
  /var/backup/postgresql/gc-10/gc-10-postgresql-all-20260728T094044CEST.sql.gz.age
```

Compare the output exactly with the recorded path, size, owner, group, mode,
and SHA-256 above. Record the command output in the audit record. Do not
"repair" a mismatch. A mismatch means the candidate archive is untrusted:
preserve it, deny restoration, and escalate.

For later archives, obtain expected metadata from the immutable backup-run
record, not from the candidate file itself. Confirm the age recipient
fingerprint against the approved inventory. File names and host names are not
proof of recipient identity.

The encrypted host-identity recovery bundle is needed only if the local
`gs-02` identity is unavailable or the host itself has been lost. Do not open,
copy, rotate, or test that bundle during routine archive inspection.

## Phase 2: Non-Persistent Integrity Check

Use the surviving local `gs-02` private host identity when it is available and
authorized. Decrypt as a stream directly into the gzip integrity checker; do
not write plaintext SQL to disk:

```console
set -o pipefail
age --decrypt --identity /etc/ssh/ssh_host_ed25519_key \
  /var/backup/postgresql/gc-10/gc-10-postgresql-all-20260728T094044CEST.sql.gz.age \
  | gzip --test
```

Run this only from a root session whose auditing and terminal controls are
approved for sensitive recovery. The command contains a private-key *path*,
not private-key material. Do not replace the path with key contents, print the
identity, enable shell tracing, or capture the decrypted stream.

Both processes must succeed. With `pipefail`, a successful gzip command cannot
hide an age failure. Record exit status, archive hash, recipient fingerprint,
operator, host, and time. Do not record decrypted bytes.

If the local host identity is unavailable, stop. Recovery of its encrypted
escrow bundle requires a separately approved two-person procedure on a
disposable, isolated host. Confirm the encrypted bundle hash before use,
compare derived public fingerprints to the approved inventory, keep any
restored private identity root-owned with mode `0600`, and destroy the
disposable recovery environment according to the approved evidence-retention
procedure. This runbook intentionally does not reproduce escrow-opening
commands.

## Phase 3: Restore PostgreSQL into an Isolated Target

The database owner must provision a fresh PostgreSQL instance that:

- is on the explicitly named disposable target;
- has no route, replication link, shared storage, or service discovery entry
  that can affect production;
- accepts connections only from the recovery operators and test application;
- uses encrypted local storage;
- is running a PostgreSQL version compatible with the recorded dump; and
- has enough capacity for the restore plus validation.

Never restore directly into an existing production database. Never use an
ambiguous host alias or default connection. Before restoring, have a second
operator compare the resolved target host, port, and database identity with the
change record.

The demonstrated archive name indicates a compressed SQL archive rather than a
custom-format `pg_restore` archive. After the target has been positively
identified, stream plaintext directly from age and gzip into `psql`:

```console
set -o pipefail
age --decrypt --identity /etc/ssh/ssh_host_ed25519_key \
  /var/backup/postgresql/gc-10/gc-10-postgresql-all-20260728T094044CEST.sql.gz.age \
  | gzip --decompress --stdout \
  | psql --host=ISOLATED_TARGET_FQDN --port=ISOLATED_TARGET_PORT \
      --username=APPROVED_RESTORE_ROLE --dbname=APPROVED_MAINTENANCE_DATABASE \
      --set=ON_ERROR_STOP=on
```

`ISOLATED_TARGET_FQDN`, `ISOLATED_TARGET_PORT`,
`APPROVED_RESTORE_ROLE`, and `APPROVED_MAINTENANCE_DATABASE` are review
placeholders, not defaults. The approved operator must replace each one with
the exact values from the change record and have a second operator verify the
resolved destination before execution. Do not put a database password in this
command, an environment variable, or shell history; use the deployment's
approved peer, certificate, or protected credential mechanism.

Because this is a cluster-wide SQL dump, review it in a controlled validation
process for roles, databases, ownership, and extensions compatible with the
isolated target before the exercise. Do not weaken the target's authentication
or grant broad privileges merely to make the restore pass.

After restore, keep the LX-Annotate application stopped and record:

- PostgreSQL server and dump compatibility information;
- restore start/end times and complete exit status;
- restored database and role inventory;
- extension availability;
- constraint and index validity;
- migration state;
- row-count or domain-specific consistency checks approved by the database
  owner; and
- all warnings and errors.

A structurally valid restore completes only the database-only portion.

## Phase 4: Recover the Application Master-Key Boundary

The database archive's age recipient identity and the LX-Annotate application
master key serve different purposes. The `gs-02` SSH host identity opens the
outer backup archive; it cannot decrypt application-encrypted database fields
or managed files.

Full recovery therefore requires the independently escrowed version of the
application master key that corresponds to the restored data. Its recovery
mechanism must be one of:

- an approved KMS or Vault workflow using machine identity and audited
  authorization; or
- an independently encrypted offline escrow with documented custody and
  two-person access.

The key must be provisioned locally to the isolated application node through
that approved boundary. It must never cross the network, be entered on a
command line, or be copied into an LX-Annotate configuration file. Record only
the key identifier/version, custody approvals, provisioning result, and audit
event identifier—never the key value.

Start the isolated application only after provisioning. Run the project's
approved non-mutating verification for representative encrypted fields and
encrypted managed objects. If the key is unavailable, its version is
uncertain, or any authentication check fails, stop. Do not try candidate keys,
replace encrypted values, or generate a new key as a recovery fallback. The
environment remains database-only and unsuitable for clinical use.

No independently verified application-master-key recovery path is currently
recorded. This phase is a blocking gate, not a claim that the mechanism already
exists.

## Phase 5: Restore Protected Media

Classify each required media class before recovery:

- raw source media;
- anonymized processed media;
- reports and derived artifacts;
- HLS or playback artifacts; and
- workflow and provenance records.

Raw media export remains prohibited. A raw-media recovery source must remain
inside an approved local encrypted-storage boundary; do not send it through
the anonymized hub-transfer path or treat payload encryption as
anonymization. If complete recovery after loss of that local boundary is a
requirement, security and clinical owners must first approve an architecture
that satisfies the raw-export prohibition. Until then, that disaster scenario
is explicitly unrecoverable.

Permitted anonymized processed media leaving the local boundary must use the
phase-appropriate envelope-encryption path. Transport encryption such as mTLS
does not replace payload encryption for standalone files or blobs.

Restore application-managed files only through a reviewed, typed restore tool
that uses `endoreg_db.utils.file_operations`, atomic replacement, typed
`VideoStorageMode` routing, validated persisted provenance schemas, and
structured JSON mutation logs. There is no approved generic copy command in
this runbook. If that restore tool is unavailable, stop and keep the media
criterion blocked.

For every restored object, retain and verify:

- database identifier and expected storage mode;
- source and destination storage identity;
- ciphertext and, where policy permits, content hashes;
- size, ownership, mode, and provenance;
- atomic-publish result; and
- final state, including `LOST` for an object that cannot be recovered
  consistently.

Do not infer that media exists from a database row alone, and do not mark
missing or hash-mismatched content as recovered.

## Phase 6: Reconcile and Approve

Reconciliation is mandatory and must be reproducible. Compare:

- restored database media references against restored objects;
- object hashes, sizes, ownership, permissions, and `VideoStorageMode`;
- application-encrypted fields using the approved verification path;
- reports and workflow provenance against validated schemas;
- representative anonymized playback and report access;
- expected `LOST` records and orphaned objects; and
- restored timestamp against the approved recovery point objective.

Run read-only application and integration tests before enabling writes. Keep
outbound transfer disabled during validation. Any inconsistency fails the
recovery closed; preserve evidence and return to the responsible phase.

Technical success does not authorize clinical use. Database, application,
security, operations, and clinical owners must sign the final disposition. The
disposition must be exactly one of:

- `DATABASE-ONLY / NOT FOR CLINICAL USE`;
- `FULL RECOVERY APPROVED`;
- `RECOVERY FAILED / EVIDENCE PRESERVED`; or
- `ARTIFACTS LOST`, with the affected identifiers recorded.

## Audit Record

Each drill and real recovery must record:

- incident/change identifier, recovery class, and reason;
- requester, approvers, operators, and role separation;
- archive path, immutable backup-run identifier, recorded and observed hash,
  size, mode, owner, and recipient fingerprint;
- target host and database identifiers and proof of isolation;
- commands or automation version used, start/end times, and exit results;
- application master-key identifier/version and external audit event, without
  secret material;
- media classes, counts, hashes, storage modes, and reconciliation results;
- recovery point and measured recovery time;
- errors, exceptions, escalations, and `LOST` artifacts;
- cleanup and access-revocation evidence; and
- final disposition and owner approvals.

Logs must be structured JSON where automation performs filesystem mutations.
Redact secret values and decrypted data, but do not suppress failures or remove
evidence needed for investigation.

## Cleanup, Rotation, and Retention

After the final disposition:

1. Revoke temporary access and stop the isolated application.
2. Preserve required logs, hashes, approvals, and failure evidence.
3. Confirm that no plaintext SQL, key material, shell trace, terminal capture,
   or transfer temporary remains. Use the approved host cleanup procedure; do
   not run broad recursive deletion commands.
4. Retain or dispose of the isolated encrypted target according to the
   approved clinical retention and incident policy.
5. Confirm that source archives remain governed by the approved retention and
   legal-hold policy. Successful restore is not permission to delete a source.

Rotate a backup recipient or recovery identity only through a planned,
two-person change. Before retiring an old identity:

- inventory every retained archive encrypted to it;
- create and verify replacement encrypted copies without persistent plaintext;
- record old and new public fingerprints and hashes;
- complete a disposable restore exercise with the replacement identity; and
- retain or revoke the old identity according to archive retention and
  compromise policy.

Application master-key rotation is a separate application and KMS/Vault
procedure. Never bundle it with SSH host-key rotation, and never delete an old
key version while retained data still depends on it.

## Incident Escalation

Immediately stop recovery and notify the security incident lead when:

- an archive hash, size, ownership, mode, or recipient fingerprint differs;
- a key or decrypted data may have appeared in logs, history, arguments,
  tickets, chat, or a temporary file;
- an identity is unavailable, compromised, or of uncertain provenance;
- mTLS or another required transport control is absent;
- the resolved restore target is not the approved isolated target;
- decryption, gzip validation, PostgreSQL restore, application-field
  validation, or media reconciliation fails;
- raw media may have crossed its approved storage boundary; or
- database and filesystem state disagree.

Preserve affected hosts, encrypted artifacts, audit logs, and observed hashes.
Do not rotate, delete, overwrite, retry with alternate keys, or initiate
production failover until the incident lead and system owners approve the next
action.

## Readiness Gaps

The following must be completed before LX-Annotate can claim full disaster
recovery:

- approve recovery point, recovery time, retention, legal-hold, and ownership
  requirements;
- establish independently recoverable custody for the backup recipient
  identity;
- implement and test the separate application-master-key recovery path;
- implement a compliant protected-media backup and typed atomic restore path;
- automate backup scheduling, verification, retention, structured evidence,
  capacity checks, and alerting; and
- execute this runbook on a clean, isolated, production-like target, including
  negative tests for wrong identity, corrupt archive, missing media,
  interrupted restore, and inconsistent state.

Readiness and evidence are tracked in
`feature-tracking/SecureBackupRecovery.yml`.
