import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAnonymizationStore, type FileItem } from '@/stores/anonymizationStore'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get,
    post: hoisted.post
  },
  r: (path: string) => `api/${path}`,
  silentRequestConfig: () => ({ suppressErrorToast: true })
}))

function buildVideoFile(overrides: Partial<FileItem> = {}): FileItem {
  return {
    id: 42,
    filename: 'stale-import.mp4',
    mediaType: 'video',
    anonymizationStatus: 'extracting_frames',
    annotationStatus: 'not_started',
    createdAt: '2026-05-28T08:00:00Z',
    metadataImported: false,
    uploadJob: {
      id: 'failed-upload-job',
      status: 'error',
      cleanupStatus: 'pending'
    },
    ...overrides
  }
}

describe('anonymizationStore video reimport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('posts reimport for a stale extracting-frames video with missing metadata', async () => {
    hoisted.post.mockResolvedValue({ data: { status: 'queued' } })

    const store = useAnonymizationStore()
    store.overview = [buildVideoFile()]
    const startPolling = vi.spyOn(store, 'startPolling').mockImplementation(() => undefined)

    await expect(store.reimportVideo(42)).resolves.toBe(true)

    expect(hoisted.post).toHaveBeenCalledWith('api/media/videos/42/reimport/')
    expect(startPolling).toHaveBeenCalledWith(42)
    expect(store.reimportQueuedIds).toContain(42)
  })

  it('does not post reimport while the upload job is still active', async () => {
    const store = useAnonymizationStore()
    store.overview = [
      buildVideoFile({
        uploadJob: {
          id: 'active-upload-job',
          status: 'processing'
        }
      })
    ]
    const startPolling = vi.spyOn(store, 'startPolling').mockImplementation(() => undefined)

    await expect(store.reimportVideo(42)).resolves.toBe(true)

    expect(hoisted.post).not.toHaveBeenCalled()
    expect(startPolling).toHaveBeenCalledWith(42)
  })
})
