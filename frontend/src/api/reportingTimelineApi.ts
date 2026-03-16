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

export function pickPreferredStream(options: TimelineStreamOption[] = []): string | null {
  return (
    options.find((option) => option.type === 'processed')?.url ??
    options.find((option) => option.type === 'raw')?.url ??
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
