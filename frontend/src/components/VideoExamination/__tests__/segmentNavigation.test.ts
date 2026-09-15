import { describe, expect, it } from 'vitest'
import {
  buildSegmentNavigationPoints,
  getAdjacentNavigationPoints,
  getNavigableSegments
} from '../segmentNavigation'

describe('segment navigation', () => {
  it('filters invalid ranges and labels without changing source segment order', () => {
    const segments = [
      { id: 2, label: 'inside', startTime: 8, endTime: 12 },
      { id: 1, label: 'inside', startTime: 0, endTime: 4 },
      { id: 3, label: 'outside', startTime: 1, endTime: 2 },
      { id: 4, label: 'inside', startTime: -1, endTime: 2 },
      { id: 5, label: 'inside', startTime: 3, endTime: 2 },
      { id: 6, label: 'inside', startTime: 8, endTime: 13 },
      { id: 7, label: 'inside', startTime: NaN, endTime: 2 },
      { id: 8, label: 'inside', startTime: 1, endTime: Infinity }
    ]
    expect(
      buildSegmentNavigationPoints(
        getNavigableSegments({ segments, labels: ['inside'], duration: 12 })
      )
    ).toEqual([
      { segmentId: 1, time: 0 },
      { segmentId: 1, time: 2 },
      { segmentId: 1, time: 4 },
      { segmentId: 2, time: 8 },
      { segmentId: 2, time: 10 },
      { segmentId: 2, time: 12 }
    ])
    expect(segments.map((segment) => segment.id)).toEqual([2, 1, 3, 4, 5, 6, 7, 8])
  })

  it('retains separate segments at shared timestamps and deduplicates zero-length ranges', () => {
    const points = buildSegmentNavigationPoints(
      getNavigableSegments({
        segments: [
          { id: 2, label: 'inside', startTime: 4, endTime: 4 },
          { id: 1, label: 'outside', startTime: 4, endTime: 4 }
        ],
        labels: [],
        duration: 4
      })
    )
    expect(points).toEqual([
      { segmentId: 1, time: 4 },
      { segmentId: 2, time: 4 }
    ])
    expect(getAdjacentNavigationPoints({ points, selectedSegmentId: 1, currentTime: 4 })).toEqual({
      previous: undefined,
      next: { segmentId: 2, time: 4 }
    })
    expect(getAdjacentNavigationPoints({ points, selectedSegmentId: 2, currentTime: 4 })).toEqual({
      previous: { segmentId: 1, time: 4 },
      next: undefined
    })
  })

  it('uses temporal boundaries when the playhead is between navigation points', () => {
    const points = [
      { segmentId: 1, time: 2 },
      { segmentId: 1, time: 6 }
    ]
    expect(
      getAdjacentNavigationPoints({ points, selectedSegmentId: null, currentTime: 4 })
    ).toEqual({
      previous: points[0],
      next: points[1]
    })
    expect(
      getAdjacentNavigationPoints({ points: [], selectedSegmentId: null, currentTime: 0 })
    ).toEqual({
      previous: undefined,
      next: undefined
    })
  })
})
