import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { endpoints } from '@/types/api/endpoints'
import { useVideoStore } from '@/stores/videoStore'

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

async function createStoreWithVideo() {
  const store = useVideoStore()
  store.setVideo({
    id: 123,
    isAnnotated: false,
    errorMessage: '',
    segments: [],
    videoUrl: '',
    status: 'available',
    assignedUser: null,
    duration: 60,
    fps: 30,
    frameCount: 1800
  })
  axiosGet.mockResolvedValueOnce({
    data: [{ id: 1, name: 'polyp', color: '#ff0000' }]
  })
  await store.fetchLabels()
  return store
}

describe('VideoStore segment drafts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('starts, updates, replaces, and cancels a draft locally', async () => {
    const store = await createStoreWithVideo()

    store.startDraft('polyp', 10.5)
    store.updateDraftEnd(15)
    expect(store.draftSegment).toMatchObject({
      label: 'polyp',
      startTime: 10.5,
      endTime: 15
    })

    store.startDraft('outside', 20)
    expect(store.draftSegment).toMatchObject({
      label: 'outside',
      startTime: 20,
      endTime: null
    })

    store.cancelDraft()
    expect(store.draftSegment).toBeNull()
  })

  it('persists a complete draft through the bulk segment boundary', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockResolvedValueOnce({
      data: {
        created: [
          {
            segment: {
              id: 456,
              videoId: 123,
              labelId: 1,
              labelName: 'polyp',
              startTime: 10.5,
              endTime: 15,
              startFrameNumber: 315,
              endFrameNumber: 450
            }
          }
        ],
        updated: [],
        deleted: []
      }
    })
    store.startDraft('polyp', 10.5)
    store.updateDraftEnd(15)

    const result = await store.commitDraft()

    expect(axiosPost).toHaveBeenCalledWith(
      endpoints.media.videoSegmentsBulkMutation(123),
      expect.objectContaining({
        defer_annotation_sync: true,
        creates: [
          expect.objectContaining({
            label_id: 1,
            start_time: 10.5,
            end_time: 15,
            export_segment: false
          })
        ]
      })
    )
    expect(result).toMatchObject({
      id: 456,
      videoID: 123,
      labelID: 1,
      label: 'polyp',
      startTime: 10.5,
      endTime: 15
    })
    expect(store.draftSegment).toBeNull()
  })

  it('keeps the draft available for retry when persistence fails', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockRejectedValueOnce(new Error('network unavailable'))
    store.startDraft('polyp', 10.5)
    store.updateDraftEnd(15)

    await expect(store.commitDraft()).resolves.toBeNull()

    expect(store.draftSegment).toMatchObject({
      label: 'polyp',
      startTime: 10.5,
      endTime: 15
    })
    expect(store.allSegments).toHaveLength(1)
  })

  it('does not persist an incomplete draft', async () => {
    const store = await createStoreWithVideo()
    store.startDraft('polyp', 10.5)

    await expect(store.commitDraft()).resolves.toBeNull()

    expect(axiosPost).not.toHaveBeenCalled()
    expect(store.draftSegment).toMatchObject({
      label: 'polyp',
      startTime: 10.5,
      endTime: null
    })
  })

  it('owns playback promise rejections when jumping to a segment', async () => {
    const store = await createStoreWithVideo()
    store.startDraft('polyp', 10.5)
    const segment = store.allSegments[0]
    const video = document.createElement('video')
    const play = vi.spyOn(video, 'play').mockRejectedValue(new Error('playback unavailable'))

    store.jumpToSegment(segment, video)
    await Promise.resolve()

    expect(video.currentTime).toBe(10.5)
    expect(play).toHaveBeenCalledOnce()
  })
})
