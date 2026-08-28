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
  getDocument: vi.fn(),
  getPage: vi.fn(),
  routerPush: vi.fn(),
  setCurrentByKey: vi.fn(),
  setCurrentItem: vi.fn(),
  useAuthenticatedVideoStream: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.axiosGet,
    post: vi.fn()
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
  useRoute: () => ({ query: { mediaType: 'pdf' } })
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

    wrapper.unmount()
  })
})
