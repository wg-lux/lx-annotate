import { describe, expect, it } from 'vitest'

import {
  calculateSegmentPosition,
  calculateSegmentWidth,
  framesToSeconds,
  safeTimeConversion,
  secondsToFrames
} from '@/utils/timeHelpers'

describe('timeHelpers', () => {
  it.each([
    [30, 30, 1],
    [90, 30, 3],
    [150, 50, 3],
    [0, 30, 0],
    [Number.NaN, 30, 0],
    [30, 0, 0],
    [30, -1, 0]
  ])('converts %s frames at %s fps to %s seconds', (frames, fps, expected) => {
    expect(framesToSeconds(frames, fps)).toBe(expected)
  })

  it.each([
    [1, 30, 30],
    [2.5, 30, 75],
    [0, 30, 0],
    [Number.NaN, 30, 0],
    [1, 0, 0]
  ])('converts %s seconds at %s fps to %s frames', (seconds, fps, expected) => {
    expect(secondsToFrames(seconds, fps)).toBe(expected)
  })

  it.each([
    [30, true, 30, 1],
    [3, false, 30, 3],
    [null, true, 30, 0],
    [undefined, false, 30, 0],
    [-1, true, 30, 0]
  ])('safely converts time values', (value, isFrames, fps, expected) => {
    expect(safeTimeConversion(value, isFrames, fps)).toBe(expected)
  })

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
