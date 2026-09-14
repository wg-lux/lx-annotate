import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportingWorklistPage from '../ReportingWorklistPage.vue'

const axiosGet = vi.hoisted(() => vi.fn())

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: axiosGet
  },
  r: (path: string) => `api/${path}`
}))

describe('ReportingWorklistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads reports and filters by status', async () => {
    axiosGet.mockResolvedValue({
      data: [
        { id: 101, status: 'final', version: 3, patientExaminationId: 44 },
        { id: 102, status: 'draft', version: 1, patientExaminationId: 45 }
      ]
    })

    const wrapper = mount(ReportingWorklistPage, {
      global: {
        stubs: { RouterLink: true }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Abgeschlossen')
    expect(wrapper.text()).toContain('Entwurf')
    expect(wrapper.text()).not.toContain('#101')
    expect(wrapper.findAll('details')).toHaveLength(2)
    expect(
      wrapper.findAll('details').every((details) => details.attributes('open') === undefined)
    ).toBe(true)

    await wrapper.find('select').setValue('final')
    expect(wrapper.get('tbody').text()).toContain('Abgeschlossen')
    expect(wrapper.get('tbody').text()).not.toContain('Entwurf')
  })
})
