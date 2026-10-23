import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useVideoStore } from '@/stores/videoStore'

const axiosMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: axiosMocks,
  r: (path: string) => path,
  a: (path: string) => path
}))

const axiosGet = axiosMocks.get
const axiosPost = axiosMocks.post

describe('AI prediction segment acceptance', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('keeps queued inference pending and does not reload stale prediction rows', async () => {
    const store = useVideoStore()
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
