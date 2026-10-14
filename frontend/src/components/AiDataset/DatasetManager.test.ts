import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DatasetManager from './DatasetManager.vue'

const api = vi.hoisted(() => ({
  list_datasets: vi.fn(),
  read_dataset: vi.fn(),
  create_dataset: vi.fn(),
  update_dataset: vi.fn(),
  combine_datasets: vi.fn(),
  split_dataset: vi.fn(),
  preview_deletion: vi.fn(),
  delete_dataset: vi.fn()
}))
vi.mock('@/api/datasetLifecycleApi', () => api)
vi.mock('./DatasetStudyCohorts.vue', () => ({ default: { template: '<div />' } }))

const dataset = {
  id: 1,
  name: 'Imported table',
  description: '',
  modality: 'clinical',
  active: true,
  owner: 1,
  system: false,
  examinations: 2,
  videos: 0,
  images: 0,
  segments: 0
}

describe('dataset management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.list_datasets.mockResolvedValue([dataset])
    api.preview_deletion.mockResolvedValue({
      preview: 'signed-preview',
      removable: [10],
      retained: [{ id: 11, reason: 'shared_dataset' }],
      studies: [3],
      examinations: [10, 11],
      images: [],
      segments: [],
      videos: []
    })
    api.delete_dataset.mockResolvedValue({ deleted: [10] })
  })

  it.each(['memberships_only', 'exclusive_imported_records'] as const)(
    'requires an explicit deletion choice: %s',
    async (mode) => {
      const wrapper = mount(DatasetManager)
      await flushPromises()
      await wrapper.get('#managed-dataset').setValue('1')
      const open = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Datensatz löschen …')
      if (!open) throw new Error('Deletion action missing')
      await open.trigger('click')
      await flushPromises()
      const confirm = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Gewählte Löschung bestätigen')
      if (!confirm) throw new Error('Confirmation missing')
      expect(confirm.attributes('disabled')).toBeDefined()
      expect(api.delete_dataset).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('In einem anderen Datensatz enthalten')
      await wrapper.get(`input[value="${mode}"]`).setValue(true)
      await confirm.trigger('click')
      await flushPromises()
      expect(api.delete_dataset).toHaveBeenCalledWith(1, 'signed-preview', mode)
      expect(wrapper.emitted('changed')).toHaveLength(1)
    }
  )

  it('splits complete patients into selected and remaining partitions', async () => {
    api.read_dataset.mockResolvedValue({
      ...dataset,
      patients: [
        { id: 10, examinations: [100, 101], videos: [] },
        { id: 20, examinations: [200], videos: [] }
      ]
    })
    api.split_dataset.mockResolvedValue([{ ...dataset, id: 2 }])
    const wrapper = mount(DatasetManager)
    await flushPromises()
    await wrapper.get('#managed-dataset').setValue('1')
    const load = wrapper.findAll('button').find((button) => button.text() === 'Patienten laden')
    if (!load) throw new Error('Membership action missing')
    await load.trigger('click')
    await flushPromises()
    await wrapper.get('input[type="checkbox"][value="10"]').setValue(true)
    await wrapper.get('#split-first').setValue('A')
    await wrapper.get('#split-second').setValue('B')
    const split = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Zwei Datensätze erstellen')
    if (!split) throw new Error('Split action missing')
    await split.trigger('click')
    await flushPromises()
    expect(api.split_dataset).toHaveBeenCalledWith(1, [
      { name: 'A', patients: [10] },
      { name: 'B', patients: [20] }
    ])
  })

  it('does not offer deletion of a system dataset', async () => {
    api.list_datasets.mockResolvedValue([{ ...dataset, system: true }])
    const wrapper = mount(DatasetManager)
    await flushPromises()
    await wrapper.get('#managed-dataset').setValue('1')
    const button = wrapper.findAll('button').find((item) => item.text() === 'Datensatz löschen …')
    expect(button?.attributes('disabled')).toBeDefined()
  })
})
