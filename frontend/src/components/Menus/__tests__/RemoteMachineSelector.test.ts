import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import RemoteMachineSelector from '../RemoteMachineSelector.vue'

const api = vi.hoisted(() => ({ fetchRemoteMachines: vi.fn() }))
vi.mock('@/api/remoteMachinesApi', () => api)

const machines = [
  {
    key: 'local',
    displayName: 'Dieser Rechner',
    baseUrl: window.location.origin,
    deploymentRole: 'site_node'
  },
  {
    key: 'gs-02',
    displayName: 'gs-02 central hub',
    baseUrl: 'https://gs-02.intern',
    deploymentRole: 'central_hub'
  }
]

describe('RemoteMachineSelector', () => {
  const assign = vi.fn()

  beforeEach(() => {
    api.fetchRemoteMachines.mockReset()
    assign.mockReset()
    vi.stubGlobal('location', { origin: window.location.origin, assign })
  })

  afterEach(() => vi.unstubAllGlobals())

  it('renders nothing when no machines are configured', async () => {
    api.fetchRemoteMachines.mockResolvedValue({ deploymentRole: 'standalone', machines: [] })
    const wrapper = mount(RemoteMachineSelector)
    await flushPromises()

    expect(wrapper.find('[data-test="remote-machine-selector"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="remote-machines-unavailable"]').exists()).toBe(false)
  })

  it('preselects the current machine and blocks switching to it', async () => {
    api.fetchRemoteMachines.mockResolvedValue({ deploymentRole: 'site_node', machines })
    const wrapper = mount(RemoteMachineSelector)
    await flushPromises()

    const select = wrapper.get<HTMLSelectElement>('[data-test="remote-machine-select"]')
    expect(select.element.value).toBe('local')
    expect(wrapper.get('[data-test="remote-machine-local-role"]').text()).toBe('Standort')
    expect(
      wrapper.get('[data-test="remote-machine-switch"]').attributes('disabled')
    ).toBeDefined()
  })

  it('navigates the browser to the selected machine origin', async () => {
    api.fetchRemoteMachines.mockResolvedValue({ deploymentRole: 'site_node', machines })
    const wrapper = mount(RemoteMachineSelector)
    await flushPromises()

    await wrapper.get('[data-test="remote-machine-select"]').setValue('gs-02')
    await wrapper.get('[data-test="remote-machine-selector"]').trigger('submit')

    expect(assign).toHaveBeenCalledWith('https://gs-02.intern/')
  })

  it('shows an unavailable marker when the registry cannot be loaded', async () => {
    api.fetchRemoteMachines.mockRejectedValue(new Error('offline'))
    const wrapper = mount(RemoteMachineSelector)
    await flushPromises()

    expect(wrapper.find('[data-test="remote-machines-unavailable"]').exists()).toBe(true)
    expect(assign).not.toHaveBeenCalled()
  })
})
