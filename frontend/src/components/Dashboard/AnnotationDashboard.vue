<template>
  <div class="container-fluid py-4">
    <!-- Einheitliche Annotation-Statistiken -->
    <AnnotationStatsComponent />
    
    <!-- Detaillierte Annotation-Listen -->
    <div class="row mt-4">
      <!-- Video-Segmente -->
      <div class="col-12 mb-4">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="fas fa-video text-primary me-2"></i>
              Video-Segment Annotationen
            </h5>
            <div class="header-actions">
              <button 
                class="btn btn-outline-primary btn-sm me-2" 
                @click="refreshSegments"
                :disabled="loadingSegments"
              >
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingSegments }"></i>
                Aktualisieren
              </button>
              <router-link 
                to="/frame-annotation" 
                class="btn btn-primary btn-sm"
              >
                <i class="fas fa-plus me-1"></i>
                Neue Annotation
              </router-link>
            </div>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>Video ID</th>
                    <th>Segment</th>
                    <th>Label</th>
                    <th>Status</th>
                    <th>Benutzer</th>
                    <th>Letzte Änderung</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingSegments">
                    <td colspan="7" class="text-center">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Laden...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="segments.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      <i class="fas fa-video fa-2x mb-2"></i>
                      <br>
                      Keine Video-Segmente verfügbar
                    </td>
                  </tr>
                  <tr v-else v-for="segment in segments" :key="segment.id">
                    <td><code>{{ segment.videoId }}</code></td>
                    <td>{{ segment.startTime }}s - {{ segment.endTime }}s</td>
                    <td>
                      <span class="badge bg-info">{{ segment.labelName }}</span>
                    </td>
                    <td>
                      <span class="badge" :class="getSegmentStatusClass(segment.status)">
                        {{ getSegmentStatusText(segment.status) }}
                      </span>
                    </td>
                    <td>
                      <small>{{ segment.annotated_by || 'Nicht zugewiesen' }}</small>
                    </td>
                    <td>
                      <small>{{ formatDate(segment.updated_at) }}</small>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button 
                          class="btn btn-outline-primary" 
                          @click="editSegment(segment)"
                          :title="'Segment bearbeiten'"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="markSegmentComplete(segment)"
                          :disabled="segment.status === 'completed'"
                          :title="'Als abgeschlossen markieren'"
                        >
                          <i class="fas fa-check"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Examination Annotationen -->
      <div class="col-12 mb-4">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="fas fa-stethoscope text-success me-2"></i>
              Examination Annotationen
            </h5>
            <div class="header-actions">
              <button 
                class="btn btn-outline-primary btn-sm me-2" 
                @click="refreshExaminations"
                :disabled="loadingExaminations"
              >
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingExaminations }"></i>
                Aktualisieren
              </button>
              <router-link 
                to="/untersuchung" 
                class="btn btn-success btn-sm"
              >
                <i class="fas fa-plus me-1"></i>
                Neue Untersuchung
              </router-link>
            </div>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Untersuchungsdatum</th>
                    <th>Befunde</th>
                    <th>Status</th>
                    <th>Untersucher</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingExaminations">
                    <td colspan="7" class="text-center">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Laden...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="examinations.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      <i class="fas fa-stethoscope fa-2x mb-2"></i>
                      <br>
                      Keine Untersuchungen verfügbar
                    </td>
                  </tr>
                  <tr v-else v-for="examination in examinations" :key="examination.id">
                    <td><code>{{ examination.id }}</code></td>
                    <td>
                      {{ examination.patient?.first_name }} {{ examination.patient?.last_name }}
                    </td>
                    <td>{{ formatDate(examination.examination_date) }}</td>
                    <td>
                      <span class="badge bg-secondary me-1" v-for="finding in examination.findings?.slice(0, 2)" :key="finding.id">
                        {{ finding.name }}
                      </span>
                      <span v-if="examination.findings?.length > 2" class="badge bg-light text-dark">
                        +{{ examination.findings.length - 2 }} weitere
                      </span>
                    </td>
                    <td>
                      <span class="badge" :class="getExaminationStatusClass(examination.status)">
                        {{ getExaminationStatusText(examination.status) }}
                      </span>
                    </td>
                    <td>
                      <small>{{ examination.created_by || 'Unbekannt' }}</small>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button 
                          class="btn btn-outline-primary" 
                          @click="editExamination(examination)"
                          :title="'Untersuchung bearbeiten'"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="markExaminationComplete(examination)"
                          :disabled="examination.status === 'completed'"
                          :title="'Als abgeschlossen markieren'"
                        >
                          <i class="fas fa-check"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Sensitive Meta Annotationen -->
      <div class="col-12 mb-4">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="fas fa-user-shield text-warning me-2"></i>
              Patientendaten Validierung
            </h5>
            <div class="header-actions">
              <button 
                class="btn btn-outline-primary btn-sm me-2" 
                @click="refreshSensitiveMeta"
                :disabled="loadingSensitiveMeta"
              >
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingSensitiveMeta }"></i>
                Aktualisieren
              </button>
              <router-link 
                to="/video-meta-annotation" 
                class="btn btn-warning btn-sm"
              >
                <i class="fas fa-play me-1"></i>
                Validierung starten
              </router-link>
            </div>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Typ</th>
                    <th>Patient</th>
                    <th>Untersuchungsdatum</th>
                    <th>Status</th>
                    <th>Validierung erforderlich</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingSensitiveMeta">
                    <td colspan="7" class="text-center">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Laden...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="sensitiveMetaData.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      <i class="fas fa-user-shield fa-2x mb-2"></i>
                      <br>
                      Keine Patientendaten zur Validierung verfügbar
                    </td>
                  </tr>
                  <tr v-else v-for="meta in sensitiveMetaData" :key="meta.id">
                    <td><code>{{ meta.id }}</code></td>
                    <td>
                      <span class="badge" :class="meta.content_type === 'video' ? 'bg-primary' : 'bg-danger'">
                        <i :class="meta.content_type === 'video' ? 'fas fa-video' : 'fas fa-file-pdf'"></i>
                        {{ meta.content_type?.toUpperCase() || 'UNBEKANNT' }}
                      </span>
                    </td>
                    <td>
                      {{ meta.patient_first_name }} {{ meta.patient_last_name }}
                    </td>
                    <td>{{ formatDate(meta.examination_date) }}</td>
                    <td>
                      <span class="badge" :class="getSensitiveMetaStatusClass(meta.anonymization_status)">
                        {{ getSensitiveMetaStatusText(meta.anonymization_status) }}
                      </span>
                    </td>
                    <td>
                      <span :class="meta.requires_validation ? 'text-warning' : 'text-success'">
                        <i :class="meta.requires_validation ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle'"></i>
                        {{ meta.requires_validation ? 'Ja' : 'Nein' }}
                      </span>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm">
                        <button 
                          class="btn btn-outline-primary" 
                          @click="validateSensitiveMeta(meta)"
                          :title="'Patientendaten validieren'"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="markSensitiveMetaComplete(meta)"
                          :disabled="!meta.requires_validation"
                          :title="'Als validiert markieren'"
                        >
                          <i class="fas fa-check"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnotationStatsStore } from '@/stores/annotationStats';
