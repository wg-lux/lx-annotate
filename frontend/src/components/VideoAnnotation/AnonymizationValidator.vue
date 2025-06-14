<template>
  <div class="anonymization-validator">
    <!-- Header -->
    <div class="validator-header">
      <h3 class="validator-title">
        <i class="fas fa-shield-alt"></i>
        Anonymisierungs-Validierung
      </h3>
      <div class="status-badge" :class="statusClass">
        <i :class="statusIcon"></i>
        {{ statusText }}
      </div>
    </div>

    <!-- Error Messages -->
    <div v-if="error" class="alert alert-danger">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
    </div>

    <!-- Success Messages -->
    <div v-if="successMessage" class="alert alert-success">
      <i class="fas fa-check-circle"></i>
      {{ successMessage }}
    </div>

    <!-- Patientendaten-Vergleich -->
    <div class="patient-comparison">
      <div class="row">
        <!-- Echte Daten -->
        <div class="col-md-6">
          <div class="card real-data-card">
            <div class="card-header">
              <h5 class="card-title">
                <i class="fas fa-user text-danger"></i>
                Echte Patientendaten
              </h5>
              <span class="badge bg-danger">SENSITIV</span>
            </div>
            <div class="card-body">
              <div class="data-item">
                <label>Vorname:</label>
                <span class="sensitive-data">{{ patientData?.patient_first_name || 'Nicht verfügbar' }}</span>
              </div>
              <div class="data-item">
                <label>Nachname:</label>
                <span class="sensitive-data">{{ patientData?.patient_last_name || 'Nicht verfügbar' }}</span>
              </div>
              <div class="data-item">
                <label>Geburtsdatum:</label>
                <span class="sensitive-data">{{ formatDate(patientData?.patient_dob) }}</span>
              </div>
              <div class="data-item">
                <label>Untersuchungsdatum:</label>
                <span class="sensitive-data">{{ formatDate(patientData?.examination_date) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pseudonamen -->
        <div class="col-md-6">
          <div class="card pseudo-data-card">
            <div class="card-header">
              <h5 class="card-title">
                <i class="fas fa-user-secret text-success"></i>
                Temporäre Pseudonamen
              </h5>
              <span class="badge bg-success">ANONYM</span>
            </div>
            <div class="card-body">
              <div class="data-item">
                <label>Pseudonym Vorname:</label>
                <span class="pseudo-data">{{ patientData?.pseudonym_first_name || 'Wird generiert...' }}</span>
              </div>
              <div class="data-item">
                <label>Pseudonym Nachname:</label>
                <span class="pseudo-data">{{ patientData?.pseudonym_last_name || 'Wird generiert...' }}</span>
              </div>
              <div class="data-item">
                <label>Status:</label>
                <span class="text-info">Nur zur Validierung - nicht gespeichert</span>
              </div>
              <div class="data-item">
                <button 
                  class="btn btn-outline-primary btn-sm"
                  @click="generateNewPseudonyms"
                  :disabled="loading"
                >
                  <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
                  <i v-else class="fas fa-refresh"></i>
                  Neue Pseudonamen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Video-Frame-Analyse -->
    <div class="frame-analysis-section">
      <div class="card">
        <div class="card-header">
          <h5 class="card-title">
            <i class="fas fa-search"></i>
            Video-Frame Analyse
          </h5>
        </div>
        <div class="card-body">
          <div class="analysis-controls">
            <div class="row">
              <div class="col-md-4">
                <div class="form-group">
                  <label>Frame-Nummer:</label>
                  <input 
                    type="number" 
                    class="form-control" 
                    v-model="frameNumber"
                    :min="1"
                    :max="maxFrames"
                    placeholder="Auto (zufällig)"
                  >
                  <small class="text-muted">Leer lassen für automatische Auswahl</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="form-group">
                  <label>Prüfoptionen:</label>
                  <div class="form-check">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="checkNames" 
                      v-model="checkNames"
                    >
                    <label class="form-check-label" for="checkNames">
                      Namen prüfen
                    </label>
                  </div>
                  <div class="form-check">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="checkDates" 
                      v-model="checkDates"
                    >
                    <label class="form-check-label" for="checkDates">
                      Datumsangaben prüfen
                    </label>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="form-group">
                  <label>&nbsp;</label>
                  <div>
                    <button 
                      class="btn btn-primary"
                      @click="analyzeFrame"
                      :disabled="analyzing"
                    >
                      <span v-if="analyzing" class="spinner-border spinner-border-sm me-1"></span>
                      <i v-else class="fas fa-magnifying-glass"></i>
                      Frame analysieren
                    </button>
                  </div>
                  <div class="form-check mt-2">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="autoCrop" 
                      v-model="autoCrop"
                    >
                    <label class="form-check-label" for="autoCrop">
                      Auto-Cropping bei Problemen
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Analyse-Ergebnisse -->
          <div v-if="analysisResult" class="analysis-results mt-4">
            <div class="result-header">
              <h6>Analyse-Ergebnis:</h6>
              <span v-if="analysisResult.sensitive_data_found" class="badge bg-danger">
                <i class="fas fa-exclamation-triangle"></i>
                {{ analysisResult.issue_count }} Problem(e) gefunden
              </span>
              <span v-else class="badge bg-success">
                <i class="fas fa-check"></i>
                Keine sensitiven Daten gefunden
              </span>
            </div>

            <!-- Gefundene Probleme -->
            <div v-if="analysisResult.issues && analysisResult.issues.length > 0" class="issues-list">
              <h6 class="text-danger">Gefundene sensitive Daten:</h6>
              <div class="alert alert-warning" v-for="issue in analysisResult.issues" :key="issue.type">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>{{ getIssueTypeText(issue.type) }}:</strong> {{ issue.message }}
              </div>
            </div>

            <!-- Empfehlungen -->
            <div v-if="analysisResult.recommendations" class="recommendations">
              <h6>Empfehlungen:</h6>
              <div 
                v-for="rec in analysisResult.recommendations" 
                :key="rec.action"
                class="recommendation"
                :class="`priority-${rec.priority.toLowerCase()}`"
              >
                <i :class="getRecommendationIcon(rec.priority)"></i>
                {{ rec.message }}
              </div>
            </div>

            <!-- Cropping-Ergebnis -->
            <div v-if="analysisResult.crop_result" class="crop-result">
              <h6>Cropping-Ergebnis:</h6>
              <div 
                class="alert"
                :class="analysisResult.crop_result.status === 'success' ? 'alert-success' : 'alert-danger'"
              >
                <i :class="analysisResult.crop_result.status === 'success' ? 'fas fa-check' : 'fas fa-times'"></i>
                {{ analysisResult.crop_result.message || analysisResult.crop_result.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Aktions-Buttons -->
    <div class="action-buttons">
      <button 
        class="btn btn-success"
        @click="completeValidation"
        :disabled="!canCompleteValidation || processing"
        v-if="showCompleteButton"
      >
        <span v-if="processing" class="spinner-border spinner-border-sm me-1"></span>
        <i v-else class="fas fa-check-double"></i>
        Validierung abschließen
      </button>
      
      <button 
        class="btn btn-warning"
        @click="requiresCropping"
        v-if="analysisResult?.sensitive_data_found && !analysisResult?.crop_result"
      >
        <i class="fas fa-crop"></i>
        Video croppen erforderlich
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Props
interface Props {
  videoId: number
  patientData?: {
    patient_first_name?: string
    patient_last_name?: string
    patient_dob?: string
    examination_date?: string
    pseudonym_first_name?: string
    pseudonym_last_name?: string
    anonymization_status?: string
    requires_validation?: boolean
    sensitive_meta_id?: number
  }
  maxFrames?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxFrames: 1000
})

// Emits
const emit = defineEmits<{
  'validation-completed': []
  'cropping-required': []
  'patient-data-updated': [data: any]
}>()

// Reactive state
const loading = ref<boolean>(false)
const analyzing = ref<boolean>(false)
const processing = ref<boolean>(false)
const error = ref<string>('')
const successMessage = ref<string>('')

// Analysis controls
const frameNumber = ref<number | null>(null)
const checkNames = ref<boolean>(true)
const checkDates = ref<boolean>(true)
const autoCrop = ref<boolean>(false)

// Results
const analysisResult = ref<any>(null)

// Computed
const statusClass = computed(() => {
  const status = props.patientData?.anonymization_status
  switch (status) {
    case 'anonymized': return 'status-success'
    case 'validated_pending_anonymization': return 'status-warning'
    case 'pending_validation': return 'status-danger'
    default: return 'status-info'
  }
})

const statusIcon = computed(() => {
  const status = props.patientData?.anonymization_status
  switch (status) {
    case 'anonymized': return 'fas fa-check-circle'
    case 'validated_pending_anonymization': return 'fas fa-clock'
    case 'pending_validation': return 'fas fa-exclamation-triangle'
    default: return 'fas fa-question-circle'
  }
})

const statusText = computed(() => {
  const status = props.patientData?.anonymization_status
  switch (status) {
    case 'anonymized': return 'Anonymisiert'
    case 'validated_pending_anonymization': return 'Validiert - Anonymisierung ausstehend'
    case 'pending_validation': return 'Validierung erforderlich'
    case 'no_sensitive_data': return 'Keine sensitiven Daten'
    default: return 'Status unbekannt'
  }
})

const canCompleteValidation = computed(() => {
  return analysisResult.value && !analysisResult.value.sensitive_data_found
})

const showCompleteButton = computed(() => {
  return props.patientData?.requires_validation && analysisResult.value
})

// Methods
const generateNewPseudonyms = async (): Promise<void> => {
  if (!props.patientData?.sensitive_meta_id) {
    error.value = 'Keine SensitiveMeta-ID verfügbar'
    return
  }

  try {
    loading.value = true
    error.value = ''

    const response = await fetch('/api/generate-temporary-pseudonym/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sensitive_meta_id: props.patientData.sensitive_meta_id,
        regenerate: true
      })
    })

    if (!response.ok) {
      throw new Error('Fehler beim Generieren der Pseudonamen')
    }

    const data = await response.json()
    
    // Update patient data mit neuen Pseudonamen
    const updatedData = {
      ...props.patientData,
      pseudonym_first_name: data.pseudonym_first_name,
      pseudonym_last_name: data.pseudonym_last_name
    }
    
    emit('patient-data-updated', updatedData)
    successMessage.value = 'Neue temporäre Pseudonamen generiert!'
    
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)

  } catch (err: any) {
    error.value = err.message || 'Fehler beim Generieren der Pseudonamen'
  } finally {
    loading.value = false
  }
}

