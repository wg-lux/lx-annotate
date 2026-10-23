/**
 * Format time in MM:SS format with NaN protection
 * @param seconds Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const isFiniteNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * Calculate segment width percentage for timeline display
 * @param start Start time in seconds
 * @param end End time in seconds
 * @param duration Total video duration in seconds
 * @returns Width percentage (0-100)
 */
export function calculateSegmentWidth(start?: number, end?: number, duration?: number): number {
  if (
    !isFiniteNumber(start) ||
    !isFiniteNumber(end) ||
    !isFiniteNumber(duration) ||
    duration <= 0 ||
    end <= start
  ) {
    return 0
  }
  return ((end - start) / duration) * 100
}

/**
 * Calculate segment position percentage for timeline display
 * @param start Start time in seconds
 * @param duration Total video duration in seconds
 * @returns Position percentage (0-100)
 */
export function calculateSegmentPosition(start?: number, duration?: number): number {
  if (!isFiniteNumber(start) || !isFiniteNumber(duration) || duration <= 0) {
    return 0
  }
  return (start / duration) * 100
}
