<template>
  <div class="container-fluid py-4 annotation-dashboard">
    <section class="dashboard-hero mb-4">
      <div>
        <h2 class="dashboard-title mb-1">Dashboard</h2>
        <p class="dashboard-subtitle mb-0">Status, offene Arbeitspakete und Schnellzugriffe an einem Ort.</p>
      </div>
    </section>

    <!-- Einheitliche Annotation-Statistiken -->
    <AnnotationStatsComponent />
    
    <!-- Detaillierte Annotation-Listen -->
    <div class="row mt-4">
      <!-- Video-Segmente -->
      <div class="col-12 mb-4">
        <div class="card dashboard-card">
          <div class="card-header dashboard-card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="ni ni-button-play text-primary me-2"></i>
              Video-Segment Annotationen
            </h5>
            <div class="header-actions">
              <button 
                class="btn btn-outline-primary btn-sm me-2" 
                @click="refreshSegments"
                :disabled="loadingSegments"
              >
                <i class="ni ni-bold-right" :class="{ 'ni-spin': loadingSegments }"></i>
                Aktualisieren
              </button>
              <router-link 
                to="/frame-annotation" 
                class="btn btn-primary btn-sm"
              >
                <i class="ni ni-fat-add me-1"></i>
                Neue Annotation
              </router-link>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 dashboard-table">
                <thead class="table-light">
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
                    <td colspan="7" class="text-center py-4">
                      <div class="table-loading-state">
                        <i class="ni ni-button-play me-2"></i>
                        Segmente werden geladen...
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="segments.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      <i class="ni ni-button-play ni-2x mb-2"></i>
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
                          <i class="ni ni-single-copy-04"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="markSegmentComplete(segment)"
                          :disabled="segment.status === 'completed'"
                          :title="'Als abgeschlossen markieren'"
                        >
                          <i class="ni ni-check-bold"></i>
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
        <div class="card dashboard-card">
          <div class="card-header dashboard-card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="ni ni-user-run text-success me-2"></i>
              Examination Annotationen
            </h5>
            <div class="header-actions">
              <button 
                class="btn btn-outline-primary btn-sm me-2" 
                @click="refreshExaminations"
                :disabled="loadingExaminations"
              >
                <i class="ni ni-bold-right" :class="{ 'ni-spin': loadingExaminations }"></i>
                Aktualisieren
              </button>
              <router-link 
                to="/reporting/case-setup" 
                class="btn btn-success btn-sm"
              >
                <i class="ni ni-fat-add me-1"></i>
                Neue Befundung
              </router-link>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 dashboard-table">
                <thead class="table-light">
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
                    <td colspan="7" class="text-center py-4">
                      <div class="table-loading-state">
                        <i class="ni ni-button-play me-2"></i>
                        Untersuchungen werden geladen...
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="examinations.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      <i class="ni ni-user-run ni-2x mb-2"></i>
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
                          <i class="ni ni-single-copy-04"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="markExaminationComplete(examination)"
                          :disabled="examination.status === 'completed'"
                          :title="'Als abgeschlossen markieren'"
                        >
                          <i class="ni ni-check-bold"></i>
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
        <div class="card dashboard-card">
          <div class="card-header dashboard-card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="ni ni-check-bold text-warning me-2"></i>
              Patientendaten Validierung
            </h5>
            <div class="header-actions">
              <button 
                class="btn btn-outline-primary btn-sm me-2" 
                @click="refreshSensitiveMeta"
                :disabled="loadingSensitiveMeta"
              >
                <i class="ni ni-bold-right" :class="{ 'ni-spin': loadingSensitiveMeta }"></i>
                Aktualisieren
              </button>
              <router-link 
                to="/video-meta-annotation" 
                class="btn btn-warning btn-sm"
              >
                <i class="ni ni-button-play me-1"></i>
                Validierung starten
              </router-link>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 dashboard-table">
                <thead class="table-light">
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
                    <td colspan="7" class="text-center py-4">
                      <div class="table-loading-state">
                        <i class="ni ni-button-play me-2"></i>
                        Patientendaten werden geladen...
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="sensitiveMetaData.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      <i class="ni ni-check-bold ni-2x mb-2"></i>
                      <br>
                      Keine Patientendaten zur Validierung verfügbar
                    </td>
                  </tr>
                  <tr v-else v-for="meta in sensitiveMetaData" :key="meta.id">
                    <td><code>{{ meta.id }}</code></td>
                    <td>
                      <span class="badge" :class="meta.content_type === 'video' ? 'bg-primary' : 'bg-danger'">
                        <i :class="meta.content_type === 'video' ? 'ni ni-button-play' : 'ni ni-single-copy-04'"></i>
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
                        <i :class="meta.requires_validation ? 'ni ni-user-run' : 'ni ni-check-bold'"></i>
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
                          <i class="ni ni-single-copy-04"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="markSensitiveMetaComplete(meta)"
                          :disabled="!meta.requires_validation"
                          :title="'Als validiert markieren'"
                        >
                          <i class="ni ni-check-bold"></i>
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
import AnnotationStatsComponent from '@/components/Stats/AnnotationStatsComponent.vue';
import { useToastStore } from '@/stores/toastStore'; // Assuming you have a toast store for notifications
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';


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
const MAX_VIDEOS_FOR_SEGMENT_OVERVIEW = 25;
const MAX_SEGMENTS_IN_OVERVIEW = 500;

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
    const videosResponse = await axiosInstance.get(r(endpoints.media.videos));
    const videos =
      videosResponse.data?.results ||
      videosResponse.data?.videos ||
      videosResponse.data ||
      [];

    const videoIds = videos
      .map((video) => Number(video.id))
      .filter((id) => Number.isFinite(id))
      .slice(0, MAX_VIDEOS_FOR_SEGMENT_OVERVIEW);

    const segmentLists = await Promise.all(
      videoIds.map(async (videoId) => {
        try {
          const response = await axiosInstance.get(
            r(endpoints.media.videoSegments(videoId))
          );
          const videoSegments = response.data?.results || response.data || [];
          return videoSegments.map((segment) => ({
            ...segment,
            videoId: segment.videoId ?? segment.video_id ?? videoId,
          }));
        } catch {
          return [];
        }
      })
    );

    segments.value = segmentLists.flat().slice(0, MAX_SEGMENTS_IN_OVERVIEW);
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
    const response = await axiosInstance.get(`/api/${endpoints.router.examinations}`);
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
      axiosInstance.get(r(endpoints.media.videos)).catch(() => ({ data: [] })),
      axiosInstance.get(r(endpoints.media.pdfSensitiveMetadataList)).catch(() => ({ data: { results: [] } }))
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
  const videoId = segment.videoId ?? segment.video_id;
  if (!videoId) {
    showError('Segment kann nicht geöffnet werden: Video-ID fehlt');
    return;
  }
  router.push({
    name: 'Frame Annotation',
    query: { videoId, segmentId: segment.id }
  });
};

