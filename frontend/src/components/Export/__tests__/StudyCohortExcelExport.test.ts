import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  fetchStudyCohortExportWorkbook: vi.fn(),
  createObjectURL: vi.fn(() => 'blob:study-cohort'),
  revokeObjectURL: vi.fn()
}))

vi.mock('@/api/studyExportApi', () => ({
  fetchStudyCohortExportWorkbook: hoisted.fetchStudyCohortExportWorkbook
}))

import StudyCohortExcelExport from '@/components/Export/StudyCohortExcelExport.vue'
import { useStudyCohortExportStore } from '@/stores/studyCohortExportStore'

const definition = {
  studyName: 'Polypenregister 2026',
  hypothesis: 'Polypen treten häufiger auf.',
  schemaVersion: '1.0',
  filters: {
    dateFrom: '2026-01-01',
    dateTo: '2026-06-30',
    centerKey: 'center-a',
    examinationName: 'colonoscopy',
    documentType: 'endoscopy-report',
    finding: 'polyp',
    annotationLabel: 'adenoma',
    hasReport: true,
    hasVideo: false,
    limit: 100
  },
  summary: { caseCount: 1, patientCount: 1, reportCount: 1, videoCount: 1 },
  patientExaminationIds: [314, 315]
}

describe('StudyCohortExcelExport AAA contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    hoisted.fetchStudyCohortExportWorkbook.mockResolvedValue({
      blob: new Blob(['xlsx']),
      filename: 'pseudonymous-study-cohort.xlsx',
      rowCount: 1
    })
    vi.stubGlobal('URL', {
      createObjectURL: hoisted.createObjectURL,
      revokeObjectURL: hoisted.revokeObjectURL
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })

  it('shows a safe empty state until a cohort has been reviewed', () => {
    // Arrange
    const wrapper = mount(StudyCohortExcelExport, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
    })
    // Act
    const emptyState = wrapper.get('[data-test="cohort-export-empty"]')

    // Assert
    expect(emptyState.text()).toContain('keine Studienkohorte')
    expect(hoisted.fetchStudyCohortExportWorkbook).not.toHaveBeenCalled()
  })

  it('downloads the exact reviewed cohort definition', async () => {
    // Arrange
    const store = useStudyCohortExportStore()
    store.definition = definition
    const wrapper = mount(StudyCohortExcelExport, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } }
    })

    // Act
    await wrapper.get('[data-test="download-cohort-workbook"]').trigger('click')
    await flushPromises()

    // Assert
    expect(wrapper.get('[data-test="cohort-export-filters"]').text()).toContain('center-a')
    expect(wrapper.get('[data-test="cohort-export-filters"]').text()).toContain('polyp')
    expect(hoisted.fetchStudyCohortExportWorkbook).toHaveBeenCalledWith(definition)
    expect(hoisted.createObjectURL).toHaveBeenCalledOnce()
    expect(hoisted.revokeObjectURL).toHaveBeenCalledWith('blob:study-cohort')
    expect(wrapper.get('[data-test="cohort-export-message"]').text()).toContain(
      '1 Patientenverläufe wurden exportiert'
    )
  })
})
