import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationSettingsPage from '../ApplicationSettingsPage.vue';
const hoisted = vi.hoisted(() => ({
    fetchApplicationSettings: vi.fn(),
    fetchApplicationSettingsDropdowns: vi.fn(),
    updateApplicationSettings: vi.fn(),
    triggerApplicationBackup: vi.fn(),
    triggerApplicationAiDatasetExport: vi.fn(),
    triggerApplicationVideoDimensionBackfill: vi.fn(),
    toastSuccess: vi.fn()
}));
vi.mock('@/api/applicationSettingsApi', () => ({
    fetchApplicationSettings: hoisted.fetchApplicationSettings,
    fetchApplicationSettingsDropdowns: hoisted.fetchApplicationSettingsDropdowns,
    updateApplicationSettings: hoisted.updateApplicationSettings,
    triggerApplicationBackup: hoisted.triggerApplicationBackup,
    triggerApplicationAiDatasetExport: hoisted.triggerApplicationAiDatasetExport,
    triggerApplicationVideoDimensionBackfill: hoisted.triggerApplicationVideoDimensionBackfill
}));
vi.mock('@/stores/toastStore', () => ({
    useToastStore: () => ({
        success: hoisted.toastSuccess,
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn()
    })
}));
describe('ApplicationSettingsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.fetchApplicationSettings.mockResolvedValue({
            id: 1,
            centerId: 1,
            centerName: 'Center Alpha',
            processorId: 10,
            processorName: 'Processor One',
            annotatorName: null,
            reportTemplateName: 'template_a',
            aiDatasetName: 'dataset_alpha',
            aiDatasetType: 'image',
            updatedAt: '2026-03-26T12:30:00Z',
            backupStatus: {
                ready: true,
                missingPaths: [],
                requiredPathCount: 2,
                availablePathCount: 2,
                sourceRoots: [
                    { label: 'storage', path: '/srv/storage', exists: true, fileCount: 4 },
                    { label: 'io', path: '/srv/io', exists: true, fileCount: 2 }
                ]
            }
        });
        hoisted.fetchApplicationSettingsDropdowns.mockResolvedValue({
            centers: [
                { id: 1, name: 'Center Alpha' },
                { id: 2, name: 'Center Beta' }
            ],
            processors: [
                { id: 10, name: 'Processor One' },
                { id: 11, name: 'Processor Two' }
            ],
            annotators: [
                { value: 'annotator_a', label: 'annotator_a' },
                { value: 'annotator_b', label: 'annotator_b' }
            ],
            reportTemplates: [
                { value: 'template_a', label: 'Template A' },
                { value: 'template_b', label: 'Template B' }
            ],
            aiDatasets: [
                {
                    id: 100,
                    value: 'dataset_alpha',
                    label: 'dataset_alpha',
                    datasetType: 'image',
                    aiModelType: 'image_multilabel_classification',
                    isActive: true,
                    nameCount: 1
                }
            ]
        });
        hoisted.updateApplicationSettings.mockResolvedValue({
            id: 1,
            centerId: 2,
            centerName: 'Center Beta',
            processorId: 11,
            processorName: 'Processor Two',
            annotatorName: 'annotator_b',
            reportTemplateName: 'template_b',
            aiDatasetName: 'dataset_beta',
            aiDatasetType: 'video',
            updatedAt: '2026-03-26T13:15:00Z',
            backupStatus: {
                ready: true,
                missingPaths: [],
                requiredPathCount: 2,
                availablePathCount: 2,
                sourceRoots: [
                    { label: 'storage', path: '/srv/storage', exists: true, fileCount: 4 },
                    { label: 'io', path: '/srv/io', exists: true, fileCount: 2 }
                ]
            }
        });
        hoisted.triggerApplicationBackup.mockResolvedValue({
            targetRoot: '/mnt/usb/lx-annotate-backup-20260330-120000',
            copiedRoots: []
        });
        hoisted.triggerApplicationAiDatasetExport.mockResolvedValue({
            success: true,
            datasetId: 100,
            datasetName: 'dataset_alpha',
            datasetType: 'image',
            outputPath: '/srv/export/ai_datasets/dataset_alpha_image_20260330T120000Z.json',
            summary: {
                imageAnnotationCount: 0,
                videoAnnotationCount: 0,
                frameCount: 0,
                videoCount: 0,
                labelCount: 0
            }
        });
        hoisted.triggerApplicationVideoDimensionBackfill.mockResolvedValue({
            runId: 'run-1',
            status: 'completed',
            dryRun: true,
            limit: 5,
            createdAt: '2026-04-29T12:00:00Z',
            startedAt: '2026-04-29T12:00:01Z',
            finishedAt: '2026-04-29T12:00:02Z',
            result: {
                count: 1,
                summary: { would_repair: 1 },
                items: [
                    {
                        videoId: 123,
                        status: 'would_repair',
                        sourceDimensions: [1920, 1080],
                        processedDimensions: [1440, 1080],
                        repaired: false,
                        detail: ''
                    }
                ]
            },
            error: null,
            stdout: ''
        });
    });
    it('loads the current defaults and saves updated selections', async () => {
        const wrapper = mount(ApplicationSettingsPage);
        await flushPromises();
        expect(hoisted.fetchApplicationSettings).toHaveBeenCalledTimes(1);
        expect(hoisted.fetchApplicationSettingsDropdowns).toHaveBeenCalledTimes(1);
        expect(wrapper.get('[data-test=\"summary-center\"]').text()).toContain('Center Alpha');
        expect(wrapper.get('[data-test=\"summary-processor\"]').text()).toContain('Processor One');
        expect(wrapper.get('[data-test=\"summary-annotator\"]').text()).toContain('Kein Standard-Annotator');
        expect(wrapper.get('[data-test=\"summary-report-template\"]').text()).toContain('Template A');
        expect(wrapper.get('[data-test=\"summary-ai-dataset\"]').text()).toContain('dataset_alpha');
        expect(wrapper.get('[data-test=\"summary-ai-dataset-type\"]').text()).toContain('Image');
        await wrapper.get('[data-test=\"center-select\"]').setValue('2');
        await wrapper.get('[data-test=\"processor-select\"]').setValue('11');
        await wrapper.get('[data-test=\"annotator-select\"]').setValue('annotator_b');
        await wrapper.get('[data-test=\"report-template-select\"]').setValue('template_b');
        await wrapper.get('[data-test=\"ai-dataset-name-input\"]').setValue('dataset_beta');
        await wrapper.get('[data-test=\"ai-dataset-type-select\"]').setValue('video');
        await wrapper.get('[data-test=\"save-settings\"]').trigger('click');
        await flushPromises();
        expect(hoisted.updateApplicationSettings).toHaveBeenCalledWith({
            centerId: 2,
            processorId: 11,
            annotatorName: 'annotator_b',
            reportTemplateName: 'template_b',
            aiDatasetName: 'dataset_beta',
            aiDatasetType: 'video'
        });
        expect(hoisted.toastSuccess).toHaveBeenCalledWith({
            text: 'Anwendungseinstellungen gespeichert.'
        });
        expect(wrapper.get('[data-test=\"summary-center\"]').text()).toContain('Center Beta');
        expect(wrapper.get('[data-test=\"summary-processor\"]').text()).toContain('Processor Two');
        expect(wrapper.get('[data-test=\"summary-annotator\"]').text()).toContain('annotator_b');
        expect(wrapper.get('[data-test=\"summary-report-template\"]').text()).toContain('Template B');
        expect(wrapper.get('[data-test=\"summary-ai-dataset\"]').text()).toContain('dataset_beta');
        expect(wrapper.get('[data-test=\"summary-ai-dataset-type\"]').text()).toContain('Video');
    });
    it('runs a backup when the data paths are complete', async () => {
        const wrapper = mount(ApplicationSettingsPage);
        await flushPromises();
        await wrapper.get('[data-test=\"backup-target-path\"]').setValue('/mnt/usb');
        await wrapper.get('[data-test=\"run-backup\"]').trigger('click');
        await flushPromises();
        expect(hoisted.triggerApplicationBackup).toHaveBeenCalledWith({
            targetPath: '/mnt/usb'
        });
        expect(hoisted.toastSuccess).toHaveBeenCalledWith({
            text: 'Backup erfolgreich erstellt.'
        });
    });
    it('exports the configured ai dataset', async () => {
        const wrapper = mount(ApplicationSettingsPage);
        await flushPromises();
        await wrapper.get('[data-test=\"run-ai-dataset-export\"]').trigger('click');
        await flushPromises();
        expect(hoisted.triggerApplicationAiDatasetExport).toHaveBeenCalledWith({
            aiDatasetName: 'dataset_alpha',
            aiDatasetType: 'image'
        });
        expect(hoisted.toastSuccess).toHaveBeenCalledWith({
            text: 'KI-Datensatz erfolgreich exportiert.'
        });
    });
    it('starts the video dimension backfill from application settings', async () => {
        const wrapper = mount(ApplicationSettingsPage);
        await flushPromises();
        await wrapper.get('[data-test=\"video-dimension-backfill-limit\"]').setValue('5');
        await wrapper.get('[data-test=\"run-video-dimension-backfill\"]').trigger('click');
        await flushPromises();
        expect(hoisted.triggerApplicationVideoDimensionBackfill).toHaveBeenCalledWith({
            dryRun: true,
            limit: 5
        });
        expect(wrapper.text()).toContain('1 Videos geprüft');
        expect(hoisted.toastSuccess).toHaveBeenCalledWith({
            text: 'Video-Dimensionsprüfung gestartet.'
        });
    });
});
