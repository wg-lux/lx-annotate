# Agent Notice

For Codex-style repository-level instructions, prefer
[AGENTS.md](/home/admin/dev/lx-annotate/AGENTS.md). This lowercase file is kept
for local compatibility and historical tooling.

# Node Environment

Inside of the folder frontend, the flake.nix provides a node js / npm development environment.
Backend to frontend (snake_case to camelCase) conversion is handled by axiosInstance.ts in the frontend.
The backend views and urls are located inside of /home/admin/dev/lx-annotate/.devenv/state/venv/lib/python3.12/site-packages/endoreg_db and /home/admin/dev/lx-annotate/lx-data-models (git submodule)

# Lookup Contract Guide For Frontend Agents

## Purpose
This guide defines how frontend agents should interact with lookup endpoints and how to surface unfulfilled requirements to users.

Primary goals:
- Keep request payloads stable and typed.
- Use snake_case keys.
- Render requirement failures and `suggested_actions` consistently.
- Treat requirement evaluation as advisory guidance (nag), not a hard protocol lock.

## Canonical Contract Source
Lookup contracts are defined in `lx_dtypes`:
- `lx_dtypes.models.knowledge_base.report_template.LookupState`
- `lx_dtypes.models.knowledge_base.report_template.LookupStateDataDict`

`endoreg_db` imports these contracts through:
- `endoreg_db/schemas/lookup_state.py`

Treat `lx_dtypes` as the source of truth.

Related backend integrations implemented in this thread:
- `lx_dtypes` report-template schema now supports first-class non-finding sections (`patient_data`, `history`) with typed `fields`.
- `endoreg_db` now persists report editor submissions to `PatientExaminationReport`.
- `endoreg_db` derives patient history context from prior `PatientExamination` / `PatientFinding` records.
- `endoreg_db` requirement priors now consume history-derived tokens (read-only).
- `endoreg_db` report persistence evaluates requirements after save and returns advisory guidance (non-blocking).

Prior source order for `candidate_requirement_set_ids`:
1. Typed report-template directed graph contracts from `lx_dtypes` (authoritative).

If no valid graph prior is available, low-confidence/no-prior behavior is expected and backend evaluates all sets.

## Endpoints
Base viewset: `endoreg_db/views/requirement/lookup.py`

1. `POST /lookup/init/`
- Request: `patient_examination_id`, optional `user_tags`
- Response: `{ "token": "<token>" }` (HTTP `201 Created`)

2. `GET /lookup/{token}/all/`
- Response: full typed lookup state.

3. `GET /lookup/{token}/parts/?keys=...`
- Response: typed subset of requested keys.

4. `PATCH /lookup/{token}/parts/`
- Request:
```json
{
  "updates": {
    "selected_requirement_set_ids": [1, 2],
    "selected_choices": {
      "10": { "choice_id": 3 }
    }
  }
}
```
- Response: `{ "ok": true, "token": "<token>" }`

5. `POST /lookup/{token}/recompute/`
- Response:
```json
{
  "ok": true,
  "token": "abc",
  "updates": {
    "requirements_by_set": {},
    "requirement_status": {},
    "requirement_set_status": {},
    "requirement_defaults": {},
    "classification_choices": {},
    "suggested_actions": {}
  }
}
```

## New Report Persistence Endpoints (Thread Additions)
Base viewset: `endoreg_db/views/report/patient_examination_report.py`

1. `POST /patient-examination-reports/save-submission/`
- Persists report payload + normalized findings/indications/patient context.
- Evaluates requirements after persistence (advisory only).
- Accepts optional `selected_requirement_set_ids` to scope requirement guidance.

