import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { reactive } from 'vue'
import { routeLocationKey } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnonymizationValidationDraftStore } from '@/stores/anonymizationValidationDraftStore'
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

  it.each(['video', 'pdf'] as const)(
    'removes the accepted %s target from an already mounted sidebar and session storage',
    async (media_type) => {
      const { wrapper } = mountSidebar()
      const store = useAnonymizationValidationDraftStore()
      const link = wrapper
        .findAllComponents(RouterLinkStub)
        .find((candidate) => candidate.text().includes('Validierung fortsetzen'))
      expect(link?.props('to')).toBe('/anonymisierung/uebersicht')
      store.remember(media_type, 42)
      await flushPromises()
      expect(link?.props('to')).toEqual({
        path: '/anonymisierung/validierung',
        query: { fileId: '42', mediaType: media_type }
      })
      store.clear(media_type, 42)
      await flushPromises()
      expect(link?.props('to')).toBe('/anonymisierung/uebersicht')
      expect(sessionStorage.getItem('last:fileId')).toBeNull()
      expect(sessionStorage.getItem('last:scope')).toBeNull()
      wrapper.unmount()
      const remounted = mountSidebar().wrapper
      expect(
        remounted
          .findAllComponents(RouterLinkStub)
          .find((candidate) => candidate.text().includes('Validierung fortsetzen'))
          ?.props('to')
      ).toBe('/anonymisierung/uebersicht')
      remounted.unmount()
    }
  )

  it.each([
    ['pdf', 43],
    ['video', 42]
  ] as const)(
    'does not clear a different pending target (%s %s) on acceptance',
    async (media_type, file_id) => {
      const { wrapper } = mountSidebar()
      const store = useAnonymizationValidationDraftStore()
      store.remember(media_type, file_id)
      store.clear('pdf', 42)
      await flushPromises()
      const link = wrapper
        .findAllComponents(RouterLinkStub)
        .find((candidate) => candidate.text().includes('Validierung fortsetzen'))
      expect(link?.props('to')).toEqual({
        path: '/anonymisierung/validierung',
        query: { fileId: String(file_id), mediaType: media_type }
      })
      expect(sessionStorage.getItem('last:fileId')).toBe(String(file_id))
      expect(sessionStorage.getItem('last:scope')).toBe(media_type)
      wrapper.unmount()
    }
  )

  it.each([null, '', '0', '-1', 'NaN', '1.5'])(
    'does not resume an invalid stored file ID: %s',
    async (file_id) => {
      if (file_id !== null) sessionStorage.setItem('last:fileId', file_id)
      sessionStorage.setItem('last:scope', 'pdf')
      const { wrapper } = mountSidebar()
      await flushPromises()
      expect(
        wrapper
          .findAllComponents(RouterLinkStub)
          .find((candidate) => candidate.text().includes('Validierung fortsetzen'))
          ?.props('to')
      ).toBe('/anonymisierung/uebersicht')
      wrapper.unmount()
    }
  )

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
