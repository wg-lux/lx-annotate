import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  r: (path: string) => `/endoreg/${path}`
}))

import { buildStudyCohortPreviewQuery, fetchStudyCohortPreview } from '@/api/studyApi'

describe('studyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps camelCase filters to the cohort preview query contract without dropping false', () => {
    expect(
      buildStudyCohortPreviewQuery({
        dateFrom: '2026-01-01',
        dateTo: '2026-06-30',
        centerKey: ' center-a ',
        examinationName: 'colonoscopy',
        documentType: 'endoscopy-report',
        finding: 'polyp',
        annotationLabel: 'adenoma',
        hasReport: true,
        hasVideo: false,
        limit: 75.9
      })
    ).toEqual({
      date_from: '2026-01-01',
      date_to: '2026-06-30',
      center_key: 'center-a',
      examination_name: 'colonoscopy',
      document_type: 'endoscopy-report',
      finding: 'polyp',
      annotation_label: 'adenoma',
      has_report: true,
      has_video: false,
      limit: 75
    })
  })

  it('returns the axios-normalized camelCase cohort response', async () => {
    const payload = {
      schemaVersion: '1.0',
      filters: { hasReport: true },
      summary: { caseCount: 1, patientCount: 1, reportCount: 1, videoCount: 1 },
      cases: [
        {
          patientExaminationId: 314,
          caseHash: 'case-abc',
          patientHash: 'patient-xyz',
          examinationName: 'colonoscopy',
          examinationDate: '2026-04-01',
          centerKeys: ['center-a'],
          findings: ['polyp'],
          annotationLabels: ['adenoma'],
          reports: [
            {
              id: 73,
              documentType: 'endoscopy-report',
              streamUrl: '/processed/report/73',
              availability: 'LOCAL'
            }
          ],
          videos: [{ id: 81, streamUrl: '/processed/video/81', availability: 'HUB_ONLY' }]
        }
      ],
      options: {
        centers: [{ key: 'center-a', label: 'Center A' }],
        examinations: ['colonoscopy'],
        documentTypes: ['endoscopy-report'],
        findings: ['polyp'],
        annotationLabels: ['adenoma']
      }
    }
    hoisted.axios.get.mockResolvedValue({ data: payload })

    const response = await fetchStudyCohortPreview({ hasReport: true, limit: 100 })

    expect(hoisted.axios.get).toHaveBeenCalledWith('/endoreg/media/studies/cohort-preview/', {
      params: { has_report: true, limit: 100 }
    })
    expect(response).toBe(payload)
    expect(response.cases[0].patientExaminationId).toBe(314)
  })
})
