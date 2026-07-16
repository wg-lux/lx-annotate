import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  endoregApi: (path: string) => `/endoreg/${path}`
}))

import {
  pollUploadStatus,
  resolveUploadedReportId,
  uploadFiles,
  type UploadStatusResponse
} from '@/api/upload'

describe('upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploads browser-managed multipart data with machine metadata', async () => {
    hoisted.axios.post.mockResolvedValue({
      data: { uploadId: 'upload-1', statusUrl: '/status/upload-1' }
    })
    const file = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' })

    const response = await uploadFiles([file], {
      sourceSystem: 'reporting-ui',
      centerKey: 'center-a',
      idempotencyKey: 'request-1'
    })

    expect(response.uploadId).toBe('upload-1')
    expect(hoisted.axios.post).toHaveBeenCalledTimes(1)
    const [url, formData, config] = hoisted.axios.post.mock.calls[0]
    expect(url).toBe('/endoreg/upload/')
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('file')).toBe(file)
    expect((formData as FormData).get('source_system')).toBe('reporting-ui')
    expect((formData as FormData).get('center_key')).toBe('center-a')
    expect(config).toEqual({ headers: { 'Idempotency-Key': 'request-1' } })
  })

  it('rejects zero or multiple files before calling the single-file backend endpoint', async () => {
    const first = new File(['%PDF-1.4'], 'first.pdf', { type: 'application/pdf' })
    const second = new File(['%PDF-1.4'], 'second.pdf', { type: 'application/pdf' })

    await expect(uploadFiles([])).rejects.toThrow('Exactly one file')
    await expect(uploadFiles([first, second])).rejects.toThrow('Exactly one file')
    expect(hoisted.axios.post).not.toHaveBeenCalled()
  })

  it('polls pending and processing states until an anonymized report has a stable id', async () => {
    const states: UploadStatusResponse[] = [
      { status: 'pending' },
      { status: 'processing' },
      {
        status: 'anonymized',
        reportLlmJob: {
          status: 'success',
          reportId: 73,
          result: { pdfId: 73 }
        }
      }
    ]
    states.forEach((state) => hoisted.axios.get.mockResolvedValueOnce({ data: state }))
    const onProgress = vi.fn()

    const completed = await pollUploadStatus('/status/upload-1', {
      pollIntervalMs: 0,
      maxAttempts: 3,
      onProgress
    })

    expect(hoisted.axios.get).toHaveBeenCalledTimes(3)
    expect(onProgress.mock.calls.map(([state]) => state.status)).toEqual([
      'pending',
      'processing',
      'anonymized'
    ])
    expect(resolveUploadedReportId(completed)).toBe(73)
  })

  it.each([
    ['error', 'Import failed'],
    ['lost', 'Worker heartbeat was lost']
  ] as const)('fails immediately for terminal %s status', async (status, errorDetail) => {
    hoisted.axios.get.mockResolvedValue({ data: { status, errorDetail } })

    await expect(
      pollUploadStatus('/status/upload-2', { pollIntervalMs: 0, maxAttempts: 5 })
    ).rejects.toThrow(errorDetail)
    expect(hoisted.axios.get).toHaveBeenCalledTimes(1)
  })

  it('honors an AbortSignal before issuing another status request', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      pollUploadStatus('/status/upload-3', {
        signal: controller.signal,
        pollIntervalMs: 0
      })
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(hoisted.axios.get).not.toHaveBeenCalled()
  })

  it('falls back to the report job result pdfId', () => {
    expect(
      resolveUploadedReportId({
        status: 'anonymized',
        reportLlmJob: {
          status: 'success',
          result: { pdfId: 91 }
        }
      })
    ).toBe(91)
  })
})
