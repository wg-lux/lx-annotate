# Segment Annotation Workflow

This page explains the practical workflow for segment annotation in videos after anonymization.

## Target Audience

- Physicians documenting findings in recorded procedures
- Clinical documentation staff
- Trainers onboarding new users

## Primary Component

- `frontend/src/components/VideoExamination/VideoExaminationAnnotation.vue`

## Clinical Purpose

- Mark clinically relevant video intervals with labels.
- Correct segment start/end boundaries.
- Validate all segments before final use in downstream workflows.

## How Users Enter This Workflow

- From anonymization validation after approving a video.
- Directly with a deep link/query that includes a video ID (`video=<id>`).

## Preconditions

- The selected video must already be anonymized (`done_processing_anonymization`) or validated.
- Videos already fully validated for segment annotation cannot be edited again in normal flow.

## Step-by-Step for Medical Users

1. Select the video from the dropdown.
2. Confirm timeline and labels are visible.
3. Choose a label for the segment.
4. Set label start at the current time.
5. Set label end at the appropriate end time.
6. Adjust boundaries by dragging/resizing if needed.
7. Save local edits with `Segmentänderungen speichern`.
8. Complete review with `Alle Segmente validieren` and confirm the dialog.

## What Happens on Full Validation

- The UI sends a bulk validation request for all current segments.
- Current start/end boundaries are submitted.
- The video is marked as validated in segment annotation context.
- `outside` handling is included in this finalization step.

## Training Notes

- Teach users to finish boundary corrections before full validation.
- Encourage short iterative saves before the final validation click.
- Use keyboard shortcuts for efficient operation during longer videos.

## Common Issues

### No video can be selected

- Cause: video is not anonymized yet or already fully validated.
- Action: return to anonymization workflow and check status.

### Validation button reports no segments

- Cause: no segments were created for the selected video.
- Action: create at least one segment before full validation.

### Segment boundaries look wrong after validation

- Cause: stale local state before submit.
- Action: reload segments, adjust boundaries, save, then validate again.

## Technical References

- `frontend/src/components/VideoExamination/VideoExaminationAnnotation.vue`
- `frontend/src/components/VideoExamination/Timeline.vue`

## Fixed Issues

We already made the following UI observations and fixed them:

- Video validation status was hard to read -> add color coding and symbols
- Button for final validation didnt register -> changed button size and broke color code
