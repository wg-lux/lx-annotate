<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Anonymisierungsvalidierung und Annotationen</h4>
      </div>
      <div class="card-body">
        <!-- Loading / Error States -->
        <div v-if="store.loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Anonymisierte Daten werden geladen...</p>
        </div>

        <div v-else-if="store.error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ store.error }}
        </div>

        <div v-else-if="!currentItem" class="alert alert-info" role="alert">
          Alle Anonymisierungen wurden bearbeitet.
        </div>

        <!-- File Upload Zone - shown when no current item and no successful upload yet -->
        <div v-if="!currentItem && !hasSuccessfulUpload" class="mb-4">
          <FileDropZone 
            :is-uploading="isUploading || store.isAnyFileProcessing"
            @files-selected="handleFilesSelected"
            accepted-file-types="*"
          />
          
          <!-- Processing Status Alert -->
          <div v-if="store.isAnyFileProcessing" class="alert alert-warning mt-3">
            <i class="fas fa-info-circle me-2"></i>
            <strong>{{ store.processingFiles.length }} Datei(en)</strong> werden gerade anonymisiert.
            Der Upload neuer Dateien ist temporär deaktiviert.
            <div class="mt-2">
              <router-link to="/anonymisierung/uebersicht" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-eye me-1"></i>
                Zur Übersicht
              </router-link>
            </div>
          </div>
        </div>

        <!-- Main Content When Data is Available -->
        <template v-else>
          <!-- Content Type Indicator -->
          <div class="row mb-3">
            <div class="col-12">
              <div class="alert alert-info d-flex align-items-center" role="alert">
                <i class="fas fa-info-circle me-2"></i>
                <span>
                  <strong>Validierung:</strong> 
                  {{ currentItem?.reportMeta?.pdfUrl ? 'PDF-Dokument' : 'Video-Datei' }}
                  {{ currentItem?.reportMeta?.centerName ? `- ${currentItem.reportMeta.centerName}` : '' }}
                </span>
              </div>
            </div>
          </div>

          <div class="row mb-4">
            <!-- Patient Information & Annotation Section (Reduced Width) -->
            <div class="col-md-5">
              <div class="card bg-light mb-4">
                <div class="card-body">
                  <h5 class="card-title">Patienteninformationen</h5>
                  <div class="mb-3">
                    <label class="form-label">Vorname:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.patientFirstName"
                    >
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Nachname:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.patientLastName"
                    >
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Geschlecht:</label>
                    <select class="form-select" v-model="editedPatient.patientGender">
                      <option value="male">Männlich</option>
                      <option value="female">Weiblich</option>
                      <option value="other">Divers</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Geburtsdatum:</label>
                    <input 
                      type="date" 
                      class="form-control" 
                      v-model="editedPatient.patientDob"
                    >
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Fallnummer:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.casenumber"
                    >
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Untersuchungsdatum:</label>
                    <input 
                      type="date" 
                      class="form-control" 
                      v-model="examinationDate"
                      :class="{ 'is-invalid': !isExaminationDateValid }"
                    >
                    <div class="invalid-feedback" v-if="!isExaminationDateValid">
                      Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Anonymisierter Text:</label>
                    <textarea class="form-control"
                            rows="6"
                            v-model="editedAnonymizedText" />
                  </div>
                </div>
              </div>

              <!-- Annotation Section -->
              <div class="card bg-light">
                <div class="card-body">
                  <h5 class="card-title">Annotationen</h5>
                  <div class="mb-3">
                    <!-- FilePond Component -->
                    <FilePond ref="pond" name="file"
                      accepted-file-types="image/*"
                      label-idle="Bild hier ablegen oder klicken" />
                  </div>
                  <div v-if="processedUrl" class="mt-3">
                    <img :src="showOriginal ? originalUrl : processedUrl"
                         class="img-fluid" alt="Uploaded Image">
                    <button class="btn btn-info btn-sm mt-2" @click="toggleImage">
                      {{ showOriginal ? 'Bearbeitetes Bild anzeigen' : 'Original anzeigen' }}
                    </button>
                  </div>
                  <div class="mt-3">
                    <button 
                      class="btn btn-primary"
                      @click="saveAnnotation"
                      :disabled="!canSubmit"
                    >
                      Annotation speichern
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Media Viewer Section (PDF or Video) -->
            <div class="col-md-7">
              <div class="card">
                <div class="card-header pb-0">
                  <h5 class="mb-0">
                    {{ currentItem?.reportMeta?.pdfUrl ? 'PDF Vorschau' : 'Video Vorschau' }}
                  </h5>
                  <!-- Clear Data Format Message -->
                  <div class="alert alert-info mt-2 mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Datenformat:</strong> 
                    <span v-if="currentItem?.reportMeta?.pdfUrl">
                      PDF-Dokument ({{ Math.round((currentItem.reportMeta.file?.length || 0) / 1024) || 'Unbekannt' }} KB)
                    </span>
                    <span v-else-if="getVideoStreamUrl()">
                      Video-Datei (Stream-URL: {{ getVideoStreamUrl() }})
                    </span>
                    <span v-else>
                      Unbekanntes Format - ID: {{ currentItem?.id }}
                    </span>
                  </div>
                </div>
                <div class="card-body media-viewer-container">
                  <!-- PDF Viewer with streaming URL -->
                  <iframe
                    v-if="currentItem?.reportMeta?.pdfUrl || (!getVideoStreamUrl() && getPdfStreamUrl())"
                    :src="getPdfStreamUrl() || currentItem?.reportMeta?.pdfUrl"
                    width="100%"
                    height="800px"
                    frameborder="0"
                    title="PDF Vorschau"
                  >
                    Ihr Browser unterstützt keine eingebetteten PDFs. Sie können die Datei <a :href="getPdfStreamUrl() || currentItem?.reportMeta?.pdfUrl">hier herunterladen</a>.
                  </iframe>
                  
                  <!-- Video Viewer with corrected streaming URL -->
                  <video
                    v-else-if="getVideoStreamUrl()"
                    controls
                    width="100%"
                    height="600px"
                    :src="getVideoStreamUrl() || undefined"
                    @error="onVideoError"
                    @loadstart="onVideoLoadStart"
                    @canplay="onVideoCanPlay"
                  >
                    Ihr Browser unterstützt dieses Video-Format nicht.
                  </video>
                  
                  <!-- Debug Information -->
                  <div v-else class="alert alert-warning">
                    <h6>Debug-Informationen:</h6>
                    <ul class="mb-0">
                      <li><strong>Current Item ID:</strong> {{ currentItem?.id || 'Nicht verfügbar' }}</li>
                      <li><strong>SensitiveMeta ID:</strong> {{ currentItem?.sensitiveMetaId || 'Nicht verfügbar' }}</li>
                      <li><strong>ReportMeta verfügbar:</strong> {{ !!currentItem?.reportMeta }}</li>
                      <li><strong>File URL:</strong> {{ currentItem?.reportMeta?.file || 'Nicht verfügbar' }}</li>
                      <li><strong>PDF URL:</strong> {{ currentItem?.reportMeta?.pdfUrl || 'Nicht verfügbar' }}</li>
                      <li><strong>Generierte Video Stream URL:</strong> {{ debugGetVideoStreamUrl() }}</li>
                      <li><strong>Generierte PDF Stream URL:</strong> {{ debugGetPdfStreamUrl() }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="row">
            <div class="col-12 d-flex justify-content-between">
              <button class="btn btn-secondary" @click="skipItem">
                Überspringen
              </button>
              <div>
                <button class="btn btn-danger me-2" @click="rejectItem">
                  Ablehnen
                </button>
                <button 
                  class="btn btn-success" 
                  @click="approveItem"
                  :disabled="!isExaminationDateValid || !dirty">
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAnonymizationStore, type PatientData } from '@/stores/anonymizationStore';
// @ts-ignore
import vueFilePond from 'vue-filepond';
import axiosInstance, { r } from '@/api/axiosInstance';
// @ts-ignore
import { setOptions, registerPlugin } from 'filepond';
import FileDropZone from '@/components/common/FileDropZone.vue';

