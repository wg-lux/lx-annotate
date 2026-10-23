import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type {
  FileItem,
  HlsMaterializationOverview,
  UploadJobOverview
} from '@/stores/anonymizationStore'
import AnonymizationOverviewRow from '../AnonymizationOverviewRow.vue'

const video: FileItem = {
  id: 17,
  filename: 'study-video.mp4',
  mediaType: 'video',
  anonymizationStatus: 'done_processing_anonymization',
  anonymizationPhase: 'awaiting_validation',
  aiPredictionStatus: 'prediction_pending' as const,
  annotationStatus: 'not_started',
  createdAt: '2026-04-30T08:00:00Z',
  sensitiveMetaId: 42,
  metadataImported: true
}

const failedImport: UploadJobOverview = {
  id: 'failed-import',
  status: 'error',
  ingestMode: 'watcher',
  sourceSystem: 'clinical-node',
  sourceCenterKey: null,
  originalFilename: video.filename,
  sourceFilePersisted: true,
  cleanupStatus: 'pending',
  allowedActions: ['safe_reimport', 'delete'],
  errorCode: 'processing_failed',
  errorDetail: 'Internal server detail must not be rendered.',
  retryable: true,
  retryCount: 0,
  maxRetries: 3,
  nextRetryAt: null,
  lastAttemptAt: null,
  createdAt: video.createdAt,
  updatedAt: video.createdAt
}

const hlsMaterialization: HlsMaterializationOverview = {
  artifactKind: 'raw',
  status: 'materializing',
  triggeringUploadJobId: null,
  sourceGenerationId: 'source-generation',
  targetGenerationId: 'target-generation',
  segmentCount: 12,
  errorCode: '',
  createdAt: video.createdAt,
  updatedAt: video.createdAt
}

// Existing row contracts cover the technical view; clinical tests pass false.
function renderRow(file: FileItem = video, technicalDetails = true) {
  return mount(AnonymizationOverviewRow, {
    props: {
      file,
      processing: false,
      retryProcessing: false,
      readyForValidation: true,
      iconClass: 'ni ni-video',
      mediaTypeBadgeClass: 'bg-primary',
      technicalDetails
    }
  })
}

