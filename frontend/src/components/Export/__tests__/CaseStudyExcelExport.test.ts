import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  fetchStudyExportOptions: vi.fn(),
  fetchStudyExportWorkbook: vi.fn(),
  createObjectURL: vi.fn(() => 'blob:study-export'),
  revokeObjectURL: vi.fn()
}))

vi.mock('@/api/studyExportApi', () => ({
  fetchStudyExportOptions: hoisted.fetchStudyExportOptions,
  fetchStudyExportWorkbook: hoisted.fetchStudyExportWorkbook
}))

import CaseStudyExcelExport from '@/components/Export/CaseStudyExcelExport.vue'

const options = {
  examinations: ['colonoscopy', 'gastroscopy'],
  findings: ['gastritis', 'polyp'],
  indications: ['screening', 'surveillance'],
  maximumRows: 25000
}

const exportedWorkbook = { filename: 'study.xlsx', rowCount: 3 } as const

describe('CaseStudyExcelExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.fetchStudyExportOptions.mockResolvedValue(options)
    hoisted.fetchStudyExportWorkbook.mockResolvedValue({
      blob: new Blob(['xlsx']),
      ...exportedWorkbook
    })
    vi.stubGlobal('URL', {
      createObjectURL: hoisted.createObjectURL,
      revokeObjectURL: hoisted.revokeObjectURL
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('loads persisted concepts and submits selected categories', async () => {
    const wrapper = mount(CaseStudyExcelExport)
    await flushPromises()

    expect(hoisted.fetchStudyExportOptions).toHaveBeenCalledOnce()
    expect(wrapper.findAll('[data-test="option-examinations"]')).toHaveLength(
      options.examinations.length
    )
    expect(wrapper.findAll('[data-test="option-findings"]')).toHaveLength(options.findings.length)
    expect(wrapper.findAll('[data-test="option-indications"]')).toHaveLength(
      options.indications.length
    )
    expect(wrapper.get('[data-test="download-workbook"]').attributes('disabled')).toBeDefined()

    await wrapper.findAll('[data-test="option-examinations"]')[0].setValue(true)
    await wrapper.findAll('[data-test="option-findings"]')[1].setValue(true)
    await wrapper.findAll('[data-test="option-indications"]')[0].setValue(true)
    await wrapper.get('[data-test="download-workbook"]').trigger('click')
    await flushPromises()

    expect(hoisted.fetchStudyExportWorkbook).toHaveBeenCalledWith({
      examinations: ['colonoscopy'],
      findings: ['polyp'],
      indications: ['screening'],
      groupBy: 'patient'
    })
    expect(hoisted.createObjectURL).toHaveBeenCalledOnce()
    expect(hoisted.revokeObjectURL).toHaveBeenCalledWith('blob:study-export')
    expect(wrapper.get('[data-test="export-message"]').text()).toContain(
      '3 Patientenverläufe wurden exportiert'
    )
  })

  it('filters long concept lists without clearing checked values', async () => {
    const wrapper = mount(CaseStudyExcelExport)
    await flushPromises()

    await wrapper.findAll('[data-test="option-findings"]')[1].setValue(true)
    await wrapper.get('[data-test="search-findings"]').setValue('gastr')

    const visibleFindings = wrapper.findAll('[data-test="option-findings"]')
    expect(visibleFindings).toHaveLength(1)
    expect(visibleFindings[0].element).toHaveProperty('value', 'gastritis')

    await wrapper.get('[data-test="download-workbook"]').trigger('click')
    await flushPromises()
    expect(hoisted.fetchStudyExportWorkbook).toHaveBeenCalledWith({
      examinations: [],
      findings: ['polyp'],
      indications: [],
      groupBy: 'patient'
    })
  })

  it('exports one row per examination when that grouping is selected', async () => {
    const wrapper = mount(CaseStudyExcelExport)
    await flushPromises()
    await wrapper.get('#group-by-examination').setValue(true)
    await wrapper.findAll('[data-test="option-findings"]')[1].setValue(true)

    await wrapper.get('[data-test="download-workbook"]').trigger('click')
    await flushPromises()

    expect(hoisted.fetchStudyExportWorkbook).toHaveBeenCalledWith({
      examinations: [],
      findings: ['polyp'],
      indications: [],
      groupBy: 'examination'
    })
  })

  it('renders a JSON error returned with the binary response type', async () => {
    hoisted.fetchStudyExportWorkbook.mockRejectedValue({
      response: {
        data: new Blob([JSON.stringify({ error: 'Keine passenden Fälle.' })], {
          type: 'application/json'
        })
      }
    })
    const wrapper = mount(CaseStudyExcelExport)
    await flushPromises()
    await wrapper.findAll('[data-test="option-findings"]')[0].setValue(true)

    await wrapper.get('[data-test="download-workbook"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.find('[data-test="export-message"]').exists()).toBe(true)
    })

    expect(wrapper.get('[data-test="export-message"]').text()).toContain('Keine passenden Fälle.')
  })
})