// @ts-ignore
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
// @ts-ignore
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

registerPlugin(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

const FilePond = vueFilePond(
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

interface FilePondInstance {
  removeFiles(): void;
}

// Store reference
const store = useAnonymizationStore();

// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const editedPatient = ref({
  patientFirstName: '',
  patientLastName: '',
  patientGender: '',
  patientDob: '',
  casenumber: ''
});

// Upload-related state
const originalUrl = ref('');
const processedUrl = ref('');
const showOriginal = ref(false);
const isUploading = ref(false);
const hasSuccessfulUpload = ref(false);

// Dirty tracking
const dirty = ref(false);

// Template refs
const pond = ref<FilePondInstance>();

// Computed
const currentItem = computed(() => store.current);

const isExaminationDateValid = computed(() => {
  if (!examinationDate.value || !editedPatient.value.patientDob) {
    return true;
  }
  return new Date(examinationDate.value) >= new Date(editedPatient.value.patientDob);
});

const canSubmit = computed(() => {
  return processedUrl.value && originalUrl.value && isExaminationDateValid.value;
});

// Watch
watch(currentItem, (newItem: PatientData | null) => {
  if (newItem) {
    loadCurrentItemData(newItem);
  }
}, { immediate: true });

watch(editedAnonymizedText, () => {
  dirty.value = true;
});

