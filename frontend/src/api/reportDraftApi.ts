import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate'

export type ReportDraftBlob = {
  moduleName?: string
  module_name?: string
  templateName?: string
  template_name?: string
  payload?: unknown
}

export type ReportDraftResponse = {
  patientExaminationId?: number
  patient_examination_id?: number
  draft: ReportDraftBlob
  updatedAt?: string | null
  updated_at?: string | null
}

export async function fetchPatientExaminationDraft(
  patientExaminationId: number
): Promise<ReportDraftResponse> {
  const response = await axiosInstance.get(
    r(endpoints.examination.patientExaminationDraft(patientExaminationId))
  )
  return response.data as ReportDraftResponse
}

export async function savePatientExaminationDraft(params: {
  patientExaminationId: number
  moduleName: string
  templateName: string | null
  payload: ReportTemplateRuntimePayload
}): Promise<ReportDraftResponse> {
  const response = await axiosInstance.put(
    r(endpoints.examination.patientExaminationDraft(params.patientExaminationId)),
    {
      moduleName: params.moduleName,
      templateName: params.templateName || '',
      payload: params.payload
    }
  )
  return response.data as ReportDraftResponse
}
