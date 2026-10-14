import { describe, it, expect } from 'vitest'
import { formatTime, parseTime, isValidTimeRange, calculateDuration } from '../timeUtils'
import { formatTime as formatTimeFromHelpers } from '../timeHelpers'

const timeFormatExamples = [
  { seconds: 0, formatted: '00:00' },
  { seconds: 30, formatted: '00:30' },
  { seconds: 60, formatted: '01:00' },
  { seconds: 90, formatted: '01:30' },
  { seconds: 3661, formatted: '61:01' } // Over 1 hour
] as const

const decimalTimeExamples = [
  { seconds: 30.5, formatted: '00:30' },
  { seconds: 89.9, formatted: '01:29' }
] as const

const invalidTimeExamples = [
  { seconds: NaN, formatted: '00:00' },
  { seconds: Infinity, formatted: '00:00' },
  { seconds: -10, formatted: '00:00' }
] as const

const singleDigitTimeExamples = [
  { formatted: '1:5', seconds: 65 },
  { formatted: '10:5', seconds: 605 }
] as const

const orderedRangeExamples = [
  { start: 0, end: 10, valid: true },
  { start: 5, end: 15, valid: true },
  { start: 10, end: 10, valid: false }, // Same time
  { start: 15, end: 5, valid: false } // End before start
] as const

const invalidRangeExamples = [
  { start: 0, end: 0, valid: false },
  { start: -5, end: 10, valid: false },
  { start: 5, end: -10, valid: false },
  { start: NaN, end: 10, valid: false },
  { start: 5, end: NaN, valid: false }
] as const

const durationExamples = [
  { start: 0, end: 10, duration: 10 },
  { start: 5, end: 15, duration: 10 },
  { start: 30, end: 90, duration: 60 }
] as const

const decimalDurationExamples = [{ start: 1.5, end: 3.7, duration: 2.2 }] as const

const invalidDurationExamples = [
  { start: 10, end: 5, duration: 0 },
  { start: 10, end: 10, duration: 0 },
  { start: NaN, end: 10, duration: 0 }
] as const

const formatTimeImplementations = [
  ['timeUtils', formatTime],
  ['timeHelpers', formatTimeFromHelpers]
] as const

describe('timeUtils', () => {
  describe.each(formatTimeImplementations)('formatTime (%s)', (_moduleName, formatTime) => {
    it('should format seconds to MM:SS format', () => {
      for (const { seconds, formatted } of timeFormatExamples) {
        expect(formatTime(seconds)).toBe(formatted)
      }
    })

    it('should handle decimal seconds', () => {
      for (const { seconds, formatted } of decimalTimeExamples) {
        expect(formatTime(seconds)).toBe(formatted)
      }
    })

    it('should handle edge cases', () => {
      for (const { seconds, formatted } of invalidTimeExamples) {
        expect(formatTime(seconds)).toBe(formatted)
      }
    })
  })

  describe('parseTime', () => {
    it('should parse MM:SS format to seconds', () => {
      for (const { seconds, formatted } of timeFormatExamples) {
        expect(parseTime(formatted)).toBe(seconds)
      }
    })

    it('should handle single digit inputs', () => {
      for (const { formatted, seconds } of singleDigitTimeExamples) {
        expect(parseTime(formatted)).toBe(seconds)
      }
    })

    it('should return null for invalid formats', () => {
      expect(parseTime('invalid')).toBe(null)
      expect(parseTime('1:2:3')).toBe(null)
      expect(parseTime('1')).toBe(null)
      expect(parseTime('')).toBe(null)
    })
  })

  describe('isValidTimeRange', () => {
    it('should validate time ranges', () => {
      for (const { start, end, valid } of orderedRangeExamples) {
        expect(isValidTimeRange(start, end)).toBe(valid)
      }
    })

    it('should handle edge cases', () => {
      for (const { start, end, valid } of invalidRangeExamples) {
        expect(isValidTimeRange(start, end)).toBe(valid)
      }
    })
  })

  describe('calculateDuration', () => {
    it('should calculate duration between two times', () => {
      for (const { start, end, duration } of durationExamples) {
        expect(calculateDuration(start, end)).toBe(duration)
      }
    })

    it('should handle decimal times', () => {
      for (const { start, end, duration } of decimalDurationExamples) {
        expect(calculateDuration(start, end)).toBeCloseTo(duration)
      }
    })

    it('should return 0 for invalid ranges', () => {
      for (const { start, end, duration } of invalidDurationExamples) {
        expect(calculateDuration(start, end)).toBe(duration)
      }
    })
  })
})
