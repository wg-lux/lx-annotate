export type ReportListRow = {
  id: number
  status?: string | null
  version?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  renderedText?: string | null
  templateName?: string | null
  patientExaminationId?: number | null
  patientExamination?: number | { id?: number } | null
  patientExaminationFk?: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const optionalNumber = (value: unknown, field: string): number | null | undefined => {
  if (value === undefined || value === null) return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new TypeError(`Report list field "${field}" must be a finite number or null.`)
}

const optionalString = (value: unknown, field: string): string | null | undefined => {
  if (value === undefined || value === null) return value
  if (typeof value === 'string') return value
  throw new TypeError(`Report list field "${field}" must be a string or null.`)
}

const parsePatientExamination = (value: unknown): ReportListRow['patientExamination'] => {
  if (value === undefined || value === null) return value
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (isRecord(value)) {
    const id = optionalNumber(value.id, 'patientExamination.id')
    if (typeof id === 'number' && Number.isInteger(id) && id > 0) return { id }
  }
  throw new TypeError(
    'Report list field "patientExamination" must contain a positive integer id or be null.'
  )
}

const parseReportListRow = (value: unknown, index: number): ReportListRow => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    !Number.isInteger(value.id) ||
    value.id <= 0
  ) {
    throw new TypeError(`Report list entry ${String(index)} must contain a positive integer id.`)
  }
  return {
    id: value.id,
    status: optionalString(value.status, 'status'),
    version: optionalNumber(value.version, 'version'),
    createdAt: optionalString(value.createdAt, 'createdAt'),
    updatedAt: optionalString(value.updatedAt, 'updatedAt'),
    renderedText: optionalString(value.renderedText, 'renderedText'),
    templateName: optionalString(value.templateName, 'templateName'),
    patientExaminationId: optionalNumber(value.patientExaminationId, 'patientExaminationId'),
    patientExamination: parsePatientExamination(value.patientExamination),
    patientExaminationFk: optionalNumber(value.patientExaminationFk, 'patientExaminationFk')
  }
}

export const parseReportListPayload = (payload: unknown): ReportListRow[] => {
  const candidateRows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.results)
      ? payload.results
      : null

  if (!candidateRows) {
    throw new TypeError('Report list response must be an array or contain an array in "results".')
  }

  return candidateRows.map((value: unknown, index: number) => parseReportListRow(value, index))
}
