<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0 d-flex justify-content-between align-items-center">
        <h4 class="mb-0">Anonymisierungs-Übersicht</h4>
        <div class="d-flex gap-2">
          <button
            class="btn btn-outline-warning btn-sm"
            data-test="repair-all-video-states"
            :disabled="isRefreshing || isRepairingVideoStates"
            title="Repariert ableitbare Datenbankzustände, ohne Annotationen zu löschen"
            @click="repairAllVideoStates()"
          >
            {{ repairButtonLabel }}
          </button>
          <button
            class="btn btn-outline-primary btn-sm"
            :disabled="isRefreshing"
            @click="refreshOverview"
          >
            <i
              class="ni ni-bold-right"
              :class="{ 'ni-spin': isRefreshing }"
            ></i>
            Aktualisieren
          </button>
        </div>
      </div>

      <div class="card-body">
        <OverviewStorageSummary />
        <OverviewTranscodePanel
          :repairing="isRepairingVideoStates"
          :refresh-token="transcodeRefreshToken"
          @repair="repairAllVideoStates"
        />
        <p v-if="cancellationError" class="alert alert-warning" role="alert">
          {{ cancellationError }}
        </p>
        <div
          v-if="videoStateRepairMessage"
          class="alert alert-info"
          role="status"
        >
          {{ videoStateRepairMessage }}
        </div>
        <!-- Error State -->
        <div
          v-if="anonymizationStore.error"
          class="alert alert-danger"
          role="alert"
        >
          <strong>Fehler:</strong> {{ anonymizationStore.error }}
        </div>
        <!-- Loading State -->
        <div
          v-if="anonymizationStore.loading && !overviewFiles.length"
          class="text-center py-5"
        >
          <div
            class="spinner-border text-primary"
            role="status"
          >
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Dateien werden geladen...</p>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!anonymizationStore.error && !overviewFiles.length"
          class="text-center py-5"
        >
          <div class="mb-4">
            <i class="ni ni-collection ni-3x text-muted"></i>
          </div>
          <h5 class="text-muted">Keine Dateien vorhanden</h5>
          <p class="text-muted mb-4">
            Laden Sie Videos oder PDFs in den <code>data</code>-Ordner oder den
            <code>import</code>-Ordner, um mit der Anonymisierung zu beginnen.
          </p>
        </div>

        <div
          v-if="overviewFiles.length"
          class="overview-filter-bar"
          data-test="anonymization-overview-filters"
          aria-label="Anonymisierungsdateien filtern"
        >
          <div class="overview-filter-field">
            <label
              for="anonymization-resource-type-filter"
              class="form-label mb-1"
            >
              Ressourcentyp
            </label>
            <select
              id="anonymization-resource-type-filter"
              v-model="resourceTypeFilter"
              class="form-select form-select-sm"
              data-test="anonymization-resource-type-filter"
            >
              <option value="all">Alle Ressourcentypen</option>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="unknown">Unbekannt</option>
            </select>
          </div>
          <div class="overview-filter-field">
            <label
              for="anonymization-storage-state-filter"
              class="form-label mb-1"
            >
              Physischer Speicherstatus
            </label>
            <select
              id="anonymization-storage-state-filter"
              v-model="physicalStorageStateFilter"
              class="form-select form-select-sm"
              data-test="anonymization-storage-state-filter"
            >
              <option value="all">Alle Speicherzustände</option>
              <option value="present">Originaldatei vorhanden</option>
              <option value="deleted">Originaldatei gelöscht</option>
              <option value="quarantined">In Quarantäne</option>
              <option value="unknown">Unbekannt</option>
            </select>
          </div>
          <div
            class="overview-filter-summary"
            aria-live="polite"
          >
            {{ availableFiles.length }} von {{ overviewFiles.length }} Ressourcen
          </div>
          <button
            v-if="hasActiveTableFilters"
            type="button"
            class="btn btn-outline-secondary btn-sm mb-0"
            data-test="anonymization-filters-reset"
            @click="resetTableFilters"
          >
            Filter zurücksetzen
          </button>
        </div>

        <div
          v-if="overviewFiles.length && !availableFiles.length"
          class="overview-filter-empty text-center py-5"
          data-test="anonymization-filter-empty"
        >
          <h5>Keine passenden Ressourcen</h5>
          <p class="text-muted mb-3">Die gewählten Filter liefern keine Tabellenzeilen.</p>
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            @click="resetTableFilters"
          >
            Filter zurücksetzen
          </button>
        </div>

        <!-- Files Table -->
        <div
          v-if="availableFiles.length"
          ref="tableScrollElement"
          class="table-responsive overview-table-scroll"
          data-test="overview-table-scroll"
          tabindex="0"
          role="region"
          aria-label="Anonymisierungsdateien, horizontal scrollbar"
          @scroll="syncStickyScrollbar"
        >
          <table
            ref="overviewTableElement"
            class="table table-hover overview-files-table"
          >
            <thead class="table-light">
              <tr>
                <th class="sticky-filename-column">Dateiname</th>
                <th>Typ</th>
                <th>Aktionen</th>
                <th>Import</th>
                <th>HLS-Materialisierung</th>
                <th>Anonymisierung</th>
                <th>Annotation</th>
                <th class="validation-action-column">Validierung</th>
                <th>Originaldatei gelöscht?</th>
                <th>Erstellt</th>
              </tr>
            </thead>
            <tbody>
              <AnonymizationOverviewRow
                v-for="file in availableFiles"
                :key="getFileKey(file)"
                :file="file"
                :processing="isProcessing(file)"
                :retry-processing="processingFiles.has(getFileKey(file))"
                :ready-for-validation="file.anonymizationStatus === 'done_processing_anonymization'"
                :icon-class="mediaStore.getMediaTypeIcon(file.mediaType)"
                :media-type-badge-class="mediaStore.getMediaTypeBadgeClass(file.mediaType)"
                @retry-import="retryUploadJob"
                @cancel-import="cancelImport"
                @repair-video="reimportVideo"
                @reimport-pdf="reimportPdf"
                @start-anonymization="startAnonymization"
                @correct="correctFile"
                @dismiss-import="dismissImport"
                @delete="deleteFile"
                @validate="validateFile"
              />
            </tbody>
          </table>
        </div>
        <div
          v-show="availableFiles.length && hasHorizontalOverflow"
          ref="stickyScrollbarElement"
          class="overview-sticky-scrollbar"
          data-test="overview-sticky-scrollbar"
          tabindex="0"
          role="region"
          aria-label="Fixierte horizontale Scrollleiste für die Anonymisierungsdateien"
          @scroll="syncTableScroll"
        >
          <div
            class="overview-sticky-scrollbar-spacer"
            :style="{ width: `${tableScrollWidth}px` }"
          ></div>
        </div>

        <!-- Status Summary -->
        <div
          v-if="availableFiles.length"
          class="row mt-4"
        >
          <div class="col-md-12">
            <div class="card bg-light">
              <div class="card-body">
                <h6 class="card-title">Status-Übersicht</h6>
                <div class="row text-center">
                  <div class="col-md-3">
                    <div class="mb-2">
                      <span class="badge bg-secondary fs-6">
                        {{ getTotalByStatus('not_started') }}
                      </span>
                    </div>
                    <small class="text-muted">Nicht gestartet</small>
                  </div>
                  <div class="col-md-3">
                    <div class="mb-2">
                      <span class="badge bg-warning fs-6">
                        {{ getTotalByStatus('processing') }}
                      </span>
                    </div>

                    <small class="text-muted">In Bearbeitung</small>
                  </div>
                  <div class="col-md-3">
                    <div class="mb-2">
                      <span class="badge bg-warning fs-6">
                        {{ getTotalByStatus('started') }}
                      </span>
                    </div>
                    <small class="text-muted">Anonymisierung gestartet</small>
                  </div>
                  <div class="col-md-3">
                    <div class="mb-2">
                      <span class="badge bg-success fs-6">
                        {{ pendingValidationCount }}
                      </span>
                    </div>
                    <small class="text-muted">Fertig</small>
                  </div>
                  <div class="col-md-3">
                    <div class="mb-2">
                      <span class="badge bg-danger fs-6">
                        {{ getTotalByStatus('failed') }}
                      </span>
                    </div>
                    <small class="text-muted">Fehlgeschlagen</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAnonymizationStore, type FileItem } from '@/stores/anonymizationStore'
