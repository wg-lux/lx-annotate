# Hub Transfer Security Review

## Executive summary

The site-to-hub protocol is designed around anonymized processed media, HTTPS
with production mTLS, per-transfer envelope encryption, deterministic transfer
identity, and fail-closed acknowledgement checks. This review found and fixed
one high-severity receipt-validation gap and two cleanup-safety gaps in the
working tree. The live `gc-02` deployment is **not ready for transfer or local
media cleanup**: the intended persistent destination is not a separate mount
and the Hub health unit reports a terminal configuration rejection. No live
media was deleted and no deployment was performed.

## High severity

### HUB-SEC-001: Reconciliation accepted `applied` without validating the envelope receipt

- Rule ID: HUB-SEC-001
- Severity: High
- Location: `lx_annotate/hub/hub_export_reconciliation.py`,
  `reconcile_outbound_transfer_job`
- Evidence: The prior reconciliation path passed a remote status directly to
  `apply_remote_status`; only the direct upload worker validated the typed
  envelope receipt.
- Impact: A malformed or compromised status response could mark a sender job
  complete and cleanup-eligible without locally proving the receiver applied
  the exact encrypted payload.
- Fix: Lines 185-225 now rebuild the persisted replay envelope, validate the
  typed receipt against its authenticated metadata and ciphertext, and reject
  missing or mismatched receipts before completion.
- Mitigation: Local cleanup remains opt-in and dry-run-first. Production mTLS
  and node authentication remain mandatory defense in depth.
- False positive notes: The channel was already authenticated in production,
  but protocol responses are intentionally treated as untrusted.

## Medium severity

### HUB-SEC-002: Verified receipt was not persisted with sender completion

- Rule ID: HUB-SEC-002
- Severity: Medium
- Location: `lx_annotate/models.py`, `OutboundHubTransferJob`;
  `lx_annotate/hub/hub_export_worker.py`, `apply_remote_status`
- Evidence: The prior model retained remote ID and status but discarded the
  validated `HubMediaEnvelopeReceipt`.
- Impact: A later cleanup process had no durable, typed local proof containing
  target identity, recipient key, plaintext digest and size, ciphertext digest,
  and receiver transfer identity.
- Fix: The sender now stores the receipt in a JSON field validated at the model
  boundary, cross-checks it against the job, and requires it for every new
  `applied` transition (worker lines 352-407; model lines 375-427).
- Mitigation: Legacy completed jobs without receipts remain readable but are
  ineligible for the new reaper.
- False positive notes: The receiver ledger may retain equivalent evidence,
  but sender-side cleanup must not depend on unaudited assumptions about it.

### HUB-SEC-003: Cleanup eligibility did not provide a safe reclamation operation

- Rule ID: HUB-SEC-003
- Severity: Medium
- Location: `lx_annotate/hub/hub_export_cleanup.py`
- Evidence: The prior implementation stopped after setting `eligible`; no
  bounded operation reclaimed local processed media.
- Impact: Site storage could continue filling, encouraging unsafe manual file
  deletion outside the typed storage and audit boundaries.
- Fix: Lines 90-314 add bounded dry-run/apply reaping for processed videos. It
  requires the verified receipt, exact digest and plaintext size, the expected
  source and receiver identities, no active lease or processing history, and a
  durable restart marker. Deletion uses the structured endoreg-db file wrapper.
- Mitigation: Raw media and processed reports are never reaped. Apply requires
  an explicit operator flag and remains undeployed.
- False positive notes: This intentionally does not reclaim HLS, frames, raw
  media, or report media; those require separate lifecycle contracts.

## Low severity

### HUB-SEC-004: Invalid cleanup configuration produced a malformed policy value

- Rule ID: HUB-SEC-004
- Severity: Low
- Location: `lx_annotate/hub/hub_export_cleanup.py`,
  `configured_local_cleanup_policy`
- Evidence: The invalid-value fallback indexed the enum string and returned
  `"e"` instead of `retain_processed_media`.
- Impact: Jobs could persist a malformed policy and behave inconsistently,
  although the downstream comparison still failed safe to retention.
- Fix: Line 51 now returns the complete conservative enum value; regression
  coverage proves invalid configuration retains media.
- Mitigation: Django model choice validation also rejects malformed values at
  normal model saves.
- False positive notes: This did not directly authorize deletion.

## Operational blockers

- `gc-02` has approximately 19 GiB free on a 477 GiB encrypted root filesystem
  (96% used).
- `/mnt/endoreg-client-storage` is not a mount point and resolves to the same
  `/dev/mapper/cryptroot` filesystem.
- `lx-annotate-hub-export-health.service` is failed and the tracker records one
  terminal `configuration_rejection`.
- The deployed runtime is the immutable LX-Annotate 1.0.4 Nix closure; this
  working-tree fix is not deployed.

These conditions block any claim that live transfer, local reclamation, or
central-Hub AI acceptance is complete. The safe next production step is to
provision and verify the intended encrypted destination and Hub trust material,
then deploy a reviewed immutable artifact and run positive/negative mTLS,
receipt, cleanup, restart, and central inference acceptance before `--apply`.
