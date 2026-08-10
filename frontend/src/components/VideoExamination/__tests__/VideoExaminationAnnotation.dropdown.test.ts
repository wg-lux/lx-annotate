import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosHeaders, type AxiosResponse } from 'axios'

import VideoExaminationAnnotation from '../VideoExaminationAnnotation.vue'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useVideoStore } from '@/stores/videoStore'

interface MediaVideoFixture {
  id: number
  original_file_name: string
  centerName: string
  segmentAnnotationsValidated: boolean
  status: string
  processorName: string
  validatedAnnotators?: string[]
  segmentAnnotationStatus?: string
  outsideSegmentsRemoved?: boolean
  postValidationRebuild?: {
    status: string
    details: string
  }
}

interface RouterMocks {
  query: Record<string, string>
  replace: ReturnType<typeof vi.fn>
  push: ReturnType<typeof vi.fn>
}

interface ApiMocks {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const apiResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders(),
  config: {
    headers: new AxiosHeaders()
  }
})

const resolvedApiResponse = <T>(data: T): Promise<AxiosResponse<T>> =>
  Promise.resolve(apiResponse(data))

const routerMocks = vi.hoisted(
  (): RouterMocks => ({
    query: {},
    replace: vi.fn(),
    push: vi.fn()
  })
)

const apiMocks = vi.hoisted(
  (): ApiMocks => ({
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  })
)