import { useMediaTypeStore, type MediaItem } from '@/stores/mediaTypeStore'
import { usePollingProtection } from '@/composables/usePollingProtection'
import { useMediaManagement } from '@/api/mediaManagement'
import { cancelAnonymizationImport, type ImportCancellationResponse, type TranscodeOption } from '@/api/anonymizationOperations'
import { createRuntimeLogger } from '@/utils/runtimeLogger'
import AnonymizationOverviewRow from './AnonymizationOverviewRow.vue'
import OverviewStorageSummary from './OverviewStorageSummary.vue'
import OverviewTranscodePanel from './OverviewTranscodePanel.vue'
import {
  canCancelImport,
  isAnonymizationProcessing,
  isImportInterrupted,
  getFileDisplayName,
  getOriginalFileDeletionState,
  type OriginalFileDeletionState
} from './overviewPresentation'

const runtimeLogger = createRuntimeLogger('anonymization-overview')

// Composables
const router = useRouter()
const anonymizationStore = useAnonymizationStore()
const mediaStore = useMediaTypeStore()
const pollingProtection = usePollingProtection()
const mediaManagement = useMediaManagement()

const toMediaItem = (file: FileItem): MediaItem => ({
  id: file.id,
  mediaType: file.mediaType,
  scope: file.mediaType,
  filename: file.filename
})

