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

        <div v-else-if="!currentItem" class="alert alert-info" role="alert" @loadstart="anonymizationStore.fetchNext()">
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
                    {{ currentItem?.centerName ? `- ${currentItem.centerName}` : '' }}
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

          <!-- ✨ Phase 2.2: Centralized Validation Error Panel -->
          <div v-if="validationErrors.length > 0" class="row mb-4">
            <div class="col-12">
              <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <h6 class="alert-heading">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  {{ validationErrorSummary }}
                </h6>
                <hr>
                <ul class="mb-0">
                  <li v-for="(error, index) in validationErrors" :key="index">
                    {{ error }}
                  </li>
                </ul>
                <button type="button" class="btn-close" @click="clearValidationErrors" aria-label="Schließen"></button>
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
                    <select class="form-select" v-model="editedPatient.patientGenderName">
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
                      @blur="onDobBlur"
                    >
                    <small class="form-text text-muted">
                      <i class="fas fa-info-circle me-1"></i>
                      <span v-if="dobDisplayFormat" class="ms-2 badge bg-secondary">
                        {{ dobDisplayFormat }}
                      </span>
                    </small>
                    <div class="invalid-feedback" v-if="!isDobValid">
                      {{ dobErrorMessage || 'Gültiges Geburtsdatum ist erforderlich.' }}
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
                      @blur="onExamDateBlur"
                    >
                    <small class="form-text text-muted">
                      <i class="fas fa-info-circle me-1"></i>
                      <span v-if="examDateDisplayFormat" class="ms-2 badge bg-secondary">
                        {{ examDateDisplayFormat }}
                      </span>
                    </small>
                    <div class="invalid-feedback" v-if="!isExaminationDateValid">
                      {{ examDateErrorMessage || 'Das Untersuchungsdatum darf nicht vor dem Geburtsdatum liegen.' }}
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Anonymisierter Text:</label>
                    <textarea class="form-control"
                      rows="6"
                      v-model="editedAnonymizedText"></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Externe ID:</label>
                      <textarea 
                        class="form-control"
                        v-model="editedPatient.externalId"
                      ></textarea>
                  </div>
                  
                  <div class="mb-3">
                    <label class="form-label">Untersucher:</label>
                      <textarea 
                        class="form-control"
                        v-model="editedPatient.examinersDisplay"
                      ></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Quelle der Daten:</label>
                      <textarea
                      class="form-control"
                      v-model="editedPatient.externalIdOrigin"
                    >
                    </textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Zentrum:</label>
                      <textarea
                      class="form-control"
                      v-model="editedPatient.centerName"
                    >
                    </textarea>
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
                      PDF-Dokument ({{ Math.round((anonymizedPdfSrc?.length || 0) / 1024) || 'Nicht Verfügbar' }} KB)
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
                  <!-- ✅ ENHANCED: Dual PDF Viewer for Raw vs Anonymized Comparison -->
                  <div v-if="isPdf" class="dual-pdf-container">
                    <div class="row">
                      <!-- Raw PDF (Original) -->
                      <div class="col-md-6">
                        <div class="pdf-section raw-pdf">
                          <h6 class="text-center mb-3 text-danger">
                            <i class="fas fa-file-pdf me-1"></i>
                            Original PDF (Raw)
                          </h6>
                          <iframe
                            :src="rawPdfSrc"
                            width="100%"
                            height="700px"
                            frameborder="0"
                            title="Original PDF Vorschau"
                          >
                            Ihr Browser unterstützt keine eingebetteten PDFs. Sie können die Datei <a :href="rawPdfSrc">hier herunterladen</a>.
                          </iframe>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ rawPdfSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Anonymized PDF (Processed) -->
                      <div class="col-md-6">
                        <div class="pdf-section anonymized-pdf">
                          <h6 class="text-center mb-3 text-success">
                            <i class="fas fa-shield-alt me-1"></i>
                            Anonymisiertes PDF (Processed)
                          </h6>
                          <iframe
                            :src="anonymizedPdfSrc"
                            width="100%"
                            height="700px"
                            frameborder="0"
                            title="Anonymisiertes PDF Vorschau"
                          >
                            Ihr Browser unterstützt keine eingebetteten PDFs. Sie können die Datei <a :href="anonymizedPdfSrc">hier herunterladen</a>.
                          </iframe>
                          <div class="mt-2 text-center">
                            <small class="text-muted">
                              URL: {{ anonymizedPdfSrc || 'Nicht verfügbar' }}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- PDF Controls -->
                    <div class="pdf-controls mt-3 text-center">
                      <button 
                        class="btn btn-outline-primary btn-sm me-2"
                        @click="downloadRawPdf"
                      >
                        <i class="fas fa-download me-1"></i>
                        Original herunterladen
                      </button>
                      <button 
                        class="btn btn-outline-success btn-sm"
                        @click="downloadAnonymizedPdf"
                      >
                        <i class="fas fa-download me-1"></i>
                        Anonymisiert herunterladen
                      </button>
                    </div>
                  </div>
                  
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
                          <div class="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 class="mb-0 text-warning">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                Segmente zur Entfernung - Video ID: {{ currentItem.id }}
                              </h6>
                              <small class="text-muted">
                                Diese Segmente wurden als "outside" klassifiziert und sollten aus dem Video entfernt werden.
                              </small>
                            </div>
                            <!-- Phase 3.1: Validation Progress Indicator -->
                            <div class="text-end">
                              <div class="badge bg-warning text-dark fs-6">
                                {{ outsideSegmentsValidated }} / {{ totalOutsideSegments }}
                              </div>
                              <div class="progress mt-2" style="width: 200px; height: 8px;">
                                <div 
                                  class="progress-bar bg-success" 
                                  role="progressbar" 
                                  :style="{ width: validationProgressPercent + '%' }"
                                  :aria-valuenow="outsideSegmentsValidated" 
                                  :aria-valuemin="0" 
                                  :aria-valuemax="totalOutsideSegments"
                                ></div>
                              </div>
                              <small class="text-muted">{{ validationProgressPercent }}% validiert</small>
                            </div>
                          </div>
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
                      <li><strong>Is PDF:</strong> {{ isPdf }}</li>
                      <li><strong>Is Video:</strong> {{ isVideo }}</li>
                      <li><strong>Detected Media Type:</strong> {{ currentItem ? mediaStore.detectMediaType(currentItem as any) : 'N/A' }}</li>
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
                
                <!-- Phase 3.1: Approval button with segment validation enforcement -->
                <button 
                  class="btn btn-success" 
                  @click="approveItem"
                  :disabled="isApproving || !canApprove"
                  :title="approvalBlockReason"
                >
                  <span v-if="isApproving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isApproving ? 'Wird bestätigt...' : 'Bestätigen' }}
                </button>
                
                <!-- Phase 3.1: Show warning if approval blocked due to unvalidated segments -->
                <div v-if="!canApprove && approvalBlockReason" class="alert alert-warning mt-2 mb-0">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  <strong>Bestätigung blockiert:</strong> {{ approvalBlockReason }}
                </div>
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
import { useAnonymizationStore, type SensitiveMeta } from '@/stores/anonymizationStore';
import {useVideoStore, type Video} from '@/stores/videoStore';
import { usePatientStore } from '@/stores/patientStore';
import { useToastStore } from '@/stores/toastStore';
import { usePdfStore } from '@/stores/pdfStore';
import { useMediaTypeStore, type MediaScope } from '@/stores/mediaTypeStore';
import OutsideTimelineComponent from '@/components/Anonymizer/OutsideSegmentComponent.vue';
import { DateConverter, DateValidator } from '@/utils/dateHelpers';
import {useRoute} from 'vue-router';