Example request:
```json
{
  "patient_examination_id": 123,
  "template_name": "star_upper_gi_main",
  "status": "final",
  "editor_payload": {},
  "rendered_text": "Narrative report text...",
  "patient_data": {
    "patient_birth_date": "1975-03-14",
    "patient_gender": "male"
  },
  "indications": [
    {
      "examination_indication_id": 1,
      "indication_choice_id": 2
    }
  ],
  "findings": [
    {
      "finding": "gastroscopy_polyp",
      "classifications": [
        {
          "classification": "lesion_size_mm",
          "classification_choice": 28
        }
      ],
      "interventions": []
    }
  ],
  "selected_requirement_set_ids": [10, 11],
  "expected_version": 2
}
```

Example response (abridged):
```json
{
  "report": { "id": 55, "status": "final", "version": 3 },
  "created": false,
  "warnings": [
    "Requirement guidance: 2 requirement(s) are currently unmet.",
    "Final report saved with guideline deviations. This is advisory-only and does not block clinician workflow."
  ],
  "history_context": { "previous_examinations": [] },
  "requirement_guidance": {
    "advisory_only": true,
    "requirement_status": { "1": false, "2": true },
    "requirement_set_status": { "10": false },
    "suggested_actions": { "1": [{ "type": "add_finding", "finding_id": 7 }] },
    "candidate_requirement_set_ids": [10, 11],
    "candidate_requirement_set_confidence": 0.62
  },
  "persisted_report_artifact_id": 71,
  "persisted_pdf_artifact_id": 412,
  "persisted_artifacts": {
    "full_report_id": 71,
    "pdf_id": 412,
    "pdf_view_url": "https://<host>/api/media/pdfs/412/stream/?type=raw",
    "pdf_download_url": "https://<host>/api/media/pdfs/412/stream/?type=raw&download=1",
    "patient_timeline_url": "https://<host>/api/media/patients/88/timeline/"
  }
}
```

2. `GET /patient-examination-reports/history-context/?patient_examination_id=<id>&limit=5`
- Returns history-derived context built from prior examinations/findings.
- Read-only helper for UI/report composition.

3. `GET|PATCH /patient-examination-reports/segment-frame-selector/?patient_examination_id=<id>[&report_id=<id>]`
- Builds the report frame-selection page state from `LabelVideoSegment` + `Frame`.
- Persists one optional selected frame per segment in `PatientExaminationReport.editor_payload`.
- Also supports attaching a `Finding` (stored/reused through `PatientFinding` + `LabelVideoSegment.patient_findings`).
- `GET` reads `patient_examination_id` / optional `report_id` from query params.
- `PATCH` requires `patient_examination_id` in the JSON body (and accepts optional `report_id` / `template_name`).

GET response highlights:
- `report_id` (auto-created draft report if none existed)
- `storage_key` = `report_segment_frame_selections`
- `results[]` with:
  - `segment_id`
  - `start_frame_number`, `end_frame_number`
  - `selected_frame_number`
  - `selected_frame` (includes `frame_id`, `relative_path`, `timestamp`)
  - `controls.random_frame_number`
  - `controls.step_backward_5_frame_number`
  - `controls.step_forward_5_frame_number`
  - `attached_finding` (preselected next time for this segment/examination)

PATCH body (snake_case) examples:
```json
{
  "patient_examination_id": 123,
  "report_id": 55,
  "segment_id": 9001,
  "action": "random"
}
```

```json
{
  "patient_examination_id": 123,
  "report_id": 55,
  "segment_id": 9001,
  "action": "step",
  "step": 5
}
```

```json
{
  "patient_examination_id": 123,
  "report_id": 55,
  "segment_id": 9001,
  "action": "set",
  "frame_number": 1820,
  "finding_id": 7
}
```

```json
{
  "patient_examination_id": 123,
  "report_id": 55,
  "segment_id": 9001,
  "action": "clear"
}
```

## Production PDF Workflow (Thread Addition)
When `save-submission` is called with `status: "final"`, the backend now attempts to:
- persist a full report artifact (`AnonymExaminationReport`)
- persist a PDF media artifact (`RawPdfFile`)
- return browser-usable URLs for preview/download

