# LX-Annotate Agents
You are working in an existing codebase. Do not guess architecture from filenames alone.

Before editing:
1. Inspect the relevant files and call sites.
2. Identify the existing patterns, helpers, types, tests, and ownership boundaries.
3. State the exact files you intend to change.
4. State what you will not change.

During implementation:
- Prefer existing helpers and libraries over new custom logic.
- Do not add placeholders, fake env vars, fake API keys, mock data, or silent fallbacks unless explicitly requested.
- Do not suppress errors just to make the app run.
- Keep the change minimal and directly tied to the request.
- If a requirement is ambiguous, stop and ask instead of inventing behavior.

After implementation:
1. Run the narrowest relevant verification.
2. Run broader integration checks if the change crosses module boundaries.
3. Report what passed, what failed, and any residual risk.
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

## Video Status Terminology For Frontend Agents

Do not conflate anonymization validation with segment annotation validation.
They are different workflow gates and must be displayed separately.

- `overview[].anonymizationStatus` belongs to the anonymization pipeline.
  `done_processing_anonymization` means processed media exists but still needs
  anonymization validation. `validated` means anonymization was accepted and the
  processed video may be used downstream.
- `videoList.videos[].segmentAnnotationsValidated` means segment review for the
  video is complete. In `VideoExaminationAnnotation`, this should make segment
  editing read-only unless an explicit edit override is active.
- `overview[].annotationStatus` can describe overview/workflow state, but the
  VideoExamination annotation UI should prefer `segmentAnnotationsValidated`
  from the video list when deciding whether segment editing is allowed.
- The `VideoExaminationAnnotation` dropdown should keep anonymized and already
  segment-validated videos selectable for viewing. It should only filter out
  videos whose anonymization is not usable yet.
- Dropdown labels/colors should distinguish at least these states:
  pending anonymization validation, ready for segment annotation, and segment
  annotation already validated. A segment-validated video must not be shown as
  green "ready for processing".

## Annotation Restart And Prediction Segment Notes

- Frame annotation and video segment validation can deliberately write under an
  explicit `annotator` principal. Frontend overrides must be scoped to the
  current base user and annotation target, and must be reversible back to the
  authenticated user.
- Frame annotation task loading must send the active annotator as well as
  submit/skip actions; otherwise another user's restart still consumes the
  original user's lock/exclusion scope.
- Video segment validation creates frame-level annotations from segments. When
  restarting under another annotator, the validation payload must include
  `annotator` so generated `ImageClassificationAnnotation` rows are scoped to
  that annotator.
- The video dropdown can show `validated_annotators` from the backend. Keep it
  as a hint that another annotator already has a validated annotation track;
  do not use it as the sole source of whether editing is locked.
- The `VideoExaminationAnnotation` KI/prediction segment view is fed by
  `LabelVideoSegment` rows marked with `prediction_meta` or source
  `prediction`; the frontend loads them through `source_kind=prediction`.
- Watcher ingest may delete the watched source file as part of successful
  upload-job cleanup. That must not be treated as proof that prediction
  segments already exist; `pipe_1` still needs to run unless the video state and
  prediction-segment rows show the prediction pipeline is complete.
- `VideoState.lvs_created` is not enough by itself when prediction returned
  segment ranges. `pipe_1` must materialize `LabelVideoSegment` rows marked with
  `prediction_meta` or source `prediction`, otherwise the
  `VideoExaminationAnnotation` KI segment view has nothing to load.
- Frontend-triggered KI reruns should replace existing prediction
  `LabelVideoSegment` rows before calling `pipe_1`. Mixing rows from old and new
  model metadata makes the KI segment view ambiguous.
- Hugging Face model selection for video segments should resolve through
  `ModelMeta.setup_default_from_huggingface` and then call `pipe_1` with the
  resolved `model_name` and `model_meta_version`.
- Operational monitoring for `VideoExaminationAnnotation` buttons must follow
  Celery queue routing, not the task registry printed by each worker at startup.
  `KI neu berechnen` calls
  `/api/media/videos/<id>/segments/rerun-predictions/`, dispatches
  `endoreg_db.video_temporal_inference`, and should be monitored on
  `lx-annotate-celery-inference-worker.service` (`inference` queue).
  `Außerhalb-Segmente schwärzen` calls
  `/api/media/videos/<id>/segments/blacken-outside/`, dispatches
  `endoreg_db.video_post_validation_rebuild`, and should be monitored on
  `lx-annotate-celery-frame-extraction-worker.service` (`frame_extraction`
  queue). The generic `lx-annotate-celery-worker.service` is for
  `maintenance,default`; it may list these task names at startup but is not the
  primary consumer for these UI actions.

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
