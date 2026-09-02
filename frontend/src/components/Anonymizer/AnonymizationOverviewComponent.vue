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
            @click="repairAllVideoStates"
          >
            {{ isRepairingVideoStates ? 'Reparatur läuft…' : 'Videozustände reparieren' }}
          </button>
          <button
            class="btn btn-outline-primary btn-sm"
            :disabled="isRefreshing"
            @click="refreshOverview"
          >
            <i class="ni ni-bold-right" :class="{ 'ni-spin': isRefreshing }"></i>
            Aktualisieren
          </button>
        </div>

      </div>

      <div class="card-body">
        <div v-if="videoStateRepairMessage" class="alert alert-info" role="status">
          {{ videoStateRepairMessage }}
        </div>
        <!-- Error State -->
        <div v-if="anonymizationStore.error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ anonymizationStore.error }}
        </div>
        <!-- Loading State -->
        <div v-if="anonymizationStore.loading && !overviewFiles.length" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
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
            Laden Sie Videos oder PDFs in den <code>data</code>-Ordner oder den <code>import</code>-Ordner, um mit der Anonymisierung zu beginnen.
          </p>
        </div>

        <div
          v-if="overviewFiles.length"
          class="overview-filter-bar"
          data-test="anonymization-overview-filters"
          aria-label="Anonymisierungsdateien filtern"
        >
          <div class="overview-filter-field">
            <label for="anonymization-resource-type-filter" class="form-label mb-1">
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
            <label for="anonymization-storage-state-filter" class="form-label mb-1">
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
          <div class="overview-filter-summary" aria-live="polite">
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
          <button type="button" class="btn btn-outline-primary btn-sm" @click="resetTableFilters">
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
              <tr
                v-for="file in availableFiles"
                :key="`${file.mediaType}-${file.id}`"
                :class="{ 'table-warning': file.quarantined }"
              >
                <!-- Filename -->
                <td class="sticky-filename-column">
                  <div class="d-flex align-items-start filename-cell-content">
                    <i
                      :class="getFileIcon(file.mediaType)"
                      class="me-2 flex-shrink-0"
                    ></i>
                    <div class="filename-details">
                      <span class="fw-medium filename-text">{{ getFileDisplayName(file) }}</span>
                      <div class="small text-muted mt-1">
                        {{ getFileIdLabel(file) }}
                      </div>
                      <div v-if="file.quarantined" class="small text-warning mt-1 quarantine-file-note">
                        Import blockiert: Datei liegt in Quarantäne.
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Media Type -->
                <td>
                  <span
                    :class="getMediaTypeBadgeClass(file.mediaType)"
                    class="badge"
                  >
                    {{ file.mediaType.toUpperCase() }}
                  </span>
                </td>
                <!-- Actions -->
                <td>
                  <div v-if="file.quarantined" class="small text-warning quarantine-action-note">
                    Serverseitige Quarantäne
                    <div v-if="getQuarantineReviewLabel(file)" class="text-muted mt-1">
                      {{ getQuarantineReviewLabel(file) }}
                    </div>
                  </div>
                  <div v-else class="btn-group btn-group-sm" role="group">
                    <button
                      v-if="file.importOnly && file.uploadJob && (file.uploadJob.retryable || canUseImportAction(file, 'safe_reimport'))"
                      data-test="retry-upload-job-button"
                      class="btn btn-outline-warning"
                      :disabled="processingFiles.has(file.id)"
                      title="Gespeicherte Importquelle erneut verarbeiten"
                      @click="retryUploadJob(file)"
                    >
                      <i class="ni ni-bold-right"></i>
                      Jetzt erneut versuchen
                    </button>

                    <!-- Re-import for videos with missing/incorrect metadata -->
                    <button
                      v-if="!file.importOnly && file.mediaType === 'video' && needsReimport(file) && canUseImportAction(file, 'safe_reimport')"
                      class="btn btn-outline-info"
                      :disabled="isProcessing(file.id)"
                      title="Video erneut importieren und Metadaten aktualisieren"
                      @click="reimportVideo(file.id)"
                    >
                      <i class="ni ni-bold-right"></i>
                      Erneut importieren
                    </button>

                    <!-- Re-import for PDFs (using reset-status for now) -->
                    <button
                      v-if="!file.importOnly && file.mediaType === 'pdf' && needsReimport(file) && canUseImportAction(file, 'safe_reimport')"
                      class="btn btn-outline-info"
                      :disabled="isProcessing(file.id)"
                      title="PDF erneut importieren und verarbeiten"
                      @click="reimportPdf(file.id)"
                    >
                      <i class="ni ni-bold-right"></i>
                      Erneut importieren
                    </button>

                    <!-- Start Anonymization -->
                    <button
                      v-if="!file.importOnly && file.anonymizationStatus === 'not_started'"
                      class="btn btn-outline-primary"
                      :disabled="isProcessing(file.id)"
                      @click="startAnonymization(file.id)"
                    >
                      <i class="ni ni-button-play"></i>
                      Starten
                    </button>

                    <!-- Restart Anonymization -->
                    <button
                      v-if="!file.importOnly && file.anonymizationStatus === 'failed'"
                      class="btn btn-outline-warning"
                      :disabled="isProcessing(file.id)"
                      @click="startAnonymization(file.id)"
                    >
                      <i class="ni ni-bold-right"></i>
                      Erneut versuchen
                    </button>

                    <!-- Media Correction -->
                    <button
                      v-if="(file.mediaType === 'video' || file.mediaType === 'pdf') && (file.anonymizationStatus === 'done_processing_anonymization' || file.anonymizationStatus === 'validated')"
                      data-test="correction-button"
                      class="btn btn-outline-warning"
                      :disabled="isProcessing(file.id)"
                      @click="correctFile(file)"
                    >
                      <i class="ni ni-single-copy-04"></i>
                      Korrektur
                    </button>

                    <!-- Delete Button - Show for all files -->
                    <button
                      v-if="!file.importOnly && canUseImportAction(file, 'delete')"
                      data-test="delete-file-button"
                      class="btn btn-outline-danger"
                      :disabled="isProcessing(file.id)"
                      :aria-label="`Datei ${file.id} löschen`"
                      title="Datei permanent löschen"
                      @click="deleteFile(file.id)"
                    >
                      <i class="ni ni-settings-gear-65"></i>
                      Löschen
                    </button>

                    <!-- Processing indicator -->
                    <button
                      v-if="file.anonymizationStatus === 'processing_anonymization'"
                      class="btn btn-outline-info"
                      disabled
                    >
                      <i class="ni ni-settings-gear-65 ni-spin me-1"></i>
                      Anonymisierung...
                    </button>
                    <button
                      v-if="file.anonymizationStatus === 'extracting_frames'"
                      class="btn btn-outline-info"
                      disabled
                    >
                      <i class="ni ni-settings-gear-65 ni-spin me-1"></i>
                      Einzelbilder werden extrahiert...
                    </button>

                  </div>
                </td>

                <!-- Upload Job Status -->
                <td>
                  <div v-if="file.uploadJob" class="upload-job-summary">
                    <span
                      class="badge"
                      :class="getUploadJobStatusBadgeClass(file.uploadJob.status)"
                    >
                      {{ getUploadJobStatusText(file.uploadJob.status) }}
                    </span>
                    <div v-if="getUploadJobOriginLabel(file.uploadJob)" class="small text-muted mt-1 upload-job-text">
                      {{ getUploadJobOriginLabel(file.uploadJob) }}
                    </div>
                    <div v-if="getUploadJobCleanupLabel(file.uploadJob)" class="small text-muted upload-job-text">
                      {{ getUploadJobCleanupLabel(file.uploadJob) }}
                    </div>
                    <div v-if="file.uploadJob.updatedAt" class="small text-muted upload-job-text">
                      Aktualisiert: {{ formatDate(file.uploadJob.updatedAt) }}
                    </div>
                    <div
                      v-if="getUploadJobNotice(file)"
                      class="small mt-1 upload-job-text"
                      :class="getUploadJobNoticeClass(file)"
                    >
                      {{ getUploadJobNotice(file) }}
                    </div>
                  </div>
                  <span v-else class="text-muted">-</span>
                </td>

                <!-- HTTP Live Streaming Materialization -->
                <td>
                  <div
                    v-if="file.hlsMaterializations?.length"
                    class="hls-materialization-summary"
                  >
                    <div
                      v-for="materialization in file.hlsMaterializations"
                      :key="materialization.artifactKind"
                      class="mb-1"
                    >
                      <span
                        class="badge"
                        :class="getHlsStatusBadgeClass(materialization.status)"
                      >
                        {{ getHlsArtifactKindText(materialization.artifactKind) }}:
                        {{ getHlsStatusText(materialization.status) }}
                      </span>
                      <div class="small text-muted upload-job-text">
                        Aktualisiert: {{ formatDate(materialization.updatedAt) }}
                      </div>
                      <div
                        v-if="materialization.status === 'failed'"
                        class="small text-danger upload-job-text"
                      >
                        HLS-Erzeugung fehlgeschlagen. Details sind im Server-Log verfügbar.
                      </div>
                    </div>
                  </div>
                  <span v-else class="text-muted">-</span>
                </td>

                <!-- Anonymization Status -->
                <td>
                  <span v-if="file.importOnly" class="text-muted">-</span>
                  <span
                    v-else
                    :class="getStatusBadgeClass(file.anonymizationStatus)"
                    class="badge"
                  >
                    <i
                      v-if="file.anonymizationStatus === 'processing_anonymization'"
                      class="ni ni-settings-gear-65 ni-spin me-1"
                    ></i>
                    {{ getStatusText(file.anonymizationStatus) }}
                  </span>
                </td>

                <!-- Annotation Status -->
                <td>
                  <span v-if="file.importOnly" class="text-muted">-</span>
                  <span
                    v-else
                    :class="getStatusBadgeClass(file.annotationStatus)"
                    class="badge"
                  >
                    {{ getStatusText(file.annotationStatus) }}
                  </span>
                </td>

                <!-- Validation Action -->
                <td class="validation-action-column">
                  <button
                    v-if="file.anonymizationStatus === 'done_processing_anonymization'"
                    class="btn btn-success btn-sm"
                    :disabled="!isReadyForValidation(file.id)"
                    @click="validateFile(file.id, file.mediaType)"
                  >
                    <i class="ni ni-user-run me-1"></i>
                    Validieren
                  </button>
                  <span v-else-if="file.anonymizationStatus === 'validated'" class="badge bg-success">
                    <i class="ni ni-check-bold me-1"></i>
                    Validiert
                  </span>
                  <span v-else class="text-muted">-</span>
                </td>

                <!-- Original File Cleanup -->
                <td>
                  <span :class="getOriginalFileDeletionClass(file)">
                    <i :class="getOriginalFileDeletionIcon(file)" class="me-1"></i>
                    {{ getOriginalFileDeletionText(file) }}
                  </span>
                  <div v-if="getOriginalFileDeletionHint(file)" class="small text-muted raw-file-state-hint">
                    {{ getOriginalFileDeletionHint(file) }}
                  </div>
                </td>

                <!-- Created Date -->
                <td>
                  <small class="text-muted">
                    {{ formatDate(file.createdAt) }}
                  </small>
                </td>
              </tr>
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
        <div v-if="availableFiles.length" class="row mt-4">
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
                        {{ getTotalByStatus('done_processing_anonymization') }}
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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore, type FileItem, type UploadJobOverview } from '@/stores/anonymizationStore';
import { useMediaTypeStore, type MediaItem } from '@/stores/mediaTypeStore';
import { usePollingProtection } from '@/composables/usePollingProtection';
import { useMediaManagement } from '@/api/mediaManagement';
import { type MediaType } from '../../stores/mediaTypeStore';
import { createRuntimeLogger } from '@/utils/runtimeLogger';

