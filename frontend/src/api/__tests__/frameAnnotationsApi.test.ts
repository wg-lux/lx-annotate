import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  bulkUpsertFrameAnnotations,
  FrameAnnotationBulkWriteError,
  parseFrameAnnotationBulkWriteFailure
} from '@/api/frameAnnotationsApi'

const hoisted = vi.hoisted(() => ({
  post: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: { post: hoisted.post },
  r: (path: string) => path
}))

describe('frame annotation bulk-write contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes the backend not-committed failure contract', () => {
    expect(
      parseFrameAnnotationBulkWriteFailure({
        status: 'error',
        error: 'Frame annotation storage is temporarily unavailable.',
        code: 'frame_annotation_write_temporarily_unavailable',
        retryable: true,
        write_committed: false
      })
    ).toEqual({
      status: 'error',
      error: 'Frame annotation storage is temporarily unavailable.',
      code: 'frame_annotation_write_temporarily_unavailable',
      retryable: true,
      writeCommitted: false
    })
  })

  it('rejects incomplete failures instead of guessing whether a write committed', () => {
    expect(
      parseFrameAnnotationBulkWriteFailure({
        status: 'error',
        error: 'Storage unavailable.',
        code: 'frame_annotation_write_failed',
        retryable: true
      })
    ).toBeNull()
  })

  it('raises a typed error for a validated backend write failure', async () => {
    hoisted.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          status: 'error',
          error: 'Frame annotations conflict with persisted data.',
          code: 'frame_annotation_write_conflict',
          retryable: false,
          writeCommitted: false
        }
      }
    })

    const request = bulkUpsertFrameAnnotations({ annotations: [] })

    await expect(request).rejects.toBeInstanceOf(FrameAnnotationBulkWriteError)
    await expect(request).rejects.toMatchObject({
      failure: {
        code: 'frame_annotation_write_conflict',
        retryable: false,
        writeCommitted: false
      }
    })
  })
})
