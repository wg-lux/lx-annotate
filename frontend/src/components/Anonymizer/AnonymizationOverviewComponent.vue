<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0 d-flex justify-content-between align-items-center">
        <h4 class="mb-0">Anonymisierungs-Übersicht</h4>
        <div class="d-flex gap-2">
          <button 
            class="btn btn-outline-primary btn-sm"
            @click="refreshOverview"
            :disabled="isRefreshing"
          >
            <i class="ni ni-bold-right" :class="{ 'ni-spin': isRefreshing }"></i>
            Aktualisieren
          </button>
        </div>

      </div>

      <div class="card-body">
        <!-- Error State -->
        <div v-if="anonymizationStore.error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ anonymizationStore.error }}
        </div>
        <!-- Loading State -->
        <div v-if="anonymizationStore.loading && !availableFiles.length" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Dateien werden geladen...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!availableFiles.length" class="text-center py-5">
          <div class="mb-4">
            <i class="ni ni-collection ni-3x text-muted"></i>
          </div>
          <h5 class="text-muted">Keine Dateien vorhanden</h5>
          <p class="text-muted mb-4">
            Laden Sie Videos oder PDFs in den <code>data</code>-Ordner oder den <code>import</code>-Ordner, um mit der Anonymisierung zu beginnen.
          </p>
        </div>

        <!-- Files Table -->
        <div v-else class="table-responsive">
          <table class="table table-hover overview-files-table">
            <thead class="table-light">
              <tr>
                <th class="sticky-filename-column">Dateiname</th>
                <th>Typ</th>
                <th>Aktionen</th>
                <th>Import</th>
                <th>Anonymisierung</th>
                <th>Annotation</th>
                <th>Validierung</th>
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
                  </div>
                  <div v-else class="btn-group btn-group-sm" role="group">
                    <!-- Re-import for videos with missing/incorrect metadata -->
                    <button
                      v-if="file.mediaType === 'video' && needsReimport(file)"
                      @click="reimportVideo(file.id)"
                      class="btn btn-outline-info"
                      :disabled="isProcessing(file.id)"
                      title="Video erneut importieren und Metadaten aktualisieren"
                    >
                      <i class="ni ni-bold-right"></i>
                      Erneut importieren
                    </button>

                    <!-- Re-import for PDFs (using reset-status for now) -->
                    <button
                      v-if="file.mediaType === 'pdf' && needsReimport(file)"
                      @click="reimportPdf(file.id)"
                      class="btn btn-outline-info"
                      :disabled="isProcessing(file.id)"
                      title="PDF erneut importieren und verarbeiten"
                    >
                      <i class="ni ni-bold-right"></i>
                      Erneut importieren
                    </button>

                    <!-- Start Anonymization -->
                    <button
                      v-if="file.anonymizationStatus === 'not_started'"
                      @click="startAnonymization(file.id)"
                      class="btn btn-outline-primary"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="ni ni-button-play"></i>
                      Starten
                    </button>

                    <!-- Restart Anonymization -->
                    <button
                      v-if="file.anonymizationStatus === 'failed'"
                      @click="startAnonymization(file.id)"
                      class="btn btn-outline-warning"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="ni ni-bold-right"></i>
                      Erneut versuchen
                    </button>

                    <!-- Video Correction -->
                    <button
                      v-if="file.mediaType === 'video' && (file.anonymizationStatus === 'done_processing_anonymization' || file.anonymizationStatus === 'validated')"
                      @click="correctVideo(file.id)"
                      class="btn btn-outline-warning"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="ni ni-single-copy-04"></i>
                      Korrektur
                    </button>

                    <!-- Delete Button - Show for all files -->
                    <button
                      data-test="delete-file-button"
                      @click="deleteFile(file.id)"
                      class="btn btn-outline-danger"
                      :disabled="isProcessing(file.id)"
                      :aria-label="`Datei ${file.id} löschen`"
                      title="Datei permanent löschen"
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

                <!-- Anonymization Status -->
                <td>
                  <span 
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
                  <span 
                    :class="getStatusBadgeClass(file.annotationStatus)"
                    class="badge"
                  >
                    {{ getStatusText(file.annotationStatus) }}
                  </span>
                </td>

                <!-- Validation Action -->
                <td>
                  <button
                    v-if="file.anonymizationStatus === 'done_processing_anonymization'"
                    @click="validateFile(file.id, file.mediaType)"
                    class="btn btn-success btn-sm"
                    :disabled="!isReadyForValidation(file.id)"
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

        <!-- Status Summary -->
        <div class="row mt-4" v-if="availableFiles.length">
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

        <!-- Show warning if files were filtered out -->
        <div v-if="filteredOutCount > 0" class="alert alert-warning mt-3" role="alert">
          <i class="ni ni-user-run me-2"></i>
          <strong>Hinweis:</strong> {{ filteredOutCount }} Datei(en) wurden ausgeblendet, da die ursprünglichen Dateien nicht mehr verfügbar sind.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore, type FileItem, type UploadJobOverview } from '@/stores/anonymizationStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import { usePollingProtection } from '@/composables/usePollingProtection';
