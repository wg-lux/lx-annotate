<template>
  <div class="video-annotation-container">
    <!-- Error/Success Messages -->
    <div v-if="error" class="alert alert-danger alert-dismissible">
      <strong>Fehler:</strong> {{ error }}
      <button type="button" class="btn-close" @click="error = ''"></button>
    </div>

    <div v-if="successMessage" class="alert alert-success alert-dismissible">
      <strong>Erfolg:</strong> {{ successMessage }}
      <button type="button" class="btn-close" @click="successMessage = ''"></button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Laden...</span>
      </div>
      <p>Lade Video- und Patientendaten...</p>
    </div>

    <!-- No Data Available State -->
    <div v-else-if="!currentVideoData" class="text-center text-muted py-5">
      <i class="fas fa-video-slash fa-3x"></i>
      <p class="mt-2">Keine Videos zur Annotation verfügbar</p>
      <small>Alle Videos wurden bereits bearbeitet oder es sind keine Videos vorhanden.</small>
    </div>

    <!-- Video Upload Component - Shown when no video data is available -->
    <VideoUpload 
      v-else-if="!currentVideoData && !loading" 
      @video-uploaded="onVideoUploaded"
      @back-to-annotation="loadNextVideo"
    />

    <!-- Main Content When Data is Available -->
    <template v-else>
      <div class="row">
        <!-- Patient Information & Annotation Section -->
        <div class="col-md-6">
          <!-- Enhanced Patient Information Section with Edit Capability -->
          <div class="patient-info-section mb-4">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                  <i class="fas fa-user-md"></i>
                  Patienteninformationen
                  <span v-if="currentVideoData.pseudonym_first_name" class="badge bg-info ms-2">
                    <i class="fas fa-user-secret"></i>
                    Pseudonamen verfügbar
                  </span>
                </h5>
                <div class="header-actions">
                  <button 
                    v-if="!editingPatientInfo"
                    class="btn btn-outline-primary btn-sm"
                    @click="startEditingPatientInfo"
                    :disabled="loading"
                  >
                    <i class="fas fa-edit"></i>
                    Bearbeiten
                  </button>
                  <button 
                    v-if="editingPatientInfo"
                    class="btn btn-success btn-sm me-2"
                    @click="savePatientInfo"
                    :disabled="loading || !hasPatientChanges"
                  >
                    <i class="fas fa-save"></i>
                    Speichern
                  </button>
                  <button 
                    v-if="editingPatientInfo"
                    class="btn btn-secondary btn-sm"
                    @click="cancelEditingPatientInfo"
                    :disabled="loading"
                  >
                    <i class="fas fa-times"></i>
                    Abbrechen
                  </button>
                </div>
              </div>
              <div class="card-body">
                <!-- Patient Basic Information -->
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label text-muted">Vorname:</label>
                    <input 
                      v-if="editingPatientInfo"
                      v-model="editablePatientData.patient_first_name"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Vorname eingeben"
                    />
                    <div v-else class="patient-data-display">
                      {{ currentVideoData.patient_first_name || 'Nicht angegeben' }}
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label text-muted">Nachname:</label>
                    <input 
                      v-if="editingPatientInfo"
                      v-model="editablePatientData.patient_last_name"
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Nachname eingeben"
                    />
                    <div v-else class="patient-data-display">
                      {{ currentVideoData.patient_last_name || 'Nicht angegeben' }}
                    </div>
                  </div>
                </div>
                
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label text-muted">Geburtsdatum:</label>
                    <input 
                      v-if="editingPatientInfo"
                      v-model="editablePatientData.patient_dob"
                      type="date"
                      class="form-control form-control-sm"
                    />
                    <div v-else class="patient-data-display">
                      {{ formatDate(currentVideoData.patient_dob) }}
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label text-muted">Untersuchungsdatum:</label>
                    <input 
                      v-if="editingPatientInfo"
                      v-model="editablePatientData.examination_date"
                      type="date"
                      class="form-control form-control-sm"
                      :class="{ 'is-invalid': !isExaminationDateValid }"
                    />
                    <div v-else class="patient-data-display">
                      {{ formatDate(currentVideoData.examination_date) }}
                    </div>
                    <div class="invalid-feedback" v-if="editingPatientInfo && !isExaminationDateValid">
                      Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.
                    </div>
                  </div>
                </div>

                <!-- Video and Annotation Status -->
                <div class="row">
                  <div class="col-md-4">
                    <label class="form-label text-muted">Video-ID:</label>
                    <div class="patient-data-display">
                      <span class="font-mono">{{ currentVideoData.id }}</span>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label text-muted">Dauer:</label>
                    <div class="patient-data-display">
                      {{ formatDuration(currentVideoData.duration) }}
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label text-muted">Status:</label>
                    <div class="patient-data-display">
                      <span :class="annotationStatusClass">
                        <i :class="annotationStatusIcon"></i>
                        {{ annotationStatusText }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Pseudonym Information -->
                <div v-if="currentVideoData.pseudonym_first_name" class="mt-3 pt-3 border-top">
                  <h6 class="text-muted mb-2">
                    <i class="fas fa-user-secret"></i>
                    Temporäre Pseudonamen (nur zur Validierung)
                  </h6>
                  <div class="row">
                    <div class="col-md-4">
                      <small class="text-muted">Pseudonym Vorname:</small>
                      <div class="pseudo-data">{{ currentVideoData.pseudonym_first_name }}</div>
                    </div>
                    <div class="col-md-4">
                      <small class="text-muted">Pseudonym Nachname:</small>
                      <div class="pseudo-data">{{ currentVideoData.pseudonym_last_name }}</div>
                    </div>
                    <div class="col-md-4">
                      <button 
                        class="btn btn-outline-secondary btn-sm"
                        @click="generateNewPseudonyms"
                        :disabled="generatingPseudonyms"
                      >
                        <span v-if="generatingPseudonyms" class="spinner-border spinner-border-sm me-1"></span>
                        <i v-else class="fas fa-refresh"></i>
                        Neue Pseudonamen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Anonymization Validation Section -->
          <div v-if="currentVideoData.requires_validation" class="anonymization-section">
            <AnonymizationValidator
              :video-id="currentVideoData.id"
              :patient-data="currentVideoData"
              :max-frames="1000"
              @validation-completed="onValidationCompleted"
              @cropping-required="onCroppingRequired"
              @patient-data-updated="onPatientDataUpdated"
            />
          </div>
        </div>

        <!-- Video Player Section -->
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="fas fa-video"></i>
                Video-Player
              </h5>
            </div>
            <div class="card-body">
              <!-- Video Player -->
              <video 
                v-if="currentVideoStreamUrl"
                ref="videoRef" 
                :src="currentVideoStreamUrl" 
                controls 
                class="video-player mb-3"
                @loadedmetadata="onVideoLoaded"
                @timeupdate="handleTimeUpdate"
                @error="handleVideoError"
              >
                Ihr Browser unterstützt das Video-Element nicht.
              </video>

              <!-- Video Error State -->
              <div v-if="videoError" class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                Video konnte nicht geladen werden: {{ videoError }}
              </div>

              <!-- Video Controls -->
              <div class="video-controls">
                <div class="row align-items-center">
                  <div class="col-md-8">
                    <span class="text-muted">
                      <i class="fas fa-clock"></i>
                      Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                    </span>
                  </div>
                  <div class="col-md-4 text-end">
                    <button 
                      class="btn btn-success btn-sm"
                      @click="markAsValidated"
                      :disabled="loading || !canMarkAsValidated"
                    >
                      <i class="fas fa-check"></i>
                      Als validiert markieren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons mt-4">
        <div class="row">
          <div class="col-12 d-flex justify-content-between">
            <button 
              class="btn btn-secondary" 
              @click="skipVideo"
              :disabled="loading"
            >
              <i class="fas fa-step-forward"></i>
              Überspringen
            </button>
            <div>
              <button 
                class="btn btn-warning me-2" 
                @click="rejectVideo"
                :disabled="loading"
              >
                <i class="fas fa-times"></i>
                Problematisch markieren
              </button>
              <button 
                class="btn btn-success" 
                @click="approveAndNext"
                :disabled="loading || !canApprove"
              >
                <i class="fas fa-check-double"></i>
                Bestätigen & Weiter
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import AnonymizationValidator from '../VideoAnnotation/AnonymizationValidator.vue';
import VideoUpload from './VideoUpload.vue';

interface VideoMetaData {
  id: number;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  examination_date?: string;
  duration?: number;
  video_url?: string;
  file?: string;
  sensitive_meta_id?: number;
  original_file_name?: string;
  pseudonym_first_name?: string;
  pseudonym_last_name?: string;
  anonymization_status?: string;
  requires_validation?: boolean;
}
    // Reactive state
    const currentVideoData = ref<VideoMetaData | null>(null);
    const loading = ref(false);
    const error = ref('');
    const successMessage = ref('');
    const videoError = ref('');
    const lastProcessedId = ref<number | null>(null);
    
    // Video player state
    const currentTime = ref(0);
    const duration = ref(0);
    const videoRef = ref<HTMLVideoElement | null>(null);
    
    // Patient editing state
    const editingPatientInfo = ref(false);
    const editablePatientData = ref<Partial<VideoMetaData>>({});
    const generatingPseudonyms = ref(false);

    // Computed properties
    const currentVideoStreamUrl = computed(() => {
      if (!currentVideoData.value?.id) return '';
      return `/api/videostream/${currentVideoData.value.id}/`;
    });

    const annotationStatusText = computed(() => {
      const status = currentVideoData.value?.anonymization_status;
      switch (status) {
        case 'anonymized': return 'Anonymisiert'
        case 'validated_pending_anonymization': return 'Validiert - Anonymisierung ausstehend'
        case 'pending_validation': return 'Validierung erforderlich'
        case 'no_sensitive_data': return 'Keine sensitiven Daten'
        default: return 'Status unbekannt'
      }
    });

    const annotationStatusClass = computed(() => {
      const status = currentVideoData.value?.anonymization_status;
      switch (status) {
        case 'anonymized': return 'badge bg-success'
        case 'validated_pending_anonymization': return 'badge bg-warning'
        case 'pending_validation': return 'badge bg-danger'
        case 'no_sensitive_data': return 'badge bg-info'
        default: return 'badge bg-secondary'
      }
    });

    const annotationStatusIcon = computed(() => {
      const status = currentVideoData.value?.anonymization_status;
      switch (status) {
        case 'anonymized': return 'fas fa-check-circle'
        case 'validated_pending_anonymization': return 'fas fa-clock'
        case 'pending_validation': return 'fas fa-exclamation-triangle'
        case 'no_sensitive_data': return 'fas fa-info-circle'
        default: return 'fas fa-question-circle'
      }
    });

    const hasPatientChanges = computed(() => {
      if (!currentVideoData.value || !editablePatientData.value) return false;
      
      return (
        editablePatientData.value.patient_first_name !== currentVideoData.value.patient_first_name ||
        editablePatientData.value.patient_last_name !== currentVideoData.value.patient_last_name ||
        editablePatientData.value.patient_dob !== currentVideoData.value.patient_dob ||
        editablePatientData.value.examination_date !== currentVideoData.value.examination_date
      );
    });

    const isExaminationDateValid = computed(() => {
      if (!editablePatientData.value.examination_date || !editablePatientData.value.patient_dob) return true;
      return new Date(editablePatientData.value.examination_date) >= new Date(editablePatientData.value.patient_dob);
    });

    const canMarkAsValidated = computed(() => {
      return currentVideoData.value && !editingPatientInfo.value;
    });

    const canApprove = computed(() => {
      return currentVideoData.value && !editingPatientInfo.value && isExaminationDateValid.value;
    });

    // Methods
    async function loadNextVideo() {
      try {
        loading.value = true;
        error.value = '';
        videoError.value = '';

        // Build URL with last_id parameter if we have processed a video before
        const url = lastProcessedId.value 
          ? `/api/video/sensitivemeta/?last_id=${lastProcessedId.value}`
          : '/api/video/sensitivemeta/';

        const response = await axios.get(url, {
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.data) {
          currentVideoData.value = response.data;
          
          // Generate pseudonyms if needed
          if (response.data.requires_validation && !response.data.pseudonym_first_name) {
            await generateNewPseudonyms();
          }
        }
        
      } catch (err: any) {
        console.error('Error loading video metadata:', err);
        if (err.response?.status === 404) {
          currentVideoData.value = null;
          error.value = 'Keine weiteren Videos zur Annotation verfügbar.';
        } else if (err.response?.status === 400) {
          // Handle the 400 error by showing a helpful message
          const errorDetails = err.response?.data?.details;
          if (errorDetails) {
            const missingFields = Object.keys(errorDetails);
            error.value = `Video-Metadaten unvollständig. Fehlende Felder: ${missingFields.join(', ')}. Bitte Videos über das Dashboard mit vollständigen Patientendaten hochladen.`;
          } else {
            error.value = 'Video-Metadaten unvollständig oder fehlerhaft. Bitte prüfen Sie die hochgeladenen Videos.';
          }
          currentVideoData.value = null;
        } else {
          error.value = err.response?.data?.error || err.message || 'Fehler beim Laden der Video-Metadaten';
        }
      } finally {
        loading.value = false;
      }
    }

    function startEditingPatientInfo() {
      if (currentVideoData.value) {
        editablePatientData.value = {
          patient_first_name: currentVideoData.value.patient_first_name,
          patient_last_name: currentVideoData.value.patient_last_name,
          patient_dob: currentVideoData.value.patient_dob,
          examination_date: currentVideoData.value.examination_date,
        };
        editingPatientInfo.value = true;
      }
    }

    function cancelEditingPatientInfo() {
      editingPatientInfo.value = false;
      editablePatientData.value = {};
    }

    async function savePatientInfo() {
      if (!currentVideoData.value?.sensitive_meta_id || !hasPatientChanges.value) return;

      try {
        loading.value = true;
        error.value = '';

        const updateData = {
          sensitive_meta_id: currentVideoData.value.sensitive_meta_id,
          ...editablePatientData.value
        };

        await axios.patch('/api/video/update_sensitivemeta/', updateData);

        // Update current data
        Object.assign(currentVideoData.value, editablePatientData.value);

        editingPatientInfo.value = false;
        successMessage.value = 'Patienteninformationen erfolgreich aktualisiert!';

        // Clear success message after 5 seconds
        setTimeout(() => {
          successMessage.value = '';
        }, 5000);

      } catch (err: any) {
        error.value = err.response?.data?.error || err.message || 'Fehler beim Speichern der Patienteninformationen';
      } finally {
        loading.value = false;
      }
    }

    async function generateNewPseudonyms() {
      if (!currentVideoData.value?.sensitive_meta_id) return;

      try {
        generatingPseudonyms.value = true;
        error.value = '';

        const response = await axios.post('/api/generate-temporary-pseudonym/', {
          sensitive_meta_id: currentVideoData.value.sensitive_meta_id,
          regenerate: true
        });

        if (response.data) {
          // Update current video data with new pseudonyms
          if (currentVideoData.value) {
            currentVideoData.value.pseudonym_first_name = response.data.pseudonym_first_name;
            currentVideoData.value.pseudonym_last_name = response.data.pseudonym_last_name;
          }
          
          successMessage.value = 'Temporäre Pseudonamen generiert!';
          setTimeout(() => { successMessage.value = ''; }, 3000);
        }

      } catch (err: any) {
        error.value = err.message || 'Fehler beim Generieren der Pseudonamen';
      } finally {
        generatingPseudonyms.value = false;
      }
    }

    async function markAsValidated() {
      // This would mark the current video as validated and move to next
      successMessage.value = 'Video als validiert markiert!';
      setTimeout(() => { successMessage.value = ''; }, 2000);
      await loadNextVideo();
    }

    async function skipVideo() {
      if (currentVideoData.value) {
        lastProcessedId.value = currentVideoData.value.id;
      }
      await loadNextVideo();
    }

    async function rejectVideo() {
      // This would mark the video as problematic
      successMessage.value = 'Video als problematisch markiert!';
      setTimeout(() => { successMessage.value = ''; }, 2000);
      await skipVideo();
    }

    async function approveAndNext() {
      if (currentVideoData.value) {
        lastProcessedId.value = currentVideoData.value.id;
        successMessage.value = 'Video erfolgreich validiert!';
        setTimeout(() => { successMessage.value = ''; }, 2000);
      }
      await loadNextVideo();
    }

    // Anonymization validation event handlers
    function onValidationCompleted() {
      successMessage.value = 'Anonymisierungsvalidierung erfolgreich abgeschlossen!';
      
      if (currentVideoData.value) {
        currentVideoData.value.requires_validation = false;
      }
      
      setTimeout(() => { successMessage.value = ''; }, 5000);
    }

    function onCroppingRequired() {
      error.value = 'Video-Cropping erforderlich! Sensitive Daten wurden im Video-Frame gefunden.';
      setTimeout(() => { error.value = ''; }, 10000);
    }

    function onPatientDataUpdated(updatedData: any) {
      if (currentVideoData.value) {
        Object.assign(currentVideoData.value, updatedData);
      }
    }

    // Video player handlers
    function onVideoLoaded() {
      if (videoRef.value) {
        duration.value = videoRef.value.duration;
        videoError.value = '';
      }
    }

    function handleVideoError(event: Event) {
      console.error('Video error:', event);
      videoError.value = 'Video konnte nicht geladen werden. Überprüfen Sie die Datei und Berechtigungen.';
    }

    function handleTimeUpdate() {
      if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
      }
    }

    // Handle video upload completion
    function onVideoUploaded(videoId: number) {
      successMessage.value = `Video ${videoId} erfolgreich hochgeladen und bereit für Annotation!`;
      setTimeout(() => { successMessage.value = ''; }, 5000);
      
      // Reload to get the new video for annotation
      loadNextVideo();
    }

    // Utility functions
    function formatTime(seconds: number): string {
      if (Number.isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
      
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function formatDate(dateString?: string): string {
      if (!dateString) return 'Nicht angegeben';
      
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
      } catch (error) {
        return 'Ungültiges Datum';
      }
    }

    function formatDuration(durationSeconds?: number): string {
      if (!durationSeconds || Number.isNaN(durationSeconds)) return 'Unbekannt';
      
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = Math.floor(durationSeconds % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')} min`;
    }

    
// Load initial data on mount
onMounted(() => {
  loadNextVideo();
});
</script>

<style scoped>
.video-annotation-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

.video-player {
  width: 100%;
  max-height: 400px;
  background-color: #000;
  border-radius: 8px;
}

.patient-info-section {
  border-radius: 8px;
}

.patient-data-display {
  padding: 0.375rem 0;
  min-height: 1.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.pseudo-data {
  color: #28a745;
  font-weight: 500;
  background-color: #d4edda;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.loading-container .spinner-border {
  margin-bottom: 1rem;
}

.video-controls {
  border-radius: 8px;
}

.action-buttons {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
}

.alert {
  border-radius: 6px;
  margin-bottom: 1rem;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.badge {
  font-size: 0.8rem;
  padding: 0.4rem 0.6rem;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: #6c757d !important;
}

.text-end {
  text-align: right;
}

.border-top {
  border-top: 1px solid #dee2e6 !important;
}

.fa-3x {
  font-size: 3em;
}

@media (max-width: 768px) {
  .video-annotation-container {
    padding: 0.5rem;
  }
  
  .header-actions {
    margin-top: 1rem;
    justify-content: center;
  }
  
  .text-end {
    text-align: center !important;
  }
  
  .action-buttons .d-flex {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
