import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudyTableImport from './StudyTableImport.vue'

const api = vi.hoisted(() => ({
  list_table_mappings: vi.fn(),
  save_table_mapping: vi.fn(),
  read_table_mapping: vi.fn(),
  import_study_table: vi.fn()
}))
vi.mock('@/api/tableImportApi', () => api)

describe('study table import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.list_table_mappings.mockResolvedValue({
      template: 'name: Neue Zuordnung',
      mappings: [{ id: 'mapping-id', name: 'My mapping' }],
      centers: [{ id: 3, name: 'Center' }]
    })
    api.read_table_mapping.mockResolvedValue('name: My mapping')
    api.import_study_table.mockResolvedValue({
      rows: 1,
      created: 1,
      replayed: 0,
      videos: 0,
      reports: 0
    })
  })

  it('requires a saved cohort', async () => {
    const wrapper = mount(StudyTableImport, { props: { cohort: null } })
    await flushPromises()
    expect(wrapper.text()).toContain('gespeicherte Kohorte')
    expect(wrapper.find('#table-upload').exists()).toBe(false)
  })

  it('validates before import and invalidates validation after a selection change', async () => {
    const wrapper = mount(StudyTableImport, { props: { cohort: 9 } })
    await flushPromises()
    await wrapper.get('#table-mapping').setValue('mapping-id')
    await wrapper.get('#table-center').setValue('3')
    const file = new File(['id,first\n1,Erika'], 'table.csv', { type: 'text/csv' })
    const upload = wrapper.get('#table-upload')
    Object.defineProperty(upload.element, 'files', { value: [file] })
    await upload.trigger('change')
    const buttons = wrapper.findAll('button')
    const validate = buttons.find((button) => button.text() === 'Tabelle prüfen')
    const commit = buttons.find((button) => button.text() === 'In Kohorte importieren')
    if (!validate || !commit) throw new Error('Import actions missing')
    expect(commit.attributes('disabled')).toBeDefined()
    await validate.trigger('click')
    await flushPromises()
    expect(api.import_study_table).toHaveBeenLastCalledWith(9, 'mapping-id', 3, file, 'validate')
    expect(commit.attributes('disabled')).toBeUndefined()
    await commit.trigger('click')
    await flushPromises()
    expect(api.import_study_table).toHaveBeenLastCalledWith(9, 'mapping-id', 3, file, 'import')
    expect(wrapper.emitted('imported')).toHaveLength(1)
    await validate.trigger('click')
    await flushPromises()
    await wrapper.setProps({ cohort: 10 })
    expect(commit.attributes('disabled')).toBeDefined()
  })

  it('creates a reusable YAML mapping through the API', async () => {
    api.save_table_mapping.mockResolvedValue({ id: 'mapping-id', name: 'My mapping' })
    const wrapper = mount(StudyTableImport, { props: { cohort: 9 } })
    await flushPromises()
    await wrapper.get('#mapping-yaml').setValue('name: My mapping')
    const save = wrapper.findAll('button').find((button) => button.text() === 'Zuordnung speichern')
    if (!save) throw new Error('Save action missing')
    await save.trigger('click')
    await flushPromises()
    expect(api.save_table_mapping).toHaveBeenCalledWith('name: My mapping')
    expect((wrapper.get('#table-mapping').element as HTMLSelectElement).value).toBe('mapping-id')
  })

  it('starts a new mapping from the server template', async () => {
    const wrapper = mount(StudyTableImport, { props: { cohort: 9 } })
    await flushPromises()
    const button = wrapper
      .findAll('button')
      .find((item) => item.text() === 'Neue Zuordnung aus Vorlage')
    if (!button) throw new Error('Template action missing')
    await button.trigger('click')
    await flushPromises()
    expect((wrapper.get('#mapping-yaml').element as HTMLTextAreaElement).value).toBe(
      'name: Neue Zuordnung'
    )
    expect((wrapper.get('#table-mapping').element as HTMLSelectElement).value).toBe('')
  })
})
