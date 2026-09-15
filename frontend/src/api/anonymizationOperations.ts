import axiosInstance, { r, silentRequestConfig } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { ApiUploadJobOverview } from '@/stores/anonymizationStore'

export interface ImportCancellationResponse {
  uploadJob: ApiUploadJobOverview
  cancellationRequested: true
  sourcePreserved: true
}

export async function cancelAnonymizationImport(jobId: string): Promise<ImportCancellationResponse> {
  const { data } = await axiosInstance.post<ImportCancellationResponse>(
    r(endpoints.anonymization.cancelUploadJob(jobId)),
    undefined,
    silentRequestConfig({ timeout: 15000 })
  )
  return data
}

export interface AnonymizationStorageCapacity {
  scope: 'protected_media_filesystem'
  totalBytes: number
  usedBytes: number
  availableBytes: number
  reservedBytes: number
  observedAt: string
}

export async function fetchAnonymizationStorage(
  signal?: AbortSignal
): Promise<AnonymizationStorageCapacity> {
  const { data } = await axiosInstance.get<AnonymizationStorageCapacity>(
    r(endpoints.anonymization.storage),
    silentRequestConfig({ signal, timeout: 15000 })
  )
  return data
}

export type TranscodeOption = 'replace_processed'
export type TranscodeJobStatus = 'queued' | 'running' | 'completed' | 'skipped' | 'failed' | 'lost'

export interface VideoTranscodeJob {
  id: string
  videoId: number
  option: TranscodeOption
  status: TranscodeJobStatus
  stage: string
  progressPercent: number | null
  beforeBytes: number | null
  afterBytes: number | null
  savedBytes: number | null
  errorCode: string
  createdAt: string
  updatedAt: string
}

export interface VideoTranscodeCandidate {
  videoId: number
  filename: string
  options: TranscodeOption[]
}

export interface VideoTranscodeOverview {
  jobs: VideoTranscodeJob[]
  candidates: VideoTranscodeCandidate[]
  options: TranscodeOption[]
}

export interface VideoTranscodeStartResponse {
  job: VideoTranscodeJob
  created: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isTranscodeOption(value: unknown): value is TranscodeOption {
  return value === 'replace_processed'
}

function isTranscodeOptions(value: unknown): value is TranscodeOption[] {
  return Array.isArray(value) && value.every(isTranscodeOption)
}

function isNullableByteCount(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
}

function isPositiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isProgressPercent(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' &&
    Number.isFinite(value) && value >= 0 && value <= 100)
}

function hasTranscodeIdentity(value: Record<string, unknown>): boolean {
  const statuses: string[] = ['queued', 'running', 'completed', 'skipped', 'failed', 'lost']
  return typeof value.id === 'string' &&
    isPositiveId(value.videoId) && isTranscodeOption(value.option) &&
    typeof value.status === 'string' && statuses.includes(value.status)
}

function hasTranscodeMeasurements(value: Record<string, unknown>): boolean {
  return isProgressPercent(value.progressPercent) &&
    isNullableByteCount(value.beforeBytes) && isNullableByteCount(value.afterBytes) &&
    isNullableByteCount(value.savedBytes)
}

function isTranscodeJob(value: unknown): value is VideoTranscodeJob {
  return isRecord(value) && hasTranscodeIdentity(value) && hasTranscodeMeasurements(value) &&
    typeof value.stage === 'string' && typeof value.errorCode === 'string' &&
    typeof value.createdAt === 'string' && typeof value.updatedAt === 'string'
}

function isTranscodeCandidate(value: unknown): value is VideoTranscodeCandidate {
  return isRecord(value) && isPositiveId(value.videoId) &&
    typeof value.filename === 'string' && isTranscodeOptions(value.options)
}

export async function fetchVideoTranscodeJobs(signal?: AbortSignal): Promise<VideoTranscodeOverview> {
  const { data } = await axiosInstance.get<unknown>(
    r(endpoints.media.videoTranscodeJobsOverview),
    silentRequestConfig({ signal, timeout: 15000, params: { limit: 200 } })
  )
  if (!isRecord(data) || !Array.isArray(data.jobs) || !data.jobs.every(isTranscodeJob) ||
    !Array.isArray(data.candidates) || !data.candidates.every(isTranscodeCandidate) ||
    !isTranscodeOptions(data.options)) {
    throw new TypeError('Video transcode overview does not match the API contract')
  }
  return { jobs: data.jobs, candidates: data.candidates, options: data.options }
}

export async function startVideoTranscode(
  videoId: number,
  option: TranscodeOption,
  idempotencyKey: string
): Promise<VideoTranscodeStartResponse> {
  if (!isTranscodeOption(option)) throw new TypeError('Unsupported video transcode option')
  const { data } = await axiosInstance.post<unknown>(
    r(endpoints.media.videoTranscodeJobs(videoId)),
    { option, idempotency_key: idempotencyKey },
    silentRequestConfig({ timeout: 15000 })
  )
  if (!isRecord(data) || !isTranscodeJob(data.job) || typeof data.created !== 'boolean') {
    throw new TypeError('Video transcode response does not match the API contract')
  }
  return { job: data.job, created: data.created }
}
