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

type PersistedReportTemplateIdentity = {
  moduleName: string
  knowledgeBaseVersion: string
  templateVersion: string
  templateHash: string
  lifecycleStatus: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw new TypeError(`Report draft response contains an invalid ${field}`)
  }
  return value
}

function optionalNullableString(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null || typeof value === 'string') return value
  throw new TypeError(`Report draft response contains an invalid ${field}`)
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`Report draft response contains an invalid ${field}`)
  }
  return value
}

function normalizeReportDraftBlob(value: unknown): ReportDraftBlob {
  if (value === undefined || value === null) return {}
  if (!isRecord(value)) {
    throw new TypeError('Report draft response contains an invalid draft')
  }

  const rawIdentity = value.templateIdentity || value.template_identity
  return {
    moduleName: optionalString(value.moduleName, 'draft.moduleName'),
    module_name: optionalString(value.module_name, 'draft.module_name'),
    templateName: optionalString(value.templateName, 'draft.templateName'),
    template_name: optionalString(value.template_name, 'draft.template_name'),
    templateIdentity: rawIdentity ? normalizeReportTemplateIdentity(rawIdentity) : null,
    template_identity: value.template_identity,
    payload: value.payload
  }
}

function normalizeReportDraftResponse(value: unknown): ReportDraftResponse {
  if (!isRecord(value)) {
    throw new TypeError('Report draft response does not match the expected contract')
  }
  return {
    patientExaminationId: optionalNumber(value.patientExaminationId, 'patientExaminationId'),
    patient_examination_id: optionalNumber(
      value.patient_examination_id,
      'patient_examination_id'
    ),
    draft: normalizeReportDraftBlob(value.draft),
    updatedAt: optionalNullableString(value.updatedAt, 'updatedAt'),
    updated_at: optionalNullableString(value.updated_at, 'updated_at')
  }
}

export function serializeDraftTemplateIdentity(
  identity: ReportTemplateIdentity
): PersistedReportTemplateIdentity {
  return {
    moduleName: identity.moduleName ?? '',
    knowledgeBaseVersion: identity.knowledgeBaseVersion ?? '',
    templateVersion: identity.templateVersion ?? '',
    templateHash: identity.templateHash ?? '',
    lifecycleStatus: identity.lifecycleStatus ?? ''
  }
}

export async function fetchPatientExaminationDraft(
  patientExaminationId: number
): Promise<ReportDraftResponse> {
  const response = await axiosInstance.get<unknown>(
    r(endpoints.examination.patientExaminationDraft(patientExaminationId))
  )
  return normalizeReportDraftResponse(response.data)
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
      ...(params.templateIdentity
        ? { templateIdentity: serializeDraftTemplateIdentity(params.templateIdentity) }
        : {}),
      payload: params.payload
    }
  )
  return response.data as ReportDraftResponse
}
