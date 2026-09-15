import type { FileItem, UploadJobOverview } from '@/stores/anonymizationStore'

export type OriginalFileDeletionState = 'deleted' | 'present' | 'quarantined' | 'unknown'

export const isAnonymizationProcessing = (file: FileItem): boolean =>
  ['processing_anonymization', 'extracting_frames', 'predicting_segments'].includes(file.anonymizationStatus)

export const isImportInterrupted = (file: FileItem): boolean =>
  file.uploadJob?.status === 'cancelled' && isAnonymizationProcessing(file)

const documentTypeLabels: Record<string, string> = {
  report: 'Befund',
  report_draft: 'Befund-Entwurf',
  report_final: 'Finaler Befund',
  report_correction: 'Befund-Korrektur',
  histology_draft: 'Histologie-Entwurf',
  histology_final: 'Finale Histologie',
  referral: 'Überweisung',
  discharge: 'Entlassbrief'
}

const getDocumentTypeLabel = (documentType?: string | null) => {
  if (!documentType) {
    return ''
  }
  const normalized = documentType.trim()
  if (!normalized) {
    return ''
  }
  return documentTypeLabels[normalized] || `Dokumenttyp: ${normalized}`
}

const getPdfPatientLabel = (file: FileItem) => {
  if (typeof file.pseudoPatientId === 'number') {
    return `Pseudo-Patient ${String(file.pseudoPatientId)}`
  }
  if (file.patientHashDisplay) {
    return `Patient ${file.patientHashDisplay}`
  }
  return ''
}

export const getFileDisplayName = (file: FileItem) => {
  if (file.mediaType !== 'pdf' || file.quarantined) {
    return file.filename
  }

  const labelParts = [getPdfPatientLabel(file), getDocumentTypeLabel(file.documentType)].filter(
    Boolean
  )

  if (labelParts.length > 0) {
    return labelParts.join(' - ')
  }

  return file.filename || `PDF-ID: ${String(file.id)}`
}

export const getFileIdLabel = (file: FileItem) => {
  if (file.quarantined) {
    return `Quarantäne: ${file.quarantineDirectoryLabel || file.quarantineDirectoryKey || 'lx-annotate'}`
  }
  if (file.importOnly && file.uploadJob) {
    return `Import-ID: ${file.uploadJob.id}`
  }
  return file.mediaType === 'video' ? `Video-ID: ${String(file.id)}` : `PDF-ID: ${String(file.id)}`
}

export const getStatusBadgeClass = (status: string) => {
  const classes: { [key: string]: string } = {
    not_started: 'bg-secondary',
    processing_anonymization: 'bg-warning',
    extracting_frames: 'bg-info',
    predicting_segments: 'bg-info',
    done_processing_anonymization: 'bg-success',
    validated: 'bg-success',
    failed: 'bg-danger'
  }
  return classes[status] || 'bg-secondary'
}

export const getStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    not_started: 'Nicht gestartet',
    processing_anonymization: 'Anonymisierung läuft',
    extracting_frames: 'Einzelbilder werden extrahiert',
    predicting_segments: 'Segmentvorhersage läuft',
    done_processing_anonymization: 'Fertig',
    validated: 'Validiert',
    failed: 'Fehlgeschlagen'
  }
  return texts[status] || `Unbekannter Status (${status})`
}

export const getUploadJobStatusBadgeClass = (status: string) => {
  const classes: { [key: string]: string } = {
    pending: 'bg-secondary',
    processing: 'bg-warning',
    retrying: 'bg-info text-dark',
    cancel_requested: 'bg-warning text-dark',
    cancelled: 'bg-secondary',
    anonymized: 'bg-success',
    quarantined: 'bg-warning text-dark',
    error: 'bg-danger',
    lost: 'bg-danger'
  }
  return classes[status] || 'bg-secondary'
}

export const getUploadJobStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    pending: 'Import wartet',
    processing: 'Import läuft',
    retrying: 'Import wird erneut versucht',
    cancel_requested: 'Abbruch angefordert',
    cancelled: 'Import abgebrochen',
    anonymized: 'Import abgeschlossen',
    quarantined: 'In Quarantäne',
    error: 'Importfehler',
    lost: 'Importquelle fehlt (LOST)'
  }
  return texts[status] || `Unbekannter Importstatus (${status})`
}

