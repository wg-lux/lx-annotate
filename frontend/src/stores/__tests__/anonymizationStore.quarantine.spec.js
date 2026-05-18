import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
const hoisted = vi.hoisted(() => ({
    get: vi.fn()
}));
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: hoisted.get
    },
    r: (path) => `api/${path}`,
    silentRequestConfig: () => ({ suppressErrorToast: true })
}));
describe('anonymizationStore quarantine overview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setActivePinia(createPinia());
    });
    it('merges quarantined files into the overview as read-only failed rows', async () => {
        hoisted.get.mockImplementation(async (url) => {
            if (url === 'api/anonymization/items/overview/') {
                return {
                    data: [
                        {
                            id: 17,
                            filename: 'processed-video.mp4',
                            mediaType: 'video',
                            anonymizationStatus: 'validated',
                            annotationStatus: 'validated',
                            createdAt: '2026-05-15T07:00:00Z',
                            metadataImported: true
                        }
                    ]
                };
            }
            if (url.includes('runtime/quarantine/')) {
                return {
                    data: {
                        count: 1,
                        totalSize: 65011712,
                        files: [
                            {
                                id: 'lx_annotate_quarantine:NINJAU_S001_S001_T016.MOV',
                                directoryKey: 'lx_annotate_quarantine',
                                directoryLabel: 'lx-annotate quarantine',
                                filename: 'NINJAU_S001_S001_T016.MOV',
                                mediaType: 'video',
                                size: 65011712,
                                quarantinedAt: '2026-05-15T07:20:22Z',
                                modifiedAt: '2026-05-15T07:19:35Z',
                                reason: 'moov atom not found'
                            }
                        ]
                    }
                };
            }
            throw new Error(`Unexpected URL: ${url}`);
        });
        const store = useAnonymizationStore();
        const overview = await store.fetchOverview();
        expect(overview).toHaveLength(2);
        const quarantined = store.overview.find((file) => file.quarantined);
        expect(quarantined).toMatchObject({
            filename: 'NINJAU_S001_S001_T016.MOV',
            mediaType: 'video',
            anonymizationStatus: 'failed',
            quarantineDirectoryLabel: 'lx-annotate quarantine',
            errorDetail: 'moov atom not found'
        });
        expect(quarantined?.id).toBeLessThan(0);
        expect(quarantined?.uploadJob?.status).toBe('quarantined');
    });
});