const runtimeLogger = createRuntimeLogger('anonymization-overview');

// Composables
const router = useRouter();
const anonymizationStore = useAnonymizationStore();
const mediaStore = useMediaTypeStore();
const pollingProtection = usePollingProtection();
const mediaManagement = useMediaManagement();

const toMediaItem = (file: FileItem): MediaItem => ({
  id: file.id,
  mediaType: file.mediaType,
  scope: file.mediaType,
  filename: file.filename,
});

const normalizeMediaType = (mediaType: string): MediaType =>
  mediaType === 'pdf' || mediaType === 'video' ? mediaType : 'unknown';

// Local state
const isRefreshing = ref(false);
const isRepairingVideoStates = ref(false);
const videoStateRepairMessage = ref('');
const processingFiles = ref<Set<number>>(new Set());
const monitoringRefreshHandle = ref<ReturnType<typeof setTimeout> | null>(null);
const tableScrollElement = ref<HTMLElement | null>(null);
const overviewTableElement = ref<HTMLTableElement | null>(null);
const stickyScrollbarElement = ref<HTMLElement | null>(null);
const tableScrollWidth = ref(0);
const hasHorizontalOverflow = ref(false);
const resourceTypeFilter = ref<'all' | FileItem['mediaType']>('all');
type OriginalFileDeletionState = 'deleted' | 'present' | 'quarantined' | 'unknown';
const physicalStorageStateFilter = ref<'all' | OriginalFileDeletionState>('all');
let tableResizeObserver: ResizeObserver | null = null;
const MONITORING_REFRESH_INTERVAL_MS = 15000;

