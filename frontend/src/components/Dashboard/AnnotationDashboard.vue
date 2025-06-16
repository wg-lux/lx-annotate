<template>
  <div class="container-fluid py-4">
    <div class="row">
      <!-- Video Annotations Overview -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Video-Annotationen</h5>
          </div>
          <div class="card-body">
            <p><strong>Gesamtanzahl:</strong> {{ videoStats.total }}</p>
            <p><strong>In Bearbeitung:</strong> {{ videoStats.inProgress }}</p>
            <p><strong>Abgeschlossen:</strong> {{ videoStats.completed }}</p>
            <p><strong>Verfügbar:</strong> {{ videoStats.available }}</p>
          </div>
        </div>
      </div>

      <!-- Image Annotations Overview -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Bild-Annotationen</h5>
          </div>
          <div class="card-body">
            <p><strong>Gesamtanzahl:</strong> {{ imageStats.total }}</p>
            <p><strong>In Bearbeitung:</strong> {{ imageStats.inProgress }}</p>
            <p><strong>Abgeschlossen:</strong> {{ imageStats.completed }}</p>
          </div>
        </div>
      </div>

      <!-- Anonymization Annotations Overview -->
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Anonymisierungs-Annotationen</h5>
          </div>
          <div class="card-body">
            <p><strong>Gesamtanzahl:</strong> {{ anonymizationStats.total }}</p>
            <p><strong>In Bearbeitung:</strong> {{ anonymizationStats.inProgress }}</p>
            <p><strong>Abgeschlossen:</strong> {{ anonymizationStats.completed }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Video-Anonymisierungs-Annotationen - Neue Sektion -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Video-Anonymisierungs-Annotationen</h5>
            <button 
              class="btn btn-primary btn-sm" 
              @click="refreshVideoAnonymizations"
              :disabled="loadingVideoAnonymizations"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingVideoAnonymizations }"></i>
              Aktualisieren
            </button>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-md-3">
                <div class="stat-card bg-info text-white">
                  <div class="stat-icon">
                    <i class="fas fa-video"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ videoAnonymizationStats.total }}</h3>
                    <p>Gesamt Videos</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card bg-warning text-white">
                  <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ videoAnonymizationStats.pending }}</h3>
                    <p>Wartend</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card bg-primary text-white">
                  <div class="stat-icon">
                    <i class="fas fa-cogs"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ videoAnonymizationStats.processing }}</h3>
                    <p>In Bearbeitung</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card bg-success text-white">
                  <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ videoAnonymizationStats.anonymized }}</h3>
                    <p>Anonymisiert</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabelle für Video-Anonymisierungen -->
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>Video ID</th>
                    <th>Dateiname</th>
                    <th>Patient</th>
                    <th>Untersuchungsdatum</th>
                    <th>Status</th>
                    <th>Segmente</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingVideoAnonymizations">
                    <td colspan="7" class="text-center">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Laden...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="videoAnonymizations.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      Keine Video-Anonymisierungen verfügbar
                    </td>
                  </tr>
                  <tr v-else v-for="video in videoAnonymizations" :key="video.id">
                    <td>
                      <code>{{ video.id }}</code>
                    </td>
                    <td>
                      <div class="text-truncate" style="max-width: 200px;" :title="video.originalFileName">
                        {{ video.originalFileName }}
                      </div>
                    </td>
                    <td>
                      <div v-if="video.patientFirstName || video.patientLastName">
                        {{ video.patientFirstName }} {{ video.patientLastName }}
                      </div>
                      <small v-else class="text-muted">Nicht verfügbar</small>
                    </td>
                    <td>
                      <div v-if="video.examinationDate">
                        {{ formatDate(video.examinationDate) }}
                      </div>
                      <small v-else class="text-muted">Nicht verfügbar</small>
                    </td>
                    <td>
                      <span class="badge" :class="getStatusBadgeClass(video.status)">
                        {{ getStatusDisplayText(video.status) }}
                      </span>
                    </td>
                    <td>
                      <div v-if="video.segments && video.segments.length > 0">
                        <small>{{ video.segments.length }} Segment(e)</small>
                        <div class="mt-1">
                          <span 
                            v-for="segment in video.segments.slice(0, 3)" 
                            :key="segment.id"
                            class="badge bg-secondary me-1 mb-1"
                            style="font-size: 0.7rem;"
                          >
                            {{ segment.label_display || segment.label }}
                          </span>
                          <span v-if="video.segments.length > 3" class="badge bg-light text-dark">
                            +{{ video.segments.length - 3 }} weitere
                          </span>
                        </div>
                      </div>
                      <small v-else class="text-muted">Keine Segmente</small>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm" role="group">
                        <button 
                          class="btn btn-outline-primary" 
                          @click="viewVideoDetails(video)"
                          :title="'Details für Video ' + video.id"
                        >
                          <i class="fas fa-eye"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="annotateVideo(video)"
                          :disabled="video.status === 'anonymized'"
                          :title="'Video ' + video.id + ' annotieren'"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button 
                          v-if="video.status !== 'anonymized'"
                          class="btn btn-outline-warning" 
                          @click="processAnonymization(video)"
                          :title="'Anonymisierung für Video ' + video.id + ' starten'"
                        >
                          <i class="fas fa-user-secret"></i>
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

    <!-- PDF-Annotationen - Neue Sektion -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">PDF-Annotationen</h5>
            <button 
              class="btn btn-primary btn-sm" 
              @click="refreshPdfAnnotations"
              :disabled="loadingPdfAnnotations"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingPdfAnnotations }"></i>
              Aktualisieren
            </button>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-md-3">
                <div class="stat-card bg-info text-white">
                  <div class="stat-icon">
                    <i class="fas fa-file-pdf"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ pdfAnnotationStats.total }}</h3>
                    <p>Gesamt PDFs</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card bg-warning text-white">
                  <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ pdfAnnotationStats.pending }}</h3>
                    <p>Wartend</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card bg-primary text-white">
                  <div class="stat-icon">
                    <i class="fas fa-edit"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ pdfAnnotationStats.inProgress }}</h3>
                    <p>In Bearbeitung</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="stat-card bg-success text-white">
                  <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                  </div>
                  <div class="stat-content">
                    <h3>{{ pdfAnnotationStats.completed }}</h3>
                    <p>Abgeschlossen</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabelle für PDF-Annotationen -->
            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-dark">
                  <tr>
                    <th>PDF ID</th>
                    <th>Dateiname</th>
                    <th>Patient</th>
                    <th>Untersuchungsdatum</th>
                    <th>Status</th>
                    <th>Dateigröße</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loadingPdfAnnotations">
                    <td colspan="7" class="text-center">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Laden...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="pdfAnnotations.length === 0">
                    <td colspan="7" class="text-center text-muted">
                      Keine PDF-Annotationen verfügbar
                    </td>
                  </tr>
                  <tr v-else v-for="pdf in pdfAnnotations" :key="pdf.id">
                    <td>
                      <code>{{ pdf.id }}</code>
                    </td>
                    <td>
                      <div class="text-truncate" style="max-width: 200px;" :title="pdf.originalFileName || pdf.file">
                        {{ getFileName(pdf.file) }}
                      </div>
                    </td>
                    <td>
                      <div v-if="pdf.patient_first_name || pdf.patient_last_name">
                        {{ pdf.patient_first_name }} {{ pdf.patient_last_name }}
                      </div>
                      <small v-else class="text-muted">Nicht verfügbar</small>
                    </td>
                    <td>
                      <div v-if="pdf.examination_date">
                        {{ formatDate(pdf.examination_date) }}
                      </div>
                      <small v-else class="text-muted">Nicht verfügbar</small>
                    </td>
                    <td>
                      <span class="badge" :class="getPdfStatusBadgeClass(pdf.status)">
                        {{ getPdfStatusDisplayText(pdf.status) }}
                      </span>
                    </td>
                    <td>
                      <div v-if="pdf.file_size">
                        {{ formatFileSize(pdf.file_size) }}
                      </div>
                      <small v-else class="text-muted">Unbekannt</small>
                    </td>
                    <td>
                      <div class="btn-group btn-group-sm" role="group">
                        <button 
                          class="btn btn-outline-primary" 
                          @click="viewPdfDetails(pdf)"
                          :title="'Details für PDF ' + pdf.id"
                        >
                          <i class="fas fa-eye"></i>
                        </button>
                        <button 
                          class="btn btn-outline-success" 
                          @click="annotatePdf(pdf)"
                          :title="'PDF ' + pdf.id + ' annotieren'"
                        >
                          <i class="fas fa-edit"></i>
                        </button>
                        <button 
                          class="btn btn-outline-info" 
                          @click="viewAnonymizedText(pdf)"
                          :title="'Anonymisierten Text für PDF ' + pdf.id + ' anzeigen'"
                        >
                          <i class="fas fa-user-secret"></i>
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

    <!-- User-Based Overview -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Benutzerbasierte Übersicht</h5>
          </div>
          <div class="card-body">
            <table class="table table-bordered">
              <thead>
                <tr>
                  <th>Benutzer</th>
                  <th>Video-Annotationen</th>
                  <th>Bild-Annotationen</th>
                  <th>Anonymisierungs-Annotationen</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>{{ user.name }}</td>
                  <td>{{ user.videoAnnotations }}</td>
                  <td>{{ user.imageAnnotations }}</td>
                  <td>{{ user.anonymizationAnnotations }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useVideoStore } from '@/stores/videoStore';
