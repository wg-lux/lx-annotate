import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import AnonymizationOverviewComponent from '../AnonymizationOverviewComponent.vue'

const hoisted = vi.hoisted(() => ({
  anonymizationStoreRef: { current: null as any },
  mediaStoreRef: { current: null as any },
  pollingProtectionRef: { current: null as any },
  routerPush: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: hoisted.routerPush
  })
}))

vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => hoisted.anonymizationStoreRef.current
}))

vi.mock('@/stores/videoStore', () => ({
  useVideoStore: () => ({
    hasRawVideoFile: true
  })
}))

vi.mock('@/stores/mediaTypeStore', () => ({
  useMediaTypeStore: () => hoisted.mediaStoreRef.current
}))

vi.mock('@/composables/usePollingProtection', () => ({
  usePollingProtection: () => hoisted.pollingProtectionRef.current
}))

vi.mock('@/api/mediaManagement', () => ({
  useMediaManagement: () => ({
    deleteMediaFile: vi.fn()
  })
}))

function buildVideoFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 17,
    filename: 'study-video.mp4',
    mediaType: 'video',
    anonymizationStatus: 'done_processing_anonymization',
    annotationStatus: 'not_started',
    createdAt: '2026-04-30T08:00:00Z',
    metadataImported: true,
    rawFile: 'raw/study-video.mp4',
    ...overrides
  }
}

function buildPdfFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 23,
    filename: 'study-report.pdf',
    mediaType: 'pdf',
    anonymizationStatus: 'failed',
    annotationStatus: 'not_started',
    createdAt: '2026-04-30T08:15:00Z',
    metadataImported: true,
    rawFile: 'raw/study-report.pdf',
    ...overrides
  }
}

function buildQuarantinedVideoFile(overrides: Record<string, unknown> = {}) {
  return {
    id: -42,
    filename: 'quarantined-video.mov',
    mediaType: 'video',
    anonymizationStatus: 'failed',
    annotationStatus: '',
    createdAt: '2026-05-15T07:20:22Z',
    metadataImported: false,
    fileSize: 65011712,
    quarantined: true,
    quarantineId: 'lx_annotate_quarantine:quarantined-video.mov',
    quarantineDirectoryKey: 'lx_annotate_quarantine',
    quarantineDirectoryLabel: 'lx-annotate quarantine',
    quarantineReviewStatus: 'pending_review',
    quarantineNextAction: 'review_required',
    quarantineOrphaned: false,
    errorDetail: 'Die Datei wurde unter Quarantäne gestellt.',
    uploadJob: {
      id: 'lx_annotate_quarantine:quarantined-video.mov',
      status: 'quarantined',
      ingestMode: 'watcher',
      sourceSystem: 'lx-annotate quarantine',
      sourceFilePersisted: true,
      cleanupStatus: 'skipped',
      errorCode: 'processing_failed',
      errorDetail: 'Die Datei wurde unter Quarantäne gestellt.'
    },
    ...overrides
  }
}