const DUPLICATE_IMPORT_NOTICE =
  'Duplikat erkannt. Der vorhandene Validierungsstatus bleibt unverändert.'
const IMPORT_ERROR_NOTICE = 'Importfehler. Details sind im Server-Log verfügbar.'

const isUploadJobError = (uploadJob: UploadJobOverview) => {
  const status = uploadJob.status.toLowerCase()
  return status === 'error' || status === 'lost'
}

const isDuplicateKeyImportError = (file: FileItem) => {
  return file.uploadJob?.errorCode === 'duplicate_content'
}

export const getUploadJobNotice = (file: FileItem) => {
  if (!file.uploadJob) {
    return ''
  }

  if (file.uploadJob.status === 'cancel_requested') {
    return 'Abbruch angefordert. Der Import stoppt am nächsten sicheren Verarbeitungsschritt; die Quelle bleibt erhalten.'
  }
  if (file.uploadJob.status === 'cancelled') {
    return 'Import abgebrochen. Die Quelle und bereits veröffentlichte gültige Medien bleiben erhalten.'
  }

  if (isDuplicateKeyImportError(file)) {
    return DUPLICATE_IMPORT_NOTICE
  }

  if (file.uploadJob.status === 'retrying') {
    const retryCount = file.uploadJob.retryCount
    const maxRetries = file.uploadJob.maxRetries
    const schedule = file.uploadJob.nextRetryAt
      ? ` Nächster Versuch: ${formatDate(file.uploadJob.nextRetryAt)}.`
      : ''
    return `Vorübergehender Importfehler. Versuch ${String(retryCount)}/${String(maxRetries)}.${schedule}`
  }

  if (isUploadJobError(file.uploadJob)) {
    return IMPORT_ERROR_NOTICE
  }

  return ''
}

export const getUploadJobNoticeClass = (file: FileItem) => {
  if (isDuplicateKeyImportError(file)) {
    return 'text-muted'
  }
  if (file.uploadJob?.status === 'retrying' || file.uploadJob?.status === 'cancel_requested') {
    return 'text-warning'
  }
  if (file.uploadJob?.status === 'cancelled') return 'text-muted'
  return 'text-danger'
}

export const getHlsStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    queued: 'bg-secondary',
    materializing: 'bg-warning text-dark',
    ready: 'bg-success',
    failed: 'bg-danger'
  }
  return classes[status] || 'bg-secondary'
}

export const getHlsStatusText = (status: string) => {
  const texts: Record<string, string> = {
    queued: 'Wartet',
    materializing: 'Wird erzeugt',
    ready: 'Bereit',
    failed: 'Fehlgeschlagen'
  }
  return texts[status] || `Unbekannter HLS-Status (${status})`
}

export const getHlsArtifactKindText = (artifactKind: string) =>
  artifactKind === 'raw' ? 'Rohvideo' : 'Anonymisiert'

export const getQuarantineReviewLabel = (file: FileItem) => {
  if (!file.quarantined) {
    return ''
  }
  const statusTexts: Record<string, string> = {
    pending_review: 'Review erforderlich',
    retained: 'Aufbewahrung beschlossen',
    approved_for_deletion: 'Löschung freigegeben',
    failed: 'Bedienereingriff erforderlich',
    unindexed: 'Ledger-Abgleich erforderlich'
  }
  return statusTexts[file.quarantineReviewStatus || ''] || ''
}

export const getUploadJobOriginLabel = (uploadJob: UploadJobOverview) => {
  const parts: string[] = []
  if (uploadJob.ingestMode === 'watcher') {
    parts.push('Ordnerimport')
  } else {
    parts.push('API')
  }

  if (uploadJob.sourceSystem) {
    parts.push(uploadJob.sourceSystem)
  }

  if (uploadJob.sourceCenterKey) {
    parts.push(uploadJob.sourceCenterKey)
  }

  return parts.join(' / ')
}

const getUploadJobCleanupStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    pending: 'Bereinigung offen',
    eligible: 'Bereinigung bereit',
    completed: 'Bereinigt',
    skipped: 'Bereinigung übersprungen'
  }
  return texts[status] || `Unbekannter Bereinigungsstatus (${status})`
}

