<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header pb-0">
            <div class="d-flex align-items-center justify-content-between">
              <h4 class="mb-0">Report Details</h4>
              <div class="btn-group">
                <button 
                  class="btn btn-outline-secondary btn-sm"
                  @click="$router.go(-1)"
                >
                  <i class="material-icons">arrow_back</i> Zurück
                </button>
                <button 
                  class="btn btn-primary btn-sm"
                  @click="toggleEditMode"
                  :disabled="loading"
                >
                  <i class="material-icons">{{ editMode ? 'save' : 'edit' }}</i>
                  {{ editMode ? 'Speichern' : 'Bearbeiten' }}
                </button>
              </div>
            </div>
          </div>
          
          <div class="card-body">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2 text-muted">Report wird geladen...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="alert alert-danger" role="alert">
              <h6 class="alert-heading">Fehler beim Laden</h6>
              <p class="mb-0">{{ error }}</p>
            </div>

            <!-- Report Content -->
            <div v-else-if="reportData">
              <div class="row">
                <!-- Patientendaten Section -->
                <div class="col-lg-6">
                  <div class="card h-100">
                    <div class="card-header">
                      <h6 class="mb-0">Patientendaten</h6>
                    </div>
                    <div class="card-body">
                      <form @submit.prevent="saveChanges" v-if="editMode">
                        <div class="mb-3">
                          <label class="form-label">Vorname</label>
                          <input 
                            type="text" 
                            class="form-control"
                            v-model="editableData.patient_first_name"
                            :class="{ 'is-invalid': validationErrors.patient_first_name }"
                          >
                          <div v-if="validationErrors.patient_first_name" class="invalid-feedback">
                            {{ validationErrors.patient_first_name }}
                          </div>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Nachname</label>
                          <input 
                            type="text" 
                            class="form-control"
                            v-model="editableData.patient_last_name"
                            :class="{ 'is-invalid': validationErrors.patient_last_name }"
                          >
                          <div v-if="validationErrors.patient_last_name" class="invalid-feedback">
                            {{ validationErrors.patient_last_name }}
                          </div>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Geschlecht</label>
                          <select 
                            class="form-select"
                            v-model="editableData.patient_gender"
                            :class="{ 'is-invalid': validationErrors.patient_gender }"
                          >
                            <option value="0">Unbekannt</option>
                            <option value="1">Männlich</option>
                            <option value="2">Weiblich</option>
                            <option value="9">Divers</option>
                          </select>
                          <div v-if="validationErrors.patient_gender" class="invalid-feedback">
                            {{ validationErrors.patient_gender }}
                          </div>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Geburtsdatum</label>
                          <input 
                            type="date" 
                            class="form-control"
                            v-model="editableData.patient_dob"
                            :class="{ 'is-invalid': validationErrors.patient_dob }"
                          >
                          <div v-if="validationErrors.patient_dob" class="invalid-feedback">
                            {{ validationErrors.patient_dob }}
                          </div>
                        </div>
                        
                        <div class="mb-3">
                          <label class="form-label">Untersuchungsdatum</label>
                          <input 
                            type="date" 
                            class="form-control"
                            v-model="editableData.examination_date"
                            :class="{ 'is-invalid': validationErrors.examination_date }"
                          >
                          <div v-if="validationErrors.examination_date" class="invalid-feedback">
                            {{ validationErrors.examination_date }}
                          </div>
                        </div>
                      </form>
                      
                      <!-- Read-only view -->
                      <div v-else>
                        <div class="row mb-2">
                          <div class="col-sm-4"><strong>Vorname:</strong></div>
                          <div class="col-sm-8">{{ reportData.report_meta?.patient_first_name || 'Nicht verfügbar' }}</div>
                        </div>
                        <div class="row mb-2">
                          <div class="col-sm-4"><strong>Nachname:</strong></div>
                          <div class="col-sm-8">{{ reportData.report_meta?.patient_last_name || 'Nicht verfügbar' }}</div>
                        </div>
                        <div class="row mb-2">
                          <div class="col-sm-4"><strong>Geschlecht:</strong></div>
                          <div class="col-sm-8">{{ getGenderDisplay(reportData.report_meta?.patient_gender) }}</div>
                        </div>
                        <div class="row mb-2">
                          <div class="col-sm-4"><strong>Geburtsdatum:</strong></div>
                          <div class="col-sm-8">{{ formatDate(reportData.report_meta?.patient_dob) }}</div>
                        </div>
                        <div class="row mb-2">
                          <div class="col-sm-4"><strong>Untersuchungsdatum:</strong></div>
                          <div class="col-sm-8">{{ formatDate(reportData.report_meta?.examination_date) }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Report Info Section -->
                <div class="col-lg-6">
                  <div class="card h-100">
                    <div class="card-header">
                      <h6 class="mb-0">Report-Informationen</h6>
                    </div>
                    <div class="card-body">
                      <div class="row mb-2">
                        <div class="col-sm-4"><strong>Report ID:</strong></div>
                        <div class="col-sm-8">{{ reportData.id }}</div>
                      </div>
                      <div class="row mb-2">
                        <div class="col-sm-4"><strong>Status:</strong></div>
                        <div class="col-sm-8">
                          <span class="badge" :class="getStatusBadgeClass(reportData.status)">
                            {{ getStatusDisplay(reportData.status) }}
                          </span>
                        </div>
                      </div>
                      <div class="row mb-2">
                        <div class="col-sm-4"><strong>Dateityp:</strong></div>
                        <div class="col-sm-8">{{ reportData.file_type?.toUpperCase() || 'Unbekannt' }}</div>
                      </div>
                      <div class="row mb-2" v-if="reportData.secure_file_url">
                        <div class="col-sm-4"><strong>Dateigröße:</strong></div>
                        <div class="col-sm-8">{{ formatFileSize(reportData.secure_file_url.file_size) }}</div>
                      </div>
                      <div class="row mb-2" v-if="reportData.secure_file_url">
                        <div class="col-sm-4"><strong>Dateiname:</strong></div>
                        <div class="col-sm-8">{{ reportData.secure_file_url.original_filename }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Report Content Section -->
              <div class="row mt-4">
                <div class="col-12">
                  <div class="card">
                    <div class="card-header">
                      <h6 class="mb-0">Report-Inhalt</h6>
                    </div>
                    <div class="card-body">
                      <div v-if="editMode" class="mb-3">
                        <label class="form-label">Anonymisierter Text</label>
                        <textarea 
                          class="form-control"
                          rows="10"
                          v-model="editableData.anonymized_text"
                          :class="{ 'is-invalid': validationErrors.anonymized_text }"
                        ></textarea>
                        <div v-if="validationErrors.anonymized_text" class="invalid-feedback">
                          {{ validationErrors.anonymized_text }}
                        </div>
                      </div>
                      <div v-else class="anonymized-text-display">
                        <pre class="bg-light p-3 rounded">{{ reportData.anonymized_text }}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- File Preview Section -->
              <div class="row mt-4" v-if="reportData.secure_file_url">
                <div class="col-12">
                  <div class="card">
                    <div class="card-header">
                      <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">Datei-Vorschau</h6>
                        <a 
                          :href="reportData.secure_file_url.url" 
                          target="_blank" 
                          class="btn btn-outline-primary btn-sm"
                        >
                          <i class="material-icons">open_in_new</i> In neuem Tab öffnen
                        </a>
                      </div>
                    </div>
                    <div class="card-body">
                      <div v-if="reportData.file_type === 'pdf'" class="pdf-viewer">
                        <iframe 
                          :src="reportData.secure_file_url.url" 
                          width="100%" 
                          height="600px"
                          frameborder="0"
                          style="border-radius: 8px;"
                        >
                          <p>Ihr Browser unterstützt keine PDF-Anzeige. 
                            <a :href="reportData.secure_file_url.url" target="_blank">
                              Klicken Sie hier, um die PDF-Datei zu öffnen.
                            </a>
                          </p>
                        </iframe>
                      </div>
                      <div v-else class="text-center py-5 text-muted">
                        <i class="material-icons" style="font-size: 48px;">description</i>
                        <p class="mt-2">Vorschau für diesen Dateityp nicht verfügbar</p>
                        <a 
                          :href="reportData.secure_file_url.url" 
                          target="_blank" 
                          class="btn btn-primary"
                        >
                          Datei herunterladen
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="successMessage" class="position-fixed bottom-0 end-0 p-3" style="z-index: 1050;">
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        {{ successMessage }}
        <button type="button" class="btn-close" @click="successMessage = ''"></button>
      </div>
    </div>
    
    <div v-if="errorMessage" class="position-fixed bottom-0 end-0 p-3" style="z-index: 1050;">
      <div class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ errorMessage }}
        <button type="button" class="btn-close" @click="errorMessage = ''"></button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'

