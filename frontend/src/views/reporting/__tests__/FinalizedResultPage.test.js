import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
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
    const pdfViewUrl = `/api/${endpoints.media.pdfStream(12)}?type=raw`;
    const pdfDownloadUrl = `/api/${endpoints.media.pdfStream(12)}?type=raw&download=1`;
    const patientTimelineUrl = `/api/${endpoints.media.patientTimeline(9)}`;
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
                    pdfViewUrl,
                    pdfDownloadUrl,
                    patientTimelineUrl
                }
            }
        });
        const wrapper = mount(FinalizedResultPage);
        await flushPromises();
        expect(setActiveReportId).toHaveBeenCalledWith(88);
        expect(wrapper.text()).toContain('Bericht #88 geladen.');
        const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));
        expect(hrefs).toContain(pdfViewUrl);
        expect(hrefs).toContain(pdfDownloadUrl);
        expect(hrefs).toContain(`${patientTimelineUrl}?patient_examination_id=17`);
    });
    it('builds fallback timeline link with patient_examination_id filter', async () => {
        vi.mocked(axiosInstance.get)
            .mockResolvedValueOnce({
            data: [{ id: 88, status: 'final', version: 4, updatedAt: '2026-02-27T08:00:00Z' }]
        })
            .mockResolvedValueOnce({
            data: {
                id: 88,
                persistedArtifacts: {
                    pdfViewUrl,
                    pdfDownloadUrl
                }
            }
        });
        const wrapper = mount(FinalizedResultPage);
        await flushPromises();
        const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));
        expect(hrefs).toContain(`${patientTimelineUrl}?patient_examination_id=17`);
    });
});
