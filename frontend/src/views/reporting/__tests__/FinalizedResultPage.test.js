import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import FinalizedResultPage from '../FinalizedResultPage.vue';
const setActiveReportId = vi.fn();
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn()
    },
    r: (path) => `api/${path}`
}));
vi.mock('vue-router', () => ({
    useRoute: () => ({
        params: {
            patient_examination_id: '17'
        }
    })
}));
vi.mock('@/stores/reportingFlowStore', () => ({
    useReportingFlowStore: () => ({
        patientExaminationId: null,
        selectedPatientId: 9,
        setActiveReportId
    })
}));
describe('FinalizedResultPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('loads latest report and displays artifact links', async () => {
        vi.mocked(axiosInstance.get)
            .mockResolvedValueOnce({
            data: [{ id: 88, status: 'final', version: 4, updatedAt: '2026-02-27T08:00:00Z' }]
        })
            .mockResolvedValueOnce({
            data: {
                id: 88,
                persistedArtifacts: {
                    pdfViewUrl: '/api/media/pdfs/12/stream/?type=raw',
                    pdfDownloadUrl: '/api/media/pdfs/12/stream/?type=raw&download=1',
                    patientTimelineUrl: '/api/media/patients/9/timeline/'
                }
            }
        });
        const wrapper = mount(FinalizedResultPage);
        await flushPromises();
        expect(setActiveReportId).toHaveBeenCalledWith(88);
        expect(wrapper.text()).toContain('Bericht #88 geladen.');
        const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));
        expect(hrefs).toContain('/api/media/pdfs/12/stream/?type=raw');
        expect(hrefs).toContain('/api/media/pdfs/12/stream/?type=raw&download=1');
        expect(hrefs).toContain('/api/media/patients/9/timeline/');
    });
});
