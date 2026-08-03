import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
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
      }
    }
  },
  terminology: {
    activeBundle: { moduleName: 'clinical_reporting', version: '2.0.0' }
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn()
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
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: [{ id: 88, status: 'draft', version: 3 }]
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

    await wrapper.findAll('button').find((button) => button.text().includes('Make report'))?.trigger('click')
    await flushPromises()

    expect(makeReport).toHaveBeenCalledWith({
      patientExaminationId: 17,
      reportId: 88,
      patient: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        dob: '1815-12-10'
      },
      maxFrames: 12
    })
    expect(hoisted.setActiveReportId).toHaveBeenCalledWith(88)
    expect(wrapper.text()).toContain('2 Bild(er)')

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
      .find((button) => button.text().includes('Make report'))
    expect(makeButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('verifizierter Entwurf')
    expect(makeReport).not.toHaveBeenCalled()
  })
})
