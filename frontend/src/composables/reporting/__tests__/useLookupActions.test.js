import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import { useLookupActions } from '@/composables/reporting/useLookupActions';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
        post: vi.fn()
    },
    r: (value) => value
}));
vi.mock('@/types/api/endpoints', () => ({
    endpoints: {
        requirements: {
            lookupAll: (token) => `/api/lookup/${token}/all/`,
            lookupParts: (token) => `/api/lookup/${token}/parts/`,
            lookupRecompute: (token) => `/api/lookup/${token}/recompute/`
        }
    }
}));
describe('useLookupActions payload normalization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('unwraps nested lookup payloads under `data`', async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({
            data: {
                data: {
                    availableFindings: [1, 2]
                }
            }
        });
        const applyLookup = vi.fn();
        const flow = {
            lookupToken: 'abc',
            setSessionStatus: vi.fn()
        };
        const actions = useLookupActions({
            flow,
            loading: ref(false),
            errorMessage: ref(null),
            applyLookup
        });
        const result = await actions.fetchLookupAll();
        expect(result.ok).toBe(true);
        expect(applyLookup).toHaveBeenCalledWith({ availableFindings: [1, 2] });
    });
    it('ignores non-object payloads without throwing', async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({
            data: ['unexpected']
        });
        const applyLookup = vi.fn();
        const flow = {
            lookupToken: 'abc',
            setSessionStatus: vi.fn()
        };
        const actions = useLookupActions({
            flow,
            loading: ref(false),
            errorMessage: ref(null),
            applyLookup
        });
        const result = await actions.fetchLookupAll();
        expect(result.ok).toBe(true);
        expect(applyLookup).toHaveBeenCalledWith({});
    });
});
