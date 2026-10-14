interface NavigableSegment {
  id: number
  label: string
  startTime: number
  endTime: number
}

interface NavigationPoint {
  segmentId: number
  time: number
}

const hasValidTimeRange = (segment: NavigableSegment, duration: number): boolean =>
  Number.isFinite(segment.startTime) &&
  Number.isFinite(segment.endTime) &&
  segment.startTime >= 0 &&
  segment.endTime >= segment.startTime &&
  segment.endTime <= duration

const compareSegments = (first: NavigableSegment, second: NavigableSegment): number =>
  first.startTime - second.startTime || first.endTime - second.endTime || first.id - second.id

const getSegmentPoints = (segment: NavigableSegment): NavigationPoint[] => {
  const midpoint = (segment.startTime + segment.endTime) / 2
  const times = new Set([segment.startTime, midpoint, segment.endTime])
  return [...times].map((time) => ({ segmentId: segment.id, time }))
}

/** Visit each eligible segment's start, midpoint, and end in stable segment order. */
export const getNavigableSegments = ({
  segments,
  labels,
  duration
}: {
  segments: readonly NavigableSegment[]
  labels: readonly string[]
  duration: number
}): NavigableSegment[] =>
  segments
    .filter((segment) => !labels.length || labels.includes(segment.label))
    .filter((segment) => hasValidTimeRange(segment, duration))
    .sort(compareSegments)

export const buildSegmentNavigationPoints = (
  segments: readonly NavigableSegment[]
): NavigationPoint[] => segments.flatMap(getSegmentPoints)

/** At an exact point retain segment order, including shared timestamps. */
export const getAdjacentNavigationPoints = ({
  points,
  selectedSegmentId,
  currentTime
}: {
  points: readonly NavigationPoint[]
  selectedSegmentId: number | null
  currentTime: number
}): { previous: NavigationPoint | undefined; next: NavigationPoint | undefined } => {
  const currentIndex = points.findIndex(
    (point) => point.segmentId === selectedSegmentId && point.time === currentTime
  )
  if (currentIndex >= 0) {
    return { previous: points[currentIndex - 1], next: points[currentIndex + 1] }
  }
  return {
    previous: [...points].reverse().find((point) => point.time < currentTime),
    next: points.find((point) => point.time >= currentTime)
  }
}