describe('AnonymizationOverviewRow', () => {
  it.each([
    ['prediction_pending', 'KI-Vorhersage ausstehend'],
    ['prediction_ready', 'KI-Vorhersage bereit'],
    ['annotation_ready', 'KI-Segmente erstellt'],
    ['frames_unavailable', 'KI: Einzelbilder fehlen']
  ] as const)('shows the server AI prediction state %s', (aiPredictionStatus, label) => {
    const wrapper = renderRow({ ...video, aiPredictionStatus })
    expect(wrapper.get('[data-test="ai-prediction-status"]').text()).toBe(label)
  })

  it('shows clinical staff one plain status column without technical cells', () => {
    const wrapper = renderRow(video, false)
    expect(wrapper.findAll('td')).toHaveLength(7)
    expect(wrapper.get('[data-test="clinical-status"]').text()).toContain('Bitte validieren')
    expect(wrapper.find('.upload-job-summary').exists()).toBe(false)
    expect(wrapper.find('.hls-materialization-summary').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Zustand reparieren')
  })

  it.each([
    [{ uploadJob: failedImport }, true],
    [{ uploadJob: { ...failedImport, errorCode: 'duplicate_content' as const } }, false],
    [{ hlsMaterializations: [{ ...hlsMaterialization, status: 'failed' as const }] }, true],
    [{}, false]
  ])('marks hidden technical errors without exposing their detail %#', (overrides, marked) => {
    const clinical = renderRow({ ...video, ...overrides }, false)
    expect(clinical.find('[data-test="technical-issue-marker"]').exists()).toBe(marked)
    expect(clinical.text()).not.toContain('Server-Log')
    const technical = renderRow({ ...video, ...overrides }, true)
    expect(technical.find('[data-test="technical-issue-marker"]').exists()).toBe(false)
  })

  it.each([
    [{ anonymizationStatus: 'failed', anonymizationPhase: 'failed' }, 'Verarbeitung fehlgeschlagen'],
    [{ anonymizationStatus: 'started', anonymizationPhase: 'in_progress' }, 'Wird verarbeitet'],
    [{ anonymizationStatus: 'validated', anonymizationPhase: 'validated' }, 'Validiert'],
    [{ anonymizationStatus: 'not_started', anonymizationPhase: 'not_started' }, 'Bereit zum Start'],
    [{ quarantined: true }, 'Import angehalten'],
    [{ importOnly: true, uploadJob: failedImport }, 'Import fehlgeschlagen']
  ] as const)('translates server state into a clinical label %#', (overrides, label) => {
    const wrapper = renderRow({ ...video, ...overrides }, false)
    expect(wrapper.get('[data-test="clinical-status"] .badge').text()).toBe(label)
  })

  it('shows no AI prediction badge for rows without predictions', () => {
    const wrapper = renderRow({ ...video, mediaType: 'pdf', aiPredictionStatus: null })
    expect(wrapper.find('[data-test="ai-prediction-status"]').exists()).toBe(false)
  })

  it('allows advertised cancellation during processing and waits for the worker acknowledgment', async () => {
    const file: FileItem = {
      ...video,
      uploadJob: {
        ...failedImport,
        status: 'processing',
        errorCode: '',
        allowedActions: ['cancel']
      }
    }
    const wrapper = renderRow(file)
    await wrapper.setProps({ processing: true })
    const button = wrapper.get('[data-test="cancel-upload-job-button"]')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    expect(wrapper.emitted('cancel-import')).toEqual([[file]])
    await wrapper.setProps({ retryProcessing: true })
    expect(button.attributes('disabled')).toBeDefined()
    await wrapper.setProps({
      file: {
        ...file,
        uploadJob: { ...failedImport, status: 'cancel_requested', allowedActions: [] }
      }
    })
    expect(wrapper.find('[data-test="cancel-upload-job-button"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Abbruch angefordert')
    expect(wrapper.find('progress').exists()).toBe(true)
    await wrapper.setProps({
      file: { ...file, uploadJob: { ...failedImport, status: 'cancelled', allowedActions: [] } }
    })
    expect(wrapper.text()).toContain('Import abgebrochen')
    expect(wrapper.find('progress').exists()).toBe(false)
  })

  it('does not invent cancellation capability from a running import state', () => {
    const wrapper = renderRow({
      ...video,
      uploadJob: { ...failedImport, status: 'processing', allowedActions: [] }
    })
    expect(wrapper.find('[data-test="cancel-upload-job-button"]').exists()).toBe(false)
  })
  it.each([
    ['pending', 'Import wartet'],
    ['processing', 'Import läuft'],
    ['retrying', 'Import wird erneut versucht']
  ] as const)('shows indeterminate import progress for %s', (status, label) => {
    const wrapper = renderRow({ ...video, uploadJob: { ...failedImport, status } })
    const progress = wrapper.get('progress')
    expect(progress.attributes('aria-label')).toBe(`${video.filename}: ${label}`)
    expect(progress.attributes('value')).toBeUndefined()
    expect(progress.attributes('aria-valuenow')).toBeUndefined()
    expect(wrapper.text()).toContain(label)
  })

  it.each(['anonymized', 'error', 'lost', 'quarantined'] as const)(
    'removes import progress when the server reports %s',
    async (status) => {
      const wrapper = renderRow({
        ...video,
        uploadJob: { ...failedImport, status: 'processing' }
      })
      expect(wrapper.find('progress').exists()).toBe(true)
      await wrapper.setProps({ file: { ...video, uploadJob: { ...failedImport, status } } })
      expect(wrapper.find('progress').exists()).toBe(false)
      expect(wrapper.find('.upload-job-summary .badge').exists()).toBe(true)
    }
  )

  it.each([
    ['queued', 'Wartet'],
    ['materializing', 'Wird erzeugt']
  ] as const)('shows indeterminate HLS progress for %s despite segment counts', (status, label) => {
    const wrapper = renderRow({
      ...video,
      hlsMaterializations: [{ ...hlsMaterialization, status }]
    })
    const progress = wrapper.get('progress')
    expect(progress.attributes('aria-label')).toBe(`${video.filename}: HLS Rohvideo – ${label}`)
    expect(progress.attributes('value')).toBeUndefined()
    expect(progress.attributes('aria-valuenow')).toBeUndefined()
    expect(wrapper.text()).toContain(label)
  })

  it.each(['ready', 'failed'] as const)(
    'removes HLS progress when the server reports %s',
    async (status) => {
      const wrapper = renderRow({ ...video, hlsMaterializations: [hlsMaterialization] })
      expect(wrapper.find('progress').exists()).toBe(true)
      await wrapper.setProps({
        file: { ...video, hlsMaterializations: [{ ...hlsMaterialization, status }] }
      })
      expect(wrapper.find('progress').exists()).toBe(false)
      expect(wrapper.find('.hls-materialization-summary .badge').exists()).toBe(true)
    }
  )

  it('hides raw HLS progress after anonymization validation while retaining processed progress', () => {
    const wrapper = renderRow({
      ...video,
      anonymizationStatus: 'validated',
      hlsMaterializations: [
        hlsMaterialization,
        { ...hlsMaterialization, artifactKind: 'processed' }
      ]
    })
    expect(wrapper.findAll('progress')).toHaveLength(1)
    expect(wrapper.get('progress').attributes('aria-label')).toContain('HLS Anonymisiert')
    expect(wrapper.find('.hls-materialization-summary').text()).not.toContain('Rohvideo')
  })

  it('does not show progress when monitoring data is absent', () => {
    expect(renderRow().find('progress').exists()).toBe(false)
  })

  it('keeps anonymization, annotation and validation in separate cells', async () => {
    const wrapper = renderRow()
    const cells = wrapper.findAll('td')
    const validation = wrapper.get('td.validation-action-column')
    expect(cells).toHaveLength(11)
    expect(cells[7].text()).toBe('Fertig')
    expect(cells[8].get('.badge').text()).toBe('Nicht gestartet')
    expect(cells[8].get('[data-test="ai-prediction-status"]').text()).toBe(
      'KI-Vorhersage ausstehend'
    )
    expect(validation.text()).toContain('Anonymisierung validieren')
    await validation.get('button').trigger('click')
    expect(wrapper.emitted('validate')).toEqual([[video]])

    await wrapper.setProps({ file: { ...video, anonymizationStatus: 'validated' } })
    expect(validation.find('button').exists()).toBe(false)
    expect(validation.text()).toBe('Anonymisierung validiert')
    expect(cells[8].get('.badge').text()).toBe('Nicht gestartet')
  })

  it.each([
    {
      label: 'Zustand reparieren',
      event: 'repair-video',
      file: { ...video, metadataImported: false }
    },
    {
      label: 'Erneut importieren',
      event: 'reimport-pdf',
      file: { ...video, mediaType: 'pdf' as const, metadataImported: false }
    },
    {
      label: 'Starten',
      event: 'start-anonymization',
      file: { ...video, anonymizationStatus: 'not_started' as const }
    },
    {
      label: 'Erneut versuchen',
      event: 'start-anonymization',
      file: { ...video, anonymizationStatus: 'failed' as const }
    },
    { label: 'Korrektur', event: 'correct', file: video },
    { label: 'Löschen', event: 'delete', file: video }
  ])('emits $event with the complete resource identity', async ({ label, event, file }) => {
    const wrapper = renderRow(file)
    const button = wrapper.findAll('button').find((candidate) => candidate.text() === label)
    if (!button) {
      throw new Error(`Missing action button: ${label}`)
    }
    await button.trigger('click')
    expect(wrapper.emitted(event)).toEqual([[file]])
  })

  it('keeps import retry and dismissal separate from managed-media deletion', async () => {
    const file: FileItem = {
      ...video,
      id: -123,
      importOnly: true,
      canDismissImport: true,
      anonymizationStatus: 'not_started',
      uploadJob: failedImport
    }
    const wrapper = renderRow(file)
    await wrapper.get('[data-test="retry-upload-job-button"]').trigger('click')
    await wrapper.get('[data-test="dismiss-import-button"]').trigger('click')
    expect(wrapper.emitted('retry-import')).toEqual([[file]])
    expect(wrapper.emitted('dismiss-import')).toEqual([[file]])
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Importfehler. Details sind im Server-Log verfügbar.')
    expect(wrapper.text()).not.toContain(failedImport.errorDetail)

    await wrapper.setProps({ processing: true })
    expect(
      wrapper.get('[data-test="retry-upload-job-button"]').attributes('disabled')
    ).toBeUndefined()
    expect(wrapper.get('[data-test="dismiss-import-button"]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ retryProcessing: true })
    expect(
      wrapper.get('[data-test="retry-upload-job-button"]').attributes('disabled')
    ).toBeDefined()
  })

  it('keeps quarantined resources visible without import or correction actions', () => {
    const wrapper = renderRow({
      ...video,
      quarantined: true,
      anonymizationStatus: 'not_started',
      quarantineReviewStatus: 'pending_review'
    })
    expect(wrapper.classes()).toContain('table-warning')
    expect(wrapper.text()).toContain('Serverseitige Quarantäne')
    expect(wrapper.text()).toContain('Review erforderlich')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('respects the allowed import actions and updates when permissions change', async () => {
    const file: FileItem = {
      ...video,
      metadataImported: false,
      uploadJob: { ...failedImport, allowedActions: [] }
    }
    const wrapper = renderRow(file)
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Zustand reparieren')
    await wrapper.setProps({ file: { ...file, uploadJob: failedImport } })
    expect(wrapper.find('[data-test="delete-file-button"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Zustand reparieren')
  })
})
