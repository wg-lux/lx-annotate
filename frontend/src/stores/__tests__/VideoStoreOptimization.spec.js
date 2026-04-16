import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backendSegmentToSegment, useVideoStore } from '@/stores/videoStore';
import axiosInstance from '@/api/axiosInstance';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn()
    },
    r: (path) => path,
    a: (path) => path
}));
describe('VideoStore Performance Optimization', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });
    it('loads videos and segments from the list request (fixes N+1 problem)', async () => {
        const store = useVideoStore();
        const mockLabels = [
            { id: 1, name: 'polyp', color: '#ff0000' },
            { id: 2, name: 'instrument', color: '#00ff00' }
        ];
        const mockVideosResponse = {
            results: [
                {
                    id: 101,
                    original_file_name: 'Video A',
                    status: 'available',
                    segments: [
                        {
                            id: 500,
                            labelId: 1,
                            labelName: 'polyp',
                            startTime: 10.5,
                            endTime: 20.0,
                            startFrameNumber: 525,
                            endFrameNumber: 1000
                        }
                    ]
                },
                {
                    id: 102,
                    original_file_name: 'Video B',
                    status: 'available',
                    segments: []
                }
            ]
        };
        const axiosGet = axiosInstance.get;
        axiosGet.mockResolvedValueOnce({ data: mockLabels });
        axiosGet.mockResolvedValueOnce({ data: mockVideosResponse });
        await store.fetchAllVideos();
        expect(store.videoList.videos.length).toBe(2);
        const videoA = store.videoList.videos.find((video) => video.id === 101);
        expect(videoA).toBeDefined();
        expect(videoA?.segments?.length).toBe(1);
        expect(videoA?.segments?.[0].label).toBe('polyp');
        expect(videoA?.segments?.[0].startTime).toBe(10.5);
        const videoB = store.videoList.videos.find((video) => video.id === 102);
        expect(videoB?.segments?.length).toBe(0);
        expect(axiosGet).toHaveBeenCalledTimes(2);
        expect(axiosGet).toHaveBeenNthCalledWith(1, 'media/videos/labels/list/');
        expect(axiosGet).toHaveBeenNthCalledWith(2, 'media/videos/');
        const calls = axiosGet.mock.calls.map((call) => call[0]);
        const segmentCalls = calls.filter((url) => url.includes('/segments/'));
        expect(segmentCalls.length).toBe(0);
    });
    it('normalizes prediction segment origin metadata from the backend', () => {
        const segment = backendSegmentToSegment({
            id: 700,
            labelName: 'outside',
            startTime: 12,
            endTime: 18,
            startFrameNumber: 300,
            endFrameNumber: 450,
            source_name: 'prediction',
            segment_origin: 'prediction',
            prediction_meta_id: 44
        });
        expect(segment.segmentOrigin).toBe('prediction');
        expect(segment.sourceName).toBe('prediction');
        expect(segment.predictionMetaId).toBe(44);
    });
    it('passes source_kind when loading a non-default segment source', async () => {
        const store = useVideoStore();
        const axiosGet = axiosInstance.get;
        axiosGet.mockResolvedValueOnce({
            data: [
                {
                    id: 1,
                    labelName: 'outside',
                    startTime: 1,
                    endTime: 2,
                    startFrameNumber: 25,
                    endFrameNumber: 50,
                    source_name: 'prediction',
                    segment_origin: 'prediction'
                }
            ]
        });
        store.setCurrentVideo(101);
        await store.fetchAllSegments(101, true, { sourceKind: 'prediction' });
        expect(axiosGet).toHaveBeenCalledWith('media/videos/101/segments/', expect.objectContaining({
            params: { source_kind: 'prediction' }
        }));
        expect(store.currentVideo?.segments?.[0]?.segmentOrigin).toBe('prediction');
    });
});