// @ts-ignore
import axiosInstance, { r } from '@/api/axiosInstance';
import { usePollingProtection } from '@/composables/usePollingProtection';

const pollingProtection = usePollingProtection();


const toast = useToastStore();
const router = useRouter();

// Store references
const anonymizationStore = useAnonymizationStore();
const videoStore = useVideoStore();
// const patientStore = usePatientStore();
// const pdfStore = usePdfStore();
const mediaStore = useMediaTypeStore();

const route = useRoute();

function restoreLast(): { fileId?: number; scope?: MediaScope } {
  const fid = Number(sessionStorage.getItem('last:fileId') || '')
  const sc  = sessionStorage.getItem('last:scope') as MediaScope | null
  return { fileId: Number.isFinite(fid) ? fid : undefined, scope: sc || undefined }
}

let fileId = Number(route.params.fileId ?? route.query.fileId)
let scope  = route.params.mediaType as MediaScope | undefined
if (!scope) scope = route.query.mediaType as MediaScope | undefined

if (!Number.isFinite(fileId) || !scope) {
  const restored = restoreLast()
  if (!Number.isFinite(fileId)) fileId = restored.fileId!
  if (!scope) scope = restored.scope
}

if (!Number.isFinite(fileId) || !scope) {
  console.error('Validation view: cannot determine fileId/scope; aborting mediaStore init.')
} else {
  mediaStore.setCurrentByKey(scope, fileId)
}

