import axiosInstance, { dtypesApi, endoregApi } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
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

export type FindingsBackendMode = 'endoreg' | 'dtypes_read' | 'dtypes'

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

const ENDOREG_PATHS = {
  findings: endoregApi(endpoints.router.findings),
  examinationFindings: (examinationId: number) =>
    endoregApi(endpoints.examination.examinationFindings(examinationId)),
  findingClassifications: (findingId: number) =>
    endoregApi(endpoints.examination.findingClassifications(findingId)),
  classificationChoices: (classificationId: number) =>
    endoregApi(endpoints.examination.classificationChoices(classificationId)),
  patientFindings: endoregApi(endpoints.patient.patientFindings),
  patientFindingById: (patientFindingId: number) =>
    endoregApi(endpoints.patient.patientFindingById(patientFindingId))
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

function normalizeMode(value: unknown): FindingsBackendMode {
  if (value === 'dtypes' || value === 'dtypes_read' || value === 'endoreg') {
    return value
  }
  return 'endoreg'
}

export function getFindingsBackendMode(): FindingsBackendMode {
  return normalizeMode(import.meta.env.VITE_FINDINGS_BACKEND)
}

function useDtypesRead(mode: FindingsBackendMode): boolean {
  return mode === 'dtypes' || mode === 'dtypes_read'
}

function useDtypesWrite(mode: FindingsBackendMode): boolean {
  return mode === 'dtypes'
}

function parseMessages(data: any): string[] {
  if (!data) return []
  if (typeof data === 'string') return data.trim() ? [data] : []
  if (typeof data?.message === 'string' && data.message.trim()) return [data.message]
  if (typeof data?.detail === 'string' && data.detail.trim()) return [data.detail]

  const messages: string[] = []
  if (typeof data === 'object' && !Array.isArray(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length) {
        messages.push(`${key}: ${value.join(', ')}`)
      } else if (typeof value === 'string' && value.trim()) {
        messages.push(`${key}: ${value}`)
      }
    }
  }
  return messages
}

export function parseFindingsApiError(error: any): FindingsApiError {
  const status = Number(error?.response?.status || 0) || undefined
  const data = error?.response?.data
  const explicitCode = String(data?.code || '').trim() as FindingsApiErrorCode
  const messages = parseMessages(data)
  const lowerMessage = messages.join(' | ').toLowerCase()

  if (explicitCode) {
    return {
      code: explicitCode,
      message: messages[0] || error?.message || 'Unbekannter Fehler',
      status,
      details: data
    }
  }

  if (status === 404) {
    return {
      code: 'not-found',
      message: messages[0] || 'Ressource nicht gefunden.',
      status,
      details: data
    }
  }

  if (status === 400) {
    if (
      lowerMessage.includes('required finding') ||
      lowerMessage.includes('erforderliche finding')
    ) {
      return {
        code: 'required-finding',
        message: messages[0] || 'Erforderlicher Befund fehlt.',
        status,
        details: data
      }
    }
    if (
      lowerMessage.includes('duplicate') ||
      lowerMessage.includes('already') ||
      lowerMessage.includes('unique_active_finding')
    ) {
      return {
        code: 'duplicate-finding',
        message: messages[0] || 'Befund ist bereits vorhanden.',
        status,
        details: data
      }
    }
    if (
      lowerMessage.includes('choice') ||
      lowerMessage.includes('classification_choice') ||
      lowerMessage.includes('klassifikation')
    ) {
      return {
        code: 'invalid-choice',
        message: messages[0] || 'Ungültige Klassifikationsauswahl.',
        status,
        details: data
      }
    }
    if (lowerMessage.includes('finding')) {
      return {
        code: 'invalid-finding',
        message: messages[0] || 'Ungültiger Befund.',
        status,
        details: data
      }
    }
    return {
      code: 'bad-request',
      message: messages[0] || 'Ungültige Anfrage.',
      status,
      details: data
    }
  }

  return {
    code: 'unknown',
    message: messages[0] || error?.message || 'Unbekannter Fehler',
    status,
    details: data
  }
}

async function setClassificationsViaDtypes(
  patientFindingId: number,
  classifications: ClassificationSelection[]
): Promise<void> {
  await axiosInstance.post(DTYPES_PATHS.patientFindingClassifications(patientFindingId), {
    replace: true,
    classifications
  })
}

