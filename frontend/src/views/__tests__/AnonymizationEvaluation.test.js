import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import AnonymizationEvaluation from '../AnonymizationEvaluation.vue';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn()
    },
    r: (path) => `/endoreg-api/${path}`
}));
describe('AnonymizationEvaluation', () => {
    beforeEach(() => {
        vi.mocked(axiosInstance.get).mockReset();
    });
    it('loads and displays SensitiveMeta rows for videos and PDFs', async () => {
        vi.mocked(axiosInstance.get).mockImplementation((_url, config) => {
            const contentType = config?.params?.content_type;
            if (contentType === 'video') {
                return Promise.resolve({
                    data: {
                        count: 1,
                        results: [
                            {
                                id: 10,
                                patientFirstName: 'Ada',
                                patientLastName: 'Lovelace',
                                patientDobDisplay: '1815-12-10',
                                casenumber: 'VID-42',
                                examinationDateDisplay: '2026-07-09',
                                patientGenderName: 'female',
                                centerName: 'Center A',
                                isVerified: true,
                                text: 'raw video metadata',
                                anonymizedText: 'anonymized video metadata'
                            }
                        ]
                    }
                });
            }
            return Promise.resolve({
                data: {
                    count: 1,
                    results: [
                        {
                            id: 20,
                            patientFirstName: 'Grace',
                            patientLastName: 'Hopper',
                            patientDobDisplay: '1906-12-09',
                            casenumber: 'PDF-7',
                            examinationDateDisplay: '2026-07-10',
                            patientGenderName: 'female',
                            centerName: 'Center B',
                            isVerified: false,
                            text: 'raw report metadata',
                            anonymizedText: 'redacted report metadata'
                        }
                    ]
                }
            });
        });
        const wrapper = mount(AnonymizationEvaluation);
        await flushPromises();
        expect(axiosInstance.get).toHaveBeenCalledWith('/endoreg-api/media/sensitive-metadata/', {
            params: {
                content_type: 'video',
                ordering: '-id'
            }
        });
        expect(axiosInstance.get).toHaveBeenCalledWith('/endoreg-api/media/sensitive-metadata/', {
            params: {
                content_type: 'pdf',
                ordering: '-id'
            }
        });
        expect(wrapper.text()).toContain('Videos 1');
        expect(wrapper.text()).toContain('PDFs 1');
        expect(wrapper.text()).toContain('Ada');
        expect(wrapper.text()).toContain('VID-42');
        expect(wrapper.text()).toContain('Grace');
        expect(wrapper.text()).toContain('PDF-7');
        expect(wrapper.text()).toContain('redacted report metadata');
    });
});
