/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia'
import axiosInstance, { r, silentRequestConfig } from '@/api/axiosInstance'
import axios, { type AxiosError } from 'axios'
import { ref } from 'vue';
import { endpoints } from '@/types/api/endpoints'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const runtimeLogger = createRuntimeLogger('anonymization-store')

/* ------------------------------------------------------------------ */
/* Typen                                                               */
/* ------------------------------------------------------------------ */

export type UploadJobMonitoringStatus =
  | 'pending'
  | 'processing'
  | 'retrying'
  | 'anonymized'
  | 'error'
  | 'lost'
export type UploadJobIngestMode = 'api' | 'watcher'
export type UploadJobCleanupStatus =
  | 'pending'
  | 'eligible'
  | 'deleting'
  | 'completed'
  | 'skipped'
export type ImportErrorCode =
  | ''
  | 'dispatch_unavailable'
  | 'duplicate_content'
  | 'invalid_configuration'
  | 'invalid_input'
  | 'media_integrity_failed'
  | 'processing_failed'
  | 'source_missing'
export type HlsMaterializationErrorCode =
  | ''
  | 'dispatch_failed'
  | 'inconsistent_artifact'
  | 'materialization_failed'
  | 'validation_failed'
  | 'stale_attempt'

// Canonical camelCase representation of OverviewUploadJobMonitoringData.
export interface ApiUploadJobOverview {
  id: string
  status: UploadJobMonitoringStatus
  ingestMode: UploadJobIngestMode
  sourceSystem: string
  sourceCenterKey: string | null
  originalFilename: string
  sourceFilePersisted: boolean
  cleanupStatus: UploadJobCleanupStatus
  allowedActions: Array<'safe_reimport' | 'delete'>
  errorCode: ImportErrorCode
  errorDetail: string
  retryable: boolean
  retryCount: number
  maxRetries: number
  nextRetryAt: string | null
  lastAttemptAt: string | null
  createdAt: string
  updatedAt: string
}

export interface QuarantineUploadJobOverview
  extends Omit<ApiUploadJobOverview, 'status'> {
  status: 'quarantined'
}

export type UploadJobOverview = ApiUploadJobOverview | QuarantineUploadJobOverview

export interface HlsMaterializationOverview {
  artifactKind: 'raw' | 'processed'
  status: 'queued' | 'materializing' | 'ready' | 'failed'
  triggeringUploadJobId: string | null
  sourceGenerationId: string
  targetGenerationId: string
  segmentCount: number
  errorCode: HlsMaterializationErrorCode
  createdAt: string
  updatedAt: string
}

export interface FileItem {
  id: number
  filename: string
  mediaType: 'pdf' | 'video' | 'unknown'
  anonymizationStatus:
    | 'not_started'
    | 'processing_anonymization'
    | 'done_processing_anonymization'
    | 'failed'
    | 'validated'
    | 'predicting_segments'
    | 'extracting_frames'
    
  annotationStatus: 'not_started' | 'validated' | ''
  createdAt: string // ISO
  sensitiveMetaId?: number // Add this for video file lookup
  documentType?: string | null
  patientHashDisplay?: string | null
  examinationHashDisplay?: string | null
  pseudoPatientId?: number | null
  pseudoExaminationId?: number | null
  metadataImported?: boolean // New field to track if metadata was properly imported
  fileSize?: number | undefined // Optional field for file size
  rawFile?: string // New field for raw file path (for videos)
  uploadJob?: UploadJobOverview | null
  hlsMaterializations?: HlsMaterializationOverview[]
  quarantined?: boolean
  quarantineId?: string
  quarantineDirectoryKey?: string
  quarantineDirectoryLabel?: string
  quarantineReviewStatus?: string
  quarantineNextAction?: string
  quarantineOrphaned?: boolean
  errorDetail?: string
  importOnly?: boolean
}

