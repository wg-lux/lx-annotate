import type { SegmentAnnotationStatus } from '@/stores/videoStore'

export type VideoDropdownStatus =
  | 'not_usable'
  | 'pending_anonymization_validation'
  | 'ready_for_annotation'
  | 'annotation_cleanup_pending'
  | 'annotation_cleanup_failed'
  | 'annotation_validated'

export type VideoDropdownFilter = 'all' | 'usable' | VideoDropdownStatus

export const getAgeFromDob = (
  rawDob: string | null | undefined,
  today: Date = new Date()
): number | null => {
  if (!rawDob) return null
  const trimmed = rawDob.trim()
  if (!trimmed) return null

  let dob = new Date(trimmed)
  if (Number.isNaN(dob.getTime())) {
    const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (!deMatch) return null
    const [, day, month, year] = deMatch
    dob = new Date(Number(year), Number(month) - 1, Number(day))
  }
  if (Number.isNaN(dob.getTime())) return null

  let age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? age : null
}

export const normalizeGenderLabel = (value: string | null | undefined): string => {
  if (!value) return 'Unbekannt'
  const normalized = value.toLowerCase()
  if (normalized === 'male' || normalized === 'männlich') return 'Männlich'
  if (normalized === 'female' || normalized === 'weiblich') return 'Weiblich'
  if (normalized === 'diverse') return 'Divers'
  return value
}

export const normalizeValidatedAnnotators = (annotators: readonly unknown[]): string[] =>
  [...new Set(annotators.map((annotator) => String(annotator).trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b)
  )

export const getValidatedAnnotatorLabel = (
  annotators: readonly string[],
  activeAnnotatorPrincipal: string
): string => {
  if (!annotators.length) return ''
  const hasOtherAnnotator = annotators.some((annotator) => annotator !== activeAnnotatorPrincipal)
  return `${hasOtherAnnotator ? 'Vorannotation von' : 'Validiert von'}: ${annotators.join(', ')}`
}

export const resolveVideoDropdownStatus = ({
  canViewProcessedVideo,
  segmentAnnotationStatus,
  isAnonymizationValidated
}: {
  canViewProcessedVideo: boolean
  segmentAnnotationStatus: SegmentAnnotationStatus
  isAnonymizationValidated: boolean
}): VideoDropdownStatus => {
  if (!canViewProcessedVideo) return 'not_usable'
  if (
    segmentAnnotationStatus === 'cleanup_queued' ||
    segmentAnnotationStatus === 'cleanup_running'
  ) {
    return 'annotation_cleanup_pending'
  }
  if (
    segmentAnnotationStatus === 'cleanup_failed' ||
    segmentAnnotationStatus === 'cleanup_required'
  ) {
    return 'annotation_cleanup_failed'
  }
  if (segmentAnnotationStatus === 'validated') return 'annotation_validated'
  return isAnonymizationValidated ? 'ready_for_annotation' : 'pending_anonymization_validation'
}

export const getVideoDropdownStatusText = (
  status: VideoDropdownStatus,
  anonymizationStatusText = ''
): string => {
  if (status === 'not_usable') return `Noch nicht nutzbar: ${anonymizationStatusText}`
  if (status === 'annotation_validated') return 'Video bereits validiert'
  if (status === 'annotation_cleanup_pending') return 'Segmentvalidierung läuft'
  if (status === 'annotation_cleanup_failed') return 'Segmentvalidierung prüfen'
  if (status === 'ready_for_annotation') return 'Video startklar für Befundung!'
  return 'Zurück zu Schritt 1 - Anonymisierung validieren'
}

export const getVideoDropdownStatusBadgeClass = (status: VideoDropdownStatus): string => {
  if (status === 'not_usable') return 'badge-unusable'
  if (status === 'annotation_validated') return 'badge-validated'
  if (status === 'annotation_cleanup_pending') return 'badge-cleanup'
  if (status === 'ready_for_annotation') return 'badge-ready'
  return 'badge-pending'
}

export const getVideoDropdownItemClass = (status: VideoDropdownStatus): string => {
  if (status === 'not_usable') return 'video-dropdown-item-unusable'
  if (status === 'annotation_validated') return 'video-dropdown-item-validated'
  if (status === 'annotation_cleanup_pending') return 'video-dropdown-item-cleanup'
  if (status === 'ready_for_annotation') return 'video-dropdown-item-ready'
  return 'video-dropdown-item-pending'
}
