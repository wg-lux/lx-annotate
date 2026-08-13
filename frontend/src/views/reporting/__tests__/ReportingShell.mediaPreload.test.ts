import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, inject, reactive, ref, type Component, type Ref } from 'vue'

import ReportingShell from '../ReportingShell.vue'
import ReportImportPanel from '@/components/Reporting/ReportImportPanel.vue'
import type { TerminologyBundleVersion } from '@/api/terminologyApi'
import type { PatientCase } from '@/api/casesApi'
import type { TimelineLatestPayload } from '@/api/reportingTimelineApi'
import type { ReportingRuntimeDraft } from '@/stores/reportingFlowStore'
import type { UseAuthenticatedVideoStreamOptions } from '@/composables/useAuthenticatedVideoStream'
import type { StreamableVideoFileType } from '@/utils/mediaUrls'
import { reportTemplateLifecycleContextKey } from '../reportTemplateLifecycleContext'
type UseAuthenticatedVideoStream =
  typeof import('@/composables/useAuthenticatedVideoStream').useAuthenticatedVideoStream

function requireDefined<T>(value: T | undefined, description: string): T {
  if (value === undefined) throw new Error(`Expected ${description}.`)
  return value
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
      get: vi.fn<(url: string, ...args: unknown[]) => unknown>()
    },
    findingsApi: {
      getExaminationFindings: vi.fn()
    },
    reportTemplatesApi: {
      fetchReportTemplatesByExamination: vi.fn(),
      fetchReportTemplateByName: vi.fn(),
      buildReportTemplateRuntimePayload: vi.fn()
    },
    reportDraftApi: {
      fetchPatientExaminationDraft: vi.fn()
    },
    reportingLanguagesApi: {
      fetchReportingLanguages: vi.fn()
    },
    terminologyStore: {
      bundles: [] as TerminologyBundleVersion[],
      activeBundle: null as TerminologyBundleVersion | null,
      loading: false,
      selecting: false,
      error: null as string | null,
      selectedMedicalField: 'gastroenterology',
      lastSelectionCounts: null as Record<string, number> | null,
      activeModuleName: 'report_template_examples',
      activeBundleKey: '',
      activeBundleLabel: 'Standard-Terminologie',
      filteredBundles: [] as TerminologyBundleVersion[],
      medicalFieldLabel: 'Gastroenterologie',
      medicalFieldOptions: [{ value: 'gastroenterology', label: 'Gastroenterologie' }],
      bundleKey: vi.fn(
        (bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>) =>
          `${bundle.moduleName}@@${bundle.version}`
      ),
      findBundleByKey: vi.fn(),
      importBundle: vi.fn(),
      importBundles: vi.fn(),
      importBundleFolder: vi.fn(),
      importBundleFolders: vi.fn(),
      loadBundles: vi.fn(),
      selectBundle: vi.fn(),
      setMedicalField: vi.fn()
    },
    timelineApi: {
      fetchPatientTimelineLatest: vi.fn(),
      pickPreferredStream: vi.fn((options: Array<{ type: string; url: string }>) => {
        return options.find((option) => option.type === 'processed')?.url ?? null
      })
    },
    useAuthenticatedVideoStream: vi.fn<UseAuthenticatedVideoStream>()
  }
})

vi.mock('@/stores/reportingFlowStore', () => ({
  isVerifiedRuntimeDraftForBundle: (
    draft: ReportingRuntimeDraft | null,
    bundle: TerminologyBundleVersion | null,
    patientExaminationId?: number | null
  ) => {
    if (!draft || !bundle || draft.verificationStatus !== 'verified' || !draft.templateName) {
      return false
    }
    if (patientExaminationId && draft.patientExaminationId !== patientExaminationId) return false
    const moduleName =
      draft.templateIdentity?.moduleName || draft.payload.knowledgeBaseModule || draft.moduleName
    const version =
      draft.templateIdentity?.knowledgeBaseVersion || draft.payload.knowledgeBaseVersion || null
    return moduleName === bundle.moduleName && version === bundle.version
  },
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/stores/terminologyStore', async () => {
  const { reactive: makeReactive } = await vi.importActual<typeof import('vue')>('vue')
  const terminologyStore = makeReactive(hoisted.terminologyStore)
  return {
    terminologyBatchImportMessage: (result: { imported: unknown[]; failures: unknown[] }) =>
      `${String(result.imported.length)} Pakete installiert`,
    useTerminologyStore: () => terminologyStore
  }
})

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return {
    ...actual,
    useRoute: () => hoisted.routeRef.current,
    useRouter: () => hoisted.routerRef.current
  }
})

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.axiosApi.get
  },
  r: (value: string) => value
}))

vi.mock('@/api/findingsApi', () => ({
  findingsApi: {
    getExaminationFindings: hoisted.findingsApi.getExaminationFindings
  }
}))

vi.mock('@/api/reportTemplatesApi', () => ({
  fetchReportTemplatesByExamination: hoisted.reportTemplatesApi.fetchReportTemplatesByExamination,
  fetchReportTemplateByName: hoisted.reportTemplatesApi.fetchReportTemplateByName,
  buildReportTemplateRuntimePayload: hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload,
  describeReportTemplateTitle: (name: string) => name,
  getReportTemplateDisplayName: (template: { name: string; nameDe?: string }, language: string) =>
    (language === 'de' && template.nameDe) || template.name
}))

vi.mock('@/api/reportDraftApi', () => ({
  fetchPatientExaminationDraft: hoisted.reportDraftApi.fetchPatientExaminationDraft
}))

vi.mock('@/api/reportingLanguagesApi', () => ({
  fetchReportingLanguages: hoisted.reportingLanguagesApi.fetchReportingLanguages
}))

vi.mock('@/api/reportingTimelineApi', () => ({
  fetchPatientTimelineLatest: hoisted.timelineApi.fetchPatientTimelineLatest,
  pickPreferredStream: hoisted.timelineApi.pickPreferredStream
}))

vi.mock('@/composables/useAuthenticatedVideoStream', () => ({
  useAuthenticatedVideoStream: hoisted.useAuthenticatedVideoStream
}))