import AnnotationStatsComponent from '@/components/AnnotationStatsComponent.vue';
import { useToastStore } from '@/stores/toastStore'; // Assuming you have a toast store for notifications
import axiosInstance, { r } from '@/api/axiosInstance';


const toast = useToastStore(); // Use your notification system here
const router = useRouter();
const annotationStatsStore = useAnnotationStatsStore();

// State for detailed data
const segments = ref([]);
const examinations = ref([]);
const sensitiveMetaData = ref([]);

// Loading states
const loadingSegments = ref(false);
const loadingExaminations = ref(false);
const loadingSensitiveMeta = ref(false);

// Methods for fetching detailed data
// Add at the top of script setup
const showError = (message) => {
  // Use your notification system here
  console.error(message);
  toast.error(message) 
};

// Methods for fetching detailed data
const refreshSegments = async () => {
  loadingSegments.value = true;
  try {
    // Modern media framework - collection endpoint
    const response = await axiosInstance.get('/api/media/videos/segments/');
    segments.value = response.data.results || response.data || [];
  } catch (error) {
    showError('Fehler beim Laden der Video-Segmente');
    segments.value = [];
  } finally {
    loadingSegments.value = false;
  }
};

const refreshExaminations = async () => {
  loadingExaminations.value = true;
  try {
    const response = await axiosInstance.get('/api/examinations/');
    examinations.value = response.data.results || response.data || [];
  } catch (error) {
    console.error('Fehler beim Laden der Untersuchungen:', error);
    examinations.value = [];
  } finally {
    loadingExaminations.value = false;
  }
};

const refreshSensitiveMeta = async () => {
  loadingSensitiveMeta.value = true;
  try {
    // Combine video and PDF sensitive meta data using Modern Media Framework
    const [videoResponse, pdfResponse] = await Promise.all([
      axiosInstance.get(r('media/videos/')).catch(() => ({ data: [] })),
      axiosInstance.get(r('media/pdfs/sensitive-metadata/')).catch(() => ({ data: { results: [] } }))
    ]);

    // Extract data from responses
    const videoData = Array.isArray(videoResponse.data) ? videoResponse.data : 
                     videoResponse.data ? [{ ...videoResponse.data, content_type: 'video' }] : [];
    
    // PDF endpoint returns paginated data with 'results' array
    const pdfData = pdfResponse.data?.results || 
                   (Array.isArray(pdfResponse.data) ? pdfResponse.data : 
                   pdfResponse.data ? [pdfResponse.data] : []);

    // Add content type identifier
    videoData.forEach(item => item.content_type = 'video');
    pdfData.forEach(item => item.content_type = 'pdf');

    sensitiveMetaData.value = [...videoData, ...pdfData];
    console.log('Loaded sensitive metadata:', sensitiveMetaData.value.length, 'items');
  } catch (error) {
    console.error('Fehler beim Laden der Patientendaten:', error);
    sensitiveMetaData.value = [];
  } finally {
    loadingSensitiveMeta.value = false;
  }
};

