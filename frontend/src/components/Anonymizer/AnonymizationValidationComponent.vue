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
              <div class="alert alert-info d-flex align-items-center justify-content-between" role="alert">
                <div>
                  <i class="fas fa-info-circle me-2"></i>
                  <span>
                    <strong>Validierung:</strong> 
                    {{ isPdf ? 'PDF-Dokument' : isVideo ? 'Video-Datei' : 'Unbekanntes Format' }}
                    {{ currentItem?.reportMeta?.centerName ? `- ${currentItem.reportMeta.centerName}` : '' }}
                  </span>
                </div>
                <div v-if="currentItem && (isVideo || isPdf)" class="text-end">
                  <small class="text-muted">
                    <i class="fas fa-tools me-1"></i>
                    {{ isVideo ? 'Video-Korrektur verfügbar' : 'Text-Korrektur verfügbar' }}
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div class="row mb-4">
            <!--Checkbox indicating if there are no more names present in the video or pdf-->
            <div class="col-12">
              <div class="form-check">
                <input 
                  type="checkbox" 
                  class="form-check-input" 
                  id="noMoreNames" 
                  v-model="noMoreNames"
                >
                <label class="form-check-label" for="noMoreNames">
                  Keine weiteren Namen im Video oder PDF vorhanden
                </label>
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
                      :class="{ 'is-invalid': !firstNameOk }"
                    >
                    <div class="invalid-feedback" v-if="!firstNameOk">
                      Vorname ist erforderlich.
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Nachname:</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      v-model="editedPatient.patientLastName"
                      :class="{ 'is-invalid': !lastNameOk }"
                    >
                    <div class="invalid-feedback" v-if="!lastNameOk">
                      Nachname ist erforderlich.
                    </div>
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
                      :class="{ 'is-invalid': !isDobValid }"
                    >
                    <div class="invalid-feedback" v-if="!isDobValid">
                      Gültiges Geburtsdatum ist erforderlich.
                    </div>
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
                      v-model="editedAnonymizedText"></textarea>
                  </div>
                </div>
              </div>


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
                    >
                      <span v-if="isSaving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {{ isSaving ? 'Speichern...' : 'Annotation zwischenspeichern' }}
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
                      Video-Datei (Raw: {{ rawVideoSrc || 'N/A' }} | Anonymized: {{ anonymizedVideoSrc || 'N/A' }})
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
                  
                                    <!-- ✅ ENHANCED: Dual Video Viewer for Raw vs Anonymized Comparison -->
                  <div v-else-if="isVideo" class="dual-video-container">
                    <div class="row">
                      <!-- Raw Video (Original) -->
                      <div class="col-md-6">
                        <div class="video-section raw-video">
                          <h6 class="text-center mb-3 text-danger">
                            <i class="fas fa-eye me-1"></i>
                            Original Video (Raw)
                          </h6>
                          <video
                            ref="rawVideoElement"
                            :src="rawVideoSrc"
                            controls
                            style="width: 100%; max-height: 350px;"
                            preload="metadata"
                            @error="onRawVideoError"
                            @loadstart="onRawVideoLoadStart"
                            @canplay="onRawVideoCanPlay"
                            @timeupdate="(event) => syncVideoTime('raw', event)"
                          >
                            Ihr Browser unterstützt dieses Video-Format nicht.
                          </video>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ rawVideoSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Anonymized Video (Processed) -->
                      <div class="col-md-6">
                        <div class="video-section anonymized-video">
                          <h6 class="text-center mb-3 text-success">
                            <i class="fas fa-shield-alt me-1"></i>
                            Anonymisiertes Video (Processed)
                          </h6>
                          <video
                            ref="anonymizedVideoElement"
                            :src="anonymizedVideoSrc"
                            controls
                            style="width: 100%; max-height: 350px;"
                            preload="metadata"
                            @error="onAnonymizedVideoError"
                            @loadstart="onAnonymizedVideoLoadStart"
                            @canplay="onAnonymizedVideoCanPlay"
                            @timeupdate="(event) => syncVideoTime('anonymized', event)"
                          >
                            Ihr Browser unterstützt dieses Video-Format nicht.
                          </video>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ anonymizedVideoSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Video Sync Controls -->
                    <div class="video-controls mt-3 text-center">
                      <button 
                        class="btn btn-outline-primary btn-sm me-2"
                        @click="syncVideos"
                      >
                        <i class="fas fa-sync me-1"></i>
                        Videos synchronisieren
                      </button>
                      <button 
                        class="btn btn-outline-secondary btn-sm"
                        @click="pauseAllVideos"
                      >
                        <i class="fas fa-pause me-1"></i>
                        Alle pausieren
                      </button>
                      <button 
                        class="btn btn-outline-info btn-sm ms-2"
                        @click="validateVideoForSegmentAnnotation"
                        :disabled="isValidatingVideo"
                      >
                        <span v-if="isValidatingVideo" class="spinner-border spinner-border-sm me-1" role="status"></span>
                        <i v-else class="fas fa-check me-1"></i>
                        Segment-Annotation prüfen
                      </button>
                    </div>
                    
                    <!-- ✅ NEW: Outside Timeline Component for Segment Validation -->
                    <div v-if="shouldShowOutsideTimeline && currentItem" class="outside-timeline-container mt-4">
                      <div class="card border-warning">
                        <div class="card-header bg-warning bg-opacity-10">
                          <h6 class="mb-0 text-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Segmente zur Entfernung - Video ID: {{ currentItem.id }}
                          </h6>
                          <small class="text-muted">
                            Diese Segmente wurden als "outside" klassifiziert und sollten aus dem Video entfernt werden.
                          </small>
                        </div>
                        <div class="card-body">
                          <OutsideTimelineComponent 
                            :videoId="currentItem.id"
                            @segment-validated="onSegmentValidated"
                            @validation-complete="onOutsideValidationComplete"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <!-- Video Validation Status -->
                    <div v-if="videoValidationStatus" class="alert mt-3" :class="videoValidationStatus.class">
                      <i :class="videoValidationStatus.icon" class="me-2"></i>
                      <strong>{{ videoValidationStatus.title }}:</strong>
                      {{ videoValidationStatus.message }}
                      <div v-if="videoValidationStatus.details" class="mt-2">
                        <small>{{ videoValidationStatus.details }}</small>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Debug Information - only when neither PDF nor video -->
                  <div v-else class="alert alert-warning">
                    <h6>Debug-Informationen:</h6>
                    <ul class="mb-0">
                      <li><strong>Current Item ID:</strong> {{ currentItem?.id || 'Nicht verfügbar' }}</li>
                      <li><strong>SensitiveMeta ID:</strong> {{ currentItem?.sensitiveMetaId || 'Nicht verfügbar' }}</li>
                      <li><strong>Is PDF:</strong> {{ isPdf }}</li>
                      <li><strong>Is Video:</strong> {{ isVideo }}</li>
                      <li><strong>Detected Media Type:</strong> {{ currentItem ? mediaStore.detectMediaType(currentItem as any) : 'N/A' }}</li>
                      <li><strong>Media URL:</strong> {{ currentItem ? mediaStore.currentMediaUrl : 'N/A' }}</li>
                      <li><strong>PDF URL:</strong> {{ currentItem?.reportMeta?.pdfUrl || 'Nicht verfügbar' }}</li>
                      <li><strong>Video URL:</strong> {{ currentItem?.videoUrl || 'Nicht verfügbar' }}</li>
                      <li><strong>PDF Stream URL:</strong> {{ currentItem?.pdfStreamUrl || 'Nicht verfügbar' }}</li>
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
              <div class="d-flex gap-2">
                <!-- Correction Button - for videos and PDFs -->
                <button 
                  v-if="currentItem && (isVideo || isPdf)"
                  class="btn btn-warning position-relative" 
                  @click="navigateToCorrection"
                  :disabled="isApproving"
                  :title="isVideo ? 'Video-Korrektur: Maskierung, Frame-Entfernung, etc.' : 'PDF-Korrektur: Text-Annotation anpassen'"
                >
                  <i class="fas fa-edit me-1"></i>
                  {{ isVideo ? 'Video-Korrektur' : 'PDF-Korrektur' }}
                  <!-- Unsaved changes indicator -->
                  <span 
                    v-if="dirty" 
                    class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                    style="font-size: 0.6em;"
                    title="Ungespeicherte Änderungen"
                  >
                    !
                  </span>
                </button>
                
                <button class="btn btn-danger me-2" @click="rejectItem">
                  Ablehnen
                </button>
                <button 
                  class="btn btn-success" 
                  @click="approveItem"
                  :disabled="isApproving"
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
import { useRouter } from 'vue-router';
import { useAnonymizationStore, type PatientData } from '@/stores/anonymizationStore';
import {useVideoStore, type Video} from '@/stores/videoStore';
import { usePatientStore } from '@/stores/patientStore';
import { useToastStore } from '@/stores/toastStore';
import { usePdfStore } from '@/stores/pdfStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import OutsideTimelineComponent from '@/components/Anonymizer/OutsideSegmentComponent.vue';
// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
import { usePollingProtection } from '@/composables/usePollingProtection';


