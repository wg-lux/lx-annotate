import type { PatientCase } from '@/api/casesApi'
import type { ReportConceptCoverageStatus } from '@/utils/reportConceptCoverage'
import type { StreamableVideoFileType } from '@/utils/mediaUrls'

export interface PatientExaminationOption {
  id: number
  label: string
  examinationName: string
  examinationDisplayName: string
  patientId: number | null
  examinationId: number | null
}

export type FindingStatus = 'complete' | 'warning' | 'missing' | 'empty'

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const firstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export const isVideoArtifactKind = (
  value: string | null | undefined
): value is StreamableVideoFileType => value === 'raw' || value === 'processed'

export const preferredArtifactKind = (
  options: Array<{ type: string }>
): StreamableVideoFileType | null => {
  if (options.some((option) => option.type === 'processed')) return 'processed'
  if (options.some((option) => option.type === 'raw')) return 'raw'
  return null
}

export const normalizeKnowledgeKey = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')

export const formatKnowledgeName = (value: string): string => {
  const normalized = value.replace(/[_-]/g, ' ').trim()
  if (!normalized) return 'Unbenannt'
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

export const formatDateLabel = (value: string | null | undefined): string | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('de-DE')
}

export const findingStatusLabel = (status: FindingStatus, required: boolean): string => {
  if (status === 'complete') return 'vollständig'
  if (status === 'warning') return 'prüfen'
  if (status === 'missing') return 'fehlt'
  return required ? 'offen' : 'optional'
}

export const findingStatusIconClass = (status: FindingStatus): string => {
  if (status === 'complete') return 'ni ni-check-bold'
  if (status === 'warning') return 'ni ni-alert-circle-exc'
  if (status === 'missing') return 'ni ni-fat-remove'
  return 'ni ni-fat-add'
}

export const conceptCoverageStatusLabel = (status: ReportConceptCoverageStatus): string => {
  if (status === 'present') return 'nachgewiesen'
  if (status === 'missing') return 'fehlt'
  if (status === 'not_applicable') return 'nicht anwendbar'
  if (status === 'invalid') return 'ungültig'
  return 'ungeklärt'
}

export const conceptCoverageStatusTone = (status: ReportConceptCoverageStatus): string => {
  if (status === 'present' || status === 'not_applicable') return 'success'
  if (status === 'missing' || status === 'invalid') return 'danger'
  return 'warning'
}

export const extractStringList = (value: unknown): string[] => {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim()
      if (!entry || typeof entry !== 'object') return ''
      const record = entry as Record<string, unknown>
      return (
        (typeof record.label === 'string' && record.label.trim()) ||
        (typeof record.message === 'string' && record.message.trim()) ||
        (typeof record.action === 'string' && record.action.trim()) ||
        ''
      )
    })
    .filter((entry): entry is string => Boolean(entry))
}

export const normalizePatientExaminationOption = (
  raw: unknown
): PatientExaminationOption | null => {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const examination = readRecord(row.examination)
  const patient = readRecord(row.patient)
  const patientData = readRecord(row.patient_data)
  const camelPatientData = readRecord(row.patientData)
  const id = toPositiveInteger(row.id)
  if (id === null) return null
  const examinationName =
    firstNonEmptyString(
      examination.name,
      row.examination_name,
      row.examinationName,
      row.examination
    ) || 'Untersuchung'
  const examinationDisplayName =
    firstNonEmptyString(examination.nameDe, examination.name_de) || examinationName
  const dateStartRaw =
    typeof row.date_start === 'string'
      ? row.date_start
      : typeof row.dateStart === 'string'
        ? row.dateStart
        : ''
  const dateLabel = dateStartRaw ? new Date(dateStartRaw).toLocaleDateString('de-DE') : ''
  return {
    id,
    label: dateLabel ? `${examinationDisplayName} · ${dateLabel}` : examinationDisplayName,
    examinationName,
    examinationDisplayName,
    patientId: toPositiveInteger(
      patient.id ?? patientData.id ?? camelPatientData.id ?? row.patient_id ?? row.patientId
    ),
    examinationId: toPositiveInteger(examination.id ?? row.examination_id ?? row.examinationId)
  }
}

export const isGastroenterologyExaminationName = (value: string): boolean => {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return false
  return [
    'gastro',
    'kolon',
    'colon',
    'colo',
    'rekt',
    'rect',
    'endoskop',
    'endoscop',
    'gastroskop',
    'gastroscop',
    'koloskop',
    'colonoscop',
    'colonoscopy',
    'magen',
    'darm',
    'duoden',
    'sigmo',
    'procto',
    'ösoph',
    'oesoph',
    'esoph',
    'egd',
    'ercp',
    'eus',
    'upper gi',
    'lower gi'
  ].some((keyword) => normalized.includes(keyword))
}

export const formatCaseLabel = (patientCase: PatientCase): string => {
  const admissionDate = formatDateLabel(patientCase.admissionDate)
  const leaveDate = formatDateLabel(patientCase.leaveDate)
  const period = [admissionDate, leaveDate].filter(Boolean).join(' – ')
  const status = patientCase.isClosed ? 'geschlossen' : patientCase.isActive ? 'aktiv' : 'inaktiv'
  return [period || 'Zeitraum nicht angegeben', status].join(' · ')
}