export default {
  name: 'ReportView',
  setup() {
    const route = useRoute()
    const reportId = computed(() => route.params.id)
    
    const loading = ref(true)
    const error = ref('')
    const reportData = ref(null)
    const editMode = ref(false)
    const successMessage = ref('')
    const errorMessage = ref('')
    const validationErrors = reactive({})
    
    const editableData = reactive({
      patient_first_name: '',
      patient_last_name: '',
      patient_gender: 0,
      patient_dob: '',
      examination_date: '',
      anonymized_text: ''
    })

    const loadReport = async () => {
      try {
        loading.value = true
        error.value = ''
        
        const response = await axiosInstance.get(r(`reports/${reportId.value}/with-secure-url/`))
        reportData.value = response.data
        
        // Populate editable data
        if (reportData.value.report_meta) {
          editableData.patient_first_name = reportData.value.report_meta.patient_first_name || ''
          editableData.patient_last_name = reportData.value.report_meta.patient_last_name || ''
          editableData.patient_gender = reportData.value.report_meta.patient_gender || 0
          editableData.patient_dob = formatDateForInput(reportData.value.report_meta.patient_dob)
          editableData.examination_date = formatDateForInput(reportData.value.report_meta.examination_date)
        }
        editableData.anonymized_text = reportData.value.anonymized_text || ''
        
      } catch (err) {
        console.error('Error loading report:', err)
        error.value = err.response?.data?.detail || err.message || 'Fehler beim Laden des Reports'
      } finally {
        loading.value = false
      }
    }

    const toggleEditMode = async () => {
      if (editMode.value) {
        // Save changes
        await saveChanges()
      } else {
        // Enter edit mode
        editMode.value = true
        // Clear validation errors
        Object.keys(validationErrors).forEach(key => {
          delete validationErrors[key]
        })
      }
    }

    const saveChanges = async () => {
      try {
        // Clear previous validation errors
        Object.keys(validationErrors).forEach(key => {
          delete validationErrors[key]
        })

        // Update report metadata
        const metaUpdateData = {
          patient_first_name: editableData.patient_first_name,
          patient_last_name: editableData.patient_last_name,
          patient_gender: parseInt(editableData.patient_gender),
          patient_dob: editableData.patient_dob,
          examination_date: editableData.examination_date
        }

        await axiosInstance.patch(
          r(`reports/${reportId.value}/update-meta/`), 
          metaUpdateData
        )

        // Update anonymized text
        await axiosInstance.patch(
          r(`reports/${reportId.value}/update-text/`), 
          { anonymized_text: editableData.anonymized_text }
        )

        successMessage.value = 'Änderungen wurden erfolgreich gespeichert!'
        editMode.value = false
        
        // Reload data to show updated values
        await loadReport()
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          successMessage.value = ''
        }, 5000)

      } catch (err) {
        console.error('Error saving changes:', err)
        
        if (err.response?.data) {
          // Handle validation errors
          const errorData = err.response.data
          if (typeof errorData === 'object') {
            Object.keys(errorData).forEach(key => {
              if (Array.isArray(errorData[key])) {
                validationErrors[key] = errorData[key][0]
              } else {
                validationErrors[key] = errorData[key]
              }
            })
          }
        }
        
        errorMessage.value = 'Fehler beim Speichern der Änderungen'
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          errorMessage.value = ''
        }, 5000)
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'Nicht verfügbar'
      try {
        return new Date(dateString).toLocaleDateString('de-DE')
      } catch {
        return 'Ungültiges Datum'
      }
    }

    const formatDateForInput = (dateString) => {
      if (!dateString) return ''
      try {
        const date = new Date(dateString)
        return date.toISOString().split('T')[0]
      } catch {
        return ''
      }
    }

    const formatFileSize = (bytes) => {
      if (!bytes) return 'Unbekannt'
      if (bytes === 0) return '0 Bytes'
      
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getGenderDisplay = (gender) => {
      const genderMap = {
        0: 'Unbekannt',
        1: 'Männlich',
        2: 'Weiblich',
        9: 'Divers'
      }
      return genderMap[gender] || 'Unbekannt'
    }

    const getStatusDisplay = (status) => {
      const statusMap = {
        'pending': 'Ausstehend',
        'processing': 'In Bearbeitung',
        'completed': 'Abgeschlossen',
        'error': 'Fehler'
      }
      return statusMap[status] || status
    }

    const getStatusBadgeClass = (status) => {
      const classMap = {
        'pending': 'bg-warning',
        'processing': 'bg-info',
        'completed': 'bg-success',
        'error': 'bg-danger'
      }
      return classMap[status] || 'bg-secondary'
    }

    onMounted(() => {
      loadReport()
    })

    return {
      loading,
      error,
      reportData,
      editMode,
      editableData,
      validationErrors,
      successMessage,
      errorMessage,
      toggleEditMode,
      saveChanges,
      formatDate,
      formatFileSize,
      getGenderDisplay,
      getStatusDisplay,
      getStatusBadgeClass
    }
  }
}
</script>

<style scoped>
.anonymized-text-display pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}

.pdf-viewer iframe {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
  border: none;
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.btn-group .btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.alert {
  border: none;
  border-radius: 8px;
}

.form-control:focus,
.form-select:focus {
  border-color: #5e72e4;
  box-shadow: 0 0 0 0.2rem rgba(94, 114, 228, 0.25);
}

.spinner-border {
  width: 3rem;
  height: 3rem;
}
</style>