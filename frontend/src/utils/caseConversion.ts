/**
 * Utility functions for converting between snake_case and camelCase
 * Specifically designed to handle segment time properties consistently
 */

/**
 * Converts a snake_case string to camelCase
 * @param snakeStr - The string in snake_case format
 * @returns The string in camelCase format
 */
export function snakeToCamel(snakeStr: string): string {
  const components = snakeStr.split('_')
  // Capitalize the first letter of each component except the first
  return components[0] + components.slice(1).map(x => 
    x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()
  ).join('')
}

/**
 * Converts a camelCase string to snake_case
 * @param camelStr - The string in camelCase format
 * @returns The string in snake_case format
 */
export function camelToSnake(camelStr: string): string {
  return camelStr.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

/**
 * Converts an object with snake_case keys to camelCase keys
 * @param obj - Object with snake_case keys
 * @returns Object with camelCase keys
 */
export function objectSnakeToCamel<T = any>(obj: Record<string, any>): T {
  if (!obj || typeof obj !== 'object') return obj
  
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    
    // Recursively convert nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = objectSnakeToCamel(value)
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item => 
        item && typeof item === 'object' ? objectSnakeToCamel(item) : item
      )
    } else {
      result[camelKey] = value
    }
  }
  
  return result as T
}

/**
 * Converts an object with camelCase keys to snake_case keys
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export function objectCamelToSnake<T = any>(obj: Record<string, any>): T {
  if (!obj || typeof obj !== 'object') return obj
  
  const result: Record<string, any> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key)
    
    // Recursively convert nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = objectCamelToSnake(value)
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item => 
        item && typeof item === 'object' ? objectCamelToSnake(item) : item
      )
    } else {
      result[snakeKey] = value
    }
  }
  
  return result as T
}

// ===================================================================
// SEGMENT-SPECIFIC CONVERSION UTILITIES
// ===================================================================

/**
 * Backend segment format (from API responses)
 */
export interface BackendSegment {
  id: string | number
  label: string
  label_display: string
  start_time: number
  end_time: number
  avgConfidence?: number
  segment_id?: number
  segment_start?: number
  segment_end?: number
}

/**
 * Frontend segment format (unified camelCase)
 */
export interface FrontendSegment {
  id: string | number
  label: string
  label_display: string
  startTime: number
  endTime: number
  avgConfidence?: number
  segmentId?: number
  segmentStart?: number
  segmentEnd?: number
}

/**
 * Converts a backend segment (snake_case) to frontend segment (camelCase)
 * Handles both start_time/end_time and segment_start/segment_end formats
 */
export function convertBackendSegmentToFrontend(backendSegment: BackendSegment): FrontendSegment {
  const converted: FrontendSegment = {
    id: backendSegment.id,
    label: backendSegment.label,
    label_display: backendSegment.label_display,
    // Primary time fields - prioritize start_time/end_time
    startTime: backendSegment.start_time ?? backendSegment.segment_start ?? 0,
    endTime: backendSegment.end_time ?? backendSegment.segment_end ?? 0,
  }

  // Optional fields
  if (backendSegment.avgConfidence !== undefined) {
    converted.avgConfidence = backendSegment.avgConfidence
  }
  if (backendSegment.segment_id !== undefined) {
    converted.segmentId = backendSegment.segment_id
  }
  if (backendSegment.segment_start !== undefined) {
    converted.segmentStart = backendSegment.segment_start
  }
  if (backendSegment.segment_end !== undefined) {
    converted.segmentEnd = backendSegment.segment_end
  }

  return converted
}

/**
 * Converts a frontend segment (camelCase) to backend segment (snake_case)
 * Always uses start_time/end_time format for API calls
 */
export function convertFrontendSegmentToBackend(frontendSegment: FrontendSegment): BackendSegment {
  const converted: BackendSegment = {
    id: frontendSegment.id,
    label: frontendSegment.label,
    label_display: frontendSegment.label_display,
    start_time: frontendSegment.startTime,
    end_time: frontendSegment.endTime,
  }

  // Optional fields
  if (frontendSegment.avgConfidence !== undefined) {
    converted.avgConfidence = frontendSegment.avgConfidence
  }

  return converted
}

/**
 * Converts an array of backend segments to frontend segments
 */
export function convertBackendSegmentsToFrontend(backendSegments: BackendSegment[]): FrontendSegment[] {
  return backendSegments.map(convertBackendSegmentToFrontend)
}

/**
 * Converts an array of frontend segments to backend segments
 */
export function convertFrontendSegmentsToBackend(frontendSegments: FrontendSegment[]): BackendSegment[] {
  return frontendSegments.map(convertFrontendSegmentToBackend)
}

/**
 * Normalizes a segment object to ensure it has consistent camelCase properties
 * Handles mixed format inputs by providing fallbacks
 */
export function normalizeSegmentToCamelCase(segment: any): FrontendSegment {
  return {
    id: segment.id,
    label: segment.label || '',
    label_display: segment.label_display || segment.labelDisplay || '',
    startTime: segment.startTime ?? segment.start_time ?? segment.segmentStart ?? segment.segment_start ?? 0,
    endTime: segment.endTime ?? segment.end_time ?? segment.segmentEnd ?? segment.segment_end ?? 0,
    avgConfidence: segment.avgConfidence ?? segment.avg_confidence,
    segmentId: segment.segmentId ?? segment.segment_id,
    segmentStart: segment.segmentStart ?? segment.segment_start,
    segmentEnd: segment.segmentEnd ?? segment.segment_end,
  }
}

/**
 * Creates a segment update payload for API calls
 * Converts camelCase frontend data to snake_case backend format
 */
export function createSegmentUpdatePayload(
  segmentId: string | number,
  startTime: number,
  endTime: number,
  additionalData?: Record<string, any>
): Record<string, any> {
  const payload = {
    start_frame_number: startTime,
    end_frame_number: endTime,
    ...additionalData
  }

  // Convert any camelCase keys in additionalData to snake_case
  return objectCamelToSnake(payload)
}

/**
 * Debug helper to log segment conversion
 */
export function debugSegmentConversion(original: any, converted: any, direction: 'toFrontend' | 'toBackend'): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`[SegmentConversion] ${direction}`)
    console.log('Original:', original)
    console.log('Converted:', converted)
    console.groupEnd()
  }
}