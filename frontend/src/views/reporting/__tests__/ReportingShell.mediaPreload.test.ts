import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportingShell from '../ReportingShell.vue'
import ReportImportPanel from '@/components/Reporting/ReportImportPanel.vue'

const hoisted = vi.hoisted(() => ({
  flowRef: { current: null as any },
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
  terminologyStore: {
    bundles: [],
    activeBundle: null as any,
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
    bundleKey: vi.fn((bundle: any) => `${bundle.moduleName}@@${bundle.version}`),
    findBundleByKey: vi.fn(),
    loadBundles: vi.fn(),
    selectBundle: vi.fn(),
    setMedicalField: vi.fn()
  },
  timelineApi: {
    fetchPatientTimelineLatest: vi.fn(),
    pickPreferredStream: vi.fn((options: Array<{ type: string; url: string }>) => {
      return options.find((option) => option.type === 'processed')?.url ?? null
    })
  }
}))

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/stores/terminologyStore', () => ({
  useTerminologyStore: () => hoisted.terminologyStore
}))

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router')
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

vi.mock('@/api/reportingTimelineApi', () => ({
  fetchPatientTimelineLatest: hoisted.timelineApi.fetchPatientTimelineLatest,
  pickPreferredStream: hoisted.timelineApi.pickPreferredStream
}))

function buildFlowStore() {
  return {
    sessionStatus: 'active',
    lookupToken: 'tok',
    patientExaminationId: 314,
    selectedPatientId: 42,
    selectedExaminationId: 9,
    selectedKbModule: 'report_template_examples',
    selectedTemplateName: null,
    currentRuntimeDraft: null,
    runtimeDraftsByPatientExaminationId: {},
    mediaPreload: null as any,
    mediaPreloadStatus: 'idle',
    mediaPreloadError: null as string | null,
    draftPersistenceStatus: 'idle',
    draftPersistenceError: null as string | null,
    lastPersistedDraftAt: null as string | null,
    setCaseSelection: vi.fn(),
    setPatientExaminationContext: vi.fn(function (this: any, payload: any) {
      this.patientExaminationId = payload.patientExaminationId
      if (payload.selectedPatientId !== undefined)
        this.selectedPatientId = payload.selectedPatientId
      if (payload.selectedExaminationId !== undefined)
        this.selectedExaminationId = payload.selectedExaminationId
    }),
    setTemplateSelection: vi.fn(function (this: any, payload: any) {
      if (payload.moduleName !== undefined) this.selectedKbModule = payload.moduleName
      if (payload.templateName !== undefined) this.selectedTemplateName = payload.templateName
    }),
    setIndications: vi.fn(),
    setRuntimeDraft: vi.fn(function (this: any, payload: any) {
      this.currentRuntimeDraft = payload
      this.runtimeDraftsByPatientExaminationId[String(payload.patientExaminationId)] = payload
    }),
    markDraftPersistenceHydrated: vi.fn(function (this: any, updatedAt: string | null) {
      this.lastPersistedDraftAt = updatedAt
      this.draftPersistenceStatus = updatedAt ? 'saved' : 'idle'
      this.draftPersistenceError = null
    }),
    setMediaPreloadLoading: vi.fn(function (this: any) {
      this.mediaPreloadStatus = 'loading'
      this.mediaPreloadError = null
    }),
    setMediaPreload: vi.fn(function (this: any, payload: any) {
      this.mediaPreload = payload
      this.mediaPreloadStatus = 'ready'
      this.mediaPreloadError = null
    }),
    setMediaPreloadError: vi.fn(function (this: any, message: string) {
      this.mediaPreloadStatus = 'error'
      this.mediaPreloadError = message
    }),
    clearMediaPreload: vi.fn(function (this: any) {
      this.mediaPreload = null
      this.mediaPreloadStatus = 'idle'
      this.mediaPreloadError = null
    })
  }
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
    hoisted.terminologyStore.activeBundle = null
    hoisted.terminologyStore.activeModuleName = 'report_template_examples'
    hoisted.terminologyStore.selectedMedicalField = 'gastroenterology'
    hoisted.terminologyStore.loadBundles.mockResolvedValue(undefined)
    hoisted.flowRef.current = buildFlowStore()
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

    mountShell()
    await flushPromises()

    expect(hoisted.reportTemplatesApi.fetchReportTemplatesByExamination).toHaveBeenCalledWith(
      'report_template_examples',
      'colonoscopy'
    )
    expect(hoisted.reportTemplatesApi.buildReportTemplateRuntimePayload).toHaveBeenCalledWith({
      moduleName: 'report_template_examples',
      patientExaminationId: 314,
      patient: 'patient_42',
      examiners: ['dr_house', 'Lisa Cuddy', 'dr_wilson'],
      examination: 'colonoscopy',
      getFindingById: expect.any(Function)
    })
    expect(hoisted.flowRef.current.setRuntimeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        patientExaminationId: 314,
        moduleName: 'report_template_examples',
        templateName: 'default_template',
        hydratedFrom: 'backend_context',
        payload: expect.objectContaining({
          patient: 'patient_42',
          examination: 'colonoscopy',
          knowledgeBaseModule: 'report_template_examples'
        })
      })
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
    expect(video.attributes('src')).toBe('/timeline/video/processed')

    const rawButton = wrapper.findAll('button').find((button) => button.text().trim() === 'raw')
    expect(rawButton).toBeTruthy()

    await rawButton!.trigger('click')
    await flushPromises()

    expect(wrapper.find('video').attributes('src')).toBe('/timeline/video/raw')
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

    expect(wrapper.find('video').attributes('src')).toBe('/timeline/video/v1-processed')
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
    expect(wrapper.find('video').attributes('src')).toBe('/timeline/video/v2-processed')
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
})
