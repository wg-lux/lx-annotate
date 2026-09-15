import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import AnonymizationOverviewComponent from '../AnonymizationOverviewComponent.vue'
import OverviewTranscodePanel from '../OverviewTranscodePanel.vue'

vi.mock('../OverviewStorageSummary.vue', () => ({
  default: { template: '<div data-test="storage-summary-stub" />' }
}))

vi.mock('../OverviewTranscodePanel.vue', () => ({
  default: { name: 'OverviewTranscodePanel', props: ['repairing', 'refreshToken'], emits: ['repair'], template: '<div />' }
}))

const VIDEO_FILE_ID = 17
const PDF_FILE_ID = 23
const IMPORT_ONLY_FILE_ID = -123
const UPLOAD_MAX_RETRIES = 3
const STICKY_SCROLL_OFFSET = 120
const TABLE_SCROLL_OFFSET = 240

enableAutoUnmount(afterEach)
afterEach(() => vi.useRealTimers())

const hoisted = vi.hoisted(() => ({
  anonymizationStoreRef: {
    current: {} as {
      error: string | null
      loading: boolean
      overview: Array<Record<string, unknown>>
      fetchOverview: ReturnType<typeof vi.fn>
      repairAllVideoStates: ReturnType<typeof vi.fn>
      retryUploadJob: ReturnType<typeof vi.fn>
      dismissUploadJob: ReturnType<typeof vi.fn>
      setCurrentForValidation: ReturnType<typeof vi.fn>
      isVideoReimportQueued: ReturnType<typeof vi.fn>
      startPolling: ReturnType<typeof vi.fn>
      stopAllPolling: ReturnType<typeof vi.fn>
    }
  },
  mediaStoreRef: {
    current: {} as {
      getMediaTypeIcon: ReturnType<typeof vi.fn>
      getMediaTypeBadgeClass: ReturnType<typeof vi.fn>
      detectMediaType: ReturnType<typeof vi.fn>
      seedTypesFromOverview: ReturnType<typeof vi.fn>
      setCurrentItem: ReturnType<typeof vi.fn>
      rememberType: ReturnType<typeof vi.fn>
      getType: ReturnType<typeof vi.fn>
    }
  },
  pollingProtectionRef: {
    current: {} as {
      canProcessMedia: { value: ReturnType<typeof vi.fn> }
      startAnonymizationSafeWithProtection: ReturnType<typeof vi.fn>
      clearAllLocalLocks: ReturnType<typeof vi.fn>
    }
  },
  routerPush: vi.fn(),
  cancelImport: vi.fn(),
  deleteMediaFile: vi.fn()
}))

vi.mock('@/api/anonymizationOperations', () => ({
  cancelAnonymizationImport: hoisted.cancelImport
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
    deleteMediaFile: hoisted.deleteMediaFile
  })
}))

function defaultUploadErrorCode(status: string): string {
  return ['error', 'lost', 'quarantined'].includes(status) ? 'processing_failed' : ''
}

function defaultUploadActions(status: string, errorCode: string): string[] {
  if (status === 'anonymized') return ['delete']
  const canReimport = ['error', 'lost'].includes(status) && errorCode !== 'duplicate_content'
  return canReimport ? ['safe_reimport', 'delete'] : []
}

function buildUploadJob(overrides: Record<string, unknown> = {}) {
  const status = typeof overrides.status === 'string' ? overrides.status : 'pending'
  const errorCode =
    typeof overrides.errorCode === 'string' ? overrides.errorCode : defaultUploadErrorCode(status)
  const allowedActions = overrides.allowedActions ?? defaultUploadActions(status, errorCode)

  return {
    id: 'upload-job',
    status,
    ingestMode: 'api',
    sourceSystem: 'test-suite',
    sourceCenterKey: null,
    originalFilename: 'study-video.mp4',
    sourceFilePersisted: true,
    cleanupStatus: 'pending',
    allowedActions,
    errorCode,
    errorDetail: errorCode ? 'Safe operator message.' : '',
    retryable: false,
    retryCount: 0,
    maxRetries: UPLOAD_MAX_RETRIES,
    nextRetryAt: null,
    lastAttemptAt: null,
    createdAt: '2026-05-15T07:20:22Z',
    updatedAt: '2026-05-15T07:20:22Z',
    ...overrides
  }
}

