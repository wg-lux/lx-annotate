import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import ReportingWorklistPage from '../ReportingWorklistPage.vue'

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn()
  },
  r: (path: string) => `api/${path}`
}))

describe('ReportingWorklistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads reports and filters by status', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: [
        { id: 101, status: 'final', version: 3, patientExaminationId: 44 },
        { id: 102, status: 'draft', version: 1, patientExaminationId: 45 }
      ]
    } as any)

    const wrapper = mount(ReportingWorklistPage, {
      global: {
        stubs: { RouterLink: true }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('#101')
    expect(wrapper.text()).toContain('#102')

    await wrapper.find('select').setValue('final')
    expect(wrapper.text()).toContain('#101')
    expect(wrapper.text()).not.toContain('#102')
  })
})