export const findingsApi = {
  getBackendMode(): FindingsBackendMode {
    return getFindingsBackendMode()
  },

  async listFindings(): Promise<Finding[]> {
    const response = await axiosInstance.get(ENDOREG_PATHS.findings)
    return normalizeFindings(response.data)
  },

  async getExaminationFindings(examinationId: number): Promise<Finding[]> {
    const mode = getFindingsBackendMode()
    const path = useDtypesRead(mode)
      ? DTYPES_PATHS.examinationFindings(examinationId)
      : ENDOREG_PATHS.examinationFindings(examinationId)
    const response = await axiosInstance.get(path)
    return normalizeFindings(response.data)
  },

  async getFindingClassifications(findingId: number): Promise<FindingClassification[]> {
    const mode = getFindingsBackendMode()
    const path = useDtypesRead(mode)
      ? DTYPES_PATHS.findingClassifications(findingId)
      : ENDOREG_PATHS.findingClassifications(findingId)
    const response = await axiosInstance.get(path)
    if (!Array.isArray(response.data)) return []
    return response.data.map(normalizeFindingClassification)
  },

  async getClassificationChoices(classificationId: number): Promise<FindingChoice[]> {
    const mode = getFindingsBackendMode()
    const path = useDtypesRead(mode)
      ? DTYPES_PATHS.classificationChoices(classificationId)
      : ENDOREG_PATHS.classificationChoices(classificationId)
    const response = await axiosInstance.get(path)
    const payload = response.data
    if (Array.isArray(payload)) return payload.map(normalizeFindingChoice)
    return Array.isArray(payload?.choices) ? payload.choices.map(normalizeFindingChoice) : []
  },

  async listPatientFindings(patientExaminationId: number): Promise<PatientFindingRow[]> {
    const mode = getFindingsBackendMode()
    const basePath = useDtypesWrite(mode)
      ? DTYPES_PATHS.patientFindings
      : ENDOREG_PATHS.patientFindings
    const response = await axiosInstance.get(basePath, {
      params: { patient_examination: patientExaminationId }
    })
    return normalizePatientFindingRows(response.data)
  },

  async createPatientFinding(payload: CreatePatientFindingPayload): Promise<PatientFindingRow> {
    const mode = getFindingsBackendMode()
    const classifications = Array.isArray(payload.classifications)
      ? payload.classifications
      : []

    if (useDtypesWrite(mode)) {
      const response = await axiosInstance.post(DTYPES_PATHS.patientFindings, {
        patient_examination: payload.patientExamination,
        finding: payload.finding,
        classifications
      })
      return normalizePatientFindingRow(response.data)
    }

    // Endoreg-safe path:
    // 1) create finding on the endoreg API
    // 2) write classifications via dedicated dtypes API route
    const createRes = await axiosInstance.post(ENDOREG_PATHS.patientFindings, {
      patientExamination: payload.patientExamination,
      finding: payload.finding
    })
    const created = normalizePatientFindingRow(createRes.data)
    const createdId = Number(created?.id)
    if (Number.isFinite(createdId) && classifications.length > 0) {
      await setClassificationsViaDtypes(createdId, classifications)
    }
    return created
  },

  async updatePatientFinding(
    patientFindingId: number,
    payload: UpdatePatientFindingPayload
  ): Promise<PatientFindingRow> {
    const mode = getFindingsBackendMode()
    const classifications = Array.isArray(payload.classifications)
      ? payload.classifications
      : undefined

    if (useDtypesWrite(mode)) {
      const response = await axiosInstance.patch(
        DTYPES_PATHS.patientFindingById(patientFindingId),
        {
          finding: payload.finding,
          is_active: payload.isActive,
          classifications
        }
      )
      return normalizePatientFindingRow(response.data)
    }

    const patchPayload: Record<string, unknown> = {}
    if (typeof payload.finding === 'number') patchPayload.finding = payload.finding
    if (typeof payload.isActive === 'boolean') patchPayload.isActive = payload.isActive
    const response = await axiosInstance.patch(
      ENDOREG_PATHS.patientFindingById(patientFindingId),
      patchPayload
    )
    if (classifications) {
      await setClassificationsViaDtypes(patientFindingId, classifications)
    }
    return normalizePatientFindingRow(response.data)
  },

  async deletePatientFinding(patientFindingId: number): Promise<void> {
    const mode = getFindingsBackendMode()
    const path = useDtypesWrite(mode)
      ? DTYPES_PATHS.patientFindingById(patientFindingId)
      : ENDOREG_PATHS.patientFindingById(patientFindingId)
    await axiosInstance.delete(path)
  },

  async replacePatientFindingClassifications(
    patientFindingId: number,
    classifications: ClassificationSelection[]
  ): Promise<PatientFindingRow | null> {
    const mode = getFindingsBackendMode()
    if (useDtypesWrite(mode)) {
      const response = await axiosInstance.post(
        DTYPES_PATHS.patientFindingClassifications(patientFindingId),
        { replace: true, classifications }
      )
      return normalizePatientFindingRow(response.data)
    }
    await setClassificationsViaDtypes(patientFindingId, classifications)
    return null
  }
}