Response fields for frontend integration:
- `persisted_report_artifact_id`
- `persisted_pdf_artifact_id`
- `persisted_artifacts.full_report_id`
- `persisted_artifacts.pdf_id`
- `persisted_artifacts.pdf_view_url`
- `persisted_artifacts.pdf_download_url`
- `persisted_artifacts.patient_timeline_url`

Recommended frontend flow after final save:
1. Call `POST /patient-examination-reports/save-submission/` with `status: "final"`.
2. If `persisted_artifacts.pdf_download_url` exists:
1. Trigger browser download via link navigation (`window.open` or hidden `<a>` click).
3. Optionally open `persisted_artifacts.pdf_view_url` in a new tab for preview.
4. Refresh `persisted_artifacts.patient_timeline_url` to show generated `full_report` / `pdf` items.
5. If artifact fields are missing, treat as non-blocking and surface `warnings`.

PDF stream endpoint behavior:
- `GET /api/media/pdfs/{id}/stream/` defaults to inline preview
- add `?download=1` to force browser attachment download
- `type` query param supported: `raw` (default) or `processed`

Patient timeline endpoint (media integration):
- `GET /api/media/patients/{patient_id}/timeline/`
- Returns combined `full_report`, `pdf`, `video` items ordered by normalized timestamp
- Each item includes:
- `timestamp`
- `timestamp_source`
- `timestamp_is_examination_date`
- `linked_patient`
- `pseudo_patient`
- `patient_link_sources`
- Frontend should support both real and pseudo patients via `is_real_person`

## Key Naming Rules
Use:
- `selected_requirement_set_ids`
- `selected_choices`

Avoid:
- `selectedRequirementSetIds`
- `selectedChoices`

## Rendering Unfulfilled Requirements
Use these fields:
- `requirement_status`: map of requirement id -> bool
- `requirement_set_status`: map of requirement set id -> bool
- `suggested_actions`: map of requirement id -> list of action objects
- `candidate_requirement_set_ids`: Markov-prior candidate set IDs
- `candidate_requirement_set_confidence`: confidence score (0.0..1.0)

For report persistence responses (`save-submission`), read the same fields from:
- `requirement_guidance.requirement_status`
- `requirement_guidance.requirement_set_status`
- `requirement_guidance.suggested_actions`
- `requirement_guidance.candidate_requirement_set_ids`
- `requirement_guidance.candidate_requirement_set_confidence`

Recommended UX flow:
1. Show failed sets where `requirement_set_status[set_id] == false`.
1. Use `candidate_requirement_set_ids` only as ranking/scope hints.
1. If `candidate_requirement_set_confidence < 0.35`, treat candidate hints as low confidence.
2. Expand failed requirements where `requirement_status[req_id] == false`.
3. Show suggested actions directly under each failed requirement.
4. Allow one-click action application where possible (for example `add_finding`).
5. Recompute after local change proposals are applied to server state.

## Advisory-Only Requirement UX (Important)
Requirement evaluation in report persistence is intentionally non-blocking.

Interpretation:
- The backend warns when saved content deviates from guideline-driven requirement expectations.
- The backend does **not** block clinicians from saving or finalizing reports solely due to unmet requirements.
- Frontend should present deviations as guidance, not as hard validation errors.

Recommended UI language:
- "Guideline deviation detected"
- "Requirement not met (advisory)"
- "You may proceed if clinically justified"

Do not present as:
- "Save failed"
- "Submission invalid"
- "Protocol violation (blocked)"

## Suggested Action Handling
Current action patterns include:
- `add_finding`
- `edit_patient`

Frontend agent behavior:
- Handle unknown action types defensively.
- Render unknown actions as generic suggestions, not hard failures.
- Log unrecognized action type for telemetry.

