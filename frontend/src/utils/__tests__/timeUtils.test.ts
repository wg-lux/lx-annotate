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
      expect(formatTime(30.5)).toBe('00:30')
      expect(formatTime(89.9)).toBe('01:29')
    })

    it('should handle edge cases', () => {
      expect(formatTime(NaN)).toBe('00:00')
      expect(formatTime(Infinity)).toBe('00:00')
      expect(formatTime(-10)).toBe('00:00')
    })
  })

  describe('parseTime', () => {
    it('should parse MM:SS format to seconds', () => {
      for (const { seconds, formatted } of timeFormatExamples) {
        expect(parseTime(formatted)).toBe(seconds)
      }
    })

    it('should handle single digit inputs', () => {
      expect(parseTime('1:5')).toBe(65)
      expect(parseTime('10:5')).toBe(605)
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
      expect(isValidTimeRange(0, 10)).toBe(true)
      expect(isValidTimeRange(5, 15)).toBe(true)
      expect(isValidTimeRange(10, 10)).toBe(false) // Same time
      expect(isValidTimeRange(15, 5)).toBe(false) // End before start
    })

    it('should handle edge cases', () => {
      expect(isValidTimeRange(0, 0)).toBe(false)
      expect(isValidTimeRange(-5, 10)).toBe(false)
      expect(isValidTimeRange(5, -10)).toBe(false)
      expect(isValidTimeRange(NaN, 10)).toBe(false)
      expect(isValidTimeRange(5, NaN)).toBe(false)
    })
  })

  describe('calculateDuration', () => {
    it('should calculate duration between two times', () => {
      expect(calculateDuration(0, 10)).toBe(10)
      expect(calculateDuration(5, 15)).toBe(10)
      expect(calculateDuration(30, 90)).toBe(60)
    })

    it('should handle decimal times', () => {
      expect(calculateDuration(1.5, 3.7)).toBeCloseTo(2.2)
    })

    it('should return 0 for invalid ranges', () => {
      expect(calculateDuration(10, 5)).toBe(0)
      expect(calculateDuration(10, 10)).toBe(0)
      expect(calculateDuration(NaN, 10)).toBe(0)
    })
  })
})
