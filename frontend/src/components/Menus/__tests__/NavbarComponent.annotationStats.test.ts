import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import NavbarComponent from '../NavbarComponent.vue'
import { useAnnotationStatsStore } from '@/stores/annotationStats'

const fixtures = vi.hoisted(() => ({
  route: { name: 'Dashboard' },
  auth: {
    isAuthenticated: false,
    user: null,
    login: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => fixtures.route
}))

vi.mock('@/stores/auth_kc', () => ({
  useAuthKcStore: () => fixtures.auth
}))

function mountNavbar(props: { isSidebarOpen?: boolean } = {}) {
  return mount(NavbarComponent, {
    props,
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>'
        }
      }
    }
  })
}

describe('NavbarComponent annotation statistics status', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('hides a preserved pending count and surfaces an unavailable state after failure', async () => {
    const store = useAnnotationStatsStore()
    store.stats.totalPending = 7
    store.error = 'Refresh failed'
    vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)

    const wrapper = mountNavbar()
    await flushPromises()

    expect(wrapper.get('[data-test="annotation-stats-unavailable"]').text()).toBe('!')
    expect(wrapper.find('[data-test="annotation-pending-count"]').exists()).toBe(false)
    expect(wrapper.get('.btn-outline-primary').attributes('title')).toBe(
      'Annotationsstatistik ist derzeit nicht verfügbar'
    )
  })

  it('shows the pending count only for a successful idle state', async () => {
    const store = useAnnotationStatsStore()
    store.stats.totalPending = 7
    store.error = null
    store.loading = false
    vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)

    const wrapper = mountNavbar()
    await flushPromises()

    expect(wrapper.get('[data-test="annotation-pending-count"]').text()).toBe('7')
    expect(wrapper.find('[data-test="annotation-stats-unavailable"]').exists()).toBe(false)
  })

  it('stops the periodic refresh when the navbar unmounts', async () => {
    const store = useAnnotationStatsStore()
    vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)

    const wrapper = mountNavbar()
    await flushPromises()

    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not start the periodic refresh when unmounted during the initial fetch', async () => {
    const store = useAnnotationStatsStore()
    let finishFetch: (() => void) | undefined
    vi.spyOn(store, 'fetchAnnotationStats').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishFetch = resolve
        })
    )

    const wrapper = mountNavbar()
    wrapper.unmount()
    finishFetch?.()
    await flushPromises()

    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports the responsive sidebar state and emits the toggle request', async () => {
    const store = useAnnotationStatsStore()
    vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)

    const wrapper = mountNavbar({ isSidebarOpen: true })
    await flushPromises()

    const toggle = wrapper.get('.app-topbar-menu')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(wrapper.emitted('toggleSidebar')).toHaveLength(1)
  })
})