const pollingProtection = usePollingProtection();


const toast = useToastStore();
const router = useRouter();

// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
const patientStore = usePatientStore();
const pdfStore = usePdfStore();
const mediaStore = useMediaTypeStore();

// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const noMoreNames = ref(false);
const editedPatient = ref({
  patientFirstName: '',
  patientLastName: '',
  patientGender: '',
  patientDob: '',
  casenumber: ''
});

// ✅ NEW: Video validation state for segment annotation
const isValidatingVideo = ref(false);
const shouldShowOutsideTimeline = ref(false);
const videoValidationStatus = ref<{
  class: string;
  icon: string;
  title: string;
  message: string;
  details?: string;
} | null>(null);
const outsideSegmentsValidated = ref(0);
const totalOutsideSegments = ref(0);

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

function fromUiToISO(input?: string | null): string | null {
  /**
   * Konvertiert Browser Date Input (YYYY-MM-DD) zu ISO String
   */
  if (!input) return null;
  const s = input.trim().split(' ')[0];
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return iso ? s : null;
}

function toGerman(iso?: string | null): string {
  /**
   * Konvertiert ISO-Datum (YYYY-MM-DD) zu deutschem Format (DD.MM.YYYY)
   */
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return '';
  const [, y, mo, d] = m;
  return `${d}.${mo}.${y}`;
}

