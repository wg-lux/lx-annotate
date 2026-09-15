# Frame Annotation Availability

## Data ownership

The primary annotation dataset is label-first. Its stable database ID, label
set, annotation rows, and dataset membership are durable data. A decoded JPEG
shown to an annotator is a regenerable view and is not dataset truth.

Application Settings accepts only an active image dataset with a frame-label
compatible model type. Invalid, inactive, deleted, or video datasets produce an
actionable settings error. Duplicate dataset names do not affect selection.

## Frame source policy

Normal annotation prefers the anonymized processed video. The application
decodes only the requested frame directly from that durable artifact and sends
it with `Cache-Control: no-store`; it does not create a second persistent frame
corpus. The browser holds one frame object URL and revokes it when the task
changes.

Raw video is allowed only for an explicitly raw workflow, such as PHI-region
annotation. Raw media remains inside the local encrypted storage boundary and
must never be retrieved from or exported to another node.

If the permitted source artifact is missing, the task is unavailable. The
client must not enable label or box submission until the requested image has
loaded. Operators may retry or skip the task without changing its annotator or
dataset scope.

## Back-pressure

Two host-provided settings bound decoder work per application process:

- `LX_ANNOTATE_FRAME_DECODE_MAX_CONCURRENCY` defaults to `2`.
- `LX_ANNOTATE_FRAME_DECODE_RETRY_AFTER_SECONDS` defaults to `1`.

Requests above the concurrency limit, and duplicate concurrent requests for
the same video, frame number, and artifact kind, return HTTP `429` with a typed
`frame_decode_throttled` payload and `Retry-After`. The frontend observes the
header and performs at most three automatic retries. Queue prefetch contains
task metadata only; frame bytes are requested for the current task.

The decoder waiting-queue depth is `0`: saturated work is rejected immediately
and retried by the bounded client policy. The implementation intentionally has
no server-side decoded-frame cache, so maximum cache bytes and cache age are
both `0`. This keeps durable storage writes at zero and makes capacity behavior
independent of frame-corpus size. If a cache is introduced later, it must live
on encrypted local storage, be byte- and age-bounded, use the typed filesystem
wrappers, and remain safe to evict at any time.

The durable processed source must remain retained while dataset membership or
frame annotations reference it. Storage placement may move that processed
artifact only under the approved integrity and residency contract; deletion
must not orphan the label records. This retention gate remains part of storage
workflow acceptance rather than the ephemeral decoder.

## Monitoring and recovery

Structured events distinguish `frame_decode_started`,
`frame_decode_finished`, and `frame_decode_throttled`. Throttle events include
the artifact kind, active count, configured limit, reason, and retry delay.

An empty annotation queue means no eligible label task was found. It must not
be treated as equivalent to decode saturation, a missing source artifact, an
authorization failure, or a decode error. Persistent throttling calls for
capacity review; a missing source calls for storage-integrity or placement
recovery. Neither condition permits fallback to raw or cross-center media.

Remote retrieval, when implemented for this path, is restricted to anonymized
processed media over the deployment profile's required authenticated mTLS
transport. Missing required transport security must fail closed.
