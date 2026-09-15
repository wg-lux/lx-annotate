import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVideoStore } from '@/stores/videoStore'
import {
  buildSegmentTimestampPayload,
  getAdjacentFrameTimestamp,
  parseVideoFrameNeighborhood,
  requireSegmentTimestampRange
} from '@/utils/segmentTimeline'

const VIDEO_ID = 17
const SEGMENT_ID = 91
const REQUESTED_START_SECONDS = 0.041
const REQUESTED_END_SECONDS = 0.109
const CANONICAL_START_SECONDS = 0.043
const CANONICAL_END_SECONDS = 0.112
const UPDATED_START_SECONDS = 0.057
const UPDATED_END_SECONDS = 0.131
const CANONICAL_UPDATED_START_SECONDS = 0.059
const CANONICAL_UPDATED_END_SECONDS = 0.137
const PREVIOUS_FRAME_SECONDS = 0.04
const CURRENT_FRAME_SECONDS = 0.11
const NEXT_FRAME_SECONDS = 0.16
const FOLLOWING_FRAME_SECONDS = 0.24
const REQUESTED_FRAME_SECONDS = 0.12

const axiosMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: axiosMocks,
  r: (path: string) => path,
  a: (path: string) => path
}))

const axiosGet = axiosMocks.get
const axiosPost = axiosMocks.post

