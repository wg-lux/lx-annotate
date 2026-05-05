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

describe('AnonymizationOverviewComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    hoisted.anonymizationStoreRef.current = reactive({
      error: null,
      loading: false,
      overview: [buildVideoFile()],
      fetchOverview: vi.fn().mockResolvedValue(undefined),
      setCurrentForValidation: vi.fn().mockResolvedValue(true),
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

  it('keeps the filename column identifiable for sticky horizontal scrolling', async () => {
    const wrapper = mount(AnonymizationOverviewComponent)
    await flushPromises()

    expect(wrapper.find('table.overview-files-table').exists()).toBe(true)
    expect(wrapper.find('thead .sticky-filename-column').text()).toBe('Dateiname')
    expect(wrapper.find('tbody .sticky-filename-column').text()).toContain('study-video.mp4')
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
})
