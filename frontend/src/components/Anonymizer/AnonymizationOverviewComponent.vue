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
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
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
            <i class="fas fa-folder-open fa-3x text-muted"></i>
          </div>
          <h5 class="text-muted">Keine Dateien vorhanden</h5>
          <p class="text-muted mb-4">
            Laden Sie Videos oder PDFs in den data Ordner oder den import ordner, um mit der Anonymisierung zu beginnen.
          </p>
        </div>

        <!-- Files Table -->
        <div v-else class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>Dateiname</th>
                <th>Typ</th>
                <th>Anonymisierung</th>
                <th>Annotation</th>
                <th>Unverarbeitete Daten vorhanden</th>
                <th>Erstellt</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in availableFiles" :key="`${file.mediaType}-${file.id}`">                <!-- Filename -->
                <td>
                  <div class="d-flex align-items-center">
                    <i 
                      :class="getFileIcon(file.mediaType)" 
                      class="me-2"
                    ></i>
                    <span class="fw-medium">{{ file.filename }}</span>
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

                <!-- Anonymization Status -->
                <td>
                  <span 
                    :class="getStatusBadgeClass(file.anonymizationStatus)"
                    class="badge"
                  >
                    <i 
                      v-if="file.anonymizationStatus === 'processing_anonymization'"
                      class="fas fa-spinner fa-spin me-1"
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

                <!-- Raw File Available -->
                <td>
                  <span v-if="hasOriginalFile(file)" class="text-success">
                    <i class="fas fa-check-circle me-1"></i>
                    Ja
                  </span>
                  <span v-else class="text-danger">
                    <i class="fas fa-times-circle me-1"></i>
                    Nein
                  </span>
                </td>

                <!-- Created Date -->
                <td>
                  <small class="text-muted">
                    {{ formatDate(file.createdAt) }}
                  </small>
                </td>

                <!-- Actions -->
                <td>
                  <div class="btn-group btn-group-sm" role="group">
                    <!-- Re-import for videos with missing/incorrect metadata -->
                    <button
                      v-if="file.mediaType === 'video' && needsReimport(file)"
                      @click="reimportVideo(file.id)"
                      class="btn btn-outline-info"
                      :disabled="isProcessing(file.id)"
                      title="Video erneut importieren und Metadaten aktualisieren"
                    >
                      <i class="fas fa-redo-alt"></i>
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
                      <i class="fas fa-redo-alt"></i>
                      Erneut importieren
                    </button>

                    <!-- Start Anonymization -->
                    <button
                      v-if="file.anonymizationStatus === 'not_started'"
                      @click="startAnonymization(file.id)"
                      class="btn btn-outline-primary"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="fas fa-play"></i>
                      Starten
                    </button>

                    <!-- Restart Anonymization -->
                    <button
                      v-if="file.anonymizationStatus === 'failed'"
                      @click="startAnonymization(file.id)"
                      class="btn btn-outline-warning"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="fas fa-redo"></i>
                      Erneut versuchen
                    </button>

                    <!-- View/Validate - only show when anonymization is done -->
                    <button
                      v-if="file.anonymizationStatus === 'done_processing_anonymization'"
                      @click="validateFile(file.id, file.mediaType)"
                      class="btn btn-outline-success bg-success"
                      :disabled="!isReadyForValidation(file.id)"
                    >
                      <i class="fas fa-eye"></i>
                      Validieren
                    </button>

                    <!-- Video Correction -->
                    <button
                      v-if="file.mediaType === 'video' && (file.anonymizationStatus === 'done_processing_anonymization' || file.anonymizationStatus === 'validated')"
                      @click="correctVideo(file.id)"
                      class="btn btn-outline-warning"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="fas fa-edit"></i>
                      Korrektur
                    </button>

                    <!-- Delete Button - Show for all files -->
                    <button
                      @click="deleteFile(file.id)"
                      class="btn btn-outline-danger"
                      :disabled="isProcessing(file.id)"
                      title="Datei permanent löschen"
                    >
                      <i class="fas fa-trash"></i>
                      Löschen
                    </button>

                    <!-- Processing indicator -->
                    <button
                      v-if="file.anonymizationStatus === 'processing_anonymization'"
                      class="btn btn-outline-info"
                      disabled
                    >
                      <i class="fas fa-spinner fa-spin me-1"></i>
                      Anonymisierung...
                    </button>
                    <button
                      v-if="file.anonymizationStatus === 'extracting_frames'"
                      class="btn btn-outline-info"
                      disabled
                    >
                      <i class="fas fa-spinner fa-spin me-1"></i>
                      Frames extrahieren...
                    </button>

                  </div>
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
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Hinweis:</strong> {{ filteredOutCount }} Datei(en) wurden ausgeblendet, da die ursprünglichen Dateien nicht mehr verfügbar sind.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnonymizationStore, type FileItem } from '@/stores/anonymizationStore';
import { useVideoStore } from '@/stores/videoStore';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import { usePollingProtection } from '@/composables/usePollingProtection';
import { useMediaManagement } from '@/api/mediaManagement';
import { type MediaType } from '../../stores/mediaTypeStore';

// Composables
const router = useRouter();
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const annotationStore = useAnnotationStore();
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
  return file.anonymizationStatus === 'done_processing_anonymization' || file.anonymizationStatus === 'not_started';
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
  const confirmed = confirm(`Sind Sie sicher, dass Sie die Datei "${file.filename}" permanent löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.`);
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
         !pollingProtection.canProcessMedia.value(fileId, mediaType as 'video' | 'pdf');
};

const needsReimport = (file: FileItem) => {
  // Video files need re-import if metadata is missing
  if (file.mediaType === 'video') {
    return !file.metadataImported;
  }
  
  // PDF files might need re-import if anonymization failed or no text extracted
  if (file.mediaType === 'pdf') {
    return !file.metadataImported || file.anonymizationStatus === 'failed' || file.anonymizationStatus === 'not_started';
  }
  
  return false;
};

const getFileIcon = (mediaType: string) => {
  return mediaStore.getMediaTypeIcon(mediaType as any);
};

const getMediaTypeBadgeClass = (mediaType: string) => {
  return mediaStore.getMediaTypeBadgeClass(mediaType as any);
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
    'extracting_frames': 'Frames extrahieren',
    'predicting_segments': 'Segmente vorhersagen',
    'done_processing_anonymization': 'Fertig',
    'validated': 'Validiert',
    'failed': 'Fehlgeschlagen'
  };
  return texts[status] || status;
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

const validateSegmentsFile = async (fileId: number) => {
  processingFiles.value.add(fileId);
  try {

    const success = await annotationStore.validateSegmentsAndExaminations(fileId);
    if (success) {
      // Refresh overview to get updated status
      await refreshOverview();
      console.log('Segments validated successfully for file', fileId);
    } else {
      console.warn('validateSegmentsFile failed - staying on current page');
    }
  } finally {
    processingFiles.value.delete(fileId);
  }
};

const hasOriginalFile = (file: FileItem): boolean => {
  // Check if the file has the necessary properties to indicate original file exists
  if (file.mediaType === 'video') {
    // For videos, check if rawFile exists and has a valid path
    return videoStore.hasRawVideoFile?.valueOf() ?? false;
  } else if (file.mediaType === 'pdf') {
    // For PDFs, check if original_file exists and has a valid path
    return !!(file.rawFile && file.rawFile.trim() !== '');
  }
  
  // If we can't determine the media type, assume it's available
  return true;
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

  // ✅ FIX: Only start polling for files that are actively processing
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

.bg-success {
  background-color: #6c757d !important;
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
}
</style>