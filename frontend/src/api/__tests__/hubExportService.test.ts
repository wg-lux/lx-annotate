import { beforeEach, describe, expect, it, vi } from 'vitest'

import { hubExportService } from '@/api/hubExportService'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/api/axiosInstance', () => ({
  default: http,
  r: (path: string) => `/api/${path}`
}))

describe('hubExportService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests the overview with the backend snake_case query parameter', async () => {
    // Arrange
    const overview = { selectedTargetNodeKey: 'hub-1', items: [] }
    http.get.mockResolvedValue({ data: overview })

    // Act
    const result = await hubExportService.fetchOverview('hub-1')

    // Assert
    expect(http.get).toHaveBeenCalledWith('/api/hub-export/overview/', {
      params: { target_node_key: 'hub-1' }
    })
    expect(result).toBe(overview)
  })

  it('posts canonical camelCase mutation payloads for axios conversion', async () => {
    // Arrange
    http.post.mockResolvedValue({ data: {} })
    const resources = [{ id: 7, resourceKind: 'report' as const }]

    // Act
    await hubExportService.markResources('hub-1', resources)
    await hubExportService.unmarkResources('hub-1', resources)

    // Assert
    const payload = { targetNodeKey: 'hub-1', resources }
    expect(http.post).toHaveBeenNthCalledWith(1, '/api/hub-export/mark/', payload)
    expect(http.post).toHaveBeenNthCalledWith(2, '/api/hub-export/unmark/', payload)
  })

  it('returns bulk offload and stable-job retry results', async () => {
    // Arrange
    const offload = { targetNodeKey: 'hub-1', queuedCount: 2 }
    const jobId = '11111111-1111-1111-1111-111111111111'
    const retry = { outboundJobId: jobId, transferKey: 'transfer-1', localStatus: 'queued' }
    http.post.mockResolvedValueOnce({ data: offload }).mockResolvedValueOnce({ data: retry })

    // Act
    const offloadResult = await hubExportService.offloadEligibleVideos('hub-1')
    const retryResult = await hubExportService.retryFailedJob(jobId)

    // Assert
    expect(http.post).toHaveBeenNthCalledWith(1, '/api/hub-export/offload-eligible-videos/', {
      targetNodeKey: 'hub-1'
    })
    expect(http.post).toHaveBeenNthCalledWith(2, `/api/hub-export/jobs/${jobId}/retry/`)
    expect(offloadResult).toBe(offload)
    expect(retryResult).toBe(retry)
  })

  it('posts video readiness to the media boundary', async () => {
    // Arrange
    http.post.mockResolvedValue({ data: {} })

    // Act
    await hubExportService.checkVideoReadiness({ id: 42, centerKey: 'center-a' })

    // Assert
    expect(http.post).toHaveBeenCalledWith('/api/media/videos/42/mark-ready-for-export/', {
      centerKey: 'center-a'
    })
  })
})
