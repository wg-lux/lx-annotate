export type FrameStepDirection = -1 | 1

export interface VideoFrameBoundary {
  frameNumber: number
  timestamp: number
}

export interface VideoFrameNeighborhood {
  videoId: number
  requestedTimestamp: number
  timelineVersion: 'pts_v1' | 'legacy_cfr_v1'
  timestampMapping: 'ffprobe_pts' | 'rational_cfr'
  current: VideoFrameBoundary
  previous: VideoFrameBoundary | null
  next: VideoFrameBoundary | null
  frames: VideoFrameBoundary[]
}

export interface SegmentTimestampRange {
  startTime: number
  endTime: number
}

export interface SegmentTimestampPayload {
  start_time: number
  end_time: number
}

/**
 * Validate media timestamps without deriving or snapping them through FPS.
 * The backend owns the PTS-to-frame mapping and returns canonical boundaries.
 */
export function requireSegmentTimestampRange(
  startTime: number,
  endTime: number,
  mediaDuration?: number
): SegmentTimestampRange {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new RangeError('Segment timestamps must be finite')
  }
  if (startTime < 0 || endTime <= startTime) {
    throw new RangeError('Segment timestamps must define a positive range')
  }
  if (mediaDuration !== undefined) {
    if (!Number.isFinite(mediaDuration) || mediaDuration <= 0) {
      throw new RangeError('Media duration must be finite and positive')
    }
    if (endTime > mediaDuration) {
      throw new RangeError('Segment timestamps exceed the media duration')
    }
  }

  return { startTime, endTime }
}

export function buildSegmentTimestampPayload(
  startTime: number,
  endTime: number,
  mediaDuration?: number
): SegmentTimestampPayload {
  const range = requireSegmentTimestampRange(startTime, endTime, mediaDuration)
  return {
    start_time: range.startTime,
    end_time: range.endTime
  }
}

function requireFrameBoundary(value: unknown, field: string): VideoFrameBoundary {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${field} frame boundary is missing`)
  }
  const record = value as Record<string, unknown>
  const frameNumber = Number(record.frameNumber)
  const timestamp = Number(record.timestamp)
  if (!Number.isInteger(frameNumber) || frameNumber < 0) {
    throw new TypeError(`${field} frame number is invalid`)
  }
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new TypeError(`${field} frame timestamp is invalid`)
  }
  return { frameNumber, timestamp }
}

function requireTimelineVersion(value: unknown): VideoFrameNeighborhood['timelineVersion'] {
  if (value !== 'pts_v1' && value !== 'legacy_cfr_v1') {
    throw new TypeError('Frame neighborhood timeline version is unsupported')
  }
  return value
}

function requireTimestampMapping(value: unknown): VideoFrameNeighborhood['timestampMapping'] {
  if (value !== 'ffprobe_pts' && value !== 'rational_cfr') {
    throw new TypeError('Frame neighborhood timestamp mapping is unsupported')
  }
  return value
}

function requireFrameWindow(value: unknown): VideoFrameBoundary[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('Frame neighborhood window is missing')
  }
  const frames = value.map((frame, index) => requireFrameBoundary(frame, `Window ${String(index)}`))
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1]
    const current = frames[index]
    if (
      current.frameNumber !== previous.frameNumber + 1 ||
      current.timestamp <= previous.timestamp
    ) {
      throw new TypeError('Frame neighborhood window is inconsistent')
    }
  }
  return frames
}

function requireCurrentInWindow(current: VideoFrameBoundary, frames: VideoFrameBoundary[]): void {
  const windowCurrent = frames.find((frame) => frame.frameNumber === current.frameNumber)
  if (!windowCurrent || windowCurrent.timestamp !== current.timestamp) {
    throw new TypeError('Current frame is not part of the neighborhood window')
  }
}

function requireAdjacentBoundary(
  adjacent: VideoFrameBoundary | null,
  current: VideoFrameBoundary,
  direction: FrameStepDirection
): void {
  if (!adjacent) return
  const expectedFrameNumber = current.frameNumber + direction
  const hasInvalidTimestamp =
    direction === -1
      ? adjacent.timestamp >= current.timestamp
      : adjacent.timestamp <= current.timestamp
  if (adjacent.frameNumber !== expectedFrameNumber || hasInvalidTimestamp) {
    const label = direction === -1 ? 'Previous' : 'Next'
    throw new TypeError(`${label} frame boundary is inconsistent`)
  }
}

/** Validate the backend-owned PTS neighborhood before using it for navigation. */
export function parseVideoFrameNeighborhood(value: unknown): VideoFrameNeighborhood {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Frame neighborhood response is invalid')
  }
  const record = value as Record<string, unknown>
  const videoId = Number(record.videoId)
  const requestedTimestamp = Number(record.requestedTimestamp)
  if (!Number.isInteger(videoId) || videoId <= 0) {
    throw new TypeError('Frame neighborhood video ID is invalid')
  }
  if (!Number.isFinite(requestedTimestamp) || requestedTimestamp < 0) {
    throw new TypeError('Requested frame timestamp is invalid')
  }

  const timelineVersion = requireTimelineVersion(record.timelineVersion)
  const timestampMapping = requireTimestampMapping(record.timestampMapping)
  const current = requireFrameBoundary(record.current, 'Current')
  const previous =
    record.previous == null ? null : requireFrameBoundary(record.previous, 'Previous')
  const next = record.next == null ? null : requireFrameBoundary(record.next, 'Next')
  const frames = requireFrameWindow(record.frames)
  requireCurrentInWindow(current, frames)
  requireAdjacentBoundary(previous, current, -1)
  requireAdjacentBoundary(next, current, 1)

  return {
    videoId,
    requestedTimestamp,
    timelineVersion,
    timestampMapping,
    current,
    previous,
    next,
    frames
  }
}

export function getAdjacentFrameBoundary(
  neighborhood: VideoFrameNeighborhood,
  direction: FrameStepDirection
): VideoFrameBoundary | null {
  return direction === -1 ? neighborhood.previous : neighborhood.next
}

export function getAdjacentFrameTimestamp(
  neighborhood: VideoFrameNeighborhood,
  direction: FrameStepDirection
): number | null {
  return getAdjacentFrameBoundary(neighborhood, direction)?.timestamp ?? null
}
