import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { reactive } from 'vue'
import { routeLocationKey } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SidebarComponent from '../SidebarComponent.vue'

const { get, logError } = vi.hoisted(() => ({ get: vi.fn(), logError: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({ default: { get }, r: (path: string) => path }))
vi.mock('@/utils/runtimeLogger', () => ({ createRuntimeLogger: () => ({ error: logError }) }))

function mountSidebar(path = '/') {
  const route = reactive({ path })
  const wrapper = mount(SidebarComponent, {
    global: {
      provide: { [routeLocationKey]: route },
      stubs: { RouterLink: RouterLinkStub },
      directives: { can: () => {} }
    }
  })
  return { wrapper, route }
}

describe('Sidebar workflow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    sessionStorage.clear()
    get.mockResolvedValue({ data: [] })
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('counts only the existing pending and processing statuses from overview responses', async () => {
    get.mockResolvedValue({
      data: [
        { anonymizationStatus: 'done_processing_anonymization' },
        { anonymizationStatus: 'done_processing_anonymization', annotationStatus: 'pending' },
        { anonymizationStatus: 'done_processing_anonymization', annotationStatus: 'validated' },
        { anonymizationStatus: 'processing_anonymization' },
        { anonymizationStatus: 'extracting_frames' },
        { anonymizationStatus: 'predicting_segments' },
        { anonymizationStatus: 'validated' },
        { anonymizationStatus: 1 },
        null,
        'invalid',
        {}
      ]
    })
    const { wrapper } = mountSidebar()
    await flushPromises()
    expect(get).toHaveBeenCalledWith('anonymization/items/overview/')
    expect(wrapper.get('.workflow-badge-processing').text()).toBe('3')
    expect(wrapper.get('.workflow-badge:not(.workflow-badge-processing)').text()).toBe('2')
    wrapper.unmount()
  })

  it('refreshes every 30 seconds, preserves counts on failure and resets for non-array responses', async () => {
    get.mockResolvedValueOnce({ data: [{ anonymizationStatus: 'extracting_frames' }] })
    const { wrapper } = mountSidebar()
    await flushPromises()
    const failure = new Error('Unavailable')
    get.mockRejectedValueOnce(failure)
    await vi.advanceTimersByTimeAsync(29999)
    expect(get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.get('.workflow-badge-processing').text()).toBe('1')
    expect(logError).toHaveBeenCalledWith('workflow-count-refresh-failed', failure)
    get.mockResolvedValueOnce({ data: { results: [] } })
    await vi.advanceTimersByTimeAsync(30000)
    expect(wrapper.find('.workflow-badge').exists()).toBe(false)
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(60000)
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('clears polling even when unmounted before the first response', async () => {
    let resolveResponse: ((value: { data: unknown }) => void) | undefined
    get.mockReturnValueOnce(
      new Promise<{ data: unknown }>((resolve) => {
        resolveResponse = resolve
      })
    )
    const { wrapper } = mountSidebar()
    wrapper.unmount()
    resolveResponse?.({ data: [{ anonymizationStatus: 'extracting_frames' }] })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(60000)
    expect(get).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('updates active route groups after navigation', async () => {
    const { wrapper, route } = mountSidebar('/anonymisierung/uebersicht')
    await flushPromises()
    const activeTexts = () => wrapper.findAll('.nav-link.active').map((link) => link.text())
    expect(activeTexts()).toEqual(['1. Videoübersicht - Anonymisierung starten'])
    route.path = '/reporting/case-setup'
    await flushPromises()
    expect(activeTexts()).toEqual(['3. Dokumentation starten', 'Dokumentation: Übersicht'])
    wrapper.unmount()
  })

  it.each(['video', 'pdf'])(
    'restores the last %s validation target from session storage',
    async (scope) => {
      sessionStorage.setItem('last:fileId', '42')
      sessionStorage.setItem('last:scope', scope)
      const { wrapper } = mountSidebar()
      await flushPromises()
      const link = wrapper
        .findAllComponents(RouterLinkStub)
        .find((candidate) => candidate.text().includes('Validierung fortsetzen'))
      expect(link?.props('to')).toEqual({
        path: '/anonymisierung/validierung',
        query: { fileId: '42', mediaType: scope }
      })
      wrapper.unmount()
    }
  )
})
