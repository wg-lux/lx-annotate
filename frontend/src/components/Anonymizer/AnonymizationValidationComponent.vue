<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Anonymisierungsvalidierung und Annotationen</h4>
      </div>
      <div class="card-body">
        <!-- Loading / Error States -->
        <div v-if="anonymizationStore.loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Anonymisierte Daten werden geladen...</p>
        </div>

        <div v-else-if="anonymizationStore.error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ anonymizationStore.error }}
        </div>

        <div v-else-if="!currentItem" class="alert alert-info" role="alert">
          Alle Anonymisierungen wurden bearbeitet.
        </div>
          
          <!-- Processing Status Alert -->
          <div v-if="anonymizationStore.isAnyFileProcessing" class="alert alert-warning mt-3">
            <i class="fas fa-info-circle me-2"></i>
            <strong>{{ anonymizationStore.processingFiles.length }} Datei(en)</strong> werden gerade anonymisiert.
            <div class="mt-2">
              <router-link to="/anonymisierung/uebersicht" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-eye me-1"></i>
                Zur Übersicht
              </router-link>
            </div>
          </div>
        </div>

        <!-- Main Content When Data is Available -->
        <template v-if="currentItem">
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

              <input v-model="editedPatient.patientFirstName" class="form-control" :class="{ 'is-invalid': !firstNameOk }" />
              <input v-model="editedPatient.patientLastName"  class="form-control" :class="{ 'is-invalid': !lastNameOk }" />
              <input v-model="editedPatient.patientDob" type="date" class="form-control" :class="{ 'is-invalid': !isDobValid }" />


              <!-- Annotation Section -->
              <div class="card bg-light">
                <div class="card-body">
                  <h5 class="card-title">Annotationen</h5>
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
                      :disabled="isSaving || !canSubmit"
                    >
                      <span v-if="isSaving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {{ isSaving ? 'Speichern...' : 'Annotation speichern' }}
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
                    {{ isPdf ? 'PDF Vorschau' : 'Video Vorschau' }}
                  </h5>
                  <!-- Clear Data Format Message -->
                  <div class="alert alert-info mt-2 mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Datenformat:</strong> 
                    <span v-if="isPdf">
                      PDF-Dokument ({{ Math.round((currentItem?.reportMeta?.file?.length || 0) / 1024) || 'Unbekannt' }} KB)
                    </span>
                    <span v-else-if="isVideo">
                      Video-Datei (Stream-URL: {{ videoSrc }})
                    </span>
                    <span v-else>
                      Unbekanntes Format - ID: {{ currentItem?.id }}
                    </span>
                  </div>
                </div>
                <div class="card-body media-viewer-container">
                  <!-- PDF Viewer - only for actual PDFs -->
                  <iframe
                    v-if="isPdf"
                    :src="pdfSrc"
                    width="100%"
                    height="800px"
                    frameborder="0"
                    title="PDF Vorschau"
                  >
                    Ihr Browser unterstützt keine eingebetteten PDFs. Sie können die Datei <a :href="pdfSrc">hier herunterladen</a>.
                  </iframe>
                  
                  <!-- Video Viewer - only for actual videos -->
                  <video
                    v-else-if="isVideo"
                    controls
                    width="100%"
                    height="600px"
                    :src="videoSrc"
                    @error="onVideoError"
                    @loadstart="onVideoLoadStart"
                    @canplay="onVideoCanPlay"
                  >
                    Ihr Browser unterstützt dieses Video-Format nicht.
                  </video>
                  
                  <!-- Debug Information - only when neither PDF nor video -->
                  <div v-else class="alert alert-warning">
                    <h6>Debug-Informationen:</h6>
                    <ul class="mb-0">
                      <li><strong>Current Item ID:</strong> {{ currentItem?.id || 'Nicht verfügbar' }}</li>
                      <li><strong>SensitiveMeta ID:</strong> {{ currentItem?.sensitiveMetaId || 'Nicht verfügbar' }}</li>
                      <li><strong>Is PDF:</strong> {{ isPdf }}</li>
                      <li><strong>Is Video:</strong> {{ isVideo }}</li>
                      <li><strong>PDF URL:</strong> {{ currentItem?.reportMeta?.pdfUrl || 'Nicht verfügbar' }}</li>
                      <li><strong>Video URL:</strong> {{ currentItem?.videoUrl || 'Nicht verfügbar' }}</li>
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
                  :disabled="!isApproving || !canSave || !dirty"
                >
                  <span v-if="isApproving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isApproving ? 'Wird bestätigt...' : 'Bestätigen' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAnonymizationStore, type PatientData } from '@/stores/anonymizationStore';
