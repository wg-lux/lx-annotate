import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import axiosInstance from '@/api/axiosInstance'
import AnonymizationValidationComponent from '../AnonymizationValidationComponent.vue'

const hoisted = vi.hoisted(() => ({
  anonymizationStoreRef: { current: null as any },
  mediaStoreRef: { current: null as any },
  toastStoreRef: { current: null as any },
  routerPush: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  },
  r: (value: string) => value
}))

vi.mock('@/stores/anonymizationStore', () => ({
  useAnonymizationStore: () => hoisted.anonymizationStoreRef.current
}))

vi.mock('@/stores/mediaTypeStore', () => ({
  useMediaTypeStore: () => hoisted.mediaStoreRef.current
}))

vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => hoisted.toastStoreRef.current
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
      validate: (fileId: number) => `anonymization/${fileId}/validate/`
    },
    media: {
      pdfCaseResolution: (fileId: number) => `media/pdfs/${fileId}/case-resolution/`,
      videoCaseResolution: (fileId: number) => `media/videos/${fileId}/case-resolution/`,
      pdfDetail: (fileId: number) => `media/pdfs/${fileId}/`,
      patientTimeline: (patientId: number) => `media/patients/${patientId}/timeline/`,
      pdfStream: (fileId: number) => `media/pdfs/${fileId}/stream/`,
      videoStream: (fileId: number) => `media/videos/${fileId}/stream/`
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
          template:
            '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>'
        },
        OutsideTimelineComponent: true
      }
    }
  })
}

describe('AnonymizationValidationComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()

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

    vi.mocked(axiosInstance.get).mockImplementation(async (url: string) => {
      if (url === 'anonymization/document-types/') {
        return {
          data: [{ value: 'report_final', label: 'report_final' }]
        } as any
      }
      if (url === 'media/pdfs/5/case-resolution/') {
        return { data: {} } as any
      }
      if (url === 'media/pdfs/5/') {
        return { data: {} } as any
      }
      if (url === 'examination/patient-examinations/') {
        return { data: [] } as any
      }
      return { data: {} } as any
    })
  })

  it('blocks pdf approval when no document type is selected', async () => {
    hoisted.anonymizationStoreRef.current.current = buildPdfItem({ documentType: '' })

    const wrapper = mountComponent()
    await flushPromises()

    const approveButton = wrapper.find('button.btn.btn-success')
    expect(approveButton.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain(
      'Bitte wählen Sie einen Dokumenttyp für die PDF-Validierung.'
    )
  })

  it('renders the source file id in the validation header', async () => {
    hoisted.anonymizationStoreRef.current.current = buildPdfItem({ id: 99 })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('PDF-ID: 5')
    expect(wrapper.text()).not.toContain('PDF-ID: 99')
  })

  it('shows backend validation errors when approval fails', async () => {
    vi.mocked(axiosInstance.post).mockRejectedValue({
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

    expect(hoisted.toastStoreRef.current.error).toHaveBeenCalledWith({
      text: 'Fehler beim Bestätigen: document_type is required'
    })
  })

  it('submits the normalized pdf validation payload and shows success toasts', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        report_file: null,
        case_resolution: {
          patient_examination_id: 42
        }
      }
    } as any)

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('button.btn.btn-success').trigger('click')
    await flushPromises()

    expect(vi.mocked(axiosInstance.post)).toHaveBeenCalledWith(
      'anonymization/5/validate/',
      expect.objectContaining({
        file_type: 'pdf',
        document_type: 'report_final',
        patient_dob: '21.03.1994',
        examination_date: '15.02.2024'
      })
    )
    expect(vi.mocked(axiosInstance.post).mock.calls[0][1]).not.toHaveProperty(
      'no_more_names_confirmed'
    )
    expect(hoisted.toastStoreRef.current.success).toHaveBeenCalledWith({
      text: 'Dokument bestätigt und Anonymisierung validiert'
    })
    expect(hoisted.toastStoreRef.current.info).toHaveBeenCalledWith({
      text: 'PDF validiert. Patientenfall 42 wurde automatisch zugeordnet und im Berichtseditor geöffnet.'
    })
    expect(hoisted.routerPush).toHaveBeenCalledWith('/reporting/42/report-editor')
  })

  it('submits no_more_names_confirmed only after an explicit selection', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        report_file: null,
        case_resolution: {
          patient_examination_id: 42
        }
      }
    } as any)

    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('#noMoreNamesConfirmation').setValue('confirmed')
    await wrapper.find('button.btn.btn-success').trigger('click')
    await flushPromises()

    expect(vi.mocked(axiosInstance.post).mock.calls[0][1]).toMatchObject({
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
    expect(JSON.parse(resolutionLink!.attributes('data-to')!)).toEqual({
      path: '/reporting/case-resolution',
      query: {
        preferredExamination: 'colonoscopy',
        returnTo: '/anonymisierung/validierung?fileId=5&mediaType=pdf'
      }
    })
  })

  it('links video validation into the PHI frame-box annotation preset', async () => {
    hoisted.mediaStoreRef.current.isPdf = false
    hoisted.mediaStoreRef.current.isVideo = true

    const wrapper = mountComponent({ fileId: 5, mediaType: 'video' })
    await flushPromises()

    const phiBoxLink = wrapper.find('[data-test="phi-region-frame-annotation-link"]')
    expect(phiBoxLink.exists()).toBe(true)
    expect(JSON.parse(phiBoxLink.attributes('data-to')!)).toEqual({
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
})
