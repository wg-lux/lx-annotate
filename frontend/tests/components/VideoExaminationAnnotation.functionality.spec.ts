import { flushPromises, mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type VideoStoreFixture = ReturnType<typeof makeVideoStore>
type AnonymizationStoreFixture = {
  overview: Array<{
    id: number
    mediaType: string
    anonymizationStatus: string
    annotationStatus: string
  }>
  fetchOverview: ReturnType<typeof vi.fn>
}
type MediaStoreFixture = {
  rememberType: ReturnType<typeof vi.fn>
  setCurrentItem: ReturnType<typeof vi.fn>
}
type ToastStoreFixture = {
  success: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
  warning: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}
type FixtureRef<T> = {
  current: T
}

const testState = vi.hoisted(() => {
  const createFixtureRef = <T>(name: string, initialValue: T | undefined): FixtureRef<T> => {
    let fixture = initialValue
    return {
      get current(): T {
        if (fixture === undefined) throw new Error(`${name} fixture was not initialized.`)
        return fixture
      },
      set current(value: T) {
        fixture = value
      }
    }
  }
  const route: { query: { video: string | null } } = { query: { video: null } }

  return {
    videoStoreRef: createFixtureRef<VideoStoreFixture>('video store', undefined),
    anonymizationStoreRef: createFixtureRef<AnonymizationStoreFixture>(
      'anonymization store',
      undefined
    ),
    mediaStoreRef: createFixtureRef<MediaStoreFixture>('media store', undefined),
    toastStoreRef: createFixtureRef<ToastStoreFixture>('toast store', undefined),
    route,
    router: {
      replace: vi.fn(),
      push: vi.fn()
    },
    axiosGet: vi.fn<(...args: unknown[]) => unknown>(),
    axiosPost: vi.fn<(...args: unknown[]) => unknown>(),
    outsideValidatedCount: 1
  }
})

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
    get: (...args: unknown[]): unknown => testState.axiosGet(...args),
    post: (...args: unknown[]): unknown => testState.axiosPost(...args),
    delete: vi.fn()
  },
  r: (path: string) => `/api/${path}`
}))

vi.mock('@/utils/mediaUrls', () => ({
  buildVideoStreamUrl: (id: number) => `/api/media/videos/${String(id)}/stream/processed/`,
  buildVideoPlaybackUrls: (id: number) => ({
    hlsPlaylistUrl: `/api/media/videos/${String(id)}/hls/playlist/?type=processed`,
    fallbackStreamUrl: `/api/media/videos/${String(id)}/stream/processed/`
  })
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
  useVideoStore: () => requireVideoStore()
}))

vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => requireAnonymizationStore()
}))

vi.mock('@/stores/mediaTypeStore', () => ({
  useMediaTypeStore: () => testState.mediaStoreRef.current
}))

vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => testState.toastStoreRef.current
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
    status: 'available',
    processorName: 'processor-x',
    segmentAnnotationsValidated: false
  },
  {
    id: 2,
    original_file_name: 'validated-video.mp4',
    centerName: 'Center B',
    status: 'available',
    processorName: 'processor-y',
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

interface CurrentVideoFixture {
  id: number
  duration: number
}

function noCurrentVideo(): CurrentVideoFixture | null {
  return null
}

function makeVideoStore() {
  const store = reactive({
    videoList: { videos, labels: [] },
    currentVideo: noCurrentVideo(),
    allSegments: segments,
    videoStreamUrl: '',
    timelineSegments: [],
    labels: [{ id: 1, name: 'outside', color: '#ff0000' }],
    effectiveFps: 50,
    fetchLabels: vi.fn().mockResolvedValue([]),
    fetchAllVideos: vi.fn().mockResolvedValue({ videos, labels: [] }),
    fetchAllSegments: vi.fn().mockResolvedValue(segments),
    fetchVideoSegments: vi.fn().mockResolvedValue(segments),
    loadVideo: vi.fn(),
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
  store.loadVideo.mockImplementation((videoId: number) => {
    store.currentVideo = { id: videoId, duration: 120 }
    return Promise.resolve()
  })
  return store
}

function requireVideoStore(): VideoStoreFixture {
  return testState.videoStoreRef.current
}

function requireAnonymizationStore(): AnonymizationStoreFixture {
  return testState.anonymizationStoreRef.current
}

function requireDefined<Value>(value: Value | undefined, context: string): Value {
  if (value === undefined) {
    throw new Error(`${context} was not rendered.`)
  }
  return value
}

function isEventEmitter(value: unknown): value is (event: string, ...args: unknown[]) => void {
  return typeof value === 'function'
}

function emitComponentEvent(wrapper: { vm: unknown }, event: string, ...args: unknown[]): void {
  const vm = wrapper.vm
  if (typeof vm !== 'object' || vm === null || !('$emit' in vm)) {
    throw new Error(`Component cannot emit ${event}.`)
  }
  const emit = vm.$emit
  if (!isEventEmitter(emit)) throw new Error(`Component cannot emit ${event}.`)
  emit(event, ...args)
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('VideoExaminationAnnotation functionality', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    testState.route.query.video = null
    testState.router.replace.mockReset()
    testState.router.push.mockReset()
    testState.axiosGet.mockReset()
    testState.axiosPost.mockReset()
    testState.outsideValidatedCount = 1
    testState.videoStoreRef.current = makeVideoStore()
    testState.anonymizationStoreRef.current = reactive({
      overview: videos.map((video) => ({
        id: video.id,
        mediaType: 'video',
        anonymizationStatus: 'done_processing_anonymization',
        annotationStatus: video.segmentAnnotationsValidated ? 'validated' : 'not_started'
      })),
      fetchOverview: vi.fn().mockResolvedValue(undefined)
    })
    testState.mediaStoreRef.current = {
      rememberType: vi.fn(),
      setCurrentItem: vi.fn()
    }
    testState.toastStoreRef.current = {
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      error: vi.fn()
    }
    testState.axiosGet.mockImplementation((url: string) => {
      if (url.includes('segments/validation-status')) {
        return Promise.resolve({
          data: {
            validationComplete: testState.outsideValidatedCount > 0,
            byLabel: {
              outside: {
                total: testState.outsideValidatedCount,
                validated: testState.outsideValidatedCount
              }
            }
          }
        })
      }
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

  it('communicates each dropdown loading stage without showing a false empty state', async () => {
    const overviewRequest = deferred<undefined>()
    const videoListRequest = deferred<{ videos: typeof videos; labels: never[] }>()
    const videoStore = requireVideoStore()
    const anonymizationStore = requireAnonymizationStore()
    videoStore.videoList = { videos: [], labels: [] }
    anonymizationStore.fetchOverview.mockReturnValueOnce(overviewRequest.promise)
    videoStore.fetchAllVideos.mockReturnValueOnce(videoListRequest.promise)

    const wrapper = mountComponent()
    await nextTick()

    const trigger = wrapper.find('.video-dropdown-trigger')
    expect(trigger.attributes('disabled')).toBeDefined()
    expect(trigger.attributes('aria-busy')).toBe('true')
    expect(wrapper.get('[data-test="video-dropdown-loading"]').text()).toContain(
      'Videoliste und Freigabestatus werden geladen'
    )
    expect(wrapper.text()).not.toContain(
      'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.'
    )

    overviewRequest.resolve(undefined)
    await settle()

    expect(wrapper.get('[data-test="video-dropdown-loading"]').text()).toContain(
      'Videos und Labels werden geladen'
    )

    videoStore.videoList = { videos, labels: [] }
    videoListRequest.resolve({ videos, labels: [] })
    await settle()

    expect(wrapper.find('[data-test="video-dropdown-loading"]').exists()).toBe(false)
    expect(trigger.attributes('disabled')).toBeUndefined()
    expect(trigger.attributes('aria-busy')).toBe('false')
    wrapper.unmount()
  })

  it('shows a focused dropdown error and recovers through its retry action', async () => {
    const videoStore = requireVideoStore()
    videoStore.videoList = { videos: [], labels: [] }
    videoStore.fetchAllVideos
      .mockRejectedValueOnce(new Error('video list unavailable'))
      .mockImplementationOnce(() => {
        videoStore.videoList = { videos, labels: [] }
        return Promise.resolve(videoStore.videoList)
      })

    const wrapper = mountComponent()
    await settle()

    expect(wrapper.get('[data-test="video-dropdown-load-error"]').text()).toContain(
      'Die Videoliste konnte nicht geladen werden'
    )
    expect(wrapper.find('.video-dropdown-trigger').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-test="video-dropdown-load-error"] button').trigger('click')
    await settle()

    expect(wrapper.find('[data-test="video-dropdown-load-error"]').exists()).toBe(false)
    expect(wrapper.find('.video-dropdown-trigger').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
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

    await requireDefined(validatedOption, 'Validated video option').trigger('click')
    await settle()

    expect(testState.router.replace).toHaveBeenCalledWith({ query: { video: 2 } })
    expect(requireVideoStore().loadVideo).toHaveBeenCalledWith(2, { sourceKind: 'manual' })
    expect(wrapper.text()).not.toContain('ist bereits vollständig annotiert')

    wrapper.unmount()
  })

  it('shows a disabled non-green waiting state after validation is submitted', async () => {
    const validationRequest = deferred<never>()
    const videoStore = requireVideoStore()
    videoStore.videoList = {
      videos: videos.map((video) =>
        video.id === 2 ? { ...video, segmentAnnotationsValidated: false } : video
      ),
      labels: []
    }
    const anonymizationStore = requireAnonymizationStore()
    const selectedOverview = anonymizationStore.overview.find((item) => item.id === 2)
    if (selectedOverview) selectedOverview.anonymizationStatus = 'validated'
    testState.route.query.video = '2'
    testState.axiosPost.mockReturnValueOnce(validationRequest.promise)

    const wrapper = mountComponent()
    await settle()

    const validateButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Alle Segmente validieren'))
    expect(validateButton).toBeTruthy()

    const renderedValidateButton = requireDefined(validateButton, 'Segment validation button')

    await renderedValidateButton.trigger('click')
    await nextTick()

    const waitingMessage = wrapper.get('[data-test="segment-validation-waiting"]')
    expect(waitingMessage.text()).toContain('Validierung wurde gestartet')
    expect(waitingMessage.text()).toContain('drücken Sie den Button nicht erneut')
    expect(waitingMessage.text()).toContain('Status wird automatisch aktualisiert')
    expect(renderedValidateButton.text()).toContain('Übermittelt – bitte warten')
    expect(renderedValidateButton.classes()).toContain('validation-action-button-pending')
    expect(renderedValidateButton.attributes('disabled')).toBeDefined()
    expect(renderedValidateButton.attributes('aria-busy')).toBe('true')

    await renderedValidateButton.trigger('click')
    expect(testState.axiosPost).toHaveBeenCalledTimes(1)
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

  it('allows placing segments while the selected video is editable', async () => {
    testState.route.query.video = '1'
    requireAnonymizationStore().overview[0].anonymizationStatus = 'validated'

    const wrapper = mountComponent()
    await settle()

    const timeline = wrapper.findComponent({ name: 'Timeline' })
    expect(timeline.props('selectionMode')).toBe(true)

    emitComponentEvent(timeline, 'segment-create', {
      label: 'outside',
      start: 10,
      end: 14
    })
    await settle()

    expect(requireVideoStore().createSegment).toHaveBeenCalledWith(1, 'outside', 10, 14)
    wrapper.unmount()
  })

  it('saves corrected predictions as manual segments without mutating the prediction track', async () => {
    testState.route.query.video = '1'
    requireAnonymizationStore().overview[0].anonymizationStatus = 'validated'
    const videoStore = requireVideoStore()
    videoStore.allSegments = [
      {
        ...segments[0],
        videoID: 1,
        segmentOrigin: 'prediction'
      }
    ]
    videoStore.patchSegmentLocally.mockImplementation(
      (segmentId: number, patch: Record<string, unknown>) => {
        const segment = videoStore.allSegments.find(
          (candidate: { id: number }) => candidate.id === segmentId
        )
        if (segment) Object.assign(segment, patch, { isDirty: true })
      }
    )
    testState.axiosPost.mockResolvedValue({
      data: { createdCount: 1, replacedExisting: true }
    })

    const wrapper = mountComponent()
    await settle()

    await wrapper.get('.source-select').setValue('prediction')
    await settle()

    emitComponentEvent(
      wrapper.findComponent({ name: 'Timeline' }),
      'segment-resize',
      11,
      5,
      13,
      'resize',
      true
    )
    await settle()

    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Segmentänderungen speichern'))
    expect(saveButton?.attributes('disabled')).toBeUndefined()
    await requireDefined(saveButton, 'Segment changes save button').trigger('click')
    await settle()

    expect(testState.axiosPost).toHaveBeenCalledWith(
      '/api/media/videos/1/segments/import-predictions/',
      {
        replace_existing: true,
        segments: [
          {
            label_name: 'outside',
            start_time: 5,
            end_time: 13,
            export_segment: false
          }
        ]
      }
    )
    expect(wrapper.get('.source-select').element).toHaveProperty('value', 'prediction_correction')
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

    await requireDefined(validateButton, 'Annotator-scoped validation button').trigger('click')
    await settle()

    const validationCall = testState.axiosPost.mock.calls.find(
      ([url]) => url === '/api/media/videos/2/segments/validate-bulk/'
    )
    expect(validationCall?.[1]).toMatchObject({
      segmentIds: [11],
      segments: [{ id: 11, start_time: 4, end_time: 12 }],
      isValidated: true,
      informationSourceName: 'manual_annotation',
      annotator: 'reviewer-two'
    })
    const validationPayload = validationCall?.[1]
    if (
      typeof validationPayload !== 'object' ||
      validationPayload === null ||
      !('notes' in validationPayload)
    ) {
      throw new Error('Validation payload did not include notes.')
    }
    expect(validationPayload.notes).toEqual(
      expect.stringContaining('Vollständige Video-Review abgeschlossen am')
    )

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
        onlyValidated: true
      }
    )
    expect(testState.axiosPost).not.toHaveBeenCalledWith(
      '/api/media/videos/2/segments/validate-bulk/',
      expect.anything()
    )
    expect(wrapper.text()).toContain('Schwärzung der Außerhalb-Segmente gestartet')

    wrapper.unmount()
  })

  it('requires a validated outside segment before enabling blackening', async () => {
    testState.route.query.video = '2'
    testState.outsideValidatedCount = 0

    const wrapper = mountComponent()
    await settle()

    expect(
      wrapper.get('[data-test="blacken-outside-segments-button"]').attributes('disabled')
    ).toBeDefined()
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
