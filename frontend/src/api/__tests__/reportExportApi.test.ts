import { beforeEach, describe, expect, it, vi } from 'vitest'

import { endpoints } from '@/types/api/endpoints'

const hoisted = vi.hoisted(() => ({
  post: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: { post: hoisted.post },
  r: (path: string) => `/api/${path}`
}))

import { makeReport } from '@/api/reportExportApi'

describe('reportExportApi.makeReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the exact finalized-report request and returns persisted artifacts', async () => {
    // Arrange
    const payload = {
      patientExaminationId: 17,
      reportId: 88,
      knowledgeBaseModule: 'clinical_reporting',
      knowledgeBaseVersion: '2.0.0',
      patient: { firstName: 'Ada', lastName: 'Lovelace', dob: '1815-12-10' },
      maxFrames: 12
    }
    const response = {
      report: { id: 88, status: 'final', version: 4 },
      warnings: ['One frame was omitted.'],
      includedFrameCount: 2,
      persistedReportArtifactId: 101,
      persistedPdfArtifactId: 202,
      persistedArtifacts: {
        fullReportId: 101,
        pdfId: 202,
        pdfViewUrl: '/api/media/pdfs/202/stream/?type=processed',
        pdfDownloadUrl: '/api/media/pdfs/202/stream/?type=raw&download=1',
        patientTimelineUrl: '/api/media/patients/9/timeline/'
      }
    }
    hoisted.post.mockResolvedValue({ data: response })

    // Act
    const result = await makeReport(payload)

    // Assert
    expect(hoisted.post).toHaveBeenCalledOnce()
    expect(hoisted.post).toHaveBeenCalledWith(
      `/api/${endpoints.report.makeReport}`,
      payload
    )
    expect(result).toEqual(response)
  })

  it('does not hide a backend finalization failure', async () => {
    // Arrange
    const failure = new Error('artifact transaction rolled back')
    hoisted.post.mockRejectedValue(failure)

    // Act
    const operation = makeReport({
      patientExaminationId: 17,
      knowledgeBaseModule: 'clinical_reporting',
      knowledgeBaseVersion: '2.0.0',
      patient: { firstName: 'Ada', lastName: 'Lovelace', dob: '1815-12-10' }
    })

    // Assert
    await expect(operation).rejects.toBe(failure)
    expect(hoisted.post).toHaveBeenCalledOnce()
  })
})
