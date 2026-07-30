import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate'
import type { ReportTemplateIdentity } from '@/types/reportTemplate'
import { normalizeReportTemplateIdentity } from '@/api/reportTemplatesApi'

export type ReportDraftBlob = {
  moduleName?: string
  module_name?: string
  templateName?: string
  template_name?: string
  templateIdentity?: ReportTemplateIdentity | null
  template_identity?: unknown
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
  const data = response.data as ReportDraftResponse
  const draft = data?.draft || {}
  return {
    ...data,
    draft: {
      ...draft,
      templateIdentity:
        draft.templateIdentity || draft.template_identity
          ? normalizeReportTemplateIdentity(draft.templateIdentity || draft.template_identity)
          : null
    }
  }
}

export async function savePatientExaminationDraft(params: {
  patientExaminationId: number
  moduleName: string
  templateName: string | null
  templateIdentity?: ReportTemplateIdentity | null
  payload: ReportTemplateRuntimePayload
}): Promise<ReportDraftResponse> {
  const response = await axiosInstance.put(
    r(endpoints.examination.patientExaminationDraft(params.patientExaminationId)),
    {
      moduleName: params.moduleName,
      templateName: params.templateName || '',
      ...(params.templateIdentity ? { templateIdentity: params.templateIdentity } : {}),
      payload: params.payload
    }
  )
  return response.data as ReportDraftResponse
}
