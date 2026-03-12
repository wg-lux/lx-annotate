import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportingShell from '../ReportingShell.vue';
const hoisted = vi.hoisted(() => ({
    flowRef: { current: null },
    routeRef: {
        current: {
            path: '/reporting/314/findings',
            params: { patient_examination_id: '314' }
        }
    },
    routerRef: {
        current: {
            push: vi.fn()
        }
    },
    axiosApi: {
        get: vi.fn()
    },
    timelineApi: {
        fetchPatientTimelineLatest: vi.fn(),
        pickPreferredStream: vi.fn((options) => {
            return options.find((option) => option.type === 'processed')?.url ?? null;
        })
    }
}));
vi.mock('@/stores/reportingFlowStore', () => ({
    useReportingFlowStore: () => hoisted.flowRef.current
}));
vi.mock('vue-router', async () => {
    const actual = await vi.importActual('vue-router');
    return {
        ...actual,
        useRoute: () => hoisted.routeRef.current,
        useRouter: () => hoisted.routerRef.current
    };
});
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: hoisted.axiosApi.get
    },
    r: (value) => value
}));
vi.mock('@/api/reportingTimelineApi', () => ({
    fetchPatientTimelineLatest: hoisted.timelineApi.fetchPatientTimelineLatest,
    pickPreferredStream: hoisted.timelineApi.pickPreferredStream
}));
function buildFlowStore() {
    return {
        sessionStatus: 'active',
        lookupToken: 'tok',
        patientExaminationId: 314,
        selectedPatientId: 42,
        selectedExaminationId: 9,
        mediaPreload: null,
        mediaPreloadStatus: 'idle',
        mediaPreloadError: null,
        setCaseSelection: vi.fn(),
        setLookupSession: vi.fn(function (payload) {
            this.patientExaminationId = payload.patientExaminationId;
            this.lookupToken = payload.lookupToken;
            this.sessionStatus = payload.status;
        }),
        setMediaPreloadLoading: vi.fn(function () {
            this.mediaPreloadStatus = 'loading';
            this.mediaPreloadError = null;
        }),
        setMediaPreload: vi.fn(function (payload) {
            this.mediaPreload = payload;
            this.mediaPreloadStatus = 'ready';
            this.mediaPreloadError = null;
        }),
        setMediaPreloadError: vi.fn(function (message) {
            this.mediaPreloadStatus = 'error';
            this.mediaPreloadError = message;
        }),
        clearMediaPreload: vi.fn(function () {
            this.mediaPreload = null;
            this.mediaPreloadStatus = 'idle';
            this.mediaPreloadError = null;
        })
    };
}
function mountShell() {
    return mount(ReportingShell, {
        global: {
            stubs: {
                RouterLink: true,
                RouterView: true
            }
        }
    });
}
describe('ReportingShell media preload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.flowRef.current = buildFlowStore();
        hoisted.axiosApi.get.mockImplementation((url) => {
            if (url === 'patient-examinations/314/') {
                return Promise.resolve({
                    data: {
                        id: 314,
                        examination: { id: 9, name: 'colonoscopy' },
                        patient: { id: 42 },
                        date_start: '2026-03-10'
                    }
                });
            }
            if (url === 'patient-examinations/list/') {
                return Promise.resolve({
                    data: {
                        results: [
                            {
                                id: 314,
                                examination: { id: 9, name: 'colonoscopy' },
                                patient: { id: 42 },
                                date_start: '2026-03-10'
                            },
                            {
                                id: 315,
                                examination: { id: 10, name: 'gastroscopy' },
                                patient: { id: 42 },
                                date_start: '2026-03-11'
                            }
                        ]
                    }
                });
            }
            return Promise.resolve({ data: { results: [] } });
        });
    });
    it('loads timeline latest payload on mount/watch with expected params', async () => {
        hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
            patient: { id: 42 },
            latestReport: null,
            latestVideo: null,
            latestFrames: []
        });
        mountShell();
        await flushPromises();
        expect(hoisted.timelineApi.fetchPatientTimelineLatest).toHaveBeenCalledWith({
            patientId: 42,
            patientExaminationId: 314
        });
        expect(hoisted.flowRef.current.setMediaPreload).toHaveBeenCalled();
    });
    it('maps 404 timeline errors to actionable UI message', async () => {
        hoisted.timelineApi.fetchPatientTimelineLatest.mockRejectedValue({
            response: { status: 404, data: { detail: 'not found' } }
        });
        mountShell();
        await flushPromises();
        expect(hoisted.flowRef.current.setMediaPreloadError).toHaveBeenCalledWith(expect.stringContaining('404'));
    });
    it('shows patient examination options and navigates on selection', async () => {
        hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
            patient: { id: 42 },
            latestReport: null,
            latestVideo: null,
            latestFrames: []
        });
        const wrapper = mountShell();
        await flushPromises();
        const select = wrapper.find('select.form-select.form-select-sm');
        const optionTexts = select.findAll('option').map((option) => option.text());
        expect(optionTexts).toContain('#314 · colonoscopy · 10.3.2026');
        expect(optionTexts).toContain('#315 · gastroscopy · 11.3.2026');
        await select.setValue('315');
        await flushPromises();
        expect(hoisted.flowRef.current.setLookupSession).toHaveBeenCalledWith({
            patientExaminationId: 315,
            lookupToken: null,
            status: 'idle'
        });
        expect(hoisted.routerRef.current.push).toHaveBeenCalledWith('/reporting/315/findings');
    });
});
