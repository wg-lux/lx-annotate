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
  mediaType: 'pdf' | 'full_report' | string
  id: number
  rawPdfId?: number | null
  patientExaminationId: number | null
  anonymizedText: string | null
  documentType: string | null
  streamOptions: TimelineStreamOption[]
}

export type TimelineLatestVideo = {
  mediaType: 'video' | string
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
  mediaType: 'pdf' | 'full_report' | 'video' | string
  id: number
  timestamp: string | null
  examinationDate: string | null
  documentType: string | null
  fileName: string | null
  processedFileName?: string | null
  patientExaminationId: number | null
  streamOptions: TimelineStreamOption[]
}

export type PatientTimelinePayload = {
  patient: TimelinePatient
  count: number
  results: PatientTimelineItem[]
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
  const response = await axiosInstance.get(r(endpoints.media.patientTimeline(params.patientId)), {
    params: {
      latest_only: true,
      ...(params.patientExaminationId
        ? { patient_examination_id: params.patientExaminationId }
        : {})
    }
  })

  return response.data as TimelineLatestPayload
}

export async function fetchPatientTimeline(
  patientId: number,
  patientExaminationId?: number | null
): Promise<PatientTimelinePayload> {
  const response = await axiosInstance.get(r(endpoints.media.patientTimeline(patientId)), {
    params: patientExaminationId
      ? { patient_examination_id: patientExaminationId }
      : undefined
  })
  return response.data as PatientTimelinePayload
}
