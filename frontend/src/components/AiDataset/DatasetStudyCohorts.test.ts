import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DatasetStudyCohorts from './DatasetStudyCohorts.vue'

const api = vi.hoisted(() => ({ fetchStudyCohorts: vi.fn(), linkDatasetStudyCohort: vi.fn() }))
vi.mock('@/api/studyCohortApi', () => api)

describe('dataset cohort links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchStudyCohorts.mockResolvedValue([
      { id: 1, name: 'First study', datasetIds: [7, 8] },
      { id: 2, name: 'Second study', datasetIds: [] }
    ])
  })

  it('adds and removes links without replacing other cohort datasets', async () => {
    const wrapper = mount(DatasetStudyCohorts, { props: { datasetId: '7' } })
    await flushPromises()
    api.linkDatasetStudyCohort.mockResolvedValue({ id: 2, name: 'Second study', datasetIds: [7] })
    await wrapper.get('[data-test="cohort-link-2"]').setValue(true)
    await flushPromises()
    expect(api.linkDatasetStudyCohort).toHaveBeenCalledWith('7', 2, true)
    api.linkDatasetStudyCohort.mockResolvedValue({ id: 1, name: 'First study', datasetIds: [8] })
    await wrapper.get('[data-test="cohort-link-1"]').setValue(false)
    await flushPromises()
    expect(api.linkDatasetStudyCohort).toHaveBeenCalledWith('7', 1, false)
    expect(wrapper.text()).toContain('First study · 1 Datensätze')
  })

  it('reports failed writes without claiming success', async () => {
    const wrapper = mount(DatasetStudyCohorts, { props: { datasetId: '7' } })
    await flushPromises()
    api.linkDatasetStudyCohort.mockRejectedValue(new Error('denied'))
    await wrapper.get('[data-test="cohort-link-2"]').setValue(true)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('nicht gespeichert')
  })
})