function normalizeFileOverrides(overrides: Record<string, unknown>) {
  const uploadJob = overrides.uploadJob
  if (!uploadJob || typeof uploadJob !== 'object' || Array.isArray(uploadJob)) {
    return overrides
  }
  return {
    ...overrides,
    uploadJob: buildUploadJob(uploadJob as Record<string, unknown>)
  }
}

function buildVideoFile(overrides: Record<string, unknown> = {}) {
  return {
    id: VIDEO_FILE_ID,
    filename: 'study-video.mp4',
    mediaType: 'video',
    anonymizationStatus: 'done_processing_anonymization',
    annotationStatus: 'not_started',
    createdAt: '2026-04-30T08:00:00Z',
    metadataImported: true,
    rawFile: 'raw/study-video.mp4',
    ...normalizeFileOverrides(overrides)
  }
}

function buildPdfFile(overrides: Record<string, unknown> = {}) {
  return {
    id: PDF_FILE_ID,
    filename: 'study-report.pdf',
    mediaType: 'pdf',
    anonymizationStatus: 'failed',
    annotationStatus: 'not_started',
    createdAt: '2026-04-30T08:15:00Z',
    metadataImported: true,
    rawFile: 'raw/study-report.pdf',
    ...normalizeFileOverrides(overrides)
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
    uploadJob: buildUploadJob({
      id: 'lx_annotate_quarantine:quarantined-video.mov',
      status: 'quarantined',
      ingestMode: 'watcher',
      sourceSystem: 'lx-annotate quarantine',
      sourceFilePersisted: true,
      cleanupStatus: 'skipped',
      errorCode: 'processing_failed',
      errorDetail: 'Die Datei wurde unter Quarantäne gestellt.'
    }),
    ...normalizeFileOverrides(overrides)
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
      repairAllVideoStates: vi.fn().mockResolvedValue(null),
      retryUploadJob: vi.fn().mockResolvedValue(true),
      dismissUploadJob: vi.fn().mockResolvedValue(true),
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

  it.each(['replace_processed'] as const)('submits all repair pages with stable identity for %s', async (option) => {
    const store = hoisted.anonymizationStoreRef.current
    store.repairAllVideoStates
      .mockResolvedValueOnce({ transcodes: { queued: 2, existing: 1, rejected: 0, nextAfterVideoId: 100 } })
      .mockResolvedValueOnce({ transcodes: { queued: 1, existing: 0, rejected: 2, nextAfterVideoId: null } })
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    wrapper.getComponent(OverviewTranscodePanel).vm.$emit('repair', option)
    await flushPromises()
    expect(store.repairAllVideoStates).toHaveBeenCalledTimes(2)
    const first = store.repairAllVideoStates.mock.calls[0][1] as { idempotencyKey: string }
    expect(first.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(store.repairAllVideoStates).toHaveBeenNthCalledWith(1, false, { option, idempotencyKey: first.idempotencyKey, afterVideoId: 0 })
    expect(store.repairAllVideoStates).toHaveBeenNthCalledWith(2, false, { option, idempotencyKey: first.idempotencyKey, afterVideoId: 100 })
    expect(wrapper.text()).toContain('3 Transkodierungen eingereiht, 1 vorhandene Aufträge, 2 abgelehnt')
    expect(wrapper.getComponent(OverviewTranscodePanel).props('refreshToken')).toBe(2)
  })

  it('retries an unconfirmed page with the same idempotency key and cursor', async () => {
    const store = hoisted.anonymizationStoreRef.current
    store.repairAllVideoStates
      .mockResolvedValueOnce({ transcodes: { queued: 1, existing: 0, rejected: 0, nextAfterVideoId: 100 } })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ transcodes: { queued: 0, existing: 1, rejected: 0, nextAfterVideoId: null } })
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    const panel = wrapper.getComponent(OverviewTranscodePanel)
    panel.vm.$emit('repair', 'replace_processed')
    await flushPromises()
    panel.vm.$emit('repair', 'replace_processed')
    await flushPromises()
    expect(store.repairAllVideoStates).toHaveBeenCalledTimes(3)
    expect(store.repairAllVideoStates.mock.calls[2]).toEqual(store.repairAllVideoStates.mock.calls[1])
  })

  it('does not submit another page after leaving during bulk repair', async () => {
    const store = hoisted.anonymizationStoreRef.current
    let finish!: (value: unknown) => void
    store.repairAllVideoStates.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    const panel = wrapper.getComponent(OverviewTranscodePanel)
    panel.vm.$emit('repair', 'replace_processed')
    panel.vm.$emit('repair', 'replace_processed')
    await flushPromises()
    expect(store.repairAllVideoStates).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    finish({ transcodes: { queued: 1, existing: 0, rejected: 0, nextAfterVideoId: 100 } })
    await flushPromises()
    expect(store.repairAllVideoStates).toHaveBeenCalledTimes(1)
  })

  it.each([0, undefined])('stops on an invalid continuation cursor %s', async (cursor) => {
    hoisted.anonymizationStoreRef.current.repairAllVideoStates.mockResolvedValue({
      transcodes: { queued: 1, existing: 0, rejected: 0, nextAfterVideoId: cursor }
    })
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    wrapper.getComponent(OverviewTranscodePanel).vm.$emit('repair', 'replace_processed')
    await flushPromises()
    expect(hoisted.anonymizationStoreRef.current.repairAllVideoStates).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Ungültiger Fortsetzungspunkt')
  })

  it('reports blocked repairs separately from successful repairs', async () => {
    hoisted.anonymizationStoreRef.current.repairAllVideoStates.mockResolvedValue({
      summary: { repaired: 1, consistent: 2, blocked: 3 }, items: []
    })
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    await wrapper.get('[data-test="repair-all-video-states"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1 repariert, 2 bereits konsistent, 3 blockiert')
  })

  it('cancels by import UUID and displays requested until the worker acknowledges', async () => {
    vi.useFakeTimers()
    const job = buildUploadJob({ id: 'job-cancel-target', status: 'processing', allowedActions: ['cancel'] })
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({ uploadJob: job }),
      buildPdfFile({ id: VIDEO_FILE_ID, uploadJob: { id: 'other-job', status: 'processing' } })
    ]
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    hoisted.cancelImport.mockResolvedValueOnce({
      uploadJob: { ...job, status: 'cancel_requested', allowedActions: [] },
      cancellationRequested: true, sourcePreserved: true
    })
    await wrapper.get('[data-test="cancel-upload-job-button"]').trigger('click')
    await flushPromises()
    expect(hoisted.cancelImport).toHaveBeenCalledWith('job-cancel-target')
    expect(wrapper.text()).toContain('Abbruch angefordert')
    expect(wrapper.find('[data-test="cancel-upload-job-button"]').exists()).toBe(false)
    expect(hoisted.anonymizationStoreRef.current.overview[1].uploadJob).toMatchObject({ id: 'other-job', status: 'processing' })
    const fetches = hoisted.anonymizationStoreRef.current.fetchOverview.mock.calls.length
    await vi.advanceTimersByTimeAsync(15000)
    expect(hoisted.anonymizationStoreRef.current.fetchOverview).toHaveBeenCalledTimes(fetches + 1)
  })

  it('does not duplicate pending cancellation and exposes an unconfirmed request failure', async () => {
    hoisted.anonymizationStoreRef.current.overview = [buildVideoFile({
      uploadJob: { id: 'pending-cancel', status: 'processing', allowedActions: ['cancel'] }
    })]
    let rejectRequest: ((reason: Error) => void) | undefined
    hoisted.cancelImport.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectRequest = reject }))
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    const button = wrapper.get('[data-test="cancel-upload-job-button"]')
    await button.trigger('click')
    await button.trigger('click')
    expect(hoisted.cancelImport).toHaveBeenCalledTimes(1)
    rejectRequest?.(new Error('timeout'))
    await flushPromises()
    expect(wrapper.text()).toContain('Abbruch konnte nicht bestätigt werden')
    expect(wrapper.text()).not.toContain('Import abgebrochen')
  })

  it('ignores a cancellation response after leaving the overview', async () => {
    const job = buildUploadJob({ id: 'leaving-cancel', status: 'processing', allowedActions: ['cancel'] })
    hoisted.anonymizationStoreRef.current.overview = [buildVideoFile({ uploadJob: job })]
    let resolveRequest: ((value: unknown) => void) | undefined
    hoisted.cancelImport.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve }))
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    await wrapper.get('[data-test="cancel-upload-job-button"]').trigger('click')
    wrapper.unmount()
    resolveRequest?.({ uploadJob: { ...job, status: 'cancelled', allowedActions: [] }, cancellationRequested: true, sourcePreserved: true })
    await flushPromises()
    expect(hoisted.anonymizationStoreRef.current.overview[0].uploadJob).toMatchObject({ status: 'processing' })
    expect(hoisted.anonymizationStoreRef.current.fetchOverview).toHaveBeenCalledTimes(1)
  })

  it('does not restart processing for a worker-confirmed cancelled import', async () => {
    vi.useFakeTimers()
    hoisted.anonymizationStoreRef.current.overview = [buildVideoFile({
      anonymizationStatus: 'processing_anonymization',
      uploadJob: { id: 'cancelled-import', status: 'cancelled', allowedActions: [] }
    })]
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    expect(wrapper.text()).toContain('Verarbeitung unterbrochen')
    expect(wrapper.find('progress').exists()).toBe(false)
    expect(hoisted.anonymizationStoreRef.current.startPolling).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(45000)
    expect(hoisted.anonymizationStoreRef.current.fetchOverview).toHaveBeenCalledTimes(1)
  })

  it('uses one aggregate refresh loop for active media and import-only rows', async () => {
    vi.useFakeTimers()
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({ anonymizationStatus: 'processing_anonymization' }),
      buildVideoFile({ id: IMPORT_ONLY_FILE_ID, importOnly: true, uploadJob: { status: 'processing' } })
    ]
    mount(AnonymizationOverviewComponent)
    await flushPromises()
    expect(hoisted.anonymizationStoreRef.current.startPolling).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(15000)
    expect(hoisted.anonymizationStoreRef.current.fetchOverview).toHaveBeenCalledTimes(2)
  })

  it('renders the video file id next to the filename', async () => {
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('study-video.mp4')
    expect(wrapper.text()).toContain('Video-ID: 17')
  })

  it('starts the exact PDF when a video shares its numeric id', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({ anonymizationStatus: 'not_started' }),
      buildPdfFile({ id: VIDEO_FILE_ID, anonymizationStatus: 'not_started' })
    ]
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    const pdfRow = wrapper.get('tbody tr:nth-child(2)')
    const startButton = pdfRow.get('button.btn-outline-primary')
    await startButton.trigger('click')
    await flushPromises()
    expect(hoisted.pollingProtectionRef.current.startAnonymizationSafeWithProtection)
      .toHaveBeenCalledWith(VIDEO_FILE_ID, 'pdf')
    expect(hoisted.pollingProtectionRef.current.canProcessMedia.value)
      .toHaveBeenCalledWith(VIDEO_FILE_ID, 'pdf')
  })

  it('keeps PDF validation and local processing independent from a video with the same id', async () => {
    const store = hoisted.anonymizationStoreRef.current
    store.overview = [
      buildVideoFile({ anonymizationStatus: 'not_started' }),
      buildPdfFile({ id: VIDEO_FILE_ID, anonymizationStatus: 'done_processing_anonymization' })
    ]
    let finishValidation!: (result: boolean) => void
    store.setCurrentForValidation.mockImplementationOnce(() => new Promise<boolean>((resolve) => {
      finishValidation = resolve
    }))
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    const videoRow = wrapper.get('tbody tr:nth-child(1)')
    const pdfRow = wrapper.get('tbody tr:nth-child(2)')
    const validate = pdfRow.get('.validation-action-column button')
    expect(validate.attributes('disabled')).toBeUndefined()
    await validate.trigger('click')
    expect(store.setCurrentForValidation).toHaveBeenCalledWith(VIDEO_FILE_ID, 'pdf')
    expect(videoRow.get('[data-test="delete-file-button"]').attributes('disabled')).toBeUndefined()
    expect(pdfRow.get('[data-test="delete-file-button"]').attributes('disabled')).toBeDefined()
    finishValidation(true)
    await flushPromises()
    expect(hoisted.routerPush).toHaveBeenCalledWith({
      name: 'AnonymisierungValidierung',
      query: { fileId: String(VIDEO_FILE_ID), mediaType: 'pdf' }
    })
  })

  it('blocks ambiguous numeric deletion even when the conflicting row is filtered out', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile(), buildPdfFile({ id: VIDEO_FILE_ID })
    ]
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    await wrapper.get('[data-test="anonymization-resource-type-filter"]').setValue('pdf')
    await wrapper.get('[data-test="delete-file-button"]').trigger('click')
    expect(hoisted.deleteMediaFile).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('nicht eindeutig zuordnen')
  })

  it('starts monitoring when an active import appears after initial load', async () => {
    vi.useFakeTimers()
    mount(AnonymizationOverviewComponent)
    await flushPromises()
    const store = hoisted.anonymizationStoreRef.current
    store.overview = [buildVideoFile({ uploadJob: buildUploadJob({ status: 'processing' }) })]
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(store.fetchOverview).toHaveBeenCalledTimes(2)
    store.overview = [buildVideoFile()]
    await flushPromises()
    await vi.advanceTimersByTimeAsync(30000)
    expect(store.fetchOverview).toHaveBeenCalledTimes(2)
  })

  it('serializes manual and monitoring refresh requests', async () => {
    vi.useFakeTimers()
    const store = hoisted.anonymizationStoreRef.current
    store.overview = [buildVideoFile({ uploadJob: buildUploadJob({ status: 'processing' }) })]
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    let finishRefresh!: () => void
    store.fetchOverview.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishRefresh = resolve
    }))
    await wrapper.find('button.btn-outline-primary').trigger('click')
    await vi.advanceTimersByTimeAsync(15000)
    expect(store.fetchOverview).toHaveBeenCalledTimes(2)
    finishRefresh()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(store.fetchOverview).toHaveBeenCalledTimes(3)
  })

  it.each(['rejected', 'reported'])('retries a %s initial refresh failure', async (failure) => {
    vi.useFakeTimers()
    const store = hoisted.anonymizationStoreRef.current
    store.overview = []
    if (failure === 'rejected') store.fetchOverview.mockRejectedValueOnce(new Error('Unavailable'))
    else store.fetchOverview.mockImplementationOnce(() => {
      store.error = 'Unavailable'
      return Promise.resolve([])
    })
    store.fetchOverview.mockImplementationOnce(() => {
      store.error = null
      return Promise.resolve([])
    })
    mount(AnonymizationOverviewComponent)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(15000)
    expect(store.fetchOverview).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(30000)
    expect(store.fetchOverview).toHaveBeenCalledTimes(2)
  })

  it('does not restart monitoring or per-file polling after unmount during initial refresh', async () => {
    vi.useFakeTimers()
    const store = hoisted.anonymizationStoreRef.current
    store.overview = [buildVideoFile({
      anonymizationStatus: 'processing_anonymization',
      uploadJob: buildUploadJob({ status: 'processing' })
    })]
    let finishRefresh!: () => void
    store.fetchOverview.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishRefresh = resolve
    }))
    const wrapper = mount(AnonymizationOverviewComponent)
    wrapper.unmount()
    finishRefresh()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(30000)
    expect(store.fetchOverview).toHaveBeenCalledTimes(1)
    expect(store.startPolling).not.toHaveBeenCalled()
    expect(hoisted.mediaStoreRef.current.seedTypesFromOverview).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps media type in correction identity when a PDF and video share an id', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildPdfFile({ id: 3, anonymizationStatus: 'validated' }),
      buildVideoFile({ id: 3, anonymizationStatus: 'validated' })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    const videoRow = wrapper
      .findAll('tbody tr')
      .find((row) => row.text().includes('study-video.mp4'))
    if (!videoRow) throw new Error('Expected the colliding video row to be rendered.')

    await videoRow.get('[data-test="correction-button"]').trigger('click')

    expect(hoisted.mediaStoreRef.current.setCurrentItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, mediaType: 'video' })
    )
    expect(hoisted.routerPush).toHaveBeenCalledWith({
      name: 'Anonymisierung Korrektur',
      params: { fileId: '3' },
      query: { mediaType: 'video' }
    })
  })

  it('offers correction for an anonymized PDF', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildPdfFile({ anonymizationStatus: 'done_processing_anonymization' })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    await wrapper.get('[data-test="correction-button"]').trigger('click')

    expect(hoisted.routerPush).toHaveBeenCalledWith({
      name: 'Anonymisierung Korrektur',
      params: { fileId: '23' },
      query: { mediaType: 'pdf' }
    })
  })

  it('shows authorization errors without the misleading empty-state message', async () => {
    hoisted.anonymizationStoreRef.current.error =
      'Fehler beim Laden der Übersicht (403): Keine Center-Zuordnung'
    hoisted.anonymizationStoreRef.current.overview = []

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Keine Center-Zuordnung')
    expect(wrapper.text()).not.toContain('Keine Dateien vorhanden')
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
          errorDetail:
            'duplicate key value violates unique constraint "endoreg_db_videofile_video_hash_key"'
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
        id: VIDEO_FILE_ID,
        uploadJob: {
          id: 'deleted-source',
          status: 'anonymized',
          sourceFilePersisted: false,
          cleanupStatus: 'completed'
        }
      }),
      buildPdfFile({
        id: PDF_FILE_ID,
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

  it('filters the large overview by resource type and physical storage state', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        id: VIDEO_FILE_ID,
        uploadJob: {
          id: 'deleted-video-source',
          status: 'anonymized',
          sourceFilePersisted: false,
          cleanupStatus: 'completed'
        }
      }),
      buildPdfFile({
        id: PDF_FILE_ID,
        uploadJob: {
          id: 'present-pdf-source',
          status: 'anonymized',
          sourceFilePersisted: true,
          cleanupStatus: 'pending'
        }
      }),
      buildQuarantinedVideoFile()
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    await wrapper.get('[data-test="anonymization-resource-type-filter"]').setValue('pdf')
    let rows = wrapper.findAll('table.overview-files-table tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('study-report.pdf')
    expect(wrapper.get('[data-test="anonymization-overview-filters"]').text()).toContain(
      '1 von 3 Ressourcen'
    )

    await wrapper.get('[data-test="anonymization-storage-state-filter"]').setValue('deleted')
    expect(wrapper.find('[data-test="anonymization-filter-empty"]').exists()).toBe(true)

    await wrapper.get('[data-test="anonymization-filters-reset"]').trigger('click')
    rows = wrapper.findAll('table.overview-files-table tbody tr')
    expect(rows).toHaveLength(3)

    await wrapper.get('[data-test="anonymization-storage-state-filter"]').setValue('quarantined')
    rows = wrapper.findAll('table.overview-files-table tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('quarantined-video.mov')
  })

  it('keeps the filename column identifiable for sticky horizontal scrolling', async () => {
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.find('table.overview-files-table').exists()).toBe(true)
    expect(wrapper.find('thead .sticky-filename-column').text()).toBe('Dateiname')
    expect(wrapper.find('tbody .sticky-filename-column').text()).toContain('study-video.mp4')
  })

  it('keeps validation visible and synchronizes the sticky horizontal scrollbar', async () => {
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    const scrollWrapper = wrapper.find<HTMLElement>('[data-test="overview-table-scroll"]')
    const element = scrollWrapper.element
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 800 })
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 1600 })

    await scrollWrapper.trigger('scroll')

    const stickyScrollbar = wrapper.find<HTMLElement>('[data-test="overview-sticky-scrollbar"]')
    expect(stickyScrollbar.isVisible()).toBe(true)
    expect(stickyScrollbar.find('div').attributes('style')).toContain('width: 1600px')

    stickyScrollbar.element.scrollLeft = STICKY_SCROLL_OFFSET
    await stickyScrollbar.trigger('scroll')

    expect(element.scrollLeft).toBe(STICKY_SCROLL_OFFSET)

    element.scrollLeft = TABLE_SCROLL_OFFSET
    await scrollWrapper.trigger('scroll')

    expect(stickyScrollbar.element.scrollLeft).toBe(TABLE_SCROLL_OFFSET)
    expect(wrapper.find('thead .validation-action-column').text()).toBe('Validierung')
    expect(wrapper.find('tbody .validation-action-column button').text()).toContain('Validieren')
  })

  it('renders a delete button for every overview row regardless of status', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({ id: VIDEO_FILE_ID, anonymizationStatus: 'done_processing_anonymization' }),
      buildVideoFile({
        id: 18,
        filename: 'processing-video.mp4',
        anonymizationStatus: 'processing_anonymization'
      }),
      buildPdfFile({ id: PDF_FILE_ID, anonymizationStatus: 'failed' })
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

  it('removes an import-only row by UUID after confirmation, without media deletion', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const jobId = 'db0a99ff-0129-4c13-b5c9-f584bf21d1b2'
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        id: IMPORT_ONLY_FILE_ID,
        importOnly: true,
        canDismissImport: true,
        anonymizationStatus: 'failed',
        uploadJob: {
          id: jobId,
          status: 'error',
          errorCode: 'duplicate_content',
          allowedActions: []
        }
      })
    ]
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(false)
    await wrapper.get('[data-test="dismiss-import-button"]').trigger('click')
    expect(hoisted.anonymizationStoreRef.current.dismissUploadJob).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    await wrapper.get('[data-test="dismiss-import-button"]').trigger('click')
    await flushPromises()
    expect(hoisted.anonymizationStoreRef.current.dismissUploadJob).toHaveBeenCalledWith(jobId)
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('Quelldatei und Importverlauf bleiben erhalten')
    )
    confirm.mockRestore()
  })

  it('does not offer dismissal when the server disallows it', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        id: IMPORT_ONLY_FILE_ID,
        importOnly: true,
        canDismissImport: false,
        anonymizationStatus: 'failed',
        uploadJob: { status: 'lost', errorCode: 'source_missing' }
      })
    ]
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()
    expect(wrapper.find('[data-test="dismiss-import-button"]').exists()).toBe(false)
  })

  it('renders quarantined videos as visible read-only overview rows', async () => {
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({ id: VIDEO_FILE_ID }),
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
          errorDetail:
            'Import service is temporarily unavailable. An automatic retry is scheduled.',
          retryable: true,
          retryCount: 2,
          maxRetries: UPLOAD_MAX_RETRIES,
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

  it('shows an unattached storage failure and retries it by upload-job id', async () => {
    vi.useFakeTimers()
    hoisted.anonymizationStoreRef.current.overview = [
      buildVideoFile({
        id: IMPORT_ONLY_FILE_ID,
        filename: 'storage-blocked.mp4',
        importOnly: true,
        anonymizationStatus: 'failed',
        annotationStatus: '',
        uploadJob: {
          id: 'db0a99ff-0129-4c13-b5c9-f584bf21d1b2',
          status: 'error',
          ingestMode: 'watcher',
          sourceFilePersisted: true,
          cleanupStatus: 'pending',
          allowedActions: ['safe_reimport', 'delete'],
          errorCode: 'processing_failed',
          errorDetail:
            'Import processing failed. Technical details are available in protected logs.'
        }
      })
    ]

    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('storage-blocked.mp4')
    expect(wrapper.text()).toContain('Import-ID: db0a99ff-0129-4c13-b5c9-f584bf21d1b2')
    expect(wrapper.text()).not.toContain('Video-ID: -123')
    const retryButton = wrapper.find('[data-test="retry-upload-job-button"]')
    expect(retryButton.text()).toContain('Jetzt erneut versuchen')
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(false)

    hoisted.anonymizationStoreRef.current.retryUploadJob.mockImplementation(() => {
      hoisted.anonymizationStoreRef.current.overview = [
        buildVideoFile({
          id: IMPORT_ONLY_FILE_ID,
          importOnly: true,
          anonymizationStatus: 'processing_anonymization',
          uploadJob: buildUploadJob({ status: 'processing' })
        })
      ]
      return Promise.resolve(true)
    })
    await retryButton.trigger('click')
    await flushPromises()

    expect(hoisted.anonymizationStoreRef.current.retryUploadJob).toHaveBeenCalledWith(
      'db0a99ff-0129-4c13-b5c9-f584bf21d1b2'
    )
    const refreshes = hoisted.anonymizationStoreRef.current.fetchOverview.mock.calls.length
    await vi.advanceTimersByTimeAsync(15000)
    expect(hoisted.anonymizationStoreRef.current.fetchOverview).toHaveBeenCalledTimes(refreshes + 1)
    wrapper.unmount()
    vi.useRealTimers()
  })

  it.each([
    ['pending', 'Import wartet', false],
    ['processing', 'Import läuft', false],
    ['error', 'Importfehler', true],
    ['lost', 'Importquelle fehlt (LOST)', true]
  ])(
    'renders upload state %s with the expected server action',
    async (status, label, deleteAllowed) => {
      hoisted.anonymizationStoreRef.current.overview = [
        buildVideoFile({
          uploadJob: {
            id: `job-${status}`,
            status,
            ingestMode: 'api',
            sourceFilePersisted: true,
            cleanupStatus: 'pending',
            allowedActions: deleteAllowed ? ['safe_reimport', 'delete'] : [],
            errorCode:
              status === 'lost' ? 'source_missing' : status === 'error' ? 'processing_failed' : '',
            errorDetail: status === 'error' || status === 'lost' ? 'Safe operator message.' : ''
          }
        })
      ]

      const wrapper = mount(AnonymizationOverviewComponent)
      await flushPromises()

      expect(wrapper.text()).toContain(label)
      expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(deleteAllowed)
    }
  )

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

  it.each([
    ['ready', 'Bereit'],
    ['queued', 'Wartet'],
    ['failed', 'Fehlgeschlagen']
  ])(
    'shows only the processed derivative for a validated video with %s HLS',
    async (status, label) => {
      const materialization = (artifactKind: string, state: string) => ({
        artifactKind,
        status: state,
        triggeringUploadJobId: null,
        sourceGenerationId: '63d82006-b275-4b40-b383-ae41855c1163',
        targetGenerationId: '3f6ed855-eb27-4386-a08d-fd8e99d89c06',
        segmentCount: 0,
        errorCode: state === 'failed' ? 'materialization_failed' : '',
        createdAt: '2026-09-08T07:20:22Z',
        updatedAt: '2026-09-08T07:21:22Z'
      })
      hoisted.anonymizationStoreRef.current.overview = [
        buildVideoFile({
          id: 12,
          anonymizationStatus: 'validated',
          annotationStatus: 'validated',
          hlsMaterializations: [
            materialization('raw', 'failed'),
            materialization('processed', status)
          ]
        })
      ]

      const wrapper = mount(AnonymizationOverviewComponent)
      await flushPromises()

      expect(wrapper.text()).not.toContain('Rohvideo:')
      expect(wrapper.text()).toContain(`Anonymisiert: ${label}`)
      expect(
        wrapper.find('.hls-materialization-summary').text().includes('HLS-Erzeugung fehlgeschlagen')
      ).toBe(status === 'failed')
      expect(hoisted.anonymizationStoreRef.current.overview[0].hlsMaterializations).toHaveLength(2)
    }
  )

  it('shows queued and materializing HTTP Live Streaming as active states', async () => {
    const materialization = (
      artifactKind: 'raw' | 'processed',
      status: 'queued' | 'materializing'
    ) => ({
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