const isPdf   = computed(() => mediaStore.isPdf)   // boolean ref from store
const isVideo = computed(() => mediaStore.isVideo)



// Local state
const editedAnonymizedText = ref('');
const examinationDate = ref('');
const noMoreNames = ref(false);
const editedPatient = ref({
  patientFirstName: '',
  patientLastName: '',
  patientGenderName: '',
  patientDob: '',
  casenumber: '',
  externalId: '',
  externalIdOrigin: '',
  centerName: '',
  text: '',
  anonymizedText: '',
  examinersDisplay: '',
});

// ✨ Phase 2.2: Validation error tracking
const validationErrors = ref<string[]>([]);
const dobErrorMessage = ref<string>('');
const examDateErrorMessage = ref<string>('');
const dobDisplayFormat = ref<string>('');
const examDateDisplayFormat = ref<string>('');

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
  patientGenderName: string;
  patientDob: string; 
  casenumber: string;
  externalId?: string;
  externalIdOrigin?: string;
  centerName?: string;
  text?: string;
  anonymizedText?: string;
  examinationDate?: string;
  examinersDisplay?: string;
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
    patientGenderName: '',
    patientDob: '',
    casenumber: '',
  },
});


function shallowEqual(a: Editable, b: Editable): boolean {
  return a.patientFirstName === b.patientFirstName &&
         a.patientLastName === b.patientLastName &&
         a.patientGenderName === b.patientGenderName &&
         a.patientDob === b.patientDob &&
         a.casenumber === b.casenumber;
}

// --- add below your imports/locals ---

// ============================================================================
// DATE CONVERSION UTILITIES - Using centralized DateConverter (Phase 2.1)
// ============================================================================
// Legacy functions removed - now using DateConverter from @/utils/dateHelpers
// Migration: Oct 2025 (Phase 2.1)

function buildSensitiveMetaSnake(dobGerman: string) {
  return {
    patient_first_name: editedPatient.value.patientFirstName || '',
    patient_last_name:  editedPatient.value.patientLastName  || '',
    patient_gender:     editedPatient.value.patientGenderName    || '',
    patient_dob:        dobGerman,  // 🎯 Jetzt deutsches Format
    casenumber:         editedPatient.value.casenumber       || '',
  };
}

// ============================================================================
// COMPUTED PROPERTIES - Validation
// ============================================================================
const firstNameOk = computed(() => editedPatient.value.patientFirstName.trim().length > 0);
const lastNameOk  = computed(() => editedPatient.value.patientLastName.trim().length  > 0);

// ✨ Phase 2.1: Using centralized DateConverter
const dobISO  = computed(() => DateConverter.toISO(editedPatient.value.patientDob));
const examISO = computed(() => DateConverter.toISO(examinationDate.value));

