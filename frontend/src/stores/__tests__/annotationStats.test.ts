import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAnnotationStatsStore } from '@/stores/annotationStats'

const hoisted = vi.hoisted(() => ({
  axiosGet: vi.fn()
}))

vi.mock('axios', () => ({
  default: {
    get: hoisted.axiosGet
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  r: (path: string) => `/endoreg-api/${path}`
}))

interface StatsResponseFixtures {
  segment: unknown
  examinations: unknown
  sensitiveMetadata: unknown
  rejectPath?: string
}

function validResponseFixtures(): StatsResponseFixtures {
  return {
    segment: { total_segments: 4 },
    examinations: {
      results: [
        { status: 'pending' },
        { status: 'draft' },
        { status: 'in_progress' },
        { status: 'completed' }
      ]
    },
    sensitiveMetadata: {
      results: [
        { dob_verified: true, names_verified: true },
        { dob_verified: true, names_verified: false },
        { dob_verified: false, names_verified: true }
      ]
    }
  }
}

function mockStatsResponses(overrides: Partial<StatsResponseFixtures> = {}): void {
  const fixtures = { ...validResponseFixtures(), ...overrides }
  hoisted.axiosGet.mockImplementation((url: string) => {
    if (fixtures.rejectPath && url.includes(fixtures.rejectPath)) {
      return Promise.reject(new Error('Statistics service unavailable'))
    }
    if (url.includes('segments/stats')) return Promise.resolve({ data: fixtures.segment })
    if (url.includes('patient-examinations/list')) {
      return Promise.resolve({ data: fixtures.examinations })
    }
    if (url.includes('sensitive-metadata')) {
      return Promise.resolve({ data: fixtures.sensitiveMetadata })
    }
    return Promise.reject(new Error(`Unexpected annotation stats URL: ${url}`))
  })
}

function seedPublishedSnapshot(store: ReturnType<typeof useAnnotationStatsStore>): void {
  store.stats.segmentPending = 9
  store.stats.examinationCompleted = 2
  store.stats.sensitiveMetaPending = 1
  store.calculateTotals()
  store.lastUpdated = new Date('2026-08-01T10:00:00Z')
}

async function expectAtomicFailure(
  store: ReturnType<typeof useAnnotationStatsStore>,
  expectedError: string
): Promise<void> {
  seedPublishedSnapshot(store)
  const previousStats = { ...store.stats }
  const previousLastUpdated = store.lastUpdated

  await store.fetchAnnotationStats()

  expect(store.stats).toEqual(previousStats)
  expect(store.error).toContain(expectedError)
  expect(store.lastUpdated).toBe(previousLastUpdated)
  expect(store.loading).toBe(false)
}

describe('annotationStatsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aggregates segment, examination, and sensitive-metadata responses', async () => {
    mockStatsResponses()
    const store = useAnnotationStatsStore()

    await store.fetchAnnotationStats()

    expect(store.stats).toMatchObject({
      segmentPending: 4,
      examinationPending: 2,
      examinationInProgress: 1,
      examinationCompleted: 1,
      sensitiveMetaPending: 2,
      sensitiveMetaCompleted: 1,
      totalPending: 8,
      totalInProgress: 1,
      totalCompleted: 2,
      totalAnnotations: 11
    })
    expect(store.pendingPercentage).toBe(73)
    expect(store.inProgressPercentage).toBe(9)
    expect(store.completionPercentage).toBe(18)
    expect(store.loading).toBe(false)
    expect(store.lastUpdated).toBeInstanceOf(Date)
    expect(hoisted.axiosGet).toHaveBeenCalledTimes(3)
  })

  it('rejects a malformed segment-statistics envelope atomically', async () => {
    mockStatsResponses({ segment: [] })
    await expectAtomicFailure(
      useAnnotationStatsStore(),
      'Video segment statistics response does not match the expected contract'
    )
  })

  it('rejects a malformed examination-list envelope atomically', async () => {
    mockStatsResponses({ examinations: { items: [] } })
    await expectAtomicFailure(
      useAnnotationStatsStore(),
      'Patient examination list response does not match the expected contract'
    )
  })

  it('rejects a malformed examination row atomically', async () => {
    mockStatsResponses({ examinations: { results: [null] } })
    await expectAtomicFailure(
      useAnnotationStatsStore(),
      'Patient examination list contains an invalid status row'
    )
  })

  it('rejects an unknown examination status instead of counting it as pending', async () => {
    mockStatsResponses({ examinations: { results: [{ status: 'unexpected' }] } })
    await expectAtomicFailure(
      useAnnotationStatsStore(),
      'Patient examination list contains an invalid status row'
    )
  })

  it('rejects malformed sensitive-metadata verification flags atomically', async () => {
    mockStatsResponses({
      sensitiveMetadata: { results: [{ dob_verified: 'yes', names_verified: true }] }
    })
    await expectAtomicFailure(
      useAnnotationStatsStore(),
      'Sensitive metadata list contains an invalid row'
    )
  })

  it('preserves the previous snapshot and exposes network rejection', async () => {
    mockStatsResponses({ rejectPath: 'segments/stats' })
    await expectAtomicFailure(useAnnotationStatsStore(), 'Statistics service unavailable')
  })

  it('keeps lastUpdated null when the initial refresh fails', async () => {
    mockStatsResponses({ rejectPath: 'segments/stats' })
    const store = useAnnotationStatsStore()

    await store.fetchAnnotationStats()

    expect(store.error).toContain('Statistics service unavailable')
    expect(store.lastUpdated).toBeNull()
    expect(store.stats.totalAnnotations).toBe(0)
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