vi.mock('@/api/axiosInstance', () => ({
  default: apiMocks,
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
    `${String(Math.floor(seconds / 60))}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`,
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
  let mediaVideosFactory: () => MediaVideoFixture[]
  let fpsNormalizationStateFactory: (videoId: number) => Record<string, unknown>
  let videoLabelsFactory: () => Array<{ id: number; name: string; color: string }>

  const baseMediaVideos = () => [
    {
      id: 6,
      original_file_name: 'needs-validation.mp4',
      centerName: 'Center A',
      status: 'available',
      processorName: 'processor-a',
      segmentAnnotationsValidated: false
    },
    {
      id: 8,
      original_file_name: 'ready-for-reporting.mp4',
      centerName: 'Center B',
      status: 'available',
      processorName: 'processor-b',
      segmentAnnotationsValidated: false
    },
    {
      id: 10,
      original_file_name: 'already-segment-validated.mp4',
      centerName: 'Center C',
      status: 'available',
      processorName: 'processor-b',
      segmentAnnotationsValidated: true,
      validatedAnnotators: ['oidc:reviewer-previous']
    },
    {
      id: 14,
      original_file_name: 'cleanup-running.mp4',
      centerName: 'Center E',
      status: 'available',
      processorName: 'processor-c',
      segmentAnnotationsValidated: false,
      segmentAnnotationStatus: 'cleanup_running'
    },
    {
      id: 16,
      original_file_name: 'cleanup-failed.mp4',
      centerName: 'Center F',
      status: 'available',
      processorName: 'processor-c',
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
      status: 'in_progress',
      processorName: 'processor-d',
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

  const requireDefined = <Value>(value: Value | undefined, context: string): Value => {
    if (value === undefined) {
      throw new Error(`${context} was not rendered.`)
    }
    return value
  }

  const chooseDropdownFilter = async (wrapper: ReturnType<typeof mount>, labelPrefix: string) => {
    const button = findDropdownFilterButton(wrapper, labelPrefix)
    expect(button).toBeTruthy()
    await requireDefined(button, `Dropdown filter "${labelPrefix}"`).trigger('click')
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
    const renderedItem = requireDefined(item, `Dropdown item "${videoText}"`)
    expect(renderedItem.classes()).toContain(itemClass)
    expect(renderedItem.find('.video-dropdown-status-badge').classes()).toContain(badgeClass)
    expect(renderedItem.text()).toContain(statusText)
  }

  const selectVideoFromDropdown = async (wrapper: ReturnType<typeof mount>, videoText: string) => {
    await openVideoDropdown(wrapper)
    const item = wrapper
      .findAll('.video-dropdown-item')
      .find((entry) => entry.text().includes(videoText))
    expect(item).toBeTruthy()
    await requireDefined(item, `Dropdown item "${videoText}"`).trigger('click')
    await flushPromises()
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    routerMocks.query = {}
    setActivePinia(createPinia())
    mediaVideosFactory = baseMediaVideos
    fpsNormalizationStateFactory = () => ({ status: 'ready', fps: 25, maxFps: 50 })
    videoLabelsFactory = () => []

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

    apiMocks.get.mockImplementation((url: string) => {
      if (url === 'media/videos/labels/list/') {
        return resolvedApiResponse(videoLabelsFactory())
      }
      if (url === 'media/videos/prediction-models/list/') {
        return resolvedApiResponse({
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
        })
      }
      if (url === 'settings/application/dropdowns/ai_datasets/') {
        return resolvedApiResponse([
          {
            id: 300,
            value: 'segment-study',
            label: 'segment-study',
            datasetType: 'video',
            aiModelType: 'video_segment_classification',
            isActive: true,
            nameCount: 1
          }
        ])
      }
      if (url === 'media/videos/') {
        return resolvedApiResponse(mediaVideosFactory())
      }
      if (url.includes('/sensitive-metadata/')) {
        return resolvedApiResponse({ patient_dob: null, patient_gender_name: null })
      }
      if (url.includes('/examinations/')) {
        return resolvedApiResponse([])
      }
      if (url.includes('/details/')) {
        return resolvedApiResponse({ duration: 90 })
      }
      if (url.includes('/metadata/')) {
        return resolvedApiResponse({ duration: 90, fps: 25, frameCount: 2250 })
      }
      const normalizationMatch = url.match(/media\/videos\/(\d+)\/segments\/normalize-fps\//)
      if (normalizationMatch) {
        return resolvedApiResponse(fpsNormalizationStateFactory(Number(normalizationMatch[1])))
      }
      if (url.includes('/fps/')) {
        return resolvedApiResponse({ fps: 25 })
      }
      if (url.includes('/segments/validation-status/')) {
        return resolvedApiResponse({
          validationComplete: true,
          byLabel: { outside: { total: 1, validated: 1 } }
        })
      }
      const segmentMatch = url.match(/media\/videos\/(\d+)\/segments\//)
      if (segmentMatch) {
        return resolvedApiResponse([
          {
            id: Number(segmentMatch[1]) * 100,
            videoId: Number(segmentMatch[1]),
            labelName: 'outside',
            startTime: 1,
            endTime: 5,
            startFrameNumber: 25,
            endFrameNumber: 125
          }
        ])
      }
      return resolvedApiResponse({})
    })
  })

  it('starts FPS normalization automatically before loading segments', async () => {
    fpsNormalizationStateFactory = () => ({ status: 'required', fps: 60, maxFps: 50 })
    apiMocks.post.mockResolvedValueOnce(
      apiResponse({ status: 'queued', fps: 60, max_fps: 50 })
    )

    const wrapper = mountComponent()
    await flushPromises()
    await selectVideoFromDropdown(wrapper, 'ready-for-reporting.mp4')

    expect(apiMocks.post).toHaveBeenCalledWith('media/videos/8/segments/normalize-fps/', {})
    expect(wrapper.text()).toContain('wird automatisch auf maximal 50 fps normalisiert')
    expect(wrapper.find('[data-cy="label-select"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('reuses normalization FPS while loading metadata and segments once', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    apiMocks.get.mockClear()

    await selectVideoFromDropdown(wrapper, 'ready-for-reporting.mp4')

    const urls = apiMocks.get.mock.calls.map(([url]) => String(url))
    expect(urls.filter((url) => url === 'media/videos/8/metadata/')).toHaveLength(1)
    expect(urls.filter((url) => url === 'media/videos/8/fps/')).toHaveLength(0)
    expect(urls.filter((url) => url === 'media/videos/8/segments/')).toHaveLength(1)
    expect(urls.filter((url) => url === 'media/videos/8/segments/validation-status/')).toHaveLength(
      1
    )
    expect(urls.filter((url) => url.includes('/details/'))).toHaveLength(0)
    wrapper.unmount()
  })

  it('shares one cancellable cleanup poll across pending videos', async () => {
    vi.useFakeTimers()
    try {
      mediaVideosFactory = () =>
        baseMediaVideos().map((video) =>
          video.id === 16
            ? {
                ...video,
                segmentAnnotationStatus: 'cleanup_running'
              }
            : video
        )

      const wrapper = mountComponent()
      await flushPromises()
      const mediaListCalls = () =>
        apiMocks.get.mock.calls.filter(([url]) => url === 'media/videos/').length
      const labelCalls = () =>
        apiMocks.get.mock.calls.filter(([url]) => url === 'media/videos/labels/list/').length

      expect(mediaListCalls()).toBe(1)
      expect(labelCalls()).toBe(1)

      await vi.advanceTimersByTimeAsync(5000)
      await flushPromises()
      expect(mediaListCalls()).toBe(2)
      expect(labelCalls()).toBe(1)

      wrapper.unmount()
      await vi.advanceTimersByTimeAsync(5000)
      await flushPromises()
      expect(mediaListCalls()).toBe(2)
    } finally {
      vi.useRealTimers()
    }
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
    const itemTexts = getDropdownItems(wrapper).map((item) => item.text())
    expect(itemTexts.some((text) => text.includes('Center A'))).toBe(true)
    expect(itemTexts.some((text) => text.includes('Center B'))).toBe(true)
    expect(itemTexts.some((text) => text.includes('Center C'))).toBe(true)
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

    expect(routerMocks.replace).toHaveBeenLastCalledWith({ query: { video: 12 } })
    expect(wrapper.text()).toContain('Dieses Video ist noch nicht für die Segmentansicht nutzbar')
    expect(wrapper.text()).not.toContain('Video löschen?')
  })

  it('keeps processed videos pending anonymization validation viewable but not mutable', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    await selectVideoFromDropdown(wrapper, 'needs-validation.mp4')

    expect(routerMocks.replace).toHaveBeenLastCalledWith({ query: { video: 6 } })
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

    expect(routerMocks.replace).toHaveBeenLastCalledWith({ query: { video: 14 } })
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
    vi.useFakeTimers()
    let mediaVideoRequests = 0
    mediaVideosFactory = () => {
      mediaVideoRequests += 1
      const videos = baseMediaVideos()
      if (mediaVideoRequests <= 1) return videos
      return videos.map((video) =>
        video.id === 16
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
    apiMocks.post.mockResolvedValueOnce(
      apiResponse({
        status: 'queued',
        outside_segment_count: 1,
        post_processing_job: {
          status: 'queued'
        }
      })
    )

    const wrapper = mountComponent()
    try {
      await flushPromises()
      await selectVideoFromDropdown(wrapper, 'cleanup-failed.mp4')

      const button = wrapper.find('[data-test="blacken-outside-segments-button"]')
      expect(button.attributes('disabled')).toBeUndefined()
      await button.trigger('click')
      await flushPromises()
      await vi.advanceTimersByTimeAsync(5000)
      await flushPromises()

      expect(apiMocks.post).toHaveBeenCalledWith('media/videos/16/segments/blacken-outside/', {
        onlyValidated: true
      })
      expect(wrapper.text()).toContain('Segmentvalidierung fehlgeschlagen: async frame failure')
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
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
    localStorage.setItem(
      `lxAnnotate.annotationPrincipalOverride.v1:${encodeURIComponent('annotator')}:${encodeURIComponent('video:10')}`,
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

  it('opens and navigates the label overlay with keyboard shortcuts', async () => {
    videoLabelsFactory = () => [
      { id: 1, name: 'outside', color: '#111111' },
      { id: 2, name: 'polyp', color: '#222222' }
    ]
    const wrapper = mountComponent()
    await flushPromises()
    await selectVideoFromDropdown(wrapper, 'ready-for-reporting.mp4')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', cancelable: true }))
    await flushPromises()

    expect(wrapper.find('.label-overlay').exists()).toBe(true)
    expect(wrapper.findAll('.label-overlay-item')).toHaveLength(2)
    expect(
      wrapper.findAll('.label-overlay-item').every((item) => !item.classes().includes('active'))
    ).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    await flushPromises()
    expect(wrapper.findAll('.label-overlay-item')[0].classes()).toContain('active')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }))
    await flushPromises()
    expect(wrapper.findAll('.label-overlay-item')[1].classes()).toContain('active')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }))
    await flushPromises()
    expect(wrapper.find('.label-overlay').exists()).toBe(false)

    wrapper.unmount()
  })

  it('does not trigger global label shortcuts while typing in the video search', async () => {
    videoLabelsFactory = () => [{ id: 1, name: 'outside', color: '#111111' }]
    const wrapper = mountComponent()
    await flushPromises()
    await selectVideoFromDropdown(wrapper, 'ready-for-reporting.mp4')
    await openVideoDropdown(wrapper)

    const searchInput = wrapper.find<HTMLInputElement>('.video-dropdown-search-input')
    await searchInput.trigger('keydown', { key: 'o' })
    await flushPromises()

    expect(wrapper.find('.label-overlay').exists()).toBe(false)
    expect(wrapper.find('.video-dropdown-menu').exists()).toBe(true)

    wrapper.unmount()
  })

  it('starts and cancels a segment draft through the documented keyboard workflow', async () => {
    videoLabelsFactory = () => [{ id: 1, name: 'outside', color: '#111111' }]
    const wrapper = mountComponent()
    await flushPromises()
    await selectVideoFromDropdown(wrapper, 'ready-for-reporting.mp4')

    const videoStore = useVideoStore()
    const startDraft = vi.spyOn(videoStore, 'startDraft')
    const cancelDraft = vi.spyOn(videoStore, 'cancelDraft')
    await wrapper.find<HTMLSelectElement>('[data-cy="label-select"]').setValue('outside')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '+', cancelable: true }))
    await flushPromises()

    expect(startDraft).toHaveBeenCalledOnce()
    expect(startDraft).toHaveBeenCalledWith('outside', 0)
    expect(videoStore.draftSegment).toMatchObject({
      label: 'outside',
      startTime: 0,
      endTime: null
    })
    expect(wrapper.find('[data-cy="finish-label-button"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
    await flushPromises()

    expect(cancelDraft).toHaveBeenCalledOnce()
    expect(videoStore.draftSegment).toBeNull()
    expect(wrapper.find('[data-cy="start-label-button"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
