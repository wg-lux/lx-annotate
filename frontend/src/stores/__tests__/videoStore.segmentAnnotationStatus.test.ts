import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { endpoints } from '@/types/api/endpoints'
import { useVideoStore } from '@/stores/videoStore'

const CLEANUP_VIDEO_ID = 25
const REBUILD_JOB_ID = 9
const LEGACY_VALIDATED_VIDEO_ID = 31
const SEGMENT_VIDEO_ID = 7
const SEGMENT_DATASET_ID = 300
const VIDEO_DURATION_SECONDS = 10
const VIDEO_FRAMES_PER_SECOND = 50
const VIDEO_FRAME_COUNT = 500

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
            id: CLEANUP_VIDEO_ID,
            original_file_name: 'case-25.mp4',
            center_name: 'Center A',
            status: 'completed',
            segment_annotations_validated: false,
            processor_name: 'processor-x',
            segment_annotation_status: 'cleanup_running',
            outside_segments_removed: false,
            post_validation_rebuild: {
              id: REBUILD_JOB_ID,
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
      id: CLEANUP_VIDEO_ID,
      segmentAnnotationsValidated: false,
      segmentAnnotationStatus: 'cleanup_running',
      outsideSegmentsRemoved: false,
      postValidationRebuild: {
        id: REBUILD_JOB_ID,
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
            id: LEGACY_VALIDATED_VIDEO_ID,
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
      id: LEGACY_VALIDATED_VIDEO_ID,
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
      id: SEGMENT_VIDEO_ID,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: VIDEO_DURATION_SECONDS,
      fps: VIDEO_FRAMES_PER_SECOND,
      frameCount: VIDEO_FRAME_COUNT
    })
    store.setSegmentAiDatasetId(SEGMENT_DATASET_ID)

    axiosPost.mockResolvedValue({
      data: {
        created: [
          {
            clientId: -1,
            segment: {
              id: 50,
              videoId: SEGMENT_VIDEO_ID,
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

    await store.createSegment(SEGMENT_VIDEO_ID, 'outside', 0, 1)

    expect(axiosPost).toHaveBeenCalledWith(
      endpoints.media.videoSegmentsBulkMutation(SEGMENT_VIDEO_ID),
      expect.objectContaining({
        aiDatasetId: SEGMENT_DATASET_ID
      })
    )
  })

  it('maps metadata anonymization statuses to compatible frontend status enum', async () => {
    const store = useVideoStore()

    store.setVideo({
      id: SEGMENT_VIDEO_ID,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: VIDEO_DURATION_SECONDS,
      fps: VIDEO_FRAMES_PER_SECOND,
      frameCount: VIDEO_FRAME_COUNT
    })

    axiosGet.mockResolvedValueOnce({
      data: {
        id: SEGMENT_VIDEO_ID,
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
      duration: VIDEO_DURATION_SECONDS,
      fps: VIDEO_FRAMES_PER_SECOND,
      frameCount: VIDEO_FRAME_COUNT
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
        fps: VIDEO_FRAMES_PER_SECOND,
        resolution: '1280x720'
      }
    })

    await store.fetchVideoMetadata()

    expect(store.currentVideo?.status).toBe('in_progress')
  })
})
