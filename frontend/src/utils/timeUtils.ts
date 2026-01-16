/**
 * Formatiert Sekunden in MM:SS Format
 * @param seconds - Die zu formatierenden Sekunden
 * @returns Formatierter String im MM:SS Format
 */
export function formatTime(seconds: number): string {
  // Handle edge cases
  if (Number.isNaN(seconds) || !Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parst einen MM:SS String zu Sekunden
 * @param timeString - String im MM:SS Format
 * @returns Sekunden als Zahl oder null bei ungültigem Format
 */
export function parseTime(timeString: string): number | null {
  if (!timeString || typeof timeString !== 'string') {
    return null
  }

  const parts = timeString.split(':')
  if (parts.length !== 2) {
    return null
  }

  const minutes = parseInt(parts[0], 10)
  const seconds = parseInt(parts[1], 10)

  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null
  }

  if (seconds < 0 || seconds >= 60 || minutes < 0) {
    return null
  }

  return minutes * 60 + seconds
}

/**
 * Überprüft, ob ein Zeitbereich gültig ist
 * @param startTime - Startzeit in Sekunden
 * @param endTime - Endzeit in Sekunden
 * @returns true wenn der Zeitbereich gültig ist
 */
export function isValidTimeRange(startTime: number, endTime: number): boolean {
  // Check for invalid numbers
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return false
  }

  // Check for negative times
  if (startTime < 0 || endTime < 0) {
    return false
  }

  // End time must be after start time
  return endTime > startTime
}

/**
 * Berechnet die Dauer zwischen zwei Zeitpunkten
 * @param startTime - Startzeit in Sekunden
 * @param endTime - Endzeit in Sekunden
 * @returns Dauer in Sekunden oder 0 bei ungültigem Bereich
 */
export function calculateDuration(startTime: number, endTime: number): number {
  if (!isValidTimeRange(startTime, endTime)) {
    return 0
  }

  return endTime - startTime
}

/**
 * Formatiert eine Dauer in Sekunden zu einem lesbaren String
 * @param seconds - Dauer in Sekunden
 * @returns Formatierter String (z.B. "1h 30m 45s" oder "2m 15s")
 */
export function formatDuration(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) {
    return '0s'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}h`)
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`)
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}s`)
  }

  return parts.join(' ')
}

/**
 * Konvertiert Sekunden zu Frames basierend auf FPS
 * @param seconds - Zeit in Sekunden
 * @param fps - Frames per Second (Standard: 50)
 * @returns Frame-Nummer
 */
export function secondsToFrames(seconds: number, fps: number = 50): number {
  return Math.round(seconds * fps)
}

/**
 * Konvertiert Frames zu Sekunden basierend auf FPS
 * @param frames - Frame-Nummer
 * @param fps - Frames per Second (Standard: 50)
 * @returns Zeit in Sekunden
 */
export function framesToSeconds(frames: number, fps: number = 50): number {
  return frames / fps
}

/**
 * Rundet Zeit auf die nächste Dezimalstelle
 * @param seconds - Zeit in Sekunden
 * @param decimals - Anzahl Dezimalstellen (Standard: 1)
 * @returns Gerundete Zeit
 */
export function roundTime(seconds: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals)
  return Math.round(seconds * factor) / factor
}

/**
 * Überprüft, ob sich zwei Zeitbereiche überschneiden
 * @param start1 - Start des ersten Bereichs
 * @param end1 - Ende des ersten Bereichs
 * @param start2 - Start des zweiten Bereichs
 * @param end2 - Ende des zweiten Bereichs
 * @returns true wenn sich die Bereiche überschneiden
 */
export function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Normalisiert eine Zeit auf einen gültigen Bereich
 * @param time - Zeit in Sekunden
 * @param minTime - Minimale erlaubte Zeit (Standard: 0)
 * @param maxTime - Maximale erlaubte Zeit
 * @returns Normalisierte Zeit
 */
export function clampTime(time: number, minTime: number = 0, maxTime?: number): number {
  let clampedTime = Math.max(time, minTime)
  if (maxTime !== undefined) {
    clampedTime = Math.min(clampedTime, maxTime)
  }
  return clampedTime
}