const getOriginalFileDeletionState = (file: FileItem): OriginalFileDeletionState => {
  if (file.quarantined) return 'quarantined';

  if (typeof file.uploadJob?.sourceFilePersisted === 'boolean') {
    return file.uploadJob.sourceFilePersisted ? 'present' : 'deleted';
  }

  const cleanupStatus = file.uploadJob?.cleanupStatus?.toLowerCase();
  if (cleanupStatus === 'completed') return 'deleted';
  if (cleanupStatus === 'pending' || cleanupStatus === 'eligible') return 'present';
  if (file.rawFile?.trim()) return 'present';
  return 'unknown';
};

// Computed properties
const overviewFiles = computed(() => anonymizationStore.overview);
const availableFiles = computed(() =>
  overviewFiles.value.filter((file) => {
    const matchesResourceType =
      resourceTypeFilter.value === 'all' || file.mediaType === resourceTypeFilter.value;
    const matchesStorageState =
      physicalStorageStateFilter.value === 'all' ||
      getOriginalFileDeletionState(file) === physicalStorageStateFilter.value;
    return matchesResourceType && matchesStorageState;
  })
);
const hasActiveTableFilters = computed(
  () => resourceTypeFilter.value !== 'all' || physicalStorageStateFilter.value !== 'all'
);

