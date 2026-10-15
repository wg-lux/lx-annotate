import { describe, expect, it } from 'vitest'

import {
  calculateSegmentPosition,
  calculateSegmentWidth
} from '@/utils/timeHelpers'

describe('timeHelpers', () => {
  it.each([
    [1, 3, 10, 20],
    [1, 1, 10, 0],
    [1, 3, 0, 0]
  ])('calculates segment width from application inputs', (start, end, duration, expected) => {
    expect(calculateSegmentWidth(start, end, duration)).toBe(expected)
  })

  it.each([
    [1, 10, 10],
    [0, 10, 0],
    [1, 0, 0]
  ])('calculates segment position from application inputs', (start, duration, expected) => {
    expect(calculateSegmentPosition(start, duration)).toBe(expected)
  })
})
