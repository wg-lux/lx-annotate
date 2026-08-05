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
    dtypesApi(`examinations/${String(examinationId)}/findings/`),
  findingClassifications: (findingId: number) =>
    dtypesApi(`findings/${String(findingId)}/classifications/`),
  classificationChoices: (classificationId: number) =>
    dtypesApi(`classifications/${String(classificationId)}/choices/`),
  patientFindings: dtypesApi('patient-findings/'),
  patientFindingById: (patientFindingId: number) =>
    dtypesApi(`patient-findings/${String(patientFindingId)}/`),
  patientFindingClassifications: (patientFindingId: number) =>
    dtypesApi(`patient-findings/${String(patientFindingId)}/classifications/`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

const FINDINGS_API_ERROR_CODES: readonly FindingsApiErrorCode[] = [
  'required-finding',
  'duplicate-finding',
  'invalid-choice',
  'invalid-finding',
  'bad-request',
  'not-found',
  'unknown'
]

function isFindingsApiErrorCode(value: unknown): value is FindingsApiErrorCode {
  return typeof value === 'string' && FINDINGS_API_ERROR_CODES.some((code) => code === value)
}

function requirePositiveRequestId(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${path} must be a positive integer.`)
  }
  return value
}

function optionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new TypeError(`${path} must be a boolean.`)
  return value
}

function requireSelection(
  selection: ClassificationSelection,
  index: number
): ClassificationSelection {
  return {
    classification: requirePositiveRequestId(
      selection.classification,
      `classifications[${String(index)}].classification`
    ),
    choice: requirePositiveRequestId(selection.choice, `classifications[${String(index)}].choice`)
  }
}

function normalizeSelections(
  selections: ClassificationSelection[] | undefined
): ClassificationSelection[] | undefined {
  if (selections === undefined) return undefined
  if (!Array.isArray(selections)) throw new TypeError('classifications must be an array.')
  return selections.map(requireSelection)
}

function requireArrayPayload(value: unknown, path: string): unknown[] {
  if (Array.isArray(value)) return value
  if (isRecord(value) && Array.isArray(value.results)) return value.results
  throw new TypeError(`${path} must be an array or an object with a results array.`)
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
  if (lowerMessage.includes('required finding') || lowerMessage.includes('erforderliche finding')) {
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
  const status =
    typeof response.status === 'number' && Number.isInteger(response.status)
      ? response.status
      : undefined
  const explicitCode = isFindingsApiErrorCode(dataRecord.code) ? dataRecord.code : undefined
  const errorMessage =
    typeof errorRecord.message === 'string' ? errorRecord.message : 'Unbekannter Fehler'
  const messages = parseMessages(data)
  const context: FindingsApiErrorContext = { data, messages, status }

  if (explicitCode !== undefined) {
    return buildFindingsApiError(explicitCode, errorMessage, context)
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
    const validExaminationId = requirePositiveRequestId(examinationId, 'examinationId')
    const response = await axiosInstance.get<unknown>(
      DTYPES_PATHS.examinationFindings(validExaminationId)
    )
    return normalizeFindings(response.data)
  },

  async getFindingClassifications(findingId: number): Promise<FindingClassification[]> {
    const validFindingId = requirePositiveRequestId(findingId, 'findingId')
    const response = await axiosInstance.get<unknown>(
      DTYPES_PATHS.findingClassifications(validFindingId)
    )
    return requireArrayPayload(response.data, 'Finding classifications response').map(
      (classification, index) =>
        normalizeFindingClassification(classification, `findingClassifications[${String(index)}]`)
    )
  },

  async getClassificationChoices(classificationId: number): Promise<FindingChoice[]> {
    const validClassificationId = requirePositiveRequestId(classificationId, 'classificationId')
    const response = await axiosInstance.get<unknown>(
      DTYPES_PATHS.classificationChoices(validClassificationId)
    )
    const payload = response.data
    if (Array.isArray(payload)) {
      return payload.map((choice, index) =>
        normalizeFindingChoice(choice, `classificationChoices[${String(index)}]`)
      )
    }
    if (!isRecord(payload) || !Array.isArray(payload.choices)) {
      throw new TypeError('Classification choices response does not match the expected contract')
    }
    return payload.choices.map((choice, index) =>
      normalizeFindingChoice(choice, `classificationChoices[${String(index)}]`)
    )
  },

  async listPatientFindings(patientExaminationId: number): Promise<PatientFindingRow[]> {
    const validPatientExaminationId = requirePositiveRequestId(
      patientExaminationId,
      'patientExaminationId'
    )
    const response = await axiosInstance.get<unknown>(DTYPES_PATHS.patientFindings, {
      params: { patient_examination: validPatientExaminationId }
    })
    return normalizePatientFindingRows(response.data)
  },

  async createPatientFinding(payload: CreatePatientFindingPayload): Promise<PatientFindingRow> {
    const classifications = normalizeSelections(payload.classifications) ?? []
    const response = await axiosInstance.post<unknown>(DTYPES_PATHS.patientFindings, {
      patientExamination: requirePositiveRequestId(
        payload.patientExamination,
        'payload.patientExamination'
      ),
      finding: requirePositiveRequestId(payload.finding, 'payload.finding'),
      classifications: classifications
    })
    return normalizePatientFindingRow(response.data)
  },

  async updatePatientFinding(
    patientFindingId: number,
    payload: UpdatePatientFindingPayload
  ): Promise<PatientFindingRow> {
    const validPatientFindingId = requirePositiveRequestId(patientFindingId, 'patientFindingId')
    const classifications = normalizeSelections(payload.classifications)
    const response = await axiosInstance.patch<unknown>(
      DTYPES_PATHS.patientFindingById(validPatientFindingId),
      {
        finding:
          payload.finding === undefined
            ? undefined
            : requirePositiveRequestId(payload.finding, 'payload.finding'),
        isActive: optionalBoolean(payload.isActive, 'payload.isActive'),
        classifications
      }
    )
    return normalizePatientFindingRow(response.data)
  },

  async deletePatientFinding(patientFindingId: number): Promise<void> {
    await axiosInstance.delete(
      DTYPES_PATHS.patientFindingById(
        requirePositiveRequestId(patientFindingId, 'patientFindingId')
      )
    )
  },

  async replacePatientFindingClassifications(
    patientFindingId: number,
    classifications: ClassificationSelection[]
  ): Promise<PatientFindingRow> {
    const validPatientFindingId = requirePositiveRequestId(patientFindingId, 'patientFindingId')
    const response = await axiosInstance.post<unknown>(
      DTYPES_PATHS.patientFindingClassifications(validPatientFindingId),
      { replace: true, classifications: normalizeSelections(classifications) }
    )
    return normalizePatientFindingRow(response.data)
  }
}
