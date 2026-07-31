import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import ReportingShell from '../ReportingShell.vue'
import ReportImportPanel from '@/components/Reporting/ReportImportPanel.vue'
import type { TerminologyBundleVersion } from '@/api/terminologyApi'
import type { TimelineLatestPayload } from '@/api/reportingTimelineApi'
import type { ReportingRuntimeDraft } from '@/stores/reportingFlowStore'

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
      get: vi.fn()
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
      bundles: [],
      activeBundle: null as TerminologyBundleVersion | null,
      registryPath: '',
      loading: false,
      selecting: false,
      error: null as string | null,
      selectedMedicalField: 'gastroenterology',
      lastSelectionCounts: null as Record<string, number> | null,
      activeModuleName: 'report_template_examples',
      activeBundleKey: '',
      activeBundleLabel: 'Standard-Terminologie',
      filteredBundles: [],
      medicalFieldLabel: 'Gastroenterologie',
      medicalFieldOptions: [{ value: 'gastroenterology', label: 'Gastroenterologie' }],
      bundleKey: vi.fn(
        (bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>) =>
          `${bundle.moduleName}@@${bundle.version}`
      ),
      findBundleByKey: vi.fn(),
      importBundle: vi.fn(),
      importBundleFolder: vi.fn(),
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
    useAuthenticatedVideoStream: vi.fn()
  }
})

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/stores/terminologyStore', () => ({
  useTerminologyStore: () => hoisted.terminologyStore
}))

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
  buildReportTemplateRuntimePayload: hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload
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

function mountShell() {
  return mount(ReportingShell, {
    global: {
      stubs: {
        RouterLink: true,
        RouterView: true
      }
    }
  })
}

describe('ReportingShell media preload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.useAuthenticatedVideoStream.mockReturnValue({
      playbackError: ref(null),
      playbackSourceUrl: ref(''),
      playbackMode: ref('idle'),
      isHlsPlayback: ref(false)
    })
    hoisted.terminologyStore.activeBundle = null
    hoisted.terminologyStore.activeModuleName = 'report_template_examples'
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
      { name: 'default_template', examination: 'colonoscopy' }
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
        return Promise.resolve({
          data: [
            {
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
                  examination: { id: 9, name: 'colonoscopy' },
                  patientData: { id: 42 },
                  dateStart: '2026-03-10'
                },
                {
                  id: 315,
                  examination: { id: 10, name: 'gastroscopy' },
                  patientData: { id: 42 },
                  dateStart: '2026-03-11'
                }
              ],
              patientMedications: [],
              patientMedicationSchedules: [],
              patientLabSamples: [],
              patientLabValues: []
            }
          ]
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

    expect(optionTexts).toContain('#314 · colonoscopy · 10.3.2026')
    expect(optionTexts).toContain('#315 · gastroscopy · 11.3.2026')

    await select.setValue('315')
    await flushPromises()

    expect(hoisted.flowRef.current.setPatientExaminationContext).toHaveBeenCalledWith({
      patientExaminationId: 315,
      selectedPatientId: 42,
      selectedExaminationId: 10
    })
    expect(hoisted.routerRef.current.push).toHaveBeenCalledWith('/reporting/315/findings')
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
    expect(hoisted.flowRef.current.setRuntimeDraft).not.toHaveBeenCalled()
    const templateSelect = wrapper.get('[data-testid="report-template-select"]')
    expect(templateSelect.findAll('option').map((option) => option.text())).toContain(
      'default_template'
    )
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
      hydratedFrom: 'session_storage',
      updatedAt: '2026-03-19T12:00:00.000Z',
      payload: {
        patient: 'patient_42',
        examiners: [],
        examination: 'colonoscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: null,
        patientFindings: []
      }
    }
    hoisted.flowRef.current.runtimeDraftsByPatientExaminationId = {
      '314': hoisted.flowRef.current.currentRuntimeDraft
    }
    hoisted.reportTemplatesApi.fetchReportTemplatesByExamination.mockResolvedValue([
      { name: 'restored_template', examination: 'colonoscopy' }
    ])

    mountShell()
    await flushPromises()

    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).not.toHaveBeenCalled()
    expect(hoisted.flowRef.current.setTemplateSelection).toHaveBeenCalledWith({
      moduleName: 'report_template_examples',
      templateName: 'restored_template'
    })
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
        payload: {
          patient: 'patient_42',
          examiners: ['dr_house'],
          examination: 'colonoscopy',
          knowledgeBaseModule: 'report_template_examples',
          knowledgeBaseVersion: null,
          patientFindings: []
        }
      },
      updated_at: '2026-03-19T13:00:00.000Z'
    })

    mountShell()
    await flushPromises()

    expect(hoisted.reportDraftApi.fetchPatientExaminationDraft).toHaveBeenCalledWith(314)
    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).not.toHaveBeenCalled()
    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        patientExaminationId: 314,
        moduleName: 'report_template_examples',
        templateName: 'persisted_template',
        hydratedFrom: 'draft_api',
        payload: expect.objectContaining({
          patient: 'patient_42',
          examination: 'colonoscopy'
        })
      })
    )
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

    expect(hoisted.flowRef.current.clearRuntimeDraft).toHaveBeenCalledWith(314)
    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalled()
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
    expect(streamOptions.videoId.value).toBe(999)
    expect(streamOptions.artifactKind.value).toBe('processed')

    const rawButton = wrapper.findAll('button').find((button) => button.text().trim() === 'raw')
    expect(rawButton).toBeTruthy()

    await rawButton!.trigger('click')
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
    expect(streamOptions.videoId.value).toBe(100)
    expect(streamOptions.artifactKind.value).toBe('processed')
    const initialFramePreview = wrapper.find('img[alt="Selected frame stream preview"]')
    expect(initialFramePreview.exists()).toBe(true)
    expect(initialFramePreview.attributes('src')).toBe('/timeline/frame/v1')

    const refreshButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Medien aktualisieren'))
    expect(refreshButton).toBeTruthy()

    await refreshButton!.trigger('click')
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
    hoisted.terminologyStore.importBundleFolder.mockResolvedValue({ ok: true })
    const wrapper = mountShell()
    await flushPromises()
    const folderInput = wrapper.get('input[webkitdirectory]')
    const files = [new File(['name: custom\nversion: "1"\n'], 'config.yaml')]
    Object.defineProperty(folderInput.element, 'files', { value: files, configurable: true })

    await folderInput.trigger('change')
    await flushPromises()

    expect(hoisted.terminologyStore.importBundleFolder).toHaveBeenCalledWith(files)
    expect(wrapper.text()).toContain('Terminologieordner importiert und geladen.')
  })

  it('keeps direct ZIP import available for lx-terminology-editor exports', async () => {
    hoisted.terminologyStore.importBundle.mockResolvedValue({ ok: true })
    const wrapper = mountShell()
    await flushPromises()
    const zipInput = wrapper.get('input[accept=".zip,application/zip"]')
    const editorZip = new File(['editor export'], 'custom_terminology.zip', {
      type: 'application/zip'
    })
    Object.defineProperty(zipInput.element, 'files', {
      value: [editorZip],
      configurable: true
    })

    await zipInput.trigger('change')
    await flushPromises()

    expect(hoisted.terminologyStore.importBundle).toHaveBeenCalledWith(editorZip)
    expect(wrapper.text()).toContain('Terminologiepaket aus dem Editor importiert und geladen.')
  })
})