watch(examinationDate, () => {
  dirty.value = true;
});

watch(editedPatient, () => {
  dirty.value = true;
}, { deep: true });

// Methods
const setupFilePond = () => {
  setOptions({
    allowRevert: true,
    chunkUploads: true,
    maxParallelUploads: 3,
    server: {
      process: (
        fieldName: string,
        file: any,
        metadata: Record<string, any>,
        load: (serverId: string) => void,
        error: (errorText: string) => void,
        progress: (computable: boolean, loaded: number, total: number) => void,
        abort: () => void
      ) => {
        const fd = new FormData();
        fd.append(fieldName, file);
        
        axiosInstance.post(r('upload-image/'), fd, {
          onUploadProgress: e => {
            if (progress) {
              progress(true, e.loaded ?? 0, e.total ?? 0);
            }
          }
        })
        .then(({ data }) => {
          originalUrl.value = data.original_image_url;
          processedUrl.value = data.processed_image_url;
          if (load) {
            load(data.upload_id);
          }
          hasSuccessfulUpload.value = true;
        })
        .catch(err => {
          if (error) {
            error(err.message);
          }
        });
        
        // Return abort function for FilePond to cancel requests if needed
        return {
          abort: () => {
            if (abort) {
              abort();
            }
          }
        };
      },
      revert: (id: any, load: any) => {
        axiosInstance.delete(r(`upload-image/${id}/`)).finally(() => {
          if (load) {
            load();
          }
        });
      }
    }
  });
};

const fetchNextItem = async () => {
  try {
    await store.fetchNext();
  } catch (error) {
    console.error('Error fetching next item:', error);
  }
};

const loadCurrentItemData = (item: PatientData) => {
  if (!item) return;
  
  editedAnonymizedText.value = item.anonymizedText || '';
  examinationDate.value = item.reportMeta?.examinationDate || '';
  
  if (item.reportMeta) {
    editedPatient.value.patientFirstName = item.reportMeta.patientFirstName || '';
    editedPatient.value.patientLastName = item.reportMeta.patientLastName || '';
    editedPatient.value.patientGender = item.reportMeta.patientGender || '';
    editedPatient.value.patientDob = item.reportMeta.patientDob || '';
    editedPatient.value.casenumber = item.reportMeta.casenumber || '';
  }
  
  dirty.value = false;
};

const toggleImage = () => {
  showOriginal.value = !showOriginal.value;
};

const saveAnnotation = async () => {
  if (!canSubmit.value) return;
  
  try {
    const annotationData = {
      original_image_url: originalUrl.value,
      processed_image_url: processedUrl.value,
      patient_data: editedPatient.value,
      examinationDate: examinationDate.value,
      anonymized_text: editedAnonymizedText.value
    };
    
    await axiosInstance.post(r('save-annotation/'), annotationData);
    
    // Reset upload state
    originalUrl.value = '';
    processedUrl.value = '';
    hasSuccessfulUpload.value = false;
    if (pond.value) {
      pond.value.removeFiles();
    }
    
    console.log('Annotation saved successfully');
  } catch (error) {
    console.error('Error saving annotation:', error);
  }
};

