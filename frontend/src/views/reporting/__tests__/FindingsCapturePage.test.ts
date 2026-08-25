import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, ref } from 'vue'

import FindingsCapturePage from '../FindingsCapturePage.vue'
import type {
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimeValidationResult
} from '@/types/reportTemplate'

function requireDefined<T>(value: T | undefined, description: string): T {
  if (value === undefined) throw new Error(`Expected ${description}.`)
  return value
}

const hoisted = vi.hoisted(() => {
  const initialActiveBundle = (): { moduleName: string; version: string } | null => ({
    moduleName: 'report_template_examples',
    version: '1.0.0'
  })

  class FixtureRef<T> {
    private fixture: T | undefined

    constructor(private readonly name: string) {}

    get current(): T {
      if (this.fixture === undefined) {
        throw new Error(`${this.name} fixture was not initialized.`)
      }
      return this.fixture
    }

    set current(value: T) {
      this.fixture = value
    }
  }

  return {
    flowRef: new FixtureRef<ReturnType<typeof buildFlowStore>>('reporting flow'),
    findingSelectorsRef: new FixtureRef<ReturnType<typeof buildFindingSelectors>>(
      'finding selectors'
    ),
    validateRuntime: vi.fn(),
    fetchExaminationReportingContext: vi.fn(),
    terminologyStore: {
      activeBundle: initialActiveBundle(),
      activeModuleName: 'report_template_examples',
      activeBundleKey: 'report_template_examples@@1.0.0'
    },
    templateControls: {
      annotationOnly: false,
      setModuleName: vi.fn(),
      selectTemplateByName: vi.fn().mockResolvedValue(undefined),
      applyTemplateOptions: vi.fn()
    },
    examinationStore: {
      exams: [{ id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' }],
      examinationsDropdown: [{ id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' }],
      fetchExaminations: vi.fn().mockResolvedValue(undefined)
    }
  }
})

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/composables/reporting/useFindingSelectors', () => ({
  useFindingSelectors: () => hoisted.findingSelectorsRef.current
}))

vi.mock('@/api/reportTemplatesApi', () => ({
  validateReportTemplateRuntime: hoisted.validateRuntime
}))

vi.mock('@/api/knowledgeBaseGraphApi', () => ({
  fetchExaminationReportingContext: hoisted.fetchExaminationReportingContext
}))

vi.mock('@/stores/terminologyStore', () => ({
  useTerminologyStore: () => hoisted.terminologyStore
}))

vi.mock('@/composables/reporting/useReportTemplates', () => ({
  useReportTemplates: () => {
    const annotationOnly = hoisted.templateControls.annotationOnly
    return {
      moduleName: ref(annotationOnly ? '' : 'report_template_examples'),
      selectedTemplateName: ref(annotationOnly ? null : 'star_upper_gi_main'),
      templateOptions: ref(
        annotationOnly ? [] : [{ name: 'star_upper_gi_main', examination: 'gastroscopy' }]
      ),
      selectedTemplate: ref(
        annotationOnly
          ? null
          : {
              name: 'star_upper_gi_main',
              examination: 'gastroscopy',
              reportSections: [],
              validators: {
                examinationValidators: [],
                findingsValidators: []
              }
            }
      ),
      sectionBlocks: ref(
        annotationOnly
          ? []
          : [
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
                      {
                        classification: 'size_mm',
                        required: true,
                        input: {
                          choices: [
                            {
                              name: 'size_mm',
                              descriptors: [
                                {
                                  name: 'length_mm_descriptor',
                                  type: 'numeric',
                                  unit: 'milimeter',
                                  unitAbbreviation: 'mm',
                                  numericMin: 0,
                                  numericMax: 200
                                }
                              ]
                            }
                          ]
                        }
                      },
                      { classification: 'lst', required: false },
                      {
                        classification: 'medication_administration_time',
                        required: false,
                        input: {
                          choices: [
                            {
                              name: 'medication_administration_time_recorded',
                              descriptors: [
                                {
                                  name: 'medication_administration_time_value',
                                  type: 'text',
                                  unit: null,
                                  unitAbbreviation: null,
                                  numericMin: null,
                                  numericMax: null
                                }
                              ]
                            }
                          ]
                        }
                      }
                    ]
                  }
                ],
                requiredFindingsCount: 1,
                optionalFindingsCount: 0,
                requiredClassificationsCount: 1
              }
            ]
      ),
      loading: ref(false),
      errorMessage: ref(null),
      applyTemplateOptions: hoisted.templateControls.applyTemplateOptions,
      selectTemplateByName: hoisted.templateControls.selectTemplateByName,
      setModuleName: hoisted.templateControls.setModuleName
    }
  }
}))