function fromGermanToISO(input?: string | null): string | null {
  /**
   * Konvertiert deutsches Datum (DD.MM.YYYY) zu ISO-Format (YYYY-MM-DD)
   */
  if (!input) return null;
  const s = input.trim();
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateToISO(input?: string | null): string | null {
  /**
   * DEPRECATED: Verwende fromUiToISO oder fromGermanToISO
   * Zur Rückwärtskompatibilität noch vorhanden
   */
  if (!input) return null;
  const s = input.trim().split(' ')[0]; // remove time if present
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) return s;
  const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (de) {
    const [, dd, mm, yyyy] = de;
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}


function buildSensitiveMetaSnake(dobGerman: string) {
  return {
    patient_first_name: editedPatient.value.patientFirstName || '',
    patient_last_name:  editedPatient.value.patientLastName  || '',
    patient_gender:     editedPatient.value.patientGender    || '',
    patient_dob:        dobGerman,  // 🎯 Jetzt deutsches Format
    casenumber:         editedPatient.value.casenumber       || '',
  };
}
function compareISODate(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

// Validations mit neuen Helfern - intern weiterhin ISO für Vergleiche
const firstNameOk = computed(() => editedPatient.value.patientFirstName.trim().length > 0);
const lastNameOk  = computed(() => editedPatient.value.patientLastName.trim().length  > 0);

// Unterstütze sowohl UI-Input (ISO) als auch deutsche Eingaben
const dobISO  = computed(() => 
  fromUiToISO(editedPatient.value.patientDob) || fromGermanToISO(editedPatient.value.patientDob)
);
const examISO = computed(() => 
  fromUiToISO(examinationDate.value) || fromGermanToISO(examinationDate.value)
);

// DOB must be present & valid
const isDobValid = computed(() => !!dobISO.value);

// Exam optional; if present requires valid DOB and must be >= DOB
const isExaminationDateValid = computed(() => {
  if (!examISO.value) return true;
  if (!dobISO.value)  return false;
  return compareISODate(examISO.value, dobISO.value) >= 0;
});

// Global save gates
const dataOk = computed(() =>
  firstNameOk.value && lastNameOk.value && isDobValid.value && isExaminationDateValid.value
);


const canSubmit = computed(() =>
  !!processedUrl.value && !!originalUrl.value
);


// Computed
const currentItem = computed(() => anonymizationStore.current);

// Use MediaStore for consistent media type detection
const isPdf = computed(() => {
  if (!currentItem.value) return false;
  return mediaStore.detectMediaType(currentItem.value as any) === 'pdf';
});

const isVideo = computed(() => {
  if (!currentItem.value) return false;
  return mediaStore.detectMediaType(currentItem.value as any) === 'video';
});

// Media URLs with MediaStore logic
const pdfSrc = computed(() => {
  if (!isPdf.value || !currentItem.value) return undefined;
  
  // Use MediaStore's URL resolution logic
  return mediaStore.getPdfUrl(currentItem.value as any) ||
         pdfStore.pdfStreamUrl ||
         pdfStore.buildPdfStreamUrl(currentItem.value.id);
});

// ✅ ENHANCED: Dual video streaming for raw vs anonymized comparison
const videoSrc = computed(() => {
  if (!isVideo.value || !currentItem.value) return undefined;
  return mediaStore.getVideoUrl(currentItem.value as any);
});

// ✅ NEW: Raw video URL (original unprocessed video)
const rawVideoSrc = computed(() => {
  if (!isVideo.value || !currentItem.value) return undefined;
  
  // Build raw video URL with explicit raw parameter
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base}/api/media/videos/${currentItem.value.id}/?type=raw`;
});

// ✅ NEW: Anonymized video URL (processed/anonymized video)
const anonymizedVideoSrc = computed(() => {
  if (!isVideo.value || !currentItem.value) return undefined;
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base}/api/media/videos/${currentItem.value.id}/?type=processed`;
});


// ✅ NEW: Refs for dual video elements
const rawVideoElement = ref<HTMLVideoElement | null>(null);
const anonymizedVideoElement = ref<HTMLVideoElement | null>(null);

// ✅ NEW: Video event handlers for raw video
const onRawVideoError = (event: Event) => {
  console.error('Raw video error:', event);
  // Handle raw video errors gracefully
};

const onRawVideoLoadStart = () => {
  console.log('Raw video load started');
};

const onRawVideoCanPlay = () => {
  console.log('Raw video can play');
};

// ✅ NEW: Video event handlers for anonymized video
const onAnonymizedVideoError = (event: Event) => {
  console.error('Anonymized video error:', event);
  // Handle anonymized video errors gracefully
};

const onAnonymizedVideoLoadStart = () => {
  console.log('Anonymized video load started');
};

const onAnonymizedVideoCanPlay = () => {
  console.log('Anonymized video can play');
};

// ✅ NEW: Video synchronization functions
const syncVideoTime = (source: 'raw' | 'anonymized', event: Event) => {
  if (!rawVideoElement.value || !anonymizedVideoElement.value) return;
  
  const sourceElement = source === 'raw' ? rawVideoElement.value : anonymizedVideoElement.value;
  const targetElement = source === 'raw' ? anonymizedVideoElement.value : rawVideoElement.value;
  
  // Sync time only if there's a significant difference (avoid infinite loops)
  const timeDiff = Math.abs(sourceElement.currentTime - targetElement.currentTime);
  if (timeDiff > 0.5) { // 0.5 second tolerance
    targetElement.currentTime = sourceElement.currentTime;
  }
};

const syncVideos = () => {
  if (!rawVideoElement.value || !anonymizedVideoElement.value) return;
  
  // Sync to the average time of both videos
  const avgTime = (rawVideoElement.value.currentTime + anonymizedVideoElement.value.currentTime) / 2;
  rawVideoElement.value.currentTime = avgTime;
  anonymizedVideoElement.value.currentTime = avgTime;
  
  console.log('Videos synchronized to time:', avgTime);
};

const pauseAllVideos = () => {
  if (rawVideoElement.value) rawVideoElement.value.pause();
  if (anonymizedVideoElement.value) anonymizedVideoElement.value.pause();
  console.log('All videos paused');
};

// ✅ NEW: Video validation functions for segment annotation
const validateVideoForSegmentAnnotation = async () => {
  if (!currentItem.value || !isVideo.value) {
    toast.warning({ text: 'Kein Video zur Validierung ausgewählt.' });
    return;
  }

  isValidatingVideo.value = true;
  shouldShowOutsideTimeline.value = false;
  videoValidationStatus.value = null;

  try {
    // Check if video is eligible for segment annotation
    console.log(`🔍 Validating video ${currentItem.value.id} for segment annotation...`);
    
    const response = await axiosInstance.get(r(`media/videos/${currentItem.value.id}/validation/segments/`));
    const validation = response.data;
    
    console.log('Video validation response:', validation);
    
    if (validation.eligible) {
      // Video is eligible - check for outside segments
      const outsideSegmentsResponse = await axiosInstance.get(r(`video/${currentItem.value.id}/segments/?label=outside`));
      const outsideSegments = outsideSegmentsResponse.data;
      
      totalOutsideSegments.value = outsideSegments.length;
      outsideSegmentsValidated.value = 0;
      
      if (outsideSegments.length > 0) {
        shouldShowOutsideTimeline.value = true;
        videoValidationStatus.value = {
          class: 'alert-warning',
          icon: 'fas fa-exclamation-triangle',
          title: 'Segmentvalidierung erforderlich',
          message: `${outsideSegments.length} "Outside"-Segmente gefunden, die validiert werden müssen.`,
          details: 'Verwenden Sie die Timeline unten, um die Segmente zu überprüfen und zu bestätigen.'
        };
      } else {
        videoValidationStatus.value = {
          class: 'alert-success',
          icon: 'fas fa-check-circle',
          title: 'Video bereit für Annotation',
          message: 'Keine "Outside"-Segmente gefunden. Video ist bereit für die Segment-Annotation.',
          details: `Video ID: ${currentItem.value.id} - Alle Validierungen bestanden.`
        };
      }
    } else {
      videoValidationStatus.value = {
        class: 'alert-danger',
        icon: 'fas fa-times-circle',
        title: 'Video nicht bereit',
        message: validation.reasons?.join(', ') || 'Video ist nicht für Segment-Annotation geeignet.',
        details: 'Überprüfen Sie die Video-Verarbeitung und Metadaten-Extraktion.'
      };
    }
    
    toast.info({ text: `Video ${currentItem.value.id} validiert` });
    
  } catch (error: any) {
    console.error('Error validating video for segment annotation:', error);
    
    // Fallback validation using video store if API endpoint doesn't exist
    try {
      await videoStore.fetchAllSegments(currentItem.value.id.toString());
      const outsideSegments = videoStore.allSegments.filter(s => s.label === 'outside');
      
      totalOutsideSegments.value = outsideSegments.length;
      outsideSegmentsValidated.value = 0;
      
      if (outsideSegments.length > 0) {
        shouldShowOutsideTimeline.value = true;
        videoValidationStatus.value = {
          class: 'alert-warning',
          icon: 'fas fa-exclamation-triangle',
          title: 'Outside-Segmente gefunden (Fallback)',
          message: `${outsideSegments.length} "Outside"-Segmente zur Validierung gefunden.`,
          details: 'Fallback-Validierung über VideoStore. API-Endpoint nicht verfügbar.'
        };
      } else {
        videoValidationStatus.value = {
          class: 'alert-info',
          icon: 'fas fa-info-circle',
          title: 'Fallback-Validierung',
          message: 'Keine "Outside"-Segmente gefunden (über VideoStore).',
          details: 'API-Validierung fehlgeschlagen, Fallback verwendet.'
        };
      }
    } catch (fallbackError) {
      videoValidationStatus.value = {
        class: 'alert-danger',
        icon: 'fas fa-times-circle',
        title: 'Validierung fehlgeschlagen',
        message: 'Video konnte nicht für Segment-Annotation validiert werden.',
        details: error?.response?.data?.detail || error?.message || 'Unbekannter Fehler'
      };
    }
  } finally {
    isValidatingVideo.value = false;
  }
};

const onSegmentValidated = (segmentId: string | number) => {
  outsideSegmentsValidated.value++;
  console.log(`✅ Segment ${segmentId} validated. Progress: ${outsideSegmentsValidated.value}/${totalOutsideSegments.value}`);
  
  // Update validation status
  if (videoValidationStatus.value) {
    videoValidationStatus.value.message = 
      `Fortschritt: ${outsideSegmentsValidated.value}/${totalOutsideSegments.value} Outside-Segmente validiert.`;
  }
};

const onOutsideValidationComplete = () => {
  console.log('🎉 All outside segments validated!');
  shouldShowOutsideTimeline.value = false;
  
  videoValidationStatus.value = {
    class: 'alert-success',
    icon: 'fas fa-check-circle',
    title: 'Validierung abgeschlossen',
    message: 'Alle Outside-Segmente wurden erfolgreich validiert.',
    details: `Video ${currentItem.value?.id} ist jetzt bereit für die vollständige Segment-Annotation.`
  };
  
  toast.success({ text: 'Outside-Segment Validierung abgeschlossen!' });
};

// Watch
watch(currentItem, (newItem: PatientData | null) => {
  if (newItem) {
    // Update MediaStore with current item for consistent type detection
    mediaStore.setCurrentItem(newItem as any);
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

  // ✅ NEW: Reset video validation state when loading new item
  shouldShowOutsideTimeline.value = false;
  videoValidationStatus.value = null;
  outsideSegmentsValidated.value = 0;
  totalOutsideSegments.value = 0;
  isValidatingVideo.value = false;

  editedAnonymizedText.value = item.anonymizedText || '';

  const rawExam = item.reportMeta?.examinationDate || '';
  const rawDob  = item.reportMeta?.patientDob || '';  

  // Unterstütze sowohl eingehende ISO- als auch deutsche Daten
  examinationDate.value = fromUiToISO(rawExam) || fromGermanToISO(rawExam) || '';

  const p: Editable = {
    patientFirstName: item.reportMeta?.patientFirstName || '',
    patientLastName:  item.reportMeta?.patientLastName  || '',
    patientGender:    item.reportMeta?.patientGender    || '',
    patientDob:       fromUiToISO(rawDob) || fromGermanToISO(rawDob) || '',
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

// ✅ NEW: Can save computed property
const canSave = computed(() => {
  // Can save if we have a current item and data is not currently being processed
  return currentItem.value && !isSaving.value && !isApproving.value;
});

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

const navigateToSegmentation = () => {
  router.push({ name: 'Video-Untersuchung', params: { fileId: currentItem.value?.id.toString() || '' } });
};


const approveItem = async () => {
  if (!currentItem.value || !canSave.value || isApproving.value) return;
  isApproving.value = true;
  try {
 
    console.log(`Validating anonymization for file ${currentItem.value.id}...`);
    try {
      await axiosInstance.post(r(`anonymization/${currentItem.value.id}/validate/`), {
          patient_first_name: editedPatient.value.patientFirstName,
          patient_last_name:  editedPatient.value.patientLastName,
          patient_gender:     editedPatient.value.patientGender,
          patient_dob:        toGerman(dobISO.value || '') || '',          // 🎯 SENDE DEUTSCHES FORMAT
          examination_date:   toGerman(examISO.value || '') || '',         // 🎯 SENDE DEUTSCHES FORMAT
          casenumber:         editedPatient.value.casenumber || "",
          anonymized_text:    isPdf.value ? editedAnonymizedText.value : undefined,
          is_verified:        true,
        });
      console.log(`Anonymization validated successfully for file ${currentItem.value.id}`);
      toast.success({ text: 'Dokument bestätigt und Anonymisierung validiert' });
    } catch (validationError) {
      console.error('Error validating anonymization:', validationError);
      toast.warning({ text: 'Dokument bestätigt, aber Validierung fehlgeschlagen' });
    }
    pollingProtection.validateAnonymizationSafeWithProtection(currentItem.value.id, 'pdf');
    await navigateToSegmentation();

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
      patient_data: buildSensitiveMetaSnake(toGerman(dobISO.value || '') || ''),  // 🎯 DEUTSCHES FORMAT
      examinationDate: toGerman(examISO.value || '') || '',                       // 🎯 DEUTSCHES FORMAT
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

const navigateToCorrection = async () => {
  if (!currentItem.value) {
    toast.error({ text: 'Kein Element zur Korrektur ausgewählt.' });
    return;
  }

  // Check for unsaved changes
  if (dirty.value) {
    const saveFirst = confirm(
      'Sie haben ungespeicherte Änderungen!\n\n' +
      'Möchten Sie diese zuerst speichern, bevor Sie zur Korrektur wechseln?\n\n' +
      '• Ja = Änderungen speichern und zur Korrektur\n' +
      '• Nein = Änderungen verwerfen und zur Korrektur\n' +
      '• Abbrechen = Hier bleiben'
    );
    
    if (saveFirst === null) {
      // User cancelled
      return;
    }
    
    if (saveFirst) {
      // User wants to save first
      if (!canSave.value) {
        toast.error({ text: 'Bitte korrigieren Sie die Validierungsfehler vor dem Speichern.' });
        return;
      }
      
      try {
        await approveItem();
        // approveItem will navigate to next item, so we need to return
        toast.info({ text: 'Änderungen gespeichert. Bitte wählen Sie das Element erneut für die Korrektur aus.' });
        return;
      } catch (error) {
        toast.error({ text: 'Fehler beim Speichern. Korrektur-Navigation abgebrochen.' });
        return;
      }
    }
    // If saveFirst is false, continue with navigation (discard changes)
  }


  // Ensure MediaStore has the current item for consistent navigation
  mediaStore.setCurrentItem(currentItem.value as any);
  
  // Different confirmation messages based on media type
  const mediaType = isVideo.value ? 'Video' : isPdf.value ? 'PDF' : 'Dokument';
  const correctionOptions = isVideo.value 
    ? 'Verfügbare Optionen: Maskierung, Frame-Entfernung, Neuverarbeitung'
    : 'Verfügbare Optionen: Text-Annotation anpassen, Metadaten korrigieren';
  
  // Log navigation for debugging
  console.log(`🔧 Navigating to correction for ${mediaType}:`, {
    id: currentItem.value.id,
    mediaType,
    detectedType: mediaStore.detectMediaType(currentItem.value as any),
    mediaUrl: mediaStore.currentMediaUrl
  });
  
  // Navigate to correction component with the current item's ID
  router.push({ 
    name: 'AnonymisierungKorrektur', 
    params: { fileId: currentItem.value.id.toString() } 
  });
  
  toast.info({ 
    text: `${mediaType}-Korrektur geöffnet. ${correctionOptions}` 
  });
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

/* Outside Timeline Styles */
.dual-video-container .video-section {
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  padding: 1rem;
  background-color: #f8f9fa;
}

.dual-video-container .video-section.raw-video {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.dual-video-container .video-section.anonymized-video {
  border-color: #198754;
  background-color: #f0fff4;
}

/* ✅ NEW: Outside Timeline Container Styles */
.outside-timeline-container {
  max-height: 400px;
  overflow-y: auto;
}

.outside-timeline-container .card {
  margin-bottom: 0;
}

.outside-timeline-container .card-header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 2px solid #ffc107;
}

/* Video validation status styles */
.alert.alert-warning {
  border-left: 4px solid #ffc107;
}

.alert.alert-success {
  border-left: 4px solid #198754;
}

.alert.alert-danger {
  border-left: 4px solid #dc3545;
}

.alert.alert-info {
  border-left: 4px solid #0dcaf0;
}

/* Video controls enhancement */
.video-controls .btn {
  min-width: 150px;
}

.video-controls .btn .spinner-border-sm {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
