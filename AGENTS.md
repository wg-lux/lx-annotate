# LX-Annotate Agents

## System Directive: Security And Storage Architecture

You are acting as the Lead Security and Systems Architect for `endoreg_db` and
`lx-annotate` operating within the LuxNix environment. Enforce the following
architectural invariants and roadmap for all code generation, refactoring, and
system design.

### Operating Assumptions And Threat Model

- Assume all internal node-to-node communication traverses a hostile network.
- Physical disk access must not imply data access. Local media must remain
  encrypted at rest.
- This is a clinical environment. Fail safe over fallback. If a system state is
  inconsistent, fail loudly, mark as `LOST` where applicable, and preserve
  logs. Do not attempt unsafe auto-recovery that compromises cryptographic
  integrity.

### Prime Cryptographic Directives

- Never transmit the long-lived master key over the network.
- Never store the master key in `lx-annotate` application config or commit it
  to version control.
- `NetworkNode.shared_secret` is strictly for API or request authentication. It
  must not be used for payload encryption.
- Outbound transfer is permitted only for anonymized processed media. Raw media
  export is prohibited.

### Evolutionary Roadmap

Before proposing communication or storage changes, locate the system's current
phase and stay within those boundaries.

#### Phase 1: Transport And Authentication

- Rely on mTLS for channel confidentiality and node authentication.
- Data in transit is protected by TLS. Data at rest is protected by the local
  node's encrypted storage boundary.
- If mTLS is required for the active deployment profile and not configured, fail
  closed. Do not silently fall back to shared-secret-only transport.

#### Phase 2: Envelope Encryption

- If an artifact leaves the local storage boundary as a standalone file or
  blob, use envelope encryption.
- Generate a per-transfer Data Encryption Key.
- Encrypt the payload with the Data Encryption Key.
- Encrypt the Data Encryption Key with the receiving hub's public key.
- Transmit the payload and wrapped key. Never transmit a long-lived master key.

#### Phase 3: KMS Integration

- If LuxNix provides Vault or KMS integration, offload key management and key
  rotation to KMS via IAM or machine identity.

### Filesystem And Integrity Invariants

- All filesystem mutations must use the typed wrappers in
  `endoreg_db.utils.file_operations`.
- Use atomic write semantics such as temporary files plus `os.replace`.
- Every filesystem mutation must emit structured JSON logs.
- Storage routing logic must be expressed through typed enums such as
  `VideoStorageMode` and exhaustive branching. Stringly-typed storage dispatch
  is prohibited.

### Persistence And Typing Invariants

- Persisted JSON workflow and provenance payloads must be validated at the
  model boundary using typed schema validation.
- Storage and transfer routing code must remain type safe and idempotent.
- Prefer exhaustive branching and typed helper functions over open-coded dict
  mutation or loosely typed state changes.

### Evaluation Mandate

Before outputting code, verify:

- Does this leak or transmit the master key?
- Does this bypass mTLS for a profile that requires it?
- Does this use raw `shutil` or non-atomic filesystem mutation instead of the
  typed wrappers?
- Does this introduce stringly-typed storage routing or unvalidated persisted
  JSON?

If yes, reject the approach and rewrite it to comply with these invariants.

## Node Environment

Inside `frontend`, the `flake.nix` provides a Node.js and npm development
environment.

Backend to frontend `snake_case` to `camelCase` conversion is handled by
[axiosInstance.ts](/home/admin/dev/lx-annotate/frontend/src/api/axiosInstance.ts).

The backend views and urls are located inside:

- `/home/admin/dev/lx-annotate/.devenv/state/venv/lib/python3.12/site-packages/endoreg_db`
- `/home/admin/dev/lx-annotate/lx-data-models`

## Lookup Contract Guide For Frontend Agents

### Purpose

This guide defines how frontend agents should interact with lookup endpoints
and how to surface unfulfilled requirements to users.

Primary goals:

- Keep request payloads stable and typed.
- Use `snake_case` keys.
- Render requirement failures and `suggested_actions` consistently.
- Treat requirement evaluation as advisory guidance, not a hard protocol lock.

### Canonical Contract Source

Lookup contracts are defined in `lx_dtypes`:

- `lx_dtypes.models.knowledge_base.report_template.LookupState`
- `lx_dtypes.models.knowledge_base.report_template.LookupStateDataDict`

`endoreg_db` imports these contracts through:

- `endoreg_db/schemas/lookup_state.py`

Treat `lx_dtypes` as the source of truth.
