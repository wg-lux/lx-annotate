import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAnonymizationStore, type FileItem } from '../anonymizationStore'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: { get, post },
  r: (path: string) => `/api/${path}`,
  silentRequestConfig: () => ({ suppressErrorToast: true })
}))

function row(mediaType: 'video' | 'pdf'): FileItem {
  return {
    id: 15,
    mediaType,
    filename: `source.${mediaType}`,
    createdAt: '',
    anonymizationStatus: 'processing_anonymization',
    annotationStatus: 'not_started'
  }
}

describe('typed anonymization polling and retry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    sessionStorage.clear()
  })
  afterEach(() => {
    useAnonymizationStore().stopAllPolling()
    vi.useRealTimers()
  })

  it('polls colliding identifiers independently and updates only the requested type', async () => {
    const store = useAnonymizationStore()
    store.overview = [row('video'), row('pdf')]
    get.mockImplementation((_url: string, config: { params: { kind: string } }) =>
      Promise.resolve({
        data: {
          anonymizationStatus:
            config.params.kind === 'report' ? 'validated' : 'processing_anonymization'
        }
      })
    )
    store.startPolling(15, 'pdf')
    store.startPolling(15, 'video')
    expect(Object.keys(store.pollingHandles).sort()).toEqual(['pdf:15', 'video:15'])
    await vi.advanceTimersByTimeAsync(22000)
    expect(store.overview[0].anonymizationStatus).toBe('processing_anonymization')
    expect(store.overview[1].anonymizationStatus).toBe('validated')
    expect(Object.keys(store.pollingHandles)).toEqual(['video:15'])
    expect(get).toHaveBeenCalledWith('/api/anonymization/15/status/', {
      params: { kind: 'report' }
    })
    expect(get).toHaveBeenCalledWith('/api/anonymization/15/status/', { params: { kind: 'video' } })
  })

  it('stops only the vanished typed identity on overview refresh', async () => {
    const store = useAnonymizationStore()
    store.overview = [row('video'), row('pdf')]
    store.startPolling(15, 'pdf')
    store.startPolling(15, 'video')
    get.mockImplementation((url: string) =>
      Promise.resolve({ data: url.includes('quarantine') ? { files: [] } : [row('video')] })
    )
    await store.fetchOverview()
    expect(Object.keys(store.pollingHandles)).toEqual(['video:15'])
    expect(store.isPolling).toBe(true)
  })

  it.each([
    ['validated', 'processing_anonymization', true],
    ['processing_anonymization', 'validated', false]
  ] as const)(
    'tracks a queued video independently from a PDF with the same ID (%s, %s)',
    async (pdfStatus, videoStatus, queued) => {
      const store = useAnonymizationStore()
      store.reimportQueuedIds = [15]
      get.mockImplementation((url: string) =>
        Promise.resolve({
          data: url.includes('quarantine')
            ? { files: [] }
            : [
                { ...row('pdf'), anonymizationStatus: pdfStatus },
                { ...row('video'), anonymizationStatus: videoStatus }
              ]
        })
      )
      await store.fetchOverview()
      expect(store.isVideoReimportQueued(15)).toBe(queued)
    }
  )

  it('retries failed video processing through the existing guarded reimport endpoint', async () => {
    const store = useAnonymizationStore()
    store.overview = [row('pdf'), { ...row('video'), anonymizationStatus: 'failed' }]
    post.mockResolvedValue({ data: { status: 'queued' } })
    get.mockImplementation((url: string) =>
      Promise.resolve({
        data: url.includes('quarantine') ? { files: [] } : [row('pdf'), row('video')]
      })
    )
    expect(await store.reimportVideo(15)).toBe(true)
    expect(post).toHaveBeenCalledWith('/api/media/videos/15/reimport/', {
      refresh_predictions: false
    })
    expect(Object.keys(store.pollingHandles)).toEqual(['video:15'])
  })

  it.each(['Video is marked lost by media integrity', 'Raw video source is missing'])(
    'preserves a rejected retry without changing annotation state: %s',
    async (detail) => {
      const store = useAnonymizationStore()
      store.overview = [
        { ...row('video'), anonymizationStatus: 'failed', annotationStatus: 'validated' }
      ]
      post.mockRejectedValue(new Error(detail))
      expect(await store.reimportVideo(15)).toBe(false)
      expect(store.overview[0].anonymizationStatus).toBe('failed')
      expect(store.overview[0].annotationStatus).toBe('validated')
      expect(store.error).toContain(detail)
      expect(store.pollingHandles).toEqual({})
      expect(get).not.toHaveBeenCalled()
    }
  )
})
