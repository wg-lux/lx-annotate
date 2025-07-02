<template>
  <div class="file-selector">
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="fas fa-file-alt me-2"></i>
          Datei auswählen für Anonymisierungsvalidierung
        </h5>
      </div>
      <div class="card-body">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Verfügbare Dateien werden geladen...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ error }}
        </div>

        <!-- File Selection Interface -->
        <div v-else>
          <!-- Filter Controls -->
          <div class="row mb-4">
            <div class="col-md-6">
              <label for="fileTypeFilter" class="form-label">Dateityp:</label>
              <select 
                id="fileTypeFilter" 
                class="form-select" 
                v-model="selectedFileType"
                @change="loadFiles"
              >
                <option value="all">Alle Dateien</option>
                <option value="pdf">Nur PDFs</option>
                <option value="video">Nur Videos</option>
              </select>
            </div>
            <div class="col-md-6">
              <label for="searchFilter" class="form-label">Suche:</label>
              <input 
                id="searchFilter"
                type="text" 
                class="form-control" 
                v-model="searchTerm"
                placeholder="Nach Dateiname oder Patient suchen..."
                @input="filterFiles"
              >
            </div>
          </div>

          <!-- PDF Files Section -->
          <div v-if="shouldShowPdfs" class="mb-4">
            <h6 class="text-primary">
              <i class="fas fa-file-pdf me-2"></i>
              PDF Dokumente ({{ filteredPdfs.length }})
            </h6>
            <div v-if="filteredPdfs.length === 0" class="alert alert-info">
              Keine PDF-Dateien gefunden.
            </div>
            <div v-else class="file-grid">
              <div 
                v-for="pdf in filteredPdfs" 
                :key="`pdf-${pdf.id}`"
                class="file-item card"
                :class="{ 'selected': selectedFile?.type === 'pdf' && selectedFile?.id === pdf.id }"
                @click="selectFile('pdf', pdf)"
              >
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">
                      <i class="fas fa-file-pdf text-danger me-2"></i>
                      {{ pdf.filename }}
                    </h6>
                    <span class="badge bg-primary">PDF</span>
                  </div>
                  
                  <div v-if="pdf.patientInfo" class="patient-info">
                    <small class="text-muted">
                      <strong>Patient:</strong> 
                      {{ pdf.patientInfo.patientFirstName }} {{ pdf.patientInfo.patientLastName }}
                    </small>
                    <br>
                    <small class="text-muted">
                      <strong>Geb.:</strong> {{ formatDate(pdf.patientInfo.patientDob) }}
                    </small>
                    <br>
                    <small class="text-muted" v-if="pdf.patientInfo.centerName">
                      <strong>Zentrum:</strong> {{ pdf.patientInfo.centerName }}
                    </small>
                  </div>
                  
                  <div class="mt-2">
                    <small class="text-muted">ID: {{ pdf.id }}</small>
                    <small class="text-muted ms-2" v-if="pdf.sensitiveMetaId">
                      Meta ID: {{ pdf.sensitiveMetaId }}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Video Files Section -->
          <div v-if="shouldShowVideos" class="mb-4">
            <h6 class="text-success">
              <i class="fas fa-video me-2"></i>
              Video Dateien ({{ filteredVideos.length }})
            </h6>
            <div v-if="filteredVideos.length === 0" class="alert alert-info">
              Keine Video-Dateien gefunden.
            </div>
            <div v-else class="file-grid">
              <div 
                v-for="video in filteredVideos" 
                :key="`video-${video.id}`"
                class="file-item card"
                :class="{ 'selected': selectedFile?.type === 'video' && selectedFile?.id === video.id }"
                @click="selectFile('video', video)"
              >
                <div class="card-body p-3">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">
                      <i class="fas fa-video text-success me-2"></i>
                      {{ video.filename }}
                    </h6>
                    <span class="badge bg-success">Video</span>
                  </div>
                  
                  <div v-if="video.patientInfo" class="patient-info">
                    <small class="text-muted">
                      <strong>Patient:</strong> 
                      {{ video.patientInfo.patientFirstName }} {{ video.patientInfo.patientLastName }}
                    </small>
                    <br>
                    <small class="text-muted">
                      <strong>Geb.:</strong> {{ formatDate(video.patientInfo.patientDob) }}
                    </small>
                    <br>
                    <small class="text-muted" v-if="video.patientInfo.centerName">
                      <strong>Zentrum:</strong> {{ video.patientInfo.centerName }}
                    </small>
                  </div>
                  
                  <div class="mt-2">
                    <small class="text-muted">ID: {{ video.id }}</small>
                    <small class="text-muted ms-2" v-if="video.sensitiveMetaId">
                      Meta ID: {{ video.sensitiveMetaId }}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button 
              type="button" 
              class="btn btn-secondary"
              @click="$emit('cancel')"
            >
              Abbrechen
            </button>
            <button 
              type="button" 
              class="btn btn-primary"
              :disabled="!selectedFile"
              @click="startAnnotation"
            >
              <i class="fas fa-play me-2"></i>
              Anonymisierung starten
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axiosInstance from '@/api/axiosInstance';