## History-Aware Priors (Thread Additions)
Requirement-set prior ranking now uses:
- Current examination name
- Current patient finding names
- History-derived tokens from prior examinations/findings (best-effort)

Notes:
- Priors remain assistive only.
- If history lookup fails, backend falls back to non-history prior behavior.
- `markov_prior_service` remains stateless/read-only (no persistence).

## Error Handling
- `404` on expired/missing token: call `init` again, then resume with new token.
- `400` on invalid payload: validate request keys and value types before retry.
- Keep retry logic idempotent for `recompute`.
- For report save:
- `400` may indicate data-integrity issues (unknown finding/classification/intervention, version conflict), not guideline deviations.
- Guideline deviations are returned in `warnings` / `requirement_guidance`, not as transport errors.

## Agent Advice
- Keep a local typed state mirror matching the lookup contract.
- Treat backend `updates` as partial patches, then merge into local state.
- Never infer field names; use the contract constants/types.
- Prefer strict schema checks at API boundary before mutating UI state.

## Thread Summary (Implemented)
- `lx_dtypes` report-template schema extension:
- `ReportTemplateSection.section_kind` supports `findings | patient_data | history`
- `ReportTemplateSection.fields` supports typed field definitions
- Graph/validator support added for patient/history nodes and field checks
- `endoreg_db` report persistence:
- Added `PatientExaminationReport` model for persisted report artifact + snapshots
- Added transactional `save_report_submission(...)`
- Added report history builder from prior DB records
- Added DRF endpoint `/api/patient-examination-reports/save-submission/`
- Added DRF endpoint `/api/patient-examination-reports/history-context/`
- Requirement integration:
- Added history-aware priors to `markov_prior_service`
- Added advisory requirement evaluation helper in `lookup_service`
- Wired report save endpoint to return non-blocking requirement guidance
- Startup/migration integration:
- Added early `lx-data-models` path bootstrap in `endoreg_db/urls/__init__.py`
- Migration for `PatientExaminationReport` was generated and trimmed to avoid unrelated destructive operations


/**
 * Typed API endpoint contract for endoreg_db routes.
 *
 * Important:
 * - Paths are relative to axios `r()` helper (which prefixes `api/`).
 * - Keep trailing slashes exactly as defined in Django urls.
 */

export type Id = number | string
export type UUID = string