vi.mock('@/stores/examinationStore', () => ({
  useExaminationStore: () => hoisted.examinationStore
}))

function buildFlowStore() {
  type FindingsEvent =
    | {
        type: 'finding_added'
        at: string
        findingId: number
      }
    | {
        type: 'classification_updated'
        at: string
        findingId: number
        classificationId: number
        choiceId: number | null
      }
  type UpdateClassificationParams = {
    findingLocalId: string
    classificationName: string
    classificationChoice?: string
    descriptors?: ReportTemplateRuntimeDescriptorInput[]
  }

  const initialSelectedExaminationId = (): number | null => 7
  const initialSelectedTemplateName = (): string | null => 'star_upper_gi_main'

  const flow = reactive({
    patientExaminationId: 42,
    selectedExaminationId: initialSelectedExaminationId(),
    selectedKbModule: 'report_template_examples',
    selectedTemplateName: initialSelectedTemplateName(),
    findingsRevision: 0,
    lastFindingsEvent: null as FindingsEvent | null,
    lastTemplateValidation: null as ReportTemplateRuntimeValidationResult | null,
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
        knowledgeBaseVersion: '1.0.0',
        patientFindings: [] as ReportTemplateRuntimePatientFindingInput[]
      }
    },
    setTemplateSelection: vi.fn((params: { moduleName?: string; templateName?: string | null }) => {
      if (params.moduleName !== undefined)
        flow.selectedKbModule = params.moduleName || 'report_template_examples'
      if (params.templateName !== undefined) flow.selectedTemplateName = params.templateName || null
    }),
    setLastTemplateValidation: vi.fn((result: ReportTemplateRuntimeValidationResult | null) => {
      flow.lastTemplateValidation = result
    }),
    persistCurrentRuntimeDraft: vi.fn().mockResolvedValue(undefined),
    addFinding: vi.fn(({ findingName }: { findingName: string }) => {
      const localId: string = `finding_${String(flow.currentRuntimeDraft.payload.patientFindings.length + 1)}`
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
          (finding: ReportTemplateRuntimePatientFindingInput) => finding.localId !== findingLocalId
        )
    }),
    updateClassificationValue: vi.fn((params: UpdateClassificationParams) => {
      const finding = flow.currentRuntimeDraft.payload.patientFindings.find(
        (entry: ReportTemplateRuntimePatientFindingInput) => entry.localId === params.findingLocalId
      )
      if (!finding) return
      finding.classificationChoices = finding.classificationChoices.filter(
        (entry: ReportTemplateRuntimeClassificationChoiceInput) =>
          entry.classification !== params.classificationName
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
    noteClassificationUpdated: vi.fn(
      (findingId: number, classificationId: number, choiceId: number | null) => {
        flow.findingsRevision += 1
        flow.lastFindingsEvent = {
          type: 'classification_updated',
          at: '2026-03-19T12:01:00.000Z',
          findingId,
          classificationId,
          choiceId
        }
      }
    )
  })

  return flow
}

