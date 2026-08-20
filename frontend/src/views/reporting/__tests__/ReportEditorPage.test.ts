import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportEditorPage from '../ReportEditorPage.vue'
import IndicationsEditor from '@/components/Reporting/IndicationsEditor.vue'
import type { ReportTemplateSectionDraft } from '@/types/reportTemplate'
import type { SaveReportSubmissionRequest } from '@/types/api/reportSubmission'

function requireDefined<T>(value: T | undefined, description: string): T {
  if (value === undefined) throw new Error(`Expected ${description}.`)
  return value
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

const hoisted = vi.hoisted(() => {
  let flowFixture: ReturnType<typeof buildFlowStore> | undefined
  return {
    flowRef: {
      get current(): ReturnType<typeof buildFlowStore> {
        if (flowFixture === undefined) {
          throw new Error('Reporting flow fixture was not initialized.')
        }
        return flowFixture
      },
      set current(value: ReturnType<typeof buildFlowStore>) {
        flowFixture = value
      }
    },
    debugRef: { current: false },
    axiosApi: {
      get: vi.fn(),
      post: vi.fn<
        (url: string, payload: SaveReportSubmissionRequest) => Promise<{ data: unknown }>
      >()
    },
    templateControls: {
      setModuleName: vi.fn(),
      setRequestContext: vi.fn(),
      applyTemplateOptions: vi.fn(),
      selectTemplateByName: vi.fn().mockResolvedValue(undefined),
      fetchTemplatesByExamination: vi.fn().mockResolvedValue([])
    },
    knowledgeBaseGraphApi: {
      fetchExaminationReportingContext: vi.fn()
    },
    terminologyStore: {
      activeBundle: {
        moduleName: 'report_template_examples',
        version: '1.0.0'
      } as { moduleName: string; version: string } | null,
      activeModuleName: 'report_template_examples',
      activeBundleKey: 'report_template_examples@@1.0.0'
    },
    examinationStore: {
      exams: [{ id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' }],
      examinationsDropdown: [{ id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' }],
      fetchExaminations: vi.fn().mockResolvedValue(undefined)
    }
  }
})

vi.mock('vue-router', () => ({
  RouterLink: {
    template: '<a><slot /></a>'
  },
  useRoute: () => ({
    params: {
      patient_examination_id: '42'
    }
  })
}))

vi.mock('@/composables/useDebug', () => ({
  useDebug: () => ({
    isDebug: hoisted.debugRef.current
  })
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axiosApi,
  dtypesApi: (path: string) => path,
  r: (path: string) => path
}))

vi.mock('@/api/knowledgeBaseGraphApi', () => ({
  fetchExaminationReportingContext: hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext
}))

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/stores/terminologyStore', () => ({
  useTerminologyStore: () => hoisted.terminologyStore
}))

vi.mock('@/stores/patientStore', () => ({
  usePatientStore: () => ({
    patients: [{ id: 7 }],
    getPatientById: (id: number) =>
      id === 7
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
}))

vi.mock('@/stores/examinationStore', () => ({
  useExaminationStore: () => hoisted.examinationStore
}))

vi.mock('@/composables/reporting/useReportTemplates', () => ({
  useReportTemplates: () => ({
    moduleName: ref('report_template_examples'),
    selectedTemplateName: ref('star_upper_gi_main'),
    templateOptions: ref([{ name: 'star_upper_gi_main', examination: 'gastroscopy' }]),
    selectedTemplate: ref({
      name: 'star_upper_gi_main',
      examination: 'gastroscopy',
      identity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        templateVersion: '1',
        templateHash: 'hash-1',
        lifecycleStatus: 'published',
        readiness: null
      },
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
    applyTemplateOptions: hoisted.templateControls.applyTemplateOptions,
    selectTemplateByName: hoisted.templateControls.selectTemplateByName,
    setModuleName: hoisted.templateControls.setModuleName,
    setRequestContext: hoisted.templateControls.setRequestContext
  })
}))

function buildFlowStore() {
  const templateSectionDrafts: Record<string, ReportTemplateSectionDraft> = {
    examination_baseline: {
      note: 'Visible note',
      includePatientData: false,
      includeExaminationData: false
    }
  }
  const flow = reactive({
    patientExaminationId: 42,
    selectedPatientId: 7,
    selectedExaminationId: 9 as number | null,
    selectedKbModule: 'report_template_examples',
    selectedReportLanguage: 'de' as 'de' | 'en',
    selectedTemplateName: 'star_upper_gi_main',
    activeReportId: null as number | null,
    indications: [{ examinationIndicationId: null, indicationChoiceId: null }],
    templateSectionDrafts,
    currentRuntimeDraft: {
      draftId: 'draft_42',
      patientExaminationId: 42,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      templateIdentity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        templateVersion: '1',
        templateHash: 'hash-1',
        lifecycleStatus: 'published',
        readiness: null
      },
      verificationStatus: 'verified' as const,
      hydratedFrom: 'draft_api',
      updatedAt: '2026-03-19T15:00:00.000Z',
      payload: {
        patient: 'patient_7',
        examiners: ['dr_house'],
        examination: 'gastroscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
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
    draftPersistenceStatus: 'saved' as 'idle' | 'saving' | 'saved' | 'error',
    draftPersistenceError: null as string | null,
    lastPersistedDraftAt: '2026-03-19T15:01:00.000Z' as string | null,
    savingFinalReport: false,
    mediaPreload: null as unknown,
    patchLookupSnapshot: vi.fn(),
    setTemplateSelection: vi.fn(),
    setReportLanguage: vi.fn((language: 'de' | 'en') => {
      flow.selectedReportLanguage = language
    }),
    clearTemplateSectionDrafts: vi.fn(),
    setTemplateSectionDraft: vi.fn(
      (sectionName: string, patch: Partial<ReportTemplateSectionDraft>) => {
        flow.templateSectionDrafts[sectionName] = {
          ...flow.templateSectionDrafts[sectionName],
          ...patch
        }
      }
    ),
    updateIndicationRow: vi.fn(),
    addIndicationRow: vi.fn(),
    removeIndicationRow: vi.fn(),
    setActiveReportId: vi.fn((id: number | null) => {
      flow.activeReportId = id
    }),
    setSavingFinalReport: vi.fn((value: boolean) => {
      flow.savingFinalReport = value
    })
  })

  return flow
}

function buildFlowStoreWithMissingRequiredClassification() {
  const flow = buildFlowStore()
  flow.currentRuntimeDraft.payload.patientFindings = [
    {
      localId: 'finding_1',
      finding: 'esophagus_polyp',
      classificationChoices: []
    }
  ]
  return flow
}

function mountPage() {
  return mount(ReportEditorPage, {
    global: {
      stubs: {
        MedicalBlock: {
          template: '<div><slot /></div>'
        },
        ReportArtifactsPanel: true
      }
    }
  })
}

describe('ReportEditorPage draft-driven workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.debugRef.current = false
    hoisted.flowRef.current = buildFlowStore()
    hoisted.terminologyStore.activeBundle = {
      moduleName: 'report_template_examples',
      version: '1.0.0'
    }
    hoisted.terminologyStore.activeModuleName = 'report_template_examples'
    hoisted.terminologyStore.activeBundleKey = 'report_template_examples@@1.0.0'
    hoisted.examinationStore.exams = [{ id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' }]
    hoisted.examinationStore.examinationsDropdown = [
      { id: 9, name: 'gastroscopy', displayName: 'Gastroskopie' }
    ]
    hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext.mockImplementation(
      (_moduleName: string, _version: string, examinationName: string) => ({
        concepts: {
          moduleName: 'report_template_examples',
          examination: [
            {
              name: examinationName,
              nameDe: examinationName === 'colonoscopy' ? 'Koloskopie' : 'Gastroskopie',
              nameEn: examinationName === 'colonoscopy' ? 'Colonoscopy' : 'Gastroscopy',
              tags: []
            }
          ],
          finding: [
            {
              name: 'esophagus_polyp',
              nameDe: 'Ösophaguspolyp',
              nameEn: 'Esophageal polyp',
              tags: []
            }
          ],
          classification: [{ name: 'size_mm', nameDe: 'Größe', nameEn: 'Size', tags: [] }],
          classificationChoice: [
            { name: 'size_mm', nameDe: 'Millimeter', nameEn: 'Millimetres', tags: [] }
          ],
          classificationChoiceDescriptor: [
            {
              name: 'length_mm_descriptor',
              nameDe: 'Größe',
              nameEn: 'Size',
              unit: 'millimeter',
              tags: []
            }
          ],
          unit: [{ name: 'millimeter', abbreviation: 'mm', tags: [] }]
        },
        reportTemplates: []
      })
    )
    hoisted.axiosApi.get.mockImplementation((url: string) => {
      if (url === 'patient-examinations/42/') {
        return Promise.resolve({
          data: {
            id: 42,
            examination: { id: 9, name: 'gastroscopy' },
            patient: { id: 7 },
            knowledge_base_module: 'report_template_examples',
            knowledge_base_version: '1.0.0'
          }
        })
      }
      if (url === 'patient-examination-reports/?patient_examination_id=42') {
        return Promise.resolve({ data: [] })
      }
      if (url === 'examinations/9/') {
        return Promise.resolve({ data: { id: 9, name: 'gastroscopy' } })
      }
      if (url === 'examinations/9/findings/') {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: 'esophagus_polyp',
              name_de: 'Ösophaguspolyp',
              classifications: [
                {
                  id: 2,
                  name: 'size_mm',
                  name_de: 'Größe',
                  classification_types: [],
                  choices: [{ id: 3, name: 'size_mm', name_de: 'Millimeter' }]
                }
              ]
            }
          ]
        })
      }
      return Promise.resolve({ data: [] })
    })
    hoisted.axiosApi.post.mockResolvedValue({
      data: {
        report: { id: 88, status: 'draft', version: 1 },
        created: true,
        warnings: [],
        historyContext: null,
        persistedArtifacts: null
      }
    })
  })

  it('renders live section preview from the current runtime draft and saves draft findings', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Ösophaguspolyp: Größe: Millimeter (Größe: 12 mm)')
    expect(wrapper.find('.report-preview-meta').text()).not.toContain('Bericht-ID')
    expect(wrapper.get('.report-technical-details').attributes('open')).toBeUndefined()
    expect(wrapper.find('textarea').element.value).toBe('Visible note')
    expect(wrapper.text()).toContain('Vollständigkeitsübersicht')
    expect(wrapper.text()).toContain('1 von 1 Abschnitten vollständig')
    expect(wrapper.text()).toContain(
      'Keine fehlenden Pflichtbefunde oder Pflicht-Klassifikationen im aktuellen Entwurf.'
    )

    const buttons = wrapper.findAll('button')
    const draftSaveButton = requireDefined(
      buttons.find((button) => button.text().includes('Entwurf speichern')),
      'the draft-save button'
    )

    await draftSaveButton.trigger('click')
    await flushPromises()

    const saveCall = hoisted.axiosApi.post.mock.calls[0]
    expect(saveCall[0]).toBe('patient-examination-reports/save-submission/')
    const savePayload = saveCall[1]
    expect(savePayload.patientExaminationId).toBe(42)
    expect(savePayload.templateName).toBe('star_upper_gi_main')
    expect(savePayload.knowledgeBaseModule).toBe('report_template_examples')
    expect(savePayload.knowledgeBaseVersion).toBe('1.0.0')
    expect(savePayload.templateVersion).toBe('1')
    expect(savePayload.templateHash).toBe('hash-1')
    expect(savePayload.findings).toEqual([
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
    ])
    expect(savePayload.editorPayload).toMatchObject({ reportLanguage: 'de' })
    expect(savePayload.renderedText).toContain('Ösophaguspolyp: Größe: Millimeter')
  })

  it('renders the active knowledge-base module as read-only context', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const moduleInput = wrapper.find('input[value="report_template_examples"]')
    expect(moduleInput.exists()).toBe(true)
    expect(moduleInput.attributes()).toHaveProperty('readonly')
  })

  it('blocks catalog and template resolution when the patient identity differs from the active bundle', async () => {
    hoisted.terminologyStore.activeBundle = {
      moduleName: 'dgvs_reporting',
      version: '0.1.0'
    }
    hoisted.terminologyStore.activeModuleName = 'dgvs_reporting'
    hoisted.terminologyStore.activeBundleKey = 'dgvs_reporting@@0.1.0'

    const wrapper = mountPage()
    await flushPromises()
  })

  it('resolves a missing examination ID by canonical name before loading colonoscopy lookups', async () => {
    hoisted.flowRef.current.selectedExaminationId = null
    hoisted.flowRef.current.currentRuntimeDraft.payload.examination = 'colonoscopy'
    hoisted.examinationStore.exams = [{ id: 12, name: 'colonoscopy', displayName: 'Koloskopie' }]
    hoisted.examinationStore.examinationsDropdown = [
      { id: 12, name: 'colonoscopy', displayName: 'Koloskopie' }
    ]
    const defaultGet = hoisted.axiosApi.get.getMockImplementation()
    hoisted.axiosApi.get.mockImplementation((url: string) => {
      if (url === 'examinations/12/indications/?patient_examination_id=42') {
        return Promise.resolve({
          data: {
            examination_indications: [{ id: 7, name_de: 'Vorsorge' }],
            indication_choices: [{ id: 88, examination_indication_id: 7, name_de: 'Routine' }]
          }
        })
      }
      return (defaultGet?.(url) as unknown) ?? Promise.resolve({ data: [] })
    })

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Koloskopie')
    expect(hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0',
      'colonoscopy'
    )
    expect(hoisted.axiosApi.get).toHaveBeenCalledWith('examinations/12/findings/', {
      params: {
        module_name: 'report_template_examples',
        module_version: '1.0.0',
        patient_examination_id: 42
      }
    })
    expect(hoisted.axiosApi.get).toHaveBeenCalledWith(
      'examinations/12/indications/?patient_examination_id=42'
    )
    expect(wrapper.getComponent(IndicationsEditor).props('indicationOptions')).toEqual([
      {
        id: 7,
        label: 'Vorsorge',
        choices: [{ id: 88, label: 'Routine' }]
      }
    ])
  })

  it('rejects ambiguous examination-name resolution without loading lookups', async () => {
    hoisted.flowRef.current.selectedExaminationId = null
    hoisted.flowRef.current.currentRuntimeDraft.payload.examination = 'colonoscopy'
    hoisted.examinationStore.exams = [
      { id: 12, name: 'colonoscopy', displayName: 'Koloskopie' },
      { id: 13, name: 'colonoscopy', displayName: 'Koloskopie (legacy)' }
    ]
    hoisted.examinationStore.examinationsDropdown = [
      { id: 12, name: 'colonoscopy', displayName: 'Koloskopie' },
      { id: 13, name: 'colonoscopy', displayName: 'Koloskopie (legacy)' }
    ]

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Die Untersuchung "colonoscopy" ist im Untersuchungskatalog nicht eindeutig.'
    )
    expect(hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext).not.toHaveBeenCalled()
    expect(hoisted.axiosApi.get).not.toHaveBeenCalledWith(
      'examinations/12/indications/?patient_examination_id=42'
    )
  })

  it('renders KnowledgeBase concept labels in the selected report language', async () => {
    hoisted.flowRef.current.selectedReportLanguage = 'en'

    const wrapper = mountPage()
    await flushPromises()

    const expected = 'Esophageal polyp: Size: Millimetres (Size: 12 mm)'
    expect(wrapper.text()).toContain(expected)
    expect(
      (wrapper.get('[data-testid="report-text-editor"]').element as HTMLTextAreaElement).value
    ).toContain(expected)
  })

  it('shows missing required classifications as advisory hints without blocking save', async () => {
    hoisted.flowRef.current = buildFlowStoreWithMissingRequiredClassification()

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('0 von 1 Abschnitten vollständig')
    expect(wrapper.text()).toContain('0 fehlende Pflichtbefunde')
    expect(wrapper.text()).toContain('1 fehlende Pflicht-Klassifikationen')
    expect(wrapper.text()).toContain('Examination Baseline')
    expect(wrapper.text()).toContain('Klassifikationen fehlen: Ösophaguspolyp: Größe')

    const finalSaveButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('Final speichern')),
      'the final-save button'
    )
    expect(finalSaveButton.attributes('disabled')).toBeUndefined()
  })

  it('saves freely edited report text while keeping section notes editable', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const reportTextEditor = wrapper.get('[data-testid="report-text-editor"]')
    await reportTextEditor.setValue('Manuell bearbeiteter deutscher Befundtext.')

    const sectionNote = requireDefined(
      wrapper
        .findAll('textarea')
        .find((textarea) => textarea.attributes('data-testid') !== 'report-text-editor'),
      'the editable section note'
    )
    await sectionNote.setValue('Geänderte Abschnittsnotiz')

    const draftSaveButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('Entwurf speichern')),
      'the draft-save button'
    )
    await draftSaveButton.trigger('click')
    await flushPromises()

    expect(hoisted.flowRef.current.setTemplateSectionDraft).toHaveBeenCalledWith(
      'examination_baseline',
      { note: 'Geänderte Abschnittsnotiz' }
    )
    const manualSaveCall = hoisted.axiosApi.post.mock.calls[0]
    expect(manualSaveCall[0]).toBe('patient-examination-reports/save-submission/')
    expect(manualSaveCall[1].renderedText).toBe('Manuell bearbeiteter deutscher Befundtext.')
    expect(manualSaveCall[1].editorPayload).toMatchObject({ reportTextMode: 'manual' })
  })

  it('shows technical metadata only inside the debug details panel', async () => {
    const hiddenWrapper = mountPage()
    await flushPromises()

    expect(hiddenWrapper.text()).not.toContain('Technische Details')
    expect(hiddenWrapper.text()).not.toContain('Aktive Report-ID')

    hoisted.debugRef.current = true

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Technische Details')
    expect(wrapper.text()).toContain('Aktive Report-ID')
    expect(wrapper.text()).toContain('Entwurfs-Befunde')
    expect(wrapper.text()).toContain('Abschnitts-Entwürfe')
  })

  it('does not commit a late report save into a different examination context', async () => {
    const pendingSave = deferred<{ data: Record<string, unknown> }>()
    hoisted.axiosApi.post.mockReturnValueOnce(pendingSave.promise)
    const wrapper = mountPage()
    await flushPromises()

    const saveButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('Entwurf speichern')),
      'the pending draft-save button'
    )
    await saveButton.trigger('click')
    await Promise.resolve()
    expect(hoisted.axiosApi.post).toHaveBeenCalledTimes(1)

    hoisted.flowRef.current.patientExaminationId = 43
    hoisted.flowRef.current.currentRuntimeDraft = {
      ...hoisted.flowRef.current.currentRuntimeDraft,
      draftId: 'draft_43',
      patientExaminationId: 43
    }
    await flushPromises()
    pendingSave.resolve({
      data: {
        report: { id: 99, status: 'draft', version: 1 },
        created: true,
        warnings: [],
        historyContext: null,
        persistedArtifacts: null
      }
    })
    await flushPromises()

    expect(hoisted.flowRef.current.activeReportId).toBeNull()
    expect(wrapper.text()).not.toContain('Bericht wurde erstellt (ID 99')
  })

  it('does not apply a late manual report refresh to a different examination', async () => {
    const wrapper = mountPage()
    await flushPromises()
    const pendingReport = deferred<{ data: unknown[] }>()
    hoisted.axiosApi.get.mockImplementation((url: string) => {
      if (url === 'patient-examination-reports/?patient_examination_id=42') {
        return pendingReport.promise
      }
      return Promise.resolve({ data: [] })
    })

    const refreshButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('Letzten Bericht laden')),
      'the report-refresh button'
    )
    await refreshButton.trigger('click')
    await Promise.resolve()

    hoisted.flowRef.current.patientExaminationId = 43
    hoisted.flowRef.current.currentRuntimeDraft = {
      ...hoisted.flowRef.current.currentRuntimeDraft,
      draftId: 'draft_43',
      patientExaminationId: 43
    }
    await flushPromises()
    pendingReport.resolve({
      data: [{ id: 99, status: 'draft', version: 1, templateName: 'late_template' }]
    })
    await flushPromises()

    expect(hoisted.flowRef.current.activeReportId).toBeNull()
    expect(hoisted.templateControls.selectTemplateByName).not.toHaveBeenCalledWith('late_template')
  })
})