// ✨ Phase 2.2: Validation error summary
const validationErrorSummary = computed(() => {
  const count = validationErrors.value.length;
  if (count === 0) return 'Alle Felder sind gültig';
  if (count === 1) return '1 Validierungsfehler gefunden';
  return `${count} Validierungsfehler gefunden`;
});

// DOB must be present & valid
const isDobValid = computed(() => !!dobISO.value);

// Exam optional; if present requires valid DOB and must be >= DOB
const isExaminationDateValid = computed(() => {
  if (!examISO.value) return true;
  if (!dobISO.value)  return false;
  return DateConverter.isAfterOrEqual(examISO.value, dobISO.value);
});

// Global save gates
const dataOk = computed(() =>
  firstNameOk.value && lastNameOk.value && isDobValid.value && isExaminationDateValid.value
);


const canSubmit = computed(() => {
  // For annotation saving, we need both uploaded images AND valid patient data
  return dataOk.value;
});

// ============================================================================
// Phase 3.1: Segment Validation Enforcement
// ============================================================================

/**
 * Determines if approval is allowed based on validation state.
 * Blocks approval if video has unvalidated outside segments.
 */
const canApprove = computed(() => {
  // Basic data validation must pass
  if (!dataOk.value) return false;
  
  // For videos: Check if outside segments need validation
  if (isVideo.value && shouldShowOutsideTimeline.value) {
    // Block approval until all outside segments are validated
    return false;
  }
  
  // All checks passed
  return true;
});

/**
 * Returns a user-friendly message explaining why approval is blocked.
 */
const approvalBlockReason = computed(() => {
  if (!dataOk.value) {
    const errors = [];
    if (!firstNameOk.value) errors.push('Vorname');
    if (!lastNameOk.value) errors.push('Nachname');
    if (!isDobValid.value) errors.push('gültiges Geburtsdatum');
    if (!isExaminationDateValid.value) errors.push('gültiges Untersuchungsdatum');
    return `Bitte korrigieren Sie: ${errors.join(', ')}`;
  }
  
  if (isVideo.value && shouldShowOutsideTimeline.value) {
    const remaining = totalOutsideSegments.value - outsideSegmentsValidated.value;
    return `Bitte validieren Sie zuerst alle Outside-Segmente (${remaining} verbleibend)`;
  }
  
  return '';
});

/**
 * Calculates validation progress percentage for progress bar.
 */
const validationProgressPercent = computed(() => {
  if (totalOutsideSegments.value === 0) return 0;
  return Math.round((outsideSegmentsValidated.value / totalOutsideSegments.value) * 100);
});

// ============================================================================
// End Phase 3.1
// ============================================================================


// Computed
const currentItem = computed(() => anonymizationStore.current);



// ✅ NEW: Raw video URL (original unprocessed video)
const rawVideoSrc = computed(() => {
  if (!isVideo.value || !currentItem.value) return undefined;
  
  // Build raw video URL with explicit raw parameter
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base}/api/media/videos/${fileId}/?type=raw`;
});

// ✅ NEW: Anonymized video URL (processed/anonymized video)
const anonymizedVideoSrc = computed(() => {
  if (!isVideo.value || !currentItem.value) return undefined;
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base}/api/media/videos/${fileId}/?type=processed`;
});

