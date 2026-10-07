import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StorageMonitor from '../StorageMonitor.vue'
const { fetch_inventory, delete_entry } = vi.hoisted(() => ({
  fetch_inventory: vi.fn(),
  delete_entry: vi.fn()
}))
vi.mock('@/api/storageMonitor', () => ({ fetch_inventory, delete_entry }))
vi.mock('@/components/Anonymizer/OverviewStorageSummary.vue', () => ({
  default: { template: '<div>Speicherplatz</div>' }
}))
const entry = {
  id: 'file:import/report.txt',
  kind: 'artifact',
  name: 'report.txt',
  status: 'ohne Datenbankzuordnung',
  path: 'import/report.txt',
  size: 1024,
  modified: '',
  owners: [],
  details: {},
  token: 'signed',
  blocker: ''
}
beforeEach(() => {
  vi.resetAllMocks()
  fetch_inventory.mockResolvedValue({
    items: [entry],
    total: 1,
    bytes: 1024,
    states: [entry.status],
    administrator: true
  })
  delete_entry.mockResolvedValue(undefined)
})
function button(wrapper: VueWrapper, text: string) {
  const found = wrapper.findAll('button').find((entry) => entry.text().includes(text))
  if (!found) throw new Error(`Missing button: ${text}`)
  return found
}
describe('storage monitor', () => {
  it('shows unindexed files and requires explicit confirmation before deletion', async () => {
    const wrapper = mount(StorageMonitor)
    await flushPromises()
    expect(wrapper.text()).toContain('ohne Datenbankzuordnung')
    expect(wrapper.text()).toContain('1 KiB')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await button(wrapper, 'Auswahl löschen').trigger('click')
    expect(delete_entry).not.toHaveBeenCalled()
    expect(wrapper.get('[role="dialog"]').text()).toContain('report.txt')
    await button(wrapper, 'Endgültig löschen').trigger('click')
    await flushPromises()
    expect(delete_entry).toHaveBeenCalledWith('signed')
    expect(wrapper.text()).toContain('1 Löschaktionen erfolgreich')
    wrapper.unmount()
  })
  it('retains visible failure feedback after rejected deletion', async () => {
    delete_entry.mockRejectedValue(new Error('changed'))
    const wrapper = mount(StorageMonitor)
    await flushPromises()
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await button(wrapper, 'Auswahl löschen').trigger('click')
    await button(wrapper, 'Endgültig löschen').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Nicht gelöscht: report.txt')
    wrapper.unmount()
  })
  it('does not expose deletion to monitoring-only users', async () => {
    fetch_inventory.mockResolvedValue({
      items: [{ ...entry, token: '' }],
      total: 1,
      bytes: 1024,
      states: [],
      administrator: false
    })
    const wrapper = mount(StorageMonitor)
    await flushPromises()
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Auswahl löschen')
    wrapper.unmount()
  })
  it('clears stale entries when inventory refresh fails', async () => {
    const wrapper = mount(StorageMonitor)
    await flushPromises()
    fetch_inventory.mockRejectedValue(new Error('unavailable'))
    await button(wrapper, 'Aktualisieren').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('report.txt')
    expect(wrapper.get('[role="alert"]').text()).toContain('nicht vollständig')
    wrapper.unmount()
  })
})
