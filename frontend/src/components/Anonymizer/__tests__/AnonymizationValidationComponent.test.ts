import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { AxiosHeaders, type AxiosResponse } from 'axios'

import AnonymizationValidationComponent from '../AnonymizationValidationComponent.vue'

interface AnonymizationStoreFixture {
  loading: boolean
  error: string | null
  current: Record<string, unknown>
  overview: Array<Record<string, unknown>>
  isAnyFileProcessing: boolean
  processingFiles: unknown[]
  fetchOverview: ReturnType<typeof vi.fn>
  setCurrentForValidation: ReturnType<typeof vi.fn>
  fetchNext: ReturnType<typeof vi.fn>
}

interface MediaStoreFixture {
  isPdf: boolean
  isVideo: boolean
  setCurrentByKey: ReturnType<typeof vi.fn>
  rememberType: ReturnType<typeof vi.fn>
  detectMediaType: ReturnType<typeof vi.fn>
}

interface ToastStoreFixture {
  success: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
  info: ReturnType<typeof vi.fn>
  warning: ReturnType<typeof vi.fn>
}

interface HoistedTestState {
  anonymizationStoreRef: { current: AnonymizationStoreFixture | undefined }
  mediaStoreRef: { current: MediaStoreFixture | undefined }
  toastStoreRef: { current: ToastStoreFixture | undefined }
  axiosGet: ReturnType<typeof vi.fn>
  axiosPost: ReturnType<typeof vi.fn>
  routerPush: ReturnType<typeof vi.fn>
  useAuthenticatedVideoStream: ReturnType<typeof vi.fn>
}

const hoisted = vi.hoisted(
  (): HoistedTestState => ({
    anonymizationStoreRef: {
      current: undefined
    },
    mediaStoreRef: {
      current: undefined
    },
    toastStoreRef: {
      current: undefined
    },
    axiosGet: vi.fn(),
    axiosPost: vi.fn(),
    routerPush: vi.fn(),
    useAuthenticatedVideoStream: vi.fn()
  })
)

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

function requireAnonymizationStore(): AnonymizationStoreFixture {
  const store = hoisted.anonymizationStoreRef.current
  if (store === undefined) throw new Error('Anonymization store fixture was not initialized.')
  return store
}

function requireMediaStore(): MediaStoreFixture {
  const store = hoisted.mediaStoreRef.current
  if (store === undefined) throw new Error('Media store fixture was not initialized.')
  return store
}

function requireToastStore(): ToastStoreFixture {
  const store = hoisted.toastStoreRef.current
  if (store === undefined) throw new Error('Toast store fixture was not initialized.')
  return store
}

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.axiosGet,
    post: hoisted.axiosPost
  },
  r: (value: string) => value
}))

vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => requireAnonymizationStore()
}))

vi.mock('@/stores/mediaTypeStore', () => ({
  useMediaTypeStore: () => requireMediaStore()
}))

vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => requireToastStore()
}))

vi.mock('@/stores/videoStore', () => ({
  useVideoStore: () => ({
    fetchAllSegments: vi.fn().mockResolvedValue(undefined),
    allSegments: []
  })
}))

vi.mock('@/composables/useDebug', () => ({
  useDebug: () => ({ isDebug: false })
}))

vi.mock('@/composables/useAuthenticatedVideoStream', () => ({
  useAuthenticatedVideoStream: hoisted.useAuthenticatedVideoStream
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: hoisted.routerPush
  }),
  useRoute: () => ({
    query: {}
  })
}))

vi.mock('@/types/api/endpoints', () => ({
  endpoints: {
    anonymization: {
      documentTypesDropdown: 'anonymization/document-types/',
      validate: (fileId: number) => `anonymization/${String(fileId)}/validate/`
    },
    media: {
      pdfCaseResolution: (fileId: number) => `media/pdfs/${String(fileId)}/case-resolution/`,
      videoCaseResolution: (fileId: number) =>
        `media/videos/${String(fileId)}/case-resolution/`,
      pdfDetail: (fileId: number) => `media/pdfs/${String(fileId)}/`,
      patientTimeline: (patientId: number) =>
        `media/patients/${String(patientId)}/timeline/`,
      pdfStream: (fileId: number) => `media/pdfs/${String(fileId)}/stream/`,
      videoStream: (fileId: number) => `media/videos/${String(fileId)}/stream/`,
      videoHlsPlaylist: (fileId: number) =>
        `media/videos/${String(fileId)}/hls/playlist/`,
      videoCorrectionAnonymization: (fileId: number) =>
        `media/videos/video-correction/${String(fileId)}/anonymization/`
    },
    examination: {
      patientExaminationList: 'examination/patient-examinations/'
    }
  }
}))

function buildPdfItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    patientFirstName: 'Max',
    patientLastName: 'Mustermann',
    patientGenderName: 'female',
    patientDob: '1994-03-21',
    casenumber: 'CASE-1',
    anonymizedText: 'Anonymized report content',
    text: 'Original report content',
    centerName: 'Test Center',
    examinationDate: '2024-02-15',
    documentType: 'report_final',
    ...overrides
  }
}

