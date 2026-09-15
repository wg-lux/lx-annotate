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

function buildUploadJob(overrides: Partial<ApiUploadJobOverview> = {}): ApiUploadJobOverview {
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

  it('dismisses an import by UUID and refreshes the overview', async () => {
    hoisted.post.mockResolvedValue({ status: 204 })
    hoisted.get.mockResolvedValue({ data: [] })
    const store = useAnonymizationStore()
    store.overview = [buildVideoFile()]
    expect(await store.dismissUploadJob('db0a99ff-0129-4c13-b5c9-f584bf21d1b2')).toBe(true)
    expect(hoisted.post).toHaveBeenCalledWith(
      'api/anonymization/upload-jobs/db0a99ff-0129-4c13-b5c9-f584bf21d1b2/dismiss/'
    )
    expect(store.overview).toEqual([])
  })

  it('keeps the row and reports an error when dismissal fails', async () => {
    hoisted.post.mockRejectedValue(new Error('conflict'))
    const store = useAnonymizationStore()
    const row = buildVideoFile()
    store.overview = [row]
    expect(await store.dismissUploadJob('db0a99ff-0129-4c13-b5c9-f584bf21d1b2')).toBe(false)
    expect(store.overview).toEqual([row])
    expect(store.error).toContain('nicht aus der Übersicht entfernt')
    expect(hoisted.get).not.toHaveBeenCalled()
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

    expect(hoisted.post).toHaveBeenCalledWith('api/runtime/videos/42/repair/', { dry_run: false })
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

  it('does not report a blocked repair as a successful reimport', async () => {
    hoisted.post.mockResolvedValue({ data: { items: [{ status: 'blocked', missing: ['active_transcode'] }] } })
    const store = useAnonymizationStore()
    store.overview = [buildVideoFile()]
    await expect(store.reimportVideo(42)).resolves.toBe(false)
    expect(store.error).toContain('kann derzeit nicht repariert werden')
    expect(hoisted.get).not.toHaveBeenCalled()
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

    expect(hoisted.post).toHaveBeenCalledWith('api/runtime/videos/repair/', { dry_run: false })
    expect(result?.annotationsPreserved).toBe(true)
  })
  it.each(['replace_processed'] as const)('posts a bounded %s repair batch using the API contract', async (option) => {
    hoisted.post.mockResolvedValue({ data: { annotationsPreserved: true } })
    hoisted.get.mockResolvedValue({ data: [] })
    const store = useAnonymizationStore()
    const idempotencyKey = 'f1f224a8-43d4-486e-b3ef-fbbed852be26'
    await store.repairAllVideoStates(false, { option, idempotencyKey, afterVideoId: 100 })
    expect(hoisted.post).toHaveBeenCalledWith('api/runtime/videos/repair/', {
      dry_run: false,
      transcode: { option, idempotency_key: idempotencyKey },
      after_video_id: 100,
      batch_size: 100
    })
  })

})
