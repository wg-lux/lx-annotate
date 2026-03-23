import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate'

export type ReportDraftBlob = {
  module_name?: string
  template_name?: string
  payload?: unknown
}

export type ReportDraftResponse = {
  patient_examination_id: number
  draft: ReportDraftBlob
  updated_at: string | null
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
      module_name: params.moduleName,
      template_name: params.templateName || '',
      payload: params.payload
    }
  )
  return response.data as ReportDraftResponse
}
