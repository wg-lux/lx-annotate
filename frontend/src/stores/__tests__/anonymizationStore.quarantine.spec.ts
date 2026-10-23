import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAnonymizationStore } from '@/stores/anonymizationStore'

function resolvedData<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data })
}

const hoisted = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get
  },
  r: (path: string) => `api/${path}`,
  silentRequestConfig: () => ({ suppressErrorToast: true })
}))

describe('anonymizationStore quarantine overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('merges quarantined files into the overview as read-only failed rows', async () => {
    hoisted.get.mockImplementation((url: string) => {
      if (url === 'api/anonymization/items/overview/') {
        return resolvedData([
          {
            id: 17,
            filename: 'processed-video.mp4',
            mediaType: 'video',
            anonymizationStatus: 'validated',
            anonymizationPhase: 'validated',
            aiPredictionStatus: 'prediction_pending' as const,
            annotationStatus: 'validated',
            createdAt: '2026-05-15T07:00:00Z',
            metadataImported: true
          }
        ])
      }
      if (url.includes('runtime/quarantine/')) {
        return resolvedData({
          count: 1,
          totalSize: 65011712,
          files: [
            {
              id: 'lx_annotate_quarantine:NINJAU_S001_S001_T016.MOV',
              directoryKey: 'lx_annotate_quarantine',
              directoryLabel: 'lx-annotate quarantine',
              filename: 'NINJAU_S001_S001_T016.MOV',
              mediaType: 'video',
              size: 65011712,
              quarantinedAt: '2026-05-15T07:20:22Z',
              modifiedAt: '2026-05-15T07:19:35Z',
              reason: 'Die Datei wurde unter Quarantäne gestellt.',
              reviewStatus: 'pending_review',
              nextAction: 'review_required',
              sourceUploadJobId: '49b399f7-328e-42e5-927b-d0502d9231ab',
              orphaned: false
            }
          ]
        })
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const store = useAnonymizationStore()
    const overview = await store.fetchOverview()

    expect(overview).toHaveLength(2)
    const quarantined = store.overview.find((file) => file.quarantined)
    expect(quarantined).toMatchObject({
      filename: 'NINJAU_S001_S001_T016.MOV',
      mediaType: 'video',
      anonymizationStatus: 'failed',
      anonymizationPhase: 'failed',
      aiPredictionStatus: null,
      quarantineDirectoryLabel: 'lx-annotate quarantine',
      quarantineReviewStatus: 'pending_review',
      quarantineNextAction: 'review_required',
      quarantineOrphaned: false,
      errorDetail: 'Die Datei wurde unter Quarantäne gestellt.'
    })
    expect(quarantined?.id).toBeLessThan(0)
    expect(quarantined?.uploadJob?.status).toBe('quarantined')
  })

  it.each([
    ['failed', 'failed'],
    ['done_processing_anonymization', 'awaiting_validation'],
    ['validated', 'validated']
  ])(
    'preserves backend status %s when a duplicate import fails',
    async (anonymizationStatus, anonymizationPhase) => {
      hoisted.get.mockImplementation((url: string) => {
        if (url === 'api/anonymization/items/overview/') {
          return resolvedData([
            {
              id: 17,
              filename: 'previously-annotated.mp4',
              mediaType: 'video',
              anonymizationStatus,
              anonymizationPhase,
              aiPredictionStatus: 'annotation_ready',
              annotationStatus: 'not_started',
              createdAt: '2026-05-15T07:00:00Z',
              metadataImported: true,
              uploadJob: {
                id: 'duplicate-import',
                status: 'error',
                ingestMode: 'watcher',
                errorCode: 'duplicate_content',
                errorDetail:
                  'duplicate key value violates unique constraint "endoreg_db_videofile_video_hash_key"'
              }
            }
          ])
        }
        if (url.includes('runtime/quarantine/')) {
          return resolvedData({
            count: 0,
            totalSize: 0,
            files: []
          })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const store = useAnonymizationStore()
      const overview = await store.fetchOverview()

      expect(overview).toHaveLength(1)
      expect(store.overview[0]).toMatchObject({
        filename: 'previously-annotated.mp4',
        anonymizationStatus,
        anonymizationPhase,
        aiPredictionStatus: 'annotation_ready',
        annotationStatus: 'not_started',
        uploadJob: {
          status: 'error'
        }
      })
    }
  )

  it.each([
    [{ anonymizationStatus: 'validated' }],
    [{ anonymizationStatus: 'validated', anonymizationPhase: 'done' }],
    [{ anonymizationStatus: 'predicting_segments', anonymizationPhase: 'in_progress' }],
    [{ anonymizationStatus: 'validated', anonymizationPhase: 'validated' }],
    [
      {
        anonymizationStatus: 'validated',
        anonymizationPhase: 'validated',
        aiPredictionStatus: 'predicting_segments'
      }
    ],
    [
      {
        mediaType: 'pdf',
        anonymizationStatus: 'validated',
        anonymizationPhase: 'validated',
        aiPredictionStatus: 'prediction_ready'
      }
    ]
  ])('rejects rows the server did not classify: %o', async (classification) => {
    const store = useAnonymizationStore()
    const previous = {
      id: 3,
      filename: 'kept.mp4',
      mediaType: 'video' as const,
      anonymizationStatus: 'validated' as const,
      anonymizationPhase: 'validated' as const,
      aiPredictionStatus: 'prediction_pending' as const,
      annotationStatus: 'validated' as const,
      createdAt: '2026-05-15T07:00:00Z'
    }
    store.overview = [previous]
    hoisted.get.mockImplementation((url: string) => {
      if (url === 'api/anonymization/items/overview/') {
        return resolvedData([
          { id: 17, filename: 'x.mp4', mediaType: 'video', createdAt: '', ...classification }
        ])
      }
      return resolvedData({ count: 0, totalSize: 0, files: [] })
    })

    await expect(store.fetchOverview()).resolves.toEqual([])
    expect(store.error).toContain('nicht klassifizierten')
    expect(store.overview).toEqual([previous])
  })
})
