import axiosInstance, { dtypesApi } from '@/api/axiosInstance'
import {
  normalizeFindingChoice,
  normalizeFindings,
  normalizeFindingClassification,
  normalizePatientFindingRow,
  normalizePatientFindingRows,
  type ClassificationSelection,
  type Finding,
  type FindingChoice,
  type FindingClassification,
  type PatientFindingRow
} from '@/api/findings.contract'

export type FindingsApiErrorCode =
  | 'required-finding'
  | 'duplicate-finding'
  | 'invalid-choice'
  | 'invalid-finding'
  | 'bad-request'
  | 'not-found'
  | 'unknown'

export interface FindingsApiError {
  code: FindingsApiErrorCode
  message: string
  status?: number
  details?: unknown
}

export interface CreatePatientFindingPayload {
  patientExamination: number
  finding: number
  classifications?: ClassificationSelection[]
}

export interface UpdatePatientFindingPayload {
  finding?: number
  isActive?: boolean
  classifications?: ClassificationSelection[]
}

const DTYPES_PATHS = {
  examinationFindings: (examinationId: number) =>
    dtypesApi(`examinations/${examinationId}/findings/`),
  findingClassifications: (findingId: number) =>
    dtypesApi(`findings/${findingId}/classifications/`),
  classificationChoices: (classificationId: number) =>
    dtypesApi(`classifications/${classificationId}/choices/`),
  patientFindings: dtypesApi('patient-findings/'),
  patientFindingById: (patientFindingId: number) =>
    dtypesApi(`patient-findings/${patientFindingId}/`),
  patientFindingClassifications: (patientFindingId: number) =>
    dtypesApi(`patient-findings/${patientFindingId}/classifications/`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function parseMessages(data: unknown): string[] {
  if (!data) return []
  if (typeof data === 'string') return data.trim() ? [data] : []
  if (!isRecord(data)) return []
  if (typeof data.message === 'string' && data.message.trim()) return [data.message]
  if (typeof data.detail === 'string' && data.detail.trim()) return [data.detail]

  const messages: string[] = []
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value) && value.length) {
      messages.push(`${key}: ${value.join(', ')}`)
    } else if (typeof value === 'string' && value.trim()) {
      messages.push(`${key}: ${value}`)
    }
  }
  return messages
}

type FindingsApiErrorContext = {
  data: unknown
  messages: string[]
  status: number | undefined
}

function buildFindingsApiError(
  code: FindingsApiErrorCode,
  fallbackMessage: string,
  context: FindingsApiErrorContext
): FindingsApiError {
  return {
    code,
    message: context.messages[0] || fallbackMessage,
    status: context.status,
    details: context.data
  }
}

function classifyBadRequest(
  lowerMessage: string,
  context: FindingsApiErrorContext
): FindingsApiError {
  if (
    lowerMessage.includes('required finding') ||
    lowerMessage.includes('erforderliche finding')
  ) {
    return buildFindingsApiError('required-finding', 'Erforderlicher Befund fehlt.', context)
  }
  if (
    lowerMessage.includes('duplicate') ||
    lowerMessage.includes('already') ||
    lowerMessage.includes('unique_active_finding')
  ) {
    return buildFindingsApiError('duplicate-finding', 'Befund ist bereits vorhanden.', context)
  }
  if (
    lowerMessage.includes('choice') ||
    lowerMessage.includes('classification_choice') ||
    lowerMessage.includes('klassifikation')
  ) {
    return buildFindingsApiError('invalid-choice', 'Ungültige Klassifikationsauswahl.', context)
  }
  if (lowerMessage.includes('finding')) {
    return buildFindingsApiError('invalid-finding', 'Ungültiger Befund.', context)
  }
  return buildFindingsApiError('bad-request', 'Ungültige Anfrage.', context)
}

export function parseFindingsApiError(error: unknown): FindingsApiError {
  const errorRecord = isRecord(error) ? error : {}
  const response = isRecord(errorRecord.response) ? errorRecord.response : {}
  const data = response.data
  const dataRecord = isRecord(data) ? data : {}
  const status = Number(response.status || 0) || undefined
  const explicitCode = String(dataRecord.code || '').trim() as FindingsApiErrorCode
  const errorMessage =
    typeof errorRecord.message === 'string' ? errorRecord.message : 'Unbekannter Fehler'
  const messages = parseMessages(data)
  const context: FindingsApiErrorContext = { data, messages, status }

  if (explicitCode) {
    return buildFindingsApiError(
      explicitCode,
      errorMessage,
      context
    )
  }

  if (status === 404) {
    return buildFindingsApiError('not-found', 'Ressource nicht gefunden.', context)
  }

  if (status === 400) {
    return classifyBadRequest(messages.join(' | ').toLowerCase(), context)
  }

  return buildFindingsApiError('unknown', errorMessage, context)
}

export const findingsApi = {
  async getExaminationFindings(examinationId: number): Promise<Finding[]> {
    const response = await axiosInstance.get(DTYPES_PATHS.examinationFindings(examinationId))
    return normalizeFindings(response.data)
  },

  async getFindingClassifications(findingId: number): Promise<FindingClassification[]> {
    const response = await axiosInstance.get(DTYPES_PATHS.findingClassifications(findingId))
    if (!Array.isArray(response.data)) return []
    return response.data.map(normalizeFindingClassification)
  },

  async getClassificationChoices(classificationId: number): Promise<FindingChoice[]> {
    const response = await axiosInstance.get(DTYPES_PATHS.classificationChoices(classificationId))
    const payload = response.data
    if (Array.isArray(payload)) return payload.map(normalizeFindingChoice)
    return Array.isArray(payload?.choices) ? payload.choices.map(normalizeFindingChoice) : []
  },

  async listPatientFindings(patientExaminationId: number): Promise<PatientFindingRow[]> {
    const response = await axiosInstance.get(DTYPES_PATHS.patientFindings, {
      params: { patient_examination: patientExaminationId }
    })
    return normalizePatientFindingRows(response.data)
  },

  async createPatientFinding(payload: CreatePatientFindingPayload): Promise<PatientFindingRow> {
    const classifications = Array.isArray(payload.classifications) ? payload.classifications : []
    const response = await axiosInstance.post(DTYPES_PATHS.patientFindings, {
      patient_examination: payload.patientExamination,
      finding: payload.finding,
      classifications
    })
    return normalizePatientFindingRow(response.data)
  },

  async updatePatientFinding(
    patientFindingId: number,
    payload: UpdatePatientFindingPayload
  ): Promise<PatientFindingRow> {
    const classifications = Array.isArray(payload.classifications)
      ? payload.classifications
      : undefined
    const response = await axiosInstance.patch(DTYPES_PATHS.patientFindingById(patientFindingId), {
      finding: payload.finding,
      is_active: payload.isActive,
      classifications
    })
    return normalizePatientFindingRow(response.data)
  },

  async deletePatientFinding(patientFindingId: number): Promise<void> {
    await axiosInstance.delete(DTYPES_PATHS.patientFindingById(patientFindingId))
  },

  async replacePatientFindingClassifications(
    patientFindingId: number,
    classifications: ClassificationSelection[]
  ): Promise<PatientFindingRow | null> {
    const response = await axiosInstance.post(
      DTYPES_PATHS.patientFindingClassifications(patientFindingId),
      { replace: true, classifications }
    )
    return normalizePatientFindingRow(response.data)
  }
}
