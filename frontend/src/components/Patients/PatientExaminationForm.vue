<template>
  <div class="patient-examination-form">
    <!-- Patient Info Header -->
    <div class="patient-info-header">
      <div class="patient-badge">
        <i class="fas fa-user"></i>
        <span>Neue Untersuchung für Patient ID: {{ patientId }}</span>
      </div>
    </div>

    <form @submit.prevent="handleSubmit">
      <!-- Examination Type Selection -->
      <div class="form-section">
        <h4>
          <i class="fas fa-stethoscope"></i>
          Untersuchungsart
        </h4>
        
        <div class="form-group">
          <label for="examination-type" class="required">Untersuchungstyp:</label>
          <select 
            v-model="form.examination_id"
            id="examination-type"
            class="form-control"
            :class="{ 'is-invalid': errors.examination_id }"
            required
          >
            <option value="">Bitte wählen...</option>
            <option 
              v-for="examination in availableExaminations" 
              :key="examination.id" 
              :value="examination.id"
            >
              {{ examination.name_de || examination.name }}
            </option>
          </select>
          <div v-if="errors.examination_id" class="invalid-feedback">
            {{ errors.examination_id }}
          </div>
        </div>

        <div v-if="selectedExamination" class="examination-description">
          <p><strong>Beschreibung:</strong> {{ selectedExamination.description_de || selectedExamination.description || 'Keine Beschreibung verfügbar' }}</p>
        </div>
      </div>

      <!-- Date and Time -->
      <div class="form-section">
        <h4>
          <i class="fas fa-calendar"></i>
          Zeitraum
        </h4>
        
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label for="date-start" class="required">Startdatum:</label>
              <input 
                v-model="form.date_start"
                type="datetime-local"
                id="date-start"
                class="form-control"
                :class="{ 'is-invalid': errors.date_start }"
                required
              />
              <div v-if="errors.date_start" class="invalid-feedback">
                {{ errors.date_start }}
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="form-group">
              <label for="date-stop">Enddatum:</label>
              <input 
                v-model="form.date_stop"
                type="datetime-local"
                id="date-stop"
                class="form-control"
                :class="{ 'is-invalid': errors.date_stop }"
              />
              <div v-if="errors.date_stop" class="invalid-feedback">
                {{ errors.date_stop }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Optional Video and Report -->
      <div class="form-section">
        <h4>
          <i class="fas fa-paperclip"></i>
          Zusätzliche Informationen
        </h4>
        
        <div class="row">
          <div class="col-md-6">
            <div class="form-group">
              <label for="video-file">Video (optional):</label>
              <select 
                v-model="form.video_file_id"
                id="video-file"
                class="form-control"
              >
                <option value="">Kein Video</option>
                <option 
                  v-for="video in availableVideos" 
                  :key="video.id" 
                  :value="video.id"
                >
                  {{ video.filename || `Video ${video.id}` }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="form-group">
              <label for="report-file">Report (optional):</label>
              <select 
                v-model="form.report_file_id"
                id="report-file"
                class="form-control"
              >
                <option value="">Kein Report</option>
                <option 
                  v-for="report in availableReports" 
                  :key="report.id" 
                  :value="report.id"
                >
                  {{ report.title || `Report ${report.id}` }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="form-section">
        <div class="form-group">
          <label for="notes">Notizen:</label>
          <textarea 
            v-model="form.notes"
            id="notes"
            class="form-control"
            rows="4"
            placeholder="Zusätzliche Notizen zur Untersuchung..."
          />
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <!-- General Error Message -->
        <div v-if="errors.general" class="alert alert-danger w-100 mb-3">
          <strong>Fehler:</strong> {{ errors.general }}
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="loading || !isFormValid"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="fas fa-save me-2"></i>
          {{ loading ? 'Wird gespeichert...' : 'Untersuchung erstellen' }}
        </button>
        
        <button 
          type="button" 
          class="btn btn-secondary ms-2"
          @click="$emit('cancel')"
          :disabled="loading"
        >
          <i class="fas fa-times me-2"></i>
          Abbrechen
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useExaminationStore } from '@/stores/examinationStore'

// Props
interface Props {
  patientId: number
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'examination-created': [examination: any]
  'cancel': []
}>()

// Stores
const examinationStore = useExaminationStore()

// Reactive state
const loading = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref({
  patient_id: props.patientId,
  examination_id: '',
  date_start: new Date().toISOString().slice(0, 16), // Default to now
  date_stop: '',
  video_file_id: '',
  report_file_id: '',
  notes: ''
})

// Mock data for videos and reports (you'll need to implement these services)
const availableVideos = ref<any[]>([])
const availableReports = ref<any[]>([])

// Computed
const availableExaminations = computed(() => examinationStore.examinations)

const selectedExamination = computed(() => 
  availableExaminations.value.find(exam => exam.id === parseInt(form.value.examination_id))
)

const isFormValid = computed(() => {
  return form.value.examination_id !== '' && 
         form.value.date_start !== '' &&
         Object.keys(errors.value).length === 0
})

// Methods
const validateForm = () => {
  errors.value = {}
  
  // Required fields
  if (!form.value.examination_id) {
    errors.value.examination_id = 'Untersuchungstyp ist erforderlich'
  }
  
  if (!form.value.date_start) {
    errors.value.date_start = 'Startdatum ist erforderlich'
  }
  
  // Date validation
  if (form.value.date_start && form.value.date_stop) {
    const startDate = new Date(form.value.date_start)
    const endDate = new Date(form.value.date_stop)
    
    if (endDate <= startDate) {
      errors.value.date_stop = 'Enddatum muss nach dem Startdatum liegen'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  console.log('=== EXAMINATION FORM SUBMIT START ===')
  console.log('Form data:', form.value)
  
  // Check if patient ID is valid
  if (!props.patientId || props.patientId === 0) {
    errors.value.general = 'Patient-ID ist nicht verfügbar. Bitte laden Sie die Seite neu.'
    console.log('❌ Ungültige Patient-ID:', props.patientId)
    return
  }
  
  if (!validateForm()) {
    console.log('❌ Validierung fehlgeschlagen:', errors.value)
    return
  }
  
  try {
    loading.value = true
    errors.value = {}
    
    // Prepare data for submission
    const submissionData = {
      patient_id: props.patientId,
      examination_id: parseInt(form.value.examination_id),
      date_start: form.value.date_start,
      date_stop: form.value.date_stop || form.value.date_start, // Use start date if no end date
      video_file_id: form.value.video_file_id ? parseInt(form.value.video_file_id) : null,
      report_file_id: form.value.report_file_id ? parseInt(form.value.report_file_id) : null,
      notes: form.value.notes
    }
    
    console.log('📋 Sending examination data:', submissionData)
    
    // Make API call to create examination
    const response = await fetch('/api/examinations/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
      },
      body: JSON.stringify(submissionData)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Fehler beim Erstellen der Untersuchung')
    }
    
    const newExamination = await response.json()
    console.log('🎉 Untersuchung erfolgreich erstellt:', newExamination)
    
    // Reset form
    form.value = {
      patient_id: props.patientId,
      examination_id: '',
      date_start: new Date().toISOString().slice(0, 16),
      date_stop: '',
      video_file_id: '',
      report_file_id: '',
      notes: ''
    }
    
    // Emit success event
    emit('examination-created', newExamination)
    console.log('📤 Event examination-created ausgelöst')
    console.log('=== EXAMINATION FORM SUBMIT SUCCESS ===')
    
  } catch (error: any) {
    console.log('=== EXAMINATION FORM SUBMIT ERROR ===')
    console.error('❌ Error creating examination:', error)
    errors.value.general = error.message || 'Unbekannter Fehler beim Erstellen der Untersuchung'
  } finally {
    loading.value = false
    console.log('🏁 Loading beendet')
  }
}

// Helper function to get CSRF token
const getCsrfToken = (): string => {
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrftoken') {
      return value
    }
  }
  return ''
}

// Load data on mount
onMounted(async () => {
  // Load available examination types
  await examinationStore.loadExaminations()
  
  // TODO: Load available videos and reports for this patient
  // You'll need to implement these endpoints/services
  try {
    // const videosResponse = await fetch(`/api/patients/${props.patientId}/videos/`)
    // availableVideos.value = await videosResponse.json()
    
    // const reportsResponse = await fetch(`/api/patients/${props.patientId}/reports/`)
    // availableReports.value = await reportsResponse.json()
  } catch (error) {
    console.warn('Could not load videos/reports:', error)
  }
})
</script>

<style scoped>
.patient-examination-form {
  max-width: 800px;
}

.patient-info-header {
  background: #e9f7ef;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  padding: 10px 15px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.patient-badge {
  background: #c3e6cb;
  color: #155724;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.patient-badge i {
  font-size: 16px;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 1rem;
}

.form-section h4 {
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

.form-section h4 i {
  margin-right: 0.5rem;
  color: #3498db;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.5rem;
  display: block;
}

.form-group label.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control {
  border-radius: 6px;
  border: 1px solid #ced4da;
  padding: 0.75rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

.form-control.is-invalid {
  border-color: #dc3545;
}

.form-control.is-invalid:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

.invalid-feedback {
  display: block;
  width: 100%;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #dc3545;
}

.examination-description {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 1rem;
  margin-top: 0.5rem;
}

.form-actions {
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  border-radius: 6px;
  font-weight: 500;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3498db;
  border-color: #3498db;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  border-color: #2980b9;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
  border-color: #545b62;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .form-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>