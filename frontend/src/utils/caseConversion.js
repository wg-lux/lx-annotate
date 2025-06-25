/**
 * Utility functions for converting between snake_case and camelCase
 * Specifically designed to handle segment time properties consistently
 */
export function snakeToCamel(snakeStr) {
    const components = snakeStr.split('_');
    // Capitalize the first letter of each component except the first
    return components[0] + components.slice(1).map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join('');
}
/**
 * Converts a camelCase string to snake_case
 * @param camelStr - The string in camelCase format
 * @returns The string in snake_case format
 */
export function camelToSnake(camelStr) {
    return camelStr.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
/**
 * Converts an object with snake_case keys to camelCase keys
 * @param obj - Object with snake_case keys
 * @returns Object with camelCase keys
 */
export function objectSnakeToCamel(obj) {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = snakeToCamel(key);
        // Recursively convert nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[camelKey] = objectSnakeToCamel(value);
        }
        else if (Array.isArray(value)) {
            result[camelKey] = value.map(item => item && typeof item === 'object' ? objectSnakeToCamel(item) : item);
        }
        else {
            result[camelKey] = value;
        }
    }
    return result;
}
/**
 * Converts an object with camelCase keys to snake_case keys
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export function objectCamelToSnake(obj) {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = camelToSnake(key);
        // Recursively convert nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[snakeKey] = objectCamelToSnake(value);
        }
        else if (Array.isArray(value)) {
            result[snakeKey] = value.map(item => item && typeof item === 'object' ? objectCamelToSnake(item) : item);
        }
        else {
            result[snakeKey] = value;
        }
    }
    return result;
}
/**
 * Converts a backend segment (snake_case) to frontend segment (camelCase)
 * Handles both start_time/end_time and segment_start/segment_end formats
 */
export function convertBackendSegmentToFrontend(backendSegment) {
    const converted = {
        id: backendSegment.id,
        startFrameNumber: backendSegment.start_frame_number ?? undefined,
        endFrameNumber: backendSegment.end_frame_number ?? undefined,
        label: backendSegment.label_name,
        startTime: backendSegment.start_time ?? undefined,
        endTime: backendSegment.end_time ?? undefined,
        usingFPS: false,
    };
    if (backendSegment.start_time !== undefined) {
        converted.usingFPS = true; // Indicates need for FPS conversion
    }
    return converted;
}
/**
 * Converts a frontend segment (camelCase) to backend segment (snake_case)
 * Always uses start_time/end_time format for API calls
 */
export function convertFrontendSegmentToBackend(frontendSegment) {
    const converted = {
        id: frontendSegment.id,
        label_name: frontendSegment.label,
        start_time: frontendSegment.startTime,
        end_time: frontendSegment.endTime,
        video_name: frontendSegment.videoName || '', // Optional field for video name
    };
    return converted;
}
/**
 * Converts an array of backend segments to frontend segments
 */
export function convertBackendSegmentsToFrontend(backendSegments) {
    return backendSegments.map(convertBackendSegmentToFrontend);
}
/**
 * Converts an array of frontend segments to backend segments
 */
export function convertFrontendSegmentsToBackend(frontendSegments) {
    return frontendSegments.map(convertFrontendSegmentToBackend);
}
/**
 * Normalizes a segment object to ensure it has consistent camelCase properties
 * Handles mixed format inputs by providing fallbacks
 */
export function normalizeSegmentToCamelCase(segment) {
    return {
        id: segment.id,
        label: segment.label_name || '',
        startTime: segment.startTime ?? segment.start_time ?? segment.segmentStart ?? segment.segment_start ?? 0,
        endTime: segment.endTime ?? segment.end_time ?? segment.segmentEnd ?? segment.segment_end ?? 0,
        startFrameNumber: segment.startFrameNumber ?? segment.start_frame_number ?? 0,
        endFrameNumber: segment.endFrameNumber ?? segment.end_frame_number ?? 0,
        videoName: segment.videoName || segment.video_name || '',
        usingFPS: segment.usingFPS ?? segment.using_fps ?? false,
    };
}
/**
 * Creates a segment update payload for API calls
 * Converts camelCase frontend data to snake_case backend format
 */
export function createSegmentUpdatePayload(segmentId, startTime, endTime, additionalData) {
    const payload = {
        start_time: startTime,
        end_time: endTime,
        label_name: additionalData?.label || additionalData?.label_name,
        ...additionalData
    };
    // Convert any camelCase keys in additionalData to snake_case
    return objectCamelToSnake(payload);
}
/**
 * Debug helper to log segment conversion
 */
export function debugSegmentConversion(original, converted, direction) {
    if (process.env.NODE_ENV === 'development') {
        console.group(`[SegmentConversion] ${direction}`);
        console.log('Original:', original);
        console.log('Converted:', converted);
        console.groupEnd();
    }
}