const getFileKey = (file: FileItem): string => {
  if (file.quarantineId) return `quarantine:${file.quarantineId}`
  if (file.importOnly && file.uploadJob) return `import:${file.uploadJob.id}`
  return `${file.mediaType}:${String(file.id)}`
}

// Local state
const isRefreshing = ref(false)
const isRepairingVideoStates = ref(false)
const videoStateRepairMessage = ref('')
const transcodeRefreshToken = ref(0)
let bulkTranscodeAttempt: { option: TranscodeOption; idempotencyKey: string; afterVideoId: number } | null = null
const processingFiles = ref<Set<string>>(new Set())
const cancellationError = ref('')
const monitoringRefreshHandle = ref<ReturnType<typeof setTimeout> | null>(null)
const tableScrollElement = ref<HTMLElement | null>(null)
const overviewTableElement = ref<HTMLTableElement | null>(null)
const stickyScrollbarElement = ref<HTMLElement | null>(null)
const tableScrollWidth = ref(0)
const hasHorizontalOverflow = ref(false)
const resourceTypeFilter = ref<'all' | FileItem['mediaType']>('all')
const physicalStorageStateFilter = ref<'all' | OriginalFileDeletionState>('all')
let tableResizeObserver: ResizeObserver | null = null
let isMounted = false
const isComponentMounted = () => isMounted
let overviewRefresh: Promise<void> | null = null
let monitoringRefreshFailed = false
const MONITORING_REFRESH_INTERVAL_MS = 15000

