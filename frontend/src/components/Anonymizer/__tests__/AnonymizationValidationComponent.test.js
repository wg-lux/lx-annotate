import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import axiosInstance from '@/api/axiosInstance';
import AnonymizationValidationComponent from '../AnonymizationValidationComponent.vue';
const hoisted = vi.hoisted(() => ({
    anonymizationStoreRef: { current: null },
    mediaStoreRef: { current: null },
    toastStoreRef: { current: null },
    routerPush: vi.fn()
}));
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn()
    },
    r: (value) => value
}));
vi.mock('@/stores/anonymizationStore', () => ({
    useAnonymizationStore: () => hoisted.anonymizationStoreRef.current
}));
vi.mock('@/stores/mediaTypeStore', () => ({
    useMediaTypeStore: () => hoisted.mediaStoreRef.current
}));
vi.mock('@/stores/toastStore', () => ({
    useToastStore: () => hoisted.toastStoreRef.current
}));
vi.mock('@/stores/videoStore', () => ({
    useVideoStore: () => ({
        fetchAllSegments: vi.fn().mockResolvedValue(undefined),
        allSegments: []
    })
}));
vi.mock('@/composables/useDebug', () => ({
    useDebug: () => ({ isDebug: false })
}));
vi.mock('vue-router', () => ({
    useRouter: () => ({
        push: hoisted.routerPush
    }),
    useRoute: () => ({
        query: {}
    })
}));
vi.mock('@/types/api/endpoints', () => ({
    endpoints: {
        anonymization: {
            documentTypesDropdown: 'anonymization/document-types/',
            validate: (fileId) => `anonymization/${fileId}/validate/`
        },
        media: {
            pdfCaseResolution: (fileId) => `media/pdfs/${fileId}/case-resolution/`,
            videoCaseResolution: (fileId) => `media/videos/${fileId}/case-resolution/`,
            pdfDetail: (fileId) => `media/pdfs/${fileId}/`,
            patientTimeline: (patientId) => `media/patients/${patientId}/timeline/`,
            pdfStream: (fileId) => `media/pdfs/${fileId}/stream/`,
            videoDetailStream: (fileId) => `media/videos/${fileId}/stream/`
        },
        examination: {
            patientExaminationList: 'examination/patient-examinations/'
        }
    }
}));
function buildPdfItem(overrides = {}) {
    return {
        id: 5,
        patientFirstName: 'Max',
        patientLastName: 'Mustermann',
        patientGenderName: 'female',
        patientDob: '1994-03-21',
        casenumber: 'CASE-1',
        anonymizedText: 'Anonymized report content',
        text: 'Original report content',
        centerName: 'Test Center',
        examinationDate: '2024-02-15',
        documentType: 'report_final',
        ...overrides
    };
}
function mountComponent() {
    return mount(AnonymizationValidationComponent, {
        props: {
            fileId: 5,
            mediaType: 'pdf'
        },
        global: {
            stubs: {
                RouterLink: { template: '<a><slot /></a>' },
                OutsideTimelineComponent: true
            }
        }
    });
}
describe('AnonymizationValidationComponent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.anonymizationStoreRef.current = reactive({
            loading: false,
            error: null,
            current: buildPdfItem(),
            overview: [buildPdfItem()],
            isAnyFileProcessing: false,
            processingFiles: [],
            fetchOverview: vi.fn().mockResolvedValue(undefined),
            setCurrentForValidation: vi.fn().mockResolvedValue(true),
            fetchNext: vi.fn().mockResolvedValue(undefined)
        });
        hoisted.mediaStoreRef.current = reactive({
            isPdf: true,
            isVideo: false,
            setCurrentByKey: vi.fn(),
            rememberType: vi.fn(),
            detectMediaType: vi.fn().mockReturnValue('pdf')
        });
        hoisted.toastStoreRef.current = {
            success: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            warning: vi.fn()
        };
        vi.mocked(axiosInstance.get).mockImplementation(async (url) => {
            if (url === 'anonymization/document-types/') {
                return {
                    data: [{ value: 'report_final', label: 'report_final' }]
                };
            }
            if (url === 'media/pdfs/5/case-resolution/') {
                return { data: {} };
            }
            if (url === 'media/pdfs/5/') {
                return { data: {} };
            }
            if (url === 'examination/patient-examinations/') {
                return { data: [] };
            }
            return { data: {} };
        });
    });
    it('blocks pdf approval when no document type is selected', async () => {
        hoisted.anonymizationStoreRef.current.current = buildPdfItem({ documentType: '' });
        const wrapper = mountComponent();
        await flushPromises();
        const approveButton = wrapper.find('button.btn.btn-success');
        expect(approveButton.attributes('disabled')).toBeDefined();
        expect(wrapper.text()).toContain('Bitte wählen Sie einen Dokumenttyp für die PDF-Validierung.');
    });
    it('shows backend validation errors when approval fails', async () => {
        vi.mocked(axiosInstance.post).mockRejectedValue({
            response: {
                data: {
                    error: 'document_type is required',
                    allowed_document_types: ['report_final']
                }
            }
        });
        const wrapper = mountComponent();
        await flushPromises();
        await wrapper.find('button.btn.btn-success').trigger('click');
        await flushPromises();
        expect(hoisted.toastStoreRef.current.error).toHaveBeenCalledWith({
            text: 'Fehler beim Bestätigen: document_type is required'
        });
    });
    it('submits the normalized pdf validation payload and shows success toasts', async () => {
        vi.mocked(axiosInstance.post).mockResolvedValue({
            data: {
                report_file: null,
                case_resolution: {
                    patient_examination_id: 42
                }
            }
        });
        const wrapper = mountComponent();
        await flushPromises();
        await wrapper.find('button.btn.btn-success').trigger('click');
        await flushPromises();
        expect(vi.mocked(axiosInstance.post)).toHaveBeenCalledWith('anonymization/5/validate/', expect.objectContaining({
            file_type: 'pdf',
            document_type: 'report_final',
            patient_dob: '21.03.1994',
            examination_date: '15.02.2024'
        }));
        expect(hoisted.toastStoreRef.current.success).toHaveBeenCalledWith({
            text: 'Dokument bestätigt und Anonymisierung validiert'
        });
        expect(hoisted.toastStoreRef.current.info).toHaveBeenCalledWith({
            text: 'PDF validiert. Patientenfall 42 wurde automatisch zugeordnet und im Berichtseditor geöffnet.'
        });
        expect(hoisted.routerPush).toHaveBeenCalledWith('/reporting/42/report-editor');
    });
});
