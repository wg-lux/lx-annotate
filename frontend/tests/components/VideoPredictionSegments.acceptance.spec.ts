import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import { useVideoStore } from '@/stores/videoStore'

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn()
  },
  r: (path: string) => path,
  a: (path: string) => path
}))

describe('AI prediction segment acceptance', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps queued inference pending and does not reload stale prediction rows', async () => {
    const store = useVideoStore()
    const axiosPost = axiosInstance.post as unknown as ReturnType<typeof vi.fn>
    const axiosGet = axiosInstance.get as unknown as ReturnType<typeof vi.fn>
    axiosPost.mockResolvedValueOnce({
      data: {
        success: true,
        status: 'queued',
        queued: true,
        pending: false,
        videoId: 101,
        modelMeta: {
          id: 7,
          name: 'segmentation-meta',
          version: '3',
          modelName: 'segmentation-model',
          aiModelId: 5,
          labelsetName: 'colon-labels',
          labelsetVersion: 1,
          labelsetId: 9,
          weightsAvailable: true,
          isActive: true
        },
        job: {
          taskId: 'temporal-task',
          historyId: 123,
          mode: 'celery',
          queue: 'inference'
        },
        deletedPredictionSegments: null,
        predictionSegmentsCount: 4
      }
    })
    axiosGet.mockResolvedValue({ data: [] })
    store.setCurrentVideo(101)

    const response = await store.rerunPredictionSegments(101, {
      modelMetaId: 7,
      replacePredictionSegments: true
    })

    expect(response).toMatchObject({
      status: 'queued',
      queued: true,
      job: { historyId: 123 }
    })
    expect(axiosGet).not.toHaveBeenCalled()
  })
})
