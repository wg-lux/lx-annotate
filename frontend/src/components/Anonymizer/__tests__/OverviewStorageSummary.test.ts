import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnonymizationStorageCapacity } from '@/api/anonymizationOperations'
import OverviewStorageSummary from '../OverviewStorageSummary.vue'

const { fetchStorage } = vi.hoisted(() => ({
  fetchStorage: vi.fn<(signal?: AbortSignal) => Promise<AnonymizationStorageCapacity>>()
}))

vi.mock('@/api/anonymizationOperations', () => ({
  fetchAnonymizationStorage: fetchStorage
}))

const capacity: AnonymizationStorageCapacity = {
  scope: 'protected_media_filesystem',
  totalBytes: 1024 ** 3 * 100,
  usedBytes: 1024 ** 3 * 70,
  availableBytes: 1024 ** 3 * 25,
  reservedBytes: 1024 ** 3 * 5,
  observedAt: '2026-09-14T09:00:00Z'
}

describe('OverviewStorageSummary', () => {
  beforeEach(() => fetchStorage.mockResolvedValue(capacity))

  it('renders server capacity and reserved space with a timestamp and filesystem scope', async () => {
    const wrapper = mount(OverviewStorageSummary)
    await flushPromises()
    expect(wrapper.text()).toContain('Gesamt: 100 GiB')
    expect(wrapper.text()).toContain('Belegt: 70 GiB')
    expect(wrapper.text()).toContain('Verfügbar: 25 GiB')
    expect(wrapper.text()).toContain('Systemreserviert: 5 GiB')
    expect(wrapper.text()).toContain('einschließlich anderer Dateien')
    expect(wrapper.get('progress').attributes('value')).toBe(String(1024 ** 3 * 75))
    expect(wrapper.get('progress').attributes('max')).toBe(String(capacity.totalBytes))
    expect(wrapper.get('time').attributes('datetime')).toBe(capacity.observedAt)
    wrapper.unmount()
  })

  it('clears stale capacity when refresh fails and allows a retry', async () => {
    const wrapper = mount(OverviewStorageSummary)
    await flushPromises()
    fetchStorage.mockRejectedValueOnce(new Error('unavailable'))
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('progress').exists()).toBe(false)
    expect(wrapper.text()).toContain('konnte nicht abgefragt werden')
    expect(wrapper.text()).not.toContain('100 GiB')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('progress').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows permission denial without manufacturing a zero capacity', async () => {
    const forbidden = new AxiosError('Forbidden')
    forbidden.response = {
      data: {}, status: 403, statusText: 'Forbidden', headers: {},
      config: { headers: new AxiosHeaders() }
    }
    fetchStorage.mockRejectedValueOnce(forbidden)
    const wrapper = mount(OverviewStorageSummary)
    await flushPromises()
    expect(wrapper.text()).toContain('Berechtigung zur Speicherüberwachung')
    expect(wrapper.find('progress').exists()).toBe(false)
    wrapper.unmount()
  })

  it('aborts pending observation on unmount and does not start concurrent refreshes', async () => {
    let resolveRequest: ((response: AnonymizationStorageCapacity) => void) | undefined
    fetchStorage.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve }))
    const wrapper = mount(OverviewStorageSummary)
    await wrapper.get('button').trigger('click')
    expect(fetchStorage).toHaveBeenCalledTimes(1)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    const signal = fetchStorage.mock.calls[0][0]
    wrapper.unmount()
    expect(signal?.aborted).toBe(true)
    resolveRequest?.(capacity)
    await flushPromises()
    expect(fetchStorage).toHaveBeenCalledTimes(1)
  })
})
