# Reporting Template & Requirement Sets Page (TemplateRequirementsPage)

## Audience and Purpose

This guide is written for:

- Medical staff (physicians, nurses, documentation staff)
- Clinical trainers
- Product owners and project coordinators

No software engineering background is required.

The goal of this page is simple:

1. Select the correct report template for an examination.
2. Load and manage requirement sets for that case.
3. Prepare the case for the next reporting steps (findings, review, report editor).

---

## Where This Page Is Used

`TemplateRequirementsPage` is a page inside the reporting workflow shell:

- Shell component: `frontend/src/views/reporting/ReportingShell.vue`
- Page component: `frontend/src/views/reporting/TemplateRequirementsPage.vue`
- Route: `/reporting/:patient_examination_id/template-requirements`

This means it is part of the guided multi-step reporting process, not a standalone page.

---

## What You See on the Page

The page has two main blocks.

### 1. Template Selection

This block lets you:

- Choose the knowledge-base module (`KB module`)
- See the current examination
- Load templates for that examination
- Select one template from the dropdown
- See a summary of sections and validator counts

For clinical onboarding, a default training example is available:

- Module: `report_template_examples`
- Example template for colonoscopy: `colonoscopy_training_basic`

### 2. Template & Requirement Sets

This block lets you:

- View the current `patient_examination_id`
- View the active lookup token
- Load lookup status
- Select or deselect requirement sets
- Trigger recomputation
- Review suggested actions from lookup logic

---

## Why Requirement Sets Matter (Clinical View)

Think of requirement sets as structured checklists derived from:

- Examination context
- Selected template
- Existing findings
- Rule logic in the backend

If sets are missing, downstream steps can be incomplete, and the final report quality may be lower.

---

## Typical Step-by-Step Workflow

Use this sequence for training sessions.

1. Open a reporting case via deep link, for example:
`/reporting/<patient_examination_id>/template-requirements`
2. Confirm the displayed `PatientExamination-ID` is correct.
3. In **Template Selection**, keep module `report_template_examples` (for training) or switch to your production module.
4. Click **Templates for examination load**.
5. Select a template from the dropdown.
6. In **Template & Requirement Sets**, verify that requirement sets are shown.
7. Select relevant sets (switches on the right side).
8. Click recompute if needed.
9. Continue to next workflow pages (Findings, Requirements Review, Report Editor).

---

## Full Reporting Flow (All Steps)

The reporting process is designed as a sequence inside `ReportingShell`.

### Step 0: Worklist

- Route: `/reporting`
- Main goal: Start a new report or resume an existing one.
- Typical actions:
1. Filter by status (`draft`, `final`, or all).
2. Open an existing case.
3. Or click **Start new report** to begin a new case.

### Step 1: Case Setup

- Route: `/reporting/case-setup`
- Main goal: Create a valid case context.
- Typical actions:
1. Select patient.
2. Select examination.
3. Start patient examination and lookup session.
4. Confirm that both fields are populated:
`PatientExamination-ID` and `Lookup-Token`.

Without this step, later pages cannot calculate requirement logic reliably.

### Step 2: Template & Requirement Sets

- Route: `/reporting/<patient_examination_id>/template-requirements`
- Main goal: Align template structure and requirement logic for this case.
- Typical actions:
1. Load templates for the selected examination.
2. Select a template.
3. Load lookup state.
4. Select requirement sets.
5. Recompute if needed.

This step controls what should be documented in later steps.

### Step 3: Findings Capture

- Route: `/reporting/<patient_examination_id>/findings`
- Main goal: Enter clinical findings and their classifications.
- Typical actions:
1. Add findings to the case.
2. Set or update classifications.
3. Recompute lookup after important changes.
4. Review available findings from lookup.

For clinical documentation quality, this is one of the most important steps.

### Step 4: Requirements Review

- Route: `/reporting/<patient_examination_id>/requirements-review`
- Main goal: Check unmet requirements and suggested actions.
- Typical actions:
1. Load lookup hints.
2. Review unmet requirement sets.
3. Review advisory recommendations.
4. If needed, return to Findings or Template/Requirement Sets and adjust.

Important: This page is advisory; it supports decision-making but does not replace medical judgement.

### Step 5: Report Editor

- Route: `/reporting/<patient_examination_id>/report-editor`
- Main goal: Produce and save the report text/content.
- Typical actions:
1. Confirm template context.
2. Fill section notes (draft text per section).
3. Set indication rows when needed.
4. Save as `draft` during work-in-progress.
5. Save as `final` when complete.

