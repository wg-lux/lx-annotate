import { isAxiosError } from 'axios'

import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export interface FrameAnnotationBulkUpsertItem {
  frameId: number
  labelId: number
  value: boolean
  floatValue: number | null
  informationSourceName: string
  annotator: string
  externalAnnotationId: string
  modelMetaId: number | null
}

export interface FrameAnnotationBulkUpsertPayload {
  videoId?: number
  aiDatasetId?: number
  annotations: FrameAnnotationBulkUpsertItem[]
}

export interface FrameAnnotationBulkWriteFailure {
  status: 'error'
  error: string
  code: string
  retryable: boolean
  writeCommitted: false
}

export class FrameAnnotationBulkWriteError extends Error {
  readonly failure: FrameAnnotationBulkWriteFailure

  constructor(failure: FrameAnnotationBulkWriteFailure) {
    super(failure.error)
    this.name = 'FrameAnnotationBulkWriteError'
    this.failure = failure
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parseFrameAnnotationBulkWriteFailure(
  value: unknown
): FrameAnnotationBulkWriteFailure | null {
  if (!isRecord(value)) return null
  const writeCommitted = value.writeCommitted ?? value.write_committed
  if (
    value.status !== 'error' ||
    typeof value.error !== 'string' ||
    !value.error.trim() ||
    typeof value.code !== 'string' ||
    !value.code.trim() ||
    typeof value.retryable !== 'boolean' ||
    writeCommitted !== false
  ) {
    return null
  }
  return {
    status: 'error',
    error: value.error,
    code: value.code,
    retryable: value.retryable,
    writeCommitted: false
  }
}

export async function bulkUpsertFrameAnnotations(
  payload: FrameAnnotationBulkUpsertPayload
): Promise<void> {
  try {
    await axiosInstance.post(r(endpoints.annotation.bulkUpsert), payload)
  } catch (error: unknown) {
    const failure = isAxiosError<unknown>(error)
      ? parseFrameAnnotationBulkWriteFailure(error.response?.data)
      : null
    if (failure) throw new FrameAnnotationBulkWriteError(failure)
    throw error
  }
}
