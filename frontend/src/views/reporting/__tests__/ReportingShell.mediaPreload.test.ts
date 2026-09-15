import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, inject, reactive, ref, type Component, type Ref } from 'vue'

import ReportingShell from '../ReportingShell.vue'
import ReportImportPanel from '@/components/Reporting/ReportImportPanel.vue'
import type { TerminologyBundleVersion } from '@/api/terminologyApi'
import type { PatientCase } from '@/api/casesApi'
import type { TimelineLatestPayload } from '@/api/reportingTimelineApi'
import type { ReportFrameSelection } from '@/utils/frameStreams'
import type { ReportingRuntimeDraft } from '@/stores/reportingFlowStore'
import type { ReportTemplatePayload } from '@/types/reportTemplate'
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
      get: vi.fn<(url: string, ...args: unknown[]) => unknown>(),
      post: vi.fn<(url: string, payload: unknown) => unknown>()
    },
    findingsApi: {
      getExaminationFindings: vi.fn()
    },
    reportTemplatesApi: {
      fetchReportTemplatesByExamination: vi.fn(),
      fetchReportTemplateByName: vi.fn(),
      buildReportTemplateRuntimePayload: vi.fn()
    },
    knowledgeBaseGraphApi: {
      fetchExaminationReportingContext: vi.fn(),
      fetchKnowledgeBaseGraphSnapshot: vi.fn()
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
    useAuthenticatedVideoStream: vi.fn<UseAuthenticatedVideoStream>(),
    runtimeLogger: {
      debug: vi.fn<(event: string, context?: Record<string, unknown>) => void>(),
      info: vi.fn<(event: string, context?: Record<string, unknown>) => void>(),
      warn: vi.fn<(event: string, context?: Record<string, unknown>) => void>(),
      error: vi.fn<(event: string, error?: unknown, context?: Record<string, unknown>) => void>()
    }
  }
})

vi.mock('@/utils/runtimeLogger', () => ({
  createRuntimeLogger: () => hoisted.runtimeLogger
}))

vi.mock('@/stores/reportingFlowStore', () => {
  const isVerifiedTemplateDraft = (draft: ReportingRuntimeDraft): boolean =>
    draft.verificationStatus === 'verified' && Boolean(draft.templateName)
  const matchesPatientExamination = (
    draft: ReportingRuntimeDraft,
    patientExaminationId?: number | null
  ): boolean => !patientExaminationId || draft.patientExaminationId === patientExaminationId
  const draftIdentity = (draft: ReportingRuntimeDraft) => ({
    moduleName:
      draft.templateIdentity?.moduleName || draft.payload.knowledgeBaseModule || draft.moduleName,
    version:
      draft.templateIdentity?.knowledgeBaseVersion || draft.payload.knowledgeBaseVersion || null
  })

  return {
    isVerifiedRuntimeDraftForBundle: (
      draft: ReportingRuntimeDraft | null,
      bundle: TerminologyBundleVersion | null,
      patientExaminationId?: number | null
    ) => {
      if (!draft || !bundle) return false
      if (!isVerifiedTemplateDraft(draft)) return false
      if (!matchesPatientExamination(draft, patientExaminationId)) return false
      const identity = draftIdentity(draft)
      return identity.moduleName === bundle.moduleName && identity.version === bundle.version
    },
    useReportingFlowStore: () => hoisted.flowRef.current
  }
})

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
    get: hoisted.axiosApi.get,
    post: hoisted.axiosApi.post
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
    (language === 'de' && template.nameDe) || template.name,
  getReportTemplateSectionDisplayName: (
    section: { name: string; titleDe?: string; titleEn?: string },
    language: string
  ) => (language === 'de' ? section.titleDe : section.titleEn) || section.name
}))

