import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportingShell from '../ReportingShell.vue'

const hoisted = vi.hoisted(() => ({
  flowRef: { current: null as any },
  routeRef: {
    current: {
      path: '/reporting/314/findings',
      params: { patient_examination_id: '314' }
    }
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

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<any>('vue-router')
  return {
    ...actual,
    useRoute: () => hoisted.routeRef.current
  }
})

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
    mediaPreload: null as any,
    mediaPreloadStatus: 'idle',
    mediaPreloadError: null as string | null,
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
    hoisted.flowRef.current = buildFlowStore()
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
})