export const endpoints = {
  auth: {
    bootstrap: 'auth/bootstrap',
    publicHome: 'endoreg_db/',
    login: 'login/',
    loginCallback: 'login/callback/',
    conf: 'conf/'
  },

  router: {
    examinations: 'examinations/',
    findings: 'findings/',
    classifications: 'classifications/',
    patientFindings: 'patient-findings/',
    patientExaminations: 'patient-examinations/',
    patientExaminationReports: 'patient-examination-reports/'
  },

  patient: {
    patients: 'patients/',
    patientById: (id: Id) => `patients/${id}/`,
    patientPseudonym: (id: Id) => `patients/${id}/pseudonym/`,
    centers: 'centers/',
    genders: 'genders/',
    patientFindings: 'patient-findings/',
    checkPatientExaminationExists: (id: Id) => `check_pe_exist/${id}/`
  },

  examination: {
    examinationFindings: (examinationId: Id) => `examinations/${examinationId}/findings/`,
    findingClassifications: (findingId: Id) => `findings/${findingId}/classifications/`,
    classificationChoices: (classificationId: Id) =>
      `classifications/${classificationId}/choices/`,

    patientExaminationCreate: 'patient-examinations/create/',
    patientExaminationDetail: (id: Id) => `patient-examinations/${id}/`,
    patientExaminationList: 'patient-examinations/list/',
    patientExaminationClassifications: (examId: Id) =>
      `patient-examinations/${examId}/classifications/`,
    patientExaminationFindings: (examinationId: Id) =>
      `patient-examinations/${examinationId}/findings/`
  },

  report: {
    patientExaminationReports: 'patient-examination-reports/',
    patientExaminationReportById: (id: Id) => `patient-examination-reports/${id}/`,
    patientExaminationReportsByPatientExamination: (patientExaminationId: Id) =>
      `patient-examination-reports/?patient_examination_id=${patientExaminationId}`,
    saveReportSubmission: 'patient-examination-reports/save-submission/',
    segmentFrameSelector: (patientExaminationId: Id, reportId?: Id) =>
      reportId == null
        ? `patient-examination-reports/segment-frame-selector/?patient_examination_id=${patientExaminationId}`
        : `patient-examination-reports/segment-frame-selector/?patient_examination_id=${patientExaminationId}&report_id=${reportId}`,
    reportHistoryContext: (patientExaminationId: Id, limit?: number) =>
      limit == null
        ? `patient-examination-reports/history-context/?patient_examination_id=${patientExaminationId}`
        : `patient-examination-reports/history-context/?patient_examination_id=${patientExaminationId}&limit=${limit}`
  },

  upload: {
    upload: 'upload/',
    uploadStatus: (id: UUID) => `upload/${id}/status/`
  },

  requirements: {
    lookup: 'lookup/',
    evaluateRequirements: 'evaluate-requirements/'
  },

  stats: {
    examinations: 'examinations/stats/',
    videoSegment: 'video-segment/stats/',
    videoSegments: 'video-segments/stats/',
    sensitiveMeta: 'video/sensitivemeta/stats/',
    general: 'stats/'
  },

  anonymization: {
    itemsOverview: 'anonymization/items/overview/',
    current: (fileId: Id) => `anonymization/${fileId}/current/`,
    start: (fileId: Id) => `anonymization/${fileId}/start/`,
    status: (fileId: Id) => `anonymization/${fileId}/status/`,
    validate: (fileId: Id) => `anonymization/${fileId}/validate/`,
    pollingInfo: 'anonymization/polling-info/',
    clearLocks: 'anonymization/clear-locks/',
    hasRaw: (fileId: Id) => `anonymization/${fileId}/has-raw/`
  },

  mediaManagement: {
    status: 'media-management/status/',
    cleanup: 'media-management/cleanup/',
    forceRemove: (fileId: Id) => `media-management/force-remove/${fileId}/`,
    resetStatus: (fileId: Id) => `media-management/reset-status/${fileId}/`
  },

  media: {
    patientTimeline: (patientId: Id) => `media/patients/${patientId}/timeline/`,
    sensitiveMediaId: (pk: Id, mediaType: string) => `media/sensitive-media-id/${pk}/${mediaType}/`,

    videos: 'media/videos/',
    videoDetail: (pk: Id) => `media/videos/${pk}/details/`,
    videoStream: (pk: Id) => `media/videos/${pk}/stream/`,
    videoReimport: (pk: Id) => `media/videos/${pk}/reimport/`,
    exportAnnotated: 'media/videos/export-annotated/',

    videoCorrection: (pk: Id) => `media/videos/video-correction/${pk}`,
    videoMetadata: (pk: Id) => `media/videos/${pk}/metadata/`,
    videoApplyMask: (pk: Id) => `media/videos/${pk}/apply-mask/`,
    videoRemoveFrames: (pk: Id) => `media/videos/${pk}/remove-frames/`,
    videoLabelsList: 'media/videos/labels/list/',

    segmentsCollection: 'media/videos/segments/',
    segmentsStats: 'media/videos/segments/stats/',
    videoSegments: (pk: Id) => `media/videos/${pk}/segments/`,
    videoSegmentDetail: (pk: Id, segmentId: Id) => `media/videos/${pk}/segments/${segmentId}/`,
    videoSegmentValidate: (pk: Id, segmentId: Id) =>
      `media/videos/${pk}/segments/${segmentId}/validate/`,
    videoSegmentsValidateBulk: (pk: Id) => `media/videos/${pk}/segments/validate-bulk/`,
    videoSegmentsValidationStatus: (pk: Id) =>
      `media/videos/${pk}/segments/validation-status/`,

    ensureSegmentAnnotationsForVideo: (pk: Id) =>
      `media/videos/${pk}/ensure-segment-annotations/`,
    ensureSegmentAnnotationsBulk: 'media/videos/ensure-segment-annotations/',

    videoSensitiveMetadata: (pk: Id) => `media/videos/${pk}/sensitive-metadata/`,
    videoSensitiveMetadataVerify: (pk: Id) => `media/videos/${pk}/sensitive-metadata/verify/`,

    pdfSensitiveMetadata: (pk: Id) => `media/pdfs/${pk}/sensitive-metadata/`,
    pdfSensitiveMetadataVerify: (pk: Id) => `media/pdfs/${pk}/sensitive-metadata/verify/`,
    sensitiveMetadataList: 'media/sensitive-metadata/',
    pdfSensitiveMetadataList: 'media/pdfs/sensitive-metadata/',

    pdfs: 'media/pdfs/',
    pdfDetail: (pk: Id) => `media/pdfs/${pk}/`,
    // Inline view by default. Add query params manually for mode control:
    // ?type=raw|processed&download=1 (download forces attachment)
    pdfStream: (pk: Id) => `media/pdfs/${pk}/stream/`,
    pdfReimport: (pk: Id) => `media/pdfs/${pk}/reimport/`
  }
} as const

