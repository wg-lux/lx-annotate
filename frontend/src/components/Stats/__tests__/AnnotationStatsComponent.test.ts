import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnnotationStatsComponent from '../AnnotationStatsComponent.vue'
import { useAnnotationStatsStore, type UnifiedAnnotationStats } from '@/stores/annotationStats'

const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => router
}))

function statsFixture(overrides: Partial<UnifiedAnnotationStats> = {}): UnifiedAnnotationStats {
  return {
    segmentPending: 0,
    segmentInProgress: 0,
    segmentCompleted: 0,
    examinationPending: 0,
    examinationInProgress: 0,
    examinationCompleted: 0,
    sensitiveMetaPending: 0,
    sensitiveMetaInProgress: 0,
    sensitiveMetaCompleted: 0,
    totalPending: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    totalAnnotations: 0,
    ...overrides
  }
}

describe('AnnotationStatsComponent failure presentation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    router.push.mockResolvedValue(undefined)
  })

  it('does not render zero counters as current after the initial load fails', async () => {
    const store = useAnnotationStatsStore()
    store.$patch({
      stats: statsFixture(),
      error: 'Statistics request failed',
      lastUpdated: null,
      loading: false
    })
    vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)

    const wrapper = mount(AnnotationStatsComponent)
    await flushPromises()

    expect(wrapper.get('[data-test="annotation-stats-unavailable"]').text()).toContain(
      'Statistiken sind derzeit nicht verfügbar'
    )
    expect(wrapper.find('.annotation-type-card').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Alles sieht gut aus')
  })

  it('marks preserved values as stale after a refresh fails', async () => {
    const store = useAnnotationStatsStore()
    store.$patch({
      stats: statsFixture({
        segmentPending: 3,
        totalPending: 3,
        totalAnnotations: 3
      }),
      error: 'Refresh failed',
      lastUpdated: new Date(Date.now() - 60_000),
      loading: false
    })
    vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)

    const wrapper = mount(AnnotationStatsComponent)
    await flushPromises()

    expect(wrapper.get('[data-test="annotation-stats-stale"]').text()).toContain(
      'letzte erfolgreiche Stand'
    )
    expect(wrapper.find('[data-test="annotation-stats-unavailable"]').exists()).toBe(false)
    expect(wrapper.get('.overall-status-item.pending strong').text()).toBe('3')
  })

  it('surfaces navigation failures instead of leaving a rejected promise unhandled', async () => {
    const store = useAnnotationStatsStore()
    vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)
    router.push.mockRejectedValueOnce(new Error('Router unavailable'))

    const wrapper = mount(AnnotationStatsComponent)
    await flushPromises()
    await wrapper.findAll('.quick-action-item')[0].trigger('click')
    await flushPromises()

    expect(router.push).toHaveBeenCalledWith('/frame-annotation')
    expect(wrapper.get('[data-test="annotation-stats-navigation-error"]').text()).toContain(
      'konnte nicht geöffnet werden'
    )
  })
})