The editor creates/updates structured report submissions linked to the case.

### Step 6: Segment/Frame Selector (Optional)

- Route: `/reporting/<patient_examination_id>/frame-selector`
- Main goal: Select representative frames for segments and optionally link findings.
- Typical actions:
1. Select a segment.
2. Set a representative frame manually or with helper actions.
3. Optionally attach/remove finding links.

Use this step when image/video evidence selection is needed.

### Step 7: Finalization / Artifacts

- Route: `/reporting/<patient_examination_id>/finalized`
- Main goal: Access final outputs and verify traceability.
- Typical actions:
1. Load latest finalized report state.
2. Open/download PDF artifact.
3. Open patient timeline.
4. Verify status, version, and document type.

---

## Quick Practical Path for Clinical Documentation

If the primary objective is to document findings quickly and safely:

1. Complete **Case Setup**.
2. In **Template & Requirement Sets**, select the matching template and requirement sets.
3. In **Findings Capture**, add findings and classifications.
4. Use **Requirements Review** to catch missing documentation.
5. Complete **Report Editor** and save as draft/final.
6. Confirm output in **Finalization**.

---

## Deep Link Behavior

When this page is opened with `:patient_examination_id` in the route:

1. The page uses that ID as the active case context.
2. It fetches patient examination details.
3. It attempts to initialize a lookup session if no token exists.
4. It loads lookup data automatically.

This reduces manual setup and makes training demos reliable.

---

## Field and Button Reference

### Template Block

- `KB module`: Source module for templates.
- `Examination`: Current case examination (read-only).
- `Template`: Select template for this case.
- `Templates for examination load`: Refreshes available templates.

### Requirement Set Block

- `PatientExamination-ID`: Current case identifier.
- `Lookup-Token`: Active lookup session identifier.
- `Refresh`: Reload full lookup state.
- `Load parts`: Reload selected lookup fields.
- `Recompute`: Re-run requirement logic with current selections.
- Requirement set switches: Enable/disable each requirement set.

---

## Common Problems and Practical Fixes

### Problem: "No templates found for colonoscopy"

Possible causes:

- No template exists for examination `colonoscopy` in selected module.
- Wrong module selected.

What to do:

1. Set module to `report_template_examples`.
2. Reload templates.
3. Verify template `colonoscopy_training_basic` appears.

### Problem: "0 set(s)" and "No requirement sets found"

Possible causes:

- No lookup token exists yet.
- Lookup session expired.
- Case was opened without valid `patient_examination_id`.
- Backend rule engine returned no sets for current data.

What to do:

1. Verify `PatientExamination-ID` is present.
2. Check that `Lookup-Token` is present.
3. Use refresh/recompute.
4. If still empty, return to case setup and reinitialize lookup.

### Problem: Mismatch warning between route parameter and stored case

Meaning:

- The URL case ID and locally stored flow state refer to different cases.

What to do:

1. Reload the intended deep-link URL.
2. Avoid using stale browser tabs from older cases.

---

## Training Checklist (For Clinical Onboarding)

Use this checklist when teaching staff.

1. Can the user identify current `PatientExamination-ID`?
2. Can the user explain the purpose of each reporting step/page?
2. Can the user load templates for the examination?
3. Can the user select the correct template?
4. Can the user understand requirement set status (fulfilled / not fulfilled / unknown)?
5. Can the user toggle a set and recompute?
6. Can the user add findings and update classifications?
7. Can the user use Requirements Review to identify gaps?
8. Can the user save draft/final report in the editor?
9. Can the user verify artifacts in Finalization?

---

## Glossary (Plain Language)

- **Template**: A predefined report structure with sections and expected findings.
- **Requirement set**: A grouped rule/checklist for report completeness.
- **Lookup token**: Session key for requirement calculations.
- **Recompute**: Re-run backend logic after changes.
- **Patient examination**: The concrete clinical case instance used for reporting.

---

## Related Technical Files (for Admins/Developers)

- `frontend/src/views/reporting/ReportingShell.vue`
- `frontend/src/views/reporting/TemplateRequirementsPage.vue`
- `frontend/src/composables/reporting/useReportTemplates.ts`
- `frontend/src/composables/reporting/useLookupActions.ts`
- `frontend/src/stores/reportingFlowStore.ts`
- `lx-data-models/lx_dtypes/data/report_template_examples/report_templates.yaml`