import { useMediaManagement } from '@/api/mediaManagement';
import { type MediaType } from '../../stores/mediaTypeStore';

// Composables
const router = useRouter();
const anonymizationStore = useAnonymizationStore();
const mediaStore = useMediaTypeStore();
const pollingProtection = usePollingProtection();
const mediaManagement = useMediaManagement();

// Local state
const isRefreshing = ref(false);
const processingFiles = ref<Set<number>>(new Set());

// Computed properties
const availableFiles = computed(() => anonymizationStore.overview);

const filteredOutCount = computed(() => 
  anonymizationStore.overview.length - availableFiles.value.length
);

// Methods
const refreshOverview = async () => {
  isRefreshing.value = true;
  try {
    await anonymizationStore.fetchOverview();
    mediaStore.seedTypesFromOverview(anonymizationStore.overview);
  } finally {
    isRefreshing.value = false;
  }
};

const startAnonymization = async (fileId: number) => {
  // Find the file to determine media type
  const file = availableFiles.value.find(f => f.id === fileId);
  if (!file) {
    console.warn('File not found for anonymization:', fileId);
    return;
  }

  const mediaType = file.mediaType === 'video' ? 'video' : 'pdf';
  
  // Use polling protection for start anonymization
  const result = await pollingProtection.startAnonymizationSafeWithProtection(fileId, mediaType);
  
  if (result?.success) {
    // Refresh overview to get updated status
    await refreshOverview();
    console.log('Anonymization started successfully for file', fileId);
  } else {
    console.warn('startAnonymization failed - staying on current page');
  }
};

const correctVideo = async (fileId: number) => {
  // Find the file to set it in MediaStore for consistency
  const file = availableFiles.value.find(f => f.id === fileId);
  if (file) {
    mediaStore.setCurrentItem(file as any);
  }
  else {
    console.warn('File not found for correction:', fileId);
    return;
  }



  // Navigate directly to the correction component with the video ID
  router.push({ name: 'Anonymisierung Korrektur',       query: {
        fileId: String(fileId),       
        mediaType: file.mediaType      // 'video' | 'pdf'
     } });
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
    console.warn('File not found for validation:', fileId);
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
        console.warn('File not found for validation with given mediaType:', { fileId, mediaType });
        return;
      }
      mediaStore.setCurrentItem(file as any);
      const kind = file.mediaType as MediaType;

      try {
        mediaStore.rememberType(fileId, kind, kind);
      } catch (e) {
        console.error('Error remembering media type for file:', fileId, e);
      }

      if (file.sensitiveMetaId) {
        mediaStore.rememberType(file.sensitiveMetaId, kind, 'meta');
      }

      sessionStorage.setItem('last:fileId', String(fileId));
      sessionStorage.setItem('last:scope', kind);

      console.log('File set for validation:', fileId, 'file media type:', file.mediaType);

      router.push({
        name: 'AnonymisierungValidierung',
        query: {
          fileId: String(fileId),
          mediaType: file.mediaType   // now correctly 'pdf' when you clicked a pdf
        }
      });
    }
  } catch (error) {
    console.error('Navigation to validation failed:', error);
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
            
      console.log('Video re-imported successfully:', fileId);
    } else {
      console.warn('Re-import failed - staying on current page');
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
      console.log('PDF re-imported successfully:', fileId);
    } else {
      console.warn('PDF re-import failed - staying on current page');
    }
  } catch (error) {
    console.error('PDF re-import failed:', error);
  } finally {
    processingFiles.value.delete(fileId);
  }
};

const deleteFile = async (fileId: number) => {
  // Find the file for confirmation
  const file = availableFiles.value.find(f => f.id === fileId);
  if (!file) {
    console.warn('File not found for deletion:', fileId);
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
      console.log('File deleted successfully:', fileId);
    } else {
      console.warn('File deletion failed');
    }
  } catch (error) {
    console.error('File deletion failed:', error);
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
         anonymizationStore.isVideoReimportQueued(fileId) ||
         !pollingProtection.canProcessMedia.value(fileId, mediaType as 'video' | 'pdf');
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
  const status = String(file.uploadJob?.status || '').toLowerCase();
  return status === 'pending' || status === 'processing';
};

