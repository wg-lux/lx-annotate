import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { endpoints } from '@/types/api/endpoints'
import { useVideoStore } from '@/stores/videoStore'

const DRAFT_END_SECONDS = 15
const REPLACEMENT_START_SECONDS = 20
const VIDEO_ID = 123
const SAVED_SEGMENT_ID = 456
const DRAFT_START_SECONDS = 10.5

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
    id: VIDEO_ID,
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

    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)
    expect(store.draftSegment).toMatchObject({
      label: 'polyp',
      startTime: DRAFT_START_SECONDS,
      endTime: DRAFT_END_SECONDS
    })

    store.startDraft('outside', REPLACEMENT_START_SECONDS)
    expect(store.draftSegment).toMatchObject({
      label: 'outside',
      startTime: REPLACEMENT_START_SECONDS,
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
              id: SAVED_SEGMENT_ID,
              videoId: VIDEO_ID,
              labelId: 1,
              labelName: 'polyp',
              startTime: DRAFT_START_SECONDS,
              endTime: DRAFT_END_SECONDS,
              startFrameNumber: 315,
              endFrameNumber: 450
            }
          }
        ],
        updated: [],
        deleted: []
      }
    })
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)

    const result = await store.commitDraft()

    expect(axiosPost).toHaveBeenCalledWith(
      endpoints.media.videoSegmentsBulkMutation(VIDEO_ID),
      expect.objectContaining({
        defer_annotation_sync: true,
        creates: [
          expect.objectContaining({
            label_id: 1,
            start_time: DRAFT_START_SECONDS,
            end_time: DRAFT_END_SECONDS,
            export_segment: false
          })
        ]
      })
    )
    expect(result).toMatchObject({
      id: SAVED_SEGMENT_ID,
      videoID: VIDEO_ID,
      labelID: 1,
      label: 'polyp',
      startTime: DRAFT_START_SECONDS,
      endTime: DRAFT_END_SECONDS
    })
    expect(store.draftSegment).toBeNull()
  })

  it('keeps the draft available for retry when persistence fails', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockRejectedValueOnce(new Error('network unavailable'))
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)

    await expect(store.commitDraft()).resolves.toBeNull()

    expect(store.draftSegment).toMatchObject({
      label: 'polyp',
      startTime: DRAFT_START_SECONDS,
      endTime: DRAFT_END_SECONDS
    })
    expect(store.allSegments).toHaveLength(1)
  })

  it('does not persist an incomplete draft', async () => {
    const store = await createStoreWithVideo()
    store.startDraft('polyp', DRAFT_START_SECONDS)

    await expect(store.commitDraft()).resolves.toBeNull()

    expect(axiosPost).not.toHaveBeenCalled()
    expect(store.draftSegment).toMatchObject({
      label: 'polyp',
      startTime: DRAFT_START_SECONDS,
      endTime: null
    })
  })

  it('owns playback promise rejections when jumping to a segment', async () => {
    const store = await createStoreWithVideo()
    store.startDraft('polyp', DRAFT_START_SECONDS)
    const segment = store.allSegments[0]
    const video = document.createElement('video')
    const play = vi.spyOn(video, 'play').mockRejectedValue(new Error('playback unavailable'))

    store.jumpToSegment(segment, video)
    await Promise.resolve()

    expect(video.currentTime).toBe(DRAFT_START_SECONDS)
    expect(play).toHaveBeenCalledOnce()
  })
})
