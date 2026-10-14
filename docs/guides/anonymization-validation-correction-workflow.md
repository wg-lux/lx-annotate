# Anonymization Validation and Correction Workflow

This page explains how anonymized PDFs and videos are reviewed, approved, and corrected before reporting.

## Target Audience

- Medical staff validating anonymization quality
- Clinical documentation staff preparing report-ready records
- Trainers onboarding users into anonymization-to-reporting flow

## Primary Components

- `frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue`
- `frontend/src/components/Anonymizer/AnonymizationCorrectionComponent.vue`

## Clinical Purpose

- Ensure no personal data remains visible.
- Correct patient/examination metadata before final approval.
- Route the user directly into the next clinical documentation step.

## Validation Workflow

### What Users Review

1. Original vs anonymized media side-by-side.
2. Patient fields (name, gender, date of birth, case number).
3. Examination date consistency.
4. Anonymized text content.
5. For PDF: required document type selection.
6. For PDF: optional explicit selection of a `PatientExamination`.

### Video-Specific Validation Gate

1. Run `Segment-Annotation prüfen`.
2. If `outside` segments exist, validate them in the dedicated outside timeline.
3. Approval remains blocked until required outside validation is complete.

### Approval Behavior

When `Bestätigen` is clicked:

- Validation data is submitted to the anonymization validate endpoint.
- For video media, navigation continues to segment annotation.
- For PDF media, navigation targets `/reporting/<patient_examination_id>/report-editor` when a case can be resolved.
- If no case is resolvable for a PDF, fallback is `/reporting/case-setup`.

## Correction Workflow

Use correction when anonymization quality is insufficient.

### PDF Correction

1. Open correction from validation (`PDF-Korrektur`).
2. Draw black redaction boxes on sensitive areas.
3. Generate redacted PDF preview.
4. Optionally download result for review.
5. Upload corrected version for re-processing pipeline use.

### Video Correction

1. Open correction from validation (`Video-Korrektur`).
2. Choose masking for persistent sensitive regions.
3. Or choose frame removal for isolated sensitive frames.
4. Start processing and monitor progress.
5. Compare original and processed outputs.
6. Check processing history entries.

## Operational Recommendations

- Approve only after correction output has been visually reviewed.
- For PDF cases, always set document type explicitly to keep downstream report handling consistent.
- If case assignment is ambiguous, set `PatientExamination` manually before approval.

## Common Issues

### Approval is blocked for video

- Cause: outside segments still require validation.
- Action: finish outside-segment validation first, then approve.

### PDF does not open report editor directly

- Cause: no resolvable `patient_examination_id`.
- Action: select a `PatientExamination` manually or continue through case setup.

### Document type error on PDF approval

- Cause: missing or invalid document type selection.
- Action: choose a valid document type from the dropdown and retry.

## Technical References

- `frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue`
- `frontend/src/components/Anonymizer/AnonymizationCorrectionComponent.vue`
