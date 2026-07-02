import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModelTrainingPage from '../ModelTrainingPage.vue';
const hoisted = vi.hoisted(() => ({
    fetchModelTrainingOptions: vi.fn(),
    fetchModelTrainingRuns: vi.fn(),
    createModelTrainingRun: vi.fn(),
    fetchModelTrainingRun: vi.fn(),
    fetchAiDatasetFrameBucketDistribution: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn()
}));
vi.mock('@/api/modelTrainingApi', () => ({
    fetchModelTrainingOptions: hoisted.fetchModelTrainingOptions,
    fetchModelTrainingRuns: hoisted.fetchModelTrainingRuns,
    createModelTrainingRun: hoisted.createModelTrainingRun,
    fetchModelTrainingRun: hoisted.fetchModelTrainingRun
}));
vi.mock('@/api/aiDatasetApi', () => ({
    fetchAiDatasetFrameBucketDistribution: hoisted.fetchAiDatasetFrameBucketDistribution
}));
vi.mock('@/stores/toastStore', () => ({
    useToastStore: () => ({
        success: hoisted.toastSuccess,
        error: hoisted.toastError
    })
}));
describe('ModelTrainingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setActivePinia(createPinia());
        localStorage.clear();
        hoisted.fetchModelTrainingRuns.mockResolvedValue([]);
        hoisted.fetchAiDatasetFrameBucketDistribution.mockResolvedValue({
            datasetId: 7,
            name: 'Dataset A',
            datasetType: 'image',
            aiModelType: 'image_multilabel_classification',
            isActive: true,
            updatedAt: '2026-04-17T10:00:00Z',
            labelGroupId: null,
            labelGroupName: null,
            targetLabelId: null,
            targetLabelName: null,
            predictionSegmentsOnly: false,
            summary: {
                imageAnnotationCount: 3,
                videoAnnotationCount: 2,
                annotationFrameCount: 3,
                segmentFrameCount: 4,
                mergedFrameCount: 6,
                videoCount: 2,
                labelCount: 5
            },
            targetBuckets: [],
            labelDistribution: [],
            annotationFrameBuckets: [],
            segmentFrameBuckets: [],
            mergedFrameBuckets: []
        });
        hoisted.fetchModelTrainingOptions.mockResolvedValue({
            trainingTargets: [
                {
                    value: 'image_multilabel',
                    label: 'Image Multilabel Model',
                    description: 'Frame classifier.'
                },
                {
                    value: 'phi_region_detector',
                    label: 'PHI Region Detector',
                    description: 'Custom detector.'
                }
            ],
            aiDatasets: [
                {
                    id: 7,
                    value: 'Dataset A',
                    label: 'Dataset A',
                    datasetType: 'image',
                    aiModelType: 'image_multilabel_classification',
                    isActive: true,
                    nameCount: 1
                },
                {
                    id: 9,
                    value: 'Dataset B',
                    label: 'Dataset B',
                    datasetType: 'video',
                    aiModelType: 'video_segment_classification',
                    isActive: false,
                    nameCount: 1
                }
            ],
            backbones: [
                {
                    value: 'gastro_rn50',
                    label: 'GastroNet ResNet50',
                    description: 'ResNet50 with GastroNet checkpoint support.'
                }
            ],
            featureModes: [
                {
                    value: 'freeze_backbone',
                    label: 'Frozen Backbone',
                    description: 'Head-only training.'
                }
            ],
            phiRegionDetector: {
                baseModels: [
                    {
                        value: 'yolov8n.pt',
                        label: 'YOLOv8 Nano',
                        description: 'Small detector.'
                    }
                ],
                defaults: {
                    baseModel: 'yolov8n.pt',
                    datasetYaml: '',
                    outputDir: '/tmp/phi-runs',
                    runName: '',
                    epochs: 50,
                    batchSize: 16,
                    inputSize: 640,
                    device: 'auto',
                    workers: 4,
                    patience: 25,
                    exportOnnx: true,
                    confidenceThreshold: 0.35,
                    nmsThreshold: 0.45,
                    classIds: ''
                }
            },
            defaults: {
                epochs: 10,
                batchSize: 32,
                labelsetVersion: 2,
                backboneName: 'gastro_rn50',
                featureMode: 'freeze_backbone',
                treatUnlabeledAsNegative: true,
                backboneCheckpoint: null
            }
        });
    });
    it('loads training options and starts a run', async () => {
        hoisted.createModelTrainingRun.mockResolvedValue({
            runId: 'run-1',
            status: 'queued',
            datasetId: 7,
            datasetName: 'Dataset A',
            backboneName: 'gastro_rn50',
            featureMode: 'freeze_backbone',
            freezeBackbone: true,
            epochs: 10,
            batchSize: 32,
            labelsetVersion: 2,
            treatUnlabeledAsNegative: true,
            backboneCheckpoint: null,
            createdAt: '2026-04-17T10:00:00Z',
            startedAt: null,
            finishedAt: null,
            result: null,
            error: null,
            stdout: ''
        });
        hoisted.fetchModelTrainingRun.mockResolvedValue({
            runId: 'run-1',
            status: 'completed',
            datasetId: 7,
            datasetName: 'Dataset A',
            backboneName: 'gastro_rn50',
            featureMode: 'freeze_backbone',
            freezeBackbone: true,
            epochs: 10,
            batchSize: 32,
            labelsetVersion: 2,
            treatUnlabeledAsNegative: true,
            backboneCheckpoint: null,
            createdAt: '2026-04-17T10:00:00Z',
            startedAt: '2026-04-17T10:00:01Z',
            finishedAt: '2026-04-17T10:10:00Z',
            result: {
                modelPath: '/tmp/model.pth',
                metaPath: '/tmp/meta.json'
            },
            error: null,
            stdout: 'training finished'
        });
        const wrapper = mount(ModelTrainingPage);
        await flushPromises();
        expect(hoisted.fetchModelTrainingOptions).toHaveBeenCalledTimes(1);
        expect(hoisted.fetchModelTrainingRuns).toHaveBeenCalledTimes(1);
        const datasetSelect = wrapper.get('[data-test="training-dataset-select"]')
            .element;
        expect(datasetSelect.value).toBe('7');
        expect(Array.from(datasetSelect.options).map((option) => option.textContent)).not.toContain('Dataset B (ID: 9)');
        expect(wrapper.text()).toContain('nicht als Frame-Annotationen gespeichert');
        expect(wrapper.get('[data-test="training-dataset-summary"]').text()).toContain('6 Trainingsframes');
        await wrapper.get('[data-test="start-training-run"]').trigger('click');
        await flushPromises();
        expect(hoisted.createModelTrainingRun).toHaveBeenCalledWith({
            datasetId: 7,
            annotationSourceScope: 'all',
            backboneName: 'gastro_rn50',
            featureMode: 'freeze_backbone',
            epochs: 10,
            batchSize: 32,
            labelsetVersion: 2,
            treatUnlabeledAsNegative: true,
            backboneCheckpoint: null
        });
        expect(hoisted.fetchModelTrainingRun).toHaveBeenCalledWith('run-1');
        expect(wrapper.text()).toContain('Training abgeschlossen');
        expect(wrapper.text()).toContain('/tmp/model.pth');
    });
    it('starts image training with segment-only annotation scope', async () => {
        hoisted.createModelTrainingRun.mockResolvedValue({
            runId: 'run-segments',
            status: 'queued',
            datasetId: 7,
            datasetName: 'Dataset A',
            annotationSourceScope: 'segment_only',
            backboneName: 'gastro_rn50',
            featureMode: 'freeze_backbone',
            freezeBackbone: true,
            epochs: 10,
            batchSize: 32,
            labelsetVersion: 2,
            treatUnlabeledAsNegative: true,
            backboneCheckpoint: null,
            createdAt: '2026-04-17T10:00:00Z',
            startedAt: null,
            finishedAt: null,
            result: null,
            error: null,
            stdout: ''
        });
        hoisted.fetchModelTrainingRun.mockResolvedValue({
            runId: 'run-segments',
            status: 'completed',
            datasetId: 7,
            datasetName: 'Dataset A',
            annotationSourceScope: 'segment_only',
            backboneName: 'gastro_rn50',
            featureMode: 'freeze_backbone',
            freezeBackbone: true,
            epochs: 10,
            batchSize: 32,
            labelsetVersion: 2,
            treatUnlabeledAsNegative: true,
            backboneCheckpoint: null,
            createdAt: '2026-04-17T10:00:00Z',
            startedAt: '2026-04-17T10:00:01Z',
            finishedAt: '2026-04-17T10:10:00Z',
            result: null,
            error: null,
            stdout: 'training finished'
        });
        const wrapper = mount(ModelTrainingPage);
        await flushPromises();
        await wrapper.get('[data-test="annotation-source-segment_only"]').trigger('click');
        await wrapper.get('[data-test="start-training-run"]').trigger('click');
        await flushPromises();
        expect(wrapper.get('[data-test="training-dataset-summary"]').text()).toContain('4 Trainingsframes');
        expect(hoisted.createModelTrainingRun).toHaveBeenCalledWith(expect.objectContaining({
            datasetId: 7,
            annotationSourceScope: 'segment_only'
        }));
        expect(wrapper.text()).toContain('Nur Segmente');
    });
    it('disables image training when selected annotation scope has no frames', async () => {
        hoisted.fetchAiDatasetFrameBucketDistribution.mockResolvedValue({
            datasetId: 7,
            name: 'Dataset A',
            datasetType: 'image',
            aiModelType: 'image_multilabel_classification',
            isActive: true,
            updatedAt: '2026-04-17T10:00:00Z',
            labelGroupId: null,
            labelGroupName: null,
            targetLabelId: null,
            targetLabelName: null,
            predictionSegmentsOnly: false,
            summary: {
                imageAnnotationCount: 3,
                videoAnnotationCount: 0,
                annotationFrameCount: 3,
                segmentFrameCount: 0,
                mergedFrameCount: 3,
                videoCount: 1,
                labelCount: 2
            },
            targetBuckets: [],
            labelDistribution: [],
            annotationFrameBuckets: [],
            segmentFrameBuckets: [],
            mergedFrameBuckets: []
        });
        const wrapper = mount(ModelTrainingPage);
        await flushPromises();
        await wrapper.get('[data-test="annotation-source-segment_only"]').trigger('click');
        await flushPromises();
        expect(wrapper.get('[data-test="start-training-run"]').attributes('disabled')).toBeDefined();
        expect(wrapper.text()).toContain('keine trainierbaren Frames');
    });
    it('shows backend validation errors when starting image training fails', async () => {
        hoisted.createModelTrainingRun.mockRejectedValue({
            response: {
                data: {
                    errors: {
                        annotationSourceScope: 'annotation_source_scope must be one of: all, frame_only, segment_only.'
                    }
                }
            }
        });
        const wrapper = mount(ModelTrainingPage);
        await flushPromises();
        await wrapper.get('[data-test="start-training-run"]').trigger('click');
        await flushPromises();
        expect(wrapper.text()).toContain('annotation_source_scope must be one of');
    });
    it('starts a PHI region detector training run', async () => {
        hoisted.createModelTrainingRun.mockResolvedValue({
            runId: 'phi-run-1',
            trainingTarget: 'phi_region_detector',
            status: 'queued',
            datasetId: null,
            datasetName: 'dataset.yaml',
            datasetType: 'image',
            aiModelType: 'phi_region_detector',
            backboneName: 'yolov8n.pt',
            featureMode: 'yolo_onnx_detector',
            freezeBackbone: false,
            epochs: 50,
            batchSize: 16,
            labelsetVersion: 1,
            treatUnlabeledAsNegative: false,
            backboneCheckpoint: null,
            createdAt: '2026-04-17T10:00:00Z',
            startedAt: null,
            finishedAt: null,
            result: null,
            error: null,
            stdout: ''
        });
        hoisted.fetchModelTrainingRun.mockResolvedValue({
            runId: 'phi-run-1',
            trainingTarget: 'phi_region_detector',
            status: 'completed',
            datasetId: null,
            datasetName: 'dataset.yaml',
            datasetType: 'image',
            aiModelType: 'phi_region_detector',
            backboneName: 'yolov8n.pt',
            featureMode: 'yolo_onnx_detector',
            freezeBackbone: false,
            epochs: 50,
            batchSize: 16,
            labelsetVersion: 1,
            treatUnlabeledAsNegative: false,
            backboneCheckpoint: null,
            createdAt: '2026-04-17T10:00:00Z',
            startedAt: '2026-04-17T10:00:01Z',
            finishedAt: '2026-04-17T10:10:00Z',
            result: {
                modelPath: '/tmp/phi.onnx',
                metaPath: '/tmp/phi.json'
            },
            artifactPaths: {
                checkpointPath: '/tmp/best.pt'
            },
            error: null,
            stdout: 'phi training finished'
        });
        const wrapper = mount(ModelTrainingPage);
        await flushPromises();
        await wrapper.findAll('.training-target-button')[1].trigger('click');
        await wrapper.get('[data-test="phi-dataset-yaml-input"]').setValue('/tmp/dataset.yaml');
        await wrapper.get('[data-test="start-training-run"]').trigger('click');
        await flushPromises();
        expect(hoisted.createModelTrainingRun).toHaveBeenCalledWith({
            trainingTarget: 'phi_region_detector',
            datasetYaml: '/tmp/dataset.yaml',
            outputDir: '/tmp/phi-runs',
            baseModel: 'yolov8n.pt',
            runName: null,
            epochs: 50,
            batchSize: 16,
            inputSize: 640,
            device: 'auto',
            workers: 4,
            patience: 25,
            exportOnnx: true,
            confidenceThreshold: 0.35,
            nmsThreshold: 0.45,
            classIds: ''
        });
        expect(wrapper.text()).toContain('PHI Region Detector');
        expect(wrapper.text()).toContain('/tmp/phi.onnx');
    });
    it('restores recent persisted runs and renders lost state', async () => {
        hoisted.fetchModelTrainingRuns.mockResolvedValue([
            {
                runId: 'lost-run',
                status: 'lost',
                datasetId: 7,
                datasetName: 'Dataset A',
                backboneName: 'gastro_rn50',
                featureMode: 'freeze_backbone',
                freezeBackbone: true,
                epochs: 10,
                batchSize: 32,
                labelsetVersion: 2,
                treatUnlabeledAsNegative: true,
                backboneCheckpoint: null,
                createdAt: '2026-04-17T10:00:00Z',
                startedAt: '2026-04-17T10:00:01Z',
                finishedAt: '2026-04-17T10:05:00Z',
                result: null,
                artifactPaths: {},
                error: 'Marked LOST after backend restart.',
                stdout: ''
            }
        ]);
        const wrapper = mount(ModelTrainingPage);
        await flushPromises();
        expect(wrapper.get('[data-test="training-runs-list"]').text()).toContain('Dataset A');
        expect(wrapper.text()).toContain('Ergebnis verloren');
        expect(wrapper.text()).toContain('Marked LOST after backend restart.');
    });
});
