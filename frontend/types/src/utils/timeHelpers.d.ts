/**
 * Helper functions for time and frame calculations
 */
/**
 * Convert frame number to seconds
 * @param frames Frame number
 * @param fps Frames per second
 * @returns Time in seconds
 */
export declare function framesToSeconds(frames: number, fps: number): number;
/**
 * Convert seconds to frame number
 * @param seconds Time in seconds
 * @param fps Frames per second
 * @returns Frame number (rounded)
 */
export declare function secondsToFrames(seconds: number, fps: number): number;
/**
 * Safe time conversion with NaN protection
 * @param timeValue Either time in seconds or frame number
 * @param isFrames Whether the value represents frames (true) or seconds (false)
 * @param fps Frames per second for conversion
 * @returns Time in seconds, 0 for invalid inputs
 */
export declare function safeTimeConversion(timeValue: number | null | undefined, isFrames: boolean, fps: number): number;
/**
 * Format time in MM:SS format with NaN protection
 * @param seconds Time in seconds
 * @returns Formatted time string
 */
export declare function formatTime(seconds: number): string;
/**
 * Calculate segment width percentage for timeline display
 * @param start Start time in seconds
 * @param end End time in seconds
 * @param duration Total video duration in seconds
 * @returns Width percentage (0-100)
 */
export declare function calculateSegmentWidth(start?: number, end?: number, duration?: number): number;
/**
 * Calculate segment position percentage for timeline display
 * @param start Start time in seconds
 * @param duration Total video duration in seconds
 * @returns Position percentage (0-100)
 */
export declare function calculateSegmentPosition(start?: number, duration?: number): number;
