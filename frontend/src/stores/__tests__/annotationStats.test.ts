import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'

import { useAnnotationStatsStore } from '@/stores/annotationStats'

vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('annotationStatsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('aggregates segment, examination, and sensitive-metadata responses', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.includes('segments/stats')) {
        return { data: { total_segments: 4 } }
      }
      if (url.includes('patient-examinations/list')) {
        return {
          data: {
            results: [
              { status: 'pending' },
              { status: 'draft' },
              { status: 'in_progress' },
              { status: 'completed' },
              { status: 'unexpected' }
            ]
          }
        }
      }
      if (url.includes('sensitive-metadata')) {
        return {
          data: {
            results: [
              { dob_verified: true, names_verified: true },
              { dob_verified: true, names_verified: false },
              { dob_verified: false, names_verified: true }
            ]
          }
        }
      }
      throw new Error(`Unexpected annotation stats URL: ${url}`)
    })
    const store = useAnnotationStatsStore()

    await store.fetchAnnotationStats()

    expect(store.stats).toMatchObject({
      segmentPending: 4,
      examinationPending: 3,
      examinationInProgress: 1,
      examinationCompleted: 1,
      sensitiveMetaPending: 2,
      sensitiveMetaCompleted: 1,
      totalPending: 9,
      totalInProgress: 1,
      totalCompleted: 2,
      totalAnnotations: 12
    })
    expect(store.pendingPercentage).toBe(75)
    expect(store.inProgressPercentage).toBe(8)
    expect(store.completionPercentage).toBe(17)
    expect(store.loading).toBe(false)
    expect(store.lastUpdated).toBeInstanceOf(Date)
    expect(vi.mocked(axios.get)).toHaveBeenCalledTimes(3)
  })

  it('moves counts between statuses without allowing negative values', () => {
    const store = useAnnotationStatsStore()
    store.stats.segmentPending = 1
    store.calculateTotals()

    store.updateAnnotationStatus('segment', 'pending', 'completed')
    store.updateAnnotationStatus('segment', 'pending', 'completed')

    expect(store.stats.segmentPending).toBe(0)
    expect(store.stats.segmentCompleted).toBe(2)
    expect(store.stats.totalPending).toBe(0)
    expect(store.stats.totalCompleted).toBe(2)
    expect(store.annotationBreakdown[0]).toMatchObject({
      type: 'segment',
      pending: 0,
      completed: 2,
      total: 2
    })
  })
})