export type ApiEndpoints = typeof endpoints


# Frontend Reporting Pages Design (Backend-Aligned)

## Purpose
Define a new page-based frontend design for the current reporting workflow so it matches the existing `endoreg_db` backend capabilities and contracts.

This document is based on:
- Current reporting frontend (single large assisted-reporting flow)
- `docs/frontend_agent_lookup_contract.md`
- `docs/frontend_agent_url_contract.md`
- Current DRF routes and actions in `endoreg_db`

## Why Redesign
The current reporting UI combines too many responsibilities in one screen:
- patient selection
- patient examination creation
- lookup session lifecycle
- template inspection
- requirement set selection
- finding entry/classification
- requirement issue review
- report save/finalization

This increases coupling, makes session recovery harder, and mixes read-only review pages with write-heavy workflows.

## Design Goals
- Split the reporting workflow into focused pages.
- Keep API integration strictly snake_case.
- Preserve lookup session recovery and re-init behavior.
- Make requirement guidance advisory (never blocking final save).
- Support report artifacts and media timeline review after finalization.
- Keep heavy media/report file interactions under `/api/media/...`.

## Proposed Page Map

### 1. Reporting Worklist Page
Route suggestion: `/reporting`

Purpose:
- Entry point for clinicians/operators
- Resume recent work
- Start a new report flow

Backend endpoints:
- `GET /api/patient-examination-reports/?patient_examination_id=<id>` (when scoping from a known exam)
- `GET /api/patients/`
- `GET /api/patient-examinations/list/` or `GET /api/patient-examinations/` (depending frontend usage)

UI modules:
- "Start new report" CTA
- "Continue draft" list
- Quick filters: patient, date, status
- Recent final reports (optional, scoped)

Notes:
- Non-privileged users should always query with explicit scope where possible.

### 2. Case Setup Page (Patient + Examination + Lookup Init)
Route suggestion: `/reporting/case-setup`

Purpose:
- Select or create patient
- Select examination template
- Create `PatientExamination`
- Initialize lookup session (`lookup_token`)

Backend endpoints:
- `GET /api/patients/`
- `POST /api/patients/` (if supported in current frontend flow)
- `GET /api/examinations/`
- `POST /api/patient-examinations/`
- `POST /api/lookup/init/`

Primary outputs (local session state):
- `patient_id`
- `examination_id`
- `patient_examination_id`
- `lookup_token`

