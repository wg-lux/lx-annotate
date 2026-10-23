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

- The selected video must have usable anonymized processed media.
- Segment-validated videos remain selectable for review.
- Segment editing is read-only after segment validation unless an explicit edit override is active.

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

## Operational Monitoring

The `VideoExaminationAnnotation` page has two expensive backend actions that
are watchable at:

- `KI neu berechnen` posts to
  `/api/media/videos/<video_id>/segments/rerun-predictions/`.
- `Außerhalb-Segmente schwärzen` posts to
  `/api/media/videos/<video_id>/segments/blacken-outside/`.

These requests return `202 Accepted` when the backend queued work. The
follow-up Celery work does not run in the generic maintenance worker even
though the task names are listed during that worker's startup.

### Prediction rerun

Prediction reruns dispatch `endoreg_db.video_temporal_inference`.

- Celery queue: `inference`
- Systemd service: `lx-annotate-celery-inference-worker.service`
- Typical log terms: `video_temporal_inference`, `rerun-predictions`,
  `predicting_segments`, `Task ... received`, `succeeded`, `failed`

Monitor it with:

```bash
journalctl -u lx-annotate-celery-inference-worker.service -f -o short-iso
```

### Segment censorship / outside blackening

Outside-segment censorship dispatches `endoreg_db.video_post_validation_rebuild`.
This is intentionally routed to the frame extraction queue because the rebuild
can perform staged media/frame regeneration.

- Celery queue: `frame_extraction`
- Systemd service: `lx-annotate-celery-frame-extraction-worker.service`
- Typical log terms: `video_post_validation_rebuild`, `blacken-outside`,
  `Starting staged frame extraction`, `Running FFmpeg`, `cleanup_`,
  `Task ... received`, `succeeded`, `failed`

Monitor it with:

```bash
journalctl -u lx-annotate-celery-frame-extraction-worker.service -f -o short-iso
```

### Combined operator view

Use this when testing both buttons from the UI:

```bash
journalctl \
  -u lx-annotate-boot.service \
  -u lx-annotate-celery-inference-worker.service \
  -u lx-annotate-celery-frame-extraction-worker.service \
  -f -o short-iso | rg -i 'rerun-predictions|blacken-outside|video_temporal_inference|video_post_validation_rebuild|Task .*received|succeeded|failed|Running FFmpeg|Starting staged frame extraction|cleanup_|predicting_segments'
```

`lx-annotate-celery-worker.service` is the maintenance/default worker. It may
print `endoreg_db.video_temporal_inference` and
`endoreg_db.video_post_validation_rebuild` in its startup task registry, but
queue routing decides which worker consumes the task. Do not use it as the
primary journal for these two buttons.

## Training Notes

- Teach users to finish boundary corrections before full validation.
- Encourage short iterative saves before the final validation click.
- Use keyboard shortcuts for efficient operation during longer videos.

## Common Issues

### No video can be selected

- Cause: no video has usable anonymized media for the current workflow.
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

## Saved segment review and media recovery

Bulk segment validation saves the review before asynchronous media work finishes.
The interface reports saved review separately from a failed outside-frame rebuild.
Retry blackening to complete that media gate. **Video für Transfer reparieren**
opens the explicit unresolved-provenance acknowledgment described in the
[hub export workflow](hub-export-workflow.md#unresolved-frame-provenance); it does
not reapprove segments or claim that blackening succeeded.

## Dashboard progress and reflection

The dashboard leads with the authenticated practitioner's total number of distinct
frame-label annotation pairs across accessible videos, including annotations from
segment validation. Participation milestones advance through 10, 50, 100, 500 and
1,000 annotations, then in increments of 1,000. Duplicate source records count once;
these totals are not validated-track counts and do not award clinical quality scores. No progress state is stored separately.

The separate peer and AI overlap summaries divide summed intersections by summed unions across
video/practitioner or video/prediction-run pairs with available timing and a positive union on the current
comparison page. It is not an average of percentages or an all-pages aggregate.
Unavailable timing stays distinct from measured zero overlap. Detailed named
comparisons, denominators, conflicts and report mapping limitations remain visible.

The guidance links to segment annotation, frame annotation and comparison review.
It does not change anonymization acceptance or segment validation permissions.

AI comparisons use existing prediction segment ranges and remain separated by run in
the detail tables. Missing predictions are unavailable, not zero agreement. Deploy the
updated endoreg-db contract alongside the frontend; older contracts produce a visible
load error rather than an invented total.

The dashboard uses neutral operational labels without personal greetings or motivational
messages. A level badge counts reached volume milestones, and the milestone track
marks reached, next and locked thresholds using both text and color. Above 1,000,
the track retains the initial thresholds and shows the latest thousand-step milestone
and next target. Levels measure annotation volume only; peer and AI overlap do not
award levels. No additional requests or persisted achievement state are introduced.
