# Media Workflow Frontend Contract

Status: **read path implemented by endoreg_db** (uncommitted at the time of
writing; see `feature-tracking/MediaWorkflowFrontend.yml`). The frontend mirrors
`endoreg_db/views/media/clinical_workflow.py`; if the backend changes, amend
this document and `frontend/src/api/mediaWorkflowApi.ts` together.

State names are the `endoreg_db.services.clinical_lifecycle` enums
(`PrivacyStage`, `AnnotationStage`, `ReleaseStage`, `ClinicalLifecycleEvent`).
The frontend never derives a state or decides a transition.

## Endpoints

Below `/api/`, `snake_case` on the wire (converted to `camelCase` by
`axiosInstance`).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `media/videos/<pk>/workflow/` | Workflow state of one video. |
| GET | `media/pdfs/<pk>/workflow/` | Workflow state of one report. |

| GET | `media/workflow/stages/` | Worklist counts per stage over the caller's centers. |

There is no write endpoint yet. Roles: video items and stage counts need
`video:read`, report items `patient:read`; other centers return 404.

## Stage counts (200)

```json
{ "stages": [{ "stage": "validate", "count": 3, "transient": 1 }], "unmappable": 0 }
```

Stages are always `validate`, `annotate`, `approve_export`, in that order.
`count` waits on a person, `transient` is fed by a system step (poll only while
it is non-zero):

| Stage | `count` | `transient` |
| --- | --- | --- |
| `validate` | privacy `awaiting_validation` | privacy `import_pending`/`importing` |
| `annotate` | annotation `in_progress`, privacy not `failed`/`lost`/`withdrawn` | importing with annotation `not_available` |
| `approve_export` | `raw_purged` + annotation `validated` + `not_released` | same with privacy `validated` (purge pending) |

`unmappable` counts items with inconsistent facts; they are logged, never staged.

## Response (200)

```json
{
  "kind": "video",
  "record_id": 42,
  "privacy": "awaiting_validation",
  "annotation": "not_available",
  "release": "not_released",
  "version": 7,
  "source": "stored",
  "allowed_events": ["anonymization_validated", "correction_requested"]
}
```

- `privacy`: `import_pending`, `importing`, `quarantined`, `awaiting_validation`,
  `validated`, `raw_purged`, `failed`, `lost`, `withdrawn`.
- `annotation`: `not_available`, `in_progress`, `validated`.
- `release`: `not_released`, `export_ready`, `exported`, `dataset_ingested`.
- `source`: `stored` (persisted row) or `projected` (derived from persisted facts,
  no row yet; `version` is 0).
- `allowed_events`: `ClinicalLifecycleEvent` values the reducer accepts in the
  current state. This is **not** a list of events a person may trigger.

Unknown tokens are rejected by the client as a contract violation.

## Response (409)

Inconsistent persisted facts are never mapped to a state:

```json
{ "kind": "video", "record_id": 42, "violations": ["released_before_raw_purge"] }
```

The client raises `WorkflowInvariantError`; the UI must show the item as
inconsistent, not guess a state.

## Open backend dependencies

Reported by endoreg_db; the frontend stays read-only until they close.

- **Write endpoint:** blocked on the contract naming which events a person may
  trigger. System events such as `raw_purged` must never be postable by a user,
  or an item could be marked purged without the deletion happening. The frontend
  renders no event buttons and never derives triggerability from event names.
- **Wiring:** existing services do not call the event function yet (phase 4), so
  the state may be `projected` or lag real changes until then.
- **Stage counts:** implemented (`media/workflow/stages/`); counts follow
  persisted facts until the wiring lands.
- **User-triggerable marker:** not provided; it needs the lx-data-models contract
  to classify events by role. Until then no event is user-postable.
- **Concurrency and database checks:** only a stale-version write is tested, and
  the state columns accept any token at the database level. Clients keep
  rejecting unknown tokens.

## Ownership

| Concern | Owner |
| --- | --- |
| Token vocabulary and transitions | `lx_dtypes` contract / `endoreg_db` reducer |
| Endpoints above | `endoreg_db` |
| Labels (German), progress strip | `lx-annotate` |
