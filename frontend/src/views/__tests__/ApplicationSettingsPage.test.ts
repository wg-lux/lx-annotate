import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ApplicationSettingsPage from '../ApplicationSettingsPage.vue'

const hoisted = vi.hoisted(() => ({
  fetchApplicationSettings: vi.fn(),
  fetchApplicationSettingsDropdowns: vi.fn(),
  updateApplicationSettings: vi.fn(),
  toastSuccess: vi.fn()
}))

vi.mock('@/api/applicationSettingsApi', () => ({
  fetchApplicationSettings: hoisted.fetchApplicationSettings,
  fetchApplicationSettingsDropdowns: hoisted.fetchApplicationSettingsDropdowns,
  updateApplicationSettings: hoisted.updateApplicationSettings
}))

vi.mock('@/stores/toastStore', () => ({
  useToastStore: () => ({
    success: hoisted.toastSuccess,
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}))

describe('ApplicationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    hoisted.fetchApplicationSettings.mockResolvedValue({
      id: 1,
      centerId: 1,
      centerName: 'Center Alpha',
      processorId: 10,
      processorName: 'Processor One',
      annotatorName: null,
      reportTemplateName: 'template_a',
      updatedAt: '2026-03-26T12:30:00Z'
    })

    hoisted.fetchApplicationSettingsDropdowns.mockResolvedValue({
      centers: [
        { id: 1, name: 'Center Alpha' },
        { id: 2, name: 'Center Beta' }
      ],
      processors: [
        { id: 10, name: 'Processor One' },
        { id: 11, name: 'Processor Two' }
      ],
      reportTemplates: [
        { value: 'template_a', label: 'Template A' },
        { value: 'template_b', label: 'Template B' }
      ]
    })

    hoisted.updateApplicationSettings.mockResolvedValue({
      id: 1,
      centerId: 2,
      centerName: 'Center Beta',
      processorId: 11,
      processorName: 'Processor Two',
      annotatorName: null,
      reportTemplateName: 'template_b',
      updatedAt: '2026-03-26T13:15:00Z'
    })
  })

  it('loads the current defaults and saves updated selections', async () => {
    const wrapper = mount(ApplicationSettingsPage)
    await flushPromises()

    expect(hoisted.fetchApplicationSettings).toHaveBeenCalledTimes(1)
    expect(hoisted.fetchApplicationSettingsDropdowns).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-test=\"summary-center\"]').text()).toContain('Center Alpha')
    expect(wrapper.get('[data-test=\"summary-processor\"]').text()).toContain('Processor One')
    expect(wrapper.get('[data-test=\"summary-report-template\"]').text()).toContain('Template A')

    await wrapper.get('[data-test=\"center-select\"]').setValue('2')
    await wrapper.get('[data-test=\"processor-select\"]').setValue('11')
    await wrapper.get('[data-test=\"report-template-select\"]').setValue('template_b')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(hoisted.updateApplicationSettings).toHaveBeenCalledWith({
      centerId: 2,
      processorId: 11,
      reportTemplateName: 'template_b'
    })
    expect(hoisted.toastSuccess).toHaveBeenCalledWith({
      text: 'Anwendungseinstellungen gespeichert.'
    })
    expect(wrapper.get('[data-test=\"summary-center\"]').text()).toContain('Center Beta')
    expect(wrapper.get('[data-test=\"summary-processor\"]').text()).toContain('Processor Two')
    expect(wrapper.get('[data-test=\"summary-report-template\"]').text()).toContain('Template B')
  })
})
