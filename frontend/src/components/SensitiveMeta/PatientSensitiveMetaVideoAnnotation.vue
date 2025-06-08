<template>
    <div class="sensitive-meta-annotation">
      <!-- Header with Patient Info -->
      <div class="annotation-header">
        <h2 class="page-title">
          <i class="fas fa-user-shield"></i>
          Patientendaten Annotation
        </h2>
        <div class="patient-status" :class="{ 'verified': isVerified, 'pending': !isVerified }">
          <i :class="isVerified ? 'fas fa-check-circle' : 'fas fa-clock'"></i>
          {{ isVerified ? 'Verifiziert' : 'Unvollständig' }}
        </div>
      </div>
  
      <!-- Loading State -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Lade Patientendaten...</p>
      </div>
  
      <!-- Error State -->
      <div v-else-if="error" class="error-container">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Fehler beim Laden</h3>
        <p>{{ error }}</p>
        <button @click="() => fetchSensitiveMetaData()" class="btn btn-primary">
          <i class="fas fa-redo"></i>
          Erneut versuchen
        </button>
      </div>
  
      <!-- Main Content -->
      <div v-else-if="sensitiveMetaData" class="annotation-content">
        <!-- Patient Information Form -->
        <div class="form-section">
          <h3 class="section-title">
            <i class="fas fa-user"></i>
            Patienteninformationen
          </h3>
          
          <form @submit.prevent="saveSensitiveMetaData" class="patient-form">
            <div class="form-row">
              <div class="form-group">
                <label for="firstName" class="form-label required">
                  <i class="fas fa-user"></i>
                  Vorname
                </label>
                <input
                  id="firstName"
                  v-model="editableData.patient_first_name"
                  type="text"
                  class="form-input"
                  :class="{ 'error': validationErrors.patient_first_name }"
                  placeholder="Vorname eingeben"
                  required
                />
                <span v-if="validationErrors.patient_first_name" class="error-message">
                  {{ validationErrors.patient_first_name }}
                </span>
              </div>
  
              <div class="form-group">
                <label for="lastName" class="form-label required">
                  <i class="fas fa-user"></i>
                  Nachname
                </label>
                <input
                  id="lastName"
                  v-model="editableData.patient_last_name"
                  type="text"
                  class="form-input"
                  :class="{ 'error': validationErrors.patient_last_name }"
                  placeholder="Nachname eingeben"
                  required
                />
                <span v-if="validationErrors.patient_last_name" class="error-message">
                  {{ validationErrors.patient_last_name }}
                </span>
              </div>
            </div>
  
            <div class="form-row">
              <div class="form-group">
                <label for="dateOfBirth" class="form-label required">
                  <i class="fas fa-calendar-alt"></i>
                  Geburtsdatum
                </label>
                <input
                  id="dateOfBirth"
                  v-model="editableData.patient_dob"
                  type="date"
                  class="form-input"
                  :class="{ 'error': validationErrors.patient_dob }"
                  required
                />
                <span v-if="validationErrors.patient_dob" class="error-message">
                  {{ validationErrors.patient_dob }}
                </span>
              </div>
  
              <div class="form-group">
                <label for="examinationDate" class="form-label">
                  <i class="fas fa-calendar-check"></i>
                  Untersuchungsdatum
                </label>
                <input
                  id="examinationDate"
                  v-model="editableData.examination_date"
                  type="date"
                  class="form-input"
                  :class="{ 'error': validationErrors.examination_date }"
                />
                <span v-if="validationErrors.examination_date" class="error-message">
                  {{ validationErrors.examination_date }}
                </span>
              </div>
            </div>
  
            <!-- Additional Information (Read-only) -->
            <div class="info-section">
              <h4 class="subsection-title">
                <i class="fas fa-info-circle"></i>
                Zusätzliche Informationen
              </h4>
              
              <div class="info-grid">
                <div class="info-item">
                  <label class="info-label">Geschlecht:</label>
                  <span class="info-value">{{ sensitiveMetaData.patient_gender || 'Nicht angegeben' }}</span>
                </div>
                
                <div class="info-item">
                  <label class="info-label">Zentrum:</label>
                  <span class="info-value">{{ sensitiveMetaData.center || 'Nicht angegeben' }}</span>
                </div>
                
                <div class="info-item">
                  <label class="info-label">Untersucher:</label>
                  <span class="info-value">{{ formatExaminers(sensitiveMetaData.examiners) }}</span>
                </div>
                
                <div class="info-item">
                  <label class="info-label">Endoskop Typ:</label>
                  <span class="info-value">{{ sensitiveMetaData.endoscope_type || 'Nicht angegeben' }}</span>
                </div>
                
                <div class="info-item">
                  <label class="info-label">Endoskop S/N:</label>
                  <span class="info-value">{{ sensitiveMetaData.endoscope_sn || 'Nicht angegeben' }}</span>
                </div>
  
                <div class="info-item">
                  <label class="info-label">Patient Hash:</label>
                  <span class="info-value hash-value">{{ formatHash(sensitiveMetaData.patient_hash) }}</span>
                </div>
              </div>
            </div>
  
            <!-- Form Actions -->
            <div class="form-actions">
              <button
                type="button"
                @click="resetForm"
                class="btn btn-secondary"
                :disabled="saving"
              >
                <i class="fas fa-undo"></i>
                Zurücksetzen
              </button>
  
              <button
                type="button"
                @click="loadNextPatient"
                class="btn btn-info"
                :disabled="saving"
              >
                <i class="fas fa-forward"></i>
                Nächster Patient
              </button>
  
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="saving || !hasChanges"
              >
                <i v-if="saving" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-save"></i>
                {{ saving ? 'Speichere...' : 'Speichern' }}
              </button>
            </div>
          </form>
        </div>
  
        <!-- Associated Media Preview -->
        <div v-if="sensitiveMetaData.video_file" class="media-section">
          <h3 class="section-title">
            <i class="fas fa-video"></i>
            Zugehörige Medien
          </h3>
          
          <div class="media-preview">
            <div class="video-info">
              <p><strong>Video ID:</strong> {{ sensitiveMetaData.video_file.id }}</p>
              <p><strong>Dateiname:</strong> {{ sensitiveMetaData.video_file.original_file_name }}</p>
              <p><strong>Dauer:</strong> {{ formatDuration(sensitiveMetaData.video_file.duration) }}</p>
            </div>
            
            <video
              v-if="sensitiveMetaData.video_file.video_url"
              :src="sensitiveMetaData.video_file.video_url"
              controls
              class="video-preview"
              preload="metadata"
            >
              Ihr Browser unterstützt das Video-Element nicht.
            </video>
          </div>
        </div>
      </div>
  
      <!-- No Data State -->
      <div v-else class="no-data-container">
        <i class="fas fa-inbox"></i>
        <h3>Keine Daten verfügbar</h3>
        <p>Es wurden keine Patientendaten gefunden.</p>
        <button @click="() => fetchSensitiveMetaData()" class="btn btn-primary">
          <i class="fas fa-refresh"></i>
          Neu laden
        </button>
      </div>
  
      <!-- Success Message -->
      <div v-if="successMessage" class="success-banner">
        <i class="fas fa-check-circle"></i>
        {{ successMessage }}
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import axiosInstance, { r } from '@/api/axiosInstance'
  import { useSensitiveMetaStore } from '@/stores/sensitiveMetaStore'
  import SensitiveMetaService from '@/api/sensitiveMetaService'
  
  // --- Interfaces ---
  interface SensitiveMetaData {
    id: number
    patient_first_name: string
    patient_last_name: string
    patient_dob: string
    examination_date: string
    patient_gender?: string
    center?: string
    examiners?: string[]
    endoscope_type?: string
    endoscope_sn?: string
    patient_hash?: string
    examination_hash?: string
    video_file?: {
      id: number
      original_file_name: string
      duration: number
      video_url: string
    }
  }
  async function handleNextPatient(nextPatient: boolean = false) {
  // Your async logic here
  console.log('Handling next patient:', nextPatient)
}
function wrapClickHandler(nextPatient = false) {
  return async (event: MouseEvent) => {
    event.preventDefault()
    await handleNextPatient(nextPatient)
  }
}
  
  interface EditableData {
    patient_first_name: string
    patient_last_name: string
    patient_dob: string
    examination_date: string
  }
  
  interface ValidationErrors {
    patient_first_name?: string
    patient_last_name?: string
    patient_dob?: string
    examination_date?: string
  }
  
  // --- Props ---
  interface Props {
    patientId?: number
    autoFetch?: boolean
  }
  
  const props = withDefaults(defineProps<Props>(), {
    autoFetch: true
  })
  
  // --- Reactive State ---
  const store = useSensitiveMetaStore()
  
  // Use store state instead of local state
  const sensitiveMetaData = computed(() => store.currentMetaData)
  const loading = computed(() => store.loading)
  const saving = computed(() => store.saving)
  const error = computed(() => store.error)
  const successMessage = computed(() => store.successMessage)
  
  // Local state for form editing
  const editableData = ref<EditableData>({
    patient_first_name: '',
    patient_last_name: '',
    patient_dob: '',
    examination_date: ''
  })
  
  const validationErrors = ref<ValidationErrors>({})
  const mediaType = ref<'video' | 'pdf'>('video')
  
  // --- Computed Properties ---
  const isVerified = computed(() => {
    return sensitiveMetaData.value ? 
      SensitiveMetaService.isDataVerified(sensitiveMetaData.value) : 
      false
  })
  
  const hasChanges = computed(() => {
    if (!sensitiveMetaData.value) return false
    
    return (
      editableData.value.patient_first_name !== sensitiveMetaData.value.patient_first_name ||
      editableData.value.patient_last_name !== sensitiveMetaData.value.patient_last_name ||
      editableData.value.patient_dob !== sensitiveMetaData.value.patient_dob ||
      editableData.value.examination_date !== sensitiveMetaData.value.examination_date
    )
  })
  
  // --- Methods ---
  async function fetchSensitiveMetaData(nextPatient = false) {
    try {
      let options: any = {}
      
      if (props.patientId) {
        options.patientId = props.patientId
      } else if (nextPatient && store.lastFetchedId) {
        options.lastId = store.lastFetchedId
      }
      
      const data = await store.fetchSensitiveMetaData({
        ...options,
        mediaType: mediaType.value
      })
      
      if (data) {
        updateEditableData(data)
      }
    } catch (err) {
      console.error('Error in fetchSensitiveMetaData:', err)
    }
  }
  
  async function saveSensitiveMetaData() {
    if (!sensitiveMetaData.value) return
    
    // Validate form using the service
    const validation = SensitiveMetaService.validateSensitiveMetaData(editableData.value)
    if (!validation.isValid) {
      validationErrors.value = validation.errors
      return
    }
    
    try {
      const updateData = {
        sensitive_meta_id: sensitiveMetaData.value.id,
        ...editableData.value
      }
      
      await store.updateSensitiveMetaData(updateData, mediaType.value)
      
      // Update editable data with new values
      if (store.currentMetaData) {
        updateEditableData(store.currentMetaData)
      }
      
      validationErrors.value = {}
    } catch (err) {
      console.error('Error saving data:', err)
    }
  }
  
  function updateEditableData(data: any) {
    editableData.value = {
      patient_first_name: data.patient_first_name || '',
      patient_last_name: data.patient_last_name || '',
      patient_dob: data.patient_dob || '',
      examination_date: data.examination_date || ''
    }
  }
  
  function resetForm() {
    if (sensitiveMetaData.value) {
      updateEditableData(sensitiveMetaData.value)
      validationErrors.value = {}
    }
  }
  
  async function loadNextPatient() {
    await store.fetchNextPatient(mediaType.value)
    if (store.currentMetaData) {
      updateEditableData(store.currentMetaData)
    }
  }
  
  function validateForm(): boolean {
    const validation = SensitiveMetaService.validateSensitiveMetaData(editableData.value)
    validationErrors.value = validation.errors
    return validation.isValid
  }
  
  // --- Utility Functions use service methods ---
  function formatExaminers(examiners?: string[]): string {
    return SensitiveMetaService.formatExaminers(examiners)
  }
  
  function formatHash(hash?: string): string {
    return SensitiveMetaService.formatHash(hash)
  }
  
  function formatDuration(duration?: number): string {
    return SensitiveMetaService.formatDuration(duration)
  }
  
  // --- Watchers ---
  watch(() => props.patientId, (newId) => {
    if (newId) {
      fetchSensitiveMetaData()
    }
  })
  
  // --- Lifecycle ---
  onMounted(() => {
    if (props.autoFetch) {
      fetchSensitiveMetaData()
    }
  })
  
  // --- Expose for parent components ---
  defineExpose({
    fetchSensitiveMetaData,
    saveSensitiveMetaData,
    resetForm,
    loadNextPatient
  })
  </script>
  
  <style scoped>
  .sensitive-meta-annotation {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  /* Header */
  .annotation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e0e0e0;
  }
  
  .page-title {
    font-size: 28px;
    font-weight: 600;
    color: #333;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .page-title i {
    color: #3b82f6;
  }
  
  .patient-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 500;
    font-size: 14px;
  }
  
  .patient-status.verified {
    background-color: #dcfce7;
    color: #166534;
  }
  
  .patient-status.pending {
    background-color: #fef3c7;
    color: #92400e;
  }
  
  /* Loading and Error States */
  .loading-container,
  .error-container,
  .no-data-container {
    text-align: center;
    padding: 60px 20px;
  }
  
  .loading-container .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-container i,
  .no-data-container i {
    font-size: 48px;
    color: #ef4444;
    margin-bottom: 16px;
  }
  
  .no-data-container i {
    color: #6b7280;
  }
  
  /* Form Sections */
  .form-section {
    background: white;
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 24px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
  }
  
  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .section-title i {
    color: #3b82f6;
  }
  
  .subsection-title {
    font-size: 16px;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  /* Form Elements */
  .patient-form {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  
  @media (max-width: 768px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
  }
  
  .form-label {
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
  
  .form-label.required::after {
    content: '*';
    color: #ef4444;
    margin-left: 4px;
  }
  
  .form-input {
    padding: 12px 16px;
    border: 2px solid #d1d5db;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.2s ease;
    background: white;
  }
  
  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-input.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }
  
  .error-message {
    color: #ef4444;
    font-size: 12px;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  /* Info Section */
  .info-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .info-label {
    font-weight: 600;
    color: #6b7280;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .info-value {
    font-size: 14px;
    color: #374151;
    padding: 8px 12px;
    background: #f9fafb;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
  }
  
  .info-value.hash-value {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    background: #f3f4f6;
  }
  
  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .btn-secondary {
    background: #6b7280;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background: #4b5563;
  }
  
  .btn-info {
    background: #06b6d4;
    color: white;
  }
  
  .btn-info:hover:not(:disabled) {
    background: #0891b2;
  }
  
  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
  }
  
  @media (max-width: 768px) {
    .form-actions {
      flex-direction: column;
    }
  }
  
  /* Media Section */
  .media-section {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
  }
  
  .media-preview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
  }
  
  @media (max-width: 768px) {
    .media-preview {
      grid-template-columns: 1fr;
    }
  }
  
  .video-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .video-info p {
    margin: 0;
    color: #4b5563;
    font-size: 14px;
  }
  
  .video-preview {
    width: 100%;
    max-width: 400px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  /* Success Banner */
  .success-banner {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dcfce7;
    color: #166534;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  </style>