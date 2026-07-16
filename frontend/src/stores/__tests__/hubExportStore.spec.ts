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
      unmark: 'hub-export/unmark/'
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
})