const handleFilesSelected = async (files: File[]) => {
  if (!files || files.length === 0) {
    console.warn('handleFilesSelected: empty file array received');
    return;
  }
  
  isUploading.value = true;
  
  try {
    console.log('Processing files:', files.map(f => f.name));
    
    // Convert File[] to FileList using DataTransfer
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    
    const result = await store.uploadAndFetch(dataTransfer.files);
    if (result) {
      hasSuccessfulUpload.value = true;
    }
  } catch (error) {
    console.error('Error uploading files:', error);
  } finally {
    isUploading.value = false;
  }
};

const skipItem = async () => {
  if (currentItem.value) {
    await fetchNextItem();
    dirty.value = false;
  }
};

const approveItem = async () => {
  if (!currentItem.value || !isExaminationDateValid.value) return;
  
  try {
    const updatedData: Partial<PatientData> = {
      id: currentItem.value.id,
      anonymizedText: editedAnonymizedText.value,
      reportMeta: {
        ...(currentItem.value.reportMeta || {}),  
        ...editedPatient.value,
        examinationDate: examinationDate.value,
        id: currentItem.value.reportMeta?.id || 0
      }
    };
    
    // Determine media type and use appropriate endpoint
    const isVideo = currentItem.value.reportMeta?.file && !currentItem.value.reportMeta?.pdfUrl;
    
    if (isVideo) {
      await store.patchVideo(updatedData);
    } else {
      await store.patchPdf(updatedData);
    }
    
    await fetchNextItem();
    dirty.value = false;
  } catch (error) {
    console.error('Error approving item:', error);
  }
};

const rejectItem = async () => {
  if (currentItem.value) {
    await fetchNextItem();
    dirty.value = false;
  }
};

// Video streaming methods
const getVideoStreamUrl = () => {
  if (!currentItem.value?.id) return null;
  
  // Use the correct video stream endpoint that serves raw bytes
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/videostream/${currentItem.value.id}/`;
};

// PDF streaming methods - mirroring video streaming functionality
const getPdfStreamUrl = () => {
  if (!currentItem.value?.id) return null;
  
  // Use the new PDF stream endpoint with HTTP range support
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/pdfstream/${currentItem.value.id}/`;
};

const debugGetVideoStreamUrl = () => {
  // Debug version that shows the URL construction process
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const itemId = currentItem.value?.id;
  const url = itemId ? `${baseUrl}/api/videostream/${itemId}/` : 'No item ID available';
  return url;
};

const debugGetPdfStreamUrl = () => {
  // Debug version for PDF stream URL construction
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const itemId = currentItem.value?.id;
  const url = itemId ? `${baseUrl}/api/pdfstream/${itemId}/` : 'No item ID available';
  return url;
};

// Video event handlers
const onVideoError = (event: Event) => {
  console.error('Video loading error:', event);
  const video = event.target as HTMLVideoElement;
  console.error('Video error details:', {
    error: video.error,
    networkState: video.networkState,
    readyState: video.readyState,
    currentSrc: video.currentSrc
  });
};

const onVideoLoadStart = () => {
  console.log('Video loading started for:', getVideoStreamUrl());
};

const onVideoCanPlay = () => {
  console.log('Video can play, loaded successfully');
};

// Lifecycle
onMounted(() => {
  setupFilePond();
  fetchNextItem();
});
</script>

<style scoped>
pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 10px;
  font-size: 0.9rem;
  max-height: 300px;
  overflow-y: auto;
}

.form-control:focus, .form-select:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.pdf-viewer-container {
  height: 850px;
  overflow: hidden;
}

.pdf-viewer-container iframe {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}

.media-viewer-container {
  height: 850px;
  overflow: hidden;
}

.media-viewer-container iframe,
.media-viewer-container video {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}
</style>
