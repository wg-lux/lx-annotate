/**
 * Helper functions for time and frame calculations
 */
/**
 * Convert frame number to seconds
 * @param frames Frame number
 * @param fps Frames per second
 * @returns Time in seconds
 */
export function framesToSeconds(frames, fps) {
    if (!Number.isFinite(frames) || !Number.isFinite(fps) || fps <= 0) {
        return 0;
    }
    return frames / fps;
}
/**
 * Convert seconds to frame number
 * @param seconds Time in seconds
 * @param fps Frames per second
 * @returns Frame number (rounded)
 */
export function secondsToFrames(seconds, fps) {
    if (!Number.isFinite(seconds) || !Number.isFinite(fps) || fps <= 0) {
        return 0;
    }
    return Math.round(seconds * fps);
}
/**
 * Safe time conversion with NaN protection
 * @param timeValue Either time in seconds or frame number
 * @param isFrames Whether the value represents frames (true) or seconds (false)
 * @param fps Frames per second for conversion
 * @returns Time in seconds, 0 for invalid inputs
 */
export function safeTimeConversion(timeValue, isFrames, fps) {
    // ✅ FIX: Coerce invalid → 0, clamp negative → 0
    if (timeValue == null || Number.isNaN(timeValue) || !Number.isFinite(timeValue) || timeValue < 0)
        return 0;
    const seconds = isFrames ? framesToSeconds(timeValue, fps) : timeValue;
    return Math.max(0, seconds); // never negative
}
/**
 * Format time in MM:SS format with NaN protection
 * @param seconds Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
/**
 * Calculate segment width percentage for timeline display
 * @param start Start time in seconds
 * @param end End time in seconds
 * @param duration Total video duration in seconds
 * @returns Width percentage (0-100)
 */
export function calculateSegmentWidth(start, end, duration) {
    if (!Number.isFinite(start) ||
        !Number.isFinite(end) ||
        !Number.isFinite(duration) ||
        duration <= 0 ||
        end <= start) {
        return 0;
    }
    return ((end - start) / duration) * 100;
}
/**
 * Calculate segment position percentage for timeline display
 * @param start Start time in seconds
 * @param duration Total video duration in seconds
 * @returns Position percentage (0-100)
 */
export function calculateSegmentPosition(start, duration) {
    if (!Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) {
        return 0;
    }
    return (start / duration) * 100;
}