UI requirements:
- Explicit session reset on patient switch
- Session status badge (active/expired/restarting)
- Store token + `patient_examination_id` in local storage (resume support)

### 3. Template & Requirement Set Selection Page
Route suggestion: `/reporting/:patient_examination_id/template-requirements`

Purpose:
- Inspect report template
- Match template findings to backend findings/classifications
- Select requirement sets for lookup recomputation
- Recompute and review requirement-set completeness

Backend endpoints:
- `GET /api/lookup/{token}/all/`
- `GET /api/lookup/{token}/parts/?keys=...`
- `PATCH /api/lookup/{token}/parts/`
- `POST /api/lookup/{token}/recompute/`
- `GET /api/examinations/{examination_id}/findings/`
- `GET /api/findings/{finding_id}/classifications/`
- KB template endpoints (non-`endoreg_db`, current frontend uses `/base_api/report-templates/...`)

Key UI panels:
- Template selector and template metadata
- Template-to-API matching diagnostics
- Requirement set checklist
- Requirement evaluation summary (set-level)
- Session controls (refresh, recompute, renew, reset)

Design note:
- Keep "template diagnostics" collapsible and secondary to the main clinical task.

### 4. Findings Capture Page
Route suggestion: `/reporting/:patient_examination_id/findings`

Purpose:
- Add findings to patient examination
- Set/update classifications
- Re-evaluate requirement guidance after changes

Backend endpoints:
- `GET /api/patient-examinations/{patient_examination_id}/findings/`
- `GET /api/findings/`
- `GET /api/findings/{finding_id}/classifications/`
- `GET /api/classifications/{classification_id}/choices/`
- Existing patient-finding endpoints (router + create/update paths used by current components)
- `POST /api/lookup/{token}/recompute/` (or patch+recompute workflow)

UI modules:
- Addable findings catalog
- Selected findings list (for current examination)
- Classification editor per finding
- Inline advisory badges ("required by selected requirement set", "missing classification")

Design note:
- Avoid long nested cards for every finding by default; use summary rows + expandable detail.

### 5. Requirement Guidance Review Page (Advisory)
Route suggestion: `/reporting/:patient_examination_id/requirements-review`

Purpose:
- Present unmet requirements and suggested actions clearly
- Separate clinical data entry from guidance review

Backend endpoints:
- `GET /api/lookup/{token}/all/` or targeted `parts`
- `POST /api/lookup/{token}/recompute/`
- `POST /api/evaluate-requirements/` (optional/advanced path if used directly)

Required fields (from lookup or `requirement_guidance`):
- `requirement_status`
- `requirement_set_status`
- `suggested_actions`
- `candidate_requirement_set_ids`
- `candidate_requirement_set_confidence`

UI modules:
- Failed requirement sets list
- Failed requirements grouped by set
- Suggested actions panel (unknown action types shown generically)
- Confidence notice for low-confidence candidate hints (`< 0.35`)

UX rule:
- This page must never present unmet requirements as a blocking validation error.

### 6. Report Editor & Save Page
Route suggestion: `/reporting/:patient_examination_id/report-editor`

Purpose:
- Compose and persist report payload (`editor_payload`, `rendered_text`, metadata)
- Save draft/final versions
- Receive advisory requirement guidance on save

Backend endpoints:
- `POST /api/patient-examination-reports/save-submission/`
- `GET /api/patient-examination-reports/?patient_examination_id=<id>`
- `GET /api/patient-examination-reports/{id}/`
- `PATCH /api/patient-examination-reports/{id}/` (if direct model patching is used)

Save modes:
- Draft save (`status: "draft"`)
- Final save (`status: "final"`)

Expected response usage:
- `report`
- `warnings`
- `history_context`
- `requirement_guidance`
- `persisted_report_artifact_id`
- `persisted_pdf_artifact_id`
- `persisted_artifacts.*`

Design note:
- Show "Guideline deviation detected (advisory)" banner on save if warnings exist.