const analyzeFrame = async (): Promise<void> => {
  try {
    analyzing.value = true
    error.value = ''
    analysisResult.value = null

    const response = await fetch('/api/validate-video-anonymization/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_id: props.videoId,
        frame_number: frameNumber.value,
        check_names: checkNames.value,
        check_dates: checkDates.value,
        auto_crop: autoCrop.value
      })
    })

    if (!response.ok) {
      throw new Error('Fehler bei der Frame-Analyse')
    }

    const data = await response.json()
    analysisResult.value = data

    if (data.analysis?.sensitive_data_found) {
      error.value = `Sensitive Daten im Frame ${data.frame_number} gefunden!`
    } else {
      successMessage.value = `Frame ${data.frame_number} erfolgreich validiert - keine sensitiven Daten gefunden.`
      setTimeout(() => {
        successMessage.value = ''
      }, 5000)
    }

  } catch (err: any) {
    error.value = err.message || 'Fehler bei der Frame-Analyse'
  } finally {
    analyzing.value = false
  }
}

const completeValidation = async (): Promise<void> => {
  try {
    processing.value = true
    // Hier würde die Logik zur Validierung-Abschluss implementiert
    // z.B. SensitiveMeta als validiert markieren
    
    successMessage.value = 'Validierung erfolgreich abgeschlossen!'
    emit('validation-completed')
    
  } catch (err: any) {
    error.value = err.message || 'Fehler beim Abschließen der Validierung'
  } finally {
    processing.value = false
  }
}