const markSegmentComplete = async (segment) => {
  try {
    const videoId = segment.videoId ?? segment.video_id;
    if (!videoId) {
      showError('Segment kann nicht aktualisiert werden: Video-ID fehlt');
      return;
    }
    await axiosInstance.patch(
      `/api/${endpoints.media.videoSegmentDetail(videoId, segment.id)}`,
      { status: 'completed' }
    );
    annotationStatsStore.updateAnnotationStatus('segment', 'in_progress', 'completed');
    await refreshSegments();
  } catch (error) {
    console.error('Fehler beim Markieren des Segments als abgeschlossen:', error);
  }
};

const editExamination = (examination) => {
  router.push({
    path: '/reporting/case-setup',
    query: { legacyExaminationId: String(examination.id) }
  });
};

const markExaminationComplete = async (examination) => {
  try {
    await axiosInstance.patch(`/api/${endpoints.router.examinationById(examination.id)}`, { status: 'completed' });
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
      ? `/api/${endpoints.media.videos}`
      : `/api/${endpoints.media.pdfs}`;
    
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
.annotation-dashboard {
  --dashboard-border: rgba(45, 48, 71, 0.1);
}

.dashboard-hero {
  background: radial-gradient(circle at top left, rgba(67, 86, 255, 0.16), rgba(67, 86, 255, 0.03) 45%, rgba(255, 255, 255, 0.95) 70%);
  border: 1px solid var(--dashboard-border);
  border-radius: 14px;
  padding: 1rem 1.25rem;
}

.dashboard-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #2d3047;
}

.dashboard-subtitle {
  color: #63748a;
}

.dashboard-card {
  box-shadow: 0 14px 28px rgba(26, 36, 59, 0.08);
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid var(--dashboard-border);
  overflow: hidden;
}

.dashboard-card-header {
  background: linear-gradient(180deg, #fcfdff 0%, #f6f9ff 100%);
  border-bottom: 1px solid var(--dashboard-border);
  padding: 0.9rem 1rem;
}

.table {
  margin-bottom: 0;
}

.dashboard-table th,
.dashboard-table td {
  vertical-align: middle;
  border-color: rgba(45, 48, 71, 0.08);
}

.dashboard-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #4f5e79;
  font-weight: 700;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.table-hover tbody tr:hover {
  background-color: #f4f8ff;
}

.badge {
  font-size: 0.75rem;
}

.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.table-loading-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #4f5e79;
  font-weight: 600;
  background: linear-gradient(90deg, #f0f4fb 0%, #e7eef9 50%, #f0f4fb 100%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.4s linear infinite;
  padding: 0.7rem 1rem;
  border-radius: 999px;
}

@keyframes loading-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-hero {
    padding: 0.9rem 1rem;
  }
  
  .table-responsive {
    font-size: 0.875rem;
  }
}
</style>
