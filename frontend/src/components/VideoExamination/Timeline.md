# Timeline.vue

## Purpose
`Timeline.vue` renders video segments and provides timeline interactions for:
- seeking and playback control
- selecting time ranges to create segments
- dragging/resizing existing segments
- deleting/copying/pasting/undoing segments
- editing segment start/end times via right-click inline input

## Props
- `video?: { duration?: number } | null`
- `segments?: Segment[]`
- `labels?: LabelMeta[]`
- `currentTime?: number`
- `isPlaying?: boolean`
- `activeSegmentId?: number | null`
- `showWaveform?: boolean`
- `selectionMode?: boolean`
- `fps?: number`

## Emits
- `seek(time: number)`
- `play-pause()`
- `segment-select(segmentId: number)`
- `segment-edit(segment: Segment)`
- `segment-delete(segment: Segment)`
- `segment-create(data: { label: string; start: number; end: number })`
- `segment-resize(segmentId: number, newStart: number, newEnd: number, mode: string, final?: boolean)`
- `segment-move(segmentId: number, newStart: number, newEnd: number, final?: boolean)`
- `time-selection(data: { start: number; end: number })`

## Right-Click Time Editing
- Default right-click on a segment opens an inline editor at mouse position.
- Input formats accepted:
- `ss` (seconds, decimal allowed)
- `mm:ss`
- `hh:mm:ss`
- Save triggers `segment-resize` with `mode = 'manual'` and `final = true`.
- Validation prevents invalid ranges (negative, end <= start, end > video duration).
- `Esc` or outside click closes the editor.
- `Shift + Right-Click` opens the legacy context menu.

## Parent Integration
In `VideoExaminationAnnotation.vue`, `Timeline` is wired with:
- `@segment-resize="handleSegmentResize"`
- `@segment-move="handleSegmentMove"`

`handleSegmentResize(...args)` already accepts `(segmentId, newStart, newEnd, mode, final?)`, so manual typed edits are handled through the same update path as drag/resize.