import { useImageStore } from '@/stores/imageStore';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'vue-router';

const annotationStore = useAnnotationStore();
const videoStore = useVideoStore();
const imageStore = useImageStore();
const anonymizationStore = useAnonymizationStore();
const userStore = useUserStore();
const router = useRouter();

const videoStats = ref({
  total: 0,
  inProgress: 0,
  completed: 0,
  available: 0,
});

const imageStats = ref({
  total: 0,
  inProgress: 0,
  completed: 0,
});

const anonymizationStats = ref({
  total: 0,
  inProgress: 0,
  completed: 0,
});

const videoAnonymizations = ref([]);
const loadingVideoAnonymizations = ref(false);

const pdfAnnotations = ref([]);
const loadingPdfAnnotations = ref(false);

// Computed Properties für Video-Anonymisierung
const videoAnonymizationStats = computed(() => {
  const stats = {
    total: videoAnonymizations.value.length,
    pending: 0,
    processing: 0,
    anonymized: 0
  };

  videoAnonymizations.value.forEach(video => {
    switch (video.status) {
      case 'pending':
      case 'uploaded':
      case 'frames_extracted':
        stats.pending++;
        break;
      case 'processing':
      case 'segmenting':
      case 'anonymizing':
        stats.processing++;
        break;
      case 'anonymized':
      case 'completed':
        stats.anonymized++;
        break;
    }
  });

  return stats;
});

