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
      report: { id: 88, patientExaminationId: 17, status: 'final', version: 4 },
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
    expect(hoisted.post).toHaveBeenCalledWith(`/api/${endpoints.report.makeReport}`, payload)
    expect(result).toEqual(response)
  })

  it.each([
    { report: { id: 89, patientExaminationId: 17, status: 'final', version: 4 } },
    { report: { id: 88, patientExaminationId: 18, status: 'final', version: 4 } },
    { report: { id: 88, status: 'final', version: 4 } },
    { report: { id: 88.5, patientExaminationId: 17, status: 'final', version: 4 } },
    { report: { id: 88, patientExaminationId: 17, status: 'draft', version: 4 } },
    { includedFrameCount: -1 },
    { includedFrameCount: 1, includedFrames: [] },
    { warnings: [false] },
    { persistedArtifacts: { pdfId: 1.5 } },
    { persistedArtifacts: { pdfViewUrl: 'javascript:alert(1)' } },
    { persistedArtifacts: { pdfViewUrl: 'https://untrusted.example/report.pdf' } },
    { persistedArtifacts: { pdfViewUrl: '//untrusted.example/report.pdf' } }
  ])('rejects an invalid export acknowledgement: %j', async (invalid) => {
    hoisted.post.mockResolvedValue({
      data: {
        report: { id: 88, patientExaminationId: 17, status: 'final', version: 4 },
        includedFrameCount: 0,
        ...invalid
      }
    })
    await expect(
      makeReport({
        patientExaminationId: 17,
        reportId: 88,
        knowledgeBaseModule: 'clinical_reporting',
        knowledgeBaseVersion: '2.0.0',
        patient: { firstName: 'Ada', lastName: 'Lovelace', dob: '1815-12-10' }
      })
    ).rejects.toThrow()
  })

  it.each(['exact', 'reordered', 'timestamp', 'missing', 'empty'])(
    'checks that export acknowledges the selected frame list: %s',
    async (mode) => {
      const selectedFrames =
        mode === 'empty'
          ? []
          : [
              { videoId: 7, frameNumber: 0, timestamp: 0 },
              { videoId: 7, frameNumber: 12, timestamp: 0.48 }
            ]
      const includedFrames = selectedFrames.map((frame, index) => ({
        ...frame,
        segmentId: null,
        frameId: index + 1
      }))
      if (mode === 'reordered') includedFrames.reverse()
      if (mode === 'timestamp') includedFrames[0].timestamp = 0.01
      if (mode === 'missing') includedFrames.pop()
      hoisted.post.mockResolvedValue({
        data: {
          report: { id: 88, patientExaminationId: 17, status: 'final', version: 4 },
          includedFrameCount: includedFrames.length,
          includedFrames
        }
      })
      const result = makeReport({
        patientExaminationId: 17,
        reportId: 88,
        selectedFrames,
        knowledgeBaseModule: 'clinical_reporting',
        knowledgeBaseVersion: '2.0.0',
        patient: { firstName: 'Ada', lastName: 'Lovelace', dob: '1815-12-10' }
      })
      if (mode === 'exact' || mode === 'empty') await expect(result).resolves.toBeDefined()
      else await expect(result).rejects.toThrow('selected frames and timestamps')
    }
  )

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
