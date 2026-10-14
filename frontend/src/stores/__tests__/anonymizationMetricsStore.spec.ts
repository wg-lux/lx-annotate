import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  buildDefaultAnonymizationMetricsFilters,
  useAnonymizationMetricsStore
} from '@/stores/anonymizationMetricsStore'
import { fetchAnonymizationMetrics } from '@/api/anonymizationMetricsApi'
import type { AnonymizationMetricsResponse } from '@/api/anonymizationMetricsApi'

const hoisted = vi.hoisted(() => ({
  fetchAnonymizationMetrics: vi.fn()
}))

vi.mock('@/api/anonymizationMetricsApi', () => ({
  fetchAnonymizationMetrics: hoisted.fetchAnonymizationMetrics
}))

const emptyMetrics: AnonymizationMetricsResponse = {
  schemaVersion: '1',
  filters: {},
  workflow: {
    pendingValidation: 0,
    validated: 0,
    failedLost: 0,
    medianTimeToValidationSeconds: null,
    totalsByAnonymizationStatus: {},
    totalsByValidationStatus: {}
  },
  fieldQuality: [],
  phiRegions: {
    proposalCount: 0,
    humanAnnotationCount: 0,
    matchedCount: 0,
    precision: null,
    recall: null
  }
}

describe('anonymizationMetricsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-19T12:00:00Z'))
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses a last-30-days default filter range', () => {
    expect(buildDefaultAnonymizationMetricsFilters()).toMatchObject({
      dateFrom: '2026-04-19',
      dateTo: '2026-05-19',
      mediaType: 'all'
    })
  })

  it('fetches and stores metrics successfully', async () => {
    hoisted.fetchAnonymizationMetrics.mockResolvedValue(emptyMetrics)

    const store = useAnonymizationMetricsStore()
    const result = await store.fetchMetrics()

    expect(result).toEqual(emptyMetrics)
    expect(store.data).toEqual(emptyMetrics)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.lastUpdated).toEqual(new Date('2026-05-19T12:00:00Z'))
    expect(vi.mocked(fetchAnonymizationMetrics)).toHaveBeenCalledWith(store.filters)
  })

  it('clears data and stores a backend error message when fetch fails', async () => {
    hoisted.fetchAnonymizationMetrics.mockRejectedValue({
      response: {
        data: {
          detail: 'metrics unavailable'
        }
      }
    })

    const store = useAnonymizationMetricsStore()
    store.data = emptyMetrics
    const result = await store.fetchMetrics()

    expect(result).toBeNull()
    expect(store.data).toBeNull()
    expect(store.error).toBe('metrics unavailable')
    expect(store.loading).toBe(false)
  })

  it('updates filters before fetching', async () => {
    hoisted.fetchAnonymizationMetrics.mockResolvedValue(emptyMetrics)

    const store = useAnonymizationMetricsStore()
    await store.updateFilters({
      mediaType: 'video',
      sourceSystem: 'watcher'
    })

    expect(store.filters).toMatchObject({
      mediaType: 'video',
      sourceSystem: 'watcher'
    })
    expect(vi.mocked(fetchAnonymizationMetrics)).toHaveBeenCalledWith(store.filters)
  })

  it('resets filters without mutating loaded data', () => {
    const store = useAnonymizationMetricsStore()
    store.data = emptyMetrics
    store.filters = {
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      mediaType: 'pdf',
      centerId: 5,
      documentType: 'report_final',
      sourceSystem: 'manual'
    }

    store.resetFilters()

    expect(store.filters).toMatchObject({
      dateFrom: '2026-04-19',
      dateTo: '2026-05-19',
      mediaType: 'all'
    })
    expect(store.data).toEqual(emptyMetrics)
  })
})