const resetTableFilters = () => {
  resourceTypeFilter.value = 'all';
  physicalStorageStateFilter.value = 'all';
};

const updateStickyScrollbar = () => {
  const container = tableScrollElement.value;
  if (!container) return;

  tableScrollWidth.value = container.scrollWidth;
  hasHorizontalOverflow.value = container.scrollWidth > container.clientWidth;

  if (stickyScrollbarElement.value) {
    stickyScrollbarElement.value.scrollLeft = container.scrollLeft;
  }
};

const syncStickyScrollbar = () => {
  updateStickyScrollbar();
};

const syncTableScroll = () => {
  const container = tableScrollElement.value;
  const stickyScrollbar = stickyScrollbarElement.value;
  if (container && stickyScrollbar && container.scrollLeft !== stickyScrollbar.scrollLeft) {
    container.scrollLeft = stickyScrollbar.scrollLeft;
  }
};

const refreshOverview = async () => {
  isRefreshing.value = true;
  try {
    await anonymizationStore.fetchOverview();
    mediaStore.seedTypesFromOverview(anonymizationStore.overview);
    await nextTick();
    updateStickyScrollbar();
  } finally {
    isRefreshing.value = false;
  }
};

const repairAllVideoStates = async () => {
  isRepairingVideoStates.value = true;
  videoStateRepairMessage.value = '';
  try {
    const result = await anonymizationStore.repairAllVideoStates(false);
    if (!result) return;
    const mustReimport = result.items
      .filter((item) => item.status === 'reimport_required')
      .map((item) => `ID ${String(item.videoId)}${item.filename ? ` (${item.filename})` : ''}`);
    videoStateRepairMessage.value =
      `${String(result.summary.repaired)} repariert, ${String(result.summary.consistent)} bereits konsistent. ` +
      (mustReimport.length
        ? `Neuimport erforderlich: ${mustReimport.join(', ')}. Annotationen wurden nicht gelöscht.`
        : 'Kein Neuimport erforderlich. Annotationen wurden nicht gelöscht.');
  } finally {
    isRepairingVideoStates.value = false;
  }
};

const startAnonymization = async (fileId: number) => {
  // Find the file to determine media type
  const file = availableFiles.value.find(f => f.id === fileId);
  if (!file) {
    runtimeLogger.warn('anonymization-file-missing');
    return;
  }

  const mediaType = file.mediaType === 'video' ? 'video' : 'pdf';

  // Use polling protection for start anonymization
  const result = await pollingProtection.startAnonymizationSafeWithProtection(fileId, mediaType);

  if (result) {
    // Refresh overview to get updated status
    await refreshOverview();
    runtimeLogger.info('anonymization-start-completed', { fileType: file.mediaType });
  } else {
    runtimeLogger.warn('anonymization-start-rejected', { fileType: file.mediaType });
  }
};

const correctFile = (file: FileItem) => {
  mediaStore.setCurrentItem(toMediaItem(file));

  void router.push({
    name: 'Anonymisierung Korrektur',
    params: { fileId: String(file.id) },
    query: { mediaType: file.mediaType }
  });
};

const isReadyForValidation = (fileId: number) => {
  // Check if the file is ready for validation
  const file = availableFiles.value.find(f => f.id === fileId);
  if (!file) return false;

  // Only allow validation if anonymization is done
  return file.anonymizationStatus === 'done_processing_anonymization';
};

const validateFile = async (fileId: number, mediaType: string) => {
  processingFiles.value.add(fileId);
  if (!fileId) {
    runtimeLogger.warn('validation-file-missing');
    return;
  }

  try {
    const result = await anonymizationStore.setCurrentForValidation(fileId, mediaType);

    if (result) {
      // 🔧 use BOTH id and mediaType here to avoid choosing the wrong file when ids are the same (different media types)
      const file = availableFiles.value.find(
        f => f.id === fileId && f.mediaType === mediaType
      );
      if (!file) {
        runtimeLogger.warn('validation-file-type-mismatch');
        return;
      }
      mediaStore.setCurrentItem(toMediaItem(file));
      const kind = file.mediaType;

      try {
        mediaStore.rememberType(fileId, kind, kind);
      } catch (e) {
        runtimeLogger.error('media-type-memory-failed', e, { fileType: kind });
      }

      if (file.sensitiveMetaId) {
        mediaStore.rememberType(file.sensitiveMetaId, kind, 'meta');
      }

      sessionStorage.setItem('last:fileId', String(fileId));
      sessionStorage.setItem('last:scope', kind);

      runtimeLogger.info('validation-selection-ready', { fileType: file.mediaType });

      await router.push({
        name: 'AnonymisierungValidierung',
        query: {
          fileId: String(fileId),
          mediaType: file.mediaType   // now correctly 'pdf' when you clicked a pdf
        }
      });
    }
  } catch (error) {
    runtimeLogger.error('validation-navigation-failed', error);
  } finally {
    processingFiles.value.delete(fileId);
  }
};

