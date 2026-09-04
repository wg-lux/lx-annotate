import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  useAnonymizationStore,
  type ApiUploadJobOverview,
  type FileItem
} from '@/stores/anonymizationStore'

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

function buildUploadJob(
  overrides: Partial<ApiUploadJobOverview> = {}
): ApiUploadJobOverview {
  return {
    id: 'upload-job',
    status: 'pending',
    ingestMode: 'api',
    sourceSystem: 'test-suite',
    sourceCenterKey: 'test-center',
    originalFilename: 'stale-import.mp4',
    sourceFilePersisted: true,
    cleanupStatus: 'pending',
    allowedActions: [],
    errorCode: '',
    errorDetail: '',
    retryable: false,
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null,
    lastAttemptAt: '2026-05-28T08:00:00Z',
    createdAt: '2026-05-28T08:00:00Z',
    updatedAt: '2026-05-28T08:00:00Z',
    ...overrides
  }
}

function buildVideoFile(overrides: Partial<FileItem> = {}): FileItem {
  return {
    id: 42,
    filename: 'stale-import.mp4',
    mediaType: 'video',
    anonymizationStatus: 'extracting_frames',
    annotationStatus: 'not_started',
    createdAt: '2026-05-28T08:00:00Z',
    metadataImported: false,
    uploadJob: buildUploadJob({
      id: 'failed-upload-job',
      status: 'error',
      allowedActions: ['safe_reimport', 'delete'],
      errorCode: 'processing_failed',
      errorDetail: 'Import processing failed.'
    }),
    ...overrides
  }
}

describe('anonymizationStore video reimport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('posts annotation-safe repair for a stale extracting-frames video', async () => {
    hoisted.post.mockResolvedValue({
      data: {
        items: [{ status: 'repaired', missing: [] }],
        summary: { repaired: 1, consistent: 0, reimport_required: 0 },
        annotationsPreserved: true
      }
    })
    hoisted.get.mockResolvedValue({ data: [] })

    const store = useAnonymizationStore()
    store.overview = [buildVideoFile()]
    await expect(store.reimportVideo(42)).resolves.toBe(true)

    expect(hoisted.post).toHaveBeenCalledWith('api/runtime/videos/42/repair/', { dryRun: false })
  })

  it('reports required re-import without changing annotation state', async () => {
    hoisted.post.mockResolvedValue({
      data: {
        items: [{ status: 'reimport_required', missing: ['source_media'] }],
        summary: { repaired: 0, consistent: 0, reimport_required: 1 },
        annotationsPreserved: true
      }
    })
    const store = useAnonymizationStore()
    const file = buildVideoFile({ anonymizationStatus: 'failed', annotationStatus: 'validated' })
    store.overview = [file]

    await expect(store.reimportVideo(42)).resolves.toBe(false)

    expect(file.anonymizationStatus).toBe('failed')
    expect(file.annotationStatus).toBe('validated')
    expect(store.error).toContain('muss neu importiert werden')
  })

  it('does not post reimport while the upload job is still active', async () => {
    const store = useAnonymizationStore()
    store.overview = [
      buildVideoFile({
        uploadJob: buildUploadJob({
          id: 'active-upload-job',
          status: 'processing'
        })
      })
    ]
    const startPolling = vi.spyOn(store, 'startPolling').mockImplementation(() => undefined)

    await expect(store.reimportVideo(42)).resolves.toBe(true)

    expect(hoisted.post).not.toHaveBeenCalled()
    expect(startPolling).toHaveBeenCalledWith(42)
  })

  it('repairs all video states through the annotation-safe endpoint', async () => {
    hoisted.post.mockResolvedValue({
      data: {
        dryRun: false,
        count: 1,
        summary: { repaired: 1, consistent: 0, reimport_required: 0 },
        items: [],
        annotationsPreserved: true
      }
    })
    hoisted.get.mockResolvedValue({ data: [] })

    const store = useAnonymizationStore()
    const result = await store.repairAllVideoStates()

    expect(hoisted.post).toHaveBeenCalledWith('api/runtime/videos/repair/', { dryRun: false })
    expect(result?.annotationsPreserved).toBe(true)
  })
})
