import { beforeEach, describe, expect, it, vi } from 'vitest';
const hoisted = vi.hoisted(() => ({
    axios: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
    }
}));
vi.mock('@/api/axiosInstance', () => ({
    default: hoisted.axios
}));
import { findingsApi, getFindingsBackendMode, parseFindingsApiError } from '@/api/findingsApi';
describe('findingsApi backend mode routing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });
    it('defaults to endoreg mode when backend flag is missing or invalid', () => {
        expect(getFindingsBackendMode()).toBe('endoreg');
        vi.stubEnv('VITE_FINDINGS_BACKEND', 'unknown');
        expect(getFindingsBackendMode()).toBe('endoreg');
    });
    it('routes examination findings reads by backend mode', async () => {
        hoisted.axios.get.mockResolvedValue({ data: [] });
        vi.stubEnv('VITE_FINDINGS_BACKEND', 'endoreg');
        await findingsApi.getExaminationFindings(12);
        expect(hoisted.axios.get).toHaveBeenLastCalledWith('/api/examinations/12/findings/');
        vi.stubEnv('VITE_FINDINGS_BACKEND', 'dtypes_read');
        await findingsApi.getExaminationFindings(12);
        expect(hoisted.axios.get).toHaveBeenLastCalledWith('/base_api/examinations/12/findings/');
    });
    it('keeps endoreg-safe create contract with dedicated classification write', async () => {
        vi.stubEnv('VITE_FINDINGS_BACKEND', 'endoreg');
        hoisted.axios.post
            .mockResolvedValueOnce({ data: { id: 91, finding: 7 } })
            .mockResolvedValueOnce({ data: { id: 91 } });
        await findingsApi.createPatientFinding({
            patientExamination: 35,
            finding: 7,
            classifications: [{ classification: 11, choice: 44 }]
        });
        expect(hoisted.axios.post).toHaveBeenNthCalledWith(1, '/api/patient-findings/', {
            patientExamination: 35,
            finding: 7
        });
        expect(hoisted.axios.post).toHaveBeenNthCalledWith(2, '/base_api/patient-findings/91/classifications/', {
            replace: true,
            classifications: [{ classification: 11, choice: 44 }]
        });
    });
    it('uses dtypes patient-findings endpoint directly in dtypes mode', async () => {
        vi.stubEnv('VITE_FINDINGS_BACKEND', 'dtypes');
        hoisted.axios.post.mockResolvedValue({ data: { id: 101, finding: 6 } });
        await findingsApi.createPatientFinding({
            patientExamination: 88,
            finding: 6,
            classifications: [{ classification: 5, choice: 9 }]
        });
        expect(hoisted.axios.post).toHaveBeenCalledTimes(1);
        expect(hoisted.axios.post).toHaveBeenCalledWith('/base_api/patient-findings/', {
            patientExamination: 88,
            finding: 6,
            classifications: [{ classification: 5, choice: 9 }]
        });
    });
    it('maps structured backend errors to typed client errors', () => {
        const parsed = parseFindingsApiError({
            response: {
                status: 400,
                data: {
                    code: 'duplicate-finding',
                    message: 'Finding already exists.'
                }
            }
        });
        expect(parsed.code).toBe('duplicate-finding');
        expect(parsed.message).toContain('Finding already exists');
        expect(parsed.status).toBe(400);
    });
});
