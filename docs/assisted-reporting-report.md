# Assisted Reporting – Report.vue

## Overview

`frontend/src/components/AssistedReporting/Report.vue` now reuses the full RequirementGenerator flow, but wraps each logical phase in `MedicalBlock` cards so it slots seamlessly into the assisted reporting UI. The component orchestrates patient/examination selection, lookup/session lifecycle, requirement-set management, findings handling, and classification status checks while keeping the existing modals/alerts from the RequirementGenerator experience.

## Key pieces

- **MedicalBlock cards** – Four cards correspond to the new `currentStep` tracker and expose `@next` handlers so each phase can advance the workflow without dismantling the lookup logic. The step titles align to 1) Patient & Examination, 2) Requirement Sets, 3) Findings, and 4) Classification/Requirement issues.
- **Session orchestration** – Lookup tokens, patient examination creation, heartbeat renewal, and requirement evaluation are copied verbatim from the RequirementGenerator code (including `fetchLookupAll`, `triggerRecompute`, `evaluateRequirementsOnChange`, etc.) so maintenance happens in one place.
- **Supporting components** – Reuses `FindingsDetail`, `AddableFindingsDetail`, and `RequirementIssues` from the RequirementReport directory, while the new UI imports `MedicalBlock` from the AssistedReporting folder to render the card shell.
- **State watchers** – Watches on `lookup`, `selectedRequirementSetIds`, and `currentPatientExaminationId` keep the Pinia stores in sync and automatically evaluate requirements when necessary. The patient/examination selectors still fetch data via `patientStore` and `examinationStore`.
- **Alerts/modals** – Success/error banners and the `PatientAdder` modal are preserved to give users feedback about session creation and allow new patient creation from within the same flow.

## Workflow summary

1. **Select patient & examination** – The card handles the dropdowns, new patient modal button, and patient reset badge. The `createPatientExaminationAndInitLookup` call creates the backend `PatientExamination`, initializes a lookup token, loads findings, fetches lookup data, and advances to step 2.
2. **Adjust requirement sets** – Card buttons allow refreshing the lookup, recomputation, manual renewal, and resetting the session. Requirement sets display with evaluation badges, toggles, and a summary progress bar. When sets change, `toggleRequirementSet` patches the lookup and re-evaluates.
3. **Manage findings** – Once a token exists, the Findings card renders `AddableFindingsDetail` (for CRUD) plus a scrollable list of `FindingsDetail` components that show available findings and classification state. Success messages and logging persist from the original component.
4. **Classification/Issue report** – The final card hides the action button and renders `RequirementIssues` to surface unmet requirements for the selected sets and patient examination.

## Developer notes

- Keep the existing watchers/logging inside the `<script setup>` block because they feed the lifecycle hooks (`onMounted`, `onUnmounted`) and persisted tokens in `localStorage`.
- The component assumes the Pinia stores (`patientStore`, `examinationStore`, etc.) and API endpoints registered in `RequirementGenerator` remain unchanged; any deep refactor should happen there first and then be mirrored here.
- Tested flows: selecting patient/exam, starting lookup, toggling requirement sets, adding findings, and viewing requirement issues should mirror the RequirementGenerator experience because the same helper functions are shared in this file.