### 7. Segment Frame Selector Page (Media-Assisted Reporting)
Route suggestion: `/reporting/:patient_examination_id/frame-selector`

Purpose:
- Pick representative frames per detected/annotated segment
- Optionally attach a finding to segment context
- Persist selections into `PatientExaminationReport.editor_payload`

Backend endpoints:
- `GET /api/patient-examination-reports/segment-frame-selector/?patient_examination_id=<id>[&report_id=<id>]`
- `PATCH /api/patient-examination-reports/segment-frame-selector/`

PATCH body patterns (snake_case):
- `action: "random"`
- `action: "step", step: +/-5`
- `action: "set", frame_number: <int>`
- `action: "clear"`
- optional `finding_id`

UI modules:
- Segment list with label and range
- Frame preview pane
- Per-segment controls (`random`, `-5`, `+5`, `set`)
- Finding attachment selector
- Auto-save state indicator

Design note:
- This should be a dedicated page, not embedded in the generic findings page.

### 8. Finalization Result / Artifacts Page
Route suggestion: `/reporting/:patient_examination_id/finalized`

Purpose:
- Confirm final save
- Provide PDF preview/download links
- Link to patient media timeline

Backend endpoints:
- Use `persisted_artifacts` URLs from `save-submission`
- `GET /api/media/pdfs/{id}/stream/?type=raw`
- `GET /api/media/pdfs/{id}/stream/?type=raw&download=1`
- `GET /api/media/patients/{patient_id}/timeline/`

UI modules:
- Final save confirmation
- Advisory warnings summary (if any)
- PDF preview CTA
- PDF download CTA
- Patient timeline preview / link out

## Cross-Page Shared State (Frontend)
Recommended persisted state keys:
- `lookup_token`
- `patient_examination_id`
- `selected_patient_id`
- `selected_examination_id`
- `selected_requirement_set_ids`
- `active_report_id` (after first report save or frame-selector auto-create)

Behavior:
- If `lookup_token` expires (`404`), re-init via `POST /api/lookup/init/` using existing `patient_examination_id`.
- Preserve page-local UI state, but re-fetch lookup state from backend after restart.

## API Integration Rules (Important)
- Keep trailing slashes exactly as defined in Django routes.
- Treat lookup `parts` responses as partial state patches; merge into local state.
- Treat requirement guidance as advisory, not transport-level failure.

## Recommended Navigation Flow
Primary path:
1. Worklist
2. Case Setup
3. Template & Requirement Sets
4. Findings Capture
5. Requirement Guidance Review
6. Report Editor & Save
7. Frame Selector (optional, can occur before final save)
8. Finalization Result / Artifacts

Fast path (experienced user):
1. Worklist
2. Resume existing draft
3. Report Editor & Save
4. Requirement Guidance Review (if warnings shown)
5. Finalization Result / Artifacts

## Migration Plan From Current Monolithic Component

### Phase 1 (Safe Split)
- Extract current blocks into route-level pages with shared store/state.
- Keep existing store contracts and lookup token handling.
- Reuse current components (`MedicalBlock`, findings widgets, requirement widgets).

### Phase 2 (Workflow Hardening)
- Add centralized session lifecycle service (validate, renew, restart).
- Add route guards for missing `patient_examination_id` / `lookup_token`.
- Add unsaved-change prompts on report editor and frame selector pages.

### Phase 3 (UX Improvements)
- Replace debug-heavy panels with clinician-facing summaries.
- Add autosave indicators and retry queue for transient errors.
- Add timeline preview card after final save.

## Page-Level Acceptance Criteria
- Users can complete a full report without using a single monolithic page.
- Lookup token expiry is recoverable without losing `patient_examination_id`.
- Final save can succeed even with unmet requirements (warnings only).
- Segment frame selections persist and reload via `segment-frame-selector`.
- PDF preview/download and patient timeline links work after finalization.
