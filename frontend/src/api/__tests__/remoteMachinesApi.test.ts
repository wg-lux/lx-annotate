import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRemoteMachines, parseRemoteMachineRegistry } from '../remoteMachinesApi'

const transport = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: transport,
  r: (path: string) => `/endoreg-api/${path}`,
  silentRequestConfig: <T extends object>(config: T) => ({ ...config, suppressErrorToast: true })
}))

const hub = {
  key: 'gs-02',
  displayName: 'gs-02 central hub',
  baseUrl: 'https://gs-02.intern',
  deploymentRole: 'central_hub'
}

describe('parseRemoteMachineRegistry', () => {
  it('accepts configured https origins', () => {
    expect(parseRemoteMachineRegistry({ deploymentRole: 'site_node', machines: [hub] })).toEqual({
      deploymentRole: 'site_node',
      machines: [hub]
    })
  })

  it.each([
    'http://gs-02.intern',
    'https://gs-02.intern/',
    'https://gs-02.intern/admin',
    'javascript:alert(1)',
    42
  ])('rejects non-origin base url %s', (baseUrl) => {
    expect(() =>
      parseRemoteMachineRegistry({
        deploymentRole: 'site_node',
        machines: [{ ...hub, baseUrl }]
      })
    ).toThrow('Die Rechnerliste ist ungültig.')
  })

  it('rejects unknown deployment roles', () => {
    expect(() =>
      parseRemoteMachineRegistry({ deploymentRole: 'laptop', machines: [] })
    ).toThrow('Die Rechnerliste ist ungültig.')
    expect(() =>
      parseRemoteMachineRegistry({
        deploymentRole: 'site_node',
        machines: [{ ...hub, deploymentRole: 'laptop' }]
      })
    ).toThrow('Die Rechnerliste ist ungültig.')
  })
})

describe('fetchRemoteMachines', () => {
  beforeEach(() => transport.get.mockReset())

  it('requests the local registry route silently', async () => {
    transport.get.mockResolvedValue({ data: { deploymentRole: 'central_hub', machines: [] } })
    const signal = new AbortController().signal

    await expect(fetchRemoteMachines(signal)).resolves.toEqual({
      deploymentRole: 'central_hub',
      machines: []
    })
    expect(transport.get).toHaveBeenCalledWith('/endoreg-api/runtime/remote-machines/', {
      signal,
      timeout: 15_000,
      suppressErrorToast: true
    })
  })
})
