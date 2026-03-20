import { flushPromises, mount } from '@vue/test-utils';
import { computed, reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportEditorPage from '../ReportEditorPage.vue';
const hoisted = vi.hoisted(() => ({
    flowRef: { current: null },
    axiosApi: {
        get: vi.fn(),
        post: vi.fn()
    },
    templateControls: {
        setModuleName: vi.fn(),
        selectTemplateByName: vi.fn().mockResolvedValue(undefined),
        fetchTemplatesByExamination: vi.fn().mockResolvedValue([])
    }
}));
vi.mock('vue-router', () => ({
    RouterLink: {
        template: '<a><slot /></a>'
    },
    useRoute: () => ({
        params: {
            patient_examination_id: '42'
        }
    })
}));
vi.mock('@/api/axiosInstance', () => ({
    default: hoisted.axiosApi,
    r: (path) => path
}));
vi.mock('@/stores/reportingFlowStore', () => ({
    useReportingFlowStore: () => hoisted.flowRef.current
}));
vi.mock('@/stores/patientStore', () => ({
    usePatientStore: () => ({
        patients: [{ id: 7 }],
        getPatientById: (id) => id === 7
            ? {
                id: 7,
                firstName: 'Jane',
                lastName: 'Doe',
                dob: '1980-01-01',
                gender: 'f'
            }
            : null,
        fetchPatients: vi.fn().mockResolvedValue(undefined)
    })
}));
vi.mock('@/stores/examinationStore', () => ({
    useExaminationStore: () => ({
        exams: [{ id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' }],
        examinationsDropdown: [{ id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' }],
        fetchExaminations: vi.fn().mockResolvedValue(undefined)
    })
}));
vi.mock('@/composables/reporting/useReportTemplates', () => ({
    useReportTemplates: () => ({
        moduleName: ref('report_template_examples'),
        selectedTemplateName: ref('star_upper_gi_main'),
        templateOptions: ref([{ name: 'star_upper_gi_main', examination: 'gastroscopy' }]),
        selectedTemplate: ref({
            name: 'star_upper_gi_main',
            examination: 'gastroscopy',
            reportSections: [],
            validators: {
                examinationValidators: [],
                findingsValidators: []
            }
        }),
        sectionBlocks: ref([
            {
                name: 'examination_baseline',
                position: 0,
                title: 'Examination Baseline',
                subtitle: 'Initial findings',
                findings: [
                    {
                        finding: 'esophagus_polyp',
                        required: true,
                        multipleAllowed: true,
                        classifications: [{ classification: 'size_mm', required: true }]
                    }
                ],
                requiredFindingsCount: 1,
                optionalFindingsCount: 0,
                requiredClassificationsCount: 1
            }
        ]),
        loading: ref(false),
        errorMessage: ref(null),
        fetchTemplatesByExamination: hoisted.templateControls.fetchTemplatesByExamination,
        selectTemplateByName: hoisted.templateControls.selectTemplateByName,
        setModuleName: hoisted.templateControls.setModuleName
    })
}));
function buildFlowStore() {
    const flow = reactive({
        patientExaminationId: 42,
        selectedPatientId: 7,
        selectedExaminationId: 9,
        selectedKbModule: 'report_template_examples',
        selectedTemplateName: 'star_upper_gi_main',
        selectedRequirementSetIds: [],
        activeReportId: null,
        indications: [{ examinationIndicationId: null, indicationChoiceId: null }],
        templateSectionDrafts: {
            examination_baseline: {
                note: 'Visible note',
                includePatientData: false,
                includeExaminationData: false
            }
        },
        currentRuntimeDraft: {
            draftId: 'draft_42',
            patientExaminationId: 42,
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            hydratedFrom: 'draft_api',
            updatedAt: '2026-03-19T15:00:00.000Z',
            payload: {
                patient: 'patient_7',
                examiners: ['dr_house'],
                examination: 'gastroscopy',
                knowledgeBaseModule: 'report_template_examples',
                knowledgeBaseVersion: null,
                patientFindings: [
                    {
                        localId: 'finding_1',
                        finding: 'esophagus_polyp',
                        classificationChoices: [
                            {
                                localId: 'classification_1',
                                classification: 'size_mm',
                                classificationChoice: 'size_mm',
                                descriptors: [
                                    {
                                        localId: 'descriptor_1',
                                        classificationChoiceDescriptor: 'length_mm_descriptor',
                                        descriptorValue: 12
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        },
        draftPersistenceStatus: 'saved',
        draftPersistenceError: null,
        lastPersistedDraftAt: '2026-03-19T15:01:00.000Z',
        savingFinalReport: false,
        mediaPreload: null,
        lastRequirementGuidance: null,
        patchLookupSnapshot: vi.fn(),
        setTemplateSelection: vi.fn(),
        clearTemplateSectionDrafts: vi.fn(),
        setTemplateSectionDraft: vi.fn((sectionName, patch) => {
            flow.templateSectionDrafts[sectionName] = {
                ...flow.templateSectionDrafts[sectionName],
                ...patch
            };
        }),
        updateIndicationRow: vi.fn(),
        addIndicationRow: vi.fn(),
        removeIndicationRow: vi.fn(),
        setActiveReportId: vi.fn((id) => {
            flow.activeReportId = id;
        }),
        setLastRequirementGuidance: vi.fn(),
        setSavingFinalReport: vi.fn((value) => {
            flow.savingFinalReport = value;
        })
    });
    return flow;
}
function mountPage() {
    return mount(ReportEditorPage, {
        global: {
            stubs: {
                MedicalBlock: {
                    template: '<div><slot /></div>'
                },
                IndicationsEditor: true,
                ReportArtifactsPanel: true
            }
        }
    });
}
describe('ReportEditorPage draft-driven workflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hoisted.flowRef.current = buildFlowStore();
        hoisted.axiosApi.get.mockImplementation((url) => {
            if (url === 'patient-examinations/42/') {
                return Promise.resolve({
                    data: {
                        id: 42,
                        examination: { id: 9, name: 'gastroscopy' },
                        patient: { id: 7 }
                    }
                });
            }
            if (url === 'patient-examination-reports/?patient_examination_id=42') {
                return Promise.resolve({ data: [] });
            }
            if (url === 'examinations/9/') {
                return Promise.resolve({ data: { id: 9, name: 'gastroscopy' } });
            }
            return Promise.resolve({ data: [] });
        });
        hoisted.axiosApi.post.mockResolvedValue({
            data: {
                report: { id: 88, status: 'draft', version: 1 },
                created: true,
                warnings: [],
                historyContext: null,
                requirementGuidance: null,
                persistedArtifacts: null
            }
        });
    });
    it('renders live section preview from the current runtime draft and saves draft findings', async () => {
        const wrapper = mountPage();
        await flushPromises();
        expect(wrapper.text()).toContain('esophagus_polyp -> size_mm: size_mm (length_mm_descriptor: 12)');
        expect(wrapper.text()).toContain('Visible note');
        const buttons = wrapper.findAll('button');
        const draftSaveButton = buttons.find((button) => button.text().includes('Entwurf speichern'));
        expect(draftSaveButton).toBeTruthy();
        await draftSaveButton.trigger('click');
        await flushPromises();
        expect(hoisted.axiosApi.post).toHaveBeenCalledWith('patient-examination-reports/save-submission/', expect.objectContaining({
            patientExaminationId: 42,
            templateName: 'star_upper_gi_main',
            findings: [
                {
                    finding: 'esophagus_polyp',
                    classifications: [
                        {
                            classification: 'size_mm',
                            classificationChoice: 'size_mm'
                        }
                    ],
                    interventions: []
                }
            ],
            renderedText: expect.stringContaining('esophagus_polyp -> size_mm: size_mm')
        }));
    });
});