describe('segment timeline contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('preserves irregular media timestamps without FPS snapping', () => {
    expect(requireSegmentTimestampRange(REQUESTED_START_SECONDS, REQUESTED_END_SECONDS, 2)).toEqual(
      {
        startTime: REQUESTED_START_SECONDS,
        endTime: REQUESTED_END_SECONDS
      }
    )
    expect(buildSegmentTimestampPayload(REQUESTED_START_SECONDS, REQUESTED_END_SECONDS, 2)).toEqual(
      {
        start_time: REQUESTED_START_SECONDS,
        end_time: REQUESTED_END_SECONDS
      }
    )
  })

  it('fails closed for invalid timestamp ranges', () => {
    expect(() => requireSegmentTimestampRange(Number.NaN, 1)).toThrow(RangeError)
    expect(() => requireSegmentTimestampRange(1, 1)).toThrow(RangeError)
    expect(() => requireSegmentTimestampRange(1, 3, 2)).toThrow(RangeError)
  })

  it('uses only validated backend PTS for adjacent-frame navigation', () => {
    const neighborhood = parseVideoFrameNeighborhood({
      videoId: VIDEO_ID,
      requestedTimestamp: REQUESTED_FRAME_SECONDS,
      timelineVersion: 'pts_v1',
      timestampMapping: 'ffprobe_pts',
      previous: { frameNumber: 1, timestamp: PREVIOUS_FRAME_SECONDS },
      current: { frameNumber: 2, timestamp: CURRENT_FRAME_SECONDS },
      next: { frameNumber: 3, timestamp: NEXT_FRAME_SECONDS },
      frames: [
        { frameNumber: 0, timestamp: 0 },
        { frameNumber: 1, timestamp: PREVIOUS_FRAME_SECONDS },
        { frameNumber: 2, timestamp: CURRENT_FRAME_SECONDS },
        { frameNumber: 3, timestamp: NEXT_FRAME_SECONDS },
        { frameNumber: 4, timestamp: FOLLOWING_FRAME_SECONDS }
      ]
    })

    expect(getAdjacentFrameTimestamp(neighborhood, -1)).toBe(PREVIOUS_FRAME_SECONDS)
    expect(getAdjacentFrameTimestamp(neighborhood, 1)).toBe(NEXT_FRAME_SECONDS)
    expect(() =>
      parseVideoFrameNeighborhood({
        ...neighborhood,
        next: { frameNumber: 3, timestamp: 0.1 }
      })
    ).toThrow(TypeError)
  })

  it('requests the canonical frame neighborhood without an FPS fallback', async () => {
    const store = useVideoStore()
    axiosGet.mockResolvedValueOnce({
      data: {
        videoId: VIDEO_ID,
        requestedTimestamp: REQUESTED_FRAME_SECONDS,
        timelineVersion: 'pts_v1',
        timestampMapping: 'ffprobe_pts',
        previous: { frameNumber: 1, timestamp: PREVIOUS_FRAME_SECONDS },
        current: { frameNumber: 2, timestamp: CURRENT_FRAME_SECONDS },
        next: { frameNumber: 3, timestamp: NEXT_FRAME_SECONDS },
        frames: [
          { frameNumber: 0, timestamp: 0 },
          { frameNumber: 1, timestamp: PREVIOUS_FRAME_SECONDS },
          { frameNumber: 2, timestamp: CURRENT_FRAME_SECONDS },
          { frameNumber: 3, timestamp: NEXT_FRAME_SECONDS },
          { frameNumber: 4, timestamp: FOLLOWING_FRAME_SECONDS }
        ]
      }
    })

    await expect(
      store.resolveAdjacentFrameTimestamp(VIDEO_ID, REQUESTED_FRAME_SECONDS, 1)
    ).resolves.toBe(NEXT_FRAME_SECONDS)
    await expect(
      store.resolveAdjacentFrameTimestamp(VIDEO_ID, NEXT_FRAME_SECONDS, 1)
    ).resolves.toBe(FOLLOWING_FRAME_SECONDS)
    expect(axiosGet).toHaveBeenCalledWith('media/videos/17/timeline/frame-neighborhood/', {
      params: { timestamp: REQUESTED_FRAME_SECONDS, radius: 12 },
      suppressErrorToast: true
    })
    expect(axiosGet).toHaveBeenCalledTimes(1)
  })

  it('sends timestamps and adopts canonical PTS-derived boundaries from the backend', async () => {
    const store = useVideoStore()
    store.setVideo({
      id: VIDEO_ID,
      isAnnotated: false,
      errorMessage: '',
      segments: [],
      videoUrl: '',
      status: 'available',
      assignedUser: null,
      duration: 2,
      fps: 29.97,
      frameCount: 60
    })

    axiosGet.mockResolvedValueOnce({
      data: [{ id: 4, name: 'polyp', color: '#ff0000' }]
    })
    await store.fetchLabels()

    axiosPost.mockResolvedValueOnce({
      data: {
        created: [
          {
            clientId: -1,
            segment: {
              id: SEGMENT_ID,
              videoId: VIDEO_ID,
              labelId: 4,
              labelName: 'polyp',
              startTime: CANONICAL_START_SECONDS,
              endTime: CANONICAL_END_SECONDS,
              startFrameNumber: 1,
              endFrameNumber: 3
            }
          }
        ],
        updated: [],
        deleted: []
      }
    })

    const created = await store.createSegment(
      VIDEO_ID,
      'polyp',
      REQUESTED_START_SECONDS,
      REQUESTED_END_SECONDS
    )
    const payload = axiosPost.mock.calls[0][1] as {
      creates: Array<Record<string, unknown>>
    }

    expect(payload).toMatchObject({
      defer_annotation_sync: true,
      creates: [
        {
          label_id: 4,
          start_time: REQUESTED_START_SECONDS,
          end_time: REQUESTED_END_SECONDS,
          export_segment: false
        }
      ]
    })
    expect(payload.creates[0]).not.toHaveProperty('start_frame_number')
    expect(payload.creates[0]).not.toHaveProperty('end_frame_number')
    expect(created).toMatchObject({
      id: SEGMENT_ID,
      startTime: CANONICAL_START_SECONDS,
      endTime: CANONICAL_END_SECONDS,
      startFrameNumber: 1,
      endFrameNumber: 3
    })

    axiosPost.mockResolvedValueOnce({
      data: {
        created: [],
        updated: [
          {
            id: SEGMENT_ID,
            videoId: VIDEO_ID,
            labelId: 4,
            labelName: 'polyp',
            startTime: CANONICAL_UPDATED_START_SECONDS,
            endTime: CANONICAL_UPDATED_END_SECONDS,
            startFrameNumber: 2,
            endFrameNumber: 4
          }
        ],
        deleted: []
      }
    })

    const updated = await store.updateSegmentAPI(SEGMENT_ID, {
      startTime: UPDATED_START_SECONDS,
      endTime: UPDATED_END_SECONDS,
      start_frame_number: 999,
      end_frame_number: 1000
    })
    const updatePayload = axiosPost.mock.calls[1][1] as {
      updates: Array<Record<string, unknown>>
    }

    expect(updated).toBe(true)
    expect(updatePayload.updates[0]).toMatchObject({
      id: SEGMENT_ID,
      start_time: UPDATED_START_SECONDS,
      end_time: UPDATED_END_SECONDS
    })
    expect(updatePayload.updates[0]).not.toHaveProperty('start_frame_number')
    expect(updatePayload.updates[0]).not.toHaveProperty('end_frame_number')
    expect(store.segmentsByLabel.polyp[0]).toMatchObject({
      startTime: CANONICAL_UPDATED_START_SECONDS,
      endTime: CANONICAL_UPDATED_END_SECONDS,
      startFrameNumber: 2,
      endFrameNumber: 4
    })
  })
})