export const getUploadJobCleanupLabel = (uploadJob: UploadJobOverview) => {
  const sourceLabel = uploadJob.sourceFilePersisted ? 'Quelle vorhanden' : 'Quelle bereinigt'

  const cleanupLabel = getUploadJobCleanupStatusText(uploadJob.cleanupStatus)

  return [sourceLabel, cleanupLabel].filter(Boolean).join(' - ')
}

export const getOriginalFileDeletionText = (file: FileItem): string => {
  const texts: Record<OriginalFileDeletionState, string> = {
    deleted: 'Ja, gelöscht',
    present: 'Nein, vorhanden',
    quarantined: 'In Quarantäne',
    unknown: 'Unbekannt'
  }
  return texts[getOriginalFileDeletionState(file)]
}

export const getOriginalFileDeletionClass = (file: FileItem): string => {
  const classes: Record<OriginalFileDeletionState, string> = {
    deleted: 'text-success',
    present: 'text-warning',
    quarantined: 'text-warning',
    unknown: 'text-muted'
  }
  return classes[getOriginalFileDeletionState(file)]
}

export const getOriginalFileDeletionIcon = (file: FileItem): string => {
  const icons: Record<OriginalFileDeletionState, string> = {
    deleted: 'ni ni-check-bold',
    present: 'ni ni-single-copy-04',
    quarantined: 'ni ni-settings-gear-65',
    unknown: 'ni ni-settings-gear-65'
  }
  return icons[getOriginalFileDeletionState(file)]
}

export const getOriginalFileDeletionHint = (file: FileItem): string => {
  if (file.quarantined) {
    return getQuarantineReviewLabel(file) || 'Import wurde vor der Datenbankanlage gestoppt'
  }
  if (file.uploadJob?.cleanupStatus) {
    return getUploadJobCleanupStatusText(file.uploadJob.cleanupStatus)
  }
  if (file.rawFile && file.rawFile.trim() !== '') {
    return 'Rohdatei ist noch referenziert'
  }
  return ''
}

