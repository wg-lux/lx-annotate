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
                    validated_annotators: ['reviewer-one'],
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
        expect(videoA?.validatedAnnotators).toEqual(['reviewer-one']);
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
    it('loads prediction model options for KI reruns', async () => {
        const store = useVideoStore();
        const axiosGet = axiosInstance.get;
        axiosGet.mockResolvedValueOnce({
            data: {
                models: [
                    {
                        id: 7,
                        name: 'segmentation-meta',
                        version: '3',
                        modelName: 'segmentation-model',
                        aiModelId: 5,
                        labelsetName: 'colon-labels',
                        labelsetVersion: 1,
                        labelsetId: 9,
                        weightsAvailable: true,
                        isActive: true
                    }
                ],
                defaultHuggingfaceModelId: 'wg-lux/custom-segmentation',
                defaultModelName: 'segmentation-model',
                defaultLabelsetName: 'colon-labels',
                huggingfaceModels: []
            }
        });
        const models = await store.fetchPredictionModels();
        expect(axiosGet).toHaveBeenCalledWith('media/videos/prediction-models/list/');
        expect(models).toHaveLength(1);
        expect(store.predictionModels[0]?.id).toBe(7);
        expect(store.defaultHuggingfaceModelId).toBe('wg-lux/custom-segmentation');
        expect(store.defaultPredictionLabelsetName).toBe('colon-labels');
    });
    it('reruns prediction segments and reloads prediction source rows', async () => {
        const store = useVideoStore();
        const axiosGet = axiosInstance.get;
        const axiosPost = axiosInstance.post;
        const payload = {
            hfModelId: 'wg-lux/custom-segmentation',
            labelsetName: 'colon-labels',
            replacePredictionSegments: true
        };
        axiosPost.mockResolvedValueOnce({
            data: {
                success: true,
                videoId: 101,
                modelMeta: {
                    id: 7,
                    name: 'segmentation-meta',
                    version: '3',
                    modelName: 'segmentation-model',
                    aiModelId: 5,
                    labelsetName: 'colon-labels',
                    labelsetVersion: 1,
                    labelsetId: 9,
                    weightsAvailable: true,
                    isActive: true
                },
                deletedPredictionSegments: 2,
                predictionSegmentsCount: 1
            }
        });
        axiosGet.mockResolvedValueOnce({
            data: [
                {
                    id: 501,
                    labelName: 'outside',
                    startTime: 3,
                    endTime: 8,
                    startFrameNumber: 75,
                    endFrameNumber: 200,
                    source_name: 'prediction',
                    segment_origin: 'prediction',
                    prediction_meta_id: 7
                }
            ]
        });
        store.setCurrentVideo(101);
        const response = await store.rerunPredictionSegments(101, payload);
        expect(axiosPost).toHaveBeenCalledWith('media/videos/101/segments/rerun-predictions/', payload);
        expect(axiosGet).toHaveBeenCalledWith('media/videos/101/segments/', expect.objectContaining({
            params: { source_kind: 'prediction' }
        }));
        expect(response.predictionSegmentsCount).toBe(1);
        expect(store.currentVideo?.segments?.[0]?.predictionMetaId).toBe(7);
        expect(store.currentVideo?.segments?.[0]?.segmentOrigin).toBe('prediction');
    });
});