const requiresCropping = (): void => {
  emit('cropping-required')
}

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'Nicht verfügbar'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE')
  } catch {
    return 'Ungültig'
  }
}

const getIssueTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'patient_first_name': 'Vorname',
    'patient_last_name': 'Nachname',
    'patient_dob': 'Geburtsdatum',
    'examination_date': 'Untersuchungsdatum'
  }
  return typeMap[type] || type
}

const getRecommendationIcon = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high': return 'fas fa-exclamation-triangle text-danger'
    case 'medium': return 'fas fa-exclamation-circle text-warning'
    case 'low': return 'fas fa-info-circle text-info'
    default: return 'fas fa-info-circle'
  }
}

// Lifecycle
onMounted(() => {
  // Auto-generate pseudonyms if not available
  if (props.patientData?.sensitive_meta_id && 
      (!props.patientData?.pseudonym_first_name || !props.patientData?.pseudonym_last_name)) {
    generateNewPseudonyms()
  }
})
</script>

<style scoped>
.anonymization-validator {
  max-width: 1200px;
  margin: 0 auto;
}

.validator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e9ecef;
}

.validator-title {
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.validator-title i {
  margin-right: 0.5rem;
  color: #3498db;
}

.status-badge {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
}

.status-success {
  background-color: #d4edda;
  color: #155724;
}

.status-warning {
  background-color: #fff3cd;
  color: #856404;
}

.status-danger {
  background-color: #f8d7da;
  color: #721c24;
}

.status-info {
  background-color: #d1ecf1;
  color: #0c5460;
}

.patient-comparison {
  margin-bottom: 2rem;
}

.real-data-card {
  border-left: 4px solid #dc3545;
}

.pseudo-data-card {
  border-left: 4px solid #28a745;
}

.card-title {
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.card-title i {
  margin-right: 0.5rem;
}

.data-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f8f9fa;
}

.data-item:last-child {
  border-bottom: none;
}

.data-item label {
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.sensitive-data {
  color: #dc3545;
  font-weight: 500;
  background-color: #f8d7da;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.pseudo-data {
  color: #28a745;
  font-weight: 500;
  background-color: #d4edda;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.frame-analysis-section {
  margin-bottom: 2rem;
}

.analysis-controls .form-group {
  margin-bottom: 1rem;
}

.analysis-results {
  border-top: 1px solid #e9ecef;
  padding-top: 1rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.issues-list {
  margin: 1rem 0;
}

.recommendations {
  margin: 1rem 0;
}

.recommendation {
  padding: 0.5rem;
  margin: 0.25rem 0;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.priority-high {
  border-left: 4px solid #dc3545;
}

.priority-medium {
  border-left: 4px solid #ffc107;
}

.priority-low {
  border-left: 4px solid #17a2b8;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e9ecef;
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

@media (max-width: 768px) {
  .validator-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>