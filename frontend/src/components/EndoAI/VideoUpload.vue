<template>
  <div class="video-upload-container">
    <div class="card">
      <div class="card-header text-center">
        <h4 class="mb-0">
          <i class="fas fa-cloud-upload-alt text-primary"></i>
          Video Upload
        </h4>
        <p class="text-muted mb-0">Laden Sie ein Video für die Annotation hoch</p>
      </div>
      <div class="card-body">
        <!-- Error/Success Messages -->
        <div v-if="error" class="alert alert-danger alert-dismissible">
          <strong>Fehler:</strong> {{ error }}
          <button type="button" class="btn-close" @click="error = ''"></button>
        </div>

        <div v-if="successMessage" class="alert alert-success alert-dismissible">
          <strong>Erfolg:</strong> {{ successMessage }}
          <button type="button" class="btn-close" @click="successMessage = ''"></button>
        </div>

        <!-- Upload Instructions -->
        <div class="upload-instructions mb-4">
          <div class="row">
            <div class="col-md-8 offset-md-2">
              <div class="text-center">
                <i class="fas fa-info-circle text-info mb-2"></i>
                <h6>Upload-Hinweise</h6>
                <ul class="list-unstyled text-muted">
                  <li><i class="fas fa-check text-success"></i> Unterstützte Formate: MP4</li>
                  <li><i class="fas fa-check text-success"></i> Maximale Dateigröße: 500 MB</li>
                  <li><i class="fas fa-check text-success"></i> Empfohlene Auflösung: 1920x1080</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- FilePond Upload Area -->
        <div class="upload-section">
          <FilePond
            ref="pond"
            name="video"
            label-idle="<i class='fas fa-cloud-upload-alt'></i><br>Video hier ablegen oder <span class='filepond--label-action'>durchsuchen</span>"
            :allow-multiple="false"
            :max-files="1"
            :server="serverConfig"
            :files="files"
            accepted-file-types="video/mp4"
            :allow-file-type-validation="true"
            :allow-file-size-validation="true"
            :max-file-size="'500MB'"
            :disabled="uploading"
            @init="handleFilePondInit"
            @addfile="onFileAdd"
            @processfile="onFileProcessed"
            @removefile="onFileRemove"
            @error="onUploadError"
          />
        </div>

        <!-- Upload Progress -->
        <div v-if="uploading" class="upload-progress mt-4">
          <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
              <span class="visually-hidden">Uploading...</span>
            </div>
            <span>Video wird hochgeladen... {{ uploadProgress }}%</span>
          </div>
          <div class="progress mt-2">
            <div 
              class="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              :style="{ width: uploadProgress + '%' }"
              :aria-valuenow="uploadProgress" 
              aria-valuemin="0" 
              aria-valuemax="100"
            >
            </div>
          </div>
        </div>

        <!-- Patient Information Form (appears after successful upload) -->
        <div v-if="uploadedVideoId && !uploading" class="patient-form mt-4">
          <div class="card border-success">
            <div class="card-header bg-light">
              <h5 class="mb-0">
                <i class="fas fa-user-md text-success"></i>
                Patienteninformationen eingeben
              </h5>
              <small class="text-muted">Video erfolgreich hochgeladen. Bitte geben Sie die Patientendaten ein.</small>
            </div>
            <div class="card-body">
              <form @submit.prevent="submitPatientData">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="patient_first_name" class="form-label">Vorname *</label>
                      <input 
                        v-model="patientData.patient_first_name"
                        type="text" 
                        class="form-control" 
                        id="patient_first_name"
                        required
                        :disabled="submitting"
                      />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="patient_last_name" class="form-label">Nachname *</label>
                      <input 
                        v-model="patientData.patient_last_name"
                        type="text" 
                        class="form-control" 
                        id="patient_last_name"
                        required
                        :disabled="submitting"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="patient_dob" class="form-label">Geburtsdatum *</label>
                      <input 
                        v-model="patientData.patient_dob"
                        type="date" 
                        class="form-control" 
                        id="patient_dob"
                        required
                        :disabled="submitting"
                      />
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="examination_date" class="form-label">Untersuchungsdatum *</label>
                      <input 
                        v-model="patientData.examination_date"
                        type="date" 
                        class="form-control" 
                        id="examination_date"
                        required
                        :disabled="submitting"
                        :class="{ 'is-invalid': !isExaminationDateValid }"
                      />
                      <div class="invalid-feedback" v-if="!isExaminationDateValid">
                        Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.
                      </div>
                    </div>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="patient_gender" class="form-label">Geschlecht</label>
                      <select 
                        v-model="patientData.patient_gender" 
                        class="form-select" 
                        id="patient_gender"
                        :disabled="submitting"
                      >
                        <option value="">Bitte wählen</option>
                        <option value="M">Männlich</option>
                        <option value="F">Weiblich</option>
                        <option value="D">Divers</option>
                        <option value="U">Unbekannt</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label for="casenumber" class="form-label">Fallnummer</label>
                      <input 
                        v-model="patientData.casenumber"
                        type="text" 
                        class="form-control" 
                        id="casenumber"
                        placeholder="Optional"
                        :disabled="submitting"
                      />
                    </div>
                  </div>
                </div>

                <div class="d-flex justify-content-between">
                  <button 
                    type="button" 
                    class="btn btn-secondary"
                    @click="cancelUpload"
                    :disabled="submitting"
                  >
                    <i class="fas fa-times"></i>
                    Abbrechen
                  </button>
                  <button 
                    type="submit" 
                    class="btn btn-primary"
                    :disabled="submitting || !isFormValid"
                  >
                    <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                    <i v-else class="fas fa-save"></i>
                    {{ submitting ? 'Speichere...' : 'Video mit Patientendaten speichern' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons mt-4" v-if="!uploadedVideoId">
          <div class="text-center">
            <button 
              class="btn btn-outline-secondary"
              @click="$emit('back-to-annotation')"
            >
              <i class="fas fa-arrow-left"></i>
              Zurück zur Annotation
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import vueFilePond from 'vue-filepond'
import { setOptions, registerPlugin } from 'filepond'
import axios from 'axios'

// Import FilePond plugins
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type'
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size'

// Import CSS
import 'filepond/dist/filepond.min.css'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'

// Register plugins
registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize
)

// Create FilePond component
const FilePond = vueFilePond(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize
)

// Interfaces
interface PatientData {
  patient_first_name: string
  patient_last_name: string
  patient_dob: string
  examination_date: string
  patient_gender: string
  casenumber: string
}

// Emits
const emit = defineEmits<{
  'video-uploaded': [videoId: number]
  'back-to-annotation': []
}>()

// Reactive state
const pond = ref<any>(null)
const files = ref<any[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadedVideoId = ref<number | null>(null)
const submitting = ref(false)
const error = ref('')
const successMessage = ref('')

// Patient data form
const patientData = ref<PatientData>({
  patient_first_name: '',
  patient_last_name: '',
  patient_dob: '',
  examination_date: '',
  patient_gender: '',
  casenumber: ''
})

// Computed properties
const isExaminationDateValid = computed(() => {
  if (!patientData.value.examination_date || !patientData.value.patient_dob) return true
  return new Date(patientData.value.examination_date) >= new Date(patientData.value.patient_dob)
})

const isFormValid = computed(() => {
  return patientData.value.patient_first_name.trim() !== '' &&
         patientData.value.patient_last_name.trim() !== '' &&
         patientData.value.patient_dob !== '' &&
         patientData.value.examination_date !== '' &&
         isExaminationDateValid.value
})

// FilePond server configuration
const serverConfig = {
  process: {
    url: '/api/video/upload/',
    method: 'POST',
    headers: {
      'X-CSRFToken': getCsrfToken()
    },
    onload: (response: string) => {
      try {
        const data = JSON.parse(response)
        uploadedVideoId.value = data.video_id
        successMessage.value = 'Video erfolgreich hochgeladen!'
        return data.video_id
      } catch (e) {
        console.error('Error parsing upload response:', e)
        return response
      }
    },
    onerror: (response: string) => {
      console.error('Upload error:', response)
      error.value = 'Fehler beim Hochladen des Videos'
      return response
    }
  },
  revert: {
    url: '/api/video/upload/',
    method: 'DELETE',
    headers: {
      'X-CSRFToken': getCsrfToken()
    }
  }
}

// Methods
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta ? meta.getAttribute('content') || '' : ''
}

function handleFilePondInit() {
  console.log('FilePond initialized')
}

function onFileAdd(error: any, file: any) {
  if (error) {
    console.error('File add error:', error)
    return
  }
  
  uploading.value = true
  uploadProgress.value = 0
  error.value = ''
  successMessage.value = ''
  uploadedVideoId.value = null
  
  console.log('File added:', file.filename)
}

function onFileProcessed(error: any, file: any) {
  if (error) {
    console.error('File process error:', error)
    uploading.value = false
    return
  }
  
  uploading.value = false
  uploadProgress.value = 100
  console.log('File processed successfully:', file.filename)
  
  // Set default examination date to today
  if (!patientData.value.examination_date) {
    patientData.value.examination_date = new Date().toISOString().split('T')[0]
  }
}

function onFileRemove(error: any, file: any) {
  if (error) {
    console.error('File remove error:', error)
    return
  }
  
  // Reset state when file is removed
  uploadedVideoId.value = null
  uploading.value = false
  uploadProgress.value = 0
  successMessage.value = ''
  
  // Clear patient data
  patientData.value = {
    patient_first_name: '',
    patient_last_name: '',
    patient_dob: '',
    examination_date: '',
    patient_gender: '',
    casenumber: ''
  }
  
  console.log('File removed:', file.filename)
}

function onUploadError(error: any) {
  console.error('Upload error:', error)
  uploading.value = false
  error.value = 'Fehler beim Hochladen des Videos: ' + (error.body || error.message || 'Unbekannter Fehler')
}

async function submitPatientData() {
  if (!uploadedVideoId.value || !isFormValid.value) return
  
  try {
    submitting.value = true
    error.value = ''
    
    const payload = {
      video_id: uploadedVideoId.value,
      ...patientData.value
    }
    
    const response = await axios.post('/api/video/set_patient_data/', payload)
    
    if (response.data.success) {
      successMessage.value = 'Video und Patientendaten erfolgreich gespeichert!'
      
      // Emit event to parent component
      emit('video-uploaded', uploadedVideoId.value)
      
      // Clear form after short delay
      setTimeout(() => {
        resetForm()
      }, 2000)
    }
    
  } catch (err: any) {
    console.error('Error submitting patient data:', err)
    error.value = err.response?.data?.error || err.message || 'Fehler beim Speichern der Patientendaten'
  } finally {
    submitting.value = false
  }
}

function cancelUpload() {
  // Remove file from FilePond
  if (pond.value) {
    pond.value.removeFile()
  }
  
  resetForm()
}

function resetForm() {
  uploadedVideoId.value = null
  uploading.value = false
  uploadProgress.value = 0
  submitting.value = false
  error.value = ''
  successMessage.value = ''
  
  patientData.value = {
    patient_first_name: '',
    patient_last_name: '',
    patient_dob: '',
    examination_date: '',
    patient_gender: '',
    casenumber: ''
  }
  
  files.value = []
}

// Initialize FilePond options on mount
onMounted(() => {
  setOptions({
    allowRevert: true,
    allowProcess: true,
    allowMultiple: false,
    maxFiles: 1,
    labelIdle: '<i class="fas fa-cloud-upload-alt"></i><br>Video hier ablegen oder <span class="filepond--label-action">durchsuchen</span>',
    labelFileProcessing: 'Hochladen...',
    labelFileProcessingComplete: 'Upload abgeschlossen',
    labelFileProcessingAborted: 'Upload abgebrochen',
    labelFileProcessingError: 'Fehler beim Upload',
    labelTapToCancel: 'Zum Abbrechen tippen',
    labelTapToRetry: 'Zum Wiederholen tippen',
    labelTapToUndo: 'Zum Rückgängigmachen tippen',
    labelButtonRemoveItem: 'Entfernen',
    labelButtonAbortItemLoad: 'Abbrechen',
    labelButtonRetryItemLoad: 'Wiederholen',
    labelButtonAbortItemProcessing: 'Abbrechen',
    labelButtonUndoItemProcessing: 'Rückgängig',
    labelButtonRetryItemProcessing: 'Wiederholen',
    labelButtonProcessItem: 'Hochladen'
  })
})
</script>

<style scoped>
.video-upload-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.upload-instructions {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
}

.upload-section {
  margin: 2rem 0;
}

.upload-progress {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e9ecef;
}

.patient-form {
  animation: slideIn 0.3s ease-in-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.alert {
  border-radius: 6px;
  margin-bottom: 1rem;
}

.action-buttons {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
}

/* FilePond custom styles */
:deep(.filepond--root) {
  margin-bottom: 0;
}

:deep(.filepond--drop-label) {
  color: #6c757d;
  padding: 3rem 1rem;
}

:deep(.filepond--label-action) {
  color: #0d6efd;
  text-decoration: underline;
}

:deep(.filepond--panel-root) {
  border-radius: 8px;
  border: 2px dashed #dee2e6;
  background-color: #f8f9fa;
}

:deep(.filepond--panel-root:hover) {
  border-color: #0d6efd;
  background-color: #e7f3ff;
}

:deep(.filepond--item) {
  margin-bottom: 0.5rem;
}

:deep(.filepond--file) {
  border-radius: 6px;
}

@media (max-width: 768px) {
  .video-upload-container {
    padding: 0.5rem;
  }
  
  .upload-instructions {
    padding: 1rem;
  }
  
  :deep(.filepond--drop-label) {
    padding: 2rem 0.5rem;
  }
}
</style>