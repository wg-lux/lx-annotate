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
          <!-- use the same route the Validate-button jumps to -->
          <router-link 
            to="/anonymisierung/validierung" 
            class="btn btn-primary btn-sm"
          >
            <i class="fas fa-play me-1"></i>
            Validierung starten
          </router-link>
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
            Laden Sie Videos oder PDFs hoch, um mit der Anonymisierung zu beginnen.
          </p>
          <router-link to="/upload" class="btn btn-primary">
            <i class="fas fa-upload me-2"></i>
            Dateien hochladen
          </router-link>
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
                <th>Erstellt</th>
                <th>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="file in availableFiles" :key="file.id">
                <!-- Filename -->
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

                    <!-- View/Validate -->
                    <button
                      v-if="file.anonymizationStatus === 'done'"
                      @click="validateFile(file.id)"
                      class="btn btn-outline-success bg-success"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="fas fa-eye"></i>
                      Validieren
                    </button>

                    <!-- Video Correction -->
                    <button
                      v-if="file.mediaType === 'video' && (file.anonymizationStatus === 'done' || file.anonymizationStatus === 'validated')"
                      @click="correctVideo(file.id)"
                      class="btn btn-outline-warning"
                      :disabled="isProcessing(file.id)"
                    >
                      <i class="fas fa-edit"></i>
                      Korrektur
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
                      <span class="badge bg-success fs-6">
                        {{ getTotalByStatus('done') }}
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
import { availableFiles } from '../../stores/anonymizationStore';

// Composables
const router = useRouter();
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const annotationStore = useAnnotationStore();

// Local state
const isRefreshing = ref(false);
const processingFiles = ref<Set<number>>(new Set());


const filteredOutCount = computed(() => 
  anonymizationStore.overview.length - availableFiles.value.length
);

// Methods
const refreshOverview = async () => {
  isRefreshing.value = true;
  try {
    await anonymizationStore.fetchOverview();
  } finally {
    isRefreshing.value = false;
  }
};

const startAnonymization = async (fileId: number) => {
  processingFiles.value.add(fileId);
  try {
    const success = await anonymizationStore.startAnonymization(fileId);
    if (success) {
      // Refresh overview to get updated status
      await refreshOverview();
      

      console.log('Anonymization started successfully for file', fileId);
    } else {
      console.warn('startAnonymization failed - staying on current page');
    }
  } finally {
    processingFiles.value.delete(fileId);
  }
};

const correctVideo = async (fileId: number) => {
  // Navigate directly to the correction component with the video ID
  router.push({ name: 'AnonymisierungKorrektur', params: { fileId } });
};

const validateFile = async (fileId: number) => {
  processingFiles.value.add(fileId);

  try {
    const result = await anonymizationStore.setCurrentForValidation(fileId);
    if (result) {
      router.push('/anonymisierung/validierung');
    } else {
      console.warn('setCurrentForValidation returned null - navigation aborted');
    }
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

const isProcessing = (fileId: number) => {
  return processingFiles.value.has(fileId);
};

const needsReimport = (file: FileItem) => {
  return file.mediaType === 'video' && !file.metadataImported;
};

const getFileIcon = (mediaType: string) => {
  return mediaType === 'video' ? 'fas fa-video text-primary' : 'fas fa-file-pdf text-danger';
};

const getMediaTypeBadgeClass = (mediaType: string) => {
  return mediaType === 'video' ? 'bg-primary' : 'bg-danger';
};

const getStatusBadgeClass = (status: string) => {
  const classes: { [key: string]: string } = {
    'not_started': 'bg-secondary',
    'processing_anonymization': 'bg-warning',
    'extracting_frames': 'bg-info',
    'predicting_segments': 'bg-info',
    'done': 'bg-success',
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
    'done': 'Fertig',
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
    'done': ['done', 'validated'],
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
    return !!(file.rawFile && file.rawFile.trim() !== '');
  } else if (file.mediaType === 'pdf') {
    // For PDFs, check if original_file exists and has a valid path
    return !!(file.rawFile && file.rawFile.trim() !== '');
  }
  
  // If we can't determine the media type, assume it's available
  return true;
};

// Lifecycle
onMounted(async () => {
  if (!availableFiles.value.length) {
    // Only fetch overview if we don't have files yet
    isRefreshing.value = true;

  }
  await anonymizationStore.fetchOverview();

  availableFiles.value
    .forEach(file => anonymizationStore.startPolling(file.id));
  
});

onUnmounted(() => {
  // Clean up all polling when component is unmounted
  anonymizationStore.stopAllPolling();
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