const reimportVideo = async (fileId: number) => {
  processingFiles.value.add(fileId);
  try {
    const success = await anonymizationStore.reimportVideo(fileId);
    if (success) {
      // Refresh overview to get updated status
      await refreshOverview();

      runtimeLogger.info('media-reimport-completed', { fileType: 'video' });
    } else {
      runtimeLogger.warn('media-reimport-rejected', { fileType: 'video' });
    }
  } finally {
    processingFiles.value.delete(fileId);
  }
};

const reimportPdf = async (fileId: number) => {
  processingFiles.value.add(fileId);
  try {
    // Use the dedicated PDF reimport endpoint from the anonymization store
    const success = await anonymizationStore.reimportPdf(fileId);
    if (success) {
      // Refresh overview to get updated status
      await refreshOverview();
      runtimeLogger.info('media-reimport-completed', { fileType: 'pdf' });
    } else {
      runtimeLogger.warn('media-reimport-rejected', { fileType: 'pdf' });
    }
  } catch (error) {
    runtimeLogger.error('media-reimport-failed', error, { fileType: 'pdf' });
  } finally {
    processingFiles.value.delete(fileId);
  }
};

const retryUploadJob = async (file: FileItem) => {
  if (!file.uploadJob) return;
  processingFiles.value.add(file.id);
  try {
    await anonymizationStore.retryUploadJob(file.uploadJob.id);
  } finally {
    processingFiles.value.delete(file.id);
  }
};

const deleteFile = async (fileId: number) => {
  // Find the file for confirmation
  const file = availableFiles.value.find(f => f.id === fileId);
  if (!file) {
    runtimeLogger.warn('deletion-file-missing');
    return;
  }

  // Ask for confirmation
  const confirmed = confirm(`Sind Sie sicher, dass Sie die Datei "${getFileDisplayName(file)}" permanent löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`);
  if (!confirmed) {
    return;
  }

  processingFiles.value.add(fileId);
  try {
    // Use the media management API to delete the file
    const result = await mediaManagement.deleteMediaFile(fileId);
    if (result) {
      // Refresh overview to remove the deleted file from the list
      await refreshOverview();
      runtimeLogger.info('media-deletion-completed', { fileType: file.mediaType });
    } else {
      runtimeLogger.warn('media-deletion-rejected', { fileType: file.mediaType });
    }
  } catch (error) {
    runtimeLogger.error('media-deletion-failed', error, { fileType: file.mediaType });
  } finally {
    processingFiles.value.delete(fileId);
  }
};

const isProcessing = (fileId: number) => {
  // Find the file to determine media type
  const file = availableFiles.value.find(f => f.id === fileId);
  if (!file) return false;

  const mediaType = mediaStore.detectMediaType(file);

  // Check both local processing and polling protection
  // Handle unknown media type by falling back to local processing check only
  if (mediaType === 'unknown') {
    return processingFiles.value.has(fileId);
  }

  return processingFiles.value.has(fileId) ||
         isUploadJobActive(file) ||
         isHlsMaterializationActive(file) ||
         anonymizationStore.isVideoReimportQueued(fileId) ||
         !pollingProtection.canProcessMedia.value(fileId, mediaType);
};

const needsReimport = (file: FileItem) => {
  const metadataMissing = file.sensitiveMetaId == null || file.metadataImported === false;

  // Video files need re-import if metadata is missing
  if (file.mediaType === 'video') {
    return metadataMissing;
  }

  // PDF files might need re-import if anonymization failed or no text extracted
  if (file.mediaType === 'pdf') {
    return metadataMissing || file.anonymizationStatus === 'failed' || file.anonymizationStatus === 'not_started';
  }

  return false;
};

const isUploadJobActive = (file: FileItem) => {
  const status = (file.uploadJob?.status || '').toLowerCase();
  return status === 'pending' || status === 'processing' || status === 'retrying';
};

const isHlsMaterializationActive = (file: FileItem) =>
  (file.hlsMaterializations || []).some(materialization =>
    materialization.status === 'queued' || materialization.status === 'materializing'
  );

