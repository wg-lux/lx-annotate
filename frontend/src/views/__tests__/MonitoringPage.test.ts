import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { AxiosError, type AxiosResponse } from 'axios'
import { fetchMonitoringSnapshot, type MonitoringSnapshot } from '@/api/monitoringApi'
import { useMonitoringStore } from '@/stores/monitoring'
import { enterMonitoringRoute } from '@/router/monitoring'
import MonitoringPage from '../MonitoringPage.vue'

vi.mock('@/api/monitoringApi', () => ({ fetchMonitoringSnapshot: vi.fn() }))
enableAutoUnmount(afterEach)

const snapshot: MonitoringSnapshot = {
  schemaVersion: 1,
  status: 'warning',
  version: '1.2.3',
  observedAt: '2026-09-09T10:00:00Z',
  checks: [
    {
      key: 'database.connectivity',
      status: 'ok',
      summary: 'Database query succeeded.',
      detail: null,
      observedAt: '2026-09-09T10:00:00Z',
      metadata: {}
    },
    {
      key: 'storage.media',
      status: 'warning',
      summary: 'Disk space is low.',
      detail: 'Operator attention required.',
      observedAt: '2026-09-09T10:00:00Z',
      metadata: { freePercent: 8 }
    },
    {
      key: 'services.web',
      status: 'unknown',
      summary: 'Service state unavailable.',
      detail: null,
      observedAt: '2026-09-09T10:00:00Z',
      metadata: {}
    }
  ]
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('runtime monitoring', () => {
  it('renders explicit backend states, diagnostics, version and snapshot time', async () => {
    vi.mocked(fetchMonitoringSnapshot).mockResolvedValue(snapshot)
    const wrapper = mount(MonitoringPage)
    await flushPromises()
    expect(wrapper.get('[data-test="overall-status"]').text()).toBe('Warning')
    for (const text of [
      'Healthy',
      'Warning',
      'Unknown',
      '1.2.3',
      'Operator attention required.',
      'Database and migrations',
      'Storage and disk'
    ])
      expect(wrapper.text()).toContain(text)
    expect(wrapper.get('time').attributes('datetime')).toBe(snapshot.observedAt)
    expect(wrapper.get('details').attributes('open')).toBeUndefined()
  })

  it('clears a previous snapshot if manual refresh fails', async () => {
    vi.mocked(fetchMonitoringSnapshot)
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error('private backend failure'))
    const wrapper = mount(MonitoringPage)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="overall-status"]').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('health is unknown')
    expect(wrapper.text()).not.toContain('private backend failure')
  })

  it.each([401, 403])(
    'denies routing on HTTP %i without trusting frontend roles',
    async (status) => {
      vi.mocked(fetchMonitoringSnapshot).mockRejectedValue(
        new AxiosError('Denied', undefined, undefined, undefined, { status } as AxiosResponse)
      )
      expect(await enterMonitoringRoute()).toEqual({
        path: '/administration',
        query: { denied: '1' }
      })
      expect(useMonitoringStore().snapshot).toBeNull()
    }
  )

  it('permits authorized routing and shows unavailable diagnostics after server failure', async () => {
    vi.mocked(fetchMonitoringSnapshot)
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error('unavailable'))
    expect(await enterMonitoringRoute()).toBe(true)
    expect(useMonitoringStore().snapshot).toEqual(snapshot)
    expect(await enterMonitoringRoute()).toBe(true)
    expect(useMonitoringStore().snapshot).toBeNull()
    expect(useMonitoringStore().error).toContain('unknown')
  })

  it('discards late responses after leaving the page', async () => {
    let complete: ((value: MonitoringSnapshot) => void) | undefined
    vi.mocked(fetchMonitoringSnapshot).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve
        })
    )
    const wrapper = mount(MonitoringPage)
    wrapper.unmount()
    complete?.(snapshot)
    await flushPromises()
    expect(useMonitoringStore().snapshot).toBeNull()
    expect(useMonitoringStore().loading).toBe(false)
  })
})
