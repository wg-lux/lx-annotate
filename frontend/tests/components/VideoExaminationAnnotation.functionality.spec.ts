import { flushPromises, mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  videoStore: undefined as any,
  anonymizationStore: undefined as any,
  mediaStore: undefined as any,
  toastStore: undefined as any,
  route: { query: { video: null as string | null } },
  router: {
    replace: vi.fn(),
    push: vi.fn()
  },
  axiosGet: vi.fn(),
  axiosPost: vi.fn()
}))

vi.mock('@/components/VideoExamination/Timeline.vue', () => ({
  default: {
    name: 'Timeline',
    props: [
      'video',
      'segments',
      'labels',
      'currentTime',
      'isPlaying',
      'activeSegmentId',
      'showWaveform',
      'selectionMode',
      'fps'
    ],
    emits: [
      'seek',
      'play-pause',
      'segment-select',
      'segment-resize',
      'segment-move',
      'segment-create',
      'segment-delete',
      'time-selection'
    ],
    template: '<div data-testid="timeline" />'
  }
}))

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()
  const { computed } = await import('vue')

  return {
    ...actual,
    storeToRefs: (store: Record<string, unknown>) =>
      Object.fromEntries(
        Object.keys(store)
          .filter((key) => typeof store[key] !== 'function')
          .map((key) => [
            key,
            computed({
              get: () => store[key],
              set: (value) => {
                store[key] = value
              }
            })
          ])
      )
  }
})

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: (...args: unknown[]) => testState.axiosGet(...args),
    post: (...args: unknown[]) => testState.axiosPost(...args),
    delete: vi.fn()
  },
  r: (path: string) => `/api/${path}`
}))

vi.mock('@/utils/mediaUrls', () => ({
  buildVideoStreamUrl: (id: number) => `/api/media/videos/${id}/stream/processed/`
}))

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => testState.router,
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a><slot /></a>'
  }
}))

vi.mock('@/stores/videoStore', () => ({
  useVideoStore: () => testState.videoStore
}))

vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => testState.anonymizationStore
}))

vi.mock('@/stores/mediaTypeStore', () => ({
  useMediaTypeStore: () => testState.mediaStore
}))

vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => testState.toastStore
}))

vi.mock('@/stores/auth_kc', () => ({
  useAuthKcStore: () => ({
    user: {
      sub: 'kc-user-7',
      username: 'annotator'
    }
  })
}))

import VideoExaminationAnnotation from '@/components/VideoExamination/VideoExaminationAnnotation.vue'

const videos = [
  {
    id: 1,
    original_file_name: 'pending-video.mp4',
    centerName: 'Center A',
    segmentAnnotationsValidated: false
  },
  {
    id: 2,
    original_file_name: 'validated-video.mp4',
    centerName: 'Center B',
    segmentAnnotationsValidated: true
  }
]

const segments = [
  {
    id: 11,
    label: 'outside',
    startTime: 4,
    endTime: 12,
    avgConfidence: 0.98,
    videoID: 2,
    labelID: 1,
    segmentOrigin: 'manual'
  }
]

function makeVideoStore() {
  return reactive({
    videoList: { videos, labels: [] },
    allSegments: segments,
    videoStreamUrl: '',
    timelineSegments: [],
    labels: [{ id: 1, name: 'outside', color: '#ff0000' }],
    effectiveFps: 50,
    fetchLabels: vi.fn().mockResolvedValue([]),
    fetchAllVideos: vi.fn().mockResolvedValue({ videos, labels: [] }),
    fetchAllSegments: vi.fn().mockResolvedValue(segments),
    fetchVideoSegments: vi.fn().mockResolvedValue(segments),
    loadVideo: vi.fn().mockResolvedValue(undefined),
    clearVideo: vi.fn(),
    setCurrentVideo: vi.fn(),
    deleteVideo: vi.fn(),
    createSegment: vi.fn(),
    removeSegment: vi.fn(),
    deleteSegment: vi.fn(),
    patchSegmentLocally: vi.fn(),
    patchDraftSegment: vi.fn(),
    commitDraft: vi.fn(),
    persistDirtySegments: vi.fn().mockResolvedValue(undefined)
  })
}

function mountComponent() {
  return mount(VideoExaminationAnnotation, {
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>'
        }
      }
    }
  })
}

async function settle() {
  await flushPromises()
  await nextTick()
}