export const formatDate = (dateString: string | null) => {
  if (!dateString) {
    return '-'
  }

  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const visibleHlsMaterializations = (file: FileItem) =>
  (file.hlsMaterializations ?? []).filter(
    (materialization) =>
      file.anonymizationStatus !== 'validated' || materialization.artifactKind === 'processed'
  )

const uploadJobDeletionState = (
  uploadJob?: UploadJobOverview | null
): OriginalFileDeletionState | null => {
  if (typeof uploadJob?.sourceFilePersisted === 'boolean') {
    return uploadJob.sourceFilePersisted ? 'present' : 'deleted'
  }
  const cleanupStatus = uploadJob?.cleanupStatus.toLowerCase()
  if (cleanupStatus === 'completed') return 'deleted'
  if (cleanupStatus === 'pending' || cleanupStatus === 'eligible') return 'present'
  return null
}

export const getOriginalFileDeletionState = (file: FileItem): OriginalFileDeletionState => {
  if (file.quarantined) {
    return 'quarantined'
  }

  const uploadJobState = uploadJobDeletionState(file.uploadJob)
  if (uploadJobState) return uploadJobState
  if (file.rawFile?.trim()) {
    return 'present'
  }
  return 'unknown'
}

const needsReimport = (file: FileItem) => {
  const metadataMissing = file.sensitiveMetaId == null || file.metadataImported === false

  // Video files need re-import if metadata is missing
  if (file.mediaType === 'video') {
    return metadataMissing
  }

  // PDF files might need re-import if anonymization failed or no text extracted
  if (file.mediaType === 'pdf') {
    return (
      metadataMissing ||
      file.anonymizationStatus === 'failed' ||
      file.anonymizationStatus === 'not_started'
    )
  }

  return false
}

const canUseImportAction = (file: FileItem, action: 'safe_reimport' | 'delete') => {
  if (!file.uploadJob) {
    return true
  }
  return file.uploadJob.allowedActions.includes(action)
}

export type OverviewActionIntent =
  | 'cancel-import'
  | 'retry-import'
  | 'repair-video'
  | 'reimport-pdf'
  | 'start-anonymization'
  | 'correct'
  | 'dismiss-import'
  | 'delete'

export const canCancelImport = (file: FileItem): boolean => Boolean(
  !file.quarantined && file.mediaType === 'video' &&
  file.uploadJob?.allowedActions.includes('cancel') &&
  ['pending', 'processing', 'retrying'].includes(file.uploadJob.status)
)

interface OverviewAction {
  intent: OverviewActionIntent
  visible: boolean | undefined | null
  label: string
  buttonClass: string
  icon?: string
  testSelector?: string
  title?: string
  ariaLabel?: string
}

const showRetryImport = (file: FileItem) =>
  Boolean(
    file.importOnly &&
    file.uploadJob &&
    (file.uploadJob.retryable || canUseImportAction(file, 'safe_reimport'))
  )

const showRepairVideo = (file: FileItem) =>
  !file.importOnly &&
  file.mediaType === 'video' &&
  needsReimport(file) &&
  canUseImportAction(file, 'safe_reimport')

const showReimportPdf = (file: FileItem) =>
  !file.importOnly &&
  file.mediaType === 'pdf' &&
  needsReimport(file) &&
  canUseImportAction(file, 'safe_reimport')

const showCorrection = (file: FileItem) =>
  (file.mediaType === 'video' || file.mediaType === 'pdf') &&
  (file.anonymizationStatus === 'done_processing_anonymization' ||
    file.anonymizationStatus === 'validated')

const showDismissImport = (file: FileItem) =>
  Boolean(file.importOnly && file.uploadJob && file.canDismissImport && !file.quarantined)

export const getOverviewActions = (file: FileItem): OverviewAction[] => {
  const actions: OverviewAction[] = [
    {
      intent: 'cancel-import',
      visible: canCancelImport(file),
      label: 'Import abbrechen',
      buttonClass: 'btn btn-outline-danger',
      testSelector: 'cancel-upload-job-button',
      title: 'Import am nächsten sicheren Verarbeitungsschritt stoppen; Quelle erhalten'
    },
    {
      intent: 'retry-import',
      visible: showRetryImport(file),
      label: 'Jetzt erneut versuchen',
      buttonClass: 'btn btn-outline-warning',
      testSelector: 'retry-upload-job-button',
      title: 'Gespeicherte Importquelle erneut verarbeiten',
      icon: 'ni ni-bold-right'
    },
    {
      intent: 'repair-video',
      visible: showRepairVideo(file),
      label: 'Zustand reparieren',
      buttonClass: 'btn btn-outline-info',
      title:
        'Gespeicherten Zustand prüfen und reparieren; fehlende Metadaten werden nicht neu erzeugt',
      icon: 'ni ni-bold-right'
    },
    {
      intent: 'reimport-pdf',
      visible: showReimportPdf(file),
      label: 'Erneut importieren',
      buttonClass: 'btn btn-outline-info',
      title: 'PDF erneut importieren und verarbeiten',
      icon: 'ni ni-bold-right'
    },
    {
      intent: 'start-anonymization',
      visible: !file.importOnly && file.anonymizationStatus === 'not_started',
      label: 'Starten',
      buttonClass: 'btn btn-outline-primary',
      icon: 'ni ni-button-play'
    },
    {
      intent: 'start-anonymization',
      visible: !file.importOnly && file.anonymizationStatus === 'failed',
      label: 'Erneut versuchen',
      buttonClass: 'btn btn-outline-warning',
      icon: 'ni ni-bold-right'
    },
    {
      intent: 'correct',
      visible: showCorrection(file),
      label: 'Korrektur',
      buttonClass: 'btn btn-outline-warning',
      testSelector: 'correction-button',
      icon: 'ni ni-single-copy-04'
    },
    {
      intent: 'dismiss-import',
      visible: showDismissImport(file),
      label: 'Aus Übersicht entfernen',
      buttonClass: 'btn btn-outline-secondary',
      testSelector: 'dismiss-import-button',
      title: 'Fehlgeschlagenen Import ausblenden; Quelldatei und Verlauf bleiben erhalten'
    },
    {
      intent: 'delete',
      visible: !file.importOnly && canUseImportAction(file, 'delete'),
      label: 'Löschen',
      buttonClass: 'btn btn-outline-danger',
      testSelector: 'delete-file-button',
      title: 'Datei permanent löschen',
      icon: 'ni ni-settings-gear-65',
      ariaLabel: `Datei ${String(file.id)} löschen`
    }
  ]
  return actions.filter((action) => action.visible)
}
