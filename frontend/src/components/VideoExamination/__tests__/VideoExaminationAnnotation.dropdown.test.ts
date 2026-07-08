import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import axiosInstance from '@/api/axiosInstance'
import VideoExaminationAnnotation from '../VideoExaminationAnnotation.vue'
import { useAnonymizationStore } from '@/stores/anonymizationStore'

const routerMocks = vi.hoisted(() => ({
  query: {} as Record<string, string>,
  replace: vi.fn(),
  push: vi.fn()
}))

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
    replace: routerMocks.replace,
    push: routerMocks.push
  }),
  useRoute: () => ({
    query: routerMocks.query
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
  let mediaVideosFactory: () => any[]

  const baseMediaVideos = () => [
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
    },
    {
      id: 14,
      original_file_name: 'cleanup-running.mp4',
      centerName: 'Center E',
      segmentAnnotationsValidated: false,
      segmentAnnotationStatus: 'cleanup_running'
    },
    {
      id: 16,
      original_file_name: 'cleanup-failed.mp4',
      centerName: 'Center F',
      segmentAnnotationsValidated: true,
      segmentAnnotationStatus: 'cleanup_failed',
      outsideSegmentsRemoved: true,
      postValidationRebuild: {
        status: 'failed',
        details: 'frame verification failed'
      }
    },
    {
      id: 12,
      original_file_name: 'still-processing.mp4',
      centerName: 'Center D',
      segmentAnnotationsValidated: false
    }
  ]

  const mountComponent = () =>
    mount(VideoExaminationAnnotation, {
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

  const findButtonByText = (wrapper: ReturnType<typeof mount>, text: string) =>
    wrapper.findAll('button').find((button) => button.text().includes(text))

  const openVideoDropdown = async (wrapper: ReturnType<typeof mount>) => {
    await wrapper.find('.video-dropdown-trigger').trigger('click')
    await flushPromises()
  }

  const getDropdownItems = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('.video-dropdown-item')

  const findDropdownFilterButton = (wrapper: ReturnType<typeof mount>, labelPrefix: string) =>
    wrapper
      .findAll('.video-dropdown-filter-button')
      .find((button) => button.text().startsWith(labelPrefix))

  const chooseDropdownFilter = async (wrapper: ReturnType<typeof mount>, labelPrefix: string) => {
    const button = findDropdownFilterButton(wrapper, labelPrefix)
    expect(button).toBeTruthy()
    await button!.trigger('click')
    await flushPromises()
  }

  const expectVisibleVideos = (wrapper: ReturnType<typeof mount>, expectedNames: string[]) => {
    const itemTexts = getDropdownItems(wrapper).map((item) => item.text())
    expect(itemTexts).toHaveLength(expectedNames.length)
    expectedNames.forEach((name) => {
      expect(itemTexts.some((text) => text.includes(name))).toBe(true)
    })
  }

  const expectDropdownItemState = (
    wrapper: ReturnType<typeof mount>,
    videoText: string,
    itemClass: string,
    badgeClass: string,
    statusText: string
  ) => {
    const item = getDropdownItems(wrapper).find((entry) => entry.text().includes(videoText))
    expect(item).toBeTruthy()
    expect(item!.classes()).toContain(itemClass)
    expect(item!.find('.video-dropdown-status-badge').classes()).toContain(badgeClass)
    expect(item!.text()).toContain(statusText)
  }

  const selectVideoFromDropdown = async (wrapper: ReturnType<typeof mount>, videoText: string) => {
    await openVideoDropdown(wrapper)
    const item = wrapper
      .findAll('.video-dropdown-item')
      .find((entry) => entry.text().includes(videoText))
    expect(item).toBeTruthy()
    await item!.trigger('click')
    await flushPromises()
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    routerMocks.query = {}
    setActivePinia(createPinia())
    mediaVideosFactory = baseMediaVideos

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
      },
      {
        id: 14,
        filename: 'cleanup-running.mp4',
        mediaType: 'video',
        anonymizationStatus: 'validated',
        annotationStatus: 'validated',
        createdAt: '2026-04-30T08:35:00Z'
      },
      {
        id: 16,
        filename: 'cleanup-failed.mp4',
        mediaType: 'video',
        anonymizationStatus: 'validated',
        annotationStatus: 'validated',
        createdAt: '2026-04-30T08:40:00Z'
      },
      {
        id: 12,
        filename: 'still-processing.mp4',
        mediaType: 'video',
        anonymizationStatus: 'processing_anonymization',
        annotationStatus: 'not_started',
        createdAt: '2026-04-30T08:45:00Z'
      }
    ]
    anonymizationStore.fetchOverview = vi.fn().mockResolvedValue(undefined)

    vi.mocked(axiosInstance.get).mockImplementation(async (url: string) => {
      if (url === 'media/videos/labels/list/') {
        return { data: [] } as any
      }
      if (url === 'media/videos/prediction-models/list/') {
        return {
          data: {
            models: [
              {
                id: 7,
                name: 'segmentation-meta',
                version: '3',
                modelName: 'segmentation-model',
                aiModelId: 5,
                labelsetName: 'colon-labels',
                labelsetVersion: 1,
                labelsetId: 9,
                weightsAvailable: true,
                isActive: true
              }
            ],
            defaultHuggingfaceModelId: 'wg-lux/custom-segmentation',
            defaultModelName: 'segmentation-model',
            defaultLabelsetName: 'colon-labels',
            huggingfaceModels: []
          }
        } as any
      }
      if (url === 'settings/application/dropdowns/ai_datasets/') {
        return {
          data: [
            {
              id: 300,
              value: 'segment-study',
              label: 'segment-study',
              datasetType: 'video',
              aiModelType: 'video_segment_classification',
              isActive: true,
              nameCount: 1
            }
          ]
        } as any
      }
      if (url === 'media/videos/') {
        return {
          data: mediaVideosFactory()
        } as any
      }
      if (url.includes('/sensitive-metadata/')) {
        return { data: { patient_dob: null, patient_gender_name: null } } as any
      }
      if (url.includes('/examinations/')) {
        return { data: [] } as any
      }
      if (url.includes('/details/')) {
        return { data: { duration: 90 } } as any
      }
      if (url.includes('/metadata/')) {
        return { data: { duration: 90, fps: 25, frameCount: 2250 } } as any
      }
      if (url.includes('/fps/')) {
        return { data: { fps: 25 } } as any
      }
      const segmentMatch = url.match(/media\/videos\/(\d+)\/segments\//)
      if (segmentMatch) {
        return {
          data: [
            {
              id: Number(segmentMatch[1]) * 100,
              videoId: Number(segmentMatch[1]),
              labelName: 'outside',
              startTime: 1,
              endTime: 5,
              startFrameNumber: 25,
              endFrameNumber: 125
            }
          ]
        } as any
      }
      return { data: {} } as any
    })
  })

  it('shows explicit readiness text and enlarged status-bar classes in the video dropdown', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await openVideoDropdown(wrapper)

    const items = wrapper.findAll('.video-dropdown-item')
    expect(items).toHaveLength(6)
    expect(items[0].classes()).toContain('video-dropdown-item-pending')
    expect(items[1].classes()).toContain('video-dropdown-item-ready')
    expect(items[2].classes()).toContain('video-dropdown-item-validated')
    expect(items[3].classes()).toContain('video-dropdown-item-cleanup')
    expect(items[4].classes()).toContain('video-dropdown-item-pending')
    expect(items[5].classes()).toContain('video-dropdown-item-unusable')
    expect(items[0].text()).toContain('Zurück zu Schritt 1 - Anonymisierung validieren')
    expect(items[1].text()).toContain('Video startklar für Befundung!')
    expect(items[2].text()).toContain('Video bereits validiert')
    expect(items[2].text()).toContain('Vorannotation von: oidc:reviewer-previous')
    expect(items[3].text()).toContain('Segmentvalidierung läuft')
    expect(items[4].text()).toContain('Segmentvalidierung prüfen')
    expect(items[5].text()).toContain('Noch nicht nutzbar: Anonymisierung läuft')
    expect(wrapper.find('.video-dropdown-status-badge i').exists()).toBe(false)

    const filterButtons = wrapper.findAll('.video-dropdown-filter-button')
    expect(filterButtons.map((button) => button.text())).toEqual([
      'Alle (6)',
      'Nutzbar (5)',
      'Anonymisierung prüfen (1)',
      'Bereit (1)',
      'Validierung läuft (1)',
      'Validierung prüfen (1)',
      'Segmentvalidiert (1)',
      'Nicht nutzbar (1)'
    ])
    expect(filterButtons[0].classes()).toContain('active')

    expectVisibleVideos(wrapper, [
      'needs-validation.mp4',
      'ready-for-reporting.mp4',
      'already-segment-validated.mp4',
      'cleanup-running.mp4',
      'cleanup-failed.mp4',
      'still-processing.mp4'
    ])
    expectDropdownItemState(
      wrapper,
      'needs-validation.mp4',
      'video-dropdown-item-pending',
      'badge-pending',
      'Zurück zu Schritt 1 - Anonymisierung validieren'
    )
    expectDropdownItemState(
      wrapper,
      'ready-for-reporting.mp4',
      'video-dropdown-item-ready',
      'badge-ready',
      'Video startklar für Befundung!'
    )
    expectDropdownItemState(
      wrapper,
      'already-segment-validated.mp4',
      'video-dropdown-item-validated',
      'badge-validated',
      'Video bereits validiert'
    )
    expectDropdownItemState(
      wrapper,
      'cleanup-running.mp4',
      'video-dropdown-item-cleanup',
      'badge-cleanup',
      'Segmentvalidierung läuft'
    )
    expectDropdownItemState(
      wrapper,
      'cleanup-failed.mp4',
      'video-dropdown-item-pending',
      'badge-pending',
      'Segmentvalidierung prüfen'
    )
    expectDropdownItemState(
      wrapper,
      'still-processing.mp4',
      'video-dropdown-item-unusable',
      'badge-unusable',
      'Noch nicht nutzbar: Anonymisierung läuft'
    )

    await chooseDropdownFilter(wrapper, 'Nutzbar')
    expectVisibleVideos(wrapper, [
      'needs-validation.mp4',
      'ready-for-reporting.mp4',
      'already-segment-validated.mp4',
      'cleanup-running.mp4',
      'cleanup-failed.mp4'
    ])
    expect(wrapper.text()).not.toContain('still-processing.mp4')
    expectDropdownItemState(
      wrapper,
      'needs-validation.mp4',
      'video-dropdown-item-pending',
      'badge-pending',
      'Zurück zu Schritt 1 - Anonymisierung validieren'
    )
    expectDropdownItemState(
      wrapper,
      'ready-for-reporting.mp4',
      'video-dropdown-item-ready',
      'badge-ready',
      'Video startklar für Befundung!'
    )
    expectDropdownItemState(
      wrapper,
      'already-segment-validated.mp4',
      'video-dropdown-item-validated',
      'badge-validated',
      'Video bereits validiert'
    )
    expectDropdownItemState(
      wrapper,
      'cleanup-running.mp4',
      'video-dropdown-item-cleanup',
      'badge-cleanup',
      'Segmentvalidierung läuft'
    )
    expectDropdownItemState(
      wrapper,
      'cleanup-failed.mp4',
      'video-dropdown-item-pending',
      'badge-pending',
      'Segmentvalidierung prüfen'
    )

    await chooseDropdownFilter(wrapper, 'Anonymisierung prüfen')
    expectVisibleVideos(wrapper, ['needs-validation.mp4'])
    expectDropdownItemState(
      wrapper,
      'needs-validation.mp4',
      'video-dropdown-item-pending',
      'badge-pending',
      'Zurück zu Schritt 1 - Anonymisierung validieren'
    )

    await chooseDropdownFilter(wrapper, 'Bereit')
    expectVisibleVideos(wrapper, ['ready-for-reporting.mp4'])
    expectDropdownItemState(
      wrapper,
      'ready-for-reporting.mp4',
      'video-dropdown-item-ready',
      'badge-ready',
      'Video startklar für Befundung!'
    )

    await chooseDropdownFilter(wrapper, 'Validierung läuft')
    expectVisibleVideos(wrapper, ['cleanup-running.mp4'])
    expectDropdownItemState(
      wrapper,
      'cleanup-running.mp4',
      'video-dropdown-item-cleanup',
      'badge-cleanup',
      'Segmentvalidierung läuft'
    )

    await chooseDropdownFilter(wrapper, 'Validierung prüfen')
    expectVisibleVideos(wrapper, ['cleanup-failed.mp4'])
    expectDropdownItemState(
      wrapper,
      'cleanup-failed.mp4',
      'video-dropdown-item-pending',
      'badge-pending',
      'Segmentvalidierung prüfen'
    )

    await chooseDropdownFilter(wrapper, 'Segmentvalidiert')
    expectVisibleVideos(wrapper, ['already-segment-validated.mp4'])
    expectDropdownItemState(
      wrapper,
      'already-segment-validated.mp4',
      'video-dropdown-item-validated',
      'badge-validated',
      'Video bereits validiert'
    )
    expect(getDropdownItems(wrapper)[0].classes()).not.toContain('video-dropdown-item-ready')

    await chooseDropdownFilter(wrapper, 'Nicht nutzbar')
    expectVisibleVideos(wrapper, ['still-processing.mp4'])

    const filteredItems = wrapper.findAll('.video-dropdown-item')
    expect(filteredItems).toHaveLength(1)
    expect(filteredItems[0].text()).toContain('still-processing.mp4')

    await filteredItems[0].trigger('click')
    await flushPromises()

    expect((wrapper.vm as any).selectedVideoId).toBe(12)
    expect(wrapper.text()).toContain('Dieses Video ist noch nicht für die Segmentansicht nutzbar')
    expect(wrapper.text()).not.toContain('Video löschen?')
  })

  it('keeps processed videos pending anonymization validation viewable but not mutable', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await selectVideoFromDropdown(wrapper, 'needs-validation.mp4')

    expect((wrapper.vm as any).selectedVideoId).toBe(6)
    const player = wrapper.find('[data-cy="video-player"]')
    expect(player.exists()).toBe(true)
    expect(player.attributes('crossorigin')).toBe('use-credentials')
    expect(wrapper.text()).not.toContain('Video löschen?')
    expect(wrapper.text()).not.toContain('Alle Segmente validieren')

    const saveButton = findButtonByText(wrapper, 'Segmentänderungen speichern')
    const rerunButton = findButtonByText(wrapper, 'KI neu berechnen')
    expect(saveButton?.attributes('disabled')).toBeDefined()
    expect(rerunButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-cy="label-select"]').attributes('disabled')).toBeDefined()
  })

  it('keeps cleanup-running segment validation non-final and non-mutable', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await selectVideoFromDropdown(wrapper, 'cleanup-running.mp4')

    expect((wrapper.vm as any).selectedVideoId).toBe(14)
    expect(wrapper.text()).toContain('Außerhalb-Frames werden geschwärzt')
    expect(wrapper.find('[data-test="segment-cleanup-processing"]').exists()).toBe(true)
    expect(findButtonByText(wrapper, 'Alle Segmente validieren')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Video bereits validiert')
    expect(
      findButtonByText(wrapper, 'Segmentänderungen speichern')?.attributes('disabled')
    ).toBeDefined()
    expect(findButtonByText(wrapper, 'KI neu berechnen')?.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-cy="label-select"]').attributes('disabled')).toBeDefined()
  })

  it('polls queued manual outside blackening and surfaces async failure details', async () => {
    let mediaVideoRequests = 0
    mediaVideosFactory = () => {
      mediaVideoRequests += 1
      const videos = baseMediaVideos()
      if (mediaVideoRequests <= 1) return videos
      return videos.map((video) =>
        video.id === 8
          ? {
              ...video,
              segmentAnnotationStatus: 'cleanup_failed',
              postValidationRebuild: {
                status: 'failed',
                details: 'async frame failure'
              }
            }
          : video
      )
    }
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(axiosInstance.post).mockResolvedValueOnce({
      data: {
        status: 'queued',
        outside_segment_count: 1,
        post_processing_job: {
          status: 'queued'
        }
      }
    } as any)

    const wrapper = mountComponent()
    await flushPromises()
    await selectVideoFromDropdown(wrapper, 'ready-for-reporting.mp4')

    const button = wrapper.find('[data-test="blacken-outside-segments-button"]')
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(axiosInstance.post).toHaveBeenCalledWith('media/videos/8/segments/blacken-outside/', {
      onlyValidated: false
    })
    expect(wrapper.text()).toContain('Segmentvalidierung fehlgeschlagen: async frame failure')
  })

  it('keeps segment-validated videos read-only until the same-user edit override is active', async () => {
    const readOnlyWrapper = mountComponent()
    await flushPromises()

    await selectVideoFromDropdown(readOnlyWrapper, 'already-segment-validated.mp4')

    expect(readOnlyWrapper.text()).toContain('Video bereits validiert')
    expect(findButtonByText(readOnlyWrapper, 'Segmente bearbeiten')).toBeTruthy()
    expect(
      findButtonByText(readOnlyWrapper, 'Segmentänderungen speichern')?.attributes('disabled')
    ).toBeDefined()
    expect(
      findButtonByText(readOnlyWrapper, 'KI neu berechnen')?.attributes('disabled')
    ).toBeDefined()

    routerMocks.query = { editSegments: '1' }
    const overrideWrapper = mountComponent()
    await flushPromises()

    await selectVideoFromDropdown(overrideWrapper, 'already-segment-validated.mp4')

    expect(overrideWrapper.text()).toContain('Segmentbearbeitung aktiv')
    expect(
      findButtonByText(overrideWrapper, 'Segmentänderungen speichern')?.attributes('disabled')
    ).toBeUndefined()
    expect(
      findButtonByText(overrideWrapper, 'KI neu berechnen')?.attributes('disabled')
    ).toBeUndefined()
  })

  it('allows another annotator override to edit and validate a segment-validated video', async () => {
    localStorage.setItem(
      `lxAnnotate.annotationPrincipalOverride.v1:${encodeURIComponent('oidc:kc-user-7')}:${encodeURIComponent('video:10')}`,
      'oidc:reviewer-new'
    )
    const wrapper = mountComponent()
    await flushPromises()

    await selectVideoFromDropdown(wrapper, 'already-segment-validated.mp4')

    expect(wrapper.text()).toContain('Aktiver Annotator: oidc:reviewer-new (Override)')
    expect(
      findButtonByText(wrapper, 'Segmentänderungen speichern')?.attributes('disabled')
    ).toBeUndefined()
    expect(
      findButtonByText(wrapper, 'Annotation validieren')?.attributes('disabled')
    ).toBeUndefined()
  })
})
