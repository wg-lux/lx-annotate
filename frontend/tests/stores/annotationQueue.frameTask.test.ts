import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  fetchApplicationSettings: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: mocks.axiosGet
  },
  r: (path: string) => `/api/${path}`
}))

vi.mock('@/api/applicationSettingsApi', () => ({
  fetchApplicationSettings: mocks.fetchApplicationSettings
}))

import { useAnnotationQueueStore } from '@/stores/annotationQueue'

describe('annotationQueue frame task normalization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mocks.axiosGet.mockReset()
    mocks.fetchApplicationSettings.mockResolvedValue({
      aiDatasetName: '',
      aiDatasetType: ''
    })
  })

  it('accepts backend frame_stream_path as the task image URL', async () => {
    const store = useAnnotationQueueStore()
    store.setSelectedLabelGroupId('3')
    store.setTargetLabelName('Polyp')

    mocks.axiosGet.mockResolvedValueOnce({
      data: {
        tasks: [
          {
            frame_id: 101,
            frame_number: 88,
            frame_stream_path: '/api/media/videos/7/frames/88/stream/',
            label_options: [{ id: 11, name: 'Polyp' }],
            suggested_label_ids: [11]
          }
        ]
      }
    })

    const tasks = await store.fetchBatch(10)

    expect(mocks.axiosGet).toHaveBeenCalledWith('/api/media/annotations/frames/random-task/', {
      params: expect.objectContaining({
        label_group_id: '3',
        limit: 10,
        task_mode: 'random',
        target_label: 'Polyp'
      })
    })
    expect(tasks).toHaveLength(1)
    expect(tasks[0].data).toMatchObject({
      frameId: 101,
      imageUrl: '/api/media/videos/7/frames/88/stream/',
      labelOptions: [{ id: 11, name: 'Polyp' }],
      suggestedLabelIds: [11]
    })
    expect(store.popNextTask()?.data.imageUrl).toBe('/api/media/videos/7/frames/88/stream/')
  })

  it('passes dataset sampling criteria to the frame task endpoint', async () => {
    const store = useAnnotationQueueStore()
    store.setSelectedLabelGroupId('3')
    store.setTargetLabelName('Polyp')
    const initialSignature = store.taskQuerySignature
    store.setAiDataset('Dataset B', 'video')
    store.setSamplingStrategy('segments')
    store.setPredictionSegmentsOnly(false)
    expect(store.taskQuerySignature).not.toBe(initialSignature)
    expect(store.taskQuerySignature).toContain('Dataset B|video')

    mocks.axiosGet.mockResolvedValueOnce({
      data: {
        tasks: [
          {
            frame_id: 102,
            frame_stream_path: '/api/media/videos/7/frames/89/stream/',
            label_options: [{ id: 11, name: 'Polyp' }]
          }
        ]
      }
    })

    await store.fetchBatch(5)

    expect(mocks.axiosGet).toHaveBeenCalledWith('/api/media/annotations/frames/random-task/', {
      params: expect.objectContaining({
        label_group_id: '3',
        limit: 5,
        task_mode: 'random',
        target_label: 'Polyp',
        ai_dataset_name: 'Dataset B',
        ai_dataset_type: 'video',
        dataset_frame_filter: 'segments',
        prediction_segments_only: 'false'
      })
    })
  })

  it('falls back to balanced sampling for unknown sampling strategies', async () => {
    const store = useAnnotationQueueStore()
    store.setSelectedLabelGroupId('3')
    store.setSamplingStrategy('not-supported')

    mocks.axiosGet.mockResolvedValueOnce({
      data: {
        task: {
          frame_id: 103,
          frame_stream_path: '/api/media/videos/7/frames/90/stream/'
        }
      }
    })

    await store.fetchBatch(1)

    expect(mocks.axiosGet).toHaveBeenCalledWith('/api/media/annotations/frames/random-task/', {
      params: expect.objectContaining({
        dataset_frame_filter: 'balanced',
        prediction_segments_only: 'true'
      })
    })
  })
})
