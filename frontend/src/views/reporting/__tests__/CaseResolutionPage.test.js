import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CaseResolutionPage from '../CaseResolutionPage.vue';
const hoisted = vi.hoisted(() => ({
    routeRef: {
        current: {
            query: {}
        }
    },
    flowRef: { current: null },
    patientStoreRef: { current: null },
    examinationStoreRef: { current: null },
    patientExaminationStoreRef: { current: null },
    anonymizationStoreRef: { current: null },
    axiosApi: {
        get: vi.fn(),
        post: vi.fn()
    }
}));
vi.mock('vue-router', () => ({
    RouterLink: {
        props: ['to'],
        template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>'
    },
    useRoute: () => hoisted.routeRef.current
}));
vi.mock('@/api/axiosInstance', () => ({
    default: hoisted.axiosApi,
    r: (path) => path
}));
vi.mock('@/stores/reportingFlowStore', () => ({
    useReportingFlowStore: () => hoisted.flowRef.current
}));
vi.mock('@/stores/patientStore', () => ({
    usePatientStore: () => hoisted.patientStoreRef.current
}));
vi.mock('@/stores/examinationStore', () => ({
    useExaminationStore: () => hoisted.examinationStoreRef.current
}));
vi.mock('@/stores/patientExaminationStore', () => ({
    usePatientExaminationStore: () => hoisted.patientExaminationStoreRef.current
}));
vi.mock('@/stores/anonymizationStore', () => ({
    useAnonymizationStore: () => hoisted.anonymizationStoreRef.current
}));
function buildFlowStore() {
    const flow = reactive({
        selectedPatientId: null,
        selectedExaminationId: null,
        patientExaminationId: 314,
        setCaseSelection: vi.fn((payload) => {
            if (payload.selectedPatientId !== undefined)
                flow.selectedPatientId = payload.selectedPatientId;
            if (payload.selectedExaminationId !== undefined)
                flow.selectedExaminationId = payload.selectedExaminationId;
        }),
        setPatientExaminationContext: vi.fn((payload) => {
            flow.patientExaminationId = payload.patientExaminationId;
            if (payload.selectedPatientId !== undefined)
                flow.selectedPatientId = payload.selectedPatientId;
            if (payload.selectedExaminationId !== undefined)
                flow.selectedExaminationId = payload.selectedExaminationId;
        })
    });
    return flow;
}
describe('CaseResolutionPage workflow linking', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.routeRef.current = {
            query: {
                fileId: '5',
                mediaType: 'pdf',
                returnTo: '/anonymisierung/validierung?fileId=5&mediaType=pdf',
                preferredExamination: 'colonoscopy'
            }
        };
        hoisted.flowRef.current = buildFlowStore();
        hoisted.patientStoreRef.current = {
            loading: false,
            patientsWithDisplayName: [{ id: 7, displayName: 'Jane Doe' }],
            getPatientById: (id) => id === 7
                ? {
                    id: 7,
                    firstName: 'Jane',
                    lastName: 'Doe',
                    dob: '1980-01-01',
                    gender: 'female',
                    patientHash: 'patient_7'
                }
                : null,
            fetchPatients: vi.fn().mockResolvedValue(undefined),
            createPatient: vi.fn()
        };
        hoisted.examinationStoreRef.current = {
            loading: false,
            examinationsDropdown: [{ id: 13, name: 'colonoscopy', displayName: 'Koloskopie' }],
            fetchExaminations: vi.fn().mockResolvedValue(undefined)
        };
        hoisted.patientExaminationStoreRef.current = {
            addPatientExamination: vi.fn(),
            setCurrentPatientExaminationId: vi.fn()
        };
        hoisted.anonymizationStoreRef.current = {
            current: null,
            overview: [{ id: 5 }],
            fetchOverview: vi.fn().mockResolvedValue(undefined),
            setCurrentForValidation: vi.fn().mockResolvedValue(true)
        };
        hoisted.axiosApi.get.mockImplementation((url) => {
            if (url === 'media/pdfs/5/case-resolution/') {
                return Promise.resolve({ data: {} });
            }
            if (url === 'patient-examinations/list/') {
                return Promise.resolve({ data: { results: [] } });
            }
            return Promise.resolve({ data: [] });
        });
    });
    it('keeps returnTo and preferred examination on the fall-setup handoff', async () => {
        const wrapper = mount(CaseResolutionPage);
        await flushPromises();
        expect(hoisted.flowRef.current.setCaseSelection).toHaveBeenCalledWith({
            selectedPatientId: null,
            selectedExaminationId: 13
        });
        const setupLink = wrapper
            .findAll('a')
            .find((link) => link.text().includes('Im Fall-Setup Fallkontext starten'));
        expect(setupLink).toBeTruthy();
        expect(JSON.parse(setupLink.attributes('data-to'))).toEqual({
            path: '/reporting/case-setup',
            query: {
                returnTo: '/anonymisierung/validierung?fileId=5&mediaType=pdf',
                preferredExamination: 'colonoscopy'
            }
        });
        const backLink = wrapper
            .findAll('a')
            .find((link) => link.text().includes('Zurück zur Validierung'));
        expect(backLink).toBeTruthy();
        expect(backLink.attributes('data-to')).toBe('/anonymisierung/validierung?fileId=5&mediaType=pdf');
        const nextLink = wrapper
            .findAll('a')
            .find((link) => link.text().includes('Zur klinischen Dokumentation'));
        expect(nextLink).toBeTruthy();
        expect(nextLink.attributes('data-to')).toBe('/reporting/314/findings');
    });
});