const canUseImportAction = (
  file: FileItem,
  action: 'safe_reimport' | 'delete'
) => {
  if (!file.uploadJob) return true;
  if (file.uploadJob.allowedActions) {
    return file.uploadJob.allowedActions.includes(action);
  }
  if (isUploadJobActive(file) || isDuplicateKeyImportError(file)) return false;
  return action === 'delete' || ['error', 'lost'].includes(file.uploadJob.status);
};

const getFileIcon = (mediaType: string) => {
  return mediaStore.getMediaTypeIcon(normalizeMediaType(mediaType));
};

const getMediaTypeBadgeClass = (mediaType: string) => {
  return mediaStore.getMediaTypeBadgeClass(normalizeMediaType(mediaType));
};

const documentTypeLabels: Record<string, string> = {
  report: 'Befund',
  report_draft: 'Befund-Entwurf',
  report_final: 'Finaler Befund',
  report_correction: 'Befund-Korrektur',
  histology_draft: 'Histologie-Entwurf',
  histology_final: 'Finale Histologie',
  referral: 'Überweisung',
  discharge: 'Entlassbrief'
};

const getDocumentTypeLabel = (documentType?: string | null) => {
  if (!documentType) return '';
  const normalized = documentType.trim();
  if (!normalized) return '';
  return documentTypeLabels[normalized] || `Dokumenttyp: ${normalized}`;
};

const getPdfPatientLabel = (file: FileItem) => {
  if (typeof file.pseudoPatientId === 'number') {
    return `Pseudo-Patient ${String(file.pseudoPatientId)}`;
  }
  if (file.patientHashDisplay) {
    return `Patient ${file.patientHashDisplay}`;
  }
  return '';
};

const getFileDisplayName = (file: FileItem) => {
  if (file.mediaType !== 'pdf' || file.quarantined) {
    return file.filename;
  }

  const labelParts = [
    getPdfPatientLabel(file),
    getDocumentTypeLabel(file.documentType)
  ].filter(Boolean);

  if (labelParts.length > 0) {
    return labelParts.join(' - ');
  }

  return file.filename || `PDF-ID: ${String(file.id)}`;
};

const getFileIdLabel = (file: FileItem) => {
  if (file.quarantined) {
    return `Quarantäne: ${file.quarantineDirectoryLabel || file.quarantineDirectoryKey || 'lx-annotate'}`;
  }
  if (file.importOnly && file.uploadJob) {
    return `Import-ID: ${file.uploadJob.id}`;
  }
  return file.mediaType === 'video'
    ? `Video-ID: ${String(file.id)}`
    : `PDF-ID: ${String(file.id)}`;
};

const getStatusBadgeClass = (status: string) => {
  const classes: { [key: string]: string } = {
    'not_started': 'bg-secondary',
    'processing_anonymization': 'bg-warning',
    'extracting_frames': 'bg-info',
    'predicting_segments': 'bg-info',
    'done_processing_anonymization': 'bg-success',
    'validated': 'bg-success',
    'failed': 'bg-danger'

  };
  return classes[status] || 'bg-secondary';
};

const getStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    'not_started': 'Nicht gestartet',
    'processing_anonymization': 'Anonymisierung läuft',
    'extracting_frames': 'Einzelbilder werden extrahiert',
    'predicting_segments': 'Segmentvorhersage läuft',
    'done_processing_anonymization': 'Fertig',
    'validated': 'Validiert',
    'failed': 'Fehlgeschlagen'
  };
  return texts[status] || `Unbekannter Status (${status})`;
};

const getUploadJobStatusBadgeClass = (status: string) => {
  const classes: { [key: string]: string } = {
    pending: 'bg-secondary',
    processing: 'bg-warning',
    retrying: 'bg-info text-dark',
    anonymized: 'bg-success',
    quarantined: 'bg-warning text-dark',
    error: 'bg-danger',
    lost: 'bg-danger'
  };
  return classes[status] || 'bg-secondary';
};

const getUploadJobStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    pending: 'Import wartet',
    processing: 'Import läuft',
    retrying: 'Import wird erneut versucht',
    anonymized: 'Import abgeschlossen',
    quarantined: 'In Quarantäne',
    error: 'Importfehler',
    lost: 'Importquelle fehlt (LOST)'
  };
  return texts[status] || `Unbekannter Importstatus (${status})`;
};

const DUPLICATE_IMPORT_NOTICE = 'Duplikat erkannt. Die vorhandene validierte Annotation bleibt erhalten.';
const IMPORT_ERROR_NOTICE = 'Importfehler. Details sind im Server-Log verfügbar.';

const isUploadJobError = (uploadJob: UploadJobOverview) => {
  const status = uploadJob.status.toLowerCase();
  return status === 'error' || status === 'lost';
};

const isDuplicateKeyImportError = (file: FileItem) => {
  return file.uploadJob?.errorCode === 'duplicate_content';
};