// Computed properties
const overviewFiles = computed(() => anonymizationStore.overview)
const ambiguousDeletionIds = computed(() => {
  const mediaTypesById = new Map<number, FileItem['mediaType']>()
  const ambiguousIds = new Set<number>()
  for (const file of overviewFiles.value) {
    if (file.importOnly || file.quarantined) continue
    const existingType = mediaTypesById.get(file.id)
    if (existingType && existingType !== file.mediaType) ambiguousIds.add(file.id)
    mediaTypesById.set(file.id, file.mediaType)
  }
  return ambiguousIds
})
const availableFiles = computed(() =>
  overviewFiles.value.filter((file) => {
    const matchesResourceType =
      resourceTypeFilter.value === 'all' || file.mediaType === resourceTypeFilter.value
    const matchesStorageState =
      physicalStorageStateFilter.value === 'all' ||
      getOriginalFileDeletionState(file) === physicalStorageStateFilter.value
    return matchesResourceType && matchesStorageState
  })
)
const hasActiveTableFilters = computed(
  () => resourceTypeFilter.value !== 'all' || physicalStorageStateFilter.value !== 'all'
)

const resetTableFilters = () => {
  resourceTypeFilter.value = 'all'
  physicalStorageStateFilter.value = 'all'
}

const updateStickyScrollbar = () => {
  const container = tableScrollElement.value
  if (!container) {
    return
  }

  tableScrollWidth.value = container.scrollWidth
  hasHorizontalOverflow.value = container.scrollWidth > container.clientWidth

  if (stickyScrollbarElement.value) {
    stickyScrollbarElement.value.scrollLeft = container.scrollLeft
  }
}

const syncStickyScrollbar = () => {
  updateStickyScrollbar()
}

const syncTableScroll = () => {
  const container = tableScrollElement.value
  const stickyScrollbar = stickyScrollbarElement.value
  if (container && stickyScrollbar && container.scrollLeft !== stickyScrollbar.scrollLeft) {
    container.scrollLeft = stickyScrollbar.scrollLeft
  }
}

const refreshOverview = (): Promise<void> => {
  if (!isComponentMounted()) return Promise.resolve()
  if (overviewRefresh) return overviewRefresh
  isRefreshing.value = true
  overviewRefresh = (async () => {
    try {
      await anonymizationStore.fetchOverview()
      monitoringRefreshFailed = Boolean(anonymizationStore.error)
      if (!isComponentMounted()) return
      mediaStore.seedTypesFromOverview(anonymizationStore.overview)
      await nextTick()
      if (isComponentMounted()) updateStickyScrollbar()
    } catch (refreshError: unknown) {
      monitoringRefreshFailed = true
      runtimeLogger.error('monitoring-refresh-failed', refreshError)
    } finally {
      overviewRefresh = null
      isRefreshing.value = false
      scheduleMonitoringRefresh()
    }
  })()
  return overviewRefresh
}

const repairWithTranscodes = async (option: TranscodeOption) => {
  if (bulkTranscodeAttempt?.option !== option) {
    bulkTranscodeAttempt = { option, idempotencyKey: crypto.randomUUID(), afterVideoId: 0 }
  }
  const attempt = bulkTranscodeAttempt
  let queued = 0
  let existing = 0
  let rejected = 0
  while (isComponentMounted()) {
    const result = await anonymizationStore.repairAllVideoStates(false, { ...attempt })
    if (!isComponentMounted() || !result) return
    const submissions = result.transcodes
    if (!submissions) {
      videoStateRepairMessage.value = 'Der Server hat keine Transkodierungsaufträge bestätigt. Bitte den Serverstand prüfen.'
      return
    }
    queued += submissions.queued
    existing += submissions.existing
    rejected += submissions.rejected
    videoStateRepairMessage.value = `${String(queued)} Transkodierungen eingereiht, ${String(existing)} vorhandene Aufträge, ${String(rejected)} abgelehnt. Annotationen und Importquellen bleiben erhalten.`
    transcodeRefreshToken.value += 1
    const nextCursor = submissions.nextAfterVideoId
    if (nextCursor === null) {
      bulkTranscodeAttempt = null
      return
    }
    if (!Number.isSafeInteger(nextCursor) || nextCursor <= attempt.afterVideoId) {
      videoStateRepairMessage.value += ' Ungültiger Fortsetzungspunkt; Sammelauftrag wurde angehalten.'
      return
    }
    attempt.afterVideoId = nextCursor
  }
}

