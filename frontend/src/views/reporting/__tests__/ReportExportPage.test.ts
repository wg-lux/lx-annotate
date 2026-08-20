import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeReport } from '@/api/reportExportApi'
import ReportExportPage from '../ReportExportPage.vue'

const hoisted = vi.hoisted(() => ({
  setActiveReportId: vi.fn(),
  makeReport: vi.fn(),
  flow: {
    patientExaminationId: null as number | null,
    activeReportId: null as number | null,
    currentRuntimeDraft: {
      patientExaminationId: 17,
      templateName: 'published_template',
      verificationStatus: 'verified' as 'verified' | 'unverified',
      moduleName: 'clinical_reporting',
      templateIdentity: {
        moduleName: 'clinical_reporting',
        knowledgeBaseVersion: '2.0.0'
      },
      payload: { examination: 'Koloskopie' }
    },
    selectedTemplateName: 'published_template',
    mediaPreload: null
  },
  terminology: {
    activeBundle: { moduleName: 'clinical_reporting', version: '2.0.0' }
  }
}))

const axiosGet = vi.hoisted(() => vi.fn())
const createObjectUrl = vi.hoisted(() => vi.fn((_blob: Blob) => 'blob:report-text'))
const revokeObjectUrl = vi.hoisted(() => vi.fn())
let clickedDownloadName = ''

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: axiosGet
  },
  r: (path: string) => `api/${path}`
}))

vi.mock('@/api/reportExportApi', () => ({
  makeReport: hoisted.makeReport
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      patient_examination_id: '17'
    }
  }),
  RouterLink: {
    template: '<a><slot /></a>'
  }
}))

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => ({ ...hoisted.flow, setActiveReportId: hoisted.setActiveReportId }),
  isVerifiedRuntimeDraftForBundle: (
    draft: typeof hoisted.flow.currentRuntimeDraft | null,
    bundle: typeof hoisted.terminology.activeBundle | null,
    patientExaminationId: number | null
  ) =>
    Boolean(
      draft &&
      bundle &&
      draft.patientExaminationId === patientExaminationId &&
      draft.verificationStatus === 'verified' &&
      draft.templateName &&
      draft.templateIdentity.moduleName === bundle.moduleName &&
      draft.templateIdentity.knowledgeBaseVersion === bundle.version
    )
}))

vi.mock('@/stores/terminologyStore', () => ({
  useTerminologyStore: () => hoisted.terminology
}))

describe('ReportExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.flow.currentRuntimeDraft.verificationStatus = 'verified'
    axiosGet.mockResolvedValue({
      data: [
        {
          id: 88,
          status: 'draft',
          version: 3,
          updatedAt: '2026-08-04T10:05:00Z',
          renderedText: 'Unauffällige Schleimhaut.',
          templateName: 'published_template'
        }
      ]
    })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl
    })
    clickedDownloadName = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clickedDownloadName = this.download
    })
    vi.mocked(makeReport).mockResolvedValue({
      report: { id: 88, status: 'final', version: 3 },
      warnings: [],
      includedFrameCount: 2,
      persistedArtifacts: {
        pdfViewUrl: '/api/media/pdfs/12/stream/?type=processed',
        pdfDownloadUrl: '/api/media/pdfs/12/stream/?type=raw&download=1',
        patientTimelineUrl: '/api/media/patients/9/timeline/'
      }
    })
  })

  it('posts identity fields only when creating the PDF report', async () => {
    const wrapper = mount(ReportExportPage, {
      global: {
        stubs: {
          RouterLink: true
        }
      }
    })
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Ada')
    await inputs[1].setValue('Lovelace')
    await inputs[2].setValue('1815-12-10')

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('PDF-Bericht erstellen'))
      ?.trigger('click')
    await flushPromises()

    expect(makeReport).toHaveBeenCalledWith({
      patientExaminationId: 17,
      reportId: 88,
      knowledgeBaseModule: 'clinical_reporting',
      knowledgeBaseVersion: '2.0.0',
      patient: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        dob: '1815-12-10'
      },
      maxFrames: 12
    })
    expect(hoisted.setActiveReportId).toHaveBeenCalledWith(88)
    expect(wrapper.text()).toContain('2 Bild(er)')
    expect(wrapper.text()).toContain('Der PDF-Bericht wurde erstellt.')
    expect(
      wrapper.get('[data-testid="download-text-report"]').attributes('disabled')
    ).toBeUndefined()
    expect(wrapper.text()).not.toContain('PDF-Bericht #88')
    expect(
      wrapper.get('[data-testid="export-technical-details"]').attributes('open')
    ).toBeUndefined()

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(hrefs).toContain('/api/media/pdfs/12/stream/?type=processed')
    expect(hrefs).toContain('/api/media/pdfs/12/stream/?type=raw&download=1')
    expect(hrefs).toContain('/api/media/patients/9/timeline/?patient_examination_id=17')
  })

  it('blocks direct PDF export without a verified compatible template', async () => {
    hoisted.flow.currentRuntimeDraft.verificationStatus = 'unverified'
    const wrapper = mount(ReportExportPage, {
      global: { stubs: { RouterLink: true } }
    })
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Ada')
    await inputs[1].setValue('Lovelace')
    await inputs[2].setValue('1815-12-10')

    const makeButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('PDF-Bericht erstellen'))
    expect(makeButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('verifizierter Entwurf')
    expect(makeReport).not.toHaveBeenCalled()
  })

  it('downloads the persisted rendered report as a named UTF-8 text file', async () => {
    const wrapper = mount(ReportExportPage, {
      global: { stubs: { RouterLink: true } }
    })
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Ada')
    await inputs[1].setValue('Lovelace')
    await inputs[2].setValue('1815-12-10')
    await wrapper.get('[data-testid="download-text-report"]').trigger('click')

    expect(createObjectUrl).toHaveBeenCalledOnce()
    const blob = createObjectUrl.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(clickedDownloadName).toBe('Befundbericht_88.txt')
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:report-text')
    expect(wrapper.text()).toContain('Der TXT-Bericht wurde heruntergeladen.')
  })

  it('disables text export when no persisted rendered text exists', async () => {
    axiosGet.mockResolvedValue({ data: [{ id: 88, status: 'draft', version: 3 }] })
    const wrapper = mount(ReportExportPage, {
      global: { stubs: { RouterLink: true } }
    })
    await flushPromises()

    expect(wrapper.get('[data-testid="download-text-report"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('zuerst im Berichtseditor gespeichert')
  })
})