const getUploadJobNotice = (file: FileItem) => {
  if (!file.uploadJob) {
    return '';
  }

  if (isDuplicateKeyImportError(file)) {
    return DUPLICATE_IMPORT_NOTICE;
  }

  if (file.uploadJob.status === 'retrying') {
    const retryCount = file.uploadJob.retryCount ?? 0;
    const maxRetries = file.uploadJob.maxRetries ?? 0;
    const schedule = file.uploadJob.nextRetryAt
      ? ` Nächster Versuch: ${formatDate(file.uploadJob.nextRetryAt)}.`
      : '';
    return `Vorübergehender Importfehler. Versuch ${String(retryCount)}/${String(maxRetries)}.${schedule}`;
  }

  if (isUploadJobError(file.uploadJob)) {
    return IMPORT_ERROR_NOTICE;
  }

  return '';
};

const getUploadJobNoticeClass = (file: FileItem) => {
  if (isDuplicateKeyImportError(file)) {
    return 'text-muted';
  }
  if (file.uploadJob?.status === 'retrying') {
    return 'text-warning';
  }
  return 'text-danger';
};

const getHlsStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    queued: 'bg-secondary',
    materializing: 'bg-warning text-dark',
    ready: 'bg-success',
    failed: 'bg-danger'
  };
  return classes[status] || 'bg-secondary';
};

const getHlsStatusText = (status: string) => {
  const texts: Record<string, string> = {
    queued: 'Wartet',
    materializing: 'Wird erzeugt',
    ready: 'Bereit',
    failed: 'Fehlgeschlagen'
  };
  return texts[status] || `Unbekannter HLS-Status (${status})`;
};

const getHlsArtifactKindText = (artifactKind: string) =>
  artifactKind === 'raw' ? 'Rohvideo' : 'Anonymisiert';

const getQuarantineReviewLabel = (file: FileItem) => {
  if (!file.quarantined) return '';
  const statusTexts: Record<string, string> = {
    pending_review: 'Review erforderlich',
    retained: 'Aufbewahrung beschlossen',
    approved_for_deletion: 'Löschung freigegeben',
    failed: 'Bedienereingriff erforderlich',
    unindexed: 'Ledger-Abgleich erforderlich'
  };
  return statusTexts[file.quarantineReviewStatus || ''] || '';
};

const getUploadJobOriginLabel = (uploadJob: UploadJobOverview) => {
  const parts: string[] = [];
  if (uploadJob.ingestMode === 'watcher') {
    parts.push('Ordnerimport');
  } else if (uploadJob.ingestMode === 'api') {
    parts.push('API');
  } else if (uploadJob.ingestMode) {
    parts.push(`Importweg: ${uploadJob.ingestMode}`);
  }

  if (uploadJob.sourceSystem) {
    parts.push(uploadJob.sourceSystem);
  }

  if (uploadJob.sourceCenterKey) {
    parts.push(uploadJob.sourceCenterKey);
  }

  return parts.join(' / ');
};

const getUploadJobCleanupStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    pending: 'Bereinigung offen',
    eligible: 'Bereinigung bereit',
    completed: 'Bereinigt',
    skipped: 'Bereinigung übersprungen'
  };
  return texts[status] || `Unbekannter Bereinigungsstatus (${status})`;
};

const getUploadJobCleanupLabel = (uploadJob: UploadJobOverview) => {
  const sourceLabel =
    typeof uploadJob.sourceFilePersisted === 'boolean'
      ? uploadJob.sourceFilePersisted
        ? 'Quelle vorhanden'
        : 'Quelle bereinigt'
      : '';

  const cleanupLabel = uploadJob.cleanupStatus
    ? getUploadJobCleanupStatusText(uploadJob.cleanupStatus)
    : '';

  return [sourceLabel, cleanupLabel].filter(Boolean).join(' - ');
};

const getOriginalFileDeletionText = (file: FileItem): string => {
  const texts: Record<OriginalFileDeletionState, string> = {
    deleted: 'Ja, gelöscht',
    present: 'Nein, vorhanden',
    quarantined: 'In Quarantäne',
    unknown: 'Unbekannt'
  };
  return texts[getOriginalFileDeletionState(file)];
};

const getOriginalFileDeletionClass = (file: FileItem): string => {
  const classes: Record<OriginalFileDeletionState, string> = {
    deleted: 'text-success',
    present: 'text-warning',
    quarantined: 'text-warning',
    unknown: 'text-muted'
  };
  return classes[getOriginalFileDeletionState(file)];
};

const getOriginalFileDeletionIcon = (file: FileItem): string => {
  const icons: Record<OriginalFileDeletionState, string> = {
    deleted: 'ni ni-check-bold',
    present: 'ni ni-single-copy-04',
    quarantined: 'ni ni-settings-gear-65',
    unknown: 'ni ni-settings-gear-65'
  };
  return icons[getOriginalFileDeletionState(file)];
};