const repairAllVideoStates = async (option?: TranscodeOption) => {
  if (isRepairingVideoStates.value) return
  isRepairingVideoStates.value = true
  videoStateRepairMessage.value = ''
  try {
    if (option) {
      await repairWithTranscodes(option)
      return
    }
    const result = await anonymizationStore.repairAllVideoStates(false)
    if (!isComponentMounted() || !result) {
      return
    }
    const mustReimport = result.items
      .filter((item) => item.status === 'reimport_required')
      .map((item) => `ID ${String(item.videoId)}${item.filename ? ` (${item.filename})` : ''}`)
    videoStateRepairMessage.value =
      `${String(result.summary.repaired)} repariert, ${String(result.summary.consistent)} bereits konsistent, ${String(result.summary.blocked ?? 0)} blockiert. ` +
      (mustReimport.length
        ? `Neuimport erforderlich: ${mustReimport.join(', ')}. Annotationen wurden nicht gelöscht.`
        : 'Kein Neuimport erforderlich. Annotationen wurden nicht gelöscht.')
  } finally {
    isRepairingVideoStates.value = false
  }
}

const startAnonymization = async (file: FileItem) => {
  const mediaType = file.mediaType
  if (mediaType === 'unknown' || file.importOnly || file.quarantined) return

  // Use polling protection for start anonymization
  const result = await pollingProtection.startAnonymizationSafeWithProtection(file.id, mediaType)

  if (result) {
    // Refresh overview to get updated status
    await refreshOverview()
    runtimeLogger.info('anonymization-start-completed', { fileType: file.mediaType })
  } else {
    runtimeLogger.warn('anonymization-start-rejected', { fileType: file.mediaType })
  }
}

const correctFile = (file: FileItem) => {
  mediaStore.setCurrentItem(toMediaItem(file))

  void router.push({
    name: 'Anonymisierung Korrektur',
    params: { fileId: String(file.id) },
    query: { mediaType: file.mediaType }
  })
}

const validateFile = async (file: FileItem) => {
  if (!file.id || file.mediaType === 'unknown' || file.importOnly || file.quarantined) return
  const fileId = file.id
  const mediaType = file.mediaType
  processingFiles.value.add(getFileKey(file))

  try {
    const result = await anonymizationStore.setCurrentForValidation(fileId, mediaType)

    if (result) {
      mediaStore.setCurrentItem(toMediaItem(file))
      const kind = file.mediaType

      try {
        mediaStore.rememberType(fileId, kind, kind)
      } catch (error) {
        runtimeLogger.error('media-type-memory-failed', error, { fileType: kind })
      }

      if (file.sensitiveMetaId) {
        mediaStore.rememberType(file.sensitiveMetaId, kind, 'meta')
      }

      sessionStorage.setItem('last:fileId', String(fileId))
      sessionStorage.setItem('last:scope', kind)

      runtimeLogger.info('validation-selection-ready', { fileType: file.mediaType })

      await router.push({
        name: 'AnonymisierungValidierung',
        query: {
          fileId: String(fileId),
          mediaType: file.mediaType // now correctly 'pdf' when you clicked a pdf
        }
      })
    }
  } catch (error) {
    runtimeLogger.error('validation-navigation-failed', error)
  } finally {
    processingFiles.value.delete(getFileKey(file))
  }
}

const reimportVideo = async (file: FileItem) => {
  const fileId = file.id
  processingFiles.value.add(getFileKey(file))
  try {
    const success = await anonymizationStore.reimportVideo(fileId)
    if (success) {
      // Refresh overview to get updated status
      await refreshOverview()

      runtimeLogger.info('video-state-repair-completed')
    } else {
      runtimeLogger.warn('video-state-repair-rejected')
    }
  } finally {
    processingFiles.value.delete(getFileKey(file))
  }
}

