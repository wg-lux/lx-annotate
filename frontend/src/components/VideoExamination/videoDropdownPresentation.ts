import type { SegmentAnnotationStatus } from '@/stores/videoStore'

export type VideoDropdownStatus =
  | 'not_usable'
  | 'pending_anonymization_validation'
  | 'ready_for_annotation'
  | 'annotation_cleanup_pending'
  | 'annotation_cleanup_failed'
  | 'annotation_validated'

export type VideoDropdownFilter = 'all' | 'usable' | VideoDropdownStatus

const parseBirthDate = (value: string): Date | null => {
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed
  const deMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!deMatch) return null
  const [, day, month, year] = deMatch
  const localized = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(localized.getTime()) ? null : localized
}

const birthdayOccurredThisYear = (birthDate: Date, today: Date): boolean => {
  const monthDelta = today.getMonth() - birthDate.getMonth()
  return monthDelta > 0 || (monthDelta === 0 && today.getDate() >= birthDate.getDate())
}

export const getAgeFromDob = (
  rawDob: string | null | undefined,
  today: Date = new Date()
): number | null => {
  if (!rawDob) {
    return null
  }
  const trimmed = rawDob.trim()
  if (!trimmed) {
    return null
  }

  const birthDate = parseBirthDate(trimmed)
  if (!birthDate) return null
  const ageThisYear = today.getFullYear() - birthDate.getFullYear()
  const patientAge = ageThisYear - (birthdayOccurredThisYear(birthDate, today) ? 0 : 1)
  return patientAge >= 0 ? patientAge : null
}

export const normalizeGenderLabel = (value: string | null | undefined): string => {
  if (!value) {
    return 'Unbekannt'
  }
  const normalized = value.toLowerCase()
  if (normalized === 'male' || normalized === 'männlich') {
    return 'Männlich'
  }
  if (normalized === 'female' || normalized === 'weiblich') {
    return 'Weiblich'
  }
  if (normalized === 'diverse') {
    return 'Divers'
  }
  return value
}

export const normalizeValidatedAnnotators = (annotators: readonly unknown[]): string[] =>
  [...new Set(annotators.map((annotator) => String(annotator).trim()).filter(Boolean))].sort(
    (firstAnnotator, secondAnnotator) => firstAnnotator.localeCompare(secondAnnotator)
  )

export const getValidatedAnnotatorLabel = (
  annotators: readonly string[],
  activeAnnotatorPrincipal: string
): string => {
  if (!annotators.length) {
    return ''
  }
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
  if (!canViewProcessedVideo) {
    return 'not_usable'
  }
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
  if (segmentAnnotationStatus === 'validated') {
    return 'annotation_validated'
  }
  return isAnonymizationValidated ? 'ready_for_annotation' : 'pending_anonymization_validation'
}

interface DropdownPresentation {
  text: string
  badgeClass: string
  itemClass: string
}

const dropdownPresentation: Record<VideoDropdownStatus, DropdownPresentation> = {
  not_usable: {
    text: 'Noch nicht nutzbar',
    badgeClass: 'badge-unusable',
    itemClass: 'video-dropdown-item-unusable'
  },
  pending_anonymization_validation: {
    text: 'Zurück zu Schritt 1 - Anonymisierung validieren',
    badgeClass: 'badge-pending',
    itemClass: 'video-dropdown-item-pending'
  },
  ready_for_annotation: {
    text: 'Video startklar für Dokumentation!',
    badgeClass: 'badge-ready',
    itemClass: 'video-dropdown-item-ready'
  },
  annotation_cleanup_pending: {
    text: 'Segmentvalidierung läuft',
    badgeClass: 'badge-cleanup',
    itemClass: 'video-dropdown-item-cleanup'
  },
  annotation_cleanup_failed: {
    text: 'Segmentvalidierung prüfen',
    badgeClass: 'badge-pending',
    itemClass: 'video-dropdown-item-pending'
  },
  annotation_validated: {
    text: 'Video bereits validiert',
    badgeClass: 'badge-validated',
    itemClass: 'video-dropdown-item-validated'
  }
}

export const getVideoDropdownStatusText = (
  status: VideoDropdownStatus,
  anonymizationStatusText = ''
): string => {
  const presentation = dropdownPresentation[status]
  return status === 'not_usable'
    ? `${presentation.text}: ${anonymizationStatusText}`
    : presentation.text
}

export const getVideoDropdownStatusBadgeClass = (status: VideoDropdownStatus): string =>
  dropdownPresentation[status].badgeClass

export const getVideoDropdownItemClass = (status: VideoDropdownStatus): string =>
  dropdownPresentation[status].itemClass
