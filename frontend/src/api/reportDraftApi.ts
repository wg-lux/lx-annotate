import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate'
import type { ReportTemplateIdentity, ReportTemplateSectionDraft } from '@/types/reportTemplate'
import type { ReportLanguageCode } from '@/api/reportingLanguagesApi'
import { normalizeReportTemplateIdentity } from '@/api/reportTemplatesApi'

export type ReportDraftBlob = {
  moduleName?: string
  module_name?: string
  templateName?: string
  template_name?: string
  templateIdentity?: ReportTemplateIdentity | null
  template_identity?: unknown
  indications?: ReportDraftIndication[]
  templateSectionDrafts?: Partial<Record<string, ReportTemplateSectionDraft>>
  template_section_drafts?: unknown
  selectedReportLanguage?: ReportLanguageCode
  selected_report_language?: unknown
  activeReportId?: number | null
  active_report_id?: unknown
  reportTextMode?: ReportDraftTextMode
  report_text_mode?: unknown
  renderedText?: string
  rendered_text?: unknown
  payload?: unknown
}

export type ReportDraftTextMode = 'generated' | 'manual'

export type ReportDraftIndication = {
  examinationIndicationId: number | null
  indicationChoiceId: number | null
}

export type ReportDraftResponse = {
  patientExaminationId?: number
  patient_examination_id?: number
  revision: number
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
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new TypeError(`Report draft response contains an invalid ${field}`)
  }
  return value
}

function optionalNullableString(value: unknown, field: string): string | null | undefined {
  if (value === undefined || value === null || typeof value === 'string') {
    return value
  }
  throw new TypeError(`Report draft response contains an invalid ${field}`)
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`Report draft response contains an invalid ${field}`)
  }
  return value
}

function optionalNonNegativeNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Report draft response contains an invalid ${field}`)
  }
  return value
}

function optionalNullablePositiveNumber(value: unknown, field: string): number | null | undefined {
  if (value === undefined || value === null) {
    return value
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`Report draft response contains an invalid ${field}`)
  }
  return value
}

function normalizeNullablePositiveNumber(value: unknown, field: string): number | null {
  if (value === null) {
    return null
  }
  const normalized = optionalNullablePositiveNumber(value, field)
  if (normalized === undefined) {
    throw new TypeError(`Report draft response contains a missing ${field}`)
  }
  return normalized
}

function normalizeIndications(value: unknown): ReportDraftIndication[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    throw new TypeError('Report draft response contains invalid draft.indications')
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new TypeError(
        `Report draft response contains invalid draft.indications[${String(index)}]`
      )
    }
    return {
      examinationIndicationId: normalizeNullablePositiveNumber(
        entry.examinationIndicationId ?? entry.examination_indication_id ?? null,
        `draft.indications[${String(index)}].examinationIndicationId`
      ),
      indicationChoiceId: normalizeNullablePositiveNumber(
        entry.indicationChoiceId ?? entry.indication_choice_id ?? null,
        `draft.indications[${String(index)}].indicationChoiceId`
      )
    }
  })
}

function normalizeTemplateSectionDrafts(
  value: unknown
): Partial<Record<string, ReportTemplateSectionDraft>> | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!isRecord(value)) {
    throw new TypeError('Report draft response contains invalid draft.templateSectionDrafts')
  }
  return Object.fromEntries(
    Object.entries(value).map(([sectionName, sectionDraft]) => {
      if (!sectionName || !isRecord(sectionDraft)) {
        throw new TypeError(
          `Report draft response contains invalid draft.templateSectionDrafts.${sectionName}`
        )
      }
      if (
        typeof sectionDraft.note !== 'string' ||
        typeof (sectionDraft.includePatientData ?? sectionDraft.include_patient_data) !==
          'boolean' ||
        typeof (sectionDraft.includeExaminationData ?? sectionDraft.include_examination_data) !==
          'boolean'
      ) {
        throw new TypeError(
          `Report draft response contains invalid draft.templateSectionDrafts.${sectionName}`
        )
      }
      return [
        sectionName,
        {
          note: sectionDraft.note,
          includePatientData: (sectionDraft.includePatientData ??
            sectionDraft.include_patient_data) as boolean,
          includeExaminationData: (sectionDraft.includeExaminationData ??
            sectionDraft.include_examination_data) as boolean
        }
      ]
    })
  )
}

function normalizeReportLanguage(value: unknown): ReportLanguageCode | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value !== 'de' && value !== 'en') {
    throw new TypeError('Report draft response contains invalid draft.selectedReportLanguage')
  }
  return value
}

function normalizeReportTextMode(value: unknown): ReportDraftTextMode | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value !== 'generated' && value !== 'manual') {
    throw new TypeError('Report draft response contains invalid draft.reportTextMode')
  }
  return value
}

function field(record: Record<string, unknown>, camel: string, snake: string): unknown {
  return record[camel] ?? record[snake]
}

function normalizeReportDraftBlob(value: unknown): ReportDraftBlob {
  if (value === undefined || value === null) {
    return {}
  }
  if (!isRecord(value)) {
    throw new TypeError('Report draft response contains an invalid draft')
  }

  const rawIdentity = value.templateIdentity || value.template_identity
  const rawSectionDrafts = field(value, 'templateSectionDrafts', 'template_section_drafts')
  const rawReportLanguage = field(value, 'selectedReportLanguage', 'selected_report_language')
  const rawActiveReportId = field(value, 'activeReportId', 'active_report_id')
  const rawReportTextMode = field(value, 'reportTextMode', 'report_text_mode')
  const rawRenderedText = field(value, 'renderedText', 'rendered_text')
  return {
    moduleName: optionalString(value.moduleName, 'draft.moduleName'),
    module_name: optionalString(value.module_name, 'draft.module_name'),
    templateName: optionalString(value.templateName, 'draft.templateName'),
    template_name: optionalString(value.template_name, 'draft.template_name'),
    templateIdentity: rawIdentity ? normalizeReportTemplateIdentity(rawIdentity) : null,
    template_identity: value.template_identity,
    indications: normalizeIndications(value.indications),
    templateSectionDrafts: normalizeTemplateSectionDrafts(rawSectionDrafts),
    template_section_drafts: value.template_section_drafts,
    selectedReportLanguage: normalizeReportLanguage(rawReportLanguage),
    selected_report_language: value.selected_report_language,
    activeReportId: optionalNullablePositiveNumber(rawActiveReportId, 'draft.activeReportId'),
    active_report_id: value.active_report_id,
    reportTextMode: normalizeReportTextMode(rawReportTextMode),
    report_text_mode: value.report_text_mode,
    renderedText: optionalString(rawRenderedText, 'draft.renderedText'),
    rendered_text: value.rendered_text,
    payload: value.payload
  }
}

function requireRequestedPatientExaminationId(
  value: Record<string, unknown>,
  requestedPatientExaminationId: number
): { patientExaminationId: number | undefined; snakeCaseId: number | undefined } {
  const patientExaminationId = optionalNumber(value.patientExaminationId, 'patientExaminationId')
  const snakeCaseId = optionalNumber(value.patient_examination_id, 'patient_examination_id')
  if (
    (patientExaminationId === undefined && snakeCaseId === undefined) ||
    (patientExaminationId !== undefined &&
      patientExaminationId !== requestedPatientExaminationId) ||
    (snakeCaseId !== undefined && snakeCaseId !== requestedPatientExaminationId)
  ) {
    throw new TypeError('Report draft response does not match the requested patient examination')
  }
  return { patientExaminationId, snakeCaseId }
}

function normalizeReportDraftResponse(
  value: unknown,
  requestedPatientExaminationId: number,
  expectedRevision?: number
): ReportDraftResponse {
  if (!isRecord(value)) {
    throw new TypeError('Report draft response does not match the expected contract')
  }
  const draft = normalizeReportDraftBlob(value.draft)
  const { patientExaminationId, snakeCaseId } = requireRequestedPatientExaminationId(
    value,
    requestedPatientExaminationId
  )
  const revision = optionalNonNegativeNumber(value.revision, 'revision')
  if (revision === undefined) {
    throw new TypeError('Report draft response contains a missing revision')
  }
  if (expectedRevision !== undefined && revision !== expectedRevision + 1) {
    throw new TypeError('Report draft response does not acknowledge the expected revision')
  }
  return {
    patientExaminationId,
    patient_examination_id: snakeCaseId,
    revision,
    draft,
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
  return normalizeReportDraftResponse(response.data, patientExaminationId)
}

export async function savePatientExaminationDraft(params: {
  patientExaminationId: number
  expectedRevision: number
  moduleName: string
  templateName: string | null
  templateIdentity?: ReportTemplateIdentity | null
  indications: ReportDraftIndication[]
  templateSectionDrafts: Partial<Record<string, ReportTemplateSectionDraft>>
  selectedReportLanguage: ReportLanguageCode
  activeReportId: number | null
  reportTextMode: ReportDraftTextMode
  renderedText: string
  payload: ReportTemplateRuntimePayload
}): Promise<ReportDraftResponse> {
  const response = await axiosInstance.put(
    r(endpoints.examination.patientExaminationDraft(params.patientExaminationId)),
    {
      expectedRevision: params.expectedRevision,
      moduleName: params.moduleName,
      templateName: params.templateName || '',
      ...(params.templateIdentity
        ? { templateIdentity: serializeDraftTemplateIdentity(params.templateIdentity) }
        : {}),
      indications: params.indications,
      templateSectionDrafts: params.templateSectionDrafts,
      selectedReportLanguage: params.selectedReportLanguage,
      activeReportId: params.activeReportId,
      reportTextMode: params.reportTextMode,
      renderedText: params.renderedText,
      payload: params.payload
    }
  )
  return normalizeReportDraftResponse(
    response.data,
    params.patientExaminationId,
    params.expectedRevision
  )
}
