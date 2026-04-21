import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ModelTrainingPage from '../ModelTrainingPage.vue';
const hoisted = vi.hoisted(() => ({
    fetchModelTrainingOptions: vi.fn(),
    createModelTrainingRun: vi.fn(),
    fetchModelTrainingRun: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn()
}));
vi.mock('@/api/modelTrainingApi', () => ({
    fetchModelTrainingOptions: hoisted.fetchModelTrainingOptions,
    createModelTrainingRun: hoisted.createModelTrainingRun,
    fetchModelTrainingRun: hoisted.fetchModelTrainingRun
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
        hoisted.fetchModelTrainingOptions.mockResolvedValue({
            aiDatasets: [
                {
                    id: 7,
                    value: 'Dataset A',
                    label: 'Dataset A',
                    datasetType: 'image',
                    aiModelType: 'image_multilabel_classification',
                    isActive: true,
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
        expect(wrapper.get('[data-test="training-dataset-select"]').element.value).toBe('7');
        await wrapper.get('[data-test="start-training-run"]').trigger('click');
        await flushPromises();
        expect(hoisted.createModelTrainingRun).toHaveBeenCalledWith({
            datasetId: 7,
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
});
