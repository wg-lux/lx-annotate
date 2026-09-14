import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { FileItem, UploadJobOverview } from '@/stores/anonymizationStore'
import AnonymizationOverviewRow from '../AnonymizationOverviewRow.vue'

const video: FileItem = {
  id: 17,
  filename: 'study-video.mp4',
  mediaType: 'video',
  anonymizationStatus: 'done_processing_anonymization',
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

function renderRow(file: FileItem = video) {
  return mount(AnonymizationOverviewRow, {
    props: {
      file,
      processing: false,
      retryProcessing: false,
      readyForValidation: true,
      iconClass: 'ni ni-video',
      mediaTypeBadgeClass: 'bg-primary'
    }
  })
}

describe('AnonymizationOverviewRow', () => {
  it('keeps anonymization, annotation and validation in separate cells', async () => {
    const wrapper = renderRow()
    const cells = wrapper.findAll('td')
    expect(cells).toHaveLength(10)
    expect(cells[5].text()).toBe('Fertig')
    expect(cells[6].text()).toBe('Nicht gestartet')
    await cells[7].get('button').trigger('click')
    expect(wrapper.emitted('validate')).toEqual([[video]])

    await wrapper.setProps({ file: { ...video, anonymizationStatus: 'validated' } })
    expect(cells[7].find('button').exists()).toBe(false)
    expect(cells[7].text()).toBe('Validiert')
    expect(cells[6].text()).toBe('Nicht gestartet')
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
