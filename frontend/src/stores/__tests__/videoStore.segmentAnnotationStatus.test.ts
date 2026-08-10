import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { endpoints } from '@/types/api/endpoints'
import { useVideoStore } from '@/stores/videoStore'

function resolvedData<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data })
}

const axiosMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: axiosMocks,
  r: (path: string) => path
}))

const axiosGet = axiosMocks.get
const axiosPost = axiosMocks.post

describe('VideoStore segment annotation status mapping', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('maps cleanup status fields from snake_case API responses', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === endpoints.media.videoLabelsList) {
        return resolvedData([])
      }
      if (url === endpoints.media.videos) {
        return resolvedData([
            {
              id: 25,
              original_file_name: 'case-25.mp4',
              center_name: 'Center A',
              status: 'completed',
              segment_annotations_validated: false,
              processor_name: 'processor-x',
              segment_annotation_status: 'cleanup_running',
              outside_segments_removed: false,
              post_validation_rebuild: {
                id: 9,
                status: 'running',
                task_id: 'task-9',
                details: 'extracting frames'
              }
            }
          ])
      }
      return resolvedData({})
    })

    const store = useVideoStore()
    const result = await store.fetchAllVideos()

    expect(result.videos[0]).toMatchObject({
      id: 25,
      segmentAnnotationsValidated: false,
      segmentAnnotationStatus: 'cleanup_running',
      outsideSegmentsRemoved: false,
      postValidationRebuild: {
        id: 9,
        status: 'running',
        task_id: 'task-9',
        details: 'extracting frames'
      }
    })
  })

  it('defaults legacy validated videos to validated segment status', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === endpoints.media.videoLabelsList) {
        return resolvedData([])
      }
      if (url === endpoints.media.videos) {
        return resolvedData([
            {
              id: 31,
              original_file_name: 'legacy-validated.mp4',
              center_name: 'Center B',
              status: 'available',
              processor_name: 'processor-x',
              segment_annotations_validated: true
            }
          ])
      }
      return resolvedData({})
    })

    const store = useVideoStore()
    const result = await store.fetchAllVideos()

    expect(result.videos[0]).toMatchObject({
      id: 31,
      segmentAnnotationsValidated: true,
      segmentAnnotationStatus: 'validated'
    })
  })

  it('adds the selected ai dataset id to segment bulk mutation payloads', async () => {
    axiosGet.mockImplementation((url: string) => {
      if (url === endpoints.media.videoLabelsList) {
        return resolvedData([{ id: 2, name: 'outside' }])
      }
      return resolvedData({})
    })
    const store = useVideoStore()
    await store.fetchLabels()
    store.setVideo({
      id: 7,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: 10,
      fps: 50,
      frameCount: 500
    })
    store.setSegmentAiDatasetId(300)

    axiosPost.mockResolvedValue({
      data: {
        created: [
          {
            clientId: -1,
            segment: {
              id: 50,
              videoId: 7,
              labelId: 2,
              labelName: 'outside',
              startTime: 0,
              endTime: 1,
              startFrameNumber: 0,
              endFrameNumber: 50
            }
          }
        ],
        updated: [],
        deleted: []
      }
    })

    await store.createSegment(7, 'outside', 0, 1)

    expect(axiosPost).toHaveBeenCalledWith(
      endpoints.media.videoSegmentsBulkMutation(7),
      expect.objectContaining({
        aiDatasetId: 300
      })
    )
  })

  it('maps metadata anonymization statuses to compatible frontend status enum', async () => {
    const store = useVideoStore()

    store.setVideo({
      id: 7,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: 10,
      fps: 50,
      frameCount: 500
    })

    axiosGet.mockResolvedValueOnce({
      data: {
        id: 7,
        original_file_name: 'meta.mp4',
        center_name: 'Center A',
        processor_name: 'processor-x',
        status: 'done_processing_anonymization',
        anonymized: true,
        assigned_user: 'BLANK',
        has_roi: false,
        outside_frame_count: 0,
        duration: 12.5,
        fps: 25,
        total_frames: 1200,
        sensitive_ratio: 0.2,
        resolution: '1280x720'
      }
    })

    await store.fetchVideoMetadata()

    expect(store.currentVideo?.status).toBe('completed')
    expect(store.currentVideo?.assignedUser).toBeNull()
  })

  it('maps metadata status not_started to in_progress', async () => {
    const store = useVideoStore()

    store.setVideo({
      id: 8,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: 10,
      fps: 50,
      frameCount: 500
    })

    axiosGet.mockResolvedValueOnce({
      data: {
        id: 8,
        original_file_name: 'meta-not-started.mp4',
        center_name: 'Center B',
        processor_name: 'processor-y',
        status: 'not_started',
        anonymized: false,
        assigned_user: 'BLANK',
        has_roi: false,
        outside_frame_count: 2,
        duration: 8,
        fps: 50,
        resolution: '1280x720'
      }
    })

    await store.fetchVideoMetadata()

    expect(store.currentVideo?.status).toBe('in_progress')
  })
})