// Status helper methods
const getSegmentStatusClass = (status) => {
  const classes = {
    'pending': 'bg-warning',
    'in_progress': 'bg-info',
    'completed': 'bg-success',
    'rejected': 'bg-danger'
  };
  return classes[status] || 'bg-secondary';
};

const getSegmentStatusText = (status) => {
  const texts = {
    'pending': 'Ausstehend',
    'in_progress': 'In Bearbeitung',
    'completed': 'Abgeschlossen',
    'rejected': 'Abgelehnt'
  };
  return texts[status] || status;
};

const getExaminationStatusClass = (status) => {
  const classes = {
    'pending': 'bg-warning',
    'in_progress': 'bg-info',
    'completed': 'bg-success',
    'draft': 'bg-secondary'
  };
  return classes[status] || 'bg-secondary';
};

const getExaminationStatusText = (status) => {
  const texts = {
    'pending': 'Ausstehend',
    'in_progress': 'In Bearbeitung',
    'completed': 'Abgeschlossen',
    'draft': 'Entwurf'
  };
  return texts[status] || status;
};

const getSensitiveMetaStatusClass = (status) => {
  const classes = {
    'pending_validation': 'bg-warning',
    'validated_pending_anonymization': 'bg-info',
    'anonymized': 'bg-success',
    'no_sensitive_data': 'bg-primary'
  };
  return classes[status] || 'bg-secondary';
};

const getSensitiveMetaStatusText = (status) => {
  const texts = {
    'pending_validation': 'Validierung ausstehend',
    'validated_pending_anonymization': 'Validiert - Anonymisierung ausstehend',
    'anonymized': 'Anonymisiert',
    'no_sensitive_data': 'Keine sensitiven Daten'
  };
  return texts[status] || status;
};

// Action methods
const editSegment = (segment) => {
  router.push({
    name: 'Frame Annotation',
    query: { videoId: segment.video_id, segmentId: segment.id }
  });
};

const markSegmentComplete = async (segment) => {
  try {
    // Modern media framework - collection endpoint (video_id not available here)
    await axiosInstance.patch(`/api/media/videos/segments/${segment.id}/`, { status: 'completed' });
    annotationStatsStore.updateAnnotationStatus('segment', 'in_progress', 'completed');
    await refreshSegments();
  } catch (error) {
    console.error('Fehler beim Markieren des Segments als abgeschlossen:', error);
  }
};

const editExamination = (examination) => {
  router.push({
    name: 'Untersuchung',
    query: { examinationId: examination.id }
  });
};

const markExaminationComplete = async (examination) => {
  try {
    await axiosInstance.patch(`/api/examinations/${examination.id}/`, { status: 'completed' });
    annotationStatsStore.updateAnnotationStatus('examination', 'in_progress', 'completed');
    await refreshExaminations();
  } catch (error) {
    console.error('Fehler beim Markieren der Untersuchung als abgeschlossen:', error);
  }
};

const validateSensitiveMeta = (meta) => {
  if (meta.content_type === 'video') {
    router.push('/video-meta-annotation');
  } else if (meta.content_type === 'pdf') {
    router.push('/pdf-meta-annotation');
  }
};

const markSensitiveMetaComplete = async (meta) => {
  try {
    const endpoint = meta.content_type === 'video' 
      ? `/api/media/videos/`
      : `/api/media/pdf/`;
    
    await axiosInstance.patch(endpoint, { 
      sensitive_meta_id: meta.id,
      requires_validation: false,
      anonymization_status: 'validated_pending_anonymization'
    });
    
    annotationStatsStore.updateAnnotationStatus('sensitive_meta', 'pending', 'completed');
    await refreshSensitiveMeta();
  } catch (error) {
    console.error('Fehler beim Markieren der Patientendaten als validiert:', error);
  }
};

// Utility methods
const formatDate = (dateString) => {
  if (!dateString) return 'Nicht verfügbar';
  try {
    return new Date(dateString).toLocaleDateString('de-DE');
  } catch (error) {
    return 'Ungültiges Datum';
  }
};

// Initialize data on mount
onMounted(async () => {
  // Load statistics first
  await annotationStatsStore.fetchAnnotationStats();
  
  // Load detailed data in parallel
  await Promise.all([
    refreshSegments(),
    refreshExaminations(),
    refreshSensitiveMeta()
  ]);
});
</script>

<style scoped>
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  border-radius: 8px;
}

.table {
  margin-bottom: 0;
}

.table th, .table td {
  vertical-align: middle;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.table-hover tbody tr:hover {
  background-color: #f8f9fa;
}

.badge {
  font-size: 0.75rem;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .table-responsive {
    font-size: 0.875rem;
  }
}
</style>
