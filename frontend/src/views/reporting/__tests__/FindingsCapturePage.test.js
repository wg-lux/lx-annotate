import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import FindingsCapturePage from '../FindingsCapturePage.vue';
import axiosInstance from '@/api/axiosInstance';
const hoisted = vi.hoisted(() => ({
    flowRef: { current: null },
    findingSelectorsRef: { current: null },
    patientExaminationStoreRef: { current: null },
    lookupActions: {
        fetchLookupAll: vi.fn(),
        recomputeLookup: vi.fn()
    },
    axios: {
        post: vi.fn()
    }
}));
vi.mock('@/api/axiosInstance', () => ({
    default: {
        post: hoisted.axios.post
    },
    r: (path) => path
}));
vi.mock('@/stores/reportingFlowStore', () => ({
    useReportingFlowStore: () => hoisted.flowRef.current
}));
vi.mock('@/composables/reporting/useFindingSelectors', () => ({
    useFindingSelectors: () => hoisted.findingSelectorsRef.current
}));
vi.mock('@/stores/patientExaminationStore', () => ({
    usePatientExaminationStore: () => hoisted.patientExaminationStoreRef.current
}));
vi.mock('@/composables/reporting/useLookupActions', () => ({
    useLookupActions: () => ({
        fetchLookupAll: hoisted.lookupActions.fetchLookupAll,
        recomputeLookup: hoisted.lookupActions.recomputeLookup,
        patchLookupParts: vi.fn(),
        fetchLookupParts: vi.fn()
    })
}));
vi.mock('@/composables/reporting/useReportTemplates', () => ({
    useReportTemplates: () => ({
        moduleName: 'report_template_examples',
        selectedTemplateName: null,
        templateOptions: [],
        selectedTemplate: null,
        sectionBlocks: [],
        loading: false,
        errorMessage: null,
        fetchTemplatesByExamination: vi.fn().mockResolvedValue([]),
        selectTemplateByName: vi.fn().mockResolvedValue(undefined),
        setModuleName: vi.fn()
    })
}));
vi.mock('@/stores/examinationStore', () => ({
    useExaminationStore: () => ({
        exams: [{ id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' }],
        examinationsDropdown: [{ id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' }],
        fetchExaminations: vi.fn().mockResolvedValue(undefined)
    })
}));
function buildFlowStore() {
    const flow = reactive({
        lookupToken: null,
        patientExaminationId: null,
        selectedExaminationId: 7,
        findingsRevision: 0,
        lastFindingsEvent: null,
        patchLookupSnapshot: vi.fn(),
        setSelectedRequirementSetIds: vi.fn(),
        setTemplateSelection: vi.fn(),
        setLastTemplateValidation: vi.fn(),
        noteFindingAdded: vi.fn(),
        noteClassificationUpdated: vi.fn(),
        selectedKbModule: 'report_template_examples',
        selectedTemplateName: null,
        setSessionStatus: vi.fn((status) => {
            ;
            flow.sessionStatus = status;
        }),
        setLookupSession: vi.fn((params) => {
            flow.patientExaminationId = params.patientExaminationId;
            flow.lookupToken = params.lookupToken;
            flow.sessionStatus = params.status || 'active';
        }),
        sessionStatus: 'idle'
    });
    return flow;
}
function mountPage() {
    return mount(FindingsCapturePage, {
        global: {
            stubs: {
                MedicalBlock: true,
                RequirementSetSelectionList: true,
                LookupStatusPanel: true,
                ReportTemplateValidationPanel: true,
                AddableFindingsDetail: true,
                FindingsDetail: true
            }
        }
    });
}
function findButtonByText(wrapper, text) {
    return wrapper.findAll('button').find((button) => button.text().includes(text));
}
describe('FindingsCapturePage lookup bootstrap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.flowRef.current = buildFlowStore();
        hoisted.findingSelectorsRef.current = reactive({
            loading: false,
            ensureCatalogLoaded: vi.fn().mockResolvedValue([]),
            ensurePatientFindingsLoaded: vi.fn().mockResolvedValue([]),
            getFindingById: vi.fn().mockReturnValue(null),
            isFindingAttached: vi.fn().mockReturnValue(false)
        });
        hoisted.patientExaminationStoreRef.current = {
            setCurrentPatientExaminationId: vi.fn()
        };
        hoisted.lookupActions.fetchLookupAll.mockResolvedValue({ ok: true });
        hoisted.lookupActions.recomputeLookup.mockResolvedValue({ ok: true });
        hoisted.axios.post.mockResolvedValue({
            data: {
                token: 'lookup-token-1'
            }
        });
    });
    it('initializes lookup before recompute when token is missing', async () => {
        const wrapper = mountPage();
        hoisted.flowRef.current.patientExaminationId = 42;
        await wrapper.vm.$nextTick();
        const recomputeButton = findButtonByText(wrapper, 'Wissensbasis neu prüfen');
        expect(recomputeButton).toBeTruthy();
        await recomputeButton.trigger('click');
        await flushPromises();
        expect(vi.mocked(axiosInstance.post)).toHaveBeenCalledWith('lookup/init/', {
            patientExaminationId: 42
        });
        expect(hoisted.flowRef.current.lookupToken).toBe('lookup-token-1');
        expect(hoisted.lookupActions.recomputeLookup).toHaveBeenCalledTimes(1);
    });
    it('auto-loads lookup on mount when patient examination exists but token is missing', async () => {
        hoisted.flowRef.current.patientExaminationId = 55;
        mountPage();
        await flushPromises();
        expect(vi.mocked(axiosInstance.post)).toHaveBeenCalledWith('lookup/init/', {
            patientExaminationId: 55
        });
        expect(hoisted.lookupActions.fetchLookupAll).toHaveBeenCalledTimes(1);
    });
});