const getOriginalFileDeletionHint = (file: FileItem): string => {
  if (file.quarantined) {
    return getQuarantineReviewLabel(file) || 'Import wurde vor der Datenbankanlage gestoppt';
  }
  if (file.uploadJob?.cleanupStatus) {
    return getUploadJobCleanupStatusText(file.uploadJob.cleanupStatus);
  }
  if (file.rawFile && file.rawFile.trim() !== '') {
    return 'Rohdatei ist noch referenziert';
  }
  return '';
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const hasActiveMonitoringState = () => overviewFiles.value.some(file =>
  isUploadJobActive(file) || isHlsMaterializationActive(file)
);

const scheduleMonitoringRefresh = () => {
  if (!hasActiveMonitoringState() || monitoringRefreshHandle.value) return;
  monitoringRefreshHandle.value = setTimeout(() => {
    monitoringRefreshHandle.value = null;
    void refreshOverview()
      .then(scheduleMonitoringRefresh)
      .catch((refreshError: unknown) => {
        runtimeLogger.error('monitoring-refresh-failed', refreshError);
      });
  }, MONITORING_REFRESH_INTERVAL_MS);
};

const getTotalByStatus = (status: string) => {
  const statusMap: Partial<Record<string, string[]>> = {
    'not_started': ['not_started'],
    'processing': ['processing_anonymization', 'extracting_frames', 'predicting_segments'],
    'done_processing_anonymization': ['done_processing_anonymization', 'validated'],
    'failed': ['failed']
  };

  const relevantStatuses = statusMap[status] || [status];
  return availableFiles.value.filter(file =>
    relevantStatuses.includes(file.anonymizationStatus)
  ).length;
};


// Lifecycle
onMounted(async () => {
  // Fetch overview data
  await anonymizationStore.fetchOverview();
  mediaStore.seedTypesFromOverview(anonymizationStore.overview);
  await nextTick();
  updateStickyScrollbar();
  if (typeof ResizeObserver !== 'undefined') {
    tableResizeObserver = new ResizeObserver(updateStickyScrollbar);
    if (tableScrollElement.value) {
      tableResizeObserver.observe(tableScrollElement.value);
    }
    if (overviewTableElement.value) {
      tableResizeObserver.observe(overviewTableElement.value);
    }
  }
    runtimeLogger.debug('media-type-seed-completed', {
      count: anonymizationStore.overview.length
    });

  // Don't poll files with final states: 'done_processing_anonymization', 'validated', 'failed', 'not_started'
  const processingStatuses = ['processing_anonymization', 'extracting_frames', 'predicting_segments'];

  anonymizationStore.overview.forEach((file: FileItem) => {
    if (processingStatuses.includes(file.anonymizationStatus)) {
      runtimeLogger.debug('processing-file-poll-started', { fileType: file.mediaType });
      anonymizationStore.startPolling(file.id);
    } else {
      runtimeLogger.debug('processing-file-poll-skipped', { fileType: file.mediaType });
    }
  });

  scheduleMonitoringRefresh();


});

onUnmounted(() => {
  tableResizeObserver?.disconnect();
  tableResizeObserver = null;
  if (monitoringRefreshHandle.value) {
    clearTimeout(monitoringRefreshHandle.value);
    monitoringRefreshHandle.value = null;
  }
  // Clean up all polling when component is unmounted
  anonymizationStore.stopAllPolling();

  // Clear any remaining processing locks
  pollingProtection.clearAllLocalLocks();
});
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

.table td {
  vertical-align: middle;
}

.overview-files-table th,
.overview-files-table td {
  background-color: #fff;
}

.overview-files-table thead th {
  background-color: #f8f9fa;
}

.overview-files-table tbody tr:hover > * {
  background-color: var(--bs-table-hover-bg, #f8f9fa);
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

.overview-files-table tbody tr:hover .sticky-filename-column {
  background: var(--bs-table-hover-bg, #f8f9fa);
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

.overview-files-table tbody tr:hover .validation-action-column {
  background: var(--bs-table-hover-bg, #f8f9fa);
}

.filename-cell-content,
.filename-details {
  min-width: 0;
  max-width: 100%;
}

.filename-text {
  display: block;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.upload-job-summary {
  width: 17rem;
  min-width: 0;
  max-width: 17rem;
}

.upload-job-summary .small,
.upload-job-text,
.raw-file-state-hint {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
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
  .table-responsive {
    font-size: 0.875rem;
  }

  .btn-group-sm .btn {
    padding: 0.125rem 0.25rem;
    font-size: 0.7rem;
  }

  .overview-files-table .sticky-filename-column {
    width: 15rem;
    min-width: 13rem;
    max-width: 15rem;
  }

  .upload-job-summary {
    width: 14rem;
    max-width: 14rem;
  }
}
</style>
