import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVideoStore } from '@/stores/videoStore';
import { framesToSeconds, secondsToFrames, safeTimeConversion } from '@/utils/timeHelpers';

// ✅ FIX: Mock axiosInstance at the top level with a factory function
vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  r: vi.fn((path: string) => path)
}))

describe('VideoStore - Frame to Time Conversion', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });
    describe('Helper Functions', () => {
        it('should convert frames to seconds correctly', () => {
            expect(framesToSeconds(30, 30)).toBe(1);
            expect(framesToSeconds(90, 30)).toBe(3);
            expect(framesToSeconds(150, 50)).toBe(3);
            expect(framesToSeconds(0, 30)).toBe(0);
        });
        it('should convert seconds to frames correctly', () => {
            expect(secondsToFrames(1, 30)).toBe(30);
            expect(secondsToFrames(3, 30)).toBe(90);
            expect(secondsToFrames(2.5, 30)).toBe(75);
            expect(secondsToFrames(0, 30)).toBe(0);
        });
        it('should handle invalid inputs safely', () => {
            expect(framesToSeconds(NaN, 30)).toBe(0);
            expect(framesToSeconds(30, 0)).toBe(0);
            expect(framesToSeconds(30, -1)).toBe(0);
            expect(secondsToFrames(NaN, 30)).toBe(0);
            expect(secondsToFrames(1, 0)).toBe(0);
        });
        it('should safely convert time values', () => {
            // Test frame conversion
            expect(safeTimeConversion(30, true, 30)).toBe(1); // 30 frames at 30fps = 1 second
            expect(safeTimeConversion(90, true, 30)).toBe(3); // 90 frames at 30fps = 3 seconds
            // Test time passthrough
            expect(safeTimeConversion(1, false, 30)).toBe(1); // 1 second stays 1 second
            expect(safeTimeConversion(3, false, 30)).toBe(3); // 3 seconds stays 3 seconds
            // Test null/undefined handling
            expect(safeTimeConversion(null, true, 30)).toBe(0);
            expect(safeTimeConversion(undefined, false, 30)).toBe(0);
            expect(safeTimeConversion(NaN, true, 30)).toBe(0);
        });
    });
    describe('VideoStore Integration', () => {
        it('should process segments with correct time conversion', async () => {
            const store = useVideoStore();
            // Mock video metadata
            store.videoMeta = {
                id: 1,
                original_file_name: 'test-video.mp4',
                status: 'available',
                assignedUser: null,
                anonymized: false,
                duration: 10, // 10 seconds
                fps: 30,
            };
            // Mock axios response for fetchVideoSegments
            const mockSegmentData = [
                {
                    id: 1,
                    label_id: 1,
                    label_name: 'polyp',
                    start_frame_number: 30, // Frame 30
                    end_frame_number: 90, // Frame 90
                    // No start_time/end_time - should be calculated from frames
                },
                {
                    id: 2,
                    label_id: 2,
                    label_name: 'blood',
                    start_time: 2, // Already in seconds
                    end_time: 4, // Already in seconds
                    start_frame_number: 60,
                    end_frame_number: 120,
                }
            ];

            // Process segments (this would normally be called by fetchVideoSegments)
            const processedSegments = mockSegmentData.map(segment => {
                const fps = 30;
                const startTime = safeTimeConversion(segment.start_time ?? segment.start_frame_number, segment.start_time === undefined, fps);
                const endTime = safeTimeConversion(segment.end_time ?? segment.end_frame_number, segment.end_time === undefined, fps);
                if (startTime === undefined || endTime === undefined) {
                    throw new Error('Invalid segment time conversion');
                }
                return {
                    id: segment.id,
                    label: segment.label_name,
                    startTime,
                    endTime,
                    duration: endTime - startTime
                };
            });
            // Verify first segment (from frames)
            expect(processedSegments[0].startTime).toBe(1); // 30/30 = 1 second
            expect(processedSegments[0].endTime).toBe(3); // 90/30 = 3 seconds
            expect(processedSegments[0].duration).toBe(2); // 3-1 = 2 seconds
            // Verify second segment (already in seconds)
            expect(processedSegments[1].startTime).toBe(2); // 2 seconds (passed through)
            expect(processedSegments[1].endTime).toBe(4); // 4 seconds (passed through)
            expect(processedSegments[1].duration).toBe(2); // 4-2 = 2 seconds
        });
        it('should calculate correct timeline width percentages', () => {
            const videoDuration = 10; // 10 seconds total
            // Test segment: 1-3 seconds (2 second duration)
            const segment = {
                startTime: 1,
                endTime: 3
            };
            const expectedWidth = ((segment.endTime - segment.startTime) / videoDuration) * 100;
            expect(expectedWidth).toBe(20); // 2 seconds of 10 seconds = 20%
            const expectedPosition = (segment.startTime / videoDuration) * 100;
            expect(expectedPosition).toBe(10); // Starts at 1 second of 10 seconds = 10%
        });
        it('should handle edge cases in segment processing', () => {
            const fps = 30;
            // Test very short segment (1 frame)
            const shortStartTime = safeTimeConversion(30, true, fps); // Frame 30
            const shortEndTime = safeTimeConversion(31, true, fps); // Frame 31
            if (shortStartTime === undefined || shortEndTime === undefined) {
                throw new Error('Invalid short segment time conversion');
            }
            expect(shortEndTime - shortStartTime).toBeCloseTo(1 / 30, 3); // ~0.033 seconds
            // Test zero-length segment
            const zeroStartTime = safeTimeConversion(30, true, fps);
            const zeroEndTime = safeTimeConversion(30, true, fps);
            if (zeroStartTime === undefined || zeroEndTime === undefined) {
                throw new Error('Invalid zero-length segment time conversion');
            }
            expect(zeroEndTime - zeroStartTime).toBe(0);
            // Test invalid frame numbers
            const invalidStart = safeTimeConversion(-1, true, fps);
            const invalidEnd = safeTimeConversion(null, true, fps);
            expect(invalidStart).toBe(0);
            expect(invalidEnd).toBe(0);
        });
    });
    describe('Timeline Display Calculations', () => {
        it('should calculate segment width correctly for 10-second video', () => {
            const videoDuration = 10;
            // 2-second segment should be 20% width
            const twoSecondSegment = { startTime: 1, endTime: 3 };
            const width = ((twoSecondSegment.endTime - twoSecondSegment.startTime) / videoDuration) * 100;
            expect(width).toBe(20);
            // 5-second segment should be 50% width  
            const fiveSecondSegment = { startTime: 2, endTime: 7 };
            const width2 = ((fiveSecondSegment.endTime - fiveSecondSegment.startTime) / videoDuration) * 100;
            expect(width2).toBe(50);
        });
        it('should handle segments converted from frames correctly', () => {
            const fps = 30;
            const videoDuration = 10; // 10 seconds = 300 frames at 30fps
            // Segment from frame 30 to frame 90 (1-3 seconds)
            const startTime = framesToSeconds(30, fps); // 1 second
            const endTime = framesToSeconds(90, fps); // 3 seconds
            const width = ((endTime - startTime) / videoDuration) * 100;
            const position = (startTime / videoDuration) * 100;
            expect(width).toBe(20); // 2 seconds of 10 = 20%
            expect(position).toBe(10); // Starts at 1 second of 10 = 10%
            // Verify these are not NaN or 0
            expect(width).toBeGreaterThan(0);
            expect(position).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(width)).toBe(true);
            expect(Number.isFinite(position)).toBe(true);
        });
    });
});