// Types
interface PatientInfo {
  patientFirstName?: string;
  patientLastName?: string;
  patientDob?: string;
  examinationDate?: string;
  centerName?: string;
}

interface FileItem {
  id: number;
  filename: string;
  filePath?: string;
  sensitiveMetaId?: number;
  patientInfo?: PatientInfo;
  createdAt?: string;
}

interface SelectedFile {
  type: 'pdf' | 'video';
  id: number;
  data: FileItem;
}

// Events
const emit = defineEmits<{
  fileSelected: [file: SelectedFile];
  cancel: [];
}>();

// State
const loading = ref(false);
const error = ref<string | null>(null);
const selectedFileType = ref<'all' | 'pdf' | 'video'>('all');
const searchTerm = ref('');
const selectedFile = ref<SelectedFile | null>(null);

// File data
const pdfs = ref<FileItem[]>([]);
const videos = ref<FileItem[]>([]);

// Computed
const shouldShowPdfs = computed(() => 
  selectedFileType.value === 'all' || selectedFileType.value === 'pdf'
);

const shouldShowVideos = computed(() => 
  selectedFileType.value === 'all' || selectedFileType.value === 'video'
);

const filteredPdfs = computed(() => {
  if (!searchTerm.value) return pdfs.value;
  const search = searchTerm.value.toLowerCase();
  return pdfs.value.filter(pdf => 
    pdf.filename.toLowerCase().includes(search) ||
    pdf.patientInfo?.patientFirstName?.toLowerCase().includes(search) ||
    pdf.patientInfo?.patientLastName?.toLowerCase().includes(search)
  );
});

const filteredVideos = computed(() => {
  if (!searchTerm.value) return videos.value;
  const search = searchTerm.value.toLowerCase();
  return videos.value.filter(video => 
    video.filename.toLowerCase().includes(search) ||
    video.patientInfo?.patientFirstName?.toLowerCase().includes(search) ||
    video.patientInfo?.patientLastName?.toLowerCase().includes(search)
  );
});

// Methods
const loadFiles = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await axiosInstance.get('/api/available-files/', {
      params: {
        type: selectedFileType.value,
        limit: 100
      }
    });
    
    if (selectedFileType.value === 'all' || selectedFileType.value === 'pdf') {
      pdfs.value = response.data.pdfs || [];
    }
    
    if (selectedFileType.value === 'all' || selectedFileType.value === 'video') {
      videos.value = response.data.videos || [];
    }
    
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Laden der Dateien.';
    console.error('Error loading files:', err);
  } finally {
    loading.value = false;
  }
};

const filterFiles = () => {
  // Filtering is handled by computed properties
  // This method exists for the @input event
};

const selectFile = (type: 'pdf' | 'video', file: FileItem) => {
  selectedFile.value = {
    type,
    id: file.id,
    data: file
  };
};

const startAnnotation = () => {
  if (selectedFile.value) {
    emit('fileSelected', selectedFile.value);
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Unbekannt';
  try {
    return new Date(dateString).toLocaleDateString('de-DE');
  } catch {
    return dateString;
  }
};

// Lifecycle
onMounted(() => {
  loadFiles();
});
</script>

<style scoped>
.file-selector {
  max-width: 1200px;
  margin: 0 auto;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.file-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.file-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.file-item.selected {
  border-color: #0d6efd;
  background-color: #f8f9ff;
}

.patient-info {
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 0.25rem;
  margin-top: 0.5rem;
}

.card-title {
  font-size: 0.9rem;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .file-grid {
    grid-template-columns: 1fr;
  }
}
</style>