import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError } from 'axios'

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

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function createdResponse() {
  return {
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
  }
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
  it('shares one pending creation and locks draft boundaries until it completes', async () => {
    const store = await createStoreWithVideo()
    const request = deferred<ReturnType<typeof createdResponse>>()
    axiosPost.mockReturnValueOnce(request.promise)
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)
    const draftId = store.draftSegment?.id
    if (draftId === undefined) throw new Error('Draft missing')
    const first = store.commitDraft()
    store.updateDraftEnd(25)
    store.patchDraftSegment(draftId, { startTime: 20 })
    const second = store.commitDraft()
    expect(store.isDraftSaving).toBe(true)
    expect(axiosPost).toHaveBeenCalledTimes(1)
    expect(store.draftSegment).toMatchObject({
      startTime: DRAFT_START_SECONDS,
      endTime: DRAFT_END_SECONDS
    })
    request.resolve(createdResponse())
    await Promise.all([first, second])
    expect(store.isDraftSaving).toBe(false)
    expect(store.allSegments).toHaveLength(1)
  })

  it('preserves a replacement draft when an older save completes', async () => {
    const store = await createStoreWithVideo()
    const request = deferred<ReturnType<typeof createdResponse>>()
    axiosPost.mockReturnValueOnce(request.promise)
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)
    const first = store.commitDraft()
    store.cancelDraft()
    store.startDraft('polyp', REPLACEMENT_START_SECONDS)
    request.resolve(createdResponse())
    await first
    expect(store.draftSegment).toMatchObject({
      startTime: REPLACEMENT_START_SECONDS,
      endTime: null
    })
    expect(store.isDraftSaving).toBe(false)
  })

  it('does not publish an older draft error into the replacement draft', async () => {
    const store = await createStoreWithVideo()
    const request = deferred<ReturnType<typeof createdResponse>>()
    axiosPost.mockReturnValueOnce(request.promise)
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)
    const first = store.commitDraft()
    store.startDraft('polyp', REPLACEMENT_START_SECONDS)
    request.reject(new Error('old request failed'))
    await first
    expect(store.errorMessage).toBe('')
    expect(store.draftSegment?.startTime).toBe(REPLACEMENT_START_SECONDS)
  })

  it('isolates a late create response after switching videos', async () => {
    const store = await createStoreWithVideo()
    const request = deferred<ReturnType<typeof createdResponse>>()
    axiosPost.mockReturnValueOnce(request.promise)
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)
    const first = store.commitDraft()
    store.setCurrentVideo(VIDEO_ID + 1)
    expect(store.draftSegment).toBeNull()
    store.startDraft('polyp', REPLACEMENT_START_SECONDS)
    request.resolve(createdResponse())
    await first
    expect(store.draftSegment?.videoId).toBe(VIDEO_ID + 1)
    expect(store.allSegments.every((segment) => segment.id < 0)).toBe(true)
    expect(store.currentVideo?.segments).toHaveLength(0)
  })

  it('releases the pending guard after failure and allows a deliberate retry', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockRejectedValueOnce(new Error('network unavailable'))
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)
    await store.commitDraft()
    expect(store.isDraftSaving).toBe(false)
    axiosPost.mockResolvedValueOnce(createdResponse())
    await store.commitDraft()
    expect(axiosPost).toHaveBeenCalledTimes(2)
    expect(store.draftSegment).toBeNull()
  })

  it.each([0, DRAFT_START_SECONDS, 61, Number.NaN])(
    'retains invalid boundaries (%s) with a specific error',
    async (endTime) => {
      const store = await createStoreWithVideo()
      store.startDraft('polyp', DRAFT_START_SECONDS)
      store.updateDraftEnd(endTime)
      await store.commitDraft()
      expect(axiosPost).not.toHaveBeenCalled()
      expect(store.errorMessage).toMatch(/timestamps/)
      expect(store.draftSegment).not.toBeNull()
    }
  )

  it('preserves indexed backend creation errors', async () => {
    const store = await createStoreWithVideo()
    const error = new AxiosError('Request failed')
    Object.assign(error, {
      response: { data: { details: { creates: { '0': { label_id: ['Unknown label'] } } } } }
    })
    axiosPost.mockRejectedValueOnce(error)
    store.startDraft('polyp', DRAFT_START_SECONDS)
    store.updateDraftEnd(DRAFT_END_SECONDS)
    await store.commitDraft()
    expect(store.errorMessage).toContain('Unknown label')
  })

  it('reports incomplete drafts and no-op saves without creating segments', async () => {
    const store = await createStoreWithVideo()
    expect((await store.persistDirtySegments()).status).toBe('unchanged')
    store.startDraft('polyp', DRAFT_START_SECONDS)
    expect(await store.persistDirtySegments()).toMatchObject({
      status: 'incomplete',
      savedCount: 0,
      remainingCount: 1
    })
    expect(axiosPost).not.toHaveBeenCalled()
  })

  it('keeps unacknowledged updates dirty instead of reporting a successful save', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockResolvedValueOnce(createdResponse())
    await store.createFiveSecondSegment(DRAFT_START_SECONDS, 'polyp')
    store.patchSegmentLocally(SAVED_SEGMENT_ID, { endTime: 20 })
    axiosPost.mockResolvedValueOnce({ data: { created: [], updated: [], deleted: [] } })
    expect(await store.persistDirtySegments()).toMatchObject({
      status: 'incomplete',
      savedCount: 0,
      remainingCount: 1
    })
    expect(store.allSegments[0]).toMatchObject({ isDirty: true, syncState: 'dirty', endTime: 20 })
  })

  it('preserves edits made while a save is pending and suppresses duplicate saves', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockResolvedValueOnce(createdResponse())
    await store.createFiveSecondSegment(DRAFT_START_SECONDS, 'polyp')
    store.patchSegmentLocally(SAVED_SEGMENT_ID, { endTime: 20 })
    const response = {
      data: {
        created: [],
        updated: [{ ...createdResponse().data.created[0].segment, endTime: 20 }],
        deleted: []
      }
    }
    const request = deferred<typeof response>()
    axiosPost.mockReturnValueOnce(request.promise)
    const first = store.persistDirtySegments()
    expect((await store.persistDirtySegments()).status).toBe('pending')
    store.patchSegmentLocally(SAVED_SEGMENT_ID, { endTime: 25 })
    request.resolve(response)
    expect((await first).status).toBe('incomplete')
    expect(axiosPost).toHaveBeenCalledTimes(2)
    expect(store.allSegments[0]).toMatchObject({ endTime: 25, isDirty: true })
  })
  it('applies server-canonical timestamps and reports an acknowledged save', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockResolvedValueOnce(createdResponse())
    await store.createFiveSecondSegment(DRAFT_START_SECONDS, 'polyp')
    store.patchSegmentLocally(SAVED_SEGMENT_ID, { endTime: 20.01 })
    axiosPost.mockResolvedValueOnce({
      data: {
        created: [],
        updated: [{ ...createdResponse().data.created[0].segment, endTime: 20.02 }],
        deleted: []
      }
    })
    expect(await store.persistDirtySegments()).toEqual({
      status: 'saved',
      savedCount: 1,
      remainingCount: 0
    })
    expect(store.allSegments[0]).toMatchObject({
      endTime: 20.02,
      isDirty: false,
      syncState: 'clean'
    })
  })

  it('does not apply a pending update to a newly selected video', async () => {
    const store = await createStoreWithVideo()
    axiosPost.mockResolvedValueOnce(createdResponse())
    await store.createFiveSecondSegment(DRAFT_START_SECONDS, 'polyp')
    store.patchSegmentLocally(SAVED_SEGMENT_ID, { endTime: 20 })
    const response = {
      data: {
        created: [],
        updated: [{ ...createdResponse().data.created[0].segment, endTime: 20 }],
        deleted: []
      }
    }
    const request = deferred<typeof response>()
    axiosPost.mockReturnValueOnce(request.promise)
    const pending = store.persistDirtySegments()
    store.setCurrentVideo(VIDEO_ID + 1)
    request.resolve(response)
    await pending
    expect(store.currentVideo?.id).toBe(VIDEO_ID + 1)
    expect(store.currentVideo?.segments).toHaveLength(0)
    expect(store.isSavingSegments).toBe(false)
  })
})
