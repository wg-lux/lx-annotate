import axiosInstance from '@/api/axiosInstance'

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

export interface ClassificationSelection {
  classification: number
  choice: number
}

export interface PatientFindingRow {
  id: number
  patientExamination: number
  finding: number | { id: number }
  isActive?: boolean
  classifications?: Array<
    | number
    | {
        id?: number
        classification?: number
        classificationChoice?: number
        classificationId?: number
        classificationChoiceId?: number
      }
  >
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
  examinationFindings: (examinationId: number) => `/api/examinations/${examinationId}/findings/`,
  findingClassifications: (findingId: number) => `/api/findings/${findingId}/classifications/`,
  classificationChoices: (classificationId: number) =>
    `/api/classifications/${classificationId}/choices/`,
  patientFindings: '/api/patient-findings/',
  patientFindingById: (patientFindingId: number) => `/api/patient-findings/${patientFindingId}/`
}

const DTYPES_PATHS = {
  examinationFindings: (examinationId: number) =>
    `/base_api/examinations/${examinationId}/findings/`,
  findingClassifications: (findingId: number) =>
    `/base_api/findings/${findingId}/classifications/`,
  classificationChoices: (classificationId: number) =>
    `/base_api/classifications/${classificationId}/choices/`,
  patientFindings: '/base_api/patient-findings/',
  patientFindingById: (patientFindingId: number) =>
    `/base_api/patient-findings/${patientFindingId}/`,
  patientFindingClassifications: (patientFindingId: number) =>
    `/base_api/patient-findings/${patientFindingId}/classifications/`
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

function normalizeRows(value: unknown): PatientFindingRow[] {
  const rows = Array.isArray((value as any)?.results)
    ? (value as any).results
    : Array.isArray(value)
      ? value
      : []
  return rows as PatientFindingRow[]
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

  async getExaminationFindings(examinationId: number): Promise<any[]> {
    const mode = getFindingsBackendMode()
    const path = useDtypesRead(mode)
      ? DTYPES_PATHS.examinationFindings(examinationId)
      : ENDOREG_PATHS.examinationFindings(examinationId)
    const response = await axiosInstance.get(path)
    return Array.isArray(response.data) ? response.data : []
  },

  async getFindingClassifications(findingId: number): Promise<any[]> {
    const mode = getFindingsBackendMode()
    const path = useDtypesRead(mode)
      ? DTYPES_PATHS.findingClassifications(findingId)
      : ENDOREG_PATHS.findingClassifications(findingId)
    const response = await axiosInstance.get(path)
    return Array.isArray(response.data) ? response.data : []
  },

  async getClassificationChoices(classificationId: number): Promise<any[]> {
    const mode = getFindingsBackendMode()
    const path = useDtypesRead(mode)
      ? DTYPES_PATHS.classificationChoices(classificationId)
      : ENDOREG_PATHS.classificationChoices(classificationId)
    const response = await axiosInstance.get(path)
    const payload = response.data
    if (Array.isArray(payload)) return payload
    return Array.isArray(payload?.choices) ? payload.choices : []
  },

  async listPatientFindings(patientExaminationId: number): Promise<PatientFindingRow[]> {
    const mode = getFindingsBackendMode()
    const basePath = useDtypesWrite(mode)
      ? DTYPES_PATHS.patientFindings
      : ENDOREG_PATHS.patientFindings
    const response = await axiosInstance.get(basePath, {
      params: { patient_examination: patientExaminationId }
    })
    return normalizeRows(response.data)
  },

  async createPatientFinding(payload: CreatePatientFindingPayload): Promise<PatientFindingRow> {
    const mode = getFindingsBackendMode()
    const classifications = Array.isArray(payload.classifications)
      ? payload.classifications
      : []

    if (useDtypesWrite(mode)) {
      const response = await axiosInstance.post(DTYPES_PATHS.patientFindings, {
        patientExamination: payload.patientExamination,
        finding: payload.finding,
        classifications
      })
      return response.data as PatientFindingRow
    }

    // Endoreg-safe path:
    // 1) create finding on /api
    // 2) write classifications via dedicated /base_api route
    const createRes = await axiosInstance.post(ENDOREG_PATHS.patientFindings, {
      patientExamination: payload.patientExamination,
      finding: payload.finding
    })
    const created = createRes.data as PatientFindingRow
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
          isActive: payload.isActive,
          classifications
        }
      )
      return response.data as PatientFindingRow
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
    return response.data as PatientFindingRow
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
      return response.data as PatientFindingRow
    }
    await setClassificationsViaDtypes(patientFindingId, classifications)
    return null
  }
}
