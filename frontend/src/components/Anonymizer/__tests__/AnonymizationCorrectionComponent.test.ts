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
  buildPdfCorrection: vi.fn(),
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

vi.mock('@/utils/pdfCorrection', () => ({ build_pdf_correction: hoisted.buildPdfCorrection }))

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
            isValidated: false,
            fileSize: 1024,
            uploadedAt: '2026-08-27T08:00:00Z'
          }
        })
      }
      if (url.includes('media/pdfs/5/stream/')) {
        return Promise.resolve({ data: new ArrayBuffer(8) })
      }
      throw new Error(`Unexpected GET ${url}`)
    })

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      setLineDash: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect: vi.fn(),
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

  it('saves a PDF correction as a source-bound revision on the existing report', async () => {
    hoisted.getPage.mockResolvedValue({
      getViewport: () => ({ width: 640, height: 800 }),
      render: () => ({ promise: Promise.resolve() })
    })
    hoisted.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: hoisted.getPage })
    })
    const manifest = { version: 1, normalized: true, pages: [{ page: 1, boxes: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }] }] }
    hoisted.buildPdfCorrection.mockResolvedValue({ bytes: new Uint8Array([1, 2]), source_sha256: 'a'.repeat(64), manifest })
    hoisted.axiosPost.mockResolvedValue({ data: { fileId: 5, revisionId: 9, status: 'done_processing_anonymization', anonymizationValidated: false } })
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:pdf'), revokeObjectURL: vi.fn() }))
    const wrapper = mount(AnonymizationCorrectionComponent, { props: { fileId: 5, mediaType: 'pdf' } })
    await flushPromises()
    const overlay = wrapper.get('canvas.pdf-overlay-canvas')
    vi.spyOn(overlay.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 640, height: 800 } as DOMRect)
    await overlay.trigger('mousedown', { clientX: 64, clientY: 80 })
    await overlay.trigger('mousemove', { clientX: 192, clientY: 240 })
    await overlay.trigger('mouseup')
    const generate = wrapper.findAll('button').find(button => button.text().includes('Anonymisierte PDF erzeugen'))
    expect(generate).toBeDefined()
    await generate?.trigger('click')
    await flushPromises()
    const save = wrapper.findAll('button').find(button => button.text().includes('Korrektur am Bericht speichern'))
    await save?.trigger('click')
    await flushPromises()
    expect(hoisted.axiosPost).toHaveBeenCalledOnce()
    const [url, form] = hoisted.axiosPost.mock.calls[0] as [string, FormData]
    expect(url).toBe('media/pdfs/5/apply-redactions/')
    expect(form.get('source_type')).toBe('raw')
    expect(form.get('client_source_sha256')).toBe('a'.repeat(64))
    expect(form.get('redaction_manifest')).toBe(JSON.stringify(manifest))
    expect(wrapper.text()).toContain('Erneute Anonymisierungsprüfung erforderlich')
    const stream = hoisted.useAuthenticatedVideoStream.mock.calls[0]?.[0] as { videoId: { value: number | null } }
    expect(stream.videoId.value).toBeNull()
    wrapper.unmount()
  })

  it('ignores a late report response after selecting another report', async () => {
    const pending = deferred<{ data: { filename: string } }>()
    hoisted.axiosGet.mockImplementation((url: string) => {
      if (url === 'media/pdfs/5/') return pending.promise
      if (url === 'media/pdfs/6/') return Promise.resolve({ data: { filename: 'current.pdf' } })
      if (url.includes('/stream/')) return Promise.reject(new Error('source unavailable'))
      throw new Error(url)
    })
    const wrapper = mount(AnonymizationCorrectionComponent, { props: { fileId: 5, mediaType: 'pdf' } })
    await wrapper.setProps({ fileId: 6 })
    await flushPromises()
    pending.resolve({ data: { filename: 'stale.pdf' } })
    await flushPromises()
    expect(wrapper.text()).toContain('current.pdf')
    expect(wrapper.text()).not.toContain('stale.pdf')
    wrapper.unmount()
  })

  it('keeps a running video correction bound to its submitted video after navigation', async () => {
    hoisted.routeQuery.mediaType = 'video'
    const pending = deferred<{ data: Record<string, unknown> }>()
    const status = {
      strategies: ['detector_assisted'], defaultStrategy: 'detector_assisted',
      selectedStrategy: 'detector_assisted', ocrEngines: [], reviewRequired: true,
      processedArtifact: { available: false }
    }
    let old_status_reads = 0
    hoisted.axiosGet.mockImplementation((url: string) => {
      if (url.endsWith('/metadata/')) return Promise.resolve({ data: {} })
      if (url.endsWith('/processing-history/')) return Promise.resolve({ data: [] })
      if (url.endsWith('/anonymization/')) {
        if (url.includes('/7/')) {
          old_status_reads += 1
          if (old_status_reads === 2) return pending.promise
        }
        return Promise.resolve({ data: status })
      }
      const id = url.endsWith('/7') ? 7 : 8
      return Promise.resolve({ data: { id, filename: `video-${String(id)}.mp4`, mediaType: 'video', anonymizationStatus: 'not_started' } })
    })
    hoisted.axiosPost.mockResolvedValue({ data: { ...status, job: { historyId: 99, videoId: 7 } } })
    const wrapper = mount(AnonymizationCorrectionComponent, { props: { fileId: 7, mediaType: 'video' } })
    await flushPromises()
    const button = wrapper.findAll('button').find(item => item.text().includes('Anonymisierung anwenden'))
    expect(button).toBeDefined()
    await button?.trigger('click')
    await flushPromises()
    expect(old_status_reads).toBe(2)
    await wrapper.setProps({ fileId: 8 })
    await flushPromises()
    pending.resolve({ data: { ...status, processedArtifact: { available: true }, latestRun: { id: 99, status: 'success' } } })
    await flushPromises()
    expect(wrapper.text()).toContain('video-8.mp4')
    expect(wrapper.text()).not.toContain('Anonymisierung abgeschlossen')
    expect(hoisted.axiosPost.mock.calls[0]?.[0]).toBe('media/videos/video-correction/7/anonymization/')
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
