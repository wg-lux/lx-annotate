import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnnotationStatsComponent from '../AnnotationStatsComponent.vue'
import { useAnnotationStatsStore } from '@/stores/annotationStats'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => router }))

function mountStatistics() {
  const store = useAnnotationStatsStore()
  store.$patch({ lastUpdated: new Date(), loading: false })
  vi.spyOn(store, 'fetchAnnotationStats').mockResolvedValue(undefined)
  return { store, wrapper: mount(AnnotationStatsComponent) }
}

describe('annotation category presentation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    router.push.mockResolvedValue(undefined)
  })

  it('keeps each category counts, progress and destination together', async () => {
    const { store, wrapper } = mountStatistics()
    store.$patch({
      stats: {
        segmentPending: 2,
        segmentInProgress: 1,
        segmentCompleted: 1,
        examinationPending: 1,
        examinationInProgress: 0,
        examinationCompleted: 3,
        sensitiveMetaPending: 0,
        sensitiveMetaInProgress: 1,
        sensitiveMetaCompleted: 1
      }
    })
    await flushPromises()
    const cards = wrapper.findAll('.annotation-type-card')
    expect(cards.map((card) => card.get('.badge').text())).toEqual(['4', '4', '2'])
    expect(cards.map((card) => card.findAll('.stat-number').map((count) => count.text()))).toEqual([
      ['2', '1', '1'],
      ['1', '0', '3'],
      ['0', '1', '1']
    ])
    expect(cards.map((card) => card.get('.progress-bar').attributes('style'))).toEqual([
      'width: 25%;',
      'width: 75%;',
      'width: 50%;'
    ])
    for (const card of cards) {
      await card.trigger('click')
    }
    expect(router.push.mock.calls).toEqual([
      ['/video-untersuchung'],
      ['/reporting/case-setup'],
      ['/anonymisierung/validierung']
    ])
    wrapper.unmount()
  })

  it('preserves category priority on ties and updates the focus after counts change', async () => {
    const { store, wrapper } = mountStatistics()
    store.$patch({
      stats: {
        segmentPending: 2,
        examinationPending: 2,
        sensitiveMetaPending: 1,
        totalPending: 5,
        totalAnnotations: 5
      }
    })
    await flushPromises()
    expect(wrapper.get('.mission-title').text()).toBe('Video-Segmente klären')
    expect(wrapper.get('.overall-progress-note').text()).toContain('Video-Segmente (2 offen)')
    store.$patch({ stats: { sensitiveMetaPending: 3, totalPending: 7, totalAnnotations: 7 } })
    await flushPromises()
    expect(wrapper.get('.mission-title').text()).toBe('Patientendaten validieren')
    expect(wrapper.get('.overall-progress-note').text()).toContain('Patientendaten (3 offen)')
    store.$patch({
      stats: {
        segmentPending: 0,
        examinationPending: 0,
        sensitiveMetaPending: 0,
        totalPending: 0,
        totalAnnotations: 0
      }
    })
    await flushPromises()
    expect(wrapper.get('.mission-title').text()).toBe('Stabil halten')
    expect(wrapper.get('.overall-progress-note').text()).not.toContain('Nächster Fokus')
    wrapper.unmount()
  })

  it('shows eligible achievements in their established order and removes them on refresh', async () => {
    const { store, wrapper } = mountStatistics()
    store.$patch({
      stats: {
        segmentCompleted: 20,
        examinationCompleted: 10,
        sensitiveMetaCompleted: 10,
        totalCompleted: 40,
        totalAnnotations: 40
      }
    })
    await flushPromises()
    expect(wrapper.findAll('.achievement-badge').map((badge) => badge.text())).toEqual([
      'Erster Abschluss',
      'Konstant geliefert',
      'Halbzeit-Champion',
      'Segment-Profi',
      'Befundungs-Profi',
      'Datenschutz-Held'
    ])
    store.$patch({
      stats: {
        segmentCompleted: 0,
        examinationCompleted: 0,
        sensitiveMetaCompleted: 0,
        totalCompleted: 0,
        totalAnnotations: 0
      }
    })
    await flushPromises()
    expect(wrapper.findAll('.achievement-badge')).toHaveLength(0)
    wrapper.unmount()
  })
})
