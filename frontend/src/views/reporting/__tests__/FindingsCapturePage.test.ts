import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref } from 'vue'

import FindingsCapturePage from '../FindingsCapturePage.vue'

const hoisted = vi.hoisted(() => ({
  flowRef: { current: null as any },
  findingSelectorsRef: { current: null as any },
  validateRuntime: vi.fn(),
  templateControls: {
    setModuleName: vi.fn(),
    selectTemplateByName: vi.fn().mockResolvedValue(undefined),
    fetchTemplatesByExamination: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/composables/reporting/useFindingSelectors', () => ({
  useFindingSelectors: () => hoisted.findingSelectorsRef.current
}))

vi.mock('@/api/reportTemplatesApi', () => ({
  validateReportTemplateRuntime: hoisted.validateRuntime
}))

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
            classifications: [
              { classification: 'size_mm', required: true },
              { classification: 'lst', required: false }
            ]
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
}))

vi.mock('@/stores/examinationStore', () => ({
  useExaminationStore: () => ({
    examinationsDropdown: [{ id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' }]
  })
}))

function buildFlowStore() {
  const flow: any = reactive({
    patientExaminationId: 42,
    selectedExaminationId: 7,
    selectedKbModule: 'report_template_examples',
    selectedTemplateName: 'star_upper_gi_main',
    findingsRevision: 0,
    lastFindingsEvent: null as any,
    lastTemplateValidation: null as any,
    currentRuntimeDraft: {
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      hydratedFrom: 'backend_context',
      updatedAt: '2026-03-19T12:00:00.000Z',
      payload: {
        patient: 'patient_42',
        examiners: [],
        examination: 'gastroscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: null,
        patientFindings: [] as any[]
      }
    },
    setTemplateSelection: vi.fn((params: { moduleName?: string; templateName?: string | null }) => {
      if (params.moduleName !== undefined) flow.selectedKbModule = params.moduleName || 'report_template_examples'
      if (params.templateName !== undefined) flow.selectedTemplateName = params.templateName || null
    }),
    setLastTemplateValidation: vi.fn((result: any) => {
      flow.lastTemplateValidation = result
    }),
    addFinding: vi.fn(({ findingName }: { findingName: string }) => {
      const localId: string = `finding_${flow.currentRuntimeDraft.payload.patientFindings.length + 1}`
      flow.currentRuntimeDraft.payload.patientFindings.push({
        localId,
        finding: findingName,
        classificationChoices: []
      })
      return localId
    }),
    removeFinding: vi.fn((findingLocalId: string) => {
      flow.currentRuntimeDraft.payload.patientFindings =
        flow.currentRuntimeDraft.payload.patientFindings.filter(
          (finding: any) => finding.localId !== findingLocalId
        )
    }),
    updateClassificationValue: vi.fn((params: any) => {
      const finding = flow.currentRuntimeDraft.payload.patientFindings.find(
        (entry: any) => entry.localId === params.findingLocalId
      )
      if (!finding) return
      finding.classificationChoices = finding.classificationChoices.filter(
        (entry: any) => entry.classification !== params.classificationName
      )
      if (params.classificationChoice) {
        finding.classificationChoices.push({
          localId: `classification_${params.classificationName}`,
          classification: params.classificationName,
          classificationChoice: params.classificationChoice,
          descriptors: params.descriptors || []
        })
      }
    }),
    noteFindingAdded: vi.fn((findingId: number) => {
      flow.findingsRevision += 1
      flow.lastFindingsEvent = {
        type: 'finding_added',
        at: '2026-03-19T12:00:00.000Z',
        findingId
      }
    }),
    noteClassificationUpdated: vi.fn((findingId: number, classificationId: number, choiceId: number | null) => {
      flow.findingsRevision += 1
      flow.lastFindingsEvent = {
        type: 'classification_updated',
        at: '2026-03-19T12:01:00.000Z',
        findingId,
        classificationId,
        choiceId
      }
    })
  })

  return flow
}

function mountPage() {
  return mount(FindingsCapturePage, {
    global: {
      stubs: {
        MedicalBlock: {
          template: '<div><slot /></div>'
        },
        ReportTemplateValidationPanel: true,
        ReportingMediaPreviewCards: true
      }
    }
  })
}

describe('FindingsCapturePage runtime draft flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    hoisted.templateControls.fetchTemplatesByExamination.mockResolvedValue([])
    hoisted.templateControls.selectTemplateByName.mockResolvedValue(undefined)
    hoisted.flowRef.current = buildFlowStore()
    hoisted.findingSelectorsRef.current = {
      catalogFindings: computed(() => [
        {
          id: 11,
          name: 'esophagus_polyp',
          displayName: 'Oesophagus Polyp',
          descriptions: '',
          examinations: ['gastroscopy'],
          classifications: [
            {
              id: 101,
              name: 'size_mm',
              displayName: 'Size (mm)',
              required: true,
              classificationTypes: [],
              choices: [
                {
                  id: 1001,
                  name: 'size_mm',
                  displayName: 'Size (mm)',
                  subcategories: {},
                  numericalDescriptors: { length_mm_descriptor: 0 }
                }
              ]
            },
            {
              id: 102,
              name: 'lst',
              displayName: 'LST',
              required: false,
              classificationTypes: [],
              choices: [
                {
                  id: 1002,
                  name: 'granular',
                  displayName: 'Granular',
                  subcategories: {},
                  numericalDescriptors: {}
                }
              ]
            }
          ],
          locationClassifications: [],
          morphologyClassifications: [],
          FindingClassifications: [],
          findingTypes: [],
          findingInterventions: []
        }
      ]),
      loading: false,
      ensureCatalogLoaded: vi.fn().mockResolvedValue([]),
      getFindingById: vi.fn().mockImplementation((id: number) =>
        id === 11
          ? {
              id: 11,
              name: 'esophagus_polyp',
              displayName: 'Oesophagus Polyp'
            }
          : null
      )
    }
    hoisted.validateRuntime.mockResolvedValue({
      templateName: 'star_upper_gi_main',
      ok: true,
      evaluatedFindingsCount: 1,
      findingsValidators: [],
      examinationValidators: [],
      issues: []
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders template-driven findings and adds a finding to the local draft', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Oesophagus Polyp')

    const addButton = wrapper.findAll('button').find((button) => button.text().includes('Befund hinzufügen'))
    expect(addButton).toBeTruthy()

    await addButton!.trigger('click')
    await flushPromises()

    expect(hoisted.flowRef.current.addFinding).toHaveBeenCalledWith({
      findingName: 'esophagus_polyp'
    })
    expect(hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings).toHaveLength(1)

    vi.advanceTimersByTime(400)
    await flushPromises()

    expect(hoisted.validateRuntime).toHaveBeenCalledWith(
      'report_template_examples',
      'star_upper_gi_main',
      hoisted.flowRef.current.currentRuntimeDraft.payload
    )
  })

  it('updates classification values on the local draft and validates them', async () => {
    hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings = [
      {
        localId: 'finding_1',
        finding: 'esophagus_polyp',
        classificationChoices: []
      }
    ]

    const wrapper = mountPage()
    await flushPromises()

    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThan(1)

    await selects[1].setValue('size_mm')
    await flushPromises()

    expect(hoisted.flowRef.current.updateClassificationValue).toHaveBeenCalledWith({
      findingLocalId: 'finding_1',
      classificationName: 'size_mm',
      classificationChoice: 'size_mm',
      descriptors: []
    })

    vi.advanceTimersByTime(400)
    await flushPromises()

    expect(hoisted.validateRuntime).toHaveBeenCalledWith(
      'report_template_examples',
      'star_upper_gi_main',
      hoisted.flowRef.current.currentRuntimeDraft.payload
    )
  })
})