// ✅ NEW: Raw PDF URL (original unprocessed PDF)
const rawPdfSrc = computed(() => {
  if (!isPdf.value || !currentItem.value) return undefined;
  
  // Build raw PDF URL with explicit raw parameter
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base}/api/media/pdfs/${fileId}/stream/?type=raw`;
});

// ✅ NEW: Anonymized PDF URL (processed/anonymized PDF)
const anonymizedPdfSrc = computed(() => {
  if (!isPdf.value || !currentItem.value) return undefined;
  
  // Build anonymized PDF URL with explicit processed parameter
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base}/api/media/pdfs/${fileId}/stream/?type=processed`;
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

const downloadRawPdf = () => {
  if (!rawPdfSrc.value) {
    toast.warning({ text: 'Original-PDF nicht verfügbar.' });
    return;
  }
  
  // Open PDF in new tab for download
  window.open(rawPdfSrc.value, '_blank');
  console.log('Downloading raw PDF:', rawPdfSrc.value);
};

const downloadAnonymizedPdf = () => {
  if (!anonymizedPdfSrc.value) {
    toast.warning({ text: 'Anonymisiertes PDF nicht verfügbar.' });
    return;
  }
  
  window.open(anonymizedPdfSrc.value, '_blank');
  console.log('Downloading anonymized PDF:', anonymizedPdfSrc.value);
};

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
      const outsideSegmentsResponse = await axiosInstance.get(r(`media/videos/${currentItem.value.id}/segments/?label=outside`));
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
      await videoStore.fetchAllSegments(currentItem.value.id);
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

const loadCurrentItemData = (item: SensitiveMeta) => {
  if (!item) return;

  // ✅ NEW: Reset video validation state when loading new item
  shouldShowOutsideTimeline.value = false;
  videoValidationStatus.value = null;
  outsideSegmentsValidated.value = 0;
  totalOutsideSegments.value = 0;
  isValidatingVideo.value = false;

  const rawExam = item.examinationDate || '';
  const rawDob  = item.patientDob || '';  

  // ✨ Phase 2.1: Using DateConverter for consistent format handling
  examinationDate.value = DateConverter.toISO(rawExam) || '';

  const p: Editable = {
    patientFirstName: item.patientFirstName || '',
    patientLastName:  item.patientLastName  || '',
    patientGenderName:    item.patientGenderName    || '',
    patientDob:       DateConverter.toISO(rawDob) || '',
    casenumber:       item.casenumber       || '',
    externalId: item.externalId ?? '',
    externalIdOrigin: item.externalIdOrigin ?? '',
    centerName: item.centerName ?? '',
    text: item.text ?? '',
    anonymizedText: item.anonymizedText ?? '',
  };

  editedPatient.value = {
    ...p,
    externalId: p.externalId ?? '',
    externalIdOrigin: p.externalIdOrigin ?? '',
    centerName: p.centerName ?? '',
    text: p.text ?? '',
    anonymizedText: p.anonymizedText ?? '',
    examinersDisplay: p.examinersDisplay ?? '',
  };

  original.value = {
    anonymizedText: editedAnonymizedText.value,
    examinationDate: examinationDate.value,
    patient: { ...p },
  };
};

// Watch
watch(currentItem, (newItem) => {
  if (newItem) loadCurrentItemData(newItem);
}, { immediate: true });




const fetchNextItem = async () => {
  try {
    await anonymizationStore.fetchNext();
  } catch (error) {
    console.error('Error fetching next item:', error);
  }
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

// ============================================================================
// Phase 2.2: Date Validation Functions
// ============================================================================

/**
 * Validate all dates and update error panel
 */
function validateAllDates() {
  const validator = new DateValidator();
  
  // Clear previous errors
  validationErrors.value = [];
  dobErrorMessage.value = '';
  examDateErrorMessage.value = '';
  
  // Validate DOB
  if (editedPatient.value.patientDob) {
    const dobValue = editedPatient.value.patientDob;
    
    // Try to determine format
    if (DateConverter.validate(dobValue, 'ISO')) {
      dobDisplayFormat.value = 'ISO (YYYY-MM-DD)';
    } else if (DateConverter.validate(dobValue, 'German')) {
      dobDisplayFormat.value = 'Deutsch (DD.MM.YYYY)';
    } else {
      dobDisplayFormat.value = '';
      dobErrorMessage.value = 'Ungültiges Format. Verwenden Sie DD.MM.YYYY oder YYYY-MM-DD';
      validator.addField('Geburtsdatum', dobValue, 'German'); // Will fail
    }
  } else {
    dobDisplayFormat.value = '';
  }
  
  // Validate Exam Date
  if (examinationDate.value) {
    const examValue = examinationDate.value;
    
    // Try to determine format
    if (DateConverter.validate(examValue, 'ISO')) {
      examDateDisplayFormat.value = 'ISO (YYYY-MM-DD)';
    } else if (DateConverter.validate(examValue, 'German')) {
      examDateDisplayFormat.value = 'Deutsch (DD.MM.YYYY)';
    } else {
      examDateDisplayFormat.value = '';
      examDateErrorMessage.value = 'Ungültiges Format. Verwenden Sie DD.MM.YYYY oder YYYY-MM-DD';
      validator.addField('Untersuchungsdatum', examValue, 'ISO'); // Will fail
    }
  } else {
    examDateDisplayFormat.value = '';
  }
  
  // Validate DOB < ExamDate constraint
  if (dobISO.value && examISO.value) {
    validator.addConstraint(
      'DOB_BEFORE_EXAM',
      DateConverter.isBeforeOrEqual(dobISO.value, examISO.value),
      'Geburtsdatum muss vor oder am selben Tag wie das Untersuchungsdatum liegen'
    );
  }
  
  // Update validation errors
  if (validator.hasErrors()) {
    validationErrors.value = validator.getErrors();
    
    // Set specific error messages
    const errors = validator.getErrors();
    errors.forEach(error => {
      if (error.includes('Geburtsdatum')) {
        dobErrorMessage.value = error.replace('Geburtsdatum: ', '');
      }
      if (error.includes('Untersuchungsdatum')) {
        examDateErrorMessage.value = error.replace('Untersuchungsdatum: ', '');
      }
    });
  }
}

/**
 * Handle DOB blur event - validate and convert format
 */
function onDobBlur() {
  const value = editedPatient.value.patientDob;
  if (!value) return;
  
  // Try to convert to ISO for consistent storage
  const isoDate = DateConverter.toISO(value);
  if (isoDate) {
    editedPatient.value.patientDob = isoDate;
    dobDisplayFormat.value = 'ISO (YYYY-MM-DD)';
  }
  
  // Validate all dates
  validateAllDates();
}

/**
 * Handle Exam Date blur event - validate and convert format
 */
function onExamDateBlur() {
  const value = examinationDate.value;
  if (!value) return;
  
  // Try to convert to ISO for consistent storage
  const isoDate = DateConverter.toISO(value);
  if (isoDate) {
    examinationDate.value = isoDate;
    examDateDisplayFormat.value = 'ISO (YYYY-MM-DD)';
  }
  
  // Validate all dates
  validateAllDates();
}

/**
 * Clear all validation errors
 */
function clearValidationErrors() {
  validationErrors.value = [];
  dobErrorMessage.value = '';
  examDateErrorMessage.value = '';
}

// ============================================================================
// End Phase 2.2
// ============================================================================


const skipItem = async () => {
  if (currentItem.value) {
    await fetchNextItem();
  }
};

const navigateToSegmentation = () => {
  if (!currentItem.value) {
    toast.error({ text: 'Kein Video zur Segmentierung ausgewählt.' });
    return;
  }
  
  // Navigate with video ID as query parameter to ensure correct video selection
  router.push({ 
    name: 'Video-Untersuchung', 
    query: { video: currentItem.value.id.toString() }
  });
  
  console.log(`🎯 Navigating to Video-Untersuchung with video ID: ${currentItem.value.id}`);
};


const approveItem = async () => {
  if (!currentItem.value || !canSave.value || isApproving.value) return;
  
  // ============================================================================
  // Phase 3.1: Segment Validation Enforcement
  // ============================================================================
  
  // Additional safety check: Prevent approval if outside segments not validated
  if (!canApprove.value) {
    const reason = approvalBlockReason.value;
    console.warn(`❌ Approval blocked: ${reason}`);
    toast.warning({ text: reason });
    return;
  }
  
  // For videos with outside segments: Ensure validation was completed
  if (isVideo.value && shouldShowOutsideTimeline.value) {
    console.warn('❌ Outside segments still pending validation');
    toast.error({ 
      text: 'Bitte validieren Sie zuerst alle Outside-Segmente, bevor Sie das Video bestätigen.' 
    });
    return;
  }
  
  // ============================================================================
  // End Phase 3.1
  // ============================================================================
  
  isApproving.value = true;
  try {
 
    console.log(`Validating anonymization for file ${currentItem.value.id}...`);
    try {
      await axiosInstance.post(r(`anonymization/${currentItem.value.id}/validate/`), {
          patient_first_name: editedPatient.value.patientFirstName,
          patient_last_name:  editedPatient.value.patientLastName,
          patient_gender:     editedPatient.value.patientGenderName,
          patient_dob:        DateConverter.toGerman(dobISO.value || '') || '',          // 🎯 Phase 2.1: SENDE DEUTSCHES FORMAT
          examination_date:   DateConverter.toGerman(examISO.value || '') || '',         // 🎯 Phase 2.1: SENDE DEUTSCHES FORMAT
          casenumber:         editedPatient.value.casenumber || "",
          anonymized_text:    isPdf.value ? editedAnonymizedText.value : undefined,
          is_verified:        true,
          file_type:         isPdf.value ? 'pdf' : isVideo.value ? 'video' : 'unknown',
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
  if (isSaving.value) {
    return; // Already saving
  }
  
  if (!canSubmit.value) {
    // Provide more specific error messages
    if (!processedUrl.value || !originalUrl.value) {
      toast.error({ text: 'Bitte laden Sie zuerst Bilder hoch (Original und bearbeitetes Bild).' });
    } else if (!dataOk.value) {
      // Specific validation errors
      const errors = [];
      if (!firstNameOk.value) errors.push('Vorname');
      if (!lastNameOk.value) errors.push('Nachname');
      if (!isDobValid.value) errors.push('gültiges Geburtsdatum');
      if (!isExaminationDateValid.value) errors.push('gültiges Untersuchungsdatum (darf nicht vor Geburtsdatum liegen)');
      
      toast.error({ text: `Bitte korrigieren Sie: ${errors.join(', ')}` });
    }
    return;
  }
  
  isSaving.value = true;
  try {
    const annotationData = {
      processed_image_url: processedUrl.value,
      patient_data: buildSensitiveMetaSnake(DateConverter.toGerman(dobISO.value || '') || ''),  // 🎯 Phase 2.1: DEUTSCHES FORMAT
      examinationDate: DateConverter.toGerman(examISO.value || '') || '',                       // 🎯 Phase 2.1: DEUTSCHES FORMAT
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
    try {

      router.push({ name: 'Anonymisierung Korrektur', params: { fileId: currentItem.value.id.toString() } });
      // approveItem will navigate to next item, so we need to return
      toast.info({ text: 'Änderungen gespeichert. Bitte wählen Sie das Element erneut für die Korrektur aus.' });
      return;
    } catch (error) {
      toast.error({ text: 'Fehler beim Speichern. Korrektur-Navigation abgebrochen.' });
      return;
    }
};


// Lifecycle
onMounted(async () => {
  const id = Number(fileId)
  const scope = (mediaStore.currentMediaType as MediaScope) ?? 'unknown'
  mediaStore.setCurrentByKey(scope, id)
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

/* Dual Video/PDF Container Styles */
.dual-video-container .video-section,
.dual-pdf-container .pdf-section {
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  padding: 1rem;
  background-color: #f8f9fa;
}

.dual-video-container .video-section.raw-video,
.dual-pdf-container .pdf-section.raw-pdf {
  border-color: #dc3545;
  background-color: #fff5f5;
}

.dual-video-container .video-section.anonymized-video,
.dual-pdf-container .pdf-section.anonymized-pdf {
  border-color: #198754;
  background-color: #f0fff4;
}

/* PDF-specific styling */
.dual-pdf-container .pdf-section iframe {
  border: 2px solid #dee2e6;
  border-radius: 0.25rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.dual-pdf-container .pdf-section.raw-pdf iframe {
  border-color: #dc3545;
}

.dual-pdf-container .pdf-section.anonymized-pdf iframe {
  border-color: #198754;
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