vi.mock('@/api/knowledgeBaseGraphApi', () => ({
  fetchExaminationReportingContext: hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext,
  fetchKnowledgeBaseGraphSnapshot: hoisted.knowledgeBaseGraphApi.fetchKnowledgeBaseGraphSnapshot
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

  const nullable = <Value>(value: Value): Value | null => value
  const initialCaseId = nullable('case-uuid-314')
  const initialPatientExaminationId = nullable(314)
  const initialPatientId = nullable(42)
  const initialExaminationId = nullable(9)
  const initialDrafts: Partial<Record<string, ReportingRuntimeDraft>> = {}
  const flow = reactive({
    sessionStatus: 'active',
    lookupToken: 'tok',
    caseId: initialCaseId,
    patientExaminationId: initialPatientExaminationId,
    selectedPatientId: initialPatientId,
    selectedExaminationId: initialExaminationId,
    selectedKbModule: 'report_template_examples',
    selectedReportLanguage: 'de',
    selectedReportVerbosity: 'standard',
    selectedTemplateName: null as string | null,
    currentRuntimeDraft: null as ReportingRuntimeDraft | null,
    runtimeDraftsByPatientExaminationId: initialDrafts,
    mediaPreload: null as TimelineLatestPayload | null,
    mediaPreloadStatus: 'idle',
    mediaPreloadError: null as string | null,
    draftPersistenceStatus: 'idle',
    draftPersistenceError: null as string | null,
    lastPersistedDraftAt: null as string | null,
    hasUnpersistedDraftChanges: false,
    setCaseSelection: vi.fn(
      (payload: { selectedPatientId?: number | null; selectedExaminationId?: number | null }) => {
        if (payload.selectedPatientId !== undefined)
          flow.selectedPatientId = payload.selectedPatientId
        if (payload.selectedExaminationId !== undefined)
          flow.selectedExaminationId = payload.selectedExaminationId
      }
    ),
    resetForPatientSwitch: vi.fn(() => {
      flow.caseId = null
      flow.patientExaminationId = null
      flow.selectedExaminationId = null
    }),
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
    applyBackendDraftDocument: vi.fn(),
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
    preferredReportFrame: null as ReportFrameSelection | null,
    selectedReportFrames: null as ReportFrameSelection[] | null,
    addReportFrame: vi.fn((frame: ReportFrameSelection) => {
      flow.selectedReportFrames = [...(flow.selectedReportFrames ?? []), frame]
    }),
    removeReportFrame: vi.fn((frame: ReportFrameSelection) => {
      flow.selectedReportFrames = (flow.selectedReportFrames ?? []).filter((item) => item !== frame)
    }),
    reportFrameSelectionStatus: 'idle',
    setPreferredReportFrame: vi.fn(
      (frame: ReportFrameSelection | null, status: 'idle' | 'loading' | 'ready' | 'error') => {
        flow.preferredReportFrame = frame
        flow.reportFrameSelectionStatus = status
      }
    ),
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

async function openContextPanel(wrapper: ReturnType<typeof mountShell>) {
  const options = wrapper.get('[data-testid="reporting-options"]')
  const detailsElement = options.element as HTMLDetailsElement
  detailsElement.open = true
  const toggle = requireDefined(
    wrapper.findAll('button').find((button) => button.text().includes('Kontext einblenden')),
    'the context-panel toggle'
  )
  await toggle.trigger('click')
  await flushPromises()
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
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:preview')
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext.mockImplementation(
      async (moduleName: string, version: string, examinationName: string) => ({
        reportTemplates: (await hoisted.reportTemplatesApi.fetchReportTemplatesByExamination(
          moduleName,
          version,
          examinationName
        )) as ReportTemplatePayload[]
      })
    )
    hoisted.knowledgeBaseGraphApi.fetchKnowledgeBaseGraphSnapshot.mockResolvedValue({
      reportTemplates: [],
      concepts: { examination: [] }
    })
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
    Object.assign(hoisted.terminologyStore, { registryRevision: 'registry-sha-1' })
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
      if (url.includes('/decoded-stream/')) {
        const frame = Number(url.match(/\/frames\/(\d+)\//)?.[1])
        return Promise.resolve({
          status: 200,
          data: new Blob(['jpeg'], { type: 'image/jpeg' }),
          headers: {
            'content-type': 'image/jpeg',
            'x-frame-number': String(frame),
            'x-frame-timestamp': String(frame / 25)
          }
        })
      }
      if (url === 'patients/') {
        return Promise.resolve({
          data: [
            {
              id: 42,
              firstName: 'Pat',
              lastName: 'Ient',
              patientHash: 'patient_42'
            }
          ]
        })
      }
      if (url === 'patient-examinations/examinations_dropdown/') {
        return Promise.resolve({
          data: [{ id: 9, name: 'colonoscopy', nameDe: 'Koloskopie' }]
        })
      }
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
            knowledge_base_module: 'report_template_examples',
            knowledge_base_version: '1.0.0',
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
    hoisted.axiosApi.post.mockResolvedValue({
      data: {
        case: {
          id: 6,
          caseId: 'case-created-401',
          patient: 42,
          admissionDate: '2026-08-20T10:00:00.000Z',
          leaveDate: null,
          isActive: true,
          isClosed: false,
          isDeleted: false,
          patientExaminations: [
            {
              id: 401,
              examination: { id: 9, name: 'colonoscopy', nameDe: 'Koloskopie' },
              patientData: { id: 42 },
              dateStart: '2026-08-20'
            }
          ],
          documents: [],
          patientMedications: [],
          patientMedicationSchedules: [],
          patientLabSamples: [],
          patientLabValues: []
        },
        patientExamination: {
          id: 401,
          examination: { id: 9, name: 'colonoscopy', nameDe: 'Koloskopie' },
          patientData: { id: 42 },
          dateStart: '2026-08-20'
        }
      }
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

    const wrapper = mountShell()
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
    expect(wrapper.get('[data-testid="superseded-evaluation-notice"]').text()).toContain(
      'veraltete Reporting-Anfrage wurde verworfen'
    )
    const supersededLog = hoisted.runtimeLogger.warn.mock.calls.find(
      ([event]) => event === 'evaluation-superseded'
    )
    expect(supersededLog?.[1]).toMatchObject({
      patientExaminationId: 314,
      pinnedIdentity: null,
      requestedIdentity: 'report_template_examples@1.0.0',
      responseIdentity: null,
      registryRevision: 'registry-sha-1',
      reasonCode: 'superseded',
      supersessionReason: 'dag-context-changed'
    })
    expect(supersededLog?.[1]?.evaluationId).toMatch(/^reporting-314-\d+$/)
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
      '1.0.0',
      'colonoscopy'
    )
    expect(hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0',
      'colonoscopy'
    )
    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: 'report_template_examples',
        patientExaminationId: 314,
        examination: 'colonoscopy'
      })
    )
    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        patientExaminationId: 314,
        moduleName: 'report_template_examples',
        templateName: 'default_template',
        verificationStatus: 'verified'
      })
    )
    const templateSelect = wrapper.get('[data-testid="report-template-select"]')
    expect((templateSelect.element as HTMLSelectElement).value).toBe('default_template')
    expect(templateSelect.element.closest('details')).toBeNull()
    expect(
      templateSelect
        .findAll('option')
        .map((option) => option.text())
        .some((label) => label.includes('default_template'))
    ).toBe(true)
  })

  it('runs independent template and finding nodes in one wave and commits only after the barrier', async () => {
    const templates = deferred<{
      reportTemplates: ReportTemplatePayload[]
    }>()
    const findings = deferred<unknown[]>()
    hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext.mockReturnValueOnce(
      templates.promise
    )
    hoisted.findingsApi.getExaminationFindings.mockImplementation(() => findings.promise)

    mountShell()
    await vi.waitFor(() => {
      expect(hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext).toHaveBeenCalled()
      expect(hoisted.findingsApi.getExaminationFindings).toHaveBeenCalled()
    })
    expect(hoisted.flowRef.current.setRuntimeDraft).not.toHaveBeenCalled()

    templates.resolve({ reportTemplates: [] })
    await flushPromises()
    expect(hoisted.flowRef.current.setRuntimeDraft).not.toHaveBeenCalled()

    findings.resolve([])
    await vi.waitFor(() => {
      expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
        expect.objectContaining({ patientExaminationId: 314, verificationStatus: 'unverified' })
      )
    })
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

  it('rejects a differently pinned patient examination before template discovery', async () => {
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

    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).not.toHaveBeenCalled()
    expect(
      wrapper
        .get('[data-testid="report-template-select"]')
        .findAll('option')
        .map((option) => option.text())
    ).not.toEqual(expect.arrayContaining([expect.stringContaining('colonoscopy_published')]))
    expect(wrapper.text()).toContain(
      'Die Patientenuntersuchung #314 ist an report_template_examples@1.0.0 gebunden'
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
              moduleVersion: '1.0.0',
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
      '1.0.0',
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
    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="report-template-select"]').text()).not.toContain('same_name')
    expect(wrapper.text()).toContain(
      'Die Patientenuntersuchung #314 ist an report_template_examples@1.0.0 gebunden'
    )
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

  it('filters and progressively renders a stable 100-plus finding template', async () => {
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
      identity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        templateVersion: null,
        templateHash: null,
        lifecycleStatus: 'published',
        readiness: null
      },
      reportSections: [
        {
          name: 'indikation_und_sedierung',
          titleDe: 'Indikation und Sedierung',
          titleEn: 'Indication and sedation',
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
            },
            {
              finding: 'required_follow_up',
              required: true,
              multipleAllowed: false,
              classifications: []
            },
            ...Array.from({ length: 100 }, (_, index) => ({
              finding: `stable_finding_${String(index).padStart(3, '0')}_with_a_representative_very_long_clinical_label`,
              required: false,
              multipleAllowed: false,
              classifications: []
            }))
          ]
        }
      ],
      validators: {
        findingsValidators: [],
        examinationValidators: []
      }
    })
    hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext.mockImplementationOnce(
      async () => ({
        reportTemplates: [
          (await hoisted.reportTemplatesApi.fetchReportTemplateByName(
            'report_template_examples',
            '1.0.0',
            'medication_template'
          )) as ReportTemplatePayload
        ]
      })
    )
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
          },
          ...Array.from({ length: 100 }, (_, index) => ({
            finding: `stable_finding_${String(index).padStart(3, '0')}_with_a_representative_very_long_clinical_label`,
            classificationChoices: []
          }))
        ]
      }
    }
    hoisted.flowRef.current.currentRuntimeDraft = draft
    hoisted.flowRef.current.runtimeDraftsByPatientExaminationId = { '314': draft }
    hoisted.flowRef.current.selectedTemplateName = 'medication_template'

    const wrapper = mountShell()
    await flushPromises()

    expect(wrapper.get('#finding-status-filter').element).toHaveProperty('value', 'open')
    expect(wrapper.get('.finding-status-filter-summary').text()).toContain('2 von 102 Befunden')
    expect(wrapper.get('.finding-status-section-title').text()).toBe('Indikation und Sedierung')

    const search = wrapper.get('#finding-status-search')
    await search.setValue('endoscopy_medication_administration')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(1)
    await search.setValue('nicht vorhanden')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(0)
    expect(wrapper.text()).toContain('Keine Befunde entsprechen den gewählten Filtern.')
    await search.setValue('')

    await wrapper.get('#finding-status-filter').setValue('missing')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(1)
    expect(wrapper.get('.finding-status-row').classes()).toContain('is-missing')

    await wrapper.get('#finding-status-filter').setValue('warning')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(1)
    expect(wrapper.get('.finding-status-row').classes()).toContain('is-warning')
    await wrapper.get('.finding-status-row').trigger('click')

    await wrapper.get('#finding-status-filter').setValue('required')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(1)
    expect(wrapper.get('.finding-status-row').classes()).toContain('is-missing')

    await wrapper.get('#finding-status-filter').setValue('optional')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(50)
    expect(wrapper.get('.finding-status-row').classes()).toContain('is-warning')
    expect(wrapper.text()).toContain('Weitere Befunde anzeigen')

    await wrapper.get('#finding-status-filter').setValue('all')
    expect(wrapper.get('.finding-status-filter-summary').text()).toContain('102 von 102 Befunden')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(50)
    expect(wrapper.findAll('.finding-status-row')[0].attributes('data-finding-key')).toBe(
      'endoscopy_medication_administration'
    )
    expect(wrapper.findAll('.finding-status-row')[2].attributes('data-finding-key')).toBe(
      'stable_finding_000_with_a_representative_very_long_clinical_label'
    )
    expect(wrapper.findAll('.finding-status-row')[2].attributes('title')).toContain(
      'Stable Finding 000'
    )
    expect(wrapper.findAll('.finding-status-row')[2].attributes('aria-label')).toContain(
      'Stable Finding 000'
    )
    expect(wrapper.findAll('.finding-status-row')[0].classes()).toContain('is-selected')

    const showMoreButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Weitere Befunde anzeigen'))
    await showMoreButton?.trigger('click')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(100)
    await showMoreButton?.trigger('click')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(102)
    expect(wrapper.findAll('.finding-status-row')[101].attributes('data-finding-key')).toBe(
      'stable_finding_099_with_a_representative_very_long_clinical_label'
    )

    hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings[0].classificationChoices[0].descriptors.push(
      {
        classificationChoiceDescriptor: 'propofol_dose_mg_value',
        descriptorValue: 120
      }
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.finding-status-row')[0].classes()).toContain('is-warning')

    hoisted.flowRef.current.currentRuntimeDraft.payload.patientFindings[0].classificationChoices[1].descriptors.push(
      {
        classificationChoiceDescriptor: 'medication_administration_time_value',
        descriptorValue: '10:30'
      }
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.finding-status-row')[0].classes()).toContain('is-complete')

    await wrapper.get('#finding-status-filter').setValue('complete')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(50)
    expect(wrapper.get('.finding-status-filter-summary').text()).toContain('101 von 102 Befunden')

    await wrapper.get('#finding-status-search').setValue('unbekannt')
    const resetButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Filter zurücksetzen'))
    expect(resetButton).toBeDefined()
    await resetButton?.trigger('click')
    expect(wrapper.get('#finding-status-filter').element).toHaveProperty('value', 'open')
    expect(wrapper.findAll('.finding-status-row')).toHaveLength(1)
    expect(wrapper.get('.finding-status-row').classes()).toContain('is-missing')
  })

  it('keeps the technical inspector collapsed until explicitly opened', async () => {
    const wrapper = mountShell()
    await flushPromises()

    const toggle = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Technische Details')
    expect(toggle).toBeDefined()
    expect(toggle?.attributes('aria-expanded')).toBe('false')
    expect(toggle?.attributes('aria-controls')).toBe('reporting-technical-inspector')
    expect(wrapper.get('#reporting-technical-inspector').attributes('aria-label')).toBe(
      'Technische Berichtsdetails'
    )
    expect(wrapper.get('#reporting-technical-inspector').attributes('style')).toContain(
      'display: none'
    )
    expect(wrapper.get('.reporting-workspace-grid').classes()).not.toContain(
      'has-technical-inspector'
    )

    await toggle?.trigger('click')

    expect(toggle?.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#reporting-technical-inspector').attributes('style') || '').not.toContain(
      'display: none'
    )
    expect(wrapper.get('.reporting-workspace-grid').classes()).toContain('has-technical-inspector')
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
      revision: 5,
      draft: {
        module_name: 'report_template_examples',
        template_name: 'persisted_template',
        reportTextMode: 'manual',
        renderedText: 'Persistierter Berichtstext',
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
      '2026-03-19T13:00:00.000Z',
      5
    )
    expect(hoisted.flowRef.current.applyBackendDraftDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        reportTextMode: 'manual',
        renderedText: 'Persistierter Berichtstext'
      })
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
    await openContextPanel(wrapper)

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
    await openContextPanel(wrapper)

    const streamOptions = hoisted.useAuthenticatedVideoStream.mock.calls[0][0]
    if (!hasMutableArtifactKind(streamOptions)) {
      throw new Error('Expected a reactive artifact-kind option.')
    }
    expect(streamOptions.videoId.value).toBe(100)
    expect(streamOptions.artifactKind.value).toBe('processed')
    const initialFramePreview = wrapper.find('img[alt="Selected frame stream preview"]')
    expect(initialFramePreview.exists()).toBe(true)
    expect(initialFramePreview.attributes('src')).toMatch(/^blob:/)

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
    expect(wrapper.find('img[alt="Selected frame stream preview"]').attributes('src')).toMatch(
      /^blob:/
    )
    expect(
      hoisted.axiosApi.get.mock.calls.some(([url]) =>
        url.includes('/videos/101/frames/2/decoded-stream/')
      )
    ).toBe(true)
    const frameButton = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('#2')),
      'frame preview button'
    )
    await frameButton.trigger('click')
    await flushPromises()
    expect(hoisted.flowRef.current.preferredReportFrame).toEqual({
      videoId: 101,
      frameNumber: 2,
      timestamp: 0.08
    })
    expect(hoisted.flowRef.current.reportFrameSelectionStatus).toBe('ready')
    expect(hoisted.flowRef.current.selectedReportFrames).toBeNull()
    await wrapper.get('[data-test="add-report-frame"]').trigger('click')
    expect(hoisted.flowRef.current.selectedReportFrames).toEqual([
      { videoId: 101, frameNumber: 2, timestamp: 0.08 }
    ])
    expect(wrapper.get('[data-test="add-report-frame"]').attributes('disabled')).toBeDefined()
    await wrapper.get('button[aria-label="Frame 2 entfernen"]').trigger('click')
    expect(hoisted.flowRef.current.selectedReportFrames).toEqual([])
    expect(wrapper.text()).toContain('0 / 24 Bilder ausgewählt')
  })

  it('filters candidates by positive label while retaining explicitly added frames', async () => {
    hoisted.timelineApi.fetchPatientTimelineLatest.mockResolvedValue({
      patient: { id: 42 },
      latestReport: null,
      latestVideo: null,
      latestFrames: []
    })
    const defaultGet = hoisted.axiosApi.get.getMockImplementation()
    const first = { videoId: 100, frameNumber: 0, timestamp: 0, labels: ['polyp'] }
    const second = { videoId: 100, frameNumber: 5, timestamp: 0.2, labels: ['normal'] }
    hoisted.axiosApi.get.mockImplementation((url: string, ...args: unknown[]) => {
      if (url.includes('/frame-candidates')) {
        return Promise.resolve({
          data: { frames: [first, second], labels: ['polyp', 'normal'], nextOffset: null }
        })
      }
      return defaultGet?.(url, ...args)
    })
    const wrapper = mountShell()
    await flushPromises()
    await openContextPanel(wrapper)
    const browse = requireDefined(
      wrapper.findAll('button').find((button) => button.text() === 'Frames durchsuchen'),
      'browse frames'
    )
    await browse.trigger('click')
    await flushPromises()
    const preview = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('#0')),
      'frame zero'
    )
    await preview.trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="add-report-frame"]').trigger('click')
    await wrapper.get('#report-frame-label').setValue('normal')
    await flushPromises()
    expect(hoisted.axiosApi.get).toHaveBeenCalledWith(
      '/patient-examination-reports/frame-candidates',
      {
        params: { patient_examination_id: 314, label: 'normal', offset: 0 }
      }
    )
    const next = requireDefined(
      wrapper.findAll('button').find((button) => button.text().includes('#5')),
      'second frame'
    )
    await next.trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="add-report-frame"]').trigger('click')
    expect(hoisted.flowRef.current.selectedReportFrames).toEqual([
      { videoId: 100, frameNumber: 0, timestamp: 0 },
      { videoId: 100, frameNumber: 5, timestamp: 0.2 }
    ])
    await wrapper.get('button[aria-label="Frame 0 entfernen"]').trigger('click')
    expect(hoisted.flowRef.current.selectedReportFrames).toEqual([
      { videoId: 100, frameNumber: 5, timestamp: 0.2 }
    ])
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

  it('prioritizes patient and examination while collapsing secondary controls', async () => {
    const wrapper = mountShell()
    await flushPromises()

    const requirement = wrapper.get('[data-testid="reporting-context-requirement"]')
    expect(requirement.text()).toContain('Patient und Untersuchung ausgewählt')
    expect(wrapper.get('[data-testid="resolved-patient-examination"]').text()).toContain(
      'Persistierte Patientenuntersuchung 314'
    )
    expect(wrapper.find('[data-testid="patient-select"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="examination-select"]').exists()).toBe(false)

    const secondaryControls = wrapper.get('[data-testid="reporting-options"]')
    expect(secondaryControls.attributes('open')).toBeUndefined()
    expect(secondaryControls.get('summary').text()).toBe('Weitere Einstellungen und Import')
    expect(wrapper.find('.context-panel').exists()).toBe(false)
  })

  it('persists patient and examination as one patient examination before entering findings', async () => {
    hoisted.routeRef.current = reactive({
      path: '/reporting',
      params: { patient_examination_id: '' }
    })
    hoisted.flowRef.current.caseId = null
    hoisted.flowRef.current.patientExaminationId = null
    hoisted.flowRef.current.selectedPatientId = null
    hoisted.flowRef.current.selectedExaminationId = null

    const wrapper = mountShell()
    await flushPromises()

    expect(wrapper.find('[data-testid="resolved-patient-examination"]').exists()).toBe(false)
    await wrapper.get('[data-testid="patient-select"]').setValue('42')
    await wrapper.get('[data-testid="examination-select"]').setValue('9')
    await wrapper.get('[data-testid="persist-patient-examination"]').trigger('click')
    await flushPromises()

    expect(hoisted.axiosApi.post).toHaveBeenCalledWith(
      'cases/create-with-examination/',
      expect.any(Object)
    )
    const createPayload = hoisted.axiosApi.post.mock.calls.at(-1)?.[1]
    expect(createPayload).toMatchObject({
      patientExamination: {
        patient: 'patient_42',
        examination: 'colonoscopy'
      }
    })
    expect(hoisted.flowRef.current.setPatientExaminationContext).toHaveBeenCalledWith({
      patientExaminationId: 401,
      selectedPatientId: 42,
      selectedExaminationId: 9,
      preserveTemplateSelection: true
    })
    expect(hoisted.routerRef.current.push).toHaveBeenCalledWith('/reporting/401/findings')
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
    hoisted.flowRef.current.selectedTemplateName = 'current_template'
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValueOnce([
      {
        name: 'current_template',
        examination: 'colonoscopy',
        identity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '1.0.0',
          lifecycleStatus: 'published'
        }
      },
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
        moduleName: 'dgvs_reporting',
        version: '0.1.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      {
        moduleName: 'mst_3_0',
        version: '3.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      {
        moduleName: 'star_upper_gi',
        version: '0.1.2',
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
    expect(bundleOptions).toContain('dgvs_reporting · 0.1.0')
    expect(bundleOptions).toContain('mst_3_0 · 3.0.0')
    expect(bundleOptions).toContain('star_upper_gi · 0.1.2')
    expect(wrapper.text()).toContain('Keine aktive Terminologie')
    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).not.toHaveBeenCalled()
  })

  it('shows both ESGE STAR templates for a STAR-compatible examination', async () => {
    const bundles: TerminologyBundleVersion[] = [
      {
        moduleName: 'dgvs_reporting',
        version: '0.1.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      {
        moduleName: 'mst_3_0',
        version: '3.0.0',
        medicalField: 'gastroenterology',
        isActive: false
      },
      {
        moduleName: 'star_upper_gi',
        version: '0.1.2',
        medicalField: 'gastroenterology',
        isActive: true
      }
    ]
    hoisted.terminologyStore.bundles = bundles
    hoisted.terminologyStore.filteredBundles = bundles
    hoisted.terminologyStore.activeBundle = requireDefined(bundles[2], 'STAR bundle')
    hoisted.terminologyStore.activeModuleName = 'star_upper_gi'
    hoisted.terminologyStore.activeBundleKey = 'star_upper_gi@@0.1.2'
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      {
        name: 'star_upper_gi_mini_report_template',
        nameDe: 'STAR Upper GI – Basismodul',
        examination: 'star_upper_gi_endoscopy',
        identity: {
          moduleName: 'star_upper_gi',
          knowledgeBaseVersion: '0.1.2',
          templateVersion: '0.1.1',
          lifecycleStatus: 'published'
        }
      },
      {
        name: 'star_upper_gi_standard_report_template',
        nameDe: 'Standardisierter STAR-ÖGD-Bericht',
        examination: 'star_upper_gi_endoscopy',
        identity: {
          moduleName: 'star_upper_gi',
          knowledgeBaseVersion: '0.1.2',
          templateVersion: '2025.1',
          lifecycleStatus: 'published'
        }
      }
    ])
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
              examination: {
                id: 9,
                name: 'star_upper_gi_endoscopy',
                nameDe: 'Ösophagogastroduodenoskopie'
              },
              patientData: { id: 42 },
              dateStart: '2026-03-10'
            }
          ],
          documents: [],
          patientMedications: [],
          patientMedicationSchedules: [],
          patientLabSamples: [],
          patientLabValues: []
        }
        return Promise.resolve({ data: [caseResponse] })
      }
      if (url === 'patient-examinations/314/') {
        return Promise.resolve({
          data: {
            id: 314,
            examination: { id: 9, name: 'star_upper_gi_endoscopy' },
            patient: { id: 42 },
            date_start: '2026-03-10',
            examiners: []
          }
        })
      }
      return Promise.resolve({ data: { results: [] } })
    })

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext).toHaveBeenCalledWith(
      'star_upper_gi',
      '0.1.2',
      'star_upper_gi_endoscopy'
    )
    const bundleOptions = wrapper
      .get('[data-testid="terminology-bundle-select"]')
      .findAll('option')
      .map((option) => option.text())
    expect(bundleOptions).toEqual(
      expect.arrayContaining(['dgvs_reporting · 0.1.0', 'mst_3_0 · 3.0.0', 'star_upper_gi · 0.1.2'])
    )
    const templateLabels = wrapper
      .get('[data-testid="report-template-select"]')
      .findAll('option')
      .map((option) => option.text())
    expect(templateLabels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('STAR Upper GI – Basismodul'),
        expect.stringContaining('Standardisierter STAR-ÖGD-Bericht')
      ])
    )
  })

  it('preserves a user-selected bundle across reload but blocks incompatible patient resolution', async () => {
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
    initial.unmount()
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockClear()

    const restored = mountShell()
    await flushPromises()
    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).not.toHaveBeenCalled()
    expect(restored.text()).toContain(
      'Die Patientenuntersuchung #314 ist an report_template_examples@1.0.0 gebunden'
    )
    expect(hoisted.runtimeLogger.warn).toHaveBeenCalledWith(
      'evaluation-identity-mismatch',
      expect.objectContaining({
        patientExaminationId: 314,
        pinnedIdentity: 'report_template_examples@1.0.0',
        requestedIdentity: 'gastro_v2@2.0.0',
        responseIdentity: 'report_template_examples@1.0.0',
        registryRevision: 'registry-sha-1',
        reasonCode: 'knowledge-base-identity-mismatch'
      })
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

  it('shows where bundle templates are available when the selected examination has none', async () => {
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([])
    hoisted.knowledgeBaseGraphApi.fetchKnowledgeBaseGraphSnapshot.mockResolvedValue({
      reportTemplates: [
        {
          name: 'star_upper_gi_standard_report_template',
          nameDe: 'Standardisierter STAR-ÖGD-Bericht',
          examination: 'star_upper_gi_endoscopy',
          identity: {
            moduleName: 'report_template_examples',
            knowledgeBaseVersion: '1.0.0',
            templateVersion: '2025.1',
            templateHash: null,
            lifecycleStatus: 'published',
            readiness: null
          }
        }
      ],
      concepts: {
        examination: [
          {
            name: 'star_upper_gi_endoscopy',
            nameDe: 'Ösophagogastroduodenoskopie'
          }
        ]
      }
    })

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.knowledgeBaseGraphApi.fetchKnowledgeBaseGraphSnapshot).toHaveBeenCalledWith(
      'report_template_examples',
      '1.0.0'
    )
    const hint = wrapper.get('[data-testid="template-availability-hint"]')
    expect(hint.text()).toContain('Für die gewählte Untersuchung ist keine Vorlage verfügbar')
    expect(hint.text()).toContain('Standardisierter STAR-ÖGD-Bericht')
    expect(hint.text()).toContain('verfügbar für Ösophagogastroduodenoskopie')
    expect(hint.text()).toContain('(star_upper_gi_endoscopy)')
    expect(
      wrapper.get('[data-testid="report-template-select"]').attributes('disabled')
    ).toBeDefined()
  })

  it('keeps an annotation-only draft pinned when terminology changes after no template matched', async () => {
    const originalBundle = requireDefined(
      hoisted.terminologyStore.activeBundle || undefined,
      'initial terminology bundle'
    )
    const nextBundle: TerminologyBundleVersion = {
      moduleName: 'other_reporting',
      version: '2.0.0',
      medicalField: 'gastroenterology',
      isActive: false
    }
    hoisted.terminologyStore.bundles = [originalBundle, nextBundle]
    hoisted.terminologyStore.filteredBundles = [originalBundle, nextBundle]
    hoisted.terminologyStore.findBundleByKey.mockImplementation(
      (key: string) =>
        [originalBundle, nextBundle].find(
          (bundle) => `${bundle.moduleName}@@${bundle.version}` === key
        ) || null
    )
    hoisted.terminologyStore.selectBundle.mockImplementation(function (
      this: typeof hoisted.terminologyStore,
      bundle: TerminologyBundleVersion
    ) {
      const active = { ...bundle, isActive: true }
      this.activeBundle = active
      this.activeModuleName = active.moduleName
      this.activeBundleKey = `${active.moduleName}@@${active.version}`
      return Promise.resolve({ active, counts: {} })
    })
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([])

    const wrapper = mountShell()
    await flushPromises()
    expect(hoisted.flowRef.current.currentRuntimeDraft).toEqual(
      expect.objectContaining({ moduleName: originalBundle.moduleName, templateName: null })
    )
    hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext.mockClear()

    await wrapper
      .get('[data-testid="terminology-bundle-select"]')
      .setValue(`${nextBundle.moduleName}@@${nextBundle.version}`)
    await flushPromises()

    expect(hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext).not.toHaveBeenCalled()
    expect(hoisted.flowRef.current.currentRuntimeDraft).toEqual(
      expect.objectContaining({
        moduleName: originalBundle.moduleName,
        verificationStatus: 'unverified',
        persistencePolicy: 'blocked_until_verified'
      })
    )
    expect(wrapper.text()).toContain(
      `ist an ${originalBundle.moduleName}@${originalBundle.version} gebunden`
    )
  })

  it('prefers canonical German finding and classification labels over raw display names', async () => {
    hoisted.findingsApi.getExaminationFindings.mockResolvedValue([
      {
        id: 1,
        name: 'star_upper_gi_polyp',
        nameDe: 'Polyp',
        displayName: 'star_upper_gi_polyp',
        description: '',
        examinations: ['colonoscopy'],
        classifications: [
          {
            id: 2,
            name: 'star_upper_gi_lesion_paris',
            nameDe: 'Paris-Klassifikation',
            displayName: 'star_upper_gi_lesion_paris',
            required: true,
            classificationTypes: [],
            choices: [
              {
                id: 3,
                name: 'star_upper_gi_paris_IIa',
                nameDe: 'Paris IIa',
                displayName: 'star_upper_gi_paris_IIa',
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
    ])
    hoisted.reportTemplatesApi.fetchReportTemplateByName.mockResolvedValue({
      name: 'default_template',
      examination: 'colonoscopy',
      identity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        templateVersion: null,
        templateHash: null,
        lifecycleStatus: 'published',
        readiness: null
      },
      reportSections: [
        {
          name: 'findings',
          titleDe: 'Befunde',
          position: 0,
          types: [],
          fields: [],
          sectionKind: 'findings',
          findings: [
            {
              finding: 'star_upper_gi_polyp',
              required: true,
              multipleAllowed: true,
              classifications: [{ classification: 'star_upper_gi_lesion_paris', required: true }]
            }
          ]
        }
      ],
      verbosityOptions: ['short', 'standard', 'detailed'],
      validators: { findingsValidators: [], examinationValidators: [] }
    })
    hoisted.knowledgeBaseGraphApi.fetchExaminationReportingContext.mockImplementationOnce(
      async () => ({
        reportTemplates: [
          (await hoisted.reportTemplatesApi.fetchReportTemplateByName(
            'report_template_examples',
            '1.0.0',
            'default_template'
          )) as ReportTemplatePayload
        ]
      })
    )
    const wrapper = mountShell()
    await flushPromises()

    expect(wrapper.get('.kb-focus-block strong').text()).toBe('Polyp')
    const verbosity = wrapper.get('[data-testid="report-verbosity-select"]')
    expect(verbosity.text()).toContain('Kurz')
    expect(verbosity.text()).toContain('Ausführlich')
    await verbosity.setValue('detailed')
    expect(hoisted.flowRef.current.selectedReportVerbosity).toBe('detailed')
    expect(wrapper.get('#reporting-technical-inspector').text()).toContain('Paris-Klassifikation')
    expect(wrapper.get('#reporting-technical-inspector').text()).toContain('Paris IIa')
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

  it('does not mutate global terminology while rejecting a differently pinned restored draft', async () => {
    const pinnedBundle: TerminologyBundleVersion = {
      moduleName: 'report_template_examples',
      version: '1.0.0',
      medicalField: 'gastroenterology',
      isActive: false
    }
    const otherBundle: TerminologyBundleVersion = {
      moduleName: 'other_reporting',
      version: '2.0.0',
      medicalField: 'gastroenterology',
      isActive: true
    }
    const restoredDraft: ReportingRuntimeDraft = {
      draftId: 'draft_314',
      patientExaminationId: 314,
      moduleName: pinnedBundle.moduleName,
      templateName: null,
      templateIdentity: null,
      hydratedFrom: 'session_storage',
      updatedAt: '2026-08-20T10:00:00.000Z',
      verificationStatus: 'unverified',
      persistencePolicy: 'blocked_until_verified',
      payload: {
        patient: 'patient_42',
        examiners: [],
        examination: 'colonoscopy',
        knowledgeBaseModule: pinnedBundle.moduleName,
        knowledgeBaseVersion: pinnedBundle.version,
        patientFindings: []
      }
    }
    hoisted.flowRef.current.currentRuntimeDraft = restoredDraft
    hoisted.flowRef.current.runtimeDraftsByPatientExaminationId = { '314': restoredDraft }
    hoisted.terminologyStore.bundles = [pinnedBundle, otherBundle]
    hoisted.terminologyStore.filteredBundles = [pinnedBundle, otherBundle]
    hoisted.terminologyStore.activeBundle = otherBundle
    hoisted.terminologyStore.activeModuleName = otherBundle.moduleName
    hoisted.terminologyStore.activeBundleKey = `${otherBundle.moduleName}@@${otherBundle.version}`
    hoisted.terminologyStore.selectBundle.mockImplementation((bundle: TerminologyBundleVersion) => {
      const active = { ...bundle, isActive: true }
      hoisted.terminologyStore.activeBundle = active
      hoisted.terminologyStore.activeModuleName = active.moduleName
      hoisted.terminologyStore.activeBundleKey = `${active.moduleName}@@${active.version}`
      return Promise.resolve({ active, counts: {} })
    })

    const wrapper = mountShell()
    await flushPromises()

    expect(hoisted.terminologyStore.selectBundle).not.toHaveBeenCalled()
    expect(hoisted.terminologyStore.activeBundle).toEqual(
      expect.objectContaining({ moduleName: 'other_reporting', version: '2.0.0' })
    )
    expect(wrapper.text()).toContain(
      'Die Patientenuntersuchung #314 ist an report_template_examples@1.0.0 gebunden'
    )
  })
})