import {useVideoStore, type Video} from '@/stores/videoStore';
import { usePatientStore } from '@/stores/patientStore';
import { useToastStore } from '@/stores/toastStore';
import { usePdfStore } from '@/stores/pdfStore';
// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
// @ts-ignore




const toast = useToastStore();

// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const patientStore = usePatientStore();
const pdfStore = usePdfStore();

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
const hasSuccessfulUpload = ref(false);



// Original state for dirty tracking

type Editable = {
  patientFirstName: string;
  patientLastName: string;
  patientGender: string;
  patientDob: string; 
  casenumber: string;
};

const original = ref<{
  anonymizedText: string;
  examinationDate: string; // raw as shown in UI
  patient: Editable;
}>({
  anonymizedText: '',
  examinationDate: '',
  patient: {
    patientFirstName: '',
    patientLastName: '',
    patientGender: '',
    patientDob: '',
    casenumber: '',
  },
});


function shallowEqual(a: Editable, b: Editable): boolean {
  return a.patientFirstName === b.patientFirstName &&
         a.patientLastName === b.patientLastName &&
         a.patientGender === b.patientGender &&
         a.patientDob === b.patientDob &&
         a.casenumber === b.casenumber;
}

// --- add below your imports/locals ---

function normalizeDateToISO(input?: string | null): string | null {
  if (!input) return null;
  const s = input.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;
  const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (de) {
    const [, dd, mm, yyyy] = de;
    const d = +dd, m = +mm, y = +yyyy;
    if (y >= 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}
function compareISODate(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

// Validations
const firstNameOk = computed(() => editedPatient.value.patientFirstName.trim().length > 0);
const lastNameOk  = computed(() => editedPatient.value.patientLastName.trim().length  > 0);

const dobISO  = computed(() => normalizeDateToISO(editedPatient.value.patientDob));
const examISO = computed(() => normalizeDateToISO(examinationDate.value));

// DOB must be present & valid
const isDobValid = computed(() => !!dobISO.value);

// Exam optional; if present requires valid DOB and must be >= DOB
const isExaminationDateValid = computed(() => {
  if (!examISO.value) return true;
  if (!dobISO.value)  return false;
  return compareISODate(examISO.value, dobISO.value) >= 0;
});

// Global save gates
const canSave = computed(() =>
  firstNameOk.value && lastNameOk.value && isDobValid.value && isExaminationDateValid.value
);

const canSubmit = computed(() =>
  !!processedUrl.value && !!originalUrl.value && canSave.value
);


// Computed
const currentItem = computed(() => anonymizationStore.current);

const mediaType = computed(() =>
  currentItem.value?.reportMeta?.pdfUrl
    ? 'pdf'
    : currentItem.value?.videoUrl || currentItem.value?.reportMeta?.file
      ? 'video'
      : 'unknown'
);

const isPdf   = computed(() => mediaType.value === 'pdf');
const isVideo = computed(() => mediaType.value === 'video');
// Media URLs
const pdfSrc = computed(() => {
  if (!isPdf.value) return undefined;
  
  // Use PDF stream URL from store if available, otherwise use report meta URL or fallback
  return currentItem.value?.reportMeta?.pdfUrl || 
         pdfStore.buildPdfStreamUrl(currentItem.value!.id) ||
         `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/media/pdfs/${currentItem.value!.id}/stream`;
});

const videoSrc = computed(() => {
  if (!isVideo.value) return undefined;
  return currentItem.value?.videoUrl || undefined;
});


// Watch
watch(currentItem, (newItem: PatientData | null) => {
  if (newItem) {
    loadCurrentItemData(newItem);
  }
}, { immediate: true });



const fetchNextItem = async () => {
  try {
    await anonymizationStore.fetchNext();
  } catch (error) {
    console.error('Error fetching next item:', error);
  }
};

const loadCurrentItemData = (item: PatientData) => {
  if (!item) return;

  editedAnonymizedText.value = item.anonymizedText || '';

  const rawExam = item.reportMeta?.examinationDate || '';
  const rawDob  = item.reportMeta?.patientDob || '';  

  examinationDate.value = normalizeDateToISO(rawExam) || '';



  const p: Editable = {
    patientFirstName: item.reportMeta?.patientFirstName || '',
    patientLastName:  item.reportMeta?.patientLastName  || '',
    patientGender:    item.reportMeta?.patientGender    || '',
    patientDob:       normalizeDateToISO(rawDob)      || '',
    casenumber:       item.reportMeta?.casenumber       || '',
  };
  editedPatient.value = { ...p };

  original.value = {
    anonymizedText: editedAnonymizedText.value,
    examinationDate: examinationDate.value,
    patient: { ...p },
  };
};

const dirty = computed(() =>
  editedAnonymizedText.value !== original.value.anonymizedText ||
  examinationDate.value      !== original.value.examinationDate ||
  !shallowEqual(editedPatient.value, original.value.patient)
);

// Concurrency guards
const isSaving = ref(false);
const isApproving = ref(false);


const toggleImage = () => {
  showOriginal.value = !showOriginal.value;
};



const skipItem = async () => {
  if (currentItem.value) {
    await fetchNextItem();
  }
};


const approveItem = async () => {
  if (!currentItem.value || !canSave.value || isApproving.value) return;
  isApproving.value = true;
  try {
    const normalizedDob  = dobISO.value!;           // guaranteed by canSave
    const normalizedExam = examISO.value || '';

    if (isVideo.value) {
      await videoStore.loadVideo(currentItem.value.id.toString());
      await anonymizationStore.patchVideo({
        sensitive_meta_id: currentItem.value.reportMeta?.id,
        is_verified: true,
        delete_raw_files: true,
        ...editedPatient.value,
        patient_dob: normalizedDob,
        examination_date: normalizedExam,
      });
    } else {
      // Prefer pdfStore when available
      if (currentItem.value.reportMeta?.pdfUrl && currentItem.value.sensitiveMetaId) {
        await pdfStore.updateSensitiveMeta(currentItem.value.sensitiveMetaId, {
          ...editedPatient.value,
          patientDob: normalizedDob,
          examinationDate: normalizedExam,
          isVerified: true,
        });
        await pdfStore.updateAnonymizedText(currentItem.value.id, editedAnonymizedText.value);
      } else {
        await anonymizationStore.patchPdf({
          sensitive_meta_id: currentItem.value.reportMeta?.id,
          is_verified: true,
          delete_raw_files: true,
          ...editedPatient.value,
          patient_dob: normalizedDob,
          examination_date: normalizedExam,
          anonymized_text: editedAnonymizedText.value,
        });
      }
    }

    // ✅ NEW: Validate the anonymization status after successful approval
    console.log(`Validating anonymization for file ${currentItem.value.id}...`);
    try {
      await axiosInstance.post(r(`anonymization/${currentItem.value.id}/validate/`));
      console.log(`Anonymization validated successfully for file ${currentItem.value.id}`);
      toast.success({ text: 'Dokument bestätigt und Anonymisierung validiert' });
    } catch (validationError) {
      console.error('Error validating anonymization:', validationError);
      toast.warning({ text: 'Dokument bestätigt, aber Validierung fehlgeschlagen' });
    }

    await fetchNextItem();
  } catch (error) {
    console.error('Error approving item:', error);
    toast.error({ text: 'Fehler beim Bestätigen des Elements' });
  } finally {
    isApproving.value = false;
  }
};


const saveAnnotation = async () => {
  if (isSaving.value || !canSubmit.value) {
    if (!isSaving.value) toast.error({ text: 'Bitte Namen und gültiges Geburtsdatum angeben.' });
    return;
  }
  isSaving.value = true;
  try {
    const annotationData = {
      processed_image_url: processedUrl.value,
      patient_data: {
        ...editedPatient.value,
        patientDob: dobISO.value!,           // normalized
      },
      examinationDate: examISO.value || '',
      anonymized_text: editedAnonymizedText.value,
    };

    if (currentItem.value && isVideo.value) {
      await axiosInstance.post(r('save-anonymization-annotation-video/'), {
        ...annotationData,
        itemId: currentItem.value.id,
      });
    } else if (currentItem.value && isPdf.value) {
      await axiosInstance.post(r('save-anonymization-annotation-pdf/'), annotationData);
    } else {
      toast.error({ text: 'Keine gültige Anonymisierung zum Speichern gefunden.' });
      return;
    }

    originalUrl.value = '';
    processedUrl.value = '';
    hasSuccessfulUpload.value = false;
    toast.success({ text: 'Annotation erfolgreich gespeichert' });
  } catch (error) {
    console.error('Error saving annotation:', error);
    toast.error({ text: 'Fehler beim Speichern der Annotation' });
  } finally {
    isSaving.value = false;
  }
};


const rejectItem = async () => {
  if (currentItem.value) {
    await fetchNextItem();
  }
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
  console.log('Video loading started for:', videoSrc.value);
};

const onVideoCanPlay = () => {
  console.log('Video can play, loaded successfully');
};


// Lifecycle
onMounted(async () => {
  if (!anonymizationStore.current) {         // nur wenn wirklich leer
    await fetchNextItem();
  }
  else {
    loadCurrentItemData(anonymizationStore.current);
  }
});

onUnmounted(() => {
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