const getFileIcon = (mediaType: string) => {
  return mediaStore.getMediaTypeIcon(mediaType as any);
};

const getMediaTypeBadgeClass = (mediaType: string) => {
  return mediaStore.getMediaTypeBadgeClass(mediaType as any);
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
    return `Pseudo-Patient ${file.pseudoPatientId}`;
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

  return file.filename || `PDF-ID: ${file.id}`;
};

const getFileIdLabel = (file: FileItem) => {
  if (file.quarantined) {
    return `Quarantäne: ${file.quarantineDirectoryLabel || file.quarantineDirectoryKey || 'lx-annotate'}`;
  }
  return file.mediaType === 'video'
    ? `Video-ID: ${file.id}`
    : `PDF-ID: ${file.id}`;
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
    anonymized: 'Import abgeschlossen',
    quarantined: 'In Quarantäne',
    error: 'Importfehler',
    lost: 'Import nicht möglich. Bitte Eintrag löschen und erneut importieren!'
  };
  return texts[status] || `Unbekannter Importstatus (${status})`;
};

const DUPLICATE_KEY_IMPORT_ERROR_PATTERN = /\bduplicate key\b|\bunique constraint\b/i;
const DUPLICATE_IMPORT_NOTICE = 'Duplikat erkannt. Die vorhandene validierte Annotation bleibt erhalten.';
const IMPORT_ERROR_NOTICE = 'Importfehler. Details sind im Server-Log verfügbar.';

const isUploadJobError = (uploadJob: UploadJobOverview) => {
  const status = String(uploadJob.status || '').toLowerCase();
  return status === 'error' || status === 'lost';
};

const isDuplicateKeyImportError = (file: FileItem) => {
  if (!file.uploadJob || !isUploadJobError(file.uploadJob)) {
    return false;
  }

  const errorDetail = file.uploadJob.errorDetail || file.errorDetail || '';
  return DUPLICATE_KEY_IMPORT_ERROR_PATTERN.test(errorDetail);
};

const getUploadJobNotice = (file: FileItem) => {
  if (!file.uploadJob?.errorDetail) {
    return '';
  }

  if (isDuplicateKeyImportError(file)) {
    return DUPLICATE_IMPORT_NOTICE;
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
  return 'text-danger';
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

type OriginalFileDeletionState = 'deleted' | 'present' | 'quarantined' | 'unknown';

const getOriginalFileDeletionState = (file: FileItem): OriginalFileDeletionState => {
  if (file.quarantined) {
    return 'quarantined';
  }

  if (typeof file.uploadJob?.sourceFilePersisted === 'boolean') {
    return file.uploadJob.sourceFilePersisted ? 'present' : 'deleted';
  }

  const cleanupStatus = file.uploadJob?.cleanupStatus?.toLowerCase();
  if (cleanupStatus === 'completed') {
    return 'deleted';
  }
  if (cleanupStatus === 'pending' || cleanupStatus === 'eligible') {
    return 'present';
  }

  if (file.rawFile && file.rawFile.trim() !== '') {
    return 'present';
  }

  return 'unknown';
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
    return 'Import wurde vor der Datenbankanlage gestoppt';
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

const getTotalByStatus = (status: string) => {
  const statusMap: { [key: string]: string[] } = {
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
    console.table(
      anonymizationStore.overview.map(f => ({
        id: f.id,
        fromOverview: f.mediaType,
        remembered: mediaStore.getType(f.id) // scans both pdf/video scopes
      }))
    )

  // Don't poll files with final states: 'done_processing_anonymization', 'validated', 'failed', 'not_started'
  const processingStatuses = ['processing_anonymization', 'extracting_frames', 'predicting_segments'];
  
  anonymizationStore.overview.forEach((file: FileItem) => {
    if (processingStatuses.includes(file.anonymizationStatus)) {
      console.log(`Starting polling for processing file ${file.id} (status: ${file.anonymizationStatus})`);
      anonymizationStore.startPolling(file.id);
    } else {
      console.log(`Skipping polling for file ${file.id} (status: ${file.anonymizationStatus})`);
    }
  });


});

onUnmounted(() => {
  // Clean up all polling when component is unmounted
  anonymizationStore.stopAllPolling();
  
  // Clear any remaining processing locks
  pollingProtection.clearAllLocalLocks();
});
</script>

<style scoped>

.table th {
  border-top: none;
  font-weight: 600;
  color: #6c757d;
  font-size: 0.875rem;
}

.table td {
  vertical-align: middle;
}

.overview-files-table {
  min-width: 1180px;
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
