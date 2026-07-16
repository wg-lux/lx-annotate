import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildAnonymizationMetricsQueryParams,
  fetchAnonymizationMetrics
} from '@/api/anonymizationMetricsApi'
import axiosInstance from '@/api/axiosInstance'

const hoisted = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get
  },
  r: (path: string) => `api/${path}`
}))

describe('anonymizationMetricsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts frontend filter names to backend snake_case query params', () => {
    expect(
      buildAnonymizationMetricsQueryParams({
        dateFrom: '2026-04-19',
        dateTo: '2026-05-19',
        mediaType: 'video',
        centerId: 7,
        documentType: 'report_final',
        sourceSystem: 'watcher'
      })
    ).toEqual({
      date_from: '2026-04-19',
      date_to: '2026-05-19',
      media_type: 'video',
      center_id: 7,
      document_type: 'report_final',
      source_system: 'watcher'
    })
  })

  it('omits empty filters and all-media from query params', () => {
    expect(
      buildAnonymizationMetricsQueryParams({
        dateFrom: '',
        mediaType: 'all',
        centerId: '',
        documentType: undefined,
        sourceSystem: null as any
      })
    ).toEqual({})
  })

  it('fetches metrics through the endoreg API endpoint and stores only whitelisted aggregates', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        schema_version: '1',
        filters: {
          date_from: '2026-04-19',
          date_to: '2026-05-19'
        },
        workflow: {
          pending_validation: 3,
          validated: 9,
          failed_lost: 1,
          median_time_to_validation_seconds: 7200,
          totals_by_anonymization_status: {
            done_processing_anonymization: 3,
            validated: 9
          },
          totals_by_validation_status: {
            pending: 3,
            validated: 9
          }
        },
        field_quality: [
          {
            field_name: 'patient_first_name',
            support: 8,
            changed_rate: 0.25,
            exact_match_rate: 0.75,
            mean_similarity: 0.9,
            missing_after_validation_count: 0,
            raw_text: 'Max Mustermann'
          }
        ],
        phi_regions: {
          proposal_count: 12,
          human_annotation_count: 10,
          matched_count: 8,
          precision: null,
          recall: null
        },
        raw_text: 'Max Mustermann',
        source_path: '/raw/study.pdf'
      }
    })

    const result = await fetchAnonymizationMetrics({
      dateFrom: '2026-04-19',
      dateTo: '2026-05-19',
      mediaType: 'pdf'
    })

    expect(vi.mocked(axiosInstance.get)).toHaveBeenCalledWith(
      'api/media/anonymization/metrics/',
      {
        params: {
          date_from: '2026-04-19',
          date_to: '2026-05-19',
          media_type: 'pdf'
        }
      }
    )
    expect(result.workflow.pendingValidation).toBe(3)
    expect(result.fieldQuality[0]).toEqual({
      fieldName: 'patient_first_name',
      support: 8,
      changedRate: 0.25,
      exactMatchRate: 0.75,
      meanSimilarity: 0.9,
      missingAfterValidationCount: 0
    })
    expect((result as any).rawText).toBeUndefined()
    expect((result.fieldQuality[0] as any).rawText).toBeUndefined()
  })
})
