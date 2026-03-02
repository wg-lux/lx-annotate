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
- Capture and edit indications for this examination
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

### Indications Capture (Clarification)
Indications should be captured on the **Report Editor & Save Page** as a dedicated sub-section (not hidden inside findings or requirement review).

Recommended UI placement:
- Top section of report editor, before findings narrative/editor blocks
- Label: `Indikationen` / `Untersuchungsindikation`
- Editable list with:
  - indication type selector
  - optional indication choice selector
  - add/remove row actions

Backend persistence path:
- `POST /api/patient-examination-reports/save-submission/`
- Use the `indications` field in the save payload (snake_case)

Payload shape (backend-supported):
```json
{
  "indications": [
    {
      "examination_indication_id": 1,
      "indication_choice_id": 2
    }
  ]
}
```

Important backend behavior:
- If `indications` is omitted, backend preserves existing indications (no replacement).
- If `indications: []` is sent, backend clears current indications for the examination.

State recommendation:
- Maintain `indications` as explicit local editor state on the report page.
- Do not infer indications from findings or requirement sets.
- Reuse report draft state when re-opening a saved report (`active_report_id`) and prefill the editor UI.

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

PATCH body patterns:
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

## Notes On Current Frontend Code (for redesign kickoff)
- Session handling logic is currently duplicated across methods (`fetch`, `patch`, `validate`, `manual renew`); centralize this before page split.