// Computed Properties für PDF-Annotationen
const pdfAnnotationStats = computed(() => {
  const stats = {
    total: pdfAnnotations.value.length,
    pending: 0,
    inProgress: 0,
    completed: 0,
  };

  pdfAnnotations.value.forEach(pdf => {
    switch (pdf.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'completed':
        stats.completed++;
        break;
    }
  });

  return stats;
});

// Check if userStore is empty and add a default user
// This is a fallback in case the userStore is empty
// #TODO: Remove this when userStore is properly populated
const users = ref([]);
if (!userStore.users || userStore.users.length === 0) {
  const currentUser = {
    id: 'current-session-user',
    name: 'Aktueller User',
    videoAnnotations: 0,
    imageAnnotations: 0,
    anonymizationAnnotations: 0,
  };
  users.value = [currentUser];
}

onMounted(async () => {
  console.log('Dashboard mounted, fetching data...');
  
  try {
    // Fetch video annotations
    await videoStore.fetchAllVideos();
    const videos = videoStore.videoList.videos;
    console.log('Videos loaded:', videos);
    
    videoStats.value.total = videos.length;
    videoStats.value.inProgress = videos.filter(v => v.status === 'in_progress').length;
    videoStats.value.completed = videos.filter(v => v.status === 'completed').length;
    videoStats.value.available = videos.filter(v => v.status === 'available').length;
    
    console.log('Video stats calculated:', videoStats.value);

    // Fetch image annotations
    imageStats.value.total = imageStore.data.length;
    imageStats.value.inProgress = imageStore.data.filter(img => img.status === 'in_progress').length;
    imageStats.value.completed = imageStore.data.filter(img => img.status === 'completed').length;

    // Fetch anonymization annotations
    await anonymizationStore.fetchPendingAnonymizations();
    const anonymizations = anonymizationStore.pendingAnonymizations;
    anonymizationStats.value.total = anonymizations.length;
    anonymizationStats.value.inProgress = anonymizations.filter(a => a.status === 'in_progress').length;
    anonymizationStats.value.completed = anonymizations.filter(a => a.status === 'completed').length;

    // Fetch users and their annotation counts
    await userStore.fetchUsers();
    users.value = userStore.users.map(user => ({
      id: user.id,
      name: user.name,
      videoAnnotations: videos.filter(v => v.assignedUser === user.name).length,
      imageAnnotations: imageStore.data.filter(img => img.assignedUser === user.name).length,
      anonymizationAnnotations: anonymizations.filter(a => a.report_meta?.patient_first_name === user.name).length,
    }));
    
    console.log('Users with annotation counts:', users.value);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
});

// Video-Anonymisierungs-Methoden
const refreshVideoAnonymizations = async () => {
  loadingVideoAnonymizations.value = true;
  try {
    await videoStore.fetchVideosForAnonymization();
    videoAnonymizations.value = videoStore.videosForAnonymization || [];
  } catch (error) {
    console.error('Fehler beim Laden der Video-Anonymisierungen:', error);
  } finally {
    loadingVideoAnonymizations.value = false;
  }
};

const refreshAnnotations = async () => {
  // Existing annotation refresh logic
};

const refreshPdfAnnotations = async () => {
  loadingPdfAnnotations.value = true;
  try {
    // Use the existing PDF serializer endpoint
    const response = await fetch('/api/pdf/sensitivemeta/', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      pdfAnnotations.value = Array.isArray(data) ? data : [data];
    } else {
      pdfAnnotations.value = [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der PDF-Annotationen:', error);
    pdfAnnotations.value = [];
  } finally {
    loadingPdfAnnotations.value = false;
  }
};

const getStatusBadgeClass = (status) => {
  const statusClasses = {
    'pending': 'bg-secondary',
    'uploaded': 'bg-info',
    'frames_extracted': 'bg-primary',
    'processing': 'bg-warning',
    'segmenting': 'bg-warning',
    'anonymizing': 'bg-warning',
    'anonymized': 'bg-success',
    'completed': 'bg-success',
    'error': 'bg-danger',
    'failed': 'bg-danger'
  };
  return statusClasses[status] || 'bg-secondary';
};

const getStatusDisplayText = (status) => {
  const statusTexts = {
    'pending': 'Wartend',
    'uploaded': 'Hochgeladen',
    'frames_extracted': 'Frames extrahiert',
    'processing': 'In Bearbeitung',
    'segmenting': 'Segmentierung',
    'anonymizing': 'Anonymisierung',
    'anonymized': 'Anonymisiert',
    'completed': 'Abgeschlossen',
    'error': 'Fehler',
    'failed': 'Fehlgeschlagen'
  };
  return statusTexts[status] || status;
};

const getPdfStatusBadgeClass = (status) => {
  const statusClasses = {
    'pending': 'bg-secondary',
    'in_progress': 'bg-warning',
    'completed': 'bg-success',
    'error': 'bg-danger',
    'failed': 'bg-danger'
  };
  return statusClasses[status] || 'bg-secondary';
};

const getPdfStatusDisplayText = (status) => {
  const statusTexts = {
    'pending': 'Wartend',
    'in_progress': 'In Bearbeitung',
    'completed': 'Abgeschlossen',
    'error': 'Fehler',
    'failed': 'Fehlgeschlagen'
  };
  return statusTexts[status] || status;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Nicht verfügbar';
  try {
    return new Date(dateString).toLocaleDateString('de-DE');
  } catch (error) {
    return 'Ungültig';
  }
};

const formatFileSize = (size) => {
  if (typeof size !== 'number') return 'Unbekannt';
  const units = ['B', 'kB', 'MB', 'GB'];
  let index = 0;
  let formattedSize = size;
  while (formattedSize >= 1024 && index < units.length - 1) {
    formattedSize /= 1024;
    index++;
  }
  return `${formattedSize.toFixed(1)} ${units[index]}`;
};

const viewVideoDetails = (video) => {
  // Navigation zu Video-Details
  router.push({
    name: 'Video Annotation',
    params: { videoId: video.id }
  });
};

const annotateVideo = (video) => {
  // Navigation zur Video-Annotation
  router.push({
    name: 'Video Annotation',
    query: { 
      videoId: video.id,
      mode: 'annotate'
    }
  });
};

const processAnonymization = async (video) => {
  try {
    await videoStore.startAnonymization(video.id);
    await refreshVideoAnonymizations();
    // Optional: Success notification
  } catch (error) {
    console.error('Fehler beim Starten der Anonymisierung:', error);
    // Optional: Error notification
  }
};

// Add PDF-specific methods
const viewPdfDetails = (pdf) => {
  // Navigation zu PDF-Details
  router.push({
    name: 'PDF Patienten Annotation',
    params: { pdfId: pdf.id }
  });
};

const annotatePdf = (pdf) => {
  // Navigation zur PDF-Annotation
  router.push({
    name: 'PDF Patienten Annotation',
    query: { 
      pdfId: pdf.id,
      mode: 'annotate'
    }
  });
};

const viewAnonymizedText = (pdf) => {
  // Navigation zur Anzeige des anonymisierten Texts
  router.push({
    name: 'PDF Patienten Annotation',
    params: { pdfId: pdf.id },
    query: { tab: 'anonymized' }
  });
};

// Add PDF-specific utility method
const getFileName = (filePath) => {
  if (!filePath) return 'Unbekannt';
  return filePath.split('/').pop() || filePath;
};

// Initialisierung
onMounted(async () => {
  await Promise.all([
    refreshAnnotations(),
    refreshVideoAnonymizations(),
    refreshPdfAnnotations()
  ]);
});
</script>

<style scoped>
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.table {
  margin-bottom: 0;
}

.table th, .table td {
  text-align: center;
  vertical-align: middle;
}

.stat-card {
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  align-items: center;
}

.stat-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.table-hover tbody tr:hover {
  background-color: #f5f5f5;
}

.table-dark {
  background-color: #343a40;
  color: white;
}

.table-dark th, .table-dark td {
  border-color: #454d55;
}
</style>
