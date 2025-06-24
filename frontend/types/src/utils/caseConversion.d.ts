/**
 * Utility functions for converting between snake_case and camelCase
 * Specifically designed to handle segment time properties consistently
 */
/**
 * Converts a snake_case string to camelCase
 * @param snakeStr - The string in snake_case format
 * @returns The string in camelCase format
 */
export declare function snakeToCamel(snakeStr: string): string;
/**
 * Converts a camelCase string to snake_case
 * @param camelStr - The string in camelCase format
 * @returns The string in snake_case format
 */
export declare function camelToSnake(camelStr: string): string;
/**
 * Converts an object with snake_case keys to camelCase keys
 * @param obj - Object with snake_case keys
 * @returns Object with camelCase keys
 */
export declare function objectSnakeToCamel<T = any>(obj: Record<string, any>): T;
/**
 * Converts an object with camelCase keys to snake_case keys
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export declare function objectCamelToSnake<T = any>(obj: Record<string, any>): T;
/**
 * Backend segment format (from API responses)
 */
export interface BackendSegment {
    id: string | number;
    label: string;
    label_display: string;
    start_time: number;
    end_time: number;
    avgConfidence?: number;
    segment_id?: number;
    segment_start?: number;
    segment_end?: number;
}
/**
 * Frontend segment format (unified camelCase)
 */
export interface FrontendSegment {
    id: string | number;
    label: string;
    label_display: string;
    startTime: number;
    endTime: number;
    avgConfidence?: number;
    segmentId?: number;
    segmentStart?: number;
    segmentEnd?: number;
}
/**
 * Converts a backend segment (snake_case) to frontend segment (camelCase)
 * Handles both start_time/end_time and segment_start/segment_end formats
 */
export declare function convertBackendSegmentToFrontend(backendSegment: BackendSegment): FrontendSegment;
/**
 * Converts a frontend segment (camelCase) to backend segment (snake_case)
 * Always uses start_time/end_time format for API calls
 */
export declare function convertFrontendSegmentToBackend(frontendSegment: FrontendSegment): BackendSegment;
/**
 * Converts an array of backend segments to frontend segments
 */
export declare function convertBackendSegmentsToFrontend(backendSegments: BackendSegment[]): FrontendSegment[];
/**
 * Converts an array of frontend segments to backend segments
 */
export declare function convertFrontendSegmentsToBackend(frontendSegments: FrontendSegment[]): BackendSegment[];
/**
 * Normalizes a segment object to ensure it has consistent camelCase properties
 * Handles mixed format inputs by providing fallbacks
 */
export declare function normalizeSegmentToCamelCase(segment: any): FrontendSegment;
/**
 * Creates a segment update payload for API calls
 * Converts camelCase frontend data to snake_case backend format
 */
export declare function createSegmentUpdatePayload(segmentId: string | number, startTime: number, endTime: number, additionalData?: Record<string, any>): Record<string, any>;
/**
 * Debug helper to log segment conversion
 */
export declare function debugSegmentConversion(original: any, converted: any, direction: 'toFrontend' | 'toBackend'): void;
