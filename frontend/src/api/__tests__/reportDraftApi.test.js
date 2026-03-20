import { beforeEach, describe, expect, it, vi } from 'vitest';
const hoisted = vi.hoisted(() => ({
    axios: {
        get: vi.fn(),
        put: vi.fn()
    }
}));
vi.mock('@/api/axiosInstance', () => ({
    default: hoisted.axios,
    r: (path) => `/api/${path}`
}));
import { fetchPatientExaminationDraft, savePatientExaminationDraft } from '@/api/reportDraftApi';
describe('reportDraftApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('fetches persisted draft state for a patient examination', async () => {
        hoisted.axios.get.mockResolvedValue({
            data: {
                patient_examination_id: 314,
                draft: {
                    module_name: 'report_template_examples',
                    template_name: 'star_upper_gi_main',
                    payload: {}
                },
                updated_at: '2026-03-19T14:00:00.000Z'
            }
        });
        const result = await fetchPatientExaminationDraft(314);
        expect(hoisted.axios.get).toHaveBeenCalledWith('/api/patient-examinations/314/draft/');
        expect(result.draft.template_name).toBe('star_upper_gi_main');
    });
    it('persists unvalidated runtime draft state without reshaping the payload', async () => {
        hoisted.axios.put.mockResolvedValue({
            data: {
                patient_examination_id: 314,
                draft: {
                    module_name: 'report_template_examples',
                    template_name: 'star_upper_gi_main',
                    payload: {
                        patient: 'patient_42',
                        examiners: ['dr_house'],
                        examination: 'colonoscopy',
                        patientFindings: []
                    }
                },
                updated_at: '2026-03-19T14:00:00.000Z'
            }
        });
        await savePatientExaminationDraft({
            patientExaminationId: 314,
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            payload: {
                patient: 'patient_42',
                examiners: ['dr_house'],
                examination: 'colonoscopy',
                patientFindings: []
            }
        });
        expect(hoisted.axios.put).toHaveBeenCalledWith('/api/patient-examinations/314/draft/', {
            module_name: 'report_template_examples',
            template_name: 'star_upper_gi_main',
            payload: {
                patient: 'patient_42',
                examiners: ['dr_house'],
                examination: 'colonoscopy',
                patientFindings: []
            }
        });
    });
});
