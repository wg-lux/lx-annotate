import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import axiosInstance from '@/api/axiosInstance'
import { useVideoStore } from '@/stores/videoStore'
import {
  buildSegmentTimestampPayload,
  getAdjacentFrameTimestamp,
  parseVideoFrameNeighborhood,
  requireSegmentTimestampRange
} from '@/utils/segmentTimeline'

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  r: (path: string) => path,
  a: (path: string) => path
}))

describe('segment timeline contract', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('preserves irregular media timestamps without FPS snapping', () => {
    expect(requireSegmentTimestampRange(0.041, 0.109, 2)).toEqual({
      startTime: 0.041,
      endTime: 0.109
    })
    expect(buildSegmentTimestampPayload(0.041, 0.109, 2)).toEqual({
      start_time: 0.041,
      end_time: 0.109
    })
  })

  it('fails closed for invalid timestamp ranges', () => {
    expect(() => requireSegmentTimestampRange(Number.NaN, 1)).toThrow(RangeError)
    expect(() => requireSegmentTimestampRange(1, 1)).toThrow(RangeError)
    expect(() => requireSegmentTimestampRange(1, 3, 2)).toThrow(RangeError)
  })

  it('uses only validated backend PTS for adjacent-frame navigation', () => {
    const neighborhood = parseVideoFrameNeighborhood({
      videoId: 17,
      requestedTimestamp: 0.12,
      timelineVersion: 'pts_v1',
      timestampMapping: 'ffprobe_pts',
      previous: { frameNumber: 1, timestamp: 0.04 },
      current: { frameNumber: 2, timestamp: 0.11 },
      next: { frameNumber: 3, timestamp: 0.16 },
      frames: [
        { frameNumber: 0, timestamp: 0 },
        { frameNumber: 1, timestamp: 0.04 },
        { frameNumber: 2, timestamp: 0.11 },
        { frameNumber: 3, timestamp: 0.16 },
        { frameNumber: 4, timestamp: 0.24 }
      ]
    })

    expect(getAdjacentFrameTimestamp(neighborhood, -1)).toBe(0.04)
    expect(getAdjacentFrameTimestamp(neighborhood, 1)).toBe(0.16)
    expect(() =>
      parseVideoFrameNeighborhood({
        ...neighborhood,
        next: { frameNumber: 3, timestamp: 0.1 }
      })
    ).toThrow(TypeError)
  })

  it('requests the canonical frame neighborhood without an FPS fallback', async () => {
    const store = useVideoStore()
    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: {
        videoId: 17,
        requestedTimestamp: 0.12,
        timelineVersion: 'pts_v1',
        timestampMapping: 'ffprobe_pts',
        previous: { frameNumber: 1, timestamp: 0.04 },
        current: { frameNumber: 2, timestamp: 0.11 },
        next: { frameNumber: 3, timestamp: 0.16 },
        frames: [
          { frameNumber: 0, timestamp: 0 },
          { frameNumber: 1, timestamp: 0.04 },
          { frameNumber: 2, timestamp: 0.11 },
          { frameNumber: 3, timestamp: 0.16 },
          { frameNumber: 4, timestamp: 0.24 }
        ]
      }
    })

    await expect(store.resolveAdjacentFrameTimestamp(17, 0.12, 1)).resolves.toBe(0.16)
    await expect(store.resolveAdjacentFrameTimestamp(17, 0.16, 1)).resolves.toBe(0.24)
    expect(axiosInstance.get).toHaveBeenCalledWith(
      'media/videos/17/timeline/frame-neighborhood/',
      { params: { timestamp: 0.12, radius: 12 }, suppressErrorToast: true }
    )
    expect(axiosInstance.get).toHaveBeenCalledTimes(1)
  })

  it('sends timestamps and adopts canonical PTS-derived boundaries from the backend', async () => {
    const store = useVideoStore()
    store.setVideo({
      id: 17,
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

    vi.mocked(axiosInstance.get).mockResolvedValueOnce({
      data: [{ id: 4, name: 'polyp', color: '#ff0000' }]
    })
    await store.fetchLabels()

    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: {
        created: [
          {
            clientId: -1,
            segment: {
              id: 91,
              videoId: 17,
              labelId: 4,
              labelName: 'polyp',
              startTime: 0.043,
              endTime: 0.112,
              startFrameNumber: 1,
              endFrameNumber: 3
            }
          }
        ],
        updated: [],
        deleted: []
      }
    })

    const created = await store.createSegment(17, 'polyp', 0.041, 0.109)
    const payload = vi.mocked(axiosInstance.post).mock.calls[0][1] as {
      creates: Array<Record<string, unknown>>
    }

    expect(payload).toMatchObject({
      defer_annotation_sync: true,
      creates: [
        {
          label_id: 4,
          start_time: 0.041,
          end_time: 0.109,
          export_segment: false
        }
      ]
    })
    expect(payload.creates[0]).not.toHaveProperty('start_frame_number')
    expect(payload.creates[0]).not.toHaveProperty('end_frame_number')
    expect(created).toMatchObject({
      id: 91,
      startTime: 0.043,
      endTime: 0.112,
      startFrameNumber: 1,
      endFrameNumber: 3
    })

    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: {
        created: [],
        updated: [
          {
            id: 91,
            videoId: 17,
            labelId: 4,
            labelName: 'polyp',
            startTime: 0.059,
            endTime: 0.137,
            startFrameNumber: 2,
            endFrameNumber: 4
          }
        ],
        deleted: []
      }
    })

    const updated = await store.updateSegmentAPI(91, {
      startTime: 0.057,
      endTime: 0.131,
      start_frame_number: 999,
      end_frame_number: 1000
    })
    const updatePayload = vi.mocked(axiosInstance.post).mock.calls[1][1] as {
      updates: Array<Record<string, unknown>>
    }

    expect(updated).toBe(true)
    expect(updatePayload.updates[0]).toMatchObject({
      id: 91,
      start_time: 0.057,
      end_time: 0.131
    })
    expect(updatePayload.updates[0]).not.toHaveProperty('start_frame_number')
    expect(updatePayload.updates[0]).not.toHaveProperty('end_frame_number')
    expect(store.segmentsByLabel.polyp[0]).toMatchObject({
      startTime: 0.059,
      endTime: 0.137,
      startFrameNumber: 2,
      endFrameNumber: 4
    })
  })
})
