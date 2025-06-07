<template>
  <div class="report-viewer">
    <!-- Header mit Report-Info -->
    <div class="report-header mb-4">
      <div class="d-flex justify-content-between align-items-center">
        <h4>Report Viewer</h4>
        <div class="report-actions">
          <button 
            class="btn btn-primary btn-sm me-2"
            @click="loadReport"
            :disabled="loading"
          >
            <i class="bi bi-arrow-clockwise"></i>
            Neu laden
          </button>
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleEditMode"
            :disabled="!reportData"
          >
            <i class="bi bi-pencil"></i>
            {{ editMode ? 'Bearbeitung beenden' : 'Metadaten bearbeiten' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Lade...</span>
      </div>
      <p class="mt-2">Lade Report-Daten...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      <h6 class="alert-heading">Fehler beim Laden</h6>
      <p class="mb-0">{{ error }}</p>
      <button class="btn btn-outline-danger btn-sm mt-2" @click="loadReport">
        Erneut versuchen
      </button>
    </div>

    <!-- Report Content -->
    <div v-else-if="reportData" class="report-content">
      <div class="row">
        <!-- PDF Viewer -->
        <div class="col-lg-8">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">Report Dokument</h6>
              <small class="text-muted" v-if="reportData.secure_file_url">
                URL gültig bis: {{ formatDate(reportData.secure_file_url.expires_at) }}
              </small>
            </div>
            <div class="card-body p-0">
              <div v-if="reportData.secure_file_url && !isUrlExpired" class="pdf-container">
                <iframe
                  :src="reportData.secure_file_url.url + '#toolbar=1&navpanes=0&scrollbar=1'"
                  width="100%"
                  height="600px"
                  frameborder="0"
                  class="pdf-frame"
                >
                  <p class="p-3">
                    Ihr Browser unterstützt keine eingebetteten PDFs. 
                    <a :href="reportData.secure_file_url.url" target="_blank" rel="noopener noreferrer">
                      Datei in neuem Tab öffnen
                    </a>
                  </p>
                </iframe>
              </div>
              
              <div v-else-if="isUrlExpired" class="text-center py-5">
                <i class="bi bi-clock-history display-1 text-warning"></i>
                <h6 class="mt-3">URL abgelaufen</h6>
                <p class="text-muted">Die sichere URL ist abgelaufen. Bitte laden Sie den Report neu.</p>
                <button class="btn btn-primary" @click="loadReport">
                  Report neu laden
                </button>
              </div>
              
              <div v-else class="text-center py-5">
                <i class="bi bi-file-earmark-x display-1 text-muted"></i>
                <h6 class="mt-3">Keine Datei verfügbar</h6>
                <p class="text-muted">Für diesen Report ist keine Datei hinterlegt.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Metadata Sidebar -->
        <div class="col-lg-4">
          <!-- Report Status -->
          <div class="card mb-3">
            <div class="card-header">
              <h6 class="mb-0">Status</h6>
            </div>
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <span>Aktueller Status:</span>
                <span :class="`badge bg-${getStatusColor(reportData.status)}`">
                  {{ getStatusLabel(reportData.status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Patient Metadata -->
          <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h6 class="mb-0">Patientendaten</h6>
              <small v-if="editMode" class="text-warning">
                <i class="bi bi-pencil"></i> Bearbeitungsmodus
              </small>
            </div>
            <div class="card-body">
              <!-- Edit Mode -->
              <div v-if="editMode" class="edit-form">
                <div class="mb-3">
                  <label class="form-label">Vorname:</label>
                  <input 
                    v-model="editableMetadata.patient_first_name"
                    type="text" 
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.patient_first_name }"
                  >
                  <div v-if="validationErrors.patient_first_name" class="invalid-feedback">
                    {{ validationErrors.patient_first_name }}
                  </div>
                </div>
                
                <div class="mb-3">
                  <label class="form-label">Nachname:</label>
                  <input 
                    v-model="editableMetadata.patient_last_name"
                    type="text" 
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.patient_last_name }"
                  >
                  <div v-if="validationErrors.patient_last_name" class="invalid-feedback">
                    {{ validationErrors.patient_last_name }}
                  </div>
                </div>
                
                <div class="mb-3">
                  <label class="form-label">Geschlecht:</label>
                  <select 
                    v-model.number="editableMetadata.patient_gender"
                    class="form-select"
                  >
                    <option :value="1">Männlich</option>
                    <option :value="2">Weiblich</option>
                    <option :value="3">Divers</option>
                  </select>
                </div>
                
                <div class="mb-3">
                  <label class="form-label">Geburtsdatum:</label>
                  <input 
                    v-model="editableMetadata.patient_dob"
                    type="date" 
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.patient_dob }"
                  >
                  <div v-if="validationErrors.patient_dob" class="invalid-feedback">
                    {{ validationErrors.patient_dob }}
                  </div>
                </div>
                
                <div class="mb-3">
                  <label class="form-label">Untersuchungsdatum:</label>
                  <input 
                    v-model="editableMetadata.examination_date"
                    type="date" 
                    class="form-control"
                    :class="{ 'is-invalid': validationErrors.examination_date }"
                  >
                  <div v-if="validationErrors.examination_date" class="invalid-feedback">
                    {{ validationErrors.examination_date }}
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="d-flex gap-2">
                  <button 
                    class="btn btn-success btn-sm"
                    @click="saveMetadata"
                    :disabled="savingMetadata"
                  >
                    <i class="bi bi-check-lg"></i>
                    {{ savingMetadata ? 'Speichern...' : 'Speichern' }}
                  </button>
                  <button 
                    class="btn btn-secondary btn-sm"
                    @click="cancelEdit"
                  >
                    <i class="bi bi-x-lg"></i>
                    Abbrechen
                  </button>
                </div>
              </div>

              <!-- Display Mode -->
              <div v-else class="metadata-display">
                <div class="mb-2">
                  <small class="text-muted">Patient:</small>
                  <p class="mb-1">
                    {{ reportData.report_meta.patient_first_name }} 
                    {{ reportData.report_meta.patient_last_name }}
                  </p>
                </div>
                
                <div class="mb-2">
                  <small class="text-muted">Geschlecht:</small>
                  <p class="mb-1">{{ getGenderLabel(reportData.report_meta.patient_gender) }}</p>
                </div>
                
                <div class="mb-2">
                  <small class="text-muted">Geburtsdatum:</small>
                  <p class="mb-1">{{ formatDate(reportData.report_meta.patient_dob) }}</p>
                </div>
                
                <div class="mb-2">
                  <small class="text-muted">Untersuchungsdatum:</small>
                  <p class="mb-1">{{ formatDate(reportData.report_meta.examination_date) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Anonymized Text -->
          <div class="card mb-3">
            <div class="card-header">
              <h6 class="mb-0">Anonymisierter Text</h6>
            </div>
            <div class="card-body">
              <div v-if="editMode" class="edit-form">
                <textarea 
                  v-model="editableText"
                  class="form-control"
                  rows="10"
                  :class="{ 'is-invalid': validationErrors.anonymized_text }"
                ></textarea>
                <div v-if="validationErrors.anonymized_text" class="invalid-feedback">
                  {{ validationErrors.anonymized_text }}
                </div>
                <small class="form-text text-muted">
                  {{ editableText.length }} Zeichen
                </small>
              </div>
              <div v-else class="anonymized-text">
                <div class="text-content">
                  {{ reportData.anonymized_text }}
                </div>
                <small class="text-muted">
                  {{ reportData.anonymized_text.length }} Zeichen
                </small>
              </div>
            </div>
          </div>

          <!-- File Info -->
          <div v-if="reportData.secure_file_url" class="card">
            <div class="card-header">
              <h6 class="mb-0">Datei-Informationen</h6>
            </div>
            <div class="card-body">
              <div class="mb-2">
                <small class="text-muted">Dateiname:</small>
                <p class="mb-1">{{ reportData.secure_file_url.original_filename }}</p>
              </div>
              <div class="mb-2">
                <small class="text-muted">Dateigröße:</small>
                <p class="mb-1">{{ formatFileSize(reportData.secure_file_url.file_size) }}</p>
              </div>
              <div class="mb-2">
                <small class="text-muted">Dateityp:</small>
                <p class="mb-1">{{ reportData.file_type.toUpperCase() }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Report Selected -->
    <div v-else class="text-center py-5">
      <i class="bi bi-file-earmark-text display-1 text-muted"></i>
      <h6 class="mt-3">Kein Report ausgewählt</h6>
      <p class="text-muted">Bitte geben Sie eine Report-ID an.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axiosInstance from '@/api/axiosInstance'

// Props
interface Props {
  reportId?: number
}

const props = defineProps<Props>()

// Emit
const emit = defineEmits<{
  reportLoaded: [report: any]
  metadataUpdated: [metadata: any]
  error: [error: string]
}>()

// Reactive data
const loading = ref(false)
const error = ref('')
const reportData = ref<any>(null)
const editMode = ref(false)
const savingMetadata = ref(false)
const editableMetadata = ref<any>({})
const editableText = ref('')
const validationErrors = ref<Record<string, string>>({})

// Computed
const isUrlExpired = computed(() => {
  if (!reportData.value?.secure_file_url?.expires_at) return false
  return new Date() >= new Date(reportData.value.secure_file_url.expires_at)
})

// Watchers
watch(() => props.reportId, (newId) => {
  if (newId) {
    loadReport()
  } else {
    reportData.value = null
  }
}, { immediate: true })

// Methods
async function loadReport() {
  if (!props.reportId) return
  
  loading.value = true
  error.value = ''
  
  try {
    const response = await axiosInstance.get(`/api/reports/${props.reportId}/with-secure-url/`)
    reportData.value = response.data
    resetEditableData()
    emit('reportLoaded', response.data)
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Laden des Reports'
    emit('error', error.value)
  } finally {
    loading.value = false
  }
}

function toggleEditMode() {
  editMode.value = !editMode.value
  if (editMode.value) {
    resetEditableData()
  }
  validationErrors.value = {}
}

function resetEditableData() {
  if (reportData.value) {
    editableMetadata.value = { ...reportData.value.report_meta }
    editableText.value = reportData.value.anonymized_text
    
    // Convert dates to YYYY-MM-DD format for input[type="date"]
    if (editableMetadata.value.patient_dob) {
      editableMetadata.value.patient_dob = editableMetadata.value.patient_dob.split('T')[0]
    }
    if (editableMetadata.value.examination_date) {
      editableMetadata.value.examination_date = editableMetadata.value.examination_date.split('T')[0]
    }
  }
}

function validateMetadata(): boolean {
  validationErrors.value = {}
  
  if (!editableMetadata.value.patient_first_name?.trim()) {
    validationErrors.value.patient_first_name = 'Vorname ist erforderlich'
  }
  
  if (!editableMetadata.value.patient_last_name?.trim()) {
    validationErrors.value.patient_last_name = 'Nachname ist erforderlich'
  }
  
  if (!editableText.value?.trim()) {
    validationErrors.value.anonymized_text = 'Anonymisierter Text ist erforderlich'
  }
  
  if (editableText.value?.length > 10000) {
    validationErrors.value.anonymized_text = 'Text ist zu lang (max. 10.000 Zeichen)'
  }
  
  return Object.keys(validationErrors.value).length === 0
}

async function saveMetadata() {
  if (!validateMetadata()) return
  
  savingMetadata.value = true
  
  try {
    // Update metadata
    const metadataResponse = await axiosInstance.patch(
      `/api/pdf/sensitivemeta/update/`,
      {
        id: reportData.value.report_meta.id,
        ...editableMetadata.value
      }
    )
    
    // Update anonymized text
    const textResponse = await axiosInstance.patch(
      `/api/pdf/update_anony_text/`,
      {
        id: reportData.value.id,
        anonymized_text: editableText.value
      }
    )
    
    // Update local data
    reportData.value.report_meta = { ...reportData.value.report_meta, ...editableMetadata.value }
    reportData.value.anonymized_text = editableText.value
    
    editMode.value = false
    emit('metadataUpdated', reportData.value)
    
    // Show success message
    console.log('Metadaten erfolgreich gespeichert')
    
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Speichern der Metadaten'
    emit('error', error.value)
  } finally {
    savingMetadata.value = false
  }
}

function cancelEdit() {
  editMode.value = false
  resetEditableData()
  validationErrors.value = {}
}

// Utility functions
function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A'
  
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return dateString
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': return 'success'
    case 'rejected': return 'danger'
    case 'pending': return 'warning'
    default: return 'secondary'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved': return 'Genehmigt'
    case 'rejected': return 'Abgelehnt'
    case 'pending': return 'Ausstehend'
    default: return 'Unbekannt'
  }
}

function getGenderLabel(gender: number): string {
  switch (gender) {
    case 1: return 'Männlich'
    case 2: return 'Weiblich'
    case 3: return 'Divers'
    default: return 'Unbekannt'
  }
}

// Lifecycle
onMounted(() => {
  if (props.reportId) {
    loadReport()
  }
})
</script>

<style scoped>
.report-viewer {
  min-height: 100vh;
}

.pdf-frame {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}

.text-content {
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}

.edit-form textarea {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
}

.metadata-display p {
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.card {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.badge {
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .report-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .report-actions .btn {
    width: 100%;
  }
}
</style>