const reimportPdf = async (file: FileItem) => {
  const fileId = file.id
  processingFiles.value.add(getFileKey(file))
  try {
    // Use the dedicated PDF reimport endpoint from the anonymization store
    const success = await anonymizationStore.reimportPdf(fileId)
    if (success) {
      // Refresh overview to get updated status
      await refreshOverview()
      runtimeLogger.info('media-reimport-completed', { fileType: 'pdf' })
    } else {
      runtimeLogger.warn('media-reimport-rejected', { fileType: 'pdf' })
    }
  } catch (error) {
    runtimeLogger.error('media-reimport-failed', error, { fileType: 'pdf' })
  } finally {
    processingFiles.value.delete(getFileKey(file))
  }
}

const applyCancellationAcknowledgment = (jobId: string, result: ImportCancellationResponse) => {
  if (result.uploadJob.id !== jobId) throw new Error('Cancellation response identity mismatch')
  for (const item of overviewFiles.value) {
    if (item.uploadJob?.id === jobId) item.uploadJob = result.uploadJob
  }
}

const cancelImport = async (file: FileItem) => {
  const job = file.uploadJob
  const operationKey = getFileKey(file)
  if (!job || !canCancelImport(file) ||
      processingFiles.value.has(operationKey)) return
  const jobId = job.id
  processingFiles.value.add(operationKey)
  cancellationError.value = ''
  try {
    const result = await cancelAnonymizationImport(jobId)
    if (!isComponentMounted()) return
    // Apply only the server acknowledgment, including cancel_requested while a
    // running worker is still finishing its current safe processing scope.
    applyCancellationAcknowledgment(jobId, result)
    await refreshOverview()
  } catch (error: unknown) {
    if (!isComponentMounted()) return
    cancellationError.value = 'Abbruch konnte nicht bestätigt werden. Bitte den aktuellen Importstatus prüfen.'
    runtimeLogger.error('import-cancellation-unconfirmed', error)
    await refreshOverview()
  } finally {
    processingFiles.value.delete(operationKey)
  }
}

const retryUploadJob = async (file: FileItem) => {
  if (!file.uploadJob) {
    return
  }
  processingFiles.value.add(getFileKey(file))
  try {
    await anonymizationStore.retryUploadJob(file.uploadJob.id)
    scheduleMonitoringRefresh()
  } finally {
    processingFiles.value.delete(getFileKey(file))
  }
}

const dismissImport = async (file: FileItem) => {
  if (!file.importOnly || !file.uploadJob || !file.canDismissImport || file.quarantined) {
    return
  }
  if (
    !confirm(
      `Import "${getFileDisplayName(file)}" aus der Übersicht entfernen? Quelldatei und Importverlauf bleiben erhalten.`
    )
  ) {
    return
  }
  processingFiles.value.add(getFileKey(file))
  try {
    await anonymizationStore.dismissUploadJob(file.uploadJob.id)
  } finally {
    processingFiles.value.delete(getFileKey(file))
  }
}

const deleteFile = async (file: FileItem) => {
  const fileId = file.id
  if (ambiguousDeletionIds.value.has(fileId)) {
    anonymizationStore.error =
      'Löschen nicht möglich: Die Backend-API kann Video und PDF mit dieser ID nicht eindeutig zuordnen.'
    return
  }

  // Ask for confirmation
  const confirmed = confirm(
    `Sind Sie sicher, dass Sie die Datei "${getFileDisplayName(file)}" permanent löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`
  )
  if (!confirmed) {
    return
  }

  processingFiles.value.add(getFileKey(file))
  try {
    // Use the media management API to delete the file
    const result = await mediaManagement.deleteMediaFile(fileId)
    if (result) {
      // Refresh overview to remove the deleted file from the list
      await refreshOverview()
      runtimeLogger.info('media-deletion-completed', { fileType: file.mediaType })
    } else {
      runtimeLogger.warn('media-deletion-rejected', { fileType: file.mediaType })
    }
  } catch (error) {
    runtimeLogger.error('media-deletion-failed', error, { fileType: file.mediaType })
  } finally {
    processingFiles.value.delete(getFileKey(file))
  }
}

