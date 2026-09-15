import { describe, expect, it, vi } from 'vitest'
import type { AxiosRequestConfig } from 'axios'
import type { AnonymizationStorageCapacity, VideoTranscodeJob } from '../anonymizationOperations'

const { get, post } = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn<(url: string, config: AxiosRequestConfig) => Promise<{ data: unknown }>>()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: { get, post },
  r: (path: string) => `/api/${path}`,
  silentRequestConfig: (config: AxiosRequestConfig) => config
}))

import {
  cancelAnonymizationImport, fetchAnonymizationStorage, fetchVideoTranscodeJobs, startVideoTranscode
} from '../anonymizationOperations'

const transcodeJob: VideoTranscodeJob = {
  id: 'f58b8222-05cf-48cf-91e4-0e4814b449c7', videoId: 17, option: 'replace_processed',
  status: 'queued', stage: 'queued', progressPercent: null,
  beforeBytes: null, afterBytes: null, savedBytes: null, errorCode: '',
  createdAt: '2026-09-14T09:00:00Z', updatedAt: '2026-09-14T09:00:00Z'
}

describe('anonymization operations API', () => {
  it('submits cancellation using the job identity with no client-supplied actor or mutation payload', async () => {
    post.mockRejectedValueOnce(new Error('conflict'))
    await expect(cancelAnonymizationImport('a8c0144a-7076-48b4-80b7-407868f8e820')).rejects.toThrow('conflict')
    expect(post).toHaveBeenCalledWith('/api/anonymization/upload-jobs/a8c0144a-7076-48b4-80b7-407868f8e820/cancel/', undefined, { timeout: 15000 })
  })
  it('requests authoritative capacity with a timeout and cancellation signal', async () => {
    const capacity: AnonymizationStorageCapacity = {
      scope: 'protected_media_filesystem', totalBytes: 100, usedBytes: 60,
      availableBytes: 35, reservedBytes: 5, observedAt: '2026-09-14T09:00:00Z'
    }
    get.mockResolvedValueOnce({ data: capacity })
    const controller = new AbortController()
    expect(await fetchAnonymizationStorage(controller.signal)).toEqual(capacity)
    expect(get).toHaveBeenCalledWith('/api/anonymization/storage/', {
      signal: controller.signal, timeout: 15000
    })
  })

  it('preserves request failures for explicit unavailable UI', async () => {
    get.mockRejectedValueOnce(new Error('unavailable'))
    await expect(fetchAnonymizationStorage()).rejects.toThrow('unavailable')
  })

  it('requests bounded jobs and server-authorized candidates with an abort signal', async () => {
    const overview = {
      jobs: [transcodeJob], options: ['replace_processed'],
      candidates: [{ videoId: 17, filename: 'video.mp4', options: ['replace_processed'] }]
    }
    get.mockResolvedValueOnce({ data: overview })
    const signal = new AbortController().signal
    expect(await fetchVideoTranscodeJobs(signal)).toEqual(overview)
    expect(get).toHaveBeenLastCalledWith('/api/media/videos/transcode-jobs/', {
      signal, timeout: 15000, params: { limit: 200 }
    })
  })

  it.each([
    { jobs: [], candidates: [], options: ['unsupported_mode'] },
    { jobs: [], candidates: [], options: ['playback_copy'] },
    { jobs: [{ ...transcodeJob, option: 'playback_copy' }], candidates: [], options: ['replace_processed'] },
    { jobs: [], candidates: [{ videoId: 17, filename: 'video.mp4', options: ['playback_copy'] }], options: ['replace_processed'] },
    { jobs: [{ ...transcodeJob, progressPercent: 101 }], candidates: [], options: [] },
    { jobs: [{ ...transcodeJob, beforeBytes: -1 }], candidates: [], options: [] },
    { jobs: [], options: [] }
  ])('rejects invalid transcode observations instead of inventing capabilities', async (data) => {
    get.mockResolvedValueOnce({ data })
    await expect(fetchVideoTranscodeJobs()).rejects.toThrow('API contract')
  })

  it.each(['replace_processed'] as const)('submits explicit %s with snake_case idempotency identity', async (option) => {
    const data = { job: { ...transcodeJob, option }, created: true }
    post.mockResolvedValueOnce({ data })
    expect(await startVideoTranscode(17, option, 'idempotency-uuid')).toEqual(data)
    expect(post).toHaveBeenLastCalledWith('/api/media/videos/17/transcode-jobs/', {
      option, idempotency_key: 'idempotency-uuid'
    }, { timeout: 15000 })
  })

  it('rejects a malformed accepted response', async () => {
    post.mockResolvedValueOnce({ data: { created: true } })
    await expect(startVideoTranscode(17, 'replace_processed', 'idempotency-uuid')).rejects.toThrow('API contract')
  })
})