function buildFindingSelectors() {
  return {
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
                numericalDescriptors: {}
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
}

function mountPage() {
  return mount(FindingsCapturePage, {
    global: {
      stubs: {
        MedicalBlock: {
          template: '<div><slot /></div>'
        },
        ReportTemplateValidationPanel: {
          props: ['findingAnchors', 'result'],
          template:
            '<div data-testid="validation-panel-stub">{{ findingAnchors.esophagus_polyp }}</div>'
        },
        ReportingMediaPreviewCards: true
      }
    }
  })
}

describe('FindingsCapturePage runtime draft flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    hoisted.templateControls.annotationOnly = false
    hoisted.terminologyStore.activeBundle = {
      moduleName: 'report_template_examples',
      version: '1.0.0'
    }
    hoisted.terminologyStore.activeModuleName = 'report_template_examples'
    hoisted.terminologyStore.activeBundleKey = 'report_template_examples@@1.0.0'
    hoisted.fetchExaminationReportingContext.mockResolvedValue({ reportTemplates: [] })
    hoisted.templateControls.selectTemplateByName.mockResolvedValue(undefined)
    hoisted.examinationStore.exams = [{ id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' }]
    hoisted.examinationStore.examinationsDropdown = [
      { id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' }
    ]
    hoisted.examinationStore.fetchExaminations.mockResolvedValue(undefined)
    hoisted.flowRef.current = buildFlowStore()
    hoisted.findingSelectorsRef.current = buildFindingSelectors()
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
    expect(wrapper.find('#finding-esophagus_polyp').exists()).toBe(true)
    expect(wrapper.get('[data-testid="validation-panel-stub"]').text()).toContain(
      'finding-esophagus_polyp'
    )

    const addButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('Befund hinzufügen')),
      'the add-finding button'
    )

    await addButton.trigger('click')
    await flushPromises()

    expect(hoisted.flowRef.current.addFinding).toHaveBeenCalledWith({
      findingName: 'esophagus_polyp'
    })
    expect(hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings).toHaveLength(1)

    vi.advanceTimersByTime(400)
    await flushPromises()

    expect(hoisted.validateRuntime).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0',
      'star_upper_gi_main',
      hoisted.flowRef.current.currentRuntimeDraft.payload
    )
    expect(hoisted.flowRef.current.persistCurrentRuntimeDraft).toHaveBeenCalled()
  })

  it('keeps catalog-backed finding capture available without terminology', async () => {
    hoisted.templateControls.annotationOnly = true
    hoisted.terminologyStore.activeBundle = null
    hoisted.terminologyStore.activeModuleName = ''
    hoisted.terminologyStore.activeBundleKey = ''
    hoisted.flowRef.current.selectedKbModule = ''
    hoisted.flowRef.current.selectedTemplateName = null
    hoisted.flowRef.current.currentRuntimeDraft.moduleName = ''
    hoisted.flowRef.current.currentRuntimeDraft.templateName = ''

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Befunderfassung ohne Berichtsvorlage')
    expect(wrapper.text()).toContain('Oesophagus Polyp')
    expect(wrapper.find('[data-testid="validation-panel-stub"]').exists()).toBe(false)
    expect(hoisted.validateRuntime).not.toHaveBeenCalled()

    const addButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('Befund hinzufügen')),
      'the annotation-only add-finding button'
    )
    await addButton.trigger('click')
    expect(hoisted.flowRef.current.addFinding).toHaveBeenCalledWith({
      findingName: 'esophagus_polyp'
    })
  })

  it('renders the active knowledge-base module as read-only context', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const moduleInput = wrapper.find('input[value="report_template_examples"]')
    expect(moduleInput.exists()).toBe(true)
    expect(moduleInput.attributes()).toHaveProperty('readonly')
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
      '1.0.0',
      'star_upper_gi_main',
      hoisted.flowRef.current.currentRuntimeDraft.payload
    )
    expect(hoisted.flowRef.current.persistCurrentRuntimeDraft).toHaveBeenCalled()
  })

  it('renders and records numeric descriptors supplied by the compiled template', async () => {
    hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings = [
      {
        localId: 'finding_1',
        finding: 'esophagus_polyp',
        classificationChoices: []
      }
    ]

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('select')[1].setValue('size_mm')
    await flushPromises()

    const descriptorInput = wrapper.get('input[type="number"]')
    await descriptorInput.setValue('12')
    await flushPromises()

    expect(hoisted.flowRef.current.updateClassificationValue).toHaveBeenLastCalledWith({
      findingLocalId: 'finding_1',
      classificationName: 'size_mm',
      classificationChoice: 'size_mm',
      descriptors: [
        {
          localId: undefined,
          classificationChoiceDescriptor: 'length_mm_descriptor',
          descriptorValue: 12
        }
      ]
    })
  })

  it('renders and records text descriptors supplied by the compiled template', async () => {
    hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings = [
      {
        localId: 'finding_1',
        finding: 'esophagus_polyp',
        classificationChoices: []
      }
    ]

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.findAll('select')[3].setValue('medication_administration_time_recorded')
    await flushPromises()

    const descriptorInput = wrapper.get('.runtime-finding-instance input[type="text"]')
    await descriptorInput.setValue('10:30')
    await flushPromises()

    expect(hoisted.flowRef.current.updateClassificationValue).toHaveBeenLastCalledWith({
      findingLocalId: 'finding_1',
      classificationName: 'medication_administration_time',
      classificationChoice: 'medication_administration_time_recorded',
      descriptors: [
        {
          localId: undefined,
          classificationChoiceDescriptor: 'medication_administration_time_value',
          descriptorValue: '10:30'
        }
      ]
    })
  })

  it('loads catalog rows for the active examination before allowing finding capture', async () => {
    const ensureCatalogLoaded = vi.fn().mockResolvedValue([
      {
        id: 11,
        name: 'esophagus_polyp',
        displayName: 'Oesophagus Polyp',
        descriptions: '',
        examinations: ['gastroscopy'],
        classifications: [],
        locationClassifications: [],
        morphologyClassifications: [],
        FindingClassifications: [],
        findingTypes: [],
        findingInterventions: []
      }
    ])
    const legacyCatalog = buildFindingSelectors()
    legacyCatalog.ensureCatalogLoaded = ensureCatalogLoaded

    hoisted.findingSelectorsRef.current = legacyCatalog
    hoisted.findingSelectorsRef.current.catalogFindings = computed(() => [
      {
        id: 11,
        name: 'esophagus_polyp',
        displayName: 'Oesophagus Polyp',
        descriptions: '',
        examinations: ['gastroscopy'],
        classifications: [],
        locationClassifications: [],
        morphologyClassifications: [],
        FindingClassifications: [],
        findingTypes: [],
        findingInterventions: []
      }
    ])
    hoisted.flowRef.current.selectedExaminationId = 7

    const wrapper = mountPage()
    await flushPromises()

    expect(ensureCatalogLoaded).toHaveBeenCalledWith(7, {
      moduleName: 'report_template_examples',
      moduleVersion: '1.0.0',
      patientExaminationId: 42
    })
    expect(wrapper.text()).toContain('Oesophagus Polyp')
  })

  it('loads colonoscopy findings and templates when only the canonical name is persisted', async () => {
    hoisted.flowRef.current.selectedExaminationId = null
    hoisted.flowRef.current.currentRuntimeDraft.payload.examination = 'colonoscopy'
    hoisted.examinationStore.exams = [{ id: 12, name: 'colonoscopy', displayName: 'Koloskopie' }]
    hoisted.examinationStore.examinationsDropdown = [
      { id: 12, name: 'colonoscopy', displayName: 'Koloskopie' }
    ]

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Bitte zuerst das Fall-Setup abschließen')
    expect(hoisted.findingSelectorsRef.current.ensureCatalogLoaded).toHaveBeenCalledWith(12, {
      moduleName: 'report_template_examples',
      moduleVersion: '1.0.0',
      patientExaminationId: 42
    })
    expect(hoisted.fetchExaminationReportingContext).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0',
      'colonoscopy'
    )
  })

})