const isProcessing = (file: FileItem) => {
  const mediaType = file.mediaType
  const locallyProcessing = processingFiles.value.has(getFileKey(file))
  if (mediaType === 'unknown' || file.importOnly || file.quarantined) {
    return locallyProcessing || isUploadJobActive(file)
  }

  return (
    locallyProcessing ||
    isUploadJobActive(file) ||
    isHlsMaterializationActive(file) ||
    (mediaType === 'video' && anonymizationStore.isVideoReimportQueued(file.id)) ||
    !pollingProtection.canProcessMedia.value(file.id, mediaType)
  )
}

const isUploadJobActive = (file: FileItem) => {
  const status = (file.uploadJob?.status || '').toLowerCase()
  return status === 'pending' || status === 'processing' || status === 'retrying' || status === 'cancel_requested'
}

const isHlsMaterializationActive = (file: FileItem) =>
  (file.hlsMaterializations || []).some(
    (materialization) =>
      materialization.status === 'queued' || materialization.status === 'materializing'
  )

const hasActiveMonitoringState = () =>
  overviewFiles.value.some((file) => isUploadJobActive(file) || isHlsMaterializationActive(file) ||
    (file.uploadJob?.status !== 'cancelled' && isAnonymizationProcessing(file)))

const scheduleMonitoringRefresh = () => {
  if (!isComponentMounted() || overviewRefresh || monitoringRefreshHandle.value) {
    return
  }
  if (!hasActiveMonitoringState() && !monitoringRefreshFailed) {
    return
  }
  monitoringRefreshHandle.value = setTimeout(() => {
    monitoringRefreshHandle.value = null
    void refreshOverview()
  }, MONITORING_REFRESH_INTERVAL_MS)
}

watch(hasActiveMonitoringState, (active) => {
  if (active) scheduleMonitoringRefresh()
  else if (!monitoringRefreshFailed && monitoringRefreshHandle.value) {
    clearTimeout(monitoringRefreshHandle.value)
    monitoringRefreshHandle.value = null
  }
})

const getTotalByStatus = (status: string) => {
  const statusMap: Partial<Record<string, string[]>> = {
    not_started: ['not_started'],
    processing: ['processing_anonymization', 'extracting_frames', 'predicting_segments'],
    done_processing_anonymization: ['done_processing_anonymization', 'validated'],
    failed: ['failed']
  }

  const relevantStatuses = statusMap[status] || [status]
  return availableFiles.value.filter((file) => !isImportInterrupted(file) && relevantStatuses.includes(file.anonymizationStatus))
    .length
}

// Lifecycle
onMounted(async () => {
  isMounted = true
  // Fetch overview data
  await refreshOverview()
  if (!isComponentMounted()) return
  await nextTick()
  if (!isComponentMounted()) return
  updateStickyScrollbar()
  if (typeof ResizeObserver !== 'undefined') {
    tableResizeObserver = new ResizeObserver(updateStickyScrollbar)
    if (tableScrollElement.value) {
      tableResizeObserver.observe(tableScrollElement.value)
    }
    if (overviewTableElement.value) {
      tableResizeObserver.observe(overviewTableElement.value)
    }
  }
  runtimeLogger.debug('media-type-seed-completed', {
    count: anonymizationStore.overview.length
  })

  // The aggregate API covers both media types and import-only UUIDs. Avoid
  // starting one numeric-ID status request loop for every visible resource.
  scheduleMonitoringRefresh()
})

