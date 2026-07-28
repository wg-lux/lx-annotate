import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { backendSegmentToSegment, useVideoStore } from '@/stores/videoStore'
import axiosInstance from '@/api/axiosInstance'

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

describe('VideoStore Performance Optimization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads videos and segments from the list request (fixes N+1 problem)', async () => {
    const store = useVideoStore()

    const mockLabels = [
      { id: 1, name: 'polyp', color: '#ff0000' },
      { id: 2, name: 'instrument', color: '#00ff00' }
    ]

    const mockVideosResponse = {
      results: [
        {
          id: 101,
          original_file_name: 'Video A',
          center_key: 'north',
          center_name: 'Center North',
          status: 'available',
          validated_annotators: ['reviewer-one'],
          segments: [
            {
              id: 500,
              labelId: 1,
              labelName: 'polyp',
              startTime: 10.5,
              endTime: 20.0,
              startFrameNumber: 525,
              endFrameNumber: 1000
            }
          ]
        },
        {
          id: 102,
          center_key: 'south',
          center_name: 'Center South',
          status: 'available',
          segments: []
        }
      ]
    }

    const axiosGet = axiosInstance.get as unknown as ReturnType<typeof vi.fn>

    axiosGet.mockResolvedValueOnce({ data: mockLabels })
    axiosGet.mockResolvedValueOnce({ data: mockVideosResponse })

    await store.fetchAllVideos()

    expect(store.videoList.videos.length).toBe(2)

    const videoA = store.videoList.videos.find((video) => video.id === 101)
    expect(videoA).toBeDefined()
    expect(videoA?.validatedAnnotators).toEqual(['reviewer-one'])
    expect(videoA?.centerKey).toBe('north')
    expect(videoA?.centerName).toBe('Center North')
    expect(videoA?.segments?.length).toBe(1)
    expect(videoA?.segments?.[0].label).toBe('polyp')
    expect(videoA?.segments?.[0].startTime).toBe(10.5)

    const videoB = store.videoList.videos.find((video) => video.id === 102)
    expect(videoB?.original_file_name).toBe('Video 102')
    expect(videoB?.centerKey).toBe('south')
    expect(videoB?.centerName).toBe('Center South')
    expect(videoB?.segments?.length).toBe(0)

    expect(axiosGet).toHaveBeenCalledTimes(2)
    expect(axiosGet).toHaveBeenNthCalledWith(1, 'media/videos/labels/list/')
    expect(axiosGet).toHaveBeenNthCalledWith(2, 'media/videos/')

    const calls = axiosGet.mock.calls.map((call) => call[0])
    const segmentCalls = calls.filter((url) => url.includes('/segments/'))

    expect(segmentCalls.length).toBe(0)
  })

  it('reuses loaded labels when refreshing the video list', async () => {
    const store = useVideoStore()
    const axiosGet = axiosInstance.get as unknown as ReturnType<typeof vi.fn>

    axiosGet
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })

    await store.fetchAllVideos()
    await store.fetchAllVideos()

    expect(axiosGet.mock.calls.map((call) => call[0])).toEqual([
      'media/videos/labels/list/',
      'media/videos/',
      'media/videos/'
    ])
  })

  it('starts the video-list request without waiting for labels to finish', async () => {
    const store = useVideoStore()
    const axiosGet = axiosInstance.get as unknown as ReturnType<typeof vi.fn>
    let resolveLabels!: (value: { data: unknown[] }) => void
    const labelsResponse = new Promise<{ data: unknown[] }>((resolve) => {
      resolveLabels = resolve
    })
    axiosGet.mockImplementation((url: string) => {
      if (url === 'media/videos/labels/list/') return labelsResponse
      if (url === 'media/videos/') return Promise.resolve({ data: { results: [] } })
      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })

    const request = store.fetchAllVideos()
    await Promise.resolve()

    expect(axiosGet).toHaveBeenCalledWith('media/videos/labels/list/')
    expect(axiosGet).toHaveBeenCalledWith('media/videos/')

    resolveLabels({ data: [] })
    await request
  })

  it('normalizes prediction segment origin metadata from the backend', () => {
    const segment = backendSegmentToSegment({
      id: 700,
      labelName: 'outside',
      startTime: 12,
      endTime: 18,
      startFrameNumber: 300,
      endFrameNumber: 450,
      source_name: 'prediction',
      segment_origin: 'prediction',
      prediction_meta_id: 44
    })

    expect(segment.segmentOrigin).toBe('prediction')
    expect(segment.sourceName).toBe('prediction')
    expect(segment.predictionMetaId).toBe(44)
  })

  it('normalizes prediction corrections as a separate segment origin', () => {
    const segment = backendSegmentToSegment({
      id: 702,
      labelName: 'outside',
      startTime: 12,
      endTime: 18,
      source_name: 'prediction_correction',
      segment_origin: 'manual'
    })

    expect(segment.segmentOrigin).toBe('prediction_correction')
    expect(segment.sourceName).toBe('prediction_correction')
  })

  it('normalizes raw snake_case video segment payloads', () => {
    const segment = backendSegmentToSegment({
      id: 701,
      video_id: 101,
      label_id: 2,
      label_name: 'blood',
      start_time: 1.5,
      end_time: 3,
      start_frame_number: 75,
      end_frame_number: 150,
      export_segment: true,
      source_name: 'prediction',
      prediction_meta_id: 8
    })

    expect(segment).toMatchObject({
      id: 701,
      videoID: 101,
      labelID: 2,
      label: 'blood',
      startTime: 1.5,
      endTime: 3,
      startFrameNumber: 75,
      endFrameNumber: 150,
      exportSegment: true,
      sourceName: 'prediction',
      segmentOrigin: 'prediction',
      predictionMetaId: 8
    })
  })

  it('indexes nested time-segment frames by frame id', () => {
    const segment = backendSegmentToSegment({
      id: 702,
      videoId: 101,
      labelId: 2,
      labelName: 'polyp',
      startTime: 2,
      endTime: 4,
      timeSegments: {
        segmentId: 702,
        segmentStart: 100,
        segmentEnd: 200,
        startTime: 2,
        endTime: 4,
        frames: [
          {
            frameId: 100,
            frameFilename: 'frame_0100.jpg',
            frameFilePath: 'frames/frame_0100.jpg',
            frameUrl: '/media/frames/frame_0100.jpg',
            allClassifications: [],
            predictions: [],
            manualAnnotations: []
          }
        ]
      }
    })

    expect(segment.frames).toEqual({
      '100': expect.objectContaining({
        frameId: 100,
        frameFilename: 'frame_0100.jpg'
      })
    })
  })

  it('passes source_kind when loading a non-default segment source', async () => {
    const store = useVideoStore()
    const axiosGet = axiosInstance.get as unknown as ReturnType<typeof vi.fn>

    axiosGet.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          labelName: 'outside',
          startTime: 1,
          endTime: 2,
          startFrameNumber: 25,
          endFrameNumber: 50,
          source_name: 'prediction',
          segment_origin: 'prediction'
        }
      ]
    })

    store.setCurrentVideo(101)
    await store.fetchAllSegments(101, true, { sourceKind: 'prediction' })

    expect(axiosGet).toHaveBeenCalledWith(
      'media/videos/101/segments/',
      expect.objectContaining({
        params: { source_kind: 'prediction' }
      })
    )
    expect(store.currentVideo?.segments?.[0]?.segmentOrigin).toBe('prediction')
  })

  it('loads prediction model options for KI reruns', async () => {
    const store = useVideoStore()
    const axiosGet = axiosInstance.get as unknown as ReturnType<typeof vi.fn>

    axiosGet.mockResolvedValueOnce({
      data: {
        models: [
          {
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
          }
        ],
        defaultHuggingfaceModelId: 'wg-lux/custom-segmentation',
        defaultModelName: 'segmentation-model',
        defaultLabelsetName: 'colon-labels',
        huggingfaceModels: []
      }
    })

    const models = await store.fetchPredictionModels()

    expect(axiosGet).toHaveBeenCalledWith('media/videos/prediction-models/list/')
    expect(models).toHaveLength(1)
    expect(store.predictionModels[0]?.id).toBe(7)
    expect(store.defaultHuggingfaceModelId).toBe('wg-lux/custom-segmentation')
    expect(store.defaultPredictionLabelsetName).toBe('colon-labels')
  })

  it('reruns prediction segments and reloads prediction source rows', async () => {
    const store = useVideoStore()
    const axiosGet = axiosInstance.get as unknown as ReturnType<typeof vi.fn>
    const axiosPost = axiosInstance.post as unknown as ReturnType<typeof vi.fn>
    const payload = {
      hfModelId: 'wg-lux/custom-segmentation',
      labelsetName: 'colon-labels',
      replacePredictionSegments: true
    }

    axiosPost.mockResolvedValueOnce({
      data: {
        success: true,
        status: 'completed',
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
        deletedPredictionSegments: 2,
        predictionSegmentsCount: 1,
        job: {
          taskId: 'completed-task',
          historyId: 9,
          mode: 'inline',
          queue: 'inference'
        }
      }
    })
    axiosGet.mockResolvedValueOnce({
      data: [
        {
          id: 501,
          labelName: 'outside',
          startTime: 3,
          endTime: 8,
          startFrameNumber: 75,
          endFrameNumber: 200,
          source_name: 'prediction',
          segment_origin: 'prediction',
          prediction_meta_id: 7
        }
      ]
    })

    store.setCurrentVideo(101)
    const response = await store.rerunPredictionSegments(101, payload)

    expect(axiosPost).toHaveBeenCalledWith('media/videos/101/segments/rerun-predictions/', payload)
    expect(axiosGet).toHaveBeenCalledWith(
      'media/videos/101/segments/',
      expect.objectContaining({
        params: { source_kind: 'prediction' }
      })
    )
    expect(response.predictionSegmentsCount).toBe(1)
    expect(store.currentVideo?.segments?.[0]?.predictionMetaId).toBe(7)
    expect(store.currentVideo?.segments?.[0]?.segmentOrigin).toBe('prediction')
  })
})
