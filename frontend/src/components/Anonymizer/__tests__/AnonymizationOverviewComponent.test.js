import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import AnonymizationOverviewComponent from '../AnonymizationOverviewComponent.vue';
const hoisted = vi.hoisted(() => ({
    anonymizationStoreRef: { current: null },
    mediaStoreRef: { current: null },
    pollingProtectionRef: { current: null },
    routerPush: vi.fn()
}));
vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: hoisted.routerPush
    })
}));
vi.mock('@/stores/anonymizationStore', () => ({
    useAnonymizationStore: () => hoisted.anonymizationStoreRef.current
}));
vi.mock('@/stores/videoStore', () => ({
    useVideoStore: () => ({
        hasRawVideoFile: true
    })
}));
vi.mock('@/stores/mediaTypeStore', () => ({
    useMediaTypeStore: () => hoisted.mediaStoreRef.current
}));
vi.mock('@/composables/usePollingProtection', () => ({
    usePollingProtection: () => hoisted.pollingProtectionRef.current
}));
vi.mock('@/api/mediaManagement', () => ({
    useMediaManagement: () => ({
        deleteMediaFile: vi.fn()
    })
}));
function buildVideoFile(overrides = {}) {
    return {
        id: 17,
        filename: 'study-video.mp4',
        mediaType: 'video',
        anonymizationStatus: 'done_processing_anonymization',
        annotationStatus: 'not_started',
        createdAt: '2026-04-30T08:00:00Z',
        metadataImported: true,
        rawFile: 'raw/study-video.mp4',
        ...overrides
    };
}
function buildPdfFile(overrides = {}) {
    return {
        id: 23,
        filename: 'study-report.pdf',
        mediaType: 'pdf',
        anonymizationStatus: 'failed',
        annotationStatus: 'not_started',
        createdAt: '2026-04-30T08:15:00Z',
        metadataImported: true,
        rawFile: 'raw/study-report.pdf',
        ...overrides
    };
}
function buildQuarantinedVideoFile(overrides = {}) {
    return {
        id: -42,
        filename: 'quarantined-video.mov',
        mediaType: 'video',
        anonymizationStatus: 'failed',
        annotationStatus: '',
        createdAt: '2026-05-15T07:20:22Z',
        metadataImported: false,
        fileSize: 65011712,
        quarantined: true,
        quarantineId: 'lx_annotate_quarantine:quarantined-video.mov',
        quarantineDirectoryKey: 'lx_annotate_quarantine',
        quarantineDirectoryLabel: 'lx-annotate quarantine',
        errorDetail: 'moov atom not found',
        uploadJob: {
            id: 'lx_annotate_quarantine:quarantined-video.mov',
            status: 'quarantined',
            ingestMode: 'watcher',
            sourceSystem: 'lx-annotate quarantine',
            sourceFilePersisted: true,
            cleanupStatus: 'skipped',
            errorDetail: 'moov atom not found'
        },
        ...overrides
    };
}
describe('AnonymizationOverviewComponent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.anonymizationStoreRef.current = reactive({
            error: null,
            loading: false,
            overview: [buildVideoFile()],
            fetchOverview: vi.fn().mockResolvedValue(undefined),
            setCurrentForValidation: vi.fn().mockResolvedValue(true),
            startPolling: vi.fn(),
            stopAllPolling: vi.fn()
        });
        hoisted.mediaStoreRef.current = {
            getMediaTypeIcon: vi.fn().mockReturnValue('ni ni-button-play'),
            getMediaTypeBadgeClass: vi.fn().mockReturnValue('bg-info'),
            detectMediaType: vi.fn().mockReturnValue('video'),
            seedTypesFromOverview: vi.fn(),
            setCurrentItem: vi.fn(),
            rememberType: vi.fn(),
            getType: vi.fn().mockReturnValue('video')
        };
        hoisted.pollingProtectionRef.current = {
            canProcessMedia: {
                value: vi.fn().mockReturnValue(true)
            },
            startAnonymizationSafeWithProtection: vi.fn().mockResolvedValue({ success: true }),
            clearAllLocalLocks: vi.fn()
        };
    });
    it('renders the video file id next to the filename', async () => {
        const wrapper = mount(AnonymizationOverviewComponent);
        await flushPromises();
        expect(wrapper.text()).toContain('study-video.mp4');
        expect(wrapper.text()).toContain('Video-ID: 17');
    });
    it('uses safe patient and document type metadata instead of the PDF hash filename', async () => {
        hoisted.anonymizationStoreRef.current.overview = [
            buildPdfFile({
                filename: '8e0f9f8807db084c9e313a1e6f4a1be4.pdf',
                pseudoPatientId: 4711,
                documentType: 'report_final'
            })
        ];
        const wrapper = mount(AnonymizationOverviewComponent);
        await flushPromises();
        expect(wrapper.text()).toContain('Pseudo-Patient 4711 - Finaler Befund');
        expect(wrapper.text()).toContain('PDF-ID: 23');
        expect(wrapper.text()).not.toContain('8e0f9f8807db084c9e313a1e6f4a1be4.pdf');
    });
    it('renders upload job status separately from anonymization state', async () => {
        hoisted.anonymizationStoreRef.current.overview = [
            buildVideoFile({
                uploadJob: {
                    id: 'b99b5f04-8c40-4ec7-a0ef-6b34d3f908f8',
                    status: 'anonymized',
                    ingestMode: 'watcher',
                    sourceSystem: 'watcher-daemon',
                    sourceCenterKey: 'test-center',
                    sourceFilePersisted: false,
                    cleanupStatus: 'completed'
                }
            })
        ];
        const wrapper = mount(AnonymizationOverviewComponent);
        await flushPromises();
        const uploadSummary = wrapper.find('.upload-job-summary');
        expect(uploadSummary.text()).toContain('Upload abgeschlossen');
        expect(uploadSummary.text()).toContain('Watcher / watcher-daemon / test-center');
        expect(uploadSummary.text()).toContain('Quelle bereinigt - Bereinigt');
        expect(wrapper.find('.upload-job-summary .badge.bg-success').exists()).toBe(true);
        expect(wrapper.text()).toContain('Fertig');
    });
    it('reports whether the original source file has already been deleted', async () => {
        hoisted.anonymizationStoreRef.current.overview = [
            buildVideoFile({
                id: 17,
                uploadJob: {
                    id: 'deleted-source',
                    status: 'anonymized',
                    sourceFilePersisted: false,
                    cleanupStatus: 'completed'
                }
            }),
            buildPdfFile({
                id: 23,
                uploadJob: {
                    id: 'present-source',
                    status: 'anonymized',
                    sourceFilePersisted: true,
                    cleanupStatus: 'pending'
                }
            })
        ];
        const wrapper = mount(AnonymizationOverviewComponent);
        await flushPromises();
        expect(wrapper.find('thead').text()).toContain('Originaldatei gelöscht?');
        const rows = wrapper.findAll('tbody tr');
        expect(rows[0].text()).toContain('Ja, gelöscht');
        expect(rows[0].text()).toContain('Bereinigt');
        expect(rows[1].text()).toContain('Nein, vorhanden');
        expect(rows[1].text()).toContain('Bereinigung offen');
    });
    it('keeps the filename column identifiable for sticky horizontal scrolling', async () => {
        const wrapper = mount(AnonymizationOverviewComponent);
        await flushPromises();
        expect(wrapper.find('table.overview-files-table').exists()).toBe(true);
        expect(wrapper.find('thead .sticky-filename-column').text()).toBe('Dateiname');
        expect(wrapper.find('tbody .sticky-filename-column').text()).toContain('study-video.mp4');
    });
    it('renders a delete button for every overview row regardless of status', async () => {
        hoisted.anonymizationStoreRef.current.overview = [
            buildVideoFile({ id: 17, anonymizationStatus: 'done_processing_anonymization' }),
            buildVideoFile({ id: 18, filename: 'processing-video.mp4', anonymizationStatus: 'processing_anonymization' }),
            buildPdfFile({ id: 23, anonymizationStatus: 'failed' })
        ];
        const wrapper = mount(AnonymizationOverviewComponent);
        await flushPromises();
        const deleteButtons = wrapper.findAll('[data-test="delete-file-button"]');
        expect(deleteButtons).toHaveLength(3);
        expect(deleteButtons.map((button) => button.attributes('aria-label'))).toEqual([
            'Datei 17 löschen',
            'Datei 18 löschen',
            'Datei 23 löschen'
        ]);
    });
    it('renders quarantined videos as visible read-only overview rows', async () => {
        hoisted.anonymizationStoreRef.current.overview = [
            buildVideoFile({ id: 17 }),
            buildQuarantinedVideoFile()
        ];
        const wrapper = mount(AnonymizationOverviewComponent);
        await flushPromises();
        expect(wrapper.text()).toContain('quarantined-video.mov');
        expect(wrapper.text()).toContain('Quarantäne: lx-annotate quarantine');
        expect(wrapper.text()).toContain('In Quarantäne');
        expect(wrapper.text()).toContain('Serverseitige Quarantäne');
        expect(wrapper.findAll('[data-test="delete-file-button"]')).toHaveLength(1);
    });
});