describe('AnonymizationOverviewComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    hoisted.anonymizationStoreRef.current = reactive({
      error: null,
      loading: false,
      overview: [buildVideoFile()],
      fetchOverview: vi.fn().mockResolvedValue(undefined),
      setCurrentForValidation: vi.fn().mockResolvedValue(true),
      isVideoReimportQueued: vi.fn().mockReturnValue(false),
      startPolling: vi.fn(),
      stopAllPolling: vi.fn()
    })

    hoisted.mediaStoreRef.current = {
      getMediaTypeIcon: vi.fn().mockReturnValue('ni ni-button-play'),
      getMediaTypeBadgeClass: vi.fn().mockReturnValue('bg-info'),
      detectMediaType: vi.fn().mockReturnValue('video'),
      seedTypesFromOverview: vi.fn(),
      setCurrentItem: vi.fn(),
      rememberType: vi.fn(),
      getType: vi.fn().mockReturnValue('video')
    }

    hoisted.pollingProtectionRef.current = {
      canProcessMedia: {
        value: vi.fn().mockReturnValue(true)
      },
      startAnonymizationSafeWithProtection: vi.fn().mockResolvedValue({ success: true }),
      clearAllLocalLocks: vi.fn()
    }
  })

  it('renders the video file id next to the filename', async () => {
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('study-video.mp4')
    expect(wrapper.text()).toContain('Video-ID: 17')
  })

  it('uses safe patient and document type metadata instead of the PDF hash filename', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildPdfFile({
        filename: '8e0f9f8807db084c9e313a1e6f4a1be4.pdf',
        pseudoPatientId: 4711,
        documentType: 'report_final'
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Pseudo-Patient 4711 - Finaler Befund')
    expect(wrapper.text()).toContain('PDF-ID: 23')
    expect(wrapper.text()).not.toContain('8e0f9f8807db084c9e313a1e6f4a1be4.pdf')
  })

  it('renders upload job status separately from anonymization state', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        uploadJob: {
          id: 'b99b5f04-8c40-4ec7-a0ef-6b34d3f908f8',
          status: 'anonymized',
          ingestMode: 'watcher',
          sourceSystem: 'watcher-daemon',
          sourceCenterKey: 'test-center',
          sourceFilePersisted: false,
          cleanupStatus: 'completed'
        }
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    const uploadSummary = wrapper.find('.upload-job-summary')
    expect(uploadSummary.text()).toContain('Import abgeschlossen')
    expect(uploadSummary.text()).toContain('Ordnerimport / watcher-daemon / test-center')
    expect(uploadSummary.text()).toContain('Quelle bereinigt - Bereinigt')
    expect(wrapper.find('.upload-job-summary .badge.bg-success').exists()).toBe(true)
    expect(wrapper.text()).toContain('Fertig')
  })

  it('does not render raw duplicate import errors', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        anonymizationStatus: 'validated',
        annotationStatus: 'validated',
        uploadJob: {
          id: 'duplicate-import',
          status: 'error',
          ingestMode: 'watcher',
          errorCode: 'duplicate_content',
          errorDetail: 'duplicate key value violates unique constraint "endoreg_db_videofile_video_hash_key"'
        }
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Duplikat erkannt')
    expect(wrapper.text()).not.toContain('duplicate key')
    expect(wrapper.text()).not.toContain('unique constraint')
    expect(wrapper.text()).not.toContain('endoreg_db_videofile_video_hash_key')
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(false)
  })

  it('reports whether the original source file has already been deleted', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        id: 17,
        uploadJob: {
          id: 'deleted-source',
          status: 'anonymized',
          sourceFilePersisted: false,
          cleanupStatus: 'completed'
        }
      }),
      buildPdfFile({
        id: 23,
        uploadJob: {
          id: 'present-source',
          status: 'anonymized',
          sourceFilePersisted: true,
          cleanupStatus: 'pending'
        }
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.find('thead').text()).toContain('Originaldatei gelöscht?')
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('Ja, gelöscht')
    expect(rows[0].text()).toContain('Bereinigt')
    expect(rows[1].text()).toContain('Nein, vorhanden')
    expect(rows[1].text()).toContain('Bereinigung offen')
  })

  it('keeps the filename column identifiable for sticky horizontal scrolling', async () => {
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.find('table.overview-files-table').exists()).toBe(true)
    expect(wrapper.find('thead .sticky-filename-column').text()).toBe('Dateiname')
    expect(wrapper.find('tbody .sticky-filename-column').text()).toContain('study-video.mp4')
  })

  it('keeps validation visible and scrolls the wide table with the mouse wheel', async () => {
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    const scrollWrapper = wrapper.find<HTMLElement>('[data-test="overview-table-scroll"]')
    const element = scrollWrapper.element
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 800 })
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 1600 })

    await scrollWrapper.trigger('wheel', { deltaY: 120 })

    expect(element.scrollLeft).toBe(120)
    expect(wrapper.find('thead .validation-action-column').text()).toBe('Validierung')
    expect(wrapper.find('tbody .validation-action-column button').text()).toContain('Validieren')
  })

  it('renders a delete button for every overview row regardless of status', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({ id: 17, anonymizationStatus: 'done_processing_anonymization' }),
      buildVideoFile({ id: 18, filename: 'processing-video.mp4', anonymizationStatus: 'processing_anonymization' }),
      buildPdfFile({ id: 23, anonymizationStatus: 'failed' })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    const deleteButtons = wrapper.findAll('[data-test="delete-file-button"]')
    expect(deleteButtons).toHaveLength(3)
    expect(deleteButtons.map((button) => button.attributes('aria-label'))).toEqual([
      'Datei 17 löschen',
      'Datei 18 löschen',
      'Datei 23 löschen'
    ])
  })

  it('renders quarantined videos as visible read-only overview rows', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({ id: 17 }),
      buildQuarantinedVideoFile()
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('quarantined-video.mov')
    expect(wrapper.text()).toContain('Quarantäne: lx-annotate quarantine')
    expect(wrapper.text()).toContain('In Quarantäne')
    expect(wrapper.text()).toContain('Serverseitige Quarantäne')
    expect(wrapper.text()).not.toContain('moov atom not found')
    expect(wrapper.findAll('[data-test="delete-file-button"]')).toHaveLength(1)
  })

  it('renders a transient import retry without exposing technical details', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        uploadJob: {
          id: '2f60692d-680d-44bf-a926-24cb9507bdf4',
          status: 'retrying',
          ingestMode: 'watcher',
          sourceSystem: 'watcher-daemon',
          sourceFilePersisted: true,
          cleanupStatus: 'pending',
          errorCode: 'dispatch_unavailable',
          errorDetail: 'Import service is temporarily unavailable. An automatic retry is scheduled.',
          retryable: true,
          retryCount: 2,
          maxRetries: 3,
          nextRetryAt: '2026-05-15T07:25:22Z',
          updatedAt: '2026-05-15T07:24:22Z'
        }
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Import wird erneut versucht')
    expect(wrapper.text()).toContain('Versuch 2/3')
    expect(wrapper.text()).toContain('Nächster Versuch')
    expect(wrapper.text()).not.toContain('broker')
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(false)
  })

  it.each([
    ['pending', 'Import wartet', false],
    ['processing', 'Import läuft', false],
    ['error', 'Importfehler', true],
    ['lost', 'Importquelle fehlt (LOST)', true]
  ])('renders upload state %s with the expected server action', async (status, label, deleteAllowed) => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        uploadJob: {
          id: `job-${status}`,
          status,
          ingestMode: 'api',
          sourceFilePersisted: true,
          cleanupStatus: 'pending',
          allowedActions: deleteAllowed ? ['safe_reimport', 'delete'] : [],
          errorCode: status === 'lost' ? 'source_missing' : status === 'error' ? 'processing_failed' : '',
          errorDetail: status === 'error' || status === 'lost'
            ? 'Safe operator message.'
            : ''
        }
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain(label)
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(deleteAllowed)
  })

  it('renders raw and processed HTTP Live Streaming materialization independently', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        hlsMaterializations: [
          {
            artifactKind: 'raw',
            status: 'ready',
            triggeringUploadJobId: '2f60692d-680d-44bf-a926-24cb9507bdf4',
            sourceGenerationId: '63d82006-b275-4b40-b383-ae41855c1163',
            targetGenerationId: '3f6ed855-eb27-4386-a08d-fd8e99d89c06',
            segmentCount: 4,
            errorCode: '',
            createdAt: '2026-05-15T07:20:22Z',
            updatedAt: '2026-05-15T07:21:22Z'
          },
          {
            artifactKind: 'processed',
            status: 'failed',
            triggeringUploadJobId: '2f60692d-680d-44bf-a926-24cb9507bdf4',
            sourceGenerationId: 'd46ee58c-3fa4-4230-a4f7-5315d6aa76d5',
            targetGenerationId: 'e29a5845-cd33-470c-aab3-80b56a9df5c6',
            segmentCount: 0,
            errorCode: 'materialization_failed',
            createdAt: '2026-05-15T07:20:22Z',
            updatedAt: '2026-05-15T07:22:22Z'
          }
        ]
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Rohvideo: Bereit')
    expect(wrapper.text()).toContain('Anonymisiert: Fehlgeschlagen')
    expect(wrapper.text()).toContain('HLS-Erzeugung fehlgeschlagen')
    expect(wrapper.text()).not.toContain('materialization_failed')
  })

  it('shows queued and materializing HTTP Live Streaming as active states', async () => {
    const materialization = (artifactKind: 'raw' | 'processed', status: 'queued' | 'materializing') => ({
      artifactKind,
      status,
      triggeringUploadJobId: null,
      sourceGenerationId: '63d82006-b275-4b40-b383-ae41855c1163',
      targetGenerationId: '3f6ed855-eb27-4386-a08d-fd8e99d89c06',
      segmentCount: 0,
      errorCode: '',
      createdAt: '2026-05-15T07:20:22Z',
      updatedAt: '2026-05-15T07:21:22Z'
    })
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        hlsMaterializations: [
          materialization('raw', 'queued'),
          materialization('processed', 'materializing')
        ]
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Rohvideo: Wartet')
    expect(wrapper.text()).toContain('Anonymisiert: Wird erzeugt')
    expect(wrapper.find('[data-test="delete-file-button"]').attributes('disabled')).toBeDefined()
  })
})
