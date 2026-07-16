import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'

import AnonymizationMetricsComponent from '../AnonymizationMetricsComponent.vue'

const hoisted = vi.hoisted(() => ({
  storeRef: { current: null as any }
}))

vi.mock('@/stores/anonymizationMetricsStore', () => ({
  useAnonymizationMetricsStore: () => hoisted.storeRef.current
}))

function buildStore(overrides: Record<string, unknown> = {}) {
  return reactive({
    loading: false,
    error: null,
    lastUpdated: new Date('2026-05-19T12:00:00Z'),
    filters: {
      dateFrom: '2026-04-19',
      dateTo: '2026-05-19',
      mediaType: 'all',
      centerId: '',
      documentType: '',
      sourceSystem: ''
    },
    data: {
      schemaVersion: '1',
      filters: {},
      workflow: {
        pendingValidation: 3,
        validated: 9,
        failedLost: 1,
        medianTimeToValidationSeconds: 7200,
        totalsByAnonymizationStatus: {
          done_processing_anonymization: 3,
          validated: 9
        },
        totalsByValidationStatus: {
          pending: 3,
          validated: 9
        }
      },
      fieldQuality: [
        {
          fieldName: 'patient_first_name',
          support: 8,
          changedRate: 0.25,
          exactMatchRate: 0.75,
          meanSimilarity: 0.9,
          missingAfterValidationCount: 0
        }
      ],
      phiRegions: {
        proposalCount: 12,
        humanAnnotationCount: 0,
        matchedCount: 0,
        precision: null,
        recall: null
      },
      rawText: 'Max Mustermann',
      sourcePath: '/raw/study-report.pdf'
    },
    fetchMetrics: vi.fn().mockResolvedValue(undefined),
    updateFilters: vi.fn().mockResolvedValue(undefined),
    resetFilters: vi.fn(),
    ...overrides
  })
}

describe('AnonymizationMetricsComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.storeRef.current = buildStore()
  })

  it('renders workflow summary cards', async () => {
    const wrapper = mount(AnonymizationMetricsComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Wartet auf Validierung')
    expect(wrapper.text()).toContain('Validiert')
    expect(wrapper.text()).toContain('Fehler / LOST')
    expect(wrapper.text()).toContain('2 h')
  })

  it('renders field quality rows', async () => {
    const wrapper = mount(AnonymizationMetricsComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Feldqualität')
    expect(wrapper.text()).toContain('Vorname')
    expect(wrapper.text()).toContain('25')
    expect(wrapper.text()).toContain('75')
    expect(wrapper.text()).toContain('90')
  })

  it('shows null PHI precision and recall as insufficient human annotation state', async () => {
    const wrapper = mount(AnonymizationMetricsComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('Precision')
    expect(wrapper.text()).toContain('Recall')
    expect(wrapper.text()).toContain('Nicht genug Human-Annotationen')
  })

  it('does not render raw PHI or path-like extra fields from the metrics payload', async () => {
    const wrapper = mount(AnonymizationMetricsComponent)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Max Mustermann')
    expect(wrapper.text()).not.toContain('/raw/study-report.pdf')
  })
})
