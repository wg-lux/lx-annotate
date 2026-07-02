import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import { makeReport } from '@/api/reportExportApi'
import ReportExportPage from '../ReportExportPage.vue'

const hoisted = vi.hoisted(() => ({
  setActiveReportId: vi.fn(),
  makeReport: vi.fn()
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
  useReportingFlowStore: () => ({
    patientExaminationId: null,
    activeReportId: null,
    setActiveReportId: hoisted.setActiveReportId
  })
}))

describe('ReportExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: [{ id: 88, status: 'draft', version: 3 }]
    } as any)
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
})