function mountComponent(props = { fileId: 5, mediaType: 'pdf' }) {
  return mount(AnonymizationValidationComponent, {
    props,
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>'
        },
        OutsideTimelineComponent: true
      }
    }
  })
}

function requireDefined<Value>(value: Value | undefined, context: string): Value {
  if (value === undefined) {
    throw new Error(`${context} was not rendered.`)
  }
  return value
}

function requireAttribute(
  attributes: Readonly<Record<string, string | undefined>>,
  name: string,
  context: string
): string {
  const value = attributes[name]
  if (value === undefined) {
    throw new Error(`${context} did not provide the ${name} attribute.`)
  }
  return value
}

describe('AnonymizationValidationComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.useAuthenticatedVideoStream.mockImplementation(() => ({
      playbackMode: ref('idle'),
      playbackSourceUrl: ref(''),
      playbackError: ref(null),
      isHlsPlayback: ref(false)
    }))

    hoisted.anonymizationStoreRef.current = reactive({
      loading: false,
      error: null,
      current: buildPdfItem(),
      overview: [buildPdfItem()],
      isAnyFileProcessing: false,
      processingFiles: [],
      fetchOverview: vi.fn().mockResolvedValue(undefined),
      setCurrentForValidation: vi.fn().mockResolvedValue(true),
      fetchNext: vi.fn().mockResolvedValue(undefined)
    })

    hoisted.mediaStoreRef.current = reactive({
      isPdf: true,
      isVideo: false,
      setCurrentByKey: vi.fn(),
      rememberType: vi.fn(),
      detectMediaType: vi.fn().mockReturnValue('pdf')
    })

    hoisted.toastStoreRef.current = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn()
    }

    hoisted.axiosGet.mockImplementation((url: string) => {
      if (url === 'anonymization/document-types/') {
        return resolvedApiResponse([{ value: 'report_final', label: 'report_final' }])
      }
      if (url === 'media/pdfs/5/case-resolution/') {
        return resolvedApiResponse({})
      }
      if (url === 'media/pdfs/5/') {
        return resolvedApiResponse({})
      }
      if (url === 'examination/patient-examinations/') {
        return resolvedApiResponse([])
      }
      if (url === 'media/videos/video-correction/5/anonymization/') {
        return resolvedApiResponse({
          strategies: ['detector_assisted', 'processor_region'],
          defaultStrategy: 'detector_assisted',
          selectedStrategy: 'detector_assisted',
          model: { name: 'phi-detector', version: '1.0' },
          ocrEngines: ['RapidOCR'],
          reviewRequired: true,
          processedArtifact: {
            available: true,
            streamUrl: '/api/media/videos/5/hls/playlist/?artifact=processed'
          },
          latestRun: null
        })
      }
      return resolvedApiResponse({})
    })
  })

  it('blocks pdf approval when no document type is selected', async () => {
    requireAnonymizationStore().current = buildPdfItem({ documentType: '' })

    const wrapper = mountComponent()
    await flushPromises()

    const approveButton = wrapper.find('button.btn.btn-success')
    expect(approveButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Bitte wählen Sie einen Dokumenttyp für die PDF-Validierung.')
  })

  it('renders the source file id in the validation header', async () => {
    requireAnonymizationStore().current = buildPdfItem({ id: 99 })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('PDF-ID: 5')
    expect(wrapper.text()).not.toContain('PDF-ID: 99')
  })

  it('disables Skip and Reject until the submitted approval completes', async () => {
    let complete!: (value: AxiosResponse<unknown>) => void
    hoisted.axiosPost.mockImplementation(() => new Promise(resolve => { complete = resolve }))
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('button.btn.btn-success').trigger('click')
    await flushPromises()
    const skip = wrapper.findAll('button').find(button => button.text() === 'Überspringen')
    const reject = wrapper.findAll('button').find(button => button.text() === 'Ablehnen')
    if (!skip || !reject) throw new Error('Approval navigation buttons are missing')
    expect(skip.attributes('disabled')).toBeDefined()
    expect(reject.attributes('disabled')).toBeDefined()
    complete(apiResponse({ case_resolution: { patient_examination_id: 42 } }))
    await flushPromises()
    expect(hoisted.routerPush).toHaveBeenCalledWith('/reporting/42/report-editor')
    wrapper.unmount()
  })

  it('shows backend validation errors when approval fails', async () => {
    hoisted.axiosPost.mockRejectedValue({
      response: {
        data: {
          error: 'document_type is required',
          allowed_document_types: ['report_final']
        }
      }
    })

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('button.btn.btn-success').trigger('click')
    await flushPromises()

    expect(requireToastStore().error).toHaveBeenCalledWith({
      text: 'Fehler beim Bestätigen: document_type is required'
    })
  })

  it('submits the normalized pdf validation payload and shows success toasts', async () => {
    hoisted.axiosPost.mockResolvedValue(
      apiResponse({
        report_file: null,
        case_resolution: {
          patient_examination_id: 42
        }
      })
    )

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('button.btn.btn-success').trigger('click')
    await flushPromises()

    expect(hoisted.axiosPost).toHaveBeenCalledWith(
      'anonymization/5/validate/',
      expect.objectContaining({
        file_type: 'pdf',
        document_type: 'report_final',
        patient_dob: '21.03.1994',
        examination_date: '15.02.2024'
      })
    )
    expect(hoisted.axiosPost.mock.calls[0][1]).not.toHaveProperty('no_more_names_confirmed')
    expect(requireToastStore().success).toHaveBeenCalledWith({
      text: 'Dokument bestätigt und Anonymisierung validiert'
    })
    expect(requireToastStore().info).toHaveBeenCalledWith({
      text: 'PDF validiert. Patientenfall 42 wurde automatisch zugeordnet und im Berichtseditor geöffnet.'
    })
    expect(hoisted.routerPush).toHaveBeenCalledWith('/reporting/42/report-editor')
  })

  it('submits no_more_names_confirmed only after an explicit selection', async () => {
    hoisted.axiosPost.mockResolvedValue(
      apiResponse({
        report_file: null,
        case_resolution: {
          patient_examination_id: 42
        }
      })
    )

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('#noMoreNamesConfirmation').setValue('confirmed')
    await wrapper.find('button.btn.btn-success').trigger('click')
    await flushPromises()

    expect(hoisted.axiosPost.mock.calls[0][1]).toMatchObject({
      no_more_names_confirmed: true
    })
  })

  it('links unresolved validation into case resolution with a return path to validation', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const resolutionLink = wrapper
      .findAll('a')
      .find((link) => link.text().includes('Fallauflösung öffnen'))
    expect(resolutionLink).toBeTruthy()
    const renderedResolutionLink = requireDefined(resolutionLink, 'Case-resolution link')
    const resolutionTarget = requireAttribute(
      renderedResolutionLink.attributes(),
      'data-to',
      'Case-resolution link'
    )
    expect(JSON.parse(resolutionTarget)).toEqual({
      path: '/reporting/case-resolution',
      query: {
        preferredExamination: 'colonoscopy',
        returnTo: '/anonymisierung/validierung?fileId=5&mediaType=pdf'
      }
    })
  })

  it('links video validation into the PHI frame-box annotation preset', async () => {
    requireMediaStore().isPdf = false
    requireMediaStore().isVideo = true

    const wrapper = mountComponent({ fileId: 5, mediaType: 'video' })
    await flushPromises()

    const phiBoxLink = wrapper.find('[data-test="phi-region-frame-annotation-link"]')
    expect(phiBoxLink.exists()).toBe(true)
    const phiBoxTarget = requireAttribute(
      phiBoxLink.attributes(),
      'data-to',
      'PHI frame-box annotation link'
    )
    expect(JSON.parse(phiBoxTarget)).toEqual({
      path: '/frame-annotation',
      query: {
        mode: 'phi_region',
        taskMode: 'random',
        targetLabel: 'sensitive_region',
        informationSource: 'lx_anonymizer_evaluation',
        fileId: '5',
        mediaType: 'video',
        returnTo: '/anonymisierung/validierung?fileId=5&mediaType=video'
      }
    })
  })

  it('renders the camel-cased video anonymization status returned by axios', async () => {
    requireMediaStore().isPdf = false
    requireMediaStore().isVideo = true

    const wrapper = mountComponent({ fileId: 5, mediaType: 'video' })
    await flushPromises()

    expect(wrapper.text()).toContain('PHI-Detektor-gestützte All-Frame-Anonymisierung')
    expect(wrapper.text()).toContain('RapidOCR')
    expect(wrapper.text()).toContain('Anonymisierte Fassung verfügbar')
    expect(wrapper.text()).toContain('Menschliche Prüfung und Freigabe erforderlich')
  })

  it('uses authenticated raw and processed HLS players without direct src bindings', async () => {
    requireMediaStore().isPdf = false
    requireMediaStore().isVideo = true

    const wrapper = mountComponent({ fileId: 5, mediaType: 'video' })
    await flushPromises()

    const videoElements = wrapper.findAll('video').map((video) => {
      const element = video.element
      if (!(element instanceof HTMLVideoElement)) {
        throw new Error('Authenticated video player did not render an HTMLVideoElement.')
      }
      return element
    })
    expect(videoElements).toHaveLength(2)
    for (const element of videoElements) {
      expect(element.getAttribute('preload')).toBe('none')
      expect(element.getAttribute('src')).toBeNull()
    }
    expect(hoisted.useAuthenticatedVideoStream).toHaveBeenCalledTimes(2)
    expect(hoisted.useAuthenticatedVideoStream).toHaveBeenCalledWith(
      expect.objectContaining({ artifactKind: 'raw' })
    )
    expect(hoisted.useAuthenticatedVideoStream).toHaveBeenCalledWith(
      expect.objectContaining({ artifactKind: 'processed' })
    )

    wrapper.unmount()
    expect(requireAnonymizationStore().fetchNext).not.toHaveBeenCalled()
  })
})