onUnmounted(() => {
  isMounted = false
  tableResizeObserver?.disconnect()
  tableResizeObserver = null
  if (monitoringRefreshHandle.value) {
    clearTimeout(monitoringRefreshHandle.value)
    monitoringRefreshHandle.value = null
  }
  // Clean up all polling when component is unmounted
  anonymizationStore.stopAllPolling()

  // Clear any remaining processing locks
  pollingProtection.clearAllLocalLocks()
})
const repairButtonLabel = computed(() =>
  isRepairingVideoStates.value ? 'Reparatur läuft…' : 'Videozustände reparieren'
)

const pendingValidationCount = computed(() => getTotalByStatus('done_processing_anonymization'))
</script>

<style scoped>
.overview-filter-bar {
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.9rem;
  border: 1px solid var(--lx-border, #dee2e6);
  border-radius: var(--lx-corner-radius);
  background: var(--lx-surface-muted, #f8f9fa);
}

.overview-filter-field {
  flex: 0 1 16rem;
  min-width: 13rem;
}

.overview-filter-summary {
  margin: 0 auto 0.5rem 0;
  color: var(--lx-ink-muted, #6c757d);
  font-size: 0.82rem;
  font-weight: 700;
}

.overview-filter-empty {
  border: 1px dashed var(--lx-border-strong, #ced4da);
  border-radius: var(--lx-corner-radius);
  background: var(--lx-surface-muted, #f8f9fa);
}

.table th {
  border-top: none;
  font-weight: 600;
  color: #6c757d;
  font-size: 0.875rem;
}

.overview-files-table th {
  background-color: #fff;
}

.overview-files-table thead th {
  background-color: #f8f9fa;
}

.overview-files-table {
  min-width: 1180px;
}

.overview-table-scroll {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.overview-table-scroll::-webkit-scrollbar {
  display: none;
}

.overview-sticky-scrollbar {
  position: sticky;
  bottom: 0;
  z-index: 4;
  height: 14px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
  background-color: #fff;
  border-top: 1px solid #dee2e6;
  scrollbar-color: #5e72e4 #e9ecef;
  scrollbar-width: auto;
}

.overview-sticky-scrollbar::-webkit-scrollbar {
  height: 12px;
}

.overview-sticky-scrollbar::-webkit-scrollbar-track {
  background: #e9ecef;
  border-radius: 6px;
}

.overview-sticky-scrollbar::-webkit-scrollbar-thumb {
  background: #5e72e4;
  border-radius: 6px;
}

.overview-sticky-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #344767;
}

.overview-sticky-scrollbar-spacer {
  height: 1px;
}

.overview-files-table .sticky-filename-column {
  position: sticky;
  left: 0;
  width: 22rem;
  min-width: 18rem;
  max-width: 22rem;
  background: #fff;
  box-shadow: 0.25rem 0 0.75rem rgba(0, 0, 0, 0.04);
  z-index: 2;
}

.overview-files-table thead .sticky-filename-column {
  background: #f8f9fa;
  z-index: 3;
}

.overview-files-table .validation-action-column {
  position: sticky;
  right: 0;
  min-width: 9rem;
  background: #fff;
  box-shadow: -0.25rem 0 0.75rem rgba(0, 0, 0, 0.06);
  z-index: 2;
}

.overview-files-table thead .validation-action-column {
  background: #f8f9fa;
  z-index: 3;
}

.badge {
  font-size: 0.75rem;
}

.fs-6 {
  font-size: 1.25rem !important;
}

.card-body .row.text-center .col-md-3 {
  margin-bottom: 1rem;
  background-color: lightgray;
}

@media (max-width: 768px) {
  .overview-files-table .sticky-filename-column {
    width: 15rem;
    min-width: 13rem;
    max-width: 15rem;
  }

  .table-responsive {
    font-size: 0.875rem;
  }
}
</style>
