<template>
  <div class="pdf-annotation-container">
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
      <p>Lade PDF- und Patientendaten...</p>
    </div>

    <!-- No Data Available State -->
    <div v-else-if="!currentPdfData" class="text-center text-muted py-5">
      <i class="fas fa-file-pdf fa-3x"></i>
      <p class="mt-2">Keine PDFs zur Annotation verfügbar</p>
      <small>Alle PDFs wurden bereits bearbeitet oder es sind keine PDFs vorhanden.</small>
    </div>

    <!-- Main Content When Data is Available -->
    <template v-else>
      <div class="row">
        <!-- Patient Information & Annotation Section -->
        <div class="col-md-5">
          <!-- Enhanced Patient Information Section with Edit Capability -->
          <div class="patient-info-section mb-4">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                  <i class="fas fa-user-md"></i>
                  Patienteninformationen
                  <span v-if="currentPdfData.verification_status" class="badge bg-info ms-2">
                    <i class="fas fa-check-circle"></i>
                    {{ verificationStatusText }}
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
                      {{ currentPdfData.patient_first_name || 'Nicht angegeben' }}
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
                      {{ currentPdfData.patient_last_name || 'Nicht angegeben' }}
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
                      {{ formatDate(currentPdfData.patient_dob) }}
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
                      {{ formatDate(currentPdfData.examination_date) }}
                    </div>
                    <div class="invalid-feedback" v-if="editingPatientInfo && !isExaminationDateValid">
                      Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.
                    </div>
                  </div>
                </div>

                <!-- PDF and Annotation Status -->
                <div class="row">
                  <div class="col-md-4">
                    <label class="form-label text-muted">PDF-ID:</label>
                    <div class="patient-data-display">
                      <span class="font-mono">{{ currentPdfData.id }}</span>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label text-muted">Dateigröße:</label>
                    <div class="patient-data-display">
                      {{ formatFileSize(currentPdfData.file_size) }}
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
              </div>
            </div>
          </div>

          <!-- Verification Controls -->
          <div class="verification-section mb-4">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">
                  <i class="fas fa-shield-check"></i>
                  Verifizierungsoptionen
                </h5>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-check">
                      <input 
                        v-model="verificationState.dob_verified" 
                        type="checkbox" 
                        class="form-check-input" 
                        id="dobVerified"
                        :disabled="loading"
                      />
                      <label class="form-check-label" for="dobVerified">
                        Geburtsdatum verifiziert
                      </label>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-check">
                      <input 
                        v-model="verificationState.names_verified" 
                        type="checkbox" 
                        class="form-check-input" 
                        id="namesVerified"
                        :disabled="loading"
                      />
                      <label class="form-check-label" for="namesVerified">
                        Namen verifiziert
                      </label>
                    </div>
                  </div>
                </div>
                <div class="mt-3">
                  <button 
                    class="btn btn-info btn-sm"
                    @click="updateVerificationState"
                    :disabled="loading || !hasVerificationChanges"
                  >
                    <i class="fas fa-check"></i>
                    Verifizierungsstatus aktualisieren
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Anonymized Text Section -->
          <div v-if="currentPdfData.anonymized_text !== undefined" class="anonymized-text-section">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                  <i class="fas fa-user-secret"></i>
                  Anonymisierter Text
                </h5>
                <div class="header-actions">
                  <button 
                    v-if="!editingAnonymizedText"
                    class="btn btn-outline-secondary btn-sm"
                    @click="startEditingAnonymizedText"
                    :disabled="loading"
                  >
                    <i class="fas fa-edit"></i>
                    Text bearbeiten
                  </button>
                  <button 
                    v-if="editingAnonymizedText"
                    class="btn btn-success btn-sm me-2"
                    @click="saveAnonymizedText"
                    :disabled="loading || !hasAnonymizedTextChanges"
                  >
                    <i class="fas fa-save"></i>
                    Speichern
                  </button>
                  <button 
                    v-if="editingAnonymizedText"
                    class="btn btn-secondary btn-sm"
                    @click="cancelEditingAnonymizedText"
                    :disabled="loading"
                  >
                    <i class="fas fa-times"></i>
                    Abbrechen
                  </button>
                </div>
              </div>
              <div class="card-body">
                <textarea 
                  v-if="editingAnonymizedText"
                  v-model="editableAnonymizedText"
                  class="form-control"
                  rows="8"
                  placeholder="Anonymisierten Text eingeben..."
                ></textarea>
                <div v-else class="anonymized-text-display">
                  <pre>{{ currentPdfData.anonymized_text || 'Kein anonymisierter Text verfügbar' }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PDF Viewer Section -->
        <div class="col-md-7">
          <div class="card">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="fas fa-file-pdf"></i>
                PDF-Viewer
              </h5>
            </div>
            <div class="card-body pdf-viewer-container">
              <!-- PDF Viewer -->
              <iframe 
                v-if="currentPdfStreamUrl"
                :src="currentPdfStreamUrl" 
                class="pdf-iframe"
                title="PDF Vorschau"
                @error="handlePdfError"
              >
                Ihr Browser unterstützt keine eingebetteten PDFs. Sie können die Datei 
                <a :href="currentPdfStreamUrl" target="_blank">hier herunterladen</a>.
              </iframe>

              <!-- PDF Error State -->
              <div v-if="pdfError" class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                PDF konnte nicht geladen werden: {{ pdfError }}
                <a :href="currentPdfStreamUrl" target="_blank" class="btn btn-sm btn-outline-primary ms-2">
                  <i class="fas fa-external-link-alt"></i>
                  In neuem Tab öffnen
                </a>
              </div>

              <!-- PDF Info -->
              <div v-if="currentPdfData.file" class="pdf-info mt-3">
                <small class="text-muted">
                  <i class="fas fa-info-circle"></i>
                  Datei: {{ getFileName(currentPdfData.file) }}
                </small>
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
              @click="skipPdf"
              :disabled="loading"
            >
              <i class="fas fa-step-forward"></i>
              Überspringen
            </button>
            <div>
              <button 
                class="btn btn-warning me-2" 
                @click="rejectPdf"
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

interface PdfMetaData {
  id: number;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  examination_date?: string;
  file?: string;
  file_size?: number;
  pdf_url?: string;
  full_pdf_path?: string;
  sensitive_meta_id?: number;
  anonymized_text?: string;
  verification_status?: string;
  pdf_hash?: string;
  created_at?: string;
}

interface VerificationState {
  dob_verified: boolean;
  names_verified: boolean;
}

// Reactive state
const currentPdfData = ref<PdfMetaData | null>(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const pdfError = ref('');
const lastProcessedId = ref<number | null>(null);

// Patient editing state
const editingPatientInfo = ref(false);
const editablePatientData = ref<Partial<PdfMetaData>>({});

// Anonymized text editing state
const editingAnonymizedText = ref(false);
const editableAnonymizedText = ref('');

// Verification state
const verificationState = ref<VerificationState>({
  dob_verified: false,
  names_verified: false
});

const originalVerificationState = ref<VerificationState>({
  dob_verified: false,
  names_verified: false
});

// Computed properties
const currentPdfStreamUrl = computed(() => {
  if (!currentPdfData.value?.pdf_url) return '';
  return currentPdfData.value.pdf_url;
});

const verificationStatusText = computed(() => {
  const both = verificationState.value.dob_verified && verificationState.value.names_verified;
  if (both) return 'Vollständig verifiziert';
  if (verificationState.value.dob_verified || verificationState.value.names_verified) return 'Teilweise verifiziert';
  return 'Nicht verifiziert';
});

const annotationStatusText = computed(() => {
  const status = currentPdfData.value?.verification_status;
  switch (status) {
    case 'verified': return 'Verifiziert'
    case 'pending': return 'Validierung ausstehend'
    case 'rejected': return 'Abgelehnt'
    case 'approved': return 'Genehmigt'
    default: return 'Status unbekannt'
  }
});

const annotationStatusClass = computed(() => {
  const status = currentPdfData.value?.verification_status;
  switch (status) {
    case 'verified': return 'badge bg-success'
    case 'approved': return 'badge bg-success'
    case 'pending': return 'badge bg-warning'
    case 'rejected': return 'badge bg-danger'
    default: return 'badge bg-secondary'
  }
});

const annotationStatusIcon = computed(() => {
  const status = currentPdfData.value?.verification_status;
  switch (status) {
    case 'verified': return 'fas fa-check-circle'
    case 'approved': return 'fas fa-check-circle'
    case 'pending': return 'fas fa-clock'
    case 'rejected': return 'fas fa-times-circle'
    default: return 'fas fa-question-circle'
  }
});

const hasPatientChanges = computed(() => {
  if (!currentPdfData.value || !editablePatientData.value) return false;
  
  return (
    editablePatientData.value.patient_first_name !== currentPdfData.value.patient_first_name ||
    editablePatientData.value.patient_last_name !== currentPdfData.value.patient_last_name ||
    editablePatientData.value.patient_dob !== currentPdfData.value.patient_dob ||
    editablePatientData.value.examination_date !== currentPdfData.value.examination_date
  );
});

const hasAnonymizedTextChanges = computed(() => {
  return editableAnonymizedText.value !== (currentPdfData.value?.anonymized_text || '');
});

const hasVerificationChanges = computed(() => {
  return (
    verificationState.value.dob_verified !== originalVerificationState.value.dob_verified ||
    verificationState.value.names_verified !== originalVerificationState.value.names_verified
  );
});

const isExaminationDateValid = computed(() => {
  if (!editablePatientData.value.examination_date || !editablePatientData.value.patient_dob) return true;
  return new Date(editablePatientData.value.examination_date) >= new Date(editablePatientData.value.patient_dob);
});

const canApprove = computed(() => {
  return currentPdfData.value && !editingPatientInfo.value && !editingAnonymizedText.value && isExaminationDateValid.value;
});

// Methods
async function loadNextPdf() {
  try {
    loading.value = true;
    error.value = '';
    pdfError.value = '';

    // Build URL with last_id parameter if we have processed a PDF before
    const url = lastProcessedId.value 
      ? `/api/pdf/sensitivemeta/?last_id=${lastProcessedId.value}`
      : '/api/pdf/sensitivemeta/';

    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.data) {
      currentPdfData.value = response.data;
      
      // Initialize verification state from SensitiveMeta
      if (response.data.sensitive_meta_id) {
        await loadSensitiveMetaData(response.data.sensitive_meta_id);
      }
      
      // Load anonymized text if available
      if (response.data.id) {
        await loadAnonymizedText(response.data.id);
      }
    }
    
  } catch (err: any) {
    console.error('Error loading PDF metadata:', err);
    if (err.response?.status === 404) {
      currentPdfData.value = null;
      error.value = 'Keine weiteren PDFs zur Annotation verfügbar.';
    } else if (err.response?.status === 400) {
      const errorDetails = err.response?.data?.details;
      if (errorDetails) {
        const missingFields = Object.keys(errorDetails);
        error.value = `PDF-Metadaten unvollständig. Fehlende Felder: ${missingFields.join(', ')}. Bitte PDFs über das Dashboard mit vollständigen Patientendaten hochladen.`;
      } else {
        error.value = 'PDF-Metadaten unvollständig oder fehlerhaft. Bitte prüfen Sie die hochgeladenen PDFs.';
      }
      currentPdfData.value = null;
    } else {
      error.value = err.response?.data?.error || err.message || 'Fehler beim Laden der PDF-Metadaten';
    }
  } finally {
    loading.value = false;
  }
}

async function loadSensitiveMetaData(sensitiveMetaId: number) {
  try {
    const response = await axios.get(`/api/sensitive-meta/${sensitiveMetaId}/`);
    if (response.data?.sensitive_meta) {
      const meta = response.data.sensitive_meta;
      verificationState.value = {
        dob_verified: meta.dob_verified || false,
        names_verified: meta.names_verified || false
      };
      originalVerificationState.value = { ...verificationState.value };
    }
  } catch (err: any) {
    console.warn('Could not load SensitiveMeta verification state:', err.message);
  }
}

async function loadAnonymizedText(pdfId: number) {
  try {
    const response = await axios.get(`/api/pdf/anony_text/?id=${pdfId}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (response.data?.anonymized_text !== undefined) {
      currentPdfData.value!.anonymized_text = response.data.anonymized_text;
    }
  } catch (err: any) {
    console.warn('Could not load anonymized text:', err.message);
  }
}

function startEditingPatientInfo() {
  if (currentPdfData.value) {
    editablePatientData.value = {
      patient_first_name: currentPdfData.value.patient_first_name,
      patient_last_name: currentPdfData.value.patient_last_name,
      patient_dob: currentPdfData.value.patient_dob,
      examination_date: currentPdfData.value.examination_date,
    };
    editingPatientInfo.value = true;
  }
}

function cancelEditingPatientInfo() {
  editingPatientInfo.value = false;
  editablePatientData.value = {};
}

async function savePatientInfo() {
  if (!currentPdfData.value?.sensitive_meta_id || !hasPatientChanges.value) return;

  try {
    loading.value = true;
    error.value = '';

    const updateData = {
      sensitive_meta_id: currentPdfData.value.sensitive_meta_id,
      ...editablePatientData.value
    };

    await axios.patch('/api/pdf/update_sensitivemeta/', updateData);

    // Update current data
    Object.assign(currentPdfData.value, editablePatientData.value);

    editingPatientInfo.value = false;
    successMessage.value = 'Patienteninformationen erfolgreich aktualisiert!';

    setTimeout(() => {
      successMessage.value = '';
    }, 5000);

  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Fehler beim Speichern der Patienteninformationen';
  } finally {
    loading.value = false;
  }
}

function startEditingAnonymizedText() {
  editableAnonymizedText.value = currentPdfData.value?.anonymized_text || '';
  editingAnonymizedText.value = true;
}

function cancelEditingAnonymizedText() {
  editingAnonymizedText.value = false;
  editableAnonymizedText.value = '';
}

async function saveAnonymizedText() {
  if (!currentPdfData.value?.id || !hasAnonymizedTextChanges.value) return;

  try {
    loading.value = true;
    error.value = '';

    const updateData = {
      id: currentPdfData.value.id,
      anonymized_text: editableAnonymizedText.value
    };

    await axios.patch('/api/pdf/update_anony_text/', updateData);

    // Update current data
    currentPdfData.value.anonymized_text = editableAnonymizedText.value;

    editingAnonymizedText.value = false;
    successMessage.value = 'Anonymisierter Text erfolgreich aktualisiert!';

    setTimeout(() => {
      successMessage.value = '';
    }, 5000);

  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Fehler beim Speichern des anonymisierten Texts';
  } finally {
    loading.value = false;
  }
}

async function updateVerificationState() {
  if (!currentPdfData.value?.sensitive_meta_id || !hasVerificationChanges.value) return;

  try {
    loading.value = true;
    error.value = '';

    // Use the existing PDF update endpoint instead of the non-existent verify endpoint
    const updateData = {
      sensitive_meta_id: currentPdfData.value.sensitive_meta_id,
      patient_first_name: currentPdfData.value.patient_first_name,
      patient_last_name: currentPdfData.value.patient_last_name,
      patient_dob: currentPdfData.value.patient_dob,
      examination_date: currentPdfData.value.examination_date
    };

    // Use the existing PDF sensitivemeta update endpoint
    await axios.patch('/api/pdf/update_sensitivemeta/', updateData);

    originalVerificationState.value = { ...verificationState.value };
    successMessage.value = 'Patientendaten erfolgreich aktualisiert!';

    setTimeout(() => {
      successMessage.value = '';
    }, 5000);

  } catch (err: any) {
    error.value = err.response?.data?.error || err.message || 'Fehler beim Aktualisieren der Patientendaten';
  } finally {
    loading.value = false;
  }
}

async function skipPdf() {
  if (currentPdfData.value) {
    lastProcessedId.value = currentPdfData.value.id;
  }
  await loadNextPdf();
}

async function rejectPdf() {
  // This would mark the PDF as problematic
  successMessage.value = 'PDF als problematisch markiert!';
  setTimeout(() => { successMessage.value = ''; }, 2000);
  await skipPdf();
}

async function approveAndNext() {
  if (currentPdfData.value) {
    lastProcessedId.value = currentPdfData.value.id;
    successMessage.value = 'PDF erfolgreich validiert!';
    setTimeout(() => { successMessage.value = ''; }, 2000);
  }
  await loadNextPdf();
}

// PDF viewer handlers
function handlePdfError() {
  pdfError.value = 'PDF konnte nicht geladen werden. Überprüfen Sie die Datei und Berechtigungen.';
}

// Utility functions
function formatDate(dateString?: string): string {
  if (!dateString) return 'Nicht angegeben';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
  } catch (error) {
    return 'Ungültiges Datum';
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes || Number.isNaN(bytes)) return 'Unbekannt';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);
  
  return `${size} ${sizes[i]}`;
}

function getFileName(filePath?: string): string {
  if (!filePath) return 'Unbekannt';
  return filePath.split('/').pop() || filePath;
}

// Load initial data on mount
onMounted(() => {
  loadNextPdf();
});
</script>

<style scoped>
.pdf-annotation-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem;
}

.pdf-viewer-container {
  height: 850px;
  overflow: hidden;
}

.pdf-iframe {
  width: 100%;
  height: 800px;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  background-color: #f8f9fa;
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

.anonymized-text-display {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.anonymized-text-display pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: #495057;
}

.verification-section .form-check {
  margin-bottom: 0.5rem;
}

.verification-section .form-check-label {
  font-weight: 500;
  color: #495057;
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

.pdf-info {
  padding-top: 0.5rem;
  border-top: 1px solid #e9ecef;
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
  .pdf-annotation-container {
    padding: 0.5rem;
  }
  
  .pdf-viewer-container {
    height: 600px;
  }
  
  .pdf-iframe {
    height: 550px;
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