function buildFlowStore() {
  type CaseContext = {
    caseId: string | null
    selectedPatientId?: number | null
  }
  type PatientExaminationContext = {
    patientExaminationId: number | null
    selectedPatientId?: number | null
    selectedExaminationId?: number | null
  }
  type TemplateSelection = {
    moduleName?: string
    templateName?: string | null
    templateIdentity?: unknown
  }

  const flow = reactive({
    sessionStatus: 'active',
    lookupToken: 'tok',
    caseId: 'case-uuid-314' as string | null,
    patientExaminationId: 314 as number | null,
    selectedPatientId: 42 as number | null,
    selectedExaminationId: 9 as number | null,
    selectedKbModule: 'report_template_examples',
    selectedReportLanguage: 'de' as 'de' | 'en',
    selectedTemplateName: null as string | null,
    currentRuntimeDraft: null as ReportingRuntimeDraft | null,
    runtimeDraftsByPatientExaminationId: {} as Record<string, ReportingRuntimeDraft>,
    mediaPreload: null as TimelineLatestPayload | null,
    mediaPreloadStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    mediaPreloadError: null as string | null,
    draftPersistenceStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error',
    draftPersistenceError: null as string | null,
    lastPersistedDraftAt: null as string | null,
    hasUnpersistedDraftChanges: false,
    setCaseSelection: vi.fn(),
    setCaseContext: vi.fn((payload: CaseContext) => {
      flow.caseId = payload.caseId
      if (payload.selectedPatientId !== undefined)
        flow.selectedPatientId = payload.selectedPatientId
    }),
    setPatientExaminationContext: vi.fn((payload: PatientExaminationContext) => {
      flow.patientExaminationId = payload.patientExaminationId
      if (payload.selectedPatientId !== undefined)
        flow.selectedPatientId = payload.selectedPatientId
      if (payload.selectedExaminationId !== undefined)
        flow.selectedExaminationId = payload.selectedExaminationId
    }),
    setTemplateSelection: vi.fn((payload: TemplateSelection) => {
      if (payload.moduleName !== undefined) flow.selectedKbModule = payload.moduleName
      if (payload.templateName !== undefined) flow.selectedTemplateName = payload.templateName
    }),
    setReportLanguage: vi.fn((language: 'de' | 'en') => {
      flow.selectedReportLanguage = language
    }),
    setIndications: vi.fn(),
    clearRuntimeDraft: vi.fn(() => {
      flow.currentRuntimeDraft = null
      delete flow.runtimeDraftsByPatientExaminationId['314']
    }),
    clearTemplateSectionDrafts: vi.fn(),
    flushDraftAutosave: vi.fn().mockResolvedValue(undefined),
    setLastTemplateValidation: vi.fn(),
    setRuntimeDraft: vi.fn((payload: ReportingRuntimeDraft) => {
      flow.currentRuntimeDraft = payload
      flow.runtimeDraftsByPatientExaminationId[String(payload.patientExaminationId)] = payload
    }),
    markDraftPersistenceHydrated: vi.fn((updatedAt: string | null) => {
      flow.lastPersistedDraftAt = updatedAt
      flow.draftPersistenceStatus = updatedAt ? 'saved' : 'idle'
      flow.draftPersistenceError = null
    }),
    setMediaPreloadLoading: vi.fn(() => {
      flow.mediaPreloadStatus = 'loading'
      flow.mediaPreloadError = null
    }),
    setMediaPreload: vi.fn((payload: TimelineLatestPayload | null) => {
      flow.mediaPreload = payload
      flow.mediaPreloadStatus = 'ready'
      flow.mediaPreloadError = null
    }),
    setMediaPreloadError: vi.fn((message: string) => {
      flow.mediaPreloadStatus = 'error'
      flow.mediaPreloadError = message
    }),
    clearMediaPreload: vi.fn(() => {
      flow.mediaPreload = null
      flow.mediaPreloadStatus = 'idle'
      flow.mediaPreloadError = null
    })
  })

  return flow
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

const mountedShells: Array<ReturnType<typeof mount>> = []

function mountShell(routerViewStub: Component | boolean = true) {
  const wrapper = mount(ReportingShell, {
    global: {
      stubs: {
        RouterLink: true,
        RouterView: routerViewStub
      }
    }
  })
  mountedShells.push(wrapper)
  return wrapper
}

function hasMutableArtifactKind(
  options: UseAuthenticatedVideoStreamOptions
): options is UseAuthenticatedVideoStreamOptions & {
  artifactKind: Ref<StreamableVideoFileType>
} {
  return typeof options.artifactKind === 'object' && 'value' in options.artifactKind
}

describe('ReportingShell media preload', () => {
  afterEach(() => {
    for (const wrapper of mountedShells.splice(0)) wrapper.unmount()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.routeRef.current = reactive({
      path: '/reporting/314/findings',
      params: { patient_examination_id: '314' }
    })
    hoisted.useAuthenticatedVideoStream.mockReturnValue({
      playbackError: ref(null),
      playbackSourceUrl: ref(''),
      playbackMode: ref('idle'),
      isHlsPlayback: computed(() => false)
    })
    hoisted.terminologyStore.activeBundle = {
      moduleName: 'report_template_examples',
      version: '1.0.0',
      medicalField: 'gastroenterology',
      isActive: true
    }
    hoisted.terminologyStore.activeModuleName = 'report_template_examples'
    hoisted.terminologyStore.activeBundleKey = 'report_template_examples@@1.0.0'
    hoisted.terminologyStore.selectedMedicalField = 'gastroenterology'
    hoisted.terminologyStore.loadBundles.mockResolvedValue(undefined)
    hoisted.flowRef.current = reactive(buildFlowStore())
    hoisted.reportingLanguagesApi.fetchReportingLanguages.mockResolvedValue({
      defaultLanguage: 'de',
      languages: [
        { code: 'de', label: 'Deutsch' },
        { code: 'en', label: 'English' }
      ]
    })
    hoisted.findingsApi.getExaminationFindings.mockResolvedValue([])
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'default_template',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          templateVersion: null,
          templateHash: null,
          lifecycleStatus: 'published',
          readiness: null
        }
      }
    ])
    hoisted.reportTemplatesApi.fetchReportTemplateByName.mockResolvedValue({
      name: 'default_template',
      examination: 'colonoscopy',
      reportSections: [],
      validators: {
        findingsValidators: [],
        examinationValidators: []
      }
    })
    hoisted.reportDraftApi.fetchPatientExaminationDraft.mockResolvedValue({
      patient_examination_id: 314,
      draft: {},
      updated_at: null
    })
    hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload.mockResolvedValue({
      patient: 'patient_42',
      examiners: [],
      examination: 'colonoscopy',
      knowledgeBaseModule: 'report_template_examples',
      knowledgeBaseVersion: null,
      patientFindings: []
    })
    hoisted.axiosApi.get.mockImplementation((url: string) => {
      if (url === 'cases/') {
        const caseResponse: PatientCase = {
          id: 5,
          caseId: 'case-uuid-314',
          patient: 42,
          admissionDate: '2026-03-10T08:00:00Z',
          leaveDate: null,
          isActive: true,
          isClosed: false,
          isDeleted: false,
          patientExaminations: [
            {
              id: 314,
              examination: { id: 9, name: 'colonoscopy', nameDe: 'Koloskopie' },
              patientData: { id: 42 },
              dateStart: '2026-03-10'
            },
            {
              id: 315,
              examination: { id: 10, name: 'gastroscopy', nameDe: 'Gastroskopie' },
              patientData: { id: 42 },
              dateStart: '2026-03-11'
            }
          ],
          documents: [],
          patientMedications: [],
          patientMedicationSchedules: [],
          patientLabSamples: [],
          patientLabValues: []
        }
        return Promise.resolve({
          data: [caseResponse]
        })
      }
      if (url === 'patient-examinations/314/') {
        return Promise.resolve({
          data: {
            id: 314,
            examination: { id: 9, name: 'colonoscopy' },
            patient: { id: 42 },
            date_start: '2026-03-10',
            examiners: [
              { username: 'dr_house' },
              { first_name: 'Lisa', last_name: 'Cuddy' },
              'dr_wilson'
            ]
          }
        })
      }

      if (url === 'patient-examinations/list/') {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 314,
                examination: { id: 9, name: 'colonoscopy', name_de: 'Koloskopie' },
                patient: { id: 42 },
                date_start: '2026-03-10'
              },
              {
                id: 315,
                examination: { id: 10, name: 'gastroscopy', name_de: 'Gastroskopie' },
                patient: { id: 42 },
                date_start: '2026-03-11'
              }
            ]
          }
        })
      }

      return Promise.resolve({ data: { results: [] } })
    })
  })

  it('loads timeline latest payload on mount/watch with expected params', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })

    mountShell()
    await flushPromises()

    expect(hoisted.timelineApi.fetchPatientTimelineLatest).toHaveBeenCalledWith({
      patientId: 42,
      patientExaminationId: 314
    })
    expect(hoisted.flowRef.current.setMediaPreload).toHaveBeenCalled()
  })

  it('maps 404 timeline errors to actionable UI message', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockRejectedValue({
      response: { status: 404, data: { detail: 'not found' } }
    })

    mountShell()
    await flushPromises()

    expect(hoisted.flowRef.current.setMediaPreloadError).toHaveBeenCalledWith(
      expect.stringContaining('404')
    )
  })

  it('shows patient examination options and navigates on selection', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })

    const wrapper = mountShell()
    await flushPromises()

    const select = wrapper.get('[data-testid="patient-examination-select"]')
    const optionTexts = select.findAll('option').map((option) => option.text())

    expect(optionTexts).toContain('Koloskopie · 10.3.2026')
    expect(optionTexts).toContain('Gastroskopie · 11.3.2026')
    expect(optionTexts.join(' ')).not.toContain('#314')

    const caseOptionTexts = wrapper
      .get('[data-testid="case-select"]')
      .findAll('option')
      .map((option) => option.text())
    expect(caseOptionTexts.join(' ')).not.toContain('case-uuid-314')

    const primaryContext = wrapper.get('[data-testid="primary-context-summary"]')
    expect(primaryContext.text()).not.toContain('Fall-ID')
    expect(wrapper.get('[data-testid="context-details"]').attributes('open')).toBeUndefined()

    await select.setValue('315')
    await flushPromises()

    expect(hoisted.flowRef.current.setPatientExaminationContext).toHaveBeenCalledWith({
      patientExaminationId: 315,
      selectedPatientId: 42,
      selectedExaminationId: 10
    })
    expect(hoisted.routerRef.current.push).toHaveBeenCalledWith('/reporting/315/findings')
  })

  it('discards a late bootstrap response after a rapid examination switch', async () => {
    const delayedFirstDetail = deferred<{ data: Record<string, unknown> }>()
    const defaultGet = hoisted.axiosApi.get.getMockImplementation()
    hoisted.axiosApi.get.mockImplementation((url: string, ...args: unknown[]) => {
      if (url === 'patient-examinations/314/') return delayedFirstDetail.promise
      if (url === 'patient-examinations/315/') {
        return Promise.resolve({
          data: {
            id: 315,
            examination: { id: 10, name: 'gastroscopy' },
            patient: { id: 42 },
            date_start: '2026-03-11'
          }
        })
      }
      return defaultGet?.(url, ...args)
    })
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.flowRef.current.selectedTemplateName = 'default_template'

    mountShell()
    await vi.waitFor(() => {
      expect(hoisted.axiosApi.get).toHaveBeenCalledWith('patient-examinations/314/')
    })

    hoisted.routeRef.current.path = '/reporting/315/findings'
    hoisted.routeRef.current.params.patient_examination_id = '315'
    await flushPromises()
    delayedFirstDetail.resolve({
      data: {
        id: 314,
        examination: { id: 9, name: 'colonoscopy' },
        patient: { id: 99 },
        date_start: '2026-03-10'
      }
    })
    await flushPromises()

    const verifiedDraftCalls = hoisted.flowRef.current.setRuntimeDraft.mock.calls
      .map(([draft]) => draft)
      .filter((draft) => draft.verificationStatus === 'verified')
    expect(verifiedDraftCalls.some((draft) => draft.patientExaminationId === 315)).toBe(true)
    expect(verifiedDraftCalls.some((draft) => draft.patientExaminationId === 314)).toBe(false)
    expect(hoisted.flowRef.current.patientExaminationId).toBe(315)
  })

  it('flushes the current draft before switching examinations', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.flowRef.current.hasUnpersistedDraftChanges = true
    const wrapper = mountShell()
    await flushPromises()
    const flushCountBeforeSwitch = hoisted.flowRef.current.flushDraftAutosave.mock.calls.length
    hoisted.flowRef.current.setPatientExaminationContext.mockClear()

    await wrapper.get('[data-testid="patient-examination-select"]').setValue('315')
    await flushPromises()

    expect(hoisted.flowRef.current.flushDraftAutosave).toHaveBeenCalledTimes(
      flushCountBeforeSwitch + 1
    )
    expect(hoisted.flowRef.current.setPatientExaminationContext).toHaveBeenCalledWith({
      patientExaminationId: 315,
      selectedPatientId: 42,
      selectedExaminationId: 10
    })
    expect(hoisted.flowRef.current.flushDraftAutosave.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.flowRef.current.setPatientExaminationContext.mock.invocationCallOrder[0]
    )
  })

  it('keeps the current examination when its draft cannot be saved', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.flowRef.current.hasUnpersistedDraftChanges = true
    hoisted.flowRef.current.flushDraftAutosave
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('save unavailable'))
    const wrapper = mountShell()
    await flushPromises()
    hoisted.flowRef.current.setPatientExaminationContext.mockClear()
    hoisted.routerRef.current.push.mockClear()

    await wrapper.get('[data-testid="patient-examination-select"]').setValue('315')
    await flushPromises()

    expect(hoisted.flowRef.current.patientExaminationId).toBe(314)
    expect(hoisted.flowRef.current.setPatientExaminationContext).not.toHaveBeenCalled()
    expect(hoisted.routerRef.current.push).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Die Untersuchung wurde nicht gewechselt')
  })

  it('bootstraps a local runtime draft from patient examination context on route entry', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).toHaveBeenCalledWith(
      'report_template_examples',
      'colonoscopy'
    )
    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).not.toHaveBeenCalled()
    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        patientExaminationId: 314,
        moduleName: 'report_template_examples',
        templateName: null,
        verificationStatus: 'unverified'
      })
    )
    const templateSelect = wrapper.get('[data-testid="report-template-select"]')
    expect(
      templateSelect
        .findAll('option')
        .map((option) => option.text())
        .some((label) => label.includes('default_template'))
    ).toBe(true)
  })

  it('does not request report templates without an active terminology bundle', async () => {
    hoisted.terminologyStore.activeBundle = null
    hoisted.terminologyStore.activeModuleName = 'report_template_examples'
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.terminologyStore.loadBundles).toHaveBeenCalled()
    expect(hoisted.flowRef.current.setTemplateSelection).toHaveBeenCalledWith({
      moduleName: '',
      templateName: null,
      templateIdentity: null
    })
    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).not.toHaveBeenCalled()
    expect(hoisted.reportTemplatesApi.fetchReportTemplateByName).not.toHaveBeenCalled()
    expect(hoisted.reportDraftApi.fetchPatientExaminationDraft).toHaveBeenCalledWith(314)
    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        patientExaminationId: 314,
        moduleName: '',
        templateName: null,
        verificationStatus: 'unverified'
      })
    )
    expect(wrapper.text()).toContain('Keine aktive Terminologie')
  })

  it('recovers template loading immediately after a successful terminology import', async () => {
    hoisted.terminologyStore.activeBundle = null
    hoisted.terminologyStore.activeModuleName = ''
    hoisted.terminologyStore.activeBundleKey = ''
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.terminologyStore.importBundleFolders.mockImplementation(function (
      this: typeof hoisted.terminologyStore
    ) {
      const imported = {
        moduleName: 'colonoscopy_reporting',
        version: '2.0.0',
        medicalField: 'gastroenterology' as const,
        isActive: true
      }
      this.activeBundle = imported
      this.activeModuleName = imported.moduleName
      this.activeBundleKey = `${imported.moduleName}@@${imported.version}`
      return Promise.resolve({ imported: [imported], failures: [] })
    })
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'colonoscopy_published',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'colonoscopy_reporting',
          knowledgeBaseVersion: '2.0.0',
          templateVersion: '1',
          templateHash: 'hash-1',
          lifecycleStatus: 'published',
          readiness: null
        }
      }
    ])

    const wrapper = mountShell()
    await flushPromises()
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockClear()
    const folderInput = wrapper.get('input[webkitdirectory]')
    Object.defineProperty(folderInput.element, 'files', {
      value: [new File(['name: colonoscopy_reporting'], 'config.yaml')],
      configurable: true
    })

    await folderInput.trigger('change')
    await flushPromises()

    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).toHaveBeenCalledWith(
      'colonoscopy_reporting',
      'colonoscopy'
    )
    expect(wrapper.get('[data-testid="report-template-select"]').text()).toContain(
      'colonoscopy_published'
    )
  })

  it('refreshes published templates when the nested builder changes lifecycle state', async () => {
    const LifecycleChild = defineComponent({
      setup() {
        const lifecycleContext = inject(reportTemplateLifecycleContextKey)
        if (!lifecycleContext) throw new Error('Missing report-template lifecycle context.')
        return {
          activeExaminationName: lifecycleContext.activeExaminationName,
          notifyPublished: () =>
            lifecycleContext.notifyLifecycleChanged({
              moduleName: 'report_template_examples',
              templateName: 'newly_published',
              examination: 'colonoscopy',
              lifecycleStatus: 'published'
            })
        }
      },
      template:
        '<div><span data-testid="active-examination">{{ activeExaminationName }}</span><button data-testid="notify-published" @click="notifyPublished">publish</button></div>'
    })

    const wrapper = mountShell(LifecycleChild)
    await flushPromises()
    expect(wrapper.get('[data-testid="active-examination"]').text()).toBe('colonoscopy')
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockClear()
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValueOnce([
      {
        name: 'newly_published',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          lifecycleStatus: 'published'
        }
      }
    ])

    await wrapper.get('[data-testid="notify-published"]').trigger('click')
    await flushPromises()

    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).toHaveBeenCalledWith(
      'report_template_examples',
      'colonoscopy'
    )
    expect(wrapper.get('[data-testid="report-template-select"]').text()).toContain(
      'newly_published'
    )
  })

  it('keeps a draft from another knowledge base unverified and inactive', async () => {
    hoisted.terminologyStore.activeBundle = {
      moduleName: 'colonoscopy_reporting',
      version: '2.0.0',
      medicalField: 'gastroenterology',
      isActive: true
    }
    hoisted.terminologyStore.activeModuleName = 'colonoscopy_reporting'
    hoisted.terminologyStore.activeBundleKey = 'colonoscopy_reporting@@2.0.0'
    const staleDraft: ReportingRuntimeDraft = {
      draftId: 'draft_314',
      patientExaminationId: 314,
      moduleName: 'report_template_examples',
      templateName: 'same_name',
      templateIdentity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        templateVersion: '1',
        templateHash: null,
        lifecycleStatus: 'published',
        readiness: null
      },
      hydratedFrom: 'session_storage',
      updatedAt: '2026-03-19T12:00:00.000Z',
      payload: {
        patient: 'patient_42',
        examiners: [],
        examination: 'colonoscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        patientFindings: []
      }
    }
    hoisted.flowRef.current.currentRuntimeDraft = staleDraft
    hoisted.flowRef.current.runtimeDraftsByPatientExaminationId = { '314': staleDraft }
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'same_name',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'colonoscopy_reporting',
          knowledgeBaseVersion: '2.0.0',
          templateVersion: '1',
          templateHash: null,
          lifecycleStatus: 'published',
          readiness: null
        }
      }
    ])

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: 'report_template_examples',
        verificationStatus: 'unverified'
      })
    )
    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('keiner aktuell veröffentlichten und kompatiblen')
  })

  it('leaves template loading retryable after a template endpoint error', async () => {
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockRejectedValue({
      response: { status: 409, data: { detail: 'active bundle changed' } }
    })

    const wrapper = mountShell()
    await flushPromises()

    const templateSelect = wrapper.get('[data-testid="report-template-select"]')
    expect(templateSelect.text()).not.toContain('Vorlagen werden geladen')
    expect(wrapper.text()).toContain('active bundle changed')
  })

  it('reuses an existing local runtime draft instead of rebuilding it', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.flowRef.current.currentRuntimeDraft = {
      draftId: 'draft_314',
      patientExaminationId: 314,
      moduleName: 'report_template_examples',
      templateName: 'restored_template',
      templateIdentity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        templateVersion: null,
        templateHash: null,
        lifecycleStatus: 'published',
        readiness: null
      },
      hydratedFrom: 'session_storage',
      updatedAt: '2026-03-19T12:00:00.000Z',
      payload: {
        patient: 'patient_42',
        examiners: [],
        examination: 'colonoscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        patientFindings: []
      }
    }
    hoisted.flowRef.current.runtimeDraftsByPatientExaminationId = {
      '314': hoisted.flowRef.current.currentRuntimeDraft
    }
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'restored_template',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          templateVersion: null,
          templateHash: null,
          lifecycleStatus: 'published',
          readiness: null
        }
      }
    ])

    mountShell()
    await flushPromises()

    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).not.toHaveBeenCalled()
    expect(hoisted.flowRef.current.setTemplateSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: 'report_template_examples',
        templateName: 'restored_template'
      })
    )
  })

  it('keeps descriptor-backed medication rules open until a dose is entered', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'medication_template',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          templateVersion: null,
          templateHash: null,
          lifecycleStatus: 'published',
          readiness: null
        }
      }
    ])
    hoisted.reportTemplatesApi.fetchReportTemplateByName.mockResolvedValue({
      name: 'medication_template',
      examination: 'colonoscopy',
      reportSections: [
        {
          name: 'indikation_und_sedierung',
          position: 1,
          sectionKind: 'findings',
          fields: [],
          types: ['baseline'],
          findings: [
            {
              finding: 'endoscopy_medication_administration',
              required: false,
              multipleAllowed: true,
              classifications: [
                {
                  classification: 'endoscopy_medication_product_and_dose',
                  required: true,
                  input: {
                    choices: [
                      {
                        name: 'medication_propofol',
                        descriptors: [
                          {
                            name: 'propofol_dose_mg_value',
                            type: 'numeric',
                            unit: 'milligram',
                            unitAbbreviation: 'mg',
                            numericMin: 0,
                            numericMax: 2000
                          }
                        ]
                      }
                    ]
                  }
                },
                {
                  classification: 'medication_administration_time',
                  required: true,
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
          ]
        }
      ],
      validators: {
        findingsValidators: [],
        examinationValidators: []
      }
    })
    const draft: ReportingRuntimeDraft = {
      draftId: 'draft_314',
      patientExaminationId: 314,
      moduleName: 'report_template_examples',
      templateName: 'medication_template',
      templateIdentity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        templateVersion: null,
        templateHash: null,
        lifecycleStatus: 'published',
        readiness: null
      },
      hydratedFrom: 'session_storage',
      updatedAt: '2026-03-19T12:00:00.000Z',
      payload: {
        patient: 'patient_42',
        examiners: [],
        examination: 'colonoscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        patientFindings: [
          {
            finding: 'endoscopy_medication_administration',
            classificationChoices: [
              {
                classification: 'endoscopy_medication_product_and_dose',
                classificationChoice: 'medication_propofol',
                descriptors: []
              },
              {
                classification: 'medication_administration_time',
                classificationChoice: 'medication_administration_time_recorded',
                descriptors: []
              }
            ]
          }
        ]
      }
    }
    hoisted.flowRef.current.currentRuntimeDraft = draft
    hoisted.flowRef.current.runtimeDraftsByPatientExaminationId = { '314': draft }
    hoisted.flowRef.current.selectedTemplateName = 'medication_template'

    const wrapper = mountShell()
    await flushPromises()

    const statusRows = wrapper.findAll('.finding-status-row')
    expect(statusRows).toHaveLength(1)
    expect(statusRows[0].classes()).toContain('is-warning')

    hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings[0].classificationChoices[0].descriptors.push(
      {
        classificationChoiceDescriptor: 'propofol_dose_mg_value',
        descriptorValue: 120
      }
    )
    await wrapper.vm.$nextTick()

    expect(statusRows[0].classes()).toContain('is-warning')

    hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings[0].classificationChoices[1].descriptors.push(
      {
        classificationChoiceDescriptor: 'medication_administration_time_value',
        descriptorValue: '10:30'
      }
    )
    await wrapper.vm.$nextTick()

    expect(statusRows[0].classes()).toContain('is-complete')
  })

  it('restores a persisted backend draft before rebuilding from patient examination detail', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.reportDraftApi.fetchPatientExaminationDraft.mockResolvedValue({
      patient_examination_id: 314,
      draft: {
        module_name: 'report_template_examples',
        template_name: 'persisted_template',
        templateIdentity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          templateVersion: null,
          templateHash: null,
          lifecycleStatus: 'published',
          readiness: null
        },
        payload: {
          patient: 'patient_42',
          examiners: ['dr_house'],
          examination: 'colonoscopy',
          knowledgeBaseModule: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          patientFindings: []
        }
      },
      updated_at: '2026-03-19T13:00:00.000Z'
    })
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'persisted_template',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          templateVersion: null,
          templateHash: null,
          lifecycleStatus: 'published',
          readiness: null
        }
      }
    ])

    mountShell()
    await flushPromises()

    expect(hoisted.reportDraftApi.fetchPatientExaminationDraft).toHaveBeenCalledWith(314)
    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).not.toHaveBeenCalled()
    const restoredDraft = hoisted.flowRef.current.setRuntimeDraft.mock.calls[0][0]
    expect(restoredDraft).toMatchObject({
      patientExaminationId: 314,
      moduleName: 'report_template_examples',
      templateName: 'persisted_template',
      hydratedFrom: 'draft_api'
    })
    expect(restoredDraft.payload).toMatchObject({
      patient: 'patient_42',
      examination: 'colonoscopy'
    })
    expect(hoisted.flowRef.current.markDraftPersistenceHydrated).toHaveBeenCalledWith(
      '2026-03-19T13:00:00.000Z'
    )
  })

  it('does not activate a persisted draft whose template is not published', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    hoisted.reportDraftApi.fetchPatientExaminationDraft.mockResolvedValue({
      patient_examination_id: 314,
      draft: {
        module_name: 'report_template_examples',
        template_name: 'draft_only_template',
        payload: {
          patient: 'patient_42',
          examiners: [],
          examination: 'colonoscopy',
          patientFindings: []
        }
      },
      updated_at: '2026-03-19T13:00:00.000Z'
    })

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.flowRef.current.clearRuntimeDraft).not.toHaveBeenCalled()
    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
      expect.objectContaining({ verificationStatus: 'unverified' })
    )
    expect(wrapper.text()).toContain('gespeicherte Entwurf')
  })

  it('preselects preferred video stream and allows manual stream switching', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: {
        id: 999,
        streamOptions: [
          { type: 'raw', url: '/timeline/video/raw' },
          { type: 'processed', url: '/timeline/video/processed' }
        ]
      },
      latestFrames: []
    })

    const wrapper = mountShell()
    await flushPromises()

    const video = wrapper.find('video')
    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBeUndefined()
    const streamOptions = hoisted.useAuthenticatedVideoStream.mock.calls[0][0]
    if (!hasMutableArtifactKind(streamOptions)) {
      throw new Error('Expected a reactive artifact-kind option.')
    }
    expect(streamOptions.videoId.value).toBe(999)
    expect(streamOptions.artifactKind.value).toBe('processed')

    const rawButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().trim() === 'raw'),
      'the raw-stream button'
    )

    await rawButton.trigger('click')
    await flushPromises()

    expect(streamOptions.artifactKind.value).toBe('raw')
  })

  it('updates video and frame preview URLs after media refresh', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest
      .mockResolvedValueOnce({
        patient: { id: 42 },
        latestReport: null,
        latestVideo: {
          id: 100,
          streamOptions: [
            { type: 'raw', url: '/timeline/video/v1-raw' },
            { type: 'processed', url: '/timeline/video/v1-processed' }
          ]
        },
        latestFrames: [
          {
            videoId: 100,
            frameNumber: 1,
            category: 'fallback',
            streamUrl: '/timeline/frame/v1'
          }
        ]
      })
      .mockResolvedValueOnce({
        patient: { id: 42 },
        latestReport: null,
        latestVideo: {
          id: 101,
          streamOptions: [
            { type: 'raw', url: '/timeline/video/v2-raw' },
            { type: 'processed', url: '/timeline/video/v2-processed' }
          ]
        },
        latestFrames: [
          {
            videoId: 101,
            frameNumber: 2,
            category: 'fallback',
            streamUrl: '/timeline/frame/v2'
          }
        ]
      })

    const wrapper = mountShell()
    await flushPromises()

    const streamOptions = hoisted.useAuthenticatedVideoStream.mock.calls[0][0]
    if (!hasMutableArtifactKind(streamOptions)) {
      throw new Error('Expected a reactive artifact-kind option.')
    }
    expect(streamOptions.videoId.value).toBe(100)
    expect(streamOptions.artifactKind.value).toBe('processed')
    const initialFramePreview = wrapper.find('img[alt="Selected frame stream preview"]')
    expect(initialFramePreview.exists()).toBe(true)
    expect(initialFramePreview.attributes('src')).toBe('/timeline/frame/v1')

    const refreshButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('Medien aktualisieren')),
      'the media-refresh button'
    )

    await refreshButton.trigger('click')
    await flushPromises()

    expect(hoisted.timelineApi.fetchPatientTimelineLatest).toHaveBeenLastCalledWith({
      patientId: 42,
      patientExaminationId: 314
    })
    expect(streamOptions.videoId.value).toBe(101)
    expect(streamOptions.artifactKind.value).toBe('processed')
    expect(wrapper.find('img[alt="Selected frame stream preview"]').attributes('src')).toBe(
      '/timeline/frame/v2'
    )
  })

  it('refreshes the selected case media after a report import completes', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    const wrapper = mountShell()
    await flushPromises()
    hoisted.timelineApi.fetchPatientTimelineLatest.mockClear()

    wrapper.getComponent(ReportImportPanel).vm.$emit('completed', 73, {
      status: 'anonymized'
    })
    await flushPromises()

    expect(hoisted.timelineApi.fetchPatientTimelineLatest).toHaveBeenCalledWith({
      patientId: 42,
      patientExaminationId: 314
    })
  })

  it('shows a clear three-step starting guide', async () => {
    const wrapper = mountShell()
    await flushPromises()

    const guide = wrapper.get('[aria-label="Einstieg in den Reporting-Ablauf"]')
    expect(guide.text()).toContain('Hier starten')
    expect(guide.text()).toContain('Fall und Untersuchung wählen')
    expect(guide.text()).toContain('Vorlage festlegen')
    expect(guide.text()).toContain('Befunde erfassen')
  })

  it('loads and applies the report language contract', async () => {
    const wrapper = mountShell()
    await flushPromises()

    const languageSelect = wrapper.get('[data-testid="report-language-select"]')
    expect(languageSelect.findAll('option').map((option) => option.text())).toEqual([
      'Deutsch',
      'English'
    ])

    await languageSelect.setValue('en')

    expect(hoisted.flowRef.current.setReportLanguage).toHaveBeenCalledWith('en')
    expect(hoisted.flowRef.current.selectedReportLanguage).toBe('en')
  })

  it('imports all files selected through the terminology folder picker', async () => {
    hoisted.terminologyStore.importBundleFolders.mockResolvedValue({
      imported: [{ moduleName: 'custom', version: '1' }],
      failures: []
    })
    const wrapper = mountShell()
    await flushPromises()
    const folderInput = wrapper.get('input[webkitdirectory]')
    const files = [new File(['name: custom\nversion: "1"\n'], 'config.yaml')]
    Object.defineProperty(folderInput.element, 'files', { value: files, configurable: true })

    await folderInput.trigger('change')
    await flushPromises()

    expect(hoisted.terminologyStore.importBundleFolders).toHaveBeenCalledWith(files)
    expect(wrapper.text()).toContain('1 Pakete installiert')
  })

  it('saves dirty annotation state before importing terminology folders', async () => {
    hoisted.flowRef.current.hasUnpersistedDraftChanges = true
    hoisted.terminologyStore.importBundleFolders.mockResolvedValue({
      imported: [{ moduleName: 'custom', version: '1' }],
      failures: []
    })
    const wrapper = mountShell()
    await flushPromises()
    const folderInput = wrapper.get('input[webkitdirectory]')
    const files = [new File(['name: custom\nversion: "1"\n'], 'config.yaml')]
    Object.defineProperty(folderInput.element, 'files', { value: files, configurable: true })

    await folderInput.trigger('change')
    await flushPromises()

    expect(hoisted.flowRef.current.flushDraftAutosave).toHaveBeenCalled()
    expect(hoisted.flowRef.current.flushDraftAutosave.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.terminologyStore.importBundleFolders.mock.invocationCallOrder[0]
    )
  })

  it('does not import terminology when dirty annotation state cannot be saved', async () => {
    hoisted.flowRef.current.hasUnpersistedDraftChanges = true
    hoisted.flowRef.current.flushDraftAutosave
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('save unavailable'))
    const wrapper = mountShell()
    await flushPromises()
    const folderInput = wrapper.get('input[webkitdirectory]')
    Object.defineProperty(folderInput.element, 'files', {
      value: [new File(['name: custom'], 'config.yaml')],
      configurable: true
    })

    await folderInput.trigger('change')
    await flushPromises()

    expect(hoisted.terminologyStore.importBundleFolders).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('save unavailable')
  })

  it('keeps the current draft when an explicitly selected template was depublished', async () => {
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValueOnce([
      {
        name: 'replacement_template',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          lifecycleStatus: 'published'
        }
      }
    ])
    const wrapper = mountShell()
    await flushPromises()
    const draftBeforeSwitch = hoisted.flowRef.current.currentRuntimeDraft
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValueOnce([])

    await wrapper.get('[data-testid="report-template-select"]').setValue('replacement_template')
    await flushPromises()

    expect(hoisted.flowRef.current.currentRuntimeDraft).toBe(draftBeforeSwitch)
    expect(wrapper.text()).toContain('veröffentlichte Berichtsvorlage')
  })

  it('imports multiple ZIPs from local or cloud-backed file pickers', async () => {
    hoisted.terminologyStore.importBundles.mockResolvedValue({
      imported: [
        { moduleName: 'custom', version: '1' },
        { moduleName: 'additional', version: '2' }
      ],
      failures: []
    })
    const wrapper = mountShell()
    await flushPromises()
    const zipInput = wrapper.get('input[accept=".zip,application/zip"]')
    const firstZip = new File(['editor export'], 'custom_terminology.zip', {
      type: 'application/zip'
    })
    const secondZip = new File(['editor export'], 'additional_terminology.zip', {
      type: 'application/zip'
    })
    Object.defineProperty(zipInput.element, 'files', {
      value: [firstZip, secondZip],
      configurable: true
    })

    await zipInput.trigger('change')
    await flushPromises()

    expect(hoisted.terminologyStore.importBundles).toHaveBeenCalledWith([firstZip, secondZip])
    expect(wrapper.text()).toContain('2 Pakete installiert')
  })

  it('renders available terminology bundles while keeping fallback state when no active bundle exists', async () => {
    const backendActiveNullBundles: TerminologyBundleVersion[] = [
      {
        moduleName: 'gastro_legacy',
        version: '1.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      {
        moduleName: 'gastro_v2',
        version: '2.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      }
    ]
    hoisted.terminologyStore.activeBundle = null
    hoisted.terminologyStore.activeModuleName = ''
    hoisted.terminologyStore.activeBundleKey = ''
    hoisted.terminologyStore.bundles = backendActiveNullBundles
    hoisted.terminologyStore.filteredBundles = backendActiveNullBundles
    hoisted.terminologyStore.loadBundles.mockResolvedValue(undefined)

    const wrapper = mountShell()
    await flushPromises()

    const bundleSelect = wrapper.get('[data-testid="terminology-bundle-select"]')
    expect((bundleSelect.element as HTMLSelectElement).value).toBe('')
    const bundleOptions = bundleSelect.findAll('option').map((option) => option.text())
    expect(bundleOptions).toContain('gastro_legacy · 1.0.0')
    expect(bundleOptions).toContain('gastro_v2 · 2.0.0')
    expect(wrapper.text()).toContain('Keine aktive Terminologie')
    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).not.toHaveBeenCalled()
  })

  it('uses backend-reported active bundle identity for template context bootstrap', async () => {
    const backendBundle = {
      moduleName: 'gastro_v2',
      version: '2.0.0',
      medicalField: 'gastroenterology' as const,
      isActive: true
    }
    hoisted.terminologyStore.bundles = [
      {
        moduleName: 'gastro_legacy',
        version: '1.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      backendBundle
    ]
    hoisted.terminologyStore.filteredBundles = [
      {
        moduleName: 'gastro_legacy',
        version: '1.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      backendBundle
    ]
    hoisted.terminologyStore.activeBundle = backendBundle
    hoisted.terminologyStore.activeModuleName = backendBundle.moduleName
    hoisted.terminologyStore.activeBundleKey = `${backendBundle.moduleName}@@${backendBundle.version}`
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'colonoscopy_published',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'gastro_v2',
          knowledgeBaseVersion: '2.0.0',
          templateVersion: null,
          templateHash: null,
          lifecycleStatus: 'published',
          readiness: null
        }
      }
    ])

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).toHaveBeenCalledWith(
      'gastro_v2',
      'colonoscopy'
    )
    const bundleSelect = wrapper.get('[data-testid="terminology-bundle-select"]')
    expect((bundleSelect.element as HTMLSelectElement).value).toBe('gastro_v2@@2.0.0')
  })

  it('preserves a user-selected bundle across page reload and keeps it as primary context', async () => {
    const availableBundles: TerminologyBundleVersion[] = [
      {
        moduleName: 'gastro_legacy',
        version: '1.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      {
        moduleName: 'gastro_v2',
        version: '2.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      }
    ]
    hoisted.terminologyStore.bundles = availableBundles
    hoisted.terminologyStore.filteredBundles = availableBundles
    hoisted.terminologyStore.activeBundle = {
      moduleName: 'gastro_legacy',
      version: '1.0.0',
      medicalField: 'gastroenterology',
      isActive: true
    }
    hoisted.terminologyStore.activeModuleName = 'gastro_legacy'
    hoisted.terminologyStore.activeBundleKey = 'gastro_legacy@@1.0.0'
    hoisted.terminologyStore.findBundleByKey.mockImplementation(
      (key: string) =>
        availableBundles.find((bundle) => `${bundle.moduleName}@@${bundle.version}` === key) || null
    )
    hoisted.terminologyStore.selectBundle.mockImplementation((bundle: TerminologyBundleVersion) => {
      hoisted.terminologyStore.activeBundle = {
        moduleName: bundle.moduleName,
        version: bundle.version,
        medicalField: 'gastroenterology',
        isActive: true
      }
      hoisted.terminologyStore.activeModuleName = bundle.moduleName
      hoisted.terminologyStore.activeBundleKey = `${bundle.moduleName}@@${bundle.version}`
      hoisted.terminologyStore.bundles = availableBundles
      return Promise.resolve({ active: hoisted.terminologyStore.activeBundle, counts: {} })
    })

    const initial = mountShell()
    await flushPromises()
    const initialBundleSelect = initial.get('[data-testid="terminology-bundle-select"]')
    await initialBundleSelect.setValue('gastro_v2@@2.0.0')
    await flushPromises()

    expect(hoisted.terminologyStore.selectBundle).toHaveBeenCalledWith(
      expect.objectContaining({ moduleName: 'gastro_v2', version: '2.0.0' })
    )
    expect(hoisted.terminologyStore.activeBundle).toEqual(
      expect.objectContaining({ moduleName: 'gastro_v2', version: '2.0.0' })
    )
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockClear()

    const restored = mountShell()
    await flushPromises()
    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).toHaveBeenCalledWith(
      'gastro_v2',
      'colonoscopy'
    )
    const rehydratedSelect = restored.get('[data-testid="terminology-bundle-select"]')
    expect((rehydratedSelect.element as HTMLSelectElement).value).toBe('gastro_v2@@2.0.0')
  })

  it('keeps the selected active bundle on import conflict errors', async () => {
    const selectedBundle: TerminologyBundleVersion = {
      moduleName: 'gastro_active',
      version: '1.0.0',
      medicalField: 'gastroenterology',
      isActive: true
    }
    hoisted.terminologyStore.activeBundle = selectedBundle
    hoisted.terminologyStore.activeModuleName = selectedBundle.moduleName
    hoisted.terminologyStore.activeBundleKey = 'gastro_active@@1.0.0'
    hoisted.terminologyStore.selectBundle.mockResolvedValue({
      active: selectedBundle,
      counts: {}
    })
    hoisted.terminologyStore.importBundles.mockRejectedValue({
      response: { status: 409, data: { detail: 'Version 1.0.0 already exists.' } }
    })

    const wrapper = mountShell()
    await flushPromises()
    const zipInput = wrapper.get('input[accept=".zip,application/zip"]')
    const conflictingZip = new File(['editor export'], 'v1-terminology.zip', {
      type: 'application/zip'
    })
    Object.defineProperty(zipInput.element, 'files', {
      value: [conflictingZip],
      configurable: true
    })

    await zipInput.trigger('change')
    await flushPromises()

    expect(hoisted.terminologyStore.activeBundle).toEqual(
      expect.objectContaining({ moduleName: 'gastro_active', version: '1.0.0' })
    )
    expect(wrapper.text()).toContain('Version 1.0.0 already exists')
  })

  it('maps import transport and auth errors to explicit user messaging', async () => {
    hoisted.terminologyStore.importBundles.mockRejectedValueOnce({
      message: 'request timed out'
    })
    const wrapper = mountShell()
    await flushPromises()

    const zipInput = wrapper.get('input[accept=".zip,application/zip"]')
    const firstZip = new File(['editor export'], 'timeout.zip', { type: 'application/zip' })
    Object.defineProperty(zipInput.element, 'files', {
      value: [firstZip],
      configurable: true
    })

    await zipInput.trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('request timed out')

    hoisted.terminologyStore.importBundles.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Unauthorized' } }
    })

    const unauthorizedZip = new File(['editor export'], 'unauthorized.zip', {
      type: 'application/zip'
    })
    Object.defineProperty(zipInput.element, 'files', {
      value: [unauthorizedZip],
      configurable: true
    })

    await zipInput.trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain('Unauthorized')
  })

  it('shows explicit not provisioned state and disables dependent actions when no bundles are available', async () => {
    hoisted.terminologyStore.bundles = []
    hoisted.terminologyStore.activeBundle = null
    hoisted.terminologyStore.activeModuleName = ''
    hoisted.terminologyStore.activeBundleKey = ''
    hoisted.terminologyStore.filteredBundles = []

    const wrapper = mountShell()
    await flushPromises()

    const bundleSelect = wrapper.get('[data-testid="terminology-bundle-select"]')
    const templateSelect = wrapper.get('[data-testid="report-template-select"]')
    expect(bundleSelect.attributes('disabled')).toBeDefined()
    expect(templateSelect.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Keine aktive Terminologie')
    expect(wrapper.text()).toContain(
      'Keine aktive Terminologie. Befunde und Medien bleiben verfügbar; Vorlagenprüfung, Finalisierung und templateabhängiger Export werden nach Paketaktivierung ergänzt.'
    )
  })

  it('keeps catalog-based finding rendering isolated to the selected examination context', async () => {
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([])
    hoisted.terminologyStore.filteredBundles = [
      {
        moduleName: 'report_template_examples',
        version: '1.0.0',
        medicalField: 'gastroenterology',
        isActive: true
      }
    ]
    const wrapper = mountShell()
    await flushPromises()

    const contextSensitiveCall = hoisted.findingsApi.getExaminationFindings.mock.calls.some(
      ([id]) => typeof id === 'number' && id > 0
    )
    expect(contextSensitiveCall).toBe(true)

    const bundle = wrapper.get('[data-testid="terminology-bundle-select"]')
    expect((bundle.element as HTMLSelectElement).value).toBe('report_template_examples@@1.0.0')
  })
})
