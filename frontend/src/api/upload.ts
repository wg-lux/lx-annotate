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

export type UploadStatus =
  | 'pending'
  | 'processing'
  | 'retrying'
  | 'cancel_requested'
  | 'cancelled'
  | 'anonymized'
  | 'error'
  | 'lost'

export class UploadCancelledError extends Error {
  constructor() {
    super('Upload was cancelled')
    this.name = 'UploadCancelledError'
  }
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isUploadStatus(value: unknown): value is UploadStatus {
  return (
    value === 'pending' ||
    value === 'processing' ||
    value === 'retrying' ||
    value === 'cancel_requested' ||
    value === 'cancelled' ||
    value === 'anonymized' ||
    value === 'error' ||
    value === 'lost'
  )
}

function requireUploadResponse(value: unknown): UploadResponse {
  if (
    !isRecord(value) ||
    typeof value.uploadId !== 'string' ||
    typeof value.statusUrl !== 'string'
  ) {
    throw new TypeError('Upload response does not match the expected contract')
  }
  return { uploadId: value.uploadId, statusUrl: value.statusUrl }
}

function optionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Upload response contains an invalid ${fieldName}`)
  }
  return value
}

function optionalNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number') {
    throw new TypeError(`Upload response contains an invalid ${fieldName}`)
  }
  return value
}

function optionalNullableString(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined || value === null || typeof value === 'string') {
    return value
  }
  throw new TypeError(`Upload response contains an invalid ${fieldName}`)
}

function requireUploadReportLlmJob(value: unknown): UploadReportLlmJob {
  if (!isRecord(value) || typeof value.status !== 'string' || !isRecord(value.result)) {
    throw new TypeError('Upload status response contains an invalid reportLlmJob')
  }
  const pdfId = optionalNumber(value.result.pdfId, 'reportLlmJob.result.pdfId')
  const result: UploadReportLlmJobResult = {
    ...value.result,
    ...(pdfId === undefined ? {} : { pdfId })
  }
  return {
    status: value.status,
    result,
    operation: optionalString(value.operation, 'reportLlmJob.operation'),
    jobId: optionalString(value.jobId, 'reportLlmJob.jobId'),
    taskId: optionalString(value.taskId, 'reportLlmJob.taskId'),
    queue: optionalString(value.queue, 'reportLlmJob.queue'),
    reportId: optionalNumber(value.reportId, 'reportLlmJob.reportId'),
    pollUrl: optionalString(value.pollUrl, 'reportLlmJob.pollUrl'),
    error: optionalString(value.error, 'reportLlmJob.error'),
    createdAt: optionalString(value.createdAt, 'reportLlmJob.createdAt'),
    startedAt: optionalString(value.startedAt, 'reportLlmJob.startedAt'),
    completedAt: optionalString(value.completedAt, 'reportLlmJob.completedAt')
  }
}

function requireUploadStatusResponse(value: unknown): UploadStatusResponse {
  if (!isRecord(value)) {
    throw new TypeError('Upload status response must be an object')
  }
  if (!isUploadStatus(value.status)) {
    throw new TypeError('Upload status response contains an invalid status')
  }
  const status = value.status
  return {
    status,
    id: optionalString(value.id, 'id'),
    detail: optionalString(value.detail, 'detail'),
    errorDetail: optionalString(value.errorDetail, 'errorDetail'),
    sensitiveMetaId: optionalNumber(value.sensitiveMetaId, 'sensitiveMetaId'),
    sourceCenterKey: optionalNullableString(value.sourceCenterKey, 'sourceCenterKey'),
    sourceSystem: optionalString(value.sourceSystem, 'sourceSystem'),
    ingestMode: optionalString(value.ingestMode, 'ingestMode'),
    text: optionalString(value.text, 'text'),
    anonymizedText: optionalString(value.anonymizedText, 'anonymizedText'),
    reportLlmJob:
      value.reportLlmJob === undefined ? undefined : requireUploadReportLlmJob(value.reportLlmJob)
  }
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

  const response = await axiosInstance.post<unknown>(
    endoregApi(endpoints.upload.upload),
    formData,
    {
      headers: options.idempotencyKey
        ? {
            'Idempotency-Key': options.idempotencyKey
          }
        : undefined
    }
  )
  return requireUploadResponse(response.data)
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
    ? await axiosInstance.get<unknown>(statusUrl, { signal })
    : await axiosInstance.get<unknown>(statusUrl)
  return requireUploadStatusResponse(response.data)
}

export function resolveUploadedReportId(status: UploadStatusResponse): number | null {
  const candidates = [status.reportLlmJob?.reportId, status.reportLlmJob?.result.pdfId]
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
  if (signal?.aborted) {
    throw uploadPollingAbortError()
  }
}

function waitForNextPoll(delayMs: number, signal?: AbortSignal): Promise<void> {
  throwIfUploadPollingAborted(signal)
  if (delayMs === 0) {
    return Promise.resolve()
  }

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

function normalizeUploadPollingOptions(
  onProgressOrOptions: ((status: UploadStatusResponse) => void) | UploadPollingOptions | undefined,
  legacyOptions: Omit<UploadPollingOptions, 'onProgress'>
): Required<Pick<UploadPollingOptions, 'pollIntervalMs' | 'maxAttempts'>> & UploadPollingOptions {
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
  return { ...options, pollIntervalMs, maxAttempts }
}

function resolveTerminalUploadStatus(status: UploadStatusResponse): UploadStatusResponse | null {
  if (status.status === 'cancelled') {
    throw new UploadCancelledError()
  }
  if (status.status === 'anonymized') {
    return status
  }
  if (status.status === 'error' || status.status === 'lost') {
    throw terminalUploadError(status)
  }
  return null
}

function requireRemainingPollingAttempt(attempt: number, maxAttempts: number): void {
  if (attempt === maxAttempts) {
    throw new Error('Upload timeout - maximum polling attempts reached')
  }
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
  const options = normalizeUploadPollingOptions(onProgressOrOptions, legacyOptions)

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    throwIfUploadPollingAborted(options.signal)
    const status = await checkUploadStatus(statusUrl, options.signal)
    options.onProgress?.(status)
    const terminalStatus = resolveTerminalUploadStatus(status)
    if (terminalStatus) {
      return terminalStatus
    }
    requireRemainingPollingAttempt(attempt, options.maxAttempts)
    await waitForNextPoll(options.pollIntervalMs, options.signal)
  }

  throw new Error('Upload polling ended unexpectedly')
}