export interface QuarantineFileItem {
  id: string
  directoryKey: string
  directoryLabel: string
  filename: string
  mediaType: 'pdf' | 'video' | 'unknown'
  size: number
  quarantinedAt?: string | null
  createdAt?: string | null
  modifiedAt?: string | null
  reason?: string
  reviewStatus?: string
  nextAction?: string
  sourceUploadJobId?: string | null
  orphaned?: boolean
}

export interface QuarantineOverviewResponse {
  count: number
  totalSize: number
  files: QuarantineFileItem[]
}

export interface AnonymizationState {
  anonymizationStatus: string
  loading: boolean
  error: string | null
  pending: [boolean]
  current: SensitiveMeta | null
  // New state for overview functionality
  overview: FileItem[]
  pollingHandles: Partial<Record<number, ReturnType<typeof setTimeout>>>
  isPolling: boolean
  hasAvailableFiles: boolean
  availableFiles: FileItem[]
  // NEW: IDs der Dateien, die validiert werden müssen (anonymizationStatus === 'done_processing_anonymization' && annotationStatus !== 'done_processing_anonymization')
  needsValidationIds: number[]
  reimportQueuedIds: number[]
}

// Interface matching the actual API response for sensitivemeta
// THIS IS THE SINGLE SOURCE OF TRUTH FOR SENSITIVEMETA IN THE ANONYMIZATION VALIDATION CONTEXT
export interface SensitiveMeta {
  id: number   // pk of db Object!!
  casenumber?: string | null
  patientFirstName?: string | null
  patientLastName?: string | null
  patientDob?: string | null
  patientDobDisplay?: string | null
  patientGender: string
  examinationDate: string | null
  centerName?: string
  patientGenderName?: string
  examinersDisplay: string | null
  endoscopeType?: string
  endoscopeSn?: string
  isVerified?: boolean
  dobVerified?: boolean
  namesVerified?: boolean
  anonymizedText?:string
  text?: string
  documentType?: string | null
  document_type?: string | null
  externalId?:string
  externalIdOrigin?:string
  tags?: string[]
  validationComment?: string | null
  validation_comment?: string | null
  patientHashDisplay?: string | null
  examinationHashDisplay?: string | null
  pseudoPatientId?: number | null
  pseudoExaminationId?: number | null
  patientExaminationId?: number | null
  patientId?: number | null
}

function unknownErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function axiosStatus(error: AxiosError): string {
  return String(error.response?.status ?? 'unbekannt')
}

