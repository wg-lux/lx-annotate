import { beforeEach, describe, expect, it, vi } from 'vitest';
import { endpoints } from '@/types/api/endpoints';
const hoisted = vi.hoisted(() => ({
    axios: {
        get: vi.fn()
    }
}));
vi.mock('@/api/axiosInstance', () => ({
    default: hoisted.axios,
    r: (path) => `/api/${path}`
}));
import { fetchPatientTimelineLatest, pickPreferredStream } from '@/api/reportingTimelineApi';
describe('reportingTimelineApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('prefers processed stream and falls back to raw', () => {
        expect(pickPreferredStream([
            { type: 'raw', url: '/raw' },
            { type: 'processed', url: '/processed' }
        ])).toBe('/processed');
        expect(pickPreferredStream([{ type: 'raw', url: '/raw' }])).toBe('/raw');
        expect(pickPreferredStream([])).toBeNull();
    });
    it('requests latest_only timeline with optional patient_examination_id', async () => {
        hoisted.axios.get.mockResolvedValue({
            data: {
                patient: { id: 42 },
                latestReport: null,
                latestVideo: null,
                latestFrames: []
            }
        });
        await fetchPatientTimelineLatest({
            patientId: 42,
            patientExaminationId: 314
        });
        expect(hoisted.axios.get).toHaveBeenCalledWith(`/api/${endpoints.media.patientTimeline(42)}`, {
            params: {
                latest_only: true,
                patient_examination_id: 314
            }
        });
    });
});