describe('VideoExaminationAnnotation functionality', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('confirm', vi.fn(() => true))
    testState.route.query.video = null
    testState.router.replace.mockReset()
    testState.router.push.mockReset()
    testState.axiosGet.mockReset()
    testState.axiosPost.mockReset()
    testState.videoStore = makeVideoStore()
    testState.anonymizationStore = reactive({
      overview: videos.map((video) => ({
        id: video.id,
        mediaType: 'video',
        anonymizationStatus: 'done_processing_anonymization',
        annotationStatus: video.segmentAnnotationsValidated ? 'validated' : 'not_started'
      })),
      fetchOverview: vi.fn().mockResolvedValue(undefined)
    })
    testState.mediaStore = {
      rememberType: vi.fn(),
      setCurrentItem: vi.fn()
    }
    testState.toastStore = {
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn()
    }
    testState.axiosGet.mockImplementation((url: string) => {
      if (url.includes('sensitive-metadata')) {
        return Promise.resolve({ data: { patient_dob: null, patient_gender_name: null } })
      }
      if (url.includes('examinations')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: { duration: 120 } })
    })
    testState.axiosPost.mockResolvedValue({ data: {} })
  })

  it('uses the sidebar Nucleo icon package in the visible module UI', async () => {
    const wrapper = mountComponent()
    await settle()

    await wrapper.find('.video-dropdown-trigger').trigger('click')
    await settle()

    expect(wrapper.find('i.ni.ni-button-play').exists()).toBe(true)
    expect(wrapper.find('i.material-icons').exists()).toBe(false)
    expect(wrapper.find('i.fas').exists()).toBe(false)
    expect(wrapper.find('i[class*="fa-"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('keeps validated videos selectable and loads them for viewing', async () => {
    const wrapper = mountComponent()
    await settle()

    await wrapper.find('.video-dropdown-trigger').trigger('click')
    await settle()

    const validatedOption = wrapper
      .findAll('.video-dropdown-item')
      .find((option) => option.text().includes('validated-video.mp4'))

    expect(validatedOption).toBeTruthy()
    expect(validatedOption?.attributes('disabled')).toBeUndefined()

    await validatedOption!.trigger('click')
    await settle()

    expect(testState.router.replace).toHaveBeenCalledWith({ query: { video: 2 } })
    expect(testState.videoStore.loadVideo).toHaveBeenCalledWith(2)
    expect(wrapper.text()).not.toContain('ist bereits vollständig annotiert')

    wrapper.unmount()
  })

  it('shows already validated videos read-only while keeping the timeline viewable', async () => {
    testState.route.query.video = '2'

    const wrapper = mountComponent()
    await settle()

    const timeline = wrapper.findComponent({ name: 'Timeline' })
    expect(timeline.exists()).toBe(true)
    expect(timeline.props('selectionMode')).toBe(false)
    expect(wrapper.text()).toContain('Video bereits validiert')

    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Segmentänderungen speichern'))
    const discardButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Änderungen verwerfen'))

    expect(saveButton?.attributes('disabled')).toBeDefined()
    expect(discardButton?.attributes('disabled')).toBeDefined()

    wrapper.unmount()
  })

  it('lets a different annotator restart a validated video and submit under that scope', async () => {
    testState.route.query.video = '2'
    testState.axiosPost.mockResolvedValue({
      data: {
        updatedCount: 1,
        totalSegments: 1
      }
    })

    const wrapper = mountComponent()
    await settle()

    await wrapper.get('[data-test="video-annotator-override-input"]').setValue('reviewer-two')
    await wrapper.get('[data-test="video-annotator-override-apply"]').trigger('click')
    await settle()

    const timeline = wrapper.findComponent({ name: 'Timeline' })
    expect(timeline.props('selectionMode')).toBe(true)
    expect(wrapper.text()).toContain('Aktiver Annotator: reviewer-two (Override)')

    const validateButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Annotation validieren'))
    expect(validateButton?.attributes('disabled')).toBeUndefined()

    await validateButton!.trigger('click')
    await settle()

    expect(testState.axiosPost).toHaveBeenCalledWith('/api/media/videos/2/segments/validate-bulk/', {
      segmentIds: [11],
      segments: [{ id: 11, start_time: 4, end_time: 12 }],
      isValidated: true,
      notes: expect.stringContaining('Vollständige Video-Review abgeschlossen am'),
      informationSourceName: 'manual_annotation',
      annotator: 'reviewer-two'
    })

    await wrapper.get('[data-test="video-annotator-override-revert"]').trigger('click')
    await settle()

    expect(wrapper.findComponent({ name: 'Timeline' }).props('selectionMode')).toBe(false)
    expect(wrapper.text()).toContain('Aktiver Annotator: oidc:kc-user-7')

    wrapper.unmount()
  })

  it('can request outside-segment blackening without changing validation state', async () => {
    testState.route.query.video = '2'
    testState.axiosPost.mockResolvedValue({
      data: {
        status: 'queued',
        outsideSegmentCount: 1,
        postProcessingJob: { status: 'queued' }
      }
    })

    const wrapper = mountComponent()
    await settle()

    const blackenButton = wrapper.get('[data-test="blacken-outside-segments-button"]')
    expect(blackenButton.attributes('disabled')).toBeUndefined()

    await blackenButton.trigger('click')
    await settle()

    expect(testState.axiosPost).toHaveBeenCalledWith(
      '/api/media/videos/2/segments/blacken-outside/',
      {
        onlyValidated: false
      }
    )
    expect(testState.axiosPost).not.toHaveBeenCalledWith(
      '/api/media/videos/2/segments/validate-bulk/',
      expect.anything()
    )
    expect(wrapper.text()).toContain('Schwärzung der Außerhalb-Segmente gestartet')

    wrapper.unmount()
  })

  it('shows outside-segment blackening no-op without reloading the video', async () => {
    testState.route.query.video = '2'
    const loadSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => undefined)
    testState.axiosPost.mockResolvedValue({
      data: {
        status: 'noop',
        outsideSegmentCount: 0
      }
    })

    const wrapper = mountComponent()
    await settle()

    await wrapper.get('[data-test="blacken-outside-segments-button"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Keine Außerhalb-Segmente gefunden')
    expect(loadSpy).not.toHaveBeenCalled()

    loadSpy.mockRestore()
    wrapper.unmount()
  })

  it('reloads the video only when outside-segment blackening completed', async () => {
    testState.route.query.video = '2'
    const loadSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'load')
      .mockImplementation(() => undefined)
    testState.axiosPost.mockResolvedValue({
      data: {
        status: 'completed',
        outsideSegmentCount: 1,
        postProcessingJob: { status: 'completed' }
      }
    })

    const wrapper = mountComponent()
    await settle()

    await wrapper.get('[data-test="blacken-outside-segments-button"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Außerhalb-Segmente geschwärzt')
    expect(loadSpy).toHaveBeenCalledTimes(1)

    loadSpy.mockRestore()
    wrapper.unmount()
  })

  it('shows already queued outside-segment blackening as non-blocking status', async () => {
    testState.route.query.video = '2'
    testState.axiosPost.mockResolvedValue({
      data: {
        status: 'already_queued',
        outsideSegmentCount: 1,
        postProcessingJob: { status: 'already_queued' }
      }
    })

    const wrapper = mountComponent()
    await settle()

    await wrapper.get('[data-test="blacken-outside-segments-button"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Schwärzung der Außerhalb-Segmente läuft bereits')

    wrapper.unmount()
  })

  it('shows busy outside-segment blackening responses as errors', async () => {
    testState.route.query.video = '2'
    testState.axiosPost.mockRejectedValue({
      response: {
        status: 409,
        data: {
          status: 'busy',
          message: 'Video reprocessing is already running'
        }
      }
    })

    const wrapper = mountComponent()
    await settle()

    await wrapper.get('[data-test="blacken-outside-segments-button"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Ein anderer Verarbeitungsvorgang')
    expect(wrapper.text()).not.toContain('Schwärzung der Außerhalb-Segmente gestartet')

    wrapper.unmount()
  })

  it('shows failed outside-segment blackening responses as errors', async () => {
    testState.route.query.video = '2'
    testState.axiosPost.mockRejectedValue({
      response: {
        status: 500,
        data: {
          status: 'failed',
          error: 'inline rebuild failed'
        }
      }
    })

    const wrapper = mountComponent()
    await settle()

    await wrapper.get('[data-test="blacken-outside-segments-button"]').trigger('click')
    await settle()

    expect(wrapper.text()).toContain('Schwärzung der Außerhalb-Segmente fehlgeschlagen')
    expect(wrapper.text()).toContain('inline rebuild failed')

    wrapper.unmount()
  })
})
