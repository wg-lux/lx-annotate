import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import axiosInstance from '@/api/axiosInstance'
import VideoExaminationAnnotation from '../VideoExaminationAnnotation.vue'
import { useAnonymizationStore } from '@/stores/anonymizationStore'

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  },
  r: (path: string) => path
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn()
  }),
  useRoute: () => ({
    query: {}
  })
}))

vi.mock('@/utils/videoUtils', () => ({
  formatTime: (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`,
  getTranslationForLabel: (label: string) => label,
  getColorForLabel: () => '#ff0000'
}))

vi.mock('@/stores/auth_kc', () => ({
  useAuthKcStore: () => ({
    user: {
      sub: 'kc-user-7',
      username: 'annotator'
    }
  })
}))

describe('VideoExaminationAnnotation dropdown status display', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())

    const anonymizationStore = useAnonymizationStore()

    // Regression guard: anonymization validation and segment annotation
    // validation are distinct gates and must not collapse into one green state.
    anonymizationStore.overview = [
      {
        id: 6,
        filename: 'needs-validation.mp4',
        mediaType: 'video',
        anonymizationStatus: 'done_processing_anonymization',
        annotationStatus: 'not_started',
        createdAt: '2026-04-30T08:00:00Z'
      },
      {
        id: 8,
        filename: 'ready-for-reporting.mp4',
        mediaType: 'video',
        anonymizationStatus: 'validated',
        annotationStatus: 'validated',
        createdAt: '2026-04-30T08:15:00Z'
      },
      {
        id: 10,
        filename: 'already-segment-validated.mp4',
        mediaType: 'video',
        anonymizationStatus: 'validated',
        annotationStatus: 'validated',
        createdAt: '2026-04-30T08:30:00Z'
      }
    ]
    anonymizationStore.fetchOverview = vi.fn().mockResolvedValue(undefined)

    vi.mocked(axiosInstance.get).mockImplementation(async (url: string) => {
      if (url === 'media/videos/labels/list/') {
        return { data: [] } as any
      }
      if (url === 'media/videos/') {
        return {
          data: [
            {
              id: 6,
              original_file_name: 'needs-validation.mp4',
              centerName: 'Center A',
              segmentAnnotationsValidated: false
            },
            {
              id: 8,
              original_file_name: 'ready-for-reporting.mp4',
              centerName: 'Center B',
              segmentAnnotationsValidated: false
            },
            {
              id: 10,
              original_file_name: 'already-segment-validated.mp4',
              centerName: 'Center C',
              segmentAnnotationsValidated: true,
              validatedAnnotators: ['oidc:reviewer-previous']
            }
          ]
        } as any
      }
      if (url.includes('/sensitive-metadata/')) {
        return { data: { patient_dob: null, patient_gender_name: null } } as any
      }
      return { data: {} } as any
    })
  })

  it('shows explicit readiness text and enlarged status-bar classes in the video dropdown', async () => {
    const wrapper = mount(VideoExaminationAnnotation, {
      global: {
        stubs: {
          Timeline: true,
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          }
        }
      }
    })
    await flushPromises()

    await wrapper.find('.video-dropdown-trigger').trigger('click')
    await flushPromises()

    const items = wrapper.findAll('.video-dropdown-item')
    expect(items).toHaveLength(3)
    expect(items[0].classes()).toContain('video-dropdown-item-pending')
    expect(items[1].classes()).toContain('video-dropdown-item-ready')
    expect(items[2].classes()).toContain('video-dropdown-item-validated')
    expect(items[0].text()).toContain('Zurück zu Schritt 1 - Anonymisierung validieren')
    expect(items[1].text()).toContain('Video startklar für Befundung!')
    expect(items[2].text()).toContain('Video bereits validiert')
    expect(items[2].text()).toContain('Vorannotation von: oidc:reviewer-previous')
    expect(wrapper.find('.video-dropdown-status-badge i').exists()).toBe(false)
  })
})
