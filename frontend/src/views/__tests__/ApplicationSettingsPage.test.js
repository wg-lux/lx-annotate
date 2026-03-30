import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApplicationSettingsPage from '../ApplicationSettingsPage.vue';
const hoisted = vi.hoisted(() => ({
    fetchApplicationSettings: vi.fn(),
    fetchApplicationSettingsDropdowns: vi.fn(),
    updateApplicationSettings: vi.fn(),
    triggerApplicationBackup: vi.fn(),
    toastSuccess: vi.fn()
}));
vi.mock('@/api/applicationSettingsApi', () => ({
    fetchApplicationSettings: hoisted.fetchApplicationSettings,
    fetchApplicationSettingsDropdowns: hoisted.fetchApplicationSettingsDropdowns,
    updateApplicationSettings: hoisted.updateApplicationSettings,
    triggerApplicationBackup: hoisted.triggerApplicationBackup
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
        await wrapper.get('[data-test=\"center-select\"]').setValue('2');
        await wrapper.get('[data-test=\"processor-select\"]').setValue('11');
        await wrapper.get('[data-test=\"annotator-select\"]').setValue('annotator_b');
        await wrapper.get('[data-test=\"report-template-select\"]').setValue('template_b');
        await wrapper.get('[data-test=\"save-settings\"]').trigger('click');
        await flushPromises();
        expect(hoisted.updateApplicationSettings).toHaveBeenCalledWith({
            centerId: 2,
            processorId: 11,
            annotatorName: 'annotator_b',
            reportTemplateName: 'template_b'
        });
        expect(hoisted.toastSuccess).toHaveBeenCalledWith({
            text: 'Anwendungseinstellungen gespeichert.'
        });
        expect(wrapper.get('[data-test=\"summary-center\"]').text()).toContain('Center Beta');
        expect(wrapper.get('[data-test=\"summary-processor\"]').text()).toContain('Processor Two');
        expect(wrapper.get('[data-test=\"summary-annotator\"]').text()).toContain('annotator_b');
        expect(wrapper.get('[data-test=\"summary-report-template\"]').text()).toContain('Template B');
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
});
