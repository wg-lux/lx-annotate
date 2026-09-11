import type { MediaScope } from '@/stores/mediaTypeStore'
import type { VideoAnonymizationModel } from '@/types/anonymizationPipeline'

export interface DocumentTypeOption {
  value: string
  label: string
}

export interface PatientExaminationOption {
  id: number
  label: string
}

export type CaseLinkageStatus = 'not_linked' | 'suggested' | 'linked' | 'deferred'

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export const normalizeDocumentTypeOptions = (raw: unknown): DocumentTypeOption[] => {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((entry) => {
      if (typeof entry === 'string') {
        return { value: entry, label: entry }
      }
      if (!entry || typeof entry !== 'object') {
        return null
      }
      const option = entry as Record<string, unknown>
      return typeof option.value === 'string' && typeof option.label === 'string'
        ? { value: option.value, label: option.label }
        : null
    })
    .filter((entry): entry is DocumentTypeOption => entry !== null)
}

export const normalizePatientExaminationOption = (
  raw: unknown
): PatientExaminationOption | null => {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const examinationRecord = raw as Record<string, unknown>
  const examinationId = toPositiveInteger(examinationRecord.id)
  if (examinationId === null) {
    return null
  }

  const examinationName =
    (typeof examinationRecord.examination_name === 'string' &&
      examinationRecord.examination_name.trim()) ||
    (typeof examinationRecord.examination === 'string' && examinationRecord.examination.trim()) ||
    'Untersuchung'
  const dateStartRaw =
    typeof examinationRecord.date_start === 'string' ? examinationRecord.date_start : ''
  const dateStart = dateStartRaw ? dateStartRaw.split('T')[0] : ''
  return {
    id: examinationId,
    label: dateStart
      ? `#${String(examinationId)} · ${examinationName} · ${dateStart}`
      : `#${String(examinationId)} · ${examinationName}`
  }
}

export const resolveCaseLinkageStatus = ({
  matchStatus,
  linkedPatientExaminationId,
  currentPatientExaminationId,
  hasLinkageHints
}: {
  matchStatus: unknown
  linkedPatientExaminationId: unknown
  currentPatientExaminationId: unknown
  hasLinkageHints: boolean
}): CaseLinkageStatus => {
  if (matchStatus === 'linked') {
    return 'linked'
  }
  if (matchStatus === 'deferred') {
    return 'deferred'
  }
  if (matchStatus === 'suggested') {
    return 'suggested'
  }
  if (matchStatus === 'unresolved') {
    return 'not_linked'
  }
  if (linkedPatientExaminationId || currentPatientExaminationId) {
    return 'linked'
  }
  return hasLinkageHints ? 'suggested' : 'not_linked'
}

export const caseLinkageStatusLabel = (status: CaseLinkageStatus): string =>
  ({
    not_linked: 'Nicht verknuepft',
    suggested: 'Vorgeschlagen',
    linked: 'Verknuepft',
    deferred: 'Zurueckgestellt'
  })[status]

export const caseLinkageStatusBadgeClass = (status: CaseLinkageStatus): string =>
  ({
    not_linked: 'bg-secondary',
    suggested: 'bg-warning text-dark',
    linked: 'bg-success',
    deferred: 'bg-info text-dark'
  })[status]

export const caseLinkageStatusDescription = (
  status: CaseLinkageStatus,
  context: {
    isAutoResolved?: boolean | null
    matchStatus?: unknown
    suggestedMatchCount?: number | null
  }
): string => {
  if (status === 'linked') {
    return context.isAutoResolved
      ? 'Der Patientenfall wurde automatisch aus den validierten Metadaten zugeordnet.'
      : 'Eine bestehende Fallverknuepfung ist bereits vorhanden.'
  }
  if (status === 'deferred') {
    return 'Die Fallzuordnung wurde bewusst vertagt und kann spaeter abgeschlossen werden.'
  }
  if (context.matchStatus === 'suggested' && (context.suggestedMatchCount ?? 0) > 1) {
    return 'Mehrere passende PatientExaminations wurden gefunden. Eine explizite Auswahl ist spaeter erforderlich.'
  }
  if (context.matchStatus === 'suggested' && (context.suggestedMatchCount ?? 0) === 1) {
    return 'Eine passende PatientExamination wurde vorgeschlagen, ist aber noch nicht final bestaetigt.'
  }
  if (status === 'suggested') {
    return 'Hash- oder Pseudo-Patient-Hinweise sind vorhanden, die Zuordnung ist aber noch nicht final.'
  }
  return 'Derzeit liegt noch keine erkennbare Fallverknuepfung vor.'
}

export const formatPseudoPatient = (id: number | null, matchCount?: number | null): string => {
  if (id === null) {
    return 'Nicht verknuepft'
  }
  return typeof matchCount === 'number' && matchCount > 0
    ? `#${String(id)} (${String(matchCount)} Treffer)`
    : `#${String(id)}`
}

export const formatPatientExamination = (
  linkedId: number | null,
  recommendedId?: number | null
): string => {
  if (linkedId !== null) {
    return `#${String(linkedId)}`
  }
  return typeof recommendedId === 'number' && recommendedId > 0
    ? `Vorschlag: #${String(recommendedId)}`
    : 'Noch keine Zuordnung'
}

type ValidationMediaScope = MediaScope | null

export const formatValidationFileId = (
  fileId: number | null,
  scope: ValidationMediaScope
): string => {
  if (fileId === null) {
    return ''
  }
  const prefix =
    scope === null
      ? 'Datei'
      : { video: 'Video', pdf: 'PDF', meta: 'Datei', unknown: 'Datei' }[scope]
  return `${prefix}-ID: ${String(fileId)}`
}

export const buildValidationReturnPath = (
  fileId: number | null,
  scope: ValidationMediaScope
): string =>
  fileId !== null && scope
    ? `/anonymisierung/validierung?fileId=${String(fileId)}&mediaType=${scope}`
    : '/anonymisierung/validierung'

export const validationFileQuery = (
  fileId: number | null,
  scope: ValidationMediaScope
): Record<string, string> => ({
  ...(fileId === null ? {} : { fileId: String(fileId) }),
  ...(scope === null ? {} : { mediaType: scope })
})

export const formatAnonymizationModel = (model?: VideoAnonymizationModel | null): string => {
  const identity = [model?.name, model?.version].filter(Boolean).join(' ')
  const checksum = model?.sha256 ? `SHA-256 ${model.sha256.slice(0, 12)}…` : ''
  return [identity, checksum].filter(Boolean).join(' · ') || 'Nicht gemeldet'
}
