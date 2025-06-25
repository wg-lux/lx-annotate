import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVideoStore } from '@/stores/videoStore';
import axiosInstance from '@/api/axiosInstance';
// ✅ FIX: Proper mock setup with explicit types
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    }
}));
describe('VideoStore', () => {
    let store;
    beforeEach(() => {
        setActivePinia(createPinia());
        store = useVideoStore();
        vi.resetAllMocks();
    });
    describe('Draft Creation and Management', () => {
        it('should start a draft with correct initial values', () => {
            // Act
            store.startDraft('polyp', 10.5);
            // Assert
            expect(store.draftSegment).toEqual({
                label: 'polyp',
                start: 10.5,
                end: null
            });
        });
        it('should update draft end time', () => {
            // Arrange
            store.startDraft('polyp', 10.5);
            // Act
            store.updateDraftEnd(15.0);
            // Assert
            expect(store.draftSegment).toEqual({
                label: 'polyp',
                start: 10.5,
                end: 15.0
            });
        });
        it('should not update end time if no draft exists', () => {
            // Act
            store.updateDraftEnd(15.0);
            // Assert
            expect(store.draftSegment).toBe(null);
        });
        it('should cancel draft and reset to null', () => {
            // Arrange
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            store.cancelDraft();
            // Assert
            expect(store.draftSegment).toBe(null);
        });
        it('should replace existing draft when starting new one', () => {
            // Arrange
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            store.startDraft('blood', 20.0);
            // Assert
            expect(store.draftSegment).toEqual({
                label: 'blood',
                start: 20.0,
                end: null
            });
        });
    });
    describe('Draft Commit Process', () => {
        it('should successfully commit a complete draft', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    id: 456,
                    start_time: 10.5,
                    end_time: 15.0,
                    label_name: 'polyp'
                }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(vi.mocked(axiosInstance.post)).toHaveBeenCalledWith('/api/video-segments/', {
                video_id: 123,
                start_time: 10.5,
                end_time: 15.0,
                label_name: 'polyp'
            });
            expect(result).toEqual({
                id: 456,
                label: 'polyp',
                startTime: 10.5,
                endTime: 15.0,
                avgConfidence: 1,
                videoID: 123,
                startFrameNumber: 315, // 10.5 * 30 FPS
                endFrameNumber: 450 // 15.0 * 30 FPS
            });
            expect(store.draftSegment).toBe(null);
            expect(store.segmentsByLabel.polyp).toContainEqual(result);
        });
        it('should return null if draft is incomplete (no end time)', async () => {
            // Arrange
            store.startDraft('polyp', 10.5);
            // Don't set end time
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result).toBe(null);
            expect(vi.mocked(axiosInstance.post)).not.toHaveBeenCalled();
            expect(store.draftSegment).toEqual({
                label: 'polyp',
                start: 10.5,
                end: null
            });
        });
        it('should return null if no draft exists', async () => {
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result).toBe(null);
            expect(vi.mocked(axiosInstance.post)).not.toHaveBeenCalled();
        });
        it('should return null if no current video', async () => {
            // Arrange
            store.currentVideo = null;
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result).toBe(null);
            expect(vi.mocked(axiosInstance.post)).not.toHaveBeenCalled();
        });
        it('should handle API errors gracefully', async () => {
            // Arrange
            const mockError = {
                response: { data: 'Server Error' },
                message: 'Network Error'
            };
            vi.mocked(axiosInstance.post).mockRejectedValueOnce(mockError);
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result).toBe(null);
            expect(store.errorMessage).toBe('Error creating segment. Please try again.');
            // Draft should still exist for retry
            expect(store.draftSegment).toEqual({
                label: 'polyp',
                start: 10.5,
                end: 15.0
            });
        });
        it('should create new label group if it doesn\'t exist', async () => {
            // Arrange
            const mockResponse = {
                data: {
                    id: 456,
                    start_time: 10.5,
                    end_time: 15.0,
                    label_name: 'new_label'
                }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('new_label', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(store.segmentsByLabel.new_label).toBeDefined();
            expect(store.segmentsByLabel.new_label).toHaveLength(1);
            expect(store.segmentsByLabel.new_label[0]).toEqual(result);
        });
    });
    describe('Integration with Translation System', () => {
        it('should use correct translated label display names', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 10.5, end_time: 15.0, label_name: 'polyp' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(store.getTranslationForLabel(result?.label || '')).toBe('Polyp');
        });
        it('should handle unknown labels gracefully', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 10.5, end_time: 15.0, label_name: 'unknown_label' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('unknown_label', 10.5);
            store.updateDraftEnd(15.0);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result?.label).toBe('unknown_label'); // Falls back to original
        });
    });
    describe('Frame Calculation', () => {
        it('should calculate frame numbers correctly with 30 FPS', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 5.5, end_time: 8.2, label_name: 'polyp' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('polyp', 5.5);
            store.updateDraftEnd(8.2);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result?.startFrameNumber).toBe(165); // 5.5 * 30 = 165
            expect(result?.endFrameNumber).toBe(246); // 8.2 * 30 = 246
        });
    });
    describe('Edge Cases and Validation', () => {
        it('should handle zero start time', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 0, end_time: 5.0, label_name: 'polyp' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('polyp', 0);
            store.updateDraftEnd(5.0);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result?.startTime).toBe(0);
            expect(result?.startFrameNumber).toBe(0);
        });
        it('should handle very short segments', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 10.0, end_time: 10.1, label_name: 'polyp' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('polyp', 10.0);
            store.updateDraftEnd(10.1);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result?.endTime - result?.startTime).toBe(0.1);
        });
        it('should handle decimal precision correctly', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 10.333, end_time: 15.666, label_name: 'polyp' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            store.startDraft('polyp', 10.333);
            store.updateDraftEnd(15.666);
            // Act
            const result = await store.commitDraft();
            // Assert
            expect(result?.startFrameNumber).toBe(310); // Math.round(10.333 * 30)
            expect(result?.endFrameNumber).toBe(470); // Math.round(15.666 * 30)
        });
    });
});
describe('Draft System Integration Scenarios', () => {
    let store;
    beforeEach(() => {
        setActivePinia(createPinia());
        store = useVideoStore();
        vi.resetAllMocks();
        // ✅ FIX: Set current video using proper store method or property
        // Remove the problematic _unsafe_setCurrentVideo call since it doesn't exist
        // Instead, create a mock video directly on the store
        Object.defineProperty(store, 'currentVideo', {
            value: {
                id: '123',
                videoUrl: 'test-url',
                status: 'available',
                assignedUser: null,
                isAnnotated: false,
                errorMessage: '',
                segments: []
            },
            writable: true
        });
    });
    describe('User Workflow Simulations', () => {
        it('should simulate: Label selection → Button workflow', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 10.5, end_time: 15.0, label_name: 'polyp' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            // Act: Simulate user selecting label (starts draft immediately)
            store.startDraft('polyp', 10.5);
            // Act: Simulate user clicking "Label-Ende setzen"
            store.updateDraftEnd(15.0);
            const result = await store.commitDraft();
            // Assert
            expect(result).toBeTruthy();
            expect(result?.label).toBe('polyp');
            expect(store.draftSegment).toBe(null);
        });
        it('should simulate: Shift-click timeline workflow', async () => {
            // Arrange
            const mockResponse = {
                data: { id: 456, start_time: 20.0, end_time: 25.0, label_name: 'blood' }
            };
            vi.mocked(axiosInstance.post).mockResolvedValueOnce(mockResponse);
            // Act: Simulate shift-click creating 5-second segment
            store.startDraft('blood', 20.0);
            store.updateDraftEnd(25.0); // 5 seconds later
            const result = await store.commitDraft();
            // Assert
            expect(result).toBeTruthy();
            expect(result?.endTime - result?.startTime).toBe(5.0);
            expect(store.draftSegment).toBe(null);
        });
        it('should simulate: User changes mind and cancels', () => {
            // Act: User starts draft
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act: User changes mind and cancels
            store.cancelDraft();
            // Assert
            expect(store.draftSegment).toBe(null);
        });
        it('should simulate: User changes label during drafting', () => {
            // Act: User starts with one label
            store.startDraft('polyp', 10.5);
            // Act: User changes to different label (should replace draft)
            store.startDraft('blood', 12.0);
            // Assert
            expect(store.draftSegment).toEqual({
                label: 'blood',
                start: 12.0,
                end: null
            });
        });
    });
    describe('Error Recovery Scenarios', () => {
        it('should allow retry after network error', async () => {
            // Arrange
            const mockError = { response: { data: 'Network Error' } };
            const mockSuccess = {
                data: { id: 456, start_time: 10.5, end_time: 15.0, label_name: 'polyp' }
            };
            vi.mocked(axiosInstance.post)
                .mockRejectedValueOnce(mockError)
                .mockResolvedValueOnce(mockSuccess);
            store.startDraft('polyp', 10.5);
            store.updateDraftEnd(15.0);
            // Act: First attempt fails
            const firstResult = await store.commitDraft();
            expect(firstResult).toBe(null);
            expect(store.draftSegment).toBeTruthy(); // Draft preserved for retry
            // Act: Second attempt succeeds
            const secondResult = await store.commitDraft();
            // Assert
            expect(secondResult).toBeTruthy();
            expect(store.draftSegment).toBe(null);
        });
    });
});