function axiosErrorField(error: AxiosError, field: string): string | null {
  const data = error.response?.data
  if (!isRecord(data)) return null
  const value = data[field]
  return typeof value === 'string' ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

interface AnonymizationStatusResponse {
  anonymizationStatus?: unknown
}

interface VideoReimportResponse {
  status?: string
}

interface PdfReimportResponse {
  sensitiveMetaCreated?: boolean
  sensitive_meta_created?: boolean
}

function isFileAnonymizationStatus(value: unknown): value is FileItem['anonymizationStatus'] {
  return (
    typeof value === 'string' &&
    [
      'not_started',
      'processing_anonymization',
      'done_processing_anonymization',
      'failed',
      'validated',
      'predicting_segments',
      'extracting_frames'
    ].includes(value)
  )
}

function syntheticQuarantineId(quarantineId: string, usedIds: Set<number>): number {
  let hash = 0
  for (let i = 0; i < quarantineId.length; i += 1) {
    hash = (hash * 31 + quarantineId.charCodeAt(i)) | 0
  }

  let candidate = -Math.max(1, Math.abs(hash))
  while (usedIds.has(candidate)) {
    candidate -= 1
  }
  usedIds.add(candidate)
  return candidate
}

function buildQuarantineOverviewRows(
  quarantineFiles: QuarantineFileItem[],
  existingIds: Set<number>
): FileItem[] {
  return quarantineFiles.map((file) => {
    const mediaType =
      file.mediaType === 'pdf' || file.mediaType === 'video'
        ? file.mediaType
        : 'unknown'
    const quarantineTimestamp =
      file.quarantinedAt || file.createdAt || file.modifiedAt || ''
    const reason =
      file.reason ||
      'Die Datei wurde vor dem Import in die Quarantäne verschoben.'

    return {
      id: syntheticQuarantineId(file.id, existingIds),
      filename: file.filename,
      mediaType,
      anonymizationStatus: 'failed',
      annotationStatus: '',
      createdAt: quarantineTimestamp,
      metadataImported: false,
      fileSize: file.size,
      uploadJob: {
        id: file.id,
        status: 'quarantined',
        ingestMode: 'watcher',
        sourceSystem: file.directoryLabel,
        sourceCenterKey: null,
        originalFilename: file.filename,
        sourceFilePersisted: true,
        cleanupStatus: 'skipped',
        allowedActions: [],
        errorCode: 'processing_failed',
        errorDetail: reason,
        retryable: false,
        retryCount: 0,
        maxRetries: 0,
        nextRetryAt: null,
        lastAttemptAt: null,
        createdAt: quarantineTimestamp,
        updatedAt: file.modifiedAt || quarantineTimestamp
      },
      quarantined: true,
      quarantineId: file.id,
      quarantineDirectoryKey: file.directoryKey,
      quarantineDirectoryLabel: file.directoryLabel,
      quarantineReviewStatus: file.reviewStatus,
      quarantineNextAction: file.nextAction,
      quarantineOrphaned: file.orphaned,
      errorDetail: reason
    }
  })
}

function hasDuplicateKeyUploadError(file: FileItem): boolean {
  const status = (file.uploadJob?.status || '').toLowerCase()
  if (status !== 'error' && status !== 'lost') {
    return false
  }
  return file.uploadJob?.errorCode === 'duplicate_content'
}

function preserveValidatedDuplicateVideoRows(files: FileItem[]): FileItem[] {
  return files.map((file) => {
    if (file.mediaType !== 'video' || !hasDuplicateKeyUploadError(file)) {
      return file
    }

    return {
      ...file,
      anonymizationStatus: 'validated',
      annotationStatus: 'validated'
    }
  })
}

const STATUS_POLL_INTERVAL_MS = 15000
const STATUS_POLL_BACKOFF_MS = 30000
const STATUS_POLL_JITTER_MS = 5000
const STATUS_POLL_STORAGE_PREFIX = 'lx-annotate:anonymization-status:next-check'
const FINAL_ANONYMIZATION_STATUSES = new Set([
  'done_processing_anonymization',
  'validated',
  'failed'
])
const ACTIVE_UPLOAD_JOB_STATUSES = new Set(['pending', 'processing', 'retrying'])
const ACTIVE_ANONYMIZATION_STATUSES = new Set([
  'processing_anonymization',
  'extracting_frames',
  'predicting_segments'
])

function isUploadJobActive(file: FileItem): boolean {
  return ACTIVE_UPLOAD_JOB_STATUSES.has((file.uploadJob?.status || '').toLowerCase())
}

function hasMissingVideoMetadata(file: FileItem): boolean {
  return file.mediaType === 'video' && (file.sensitiveMetaId == null || file.metadataImported === false)
}

function statusPollIntervalMs(fileId: number): number {
  return STATUS_POLL_INTERVAL_MS + (Math.abs(fileId) % 5) * 500
}

function statusPollStorageKey(fileId: number, kind: string): string {
  return `${STATUS_POLL_STORAGE_PREFIX}:${kind}:${String(fileId)}`
}

function getStatusPollStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function claimStatusPollSlot(fileId: number, kind: string, delayMs: number): boolean {
  const storage = getStatusPollStorage()
  if (!storage) return true

  try {
    const key = statusPollStorageKey(fileId, kind)
    const now = Date.now()
    const nextCheckAt = Number(storage.getItem(key) || '0')
    if (Number.isFinite(nextCheckAt) && nextCheckAt > now) {
      return false
    }

    storage.setItem(key, String(now + delayMs))
    return true
  } catch {
    return true
  }
}

function deferStatusPollSlot(fileId: number, kind: string, delayMs: number): void {
  const storage = getStatusPollStorage()
  if (!storage) return

  try {
    storage.setItem(statusPollStorageKey(fileId, kind), String(Date.now() + delayMs))
  } catch {
    // Ignore storage failures; polling still has the per-tab interval guard.
  }
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const availableFiles = ref<FileItem[]>([])
export const useAnonymizationStore = defineStore('anonymization', {
  state: (): AnonymizationState => ({
    anonymizationStatus: 'idle',
    loading: false,
    error: null,
    current: null,
    overview: [],
    pollingHandles: {},
    isPolling: false,
    hasAvailableFiles: false,
    availableFiles: availableFiles.value,
    needsValidationIds: [],
    reimportQueuedIds: [],
    pending: [false] // TODO: Implement reactive getter here
  }),

  getters: {
    getCurrentItem: (state) => state.current,
    isAnyFileProcessing: (state) =>
      state.overview.some(
        (f) =>
          f.anonymizationStatus === 'processing_anonymization' ||
          f.anonymizationStatus === 'extracting_frames' ||
          f.anonymizationStatus === 'predicting_segments'
      ),
    processingFiles: (state) =>
      state.overview.filter(
        (f) =>
          f.anonymizationStatus === 'processing_anonymization' ||
          f.anonymizationStatus === 'extracting_frames' ||
          f.anonymizationStatus === 'predicting_segments'
      ),
    isVideoReimportQueued: (state) => (fileId: number) =>
      state.reimportQueuedIds.includes(fileId),
    getState: (state) => state
  },

  actions: {
    /** Gets the next anonymization file + its metadata */
    async fetchNext(lastId?: number): Promise<SensitiveMeta | null | undefined> {
      this.loading = true
      this.error = null

      try {
        // Check if we have a specific file selected from overview
        if (lastId) {
          const item = this.overview.find((f) => f.id === lastId)
          if (!item) {
            this.error = `Datei mit ID ${String(lastId)} nicht gefunden.`
            return null
          }
          await this.setCurrentForValidation(item.id, item.mediaType)
          return this.current
        } else {
          if (this.current) {
            return
          } else {
            runtimeLogger.warn('fetch-next-selection-missing')
            const currentItem = this.getCurrentItem
            if (currentItem && currentItem.id) {
              this.current = currentItem
              return await this.fetchNext(currentItem.id)
            } else {
              runtimeLogger.warn('fetch-next-current-item-missing')
              return null
            }
          }
        }
      } catch (err: unknown) {
        runtimeLogger.error('fetch-next-failed', err)
        if (axios.isAxiosError<unknown>(err)) {
          this.error = `Fehler beim Laden der Metadaten (${axiosStatus(err)}): ${err.message}`
        } else {
          this.error = unknownErrorMessage(err, 'Unbekannter Fehler beim Laden.')
        }
        this.$patch({ current: null })
        return null
      } finally {
        this.loading = false
      }
    },

    /* ---------------------------------------------------------------- */
    /* Update-Methoden                                                  */
    /* ---------------------------------------------------------------- */

    async patchPdf(payload: { id: number; [key: string]: unknown }) {
      if (!payload.id) {
        throw new Error('patchPdf: PDF ID fehlt im Payload.')
      }
      runtimeLogger.debug('sensitive-metadata-patch-started', { fileType: 'pdf' })

      // Remove id from payload before sending (it's in URL)
      const { id, ...updateData } = payload

      // Use Modern Media Framework endpoint
      return axiosInstance.patch(r(endpoints.media.pdfSensitiveMetadata(id)), updateData)
    },

    async patchVideo(payload: { id: number; [key: string]: unknown }) {
      if (!payload.id) {
        throw new Error('patchVideo: Video ID fehlt im Payload.')
      }
      runtimeLogger.debug('sensitive-metadata-patch-started', { fileType: 'video' })

      // Remove id from payload before sending (it's in URL)
      const { id, ...updateData } = payload

      // Use Modern Media Framework endpoint
      return axiosInstance.patch(r(endpoints.media.videoSensitiveMetadata(id)), updateData)
    },
    fetchPendingAnonymizations() {
      return this.pending
    },

    /**
     * Fetch overview of all uploaded files with their statuses
     */
    async fetchOverview() {
      this.loading = true
      this.error = null

      try {
        runtimeLogger.debug('overview-fetch-started')
        const { data } = await axiosInstance.get<FileItem[]>(r(endpoints.anonymization.itemsOverview))
        runtimeLogger.debug('overview-fetch-completed', { count: data.length })
        let quarantineRows: FileItem[] = []
        try {
          const quarantineResponse = await axiosInstance.get<QuarantineOverviewResponse>(
            r(endpoints.runtime.quarantine),
            silentRequestConfig()
          )
          quarantineRows = buildQuarantineOverviewRows(
            quarantineResponse.data.files,
            new Set(data.map((file) => file.id))
          )
        } catch {
          runtimeLogger.warn('quarantine-overview-unavailable', { operation: 'fetch-overview' })
        }

        const overviewData = preserveValidatedDuplicateVideoRows([...data, ...quarantineRows])

        // Update overview and available files
        this.overview = overviewData

        // Clear and update availableFiles to prevent duplicates
        this.availableFiles.length = 0 // Clear the array
        this.availableFiles.push(...overviewData) // Add all files from the fresh data

        availableFiles.value = [...overviewData]

        const needsValidation = overviewData
          .filter((f) => f.anonymizationStatus === 'done_processing_anonymization' && f.annotationStatus !== 'validated')
          .map((f) => f.id)
        this.needsValidationIds = needsValidation

        const stopStatuses = new Set(['done_processing_anonymization', 'validated', 'failed', 'not_started'])
        this.reimportQueuedIds = this.reimportQueuedIds.filter((id) => {
          const queuedFile = overviewData.find((f) => f.id === id)
          return !!queuedFile && !stopStatuses.has(queuedFile.anonymizationStatus)
        })

        // NEW: Polling sofort stoppen für
        // 1) Dateien, die nicht mehr existieren
        const currentPollingIds = Object.keys(this.pollingHandles).map((k) => Number(k))
        const existingIds = new Set(overviewData.map((f) => f.id))
        for (const pid of currentPollingIds) {
          if (!existingIds.has(pid)) {
            this.stopPolling(pid)
          }
        }
        // 2) Dateien mit finalem Status oder die nicht gepollt werden sollen
        for (const f of overviewData) {
          if (stopStatuses.has(f.anonymizationStatus) && this.pollingHandles[f.id] !== undefined) {
            this.stopPolling(f.id)
          }
        }

        this.hasAvailableFiles = overviewData.length > 0
        return overviewData
      } catch (err: unknown) {
        runtimeLogger.error('overview-fetch-failed', err)
        if (axios.isAxiosError<unknown>(err)) {
          this.error = `Fehler beim Laden der Übersicht (${axiosStatus(err)}): ${err.message}`
        } else {
          this.error = unknownErrorMessage(err, 'Unbekannter Fehler beim Laden der Übersicht.')
        }
        return []
      } finally {
        this.loading = false
      }
    },

    async retryUploadJob(jobId: string): Promise<boolean> {
      try {
        await axiosInstance.post(r(endpoints.anonymization.retryUploadJob(jobId)))
        await this.fetchOverview()
        return true
      } catch (err: unknown) {
        runtimeLogger.error('upload-job-retry-failed', err)
        if (axios.isAxiosError<unknown>(err)) {
          this.error = `Fehler beim erneuten Starten des Imports (${axiosStatus(err)}): ${err.message}`
        } else {
          this.error = unknownErrorMessage(
            err,
            'Unbekannter Fehler beim erneuten Starten des Imports.'
          )
        }
        return false
      }
    },

    /**
     * Start anonymization for a specific file
     */
    async startAnonymization(id: number) {
      const file = this.overview.find((f) => f.id === id)
      if (!file) {
        this.error = `Datei mit ID ${String(id)} nicht gefunden.`
        return false
      }

      try {
        runtimeLogger.debug('anonymization-start-requested', { fileType: file.mediaType })

        // Optimistic UI update
        file.anonymizationStatus = 'processing_anonymization'

        // Trigger anonymization
        await axiosInstance.post(r(endpoints.anonymization.start(id)))
        runtimeLogger.info('anonymization-start-accepted', { fileType: file.mediaType })

        // Start polling
        this.startPolling(id)

        return true
      } catch (err: unknown) {
        runtimeLogger.error('anonymization-start-failed', err, { fileType: file.mediaType })

        // Revert optimistic update
        file.anonymizationStatus = 'not_started'

        if (axios.isAxiosError<unknown>(err)) {
          this.error = `Fehler beim Starten der Anonymisierung (${axiosStatus(err)}): ${err.message}`
        } else {
          this.error = unknownErrorMessage(
            err,
            'Unbekannter Fehler beim Starten der Anonymisierung.'
          )
        }
        return false
      }
    },

    /**
     * Start polling status for a specific file
     */
    startPolling(id: number) {
      if (this.pollingHandles[id] !== undefined) {
        runtimeLogger.debug('status-poll-already-running')
        return
      }

      // 1. Find the file to determine its type
      const file = this.overview.find((f) => f.id === id)
      if (!file) {
        runtimeLogger.warn('status-poll-file-missing')
        return
      }

      runtimeLogger.debug('status-poll-started', { fileType: file.mediaType })
      this.isPolling = true

      const kindParam = file.mediaType === 'pdf' ? 'report' : 'video'
      let nextDelayMs = statusPollIntervalMs(id)
      const jitter = () => Math.floor(Math.random() * STATUS_POLL_JITTER_MS)

      const poll = async () => {
        if (this.pollingHandles[id] === undefined) return

        if (!claimStatusPollSlot(id, kindParam, nextDelayMs)) {
          this.pollingHandles[id] = setTimeout(() => void poll(), nextDelayMs + jitter())
          return
        }

        try {
          const { data } = await axiosInstance.get<AnonymizationStatusResponse>(
            r(endpoints.anonymization.status(id)), 
            { params: { kind: kindParam } } 
          )

          // Refresh file reference in case overview changed
          const currentFile = this.overview.find((f) => f.id === id)

          if (currentFile && isFileAnonymizationStatus(data.anonymizationStatus)) {
            const statusFromBackend = data.anonymizationStatus

            runtimeLogger.debug('status-poll-update-applied', { fileType: currentFile.mediaType })
            currentFile.anonymizationStatus = statusFromBackend

            if (FINAL_ANONYMIZATION_STATUSES.has(statusFromBackend)) {
              runtimeLogger.info('status-poll-final-state-reached', {
                fileType: currentFile.mediaType
              })
              this.stopPolling(id)
              return
            }
          }
          nextDelayMs = statusPollIntervalMs(id)
        } catch (err) {
          if (axios.isAxiosError(err) && err.response?.status === 429) {
            nextDelayMs = STATUS_POLL_BACKOFF_MS
            runtimeLogger.debug('status-poll-rate-limited', { httpStatus: 429 })
          } else {
            nextDelayMs = statusPollIntervalMs(id)
            runtimeLogger.error('status-poll-failed', err, { fileType: file.mediaType })
          }
        }

        if (this.pollingHandles[id] === undefined) return
        deferStatusPollSlot(id, kindParam, nextDelayMs)
        this.pollingHandles[id] = setTimeout(() => void poll(), nextDelayMs + jitter())
      }

      this.pollingHandles[id] = setTimeout(() => void poll(), nextDelayMs + jitter())
    },
    /**
     * Stop polling for a specific file
     */
    stopPolling(id: number) {
      const timer = this.pollingHandles[id]
      if (timer !== undefined) {
        clearTimeout(timer)
        Reflect.deleteProperty(this.pollingHandles, id)
        runtimeLogger.debug('status-poll-stopped')
      }

      // Update global polling state
      this.isPolling = Object.keys(this.pollingHandles).length > 0
    },

    /**
     * Stop all polling
     */
    stopAllPolling() {
      Object.keys(this.pollingHandles).forEach((id) => {
        this.stopPolling(parseInt(id))
      })
      this.isPolling = false
      runtimeLogger.debug('all-status-polls-stopped')
    },

    /**
     * Set current item for validation (called when clicking "Validate")
     */
    async setCurrentForValidation(id: number, mediaType: string) {
      try {
        runtimeLogger.debug('validation-selection-started')

        // Find the item in overview to know if wrong parameters were passed.
        const item = this.overview.find((f) => f.id === id)
        if (!item) {
          throw new Error(`Item with ID ${String(id)} not found in overview`)
        }
        

        runtimeLogger.debug('validation-selection-found', { fileType: item.mediaType })

        if (mediaType === 'video') {
          runtimeLogger.debug('sensitive-metadata-fetch-started', { fileType: 'video' })
          const { data: sensitiveMeta } = await axiosInstance.get<SensitiveMeta>(
            r(endpoints.media.videoSensitiveMetadata(item.id))
          )
          runtimeLogger.debug('sensitive-metadata-fetch-completed', { fileType: 'video' })

          this.current = sensitiveMeta
          return this.current
        } else if (mediaType === 'pdf') {
          runtimeLogger.debug('validation-selection-confirmed', { fileType: 'pdf' })

          const metaUrl = r(endpoints.media.pdfSensitiveMetadata(item.id))
          runtimeLogger.debug('sensitive-metadata-fetch-started', { fileType: 'pdf' })
          const { data: sensitiveMeta } = await axiosInstance.get<SensitiveMeta>(metaUrl)
          runtimeLogger.debug('sensitive-metadata-fetch-completed', { fileType: 'pdf' })

          if (typeof sensitiveMeta.id !== 'number') {
            runtimeLogger.error(
              'sensitive-metadata-contract-invalid',
              new TypeError('Sensitive metadata response contract invalid'),
              { fileType: 'pdf' }
            )
            throw new Error('Ungültige Metadaten vom Backend empfangen.')
          }
          this.current = sensitiveMeta
          return sensitiveMeta
        }
      } catch (err: unknown) {
        runtimeLogger.error('validation-selection-failed', err)
        if (axios.isAxiosError<unknown>(err)) {
          this.error = `Fehler beim Laden der Validierungsdaten (${axiosStatus(err)}): ${err.message}`
        } else {
          this.error = unknownErrorMessage(
            err,
            'Unbekannter Fehler beim Laden der Validierungsdaten.'
          )
        }
        return null
      }
    },

    /**
     * Refresh overview data
     */
    async refreshOverview() {
      await this.fetchOverview()
    },

    /**
     * Re-import a video file to regenerate metadata
     */
    async reimportVideo(fileId: number) {
      const file = this.overview.find((f) => f.id === fileId)
      if (!file) {
        this.error = `Video mit ID ${String(fileId)} nicht gefunden.`
        return false
      }

      if (file.mediaType !== 'video') {
        this.error = `Datei mit ID ${String(fileId)} ist kein Video.`
        return false
      }

      if (this.reimportQueuedIds.includes(fileId) || isUploadJobActive(file)) {
        this.startPolling(fileId)
        return true
      }

      if (ACTIVE_ANONYMIZATION_STATUSES.has(file.anonymizationStatus) && !hasMissingVideoMetadata(file)) {
        this.startPolling(fileId)
        return true
      }

      try {
        runtimeLogger.debug('media-reimport-started', { fileType: 'video' })

        // Optimistic UI update - set to processing to show user feedback
        file.anonymizationStatus = 'processing_anonymization'
        file.metadataImported = false
        if (!this.reimportQueuedIds.includes(fileId)) {
          this.reimportQueuedIds.push(fileId)
        }

        // Trigger re-import via backend
        const response = await axiosInstance.post<VideoReimportResponse>(r(endpoints.media.videoReimport(fileId)))
        runtimeLogger.info('media-reimport-accepted', { fileType: 'video' })

        runtimeLogger.debug('media-reimport-poll-started', { fileType: 'video' })
        this.startPolling(fileId)

        const jobStatus = response.data.status
        if (jobStatus === 'completed') {
          this.reimportQueuedIds = this.reimportQueuedIds.filter((id) => id !== fileId)
        } else if (jobStatus === 'queued' || jobStatus === 'already_queued') {
          runtimeLogger.debug('media-reimport-queued', { fileType: 'video' })
        }

        return true
      } catch (err: unknown) {
        runtimeLogger.error('media-reimport-failed', err, { fileType: 'video' })

        // Revert optimistic update
        file.anonymizationStatus = 'failed'
        file.metadataImported = false
        this.reimportQueuedIds = this.reimportQueuedIds.filter((id) => id !== fileId)

        if (axios.isAxiosError<unknown>(err)) {
          const errorMessage = axiosErrorField(err, 'error') || err.message
          this.error = `Fehler beim erneuten Importieren (${axiosStatus(err)}): ${errorMessage}`
        } else {
          this.error = unknownErrorMessage(err, 'Unbekannter Fehler beim erneuten Importieren.')
        }
        return false
      }
    },

    /**
     * Re-import a PDF file to regenerate metadata
     * Follows the same pattern as reimportVideo for consistency
     */
    async reimportPdf(fileId: number) {
      const file = this.overview.find((f) => f.id === fileId)
      if (!file) {
        this.error = `PDF mit ID ${String(fileId)} nicht gefunden.`
        return false
      }

      if (file.mediaType !== 'pdf') {
        this.error = `Datei mit ID ${String(fileId)} ist kein PDF.`
        return false
      }

      try {
        runtimeLogger.debug('media-reimport-started', { fileType: 'pdf' })

        // Optimistic UI update - set to processing to show user feedback
        file.anonymizationStatus = 'processing_anonymization'
        file.metadataImported = false

        // Trigger re-import via backend using media framework endpoint
        const response = await axiosInstance.post<PdfReimportResponse>(r(endpoints.media.pdfReimport(fileId)))
        runtimeLogger.info('media-reimport-accepted', { fileType: 'pdf' })

        runtimeLogger.debug('media-reimport-poll-started', { fileType: 'pdf' })
        this.startPolling(fileId)

        // Check if re-import was successful
        if (response.data.sensitiveMetaCreated ?? response.data.sensitive_meta_created) {
          runtimeLogger.info('media-reimport-metadata-ready', { fileType: 'pdf' })
        } else {
          runtimeLogger.warn('media-reimport-metadata-incomplete', { fileType: 'pdf' })
        }

        return true
      } catch (err: unknown) {
        runtimeLogger.error('media-reimport-failed', err, { fileType: 'pdf' })

        // Revert optimistic update
        file.anonymizationStatus = 'failed'
        file.metadataImported = false

        if (axios.isAxiosError<unknown>(err)) {
          const errorMessage = axiosErrorField(err, 'error') || err.message
          this.error = `Fehler beim erneuten Importieren (${axiosStatus(err)}): ${errorMessage}`
        } else {
          this.error = unknownErrorMessage(err, 'Unbekannter Fehler beim erneuten Importieren.')
        }
        return false
      }
    }
  }
})
