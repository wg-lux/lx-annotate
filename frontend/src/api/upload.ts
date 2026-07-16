import axiosInstance, { endoregApi } from './axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export interface UploadResponse {
  uploadId: string
  statusUrl: string
}

export interface UploadRequestOptions {
  centerKey?: string
  sourceSystem?: string
  idempotencyKey?: string
}

export type UploadStatus = 'pending' | 'processing' | 'anonymized' | 'error' | 'lost'

export interface UploadReportLlmJobResult {
  pdfId?: number
  [key: string]: unknown
}

export interface UploadReportLlmJob {
  status: string
  operation?: string
  jobId?: string
  taskId?: string
  queue?: string
  reportId?: number
  pollUrl?: string
  error?: string
  result: UploadReportLlmJobResult
  createdAt?: string
  startedAt?: string
  completedAt?: string
}

export interface UploadStatusResponse {
  status: UploadStatus
  id?: string
  detail?: string
  errorDetail?: string
  sensitiveMetaId?: number
  sourceCenterKey?: string | null
  sourceSystem?: string
  ingestMode?: string
  text?: string
  anonymizedText?: string
  reportLlmJob?: UploadReportLlmJob
}

export interface UploadPollingOptions {
  signal?: AbortSignal
  pollIntervalMs?: number
  maxAttempts?: number
  onProgress?: (status: UploadStatusResponse) => void
}

/**
 * Upload files to the anonymization backend
 * @param files - FileList or File array containing exactly one file
 * @param options - Optional machine-facing upload metadata
 * @returns Promise with upload_id and status_url
 */
export const uploadFiles = async (
  files: FileList | File[],
  options: UploadRequestOptions = {}
): Promise<UploadResponse> => {
  const formData = new FormData()

  const fileArray = Array.from(files)

  if (fileArray.length !== 1) {
    throw new Error('Exactly one file must be provided for upload')
  }

  fileArray.forEach((file) => {
    formData.append('file', file)
  })

  if (options.centerKey) {
    formData.append('center_key', options.centerKey)
  }
  if (options.sourceSystem) {
    formData.append('source_system', options.sourceSystem)
  }

  const response = await axiosInstance.post(endoregApi(endpoints.upload.upload), formData, {
    headers: options.idempotencyKey
      ? {
          'Idempotency-Key': options.idempotencyKey
        }
      : undefined
  })
  return response.data
}

/**
 * Check the status of an upload
 * @param statusUrl - The status URL returned from uploadFiles
 * @returns Promise with current upload status
 */
export const checkUploadStatus = async (
  statusUrl: string,
  signal?: AbortSignal
): Promise<UploadStatusResponse> => {
  const response = signal
    ? await axiosInstance.get(statusUrl, { signal })
    : await axiosInstance.get(statusUrl)
  return response.data
}

export function resolveUploadedReportId(status: UploadStatusResponse): number | null {
  const candidates = [status.reportLlmJob?.reportId, status.reportLlmJob?.result?.pdfId]
  return (
    candidates.find(
      (candidate): candidate is number =>
        typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0
    ) ?? null
  )
}

function uploadPollingAbortError(): Error {
  const error = new Error('Upload polling was aborted')
  error.name = 'AbortError'
  return error
}

function throwIfUploadPollingAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw uploadPollingAbortError()
}

function waitForNextPoll(delayMs: number, signal?: AbortSignal): Promise<void> {
  throwIfUploadPollingAborted(signal)
  if (delayMs === 0) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    const onAbort = () => {
      globalThis.clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
      reject(uploadPollingAbortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function terminalUploadError(status: UploadStatusResponse): Error {
  const fallback = status.status === 'lost' ? 'Upload was lost' : 'Upload failed'
  return new Error(status.errorDetail || status.detail || fallback)
}

/**
 * Poll upload status until completion
 * @param statusUrl - The status URL to poll
 * @param onProgressOrOptions - Optional legacy callback or polling controls
 * @param legacyOptions - Polling controls when using the legacy callback signature
 * @returns Promise that resolves when upload is complete
 */
export const pollUploadStatus = async (
  statusUrl: string,
  onProgressOrOptions?: ((status: UploadStatusResponse) => void) | UploadPollingOptions,
  legacyOptions: Omit<UploadPollingOptions, 'onProgress'> = {}
): Promise<UploadStatusResponse> => {
  const options: UploadPollingOptions =
    typeof onProgressOrOptions === 'function'
      ? { ...legacyOptions, onProgress: onProgressOrOptions }
      : (onProgressOrOptions ?? {})
  const pollIntervalMs = options.pollIntervalMs ?? 5000
  const maxAttempts = options.maxAttempts ?? 30

  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 0) {
    throw new Error('pollIntervalMs must be a non-negative number')
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('maxAttempts must be a positive integer')
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    throwIfUploadPollingAborted(options.signal)
    const status = await checkUploadStatus(statusUrl, options.signal)
    options.onProgress?.(status)

    if (status.status === 'anonymized') return status
    if (status.status === 'error' || status.status === 'lost') {
      throw terminalUploadError(status)
    }

    if (attempt === maxAttempts) {
      throw new Error('Upload timeout - maximum polling attempts reached')
    }
    await waitForNextPoll(pollIntervalMs, options.signal)
  }

  throw new Error('Upload polling ended unexpectedly')
}
