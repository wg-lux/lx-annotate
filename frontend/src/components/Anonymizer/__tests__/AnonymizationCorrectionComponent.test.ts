import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnonymizationCorrectionComponent from '../AnonymizationCorrectionComponent.vue'

interface Deferred<Value> {
  promise: Promise<Value>
  resolve: (value: Value) => void
}

interface FakePdfPage {
  getViewport: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
}

const deferred = <Value>(): Deferred<Value> => {
  let resolvePromise: ((value: Value) => void) | undefined
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve
  })
  if (!resolvePromise) throw new Error('Deferred promise resolver was not initialized.')
  return { promise, resolve: resolvePromise }
}

const hoisted = vi.hoisted(() => ({
  axiosGet: vi.fn(),
  axiosPost: vi.fn(),
  getDocument: vi.fn(),
  getPage: vi.fn(),
  routerPush: vi.fn(),
  setCurrentByKey: vi.fn(),
  setCurrentItem: vi.fn(),
  useAuthenticatedVideoStream: vi.fn(),
  routeQuery: { mediaType: 'pdf' }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.axiosGet,
    post: hoisted.axiosPost
  },
  r: (value: string) => value
}))

vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => ({ overview: [] })
}))

vi.mock('@/stores/mediaTypeStore', () => ({
  useMediaTypeStore: () => ({
    setCurrentByKey: hoisted.setCurrentByKey,
    setCurrentItem: hoisted.setCurrentItem
  })
}))

vi.mock('@/stores/auth_kc', () => ({
  useAuthKcStore: () => ({ user: { sub: 'reviewer-current' } })
}))

vi.mock('@/composables/useAuthenticatedVideoStream', () => ({
  useAuthenticatedVideoStream: hoisted.useAuthenticatedVideoStream
}))

vi.mock('@/utils/runtimeLogger', () => ({
  createRuntimeLogger: () => ({
    debug: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: hoisted.routerPush }),
  useRoute: () => ({ query: hoisted.routeQuery })
}))

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: hoisted.getDocument
}))

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: '/pdf.worker.min.mjs'
}))

describe('AnonymizationCorrectionComponent PDF rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    hoisted.routeQuery.mediaType = 'pdf'
    hoisted.useAuthenticatedVideoStream.mockReturnValue({ playbackError: { value: null } })
    hoisted.axiosGet.mockImplementation((url: string) => {
      if (url.endsWith('media/pdfs/5/')) {
        return Promise.resolve({
          data: {
            filename: 'report.pdf',
            is_validated: false,
            file_size: 1024,
            uploaded_at: '2026-08-27T08:00:00Z'
          }
        })
      }
      if (url.includes('media/pdfs/5/stream/')) {
        return Promise.resolve({ data: new ArrayBuffer(8) })
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      fillRect: vi.fn()
    } as unknown as CanvasRenderingContext2D)
  })

  it('keeps both canvases mounted while the first PDF page is rendering', async () => {
    const pendingPage = deferred<FakePdfPage>()
    const renderPage = vi.fn().mockReturnValue({ promise: Promise.resolve() })
    const page: FakePdfPage = {
      getViewport: vi.fn().mockReturnValue({ width: 640, height: 800 }),
      render: renderPage
    }
    hoisted.getPage.mockReturnValue(pendingPage.promise)
    hoisted.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage: hoisted.getPage })
    })

    const wrapper = mount(AnonymizationCorrectionComponent, {
      props: { fileId: 5, mediaType: 'pdf' }
    })
    await flushPromises()

    expect(hoisted.getPage).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('PDF-Seite wird gerendert...')
    expect(wrapper.find('canvas.pdf-page-canvas').exists()).toBe(true)
    expect(wrapper.find('canvas.pdf-overlay-canvas').exists()).toBe(true)

    pendingPage.resolve(page)
    await flushPromises()

    expect(renderPage).toHaveBeenCalledOnce()
    expect(wrapper.find('canvas.pdf-page-canvas').attributes('width')).toBe('640')
    expect(wrapper.find('canvas.pdf-overlay-canvas').attributes('height')).toBe('800')
    expect(wrapper.text()).not.toContain('PDF-Seite wird gerendert...')
    expect(wrapper.find('[data-test="validated-video-recovery"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('offers validated-video blackening and hands annotator restart to segment editing', async () => {
    hoisted.routeQuery.mediaType = 'video'
    hoisted.axiosGet.mockImplementation((url: string) => {
      if (url === 'media/videos/video-correction/7') {
        return Promise.resolve({
          data: {
            id: 7,
            filename: 'validated-video.mp4',
            mediaType: 'video',
            anonymizationStatus: 'validated',
            fileSize: 2048,
            createdAt: '2026-08-27T08:00:00Z'
          }
        })
      }
      if (url === 'media/videos/7/metadata/') {
        return Promise.resolve({
          data: {
            sensitiveFrameCount: 0,
            totalFrames: 100,
            sensitiveRatio: 0,
            duration: 10,
            resolution: '1920x1080'
          }
        })
      }
      if (url === 'media/videos/7/processing-history/') {
        return Promise.resolve({ data: [] })
      }
      if (url === 'media/videos/video-correction/7/anonymization/') {
        return Promise.resolve({
          data: {
            strategies: ['detector_assisted'],
            defaultStrategy: 'detector_assisted',
            selectedStrategy: 'detector_assisted',
            ocrEngines: [],
            reviewRequired: true,
            processedArtifact: { available: true }
          }
        })
      }
      if (url === 'media/videos/7/segments/validation-status/') {
        return Promise.resolve({
          data: {
            validationComplete: true,
            byLabel: { outside: { validated: 2 } }
          }
        })
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    hoisted.axiosPost.mockResolvedValue({
      data: {
        status: 'queued',
        outsideSegmentCount: 2
      }
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const wrapper = mount(AnonymizationCorrectionComponent, {
      props: { fileId: 7, mediaType: 'video' }
    })
    await flushPromises()

    const recovery = wrapper.get('[data-test="validated-video-recovery"]')
    const blackenButton = recovery.get('[data-test="correction-blacken-outside"]')
    expect(blackenButton.attributes('disabled')).toBeUndefined()

    await blackenButton.trigger('click')
    await flushPromises()

    expect(hoisted.axiosPost).toHaveBeenCalledWith(
      'media/videos/7/segments/blacken-outside/',
      { onlyValidated: true }
    )
    expect(recovery.text()).toContain('Schwärzung der Außerhalb-Segmente gestartet')

    await recovery
      .get('[data-test="correction-annotator-override-input"]')
      .setValue('oidc:reviewer-restart')
    await recovery.get('[data-test="correction-annotator-override-apply"]').trigger('click')

    expect(hoisted.routerPush).toHaveBeenCalledWith({
      name: 'Video-Untersuchung',
      query: { video: '7', editSegments: '1' }
    })
    expect(
      localStorage.getItem(
        'lxAnnotate.annotationPrincipalOverride.v1:oidc%3Areviewer-current:video%3A7'
      )
    ).toBe('oidc:reviewer-restart')
  })
})
