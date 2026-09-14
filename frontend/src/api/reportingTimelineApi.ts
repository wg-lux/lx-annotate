import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export type TimelineStreamOption = {
  type: string
  url: string
}

export type TimelinePatient = {
  id: number
  firstName: string | null
  lastName: string | null
  dob: string | null
  isRealPerson: boolean
  patientHash: string | null
}

export type TimelineLatestReport = {
  mediaType: string
  id: number
  rawPdfId?: number | null
  patientExaminationId: number | null
  anonymizedText: string | null
  documentType: string | null
  streamOptions: TimelineStreamOption[]
}

export type TimelineLatestVideo = {
  mediaType: string
  id: number
  patientExaminationId: number | null
  streamOptions: TimelineStreamOption[]
}

export type TimelineLatestFrame = {
  videoId: number
  frameNumber: number
  category: string | null
  selectionSource: string | null
  segmentId: number | null
  segmentLabel: string | null
  streamUrl: string
}

export type TimelineLatestPayload = {
  patient: TimelinePatient
  latestReport: TimelineLatestReport | null
  latestVideo: TimelineLatestVideo | null
  latestFrames: TimelineLatestFrame[]
}

export type PatientTimelineItem = {
  mediaType: string
  id: number
  timestamp: string | null
  examinationDate: string | null
  documentType: string | null
  fileName: string | null
  processedFileName?: string | null
  patientExaminationId: number | null
  streamOptions?: TimelineStreamOption[]
}

export type PatientTimelinePayload = {
  patient: TimelinePatient
  count: number
  results: PatientTimelineItem[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || isInteger(value)
}

function isOptionalNullableInteger(value: unknown): value is number | null | undefined {
  return value === undefined || isNullableInteger(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || isNullableString(value)
}

function isTimelineStreamOption(value: unknown): value is TimelineStreamOption {
  return isRecord(value) && typeof value.type === 'string' && typeof value.url === 'string'
}

function isTimelineStreamOptions(value: unknown): value is TimelineStreamOption[] {
  return Array.isArray(value) && value.every(isTimelineStreamOption)
}

function isTimelinePatient(value: unknown): value is TimelinePatient {
  return (
    isRecord(value) &&
    isInteger(value.id) &&
    isNullableString(value.firstName) &&
    isNullableString(value.lastName) &&
    isNullableString(value.dob) &&
    typeof value.isRealPerson === 'boolean' &&
    isNullableString(value.patientHash)
  )
}

function isTimelineLatestReport(value: unknown): value is TimelineLatestReport {
  return (
    isRecord(value) &&
    typeof value.mediaType === 'string' &&
    isInteger(value.id) &&
    isOptionalNullableInteger(value.rawPdfId) &&
    isNullableInteger(value.patientExaminationId) &&
    isNullableString(value.anonymizedText) &&
    isNullableString(value.documentType) &&
    isTimelineStreamOptions(value.streamOptions)
  )
}

function isTimelineLatestVideo(value: unknown): value is TimelineLatestVideo {
  return (
    isRecord(value) &&
    typeof value.mediaType === 'string' &&
    isInteger(value.id) &&
    isNullableInteger(value.patientExaminationId) &&
    isTimelineStreamOptions(value.streamOptions)
  )
}

function isTimelineLatestFrame(value: unknown): value is TimelineLatestFrame {
  return (
    isRecord(value) &&
    isInteger(value.videoId) &&
    isInteger(value.frameNumber) &&
    isNullableString(value.category) &&
    isNullableString(value.selectionSource) &&
    isNullableInteger(value.segmentId) &&
    isNullableString(value.segmentLabel) &&
    typeof value.streamUrl === 'string'
  )
}

function requireTimelineLatestPayload(value: unknown): TimelineLatestPayload {
  if (
    !isRecord(value) ||
    !isTimelinePatient(value.patient) ||
    (value.latestReport !== null && !isTimelineLatestReport(value.latestReport)) ||
    (value.latestVideo !== null && !isTimelineLatestVideo(value.latestVideo)) ||
    !Array.isArray(value.latestFrames) ||
    !value.latestFrames.every(isTimelineLatestFrame)
  ) {
    throw new TypeError('Patient timeline latest response does not match the expected contract')
  }
  return {
    patient: value.patient,
    latestReport: value.latestReport,
    latestVideo: value.latestVideo,
    latestFrames: value.latestFrames
  }
}

function hasPatientTimelineItemText(value: Record<string, unknown>): boolean {
  return (
    isNullableString(value.timestamp) &&
    isNullableString(value.examinationDate) &&
    isNullableString(value.documentType) &&
    isNullableString(value.fileName) &&
    isOptionalNullableString(value.processedFileName)
  )
}

function isPatientTimelineItem(value: unknown): value is PatientTimelineItem {
  return (
    isRecord(value) &&
    typeof value.mediaType === 'string' &&
    isInteger(value.id) &&
    hasPatientTimelineItemText(value) &&
    isNullableInteger(value.patientExaminationId) &&
    (value.streamOptions === undefined || isTimelineStreamOptions(value.streamOptions))
  )
}

function requirePatientTimelinePayload(value: unknown): PatientTimelinePayload {
  if (
    !isRecord(value) ||
    !isTimelinePatient(value.patient) ||
    !isInteger(value.count) ||
    !Array.isArray(value.results) ||
    !value.results.every(isPatientTimelineItem)
  ) {
    throw new TypeError('Patient timeline response does not match the expected contract')
  }
  return { patient: value.patient, count: value.count, results: value.results }
}

export function pickPreferredStream(options: TimelineStreamOption[] = []): string | null {
  return (
    options.find((option) => option.type === 'processed')?.url ??
    options.find((option) => option.type === 'raw')?.url ??
    null
  )
}

export function pickPreferredReportStream(options: TimelineStreamOption[] = []): string | null {
  return (
    options.find((option) => option.type === 'raw')?.url ??
    options.find((option) => option.type === 'processed')?.url ??
    null
  )
}

export async function fetchPatientTimelineLatest(params: {
  patientId: number
  patientExaminationId?: number | null
}): Promise<TimelineLatestPayload> {
  const response = await axiosInstance.get<unknown>(
    r(endpoints.media.patientTimeline(params.patientId)),
    {
      params: {
        latest_only: true,
        ...(params.patientExaminationId
          ? { patient_examination_id: params.patientExaminationId }
          : {})
      }
    }
  )

  return requireTimelineLatestPayload(response.data)
}

export async function fetchPatientTimeline(
  patientId: number,
  patientExaminationId?: number | null
): Promise<PatientTimelinePayload> {
  const response = await axiosInstance.get<unknown>(r(endpoints.media.patientTimeline(patientId)), {
    params: patientExaminationId ? { patient_examination_id: patientExaminationId } : undefined
  })
  return requirePatientTimelinePayload(response.data)
}
