import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useHubExportStore } from '@/stores/hubExportStore'
import { endpoints } from '@/types/api/endpoints'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  r: (path: string) => `/api/${path}`,
  default: {
    get: hoisted.get,
    post: hoisted.post
  }
}))

vi.mock('@/types/api/endpoints', () => ({
  endpoints: {
    hubExport: {
      overview: 'hub-export/overview/',
      mark: 'hub-export/mark/',
      offloadEligibleVideos: 'hub-export/offload-eligible-videos/',
      retry: (jobId: string) => `hub-export/jobs/${jobId}/retry/`,
      unmark: 'hub-export/unmark/'
    },
    media: {
      videoMarkReadyForExport: (id: number) => `media/videos/${String(id)}/mark-ready-for-export/`
    }
  }
}))

describe('hubExportStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('hydrates overview state including configuration errors', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: null,
        sourceNodeKey: 'site-node',
        hubNodes: [],
        configReady: false,
        configError: 'Normal sender mode requires exactly one active central hub node.',
        syncSummary: {
          centers: [],
          rejections: [],
          duplicates: [],
          processedFileCount: 0,
          candidateCount: 0
        },
        items: []
      }
    })

    const store = useHubExportStore()
    await store.fetchOverview()

    expect(store.sourceNodeKey).toBe('site-node')
    expect(store.configReady).toBe(false)
    expect(store.configError).toContain('exactly one active central hub node')
    expect(store.syncSummary?.processedFileCount).toBe(0)
  })

  it('hydrates the hub export privacy summary', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [
          {
            nodeKey: 'hub-node',
            displayName: 'Hub',
            baseUrl: 'https://hub.example',
            owningCenterKey: 'center-a'
          }
        ],
        configReady: true,
        configError: '',
        privacySummary: {
          minK: 5,
          eligibleResourceCount: 3,
          eligibleCaseCount: 3,
          markedResourceCount: 0,
          smallestEquivalenceClassSize: 3,
          violatingEquivalenceClassCount: 1,
          passesKAnonymity: false,
          status: 'warning'
        },
        items: []
      }
    })

    const store = useHubExportStore()
    await store.fetchOverview('hub-node')

    expect(store.privacySummary?.minK).toBe(5)
    expect(store.privacySummary?.passesKAnonymity).toBe(false)
    expect(store.privacySummary?.status).toBe('warning')
  })

  it('marks resources and refreshes the overview', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [
          {
            nodeKey: 'hub-node',
            displayName: 'Hub',
            baseUrl: 'https://hub.example',
            owningCenterKey: 'center-a'
          }
        ],
        configReady: true,
        configError: '',
        items: []
      }
    })
    hoisted.post.mockResolvedValue({ data: { markedCount: 1, targetNodeKey: 'hub-node' } })

    const store = useHubExportStore()
    await store.fetchOverview('hub-node')
    await store.markResources([{ id: 7, resourceKind: 'report' }])

    expect(hoisted.post).toHaveBeenCalledWith(`/api/${endpoints.hubExport.mark}`, {
      targetNodeKey: 'hub-node',
      resources: [{ id: 7, resourceKind: 'report' }]
    })
    expect(hoisted.get).toHaveBeenCalledTimes(2)
  })

  it('checks video export readiness and refreshes once', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [],
        configReady: true,
        configError: '',
        privacySummary: null,
        syncSummary: null,
        items: []
      }
    })
    hoisted.post.mockResolvedValue({ data: { success: true, readyForExport: true } })

    const store = useHubExportStore()
    store.selectedTargetNodeKey = 'hub-node'
    const result = await store.checkVideoExportReadiness([
      { id: 2, centerKey: 'center-a' },
      { id: 3, centerKey: 'center-a' }
    ])

    expect(hoisted.post).toHaveBeenCalledWith('/api/media/videos/2/mark-ready-for-export/', {
      centerKey: 'center-a'
    })
    expect(hoisted.post).toHaveBeenCalledWith('/api/media/videos/3/mark-ready-for-export/', {
      centerKey: 'center-a'
    })
    expect(result).toEqual({ checkedCount: 2, failedCount: 0 })
    expect(hoisted.get).toHaveBeenCalledTimes(1)
  })

  it('queues all eligible videos and refreshes the overview', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [],
        configReady: true,
        configError: '',
        privacySummary: null,
        syncSummary: null,
        items: []
      }
    })
    hoisted.post.mockResolvedValue({
      data: {
        targetNodeKey: 'hub-node',
        discoveredCount: 3,
        eligibleCount: 2,
        queuedCount: 2,
        alreadyRegisteredCount: 0,
        skippedCount: 1
      }
    })

    const store = useHubExportStore()
    store.selectedTargetNodeKey = 'hub-node'
    const result = await store.offloadEligibleVideos()

    expect(hoisted.post).toHaveBeenCalledWith('/api/hub-export/offload-eligible-videos/', {
      targetNodeKey: 'hub-node'
    })
    expect(result.queuedCount).toBe(2)
    expect(hoisted.get).toHaveBeenCalledTimes(1)
  })

  it('retries a failed job by its stable outbound job id and refreshes', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [],
        configReady: true,
        configError: '',
        privacySummary: null,
        syncSummary: null,
        items: []
      }
    })
    hoisted.post.mockResolvedValue({
      data: {
        outboundJobId: 'job-123',
        transferKey: 'site-node__video__hash__processed_v1',
        localStatus: 'queued'
      }
    })

    const store = useHubExportStore()
    store.selectedTargetNodeKey = 'hub-node'
    const result = await store.retryFailedJob('job-123')

    expect(hoisted.post).toHaveBeenCalledWith('/api/hub-export/jobs/job-123/retry/')
    expect(result.localStatus).toBe('queued')
    expect(hoisted.get).toHaveBeenCalledTimes(1)
  })
})
