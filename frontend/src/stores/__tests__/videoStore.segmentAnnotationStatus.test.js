import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import axiosInstance from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
import { useVideoStore } from '@/stores/videoStore';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
    },
    r: (path) => path
}));
describe('VideoStore segment annotation status mapping', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.resetAllMocks();
    });
    it('maps cleanup status fields from snake_case API responses', async () => {
        vi.mocked(axiosInstance.get).mockImplementation(async (url) => {
            if (url === endpoints.media.videoLabelsList) {
                return { data: [] };
            }
            if (url === endpoints.media.videos) {
                return {
                    data: [
                        {
                            id: 25,
                            original_file_name: 'case-25.mp4',
                            center_name: 'Center A',
                            segment_annotations_validated: false,
                            segment_annotation_status: 'cleanup_running',
                            outside_segments_removed: false,
                            post_validation_rebuild: {
                                id: 9,
                                status: 'running',
                                task_id: 'task-9',
                                details: 'extracting frames'
                            }
                        }
                    ]
                };
            }
            return { data: {} };
        });
        const store = useVideoStore();
        const result = await store.fetchAllVideos();
        expect(result.videos[0]).toMatchObject({
            id: 25,
            segmentAnnotationsValidated: false,
            segmentAnnotationStatus: 'cleanup_running',
            outsideSegmentsRemoved: false,
            postValidationRebuild: {
                id: 9,
                status: 'running',
                task_id: 'task-9',
                details: 'extracting frames'
            }
        });
    });
    it('defaults legacy validated videos to validated segment status', async () => {
        vi.mocked(axiosInstance.get).mockImplementation(async (url) => {
            if (url === endpoints.media.videoLabelsList) {
                return { data: [] };
            }
            if (url === endpoints.media.videos) {
                return {
                    data: [
                        {
                            id: 31,
                            original_file_name: 'legacy-validated.mp4',
                            segment_annotations_validated: true
                        }
                    ]
                };
            }
            return { data: {} };
        });
        const store = useVideoStore();
        const result = await store.fetchAllVideos();
        expect(result.videos[0]).toMatchObject({
            id: 31,
            segmentAnnotationsValidated: true,
            segmentAnnotationStatus: 'validated'
        });
    });
    it('adds the selected ai dataset id to segment bulk mutation payloads', async () => {
        vi.mocked(axiosInstance.get).mockImplementation(async (url) => {
            if (url === endpoints.media.videoLabelsList) {
                return { data: [{ id: 2, name: 'outside' }] };
            }
            return { data: {} };
        });
        const store = useVideoStore();
        await store.fetchLabels();
        store.setSegmentAiDatasetId(300);
        vi.mocked(axiosInstance.post).mockResolvedValue({
            data: {
                created: [
                    {
                        clientId: -1,
                        segment: {
                            id: 50,
                            videoId: 7,
                            labelId: 2,
                            labelName: 'outside',
                            startTime: 0,
                            endTime: 1,
                            startFrameNumber: 0,
                            endFrameNumber: 50
                        }
                    }
                ],
                updated: [],
                deleted: []
            }
        });
        await store.createSegment(7, 'outside', 0, 1);
        expect(axiosInstance.post).toHaveBeenCalledWith(endpoints.media.videoSegmentsBulkMutation(7), expect.objectContaining({
            aiDatasetId: 300
        }));
    });
});
