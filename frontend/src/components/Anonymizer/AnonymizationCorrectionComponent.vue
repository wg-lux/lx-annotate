<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0 d-flex justify-content-between align-items-center">
        <h4 class="mb-0">Anonymisierungskorrektur</h4>
        <div class="d-flex gap-2">
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="goBack"
          >
            <i class="fas fa-arrow-left me-1"></i>
            Zurück zur Übersicht
          </button>
          <button 
            class="btn btn-outline-primary btn-sm"
            @click="refreshCurrentVideo"
            :disabled="isRefreshing"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isRefreshing }"></i>
            Aktualisieren
          </button>
        </div>
      </div>

      <div class="card-body">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Wird geladen...</span>
          </div>
          <p class="mt-2">Datei wird geladen...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ error }}
        </div>

        <!-- No File Selected -->
        <div v-else-if="!currentVideo" class="alert alert-info" role="alert">
          <i class="fas fa-info-circle me-2"></i>
          Keine Datei ausgewählt. Bitte wählen Sie eine Datei aus der Übersicht aus.
        </div>

        <!-- Main Content -->
        <template v-else>
          <template v-if="isPdfCorrection">
            <!-- PDF Information -->
            <div class="row mb-4">
              <div class="col-12">
                <div class="card bg-light">
                  <div class="card-body">
                    <div class="row">
                      <div class="col-md-8">
                        <h5 class="card-title">{{ currentVideo.filename }}</h5>
                        <p class="mb-1"><strong>Status:</strong>
                          <span :class="getStatusBadgeClass(currentVideo.anonymizationStatus)" class="badge ms-1">
                            {{ getStatusText(currentVideo.anonymizationStatus) }}
                          </span>
                        </p>
                        <p class="mb-1"><strong>Größe:</strong> {{ formatFileSize(currentVideo.fileSize ?? null) }}</p>
                        <p class="mb-0"><strong>Erstellt:</strong> {{ formatDate(currentVideo.createdAt) }}</p>
                      </div>
                      <div class="col-md-4 text-end">
                        <div class="d-flex flex-column gap-2">
                          <button
                            class="btn btn-outline-primary btn-sm"
                            @click="reloadPdfDocument"
                            :disabled="isRenderingPdf"
                          >
                            <i class="fas fa-file-pdf me-1"></i>
                            PDF neu laden
                          </button>
                          <button
                            class="btn btn-success btn-sm"
                            @click="generateRedactedPdf"
                            :disabled="isRenderingPdf || totalPdfBoxCount === 0"
                          >
                            <i class="fas fa-shield-alt me-1"></i>
                            Anonymisierte PDF erzeugen
                          </button>
                          <button
                            class="btn btn-outline-success btn-sm"
                            @click="downloadRedactedPdf"
                            :disabled="!redactedPdfUrl"
                          >
                            <i class="fas fa-download me-1"></i>
                            PDF herunterladen
                          </button>
                          <button
                            class="btn btn-outline-info btn-sm"
                            @click="uploadRedactedPdf"
                            :disabled="!redactedPdfBytes || isProcessing"
                          >
                            <i class="fas fa-upload me-1"></i>
                            Als neue Datei hochladen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PDF Editor -->
            <div class="row g-3">
              <div class="col-xl-9">
                <div class="card h-100">
                  <div class="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
                    <h5 class="mb-0">PDF Redaktion</h5>
                    <div class="d-flex align-items-center gap-2">
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        @click="previousPdfPage"
                        :disabled="activePdfPage <= 1 || isRenderingPdf"
                      >
                        <i class="fas fa-chevron-left"></i>
                      </button>
                      <span class="small text-muted">Seite {{ activePdfPage }} / {{ pdfPageCount || 1 }}</span>
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        @click="nextPdfPage"
                        :disabled="activePdfPage >= pdfPageCount || isRenderingPdf"
                      >
                        <i class="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <div class="card-body">
                    <div class="mb-3 d-flex flex-wrap gap-2 align-items-center">
                      <label class="form-label mb-0">Zoom:</label>
                      <input
                        type="range"
                        min="0.75"
                        max="2.5"
                        step="0.25"
                        v-model.number="pdfScale"
                        class="form-range pdf-zoom-range"
                      >
                      <span class="small text-muted">{{ Math.round(pdfScale * 100) }}%</span>
                    </div>

                    <div v-if="isRenderingPdf" class="text-center py-5">
                      <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Wird geladen...</span>
                      </div>
                      <p class="mt-2 mb-0">PDF-Seite wird gerendert...</p>
                    </div>

                    <div v-else-if="pdfRenderError" class="alert alert-danger mb-0" role="alert">
                      {{ pdfRenderError }}
                    </div>

                    <div v-else class="pdf-editor-stage">
                      <canvas ref="pdfPageCanvas" class="pdf-page-canvas"></canvas>
                      <canvas
                        ref="pdfOverlayCanvas"
                        class="pdf-overlay-canvas"
                        @mousedown="onPdfOverlayMouseDown"
                        @mousemove="onPdfOverlayMouseMove"
                        @mouseup="onPdfOverlayMouseUp"
                        @mouseleave="onPdfOverlayMouseLeave"
                      ></canvas>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-xl-3">
                <div class="card h-100">
                  <div class="card-header">
                    <h5 class="mb-0">Werkzeuge</h5>
                  </div>
                  <div class="card-body d-flex flex-column gap-3">
                    <div>
                      <p class="mb-1"><strong>Aktive Seite:</strong> {{ getCurrentPageBoxCount() }} Boxen</p>
                      <p class="mb-0"><strong>Gesamt:</strong> {{ totalPdfBoxCount }} Boxen</p>
                    </div>
                    <button
                      class="btn btn-outline-secondary btn-sm"
                      @click="undoLastPdfBox"
                      :disabled="getCurrentPageBoxCount() === 0"
                    >
                      <i class="fas fa-undo me-1"></i>
                      Letzte Box entfernen
                    </button>
                    <button
                      class="btn btn-outline-warning btn-sm"
                      @click="clearCurrentPdfPageBoxes"
                      :disabled="getCurrentPageBoxCount() === 0"
                    >
                      <i class="fas fa-eraser me-1"></i>
                      Seite leeren
                    </button>
                    <button
                      class="btn btn-outline-danger btn-sm"
                      @click="clearAllPdfBoxes"
                      :disabled="totalPdfBoxCount === 0"
                    >
                      <i class="fas fa-trash me-1"></i>
                      Alle Boxen löschen
                    </button>
                    <hr class="my-2">
                    <p class="small text-muted mb-0">
                      Zeichnen Sie mit gedrückter Maustaste schwarze Rechtecke über sensible Inhalte.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="redactedPdfUrl" class="row mt-4">
              <div class="col-12">
                <div class="card">
                  <div class="card-header">
                    <h5 class="mb-0">Vorschau der anonymisierten PDF</h5>
                  </div>
                  <div class="card-body">
                    <iframe
                      :src="redactedPdfUrl"
                      class="pdf-preview-frame"
                      title="Anonymisierte PDF Vorschau"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <!-- Video Information -->
          <div class="row mb-4">
            <div class="col-12">
              <div class="card bg-light">
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-8">
                      <h5 class="card-title">{{ currentVideo.filename }}</h5>
                      <div class="row">
                        <div class="col-sm-6">
                          <p class="mb-1"><strong>Status:</strong> 
                            <span :class="getStatusBadgeClass(currentVideo.anonymizationStatus)" class="badge ms-1">
                              {{ getStatusText(currentVideo.anonymizationStatus) }}
                            </span>
                          </p>
                          <p class="mb-1"><strong>Größe:</strong> {{ formatFileSize(currentVideo.fileSize ?? null) }}</p>
                          <p class="mb-1"><strong>Erstellt:</strong> {{ formatDate(currentVideo.createdAt) }}</p>
                        </div>
                        <div class="col-sm-6">
                          <p class="mb-1"><strong>Sensitive Frames:</strong> {{ videoMetadata.sensitiveFrameCount || 'Unbekannt' }}</p>
                          <p class="mb-1"><strong>Gesamte Frames:</strong> {{ videoMetadata.totalFrames || 'Unbekannt' }}</p>
                          <p class="mb-1"><strong>Sensitive Ratio:</strong> 
                            <span :class="getSensitivityBadgeClass(videoMetadata.sensitiveRatio)">
                              {{ formatPercentage(videoMetadata.sensitiveRatio) }}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4 text-end">
                      <div class="d-flex flex-column gap-2">
                        <button 
                          class="btn btn-outline-info btn-sm"
                          @click="analyzeVideo"
                          :disabled="isProcessing"
                        >
                          <i class="fas fa-search me-1"></i>
                          Video analysieren
                        </button>
                        <button 
                          class="btn btn-outline-warning btn-sm"
                          @click="reprocessVideo"
                          :disabled="isProcessing"
                        >
                          <i class="fas fa-redo me-1"></i>
                          Erneut verarbeiten
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Video Correction Options -->
          <div class="row mb-4">
            <div class="col-md-6">
              <!-- Masking Section -->
              <div class="card h-100">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-mask me-2"></i>
                    Video Maskierung
                  </h5>
                </div>
                <div class="card-body">
                  <p class="text-muted mb-3">
                    Empfohlen bei hoher Sensitivität (>10%). Verdeckt sensible Bereiche dauerhaft.
                  </p>
                  
                  <!-- Mask Configuration -->
                  <div class="mb-3">
                    <label class="form-label">Maskierungstyp:</label>
                    <select v-model="maskConfig.type" class="form-select">
                      <option value="device_default">Gerätespezifische Maske</option>
                      <option value="roi_based">ROI-basierte Maske</option>
                      <option value="custom">Benutzerdefiniert</option>
                    </select>
                  </div>

                  <div v-if="maskConfig.type === 'device_default'" class="mb-3">
                    <label class="form-label">Endoskop-Gerät:</label>
                    <select v-model="maskConfig.deviceName" class="form-select">
                      <option value="olympus_cv_1500">Olympus CV-1500</option>
                      <option value="olympus_cv_190">Olympus CV-190</option>
                      <option value="pentax_epk_i7010">Pentax EPK-i7010</option>
                      <option value="fujifilm_vp_4450hd">Fujifilm VP-4450HD</option>
                    </select>
                  </div>

                  <div v-if="maskConfig.type === 'custom'" class="mb-3">
                    <div class="row">
                      <div class="col-6">
                        <label class="form-label">Endoskop X:</label>
                        <input type="number" v-model.number="maskConfig.endoscopeX" class="form-control" min="0">
                      </div>
                      <div class="col-6">
                        <label class="form-label">Endoskop Y:</label>
                        <input type="number" v-model.number="maskConfig.endoscopeY" class="form-control" min="0">
                      </div>
                    </div>
                    <div class="row mt-2">
                      <div class="col-6">
                        <label class="form-label">Breite:</label>
                        <input type="number" v-model.number="maskConfig.endoscopeWidth" class="form-control" min="1">
                      </div>
                      <div class="col-6">
                        <label class="form-label">Höhe:</label>
                        <input type="number" v-model.number="maskConfig.endoscopeHeight" class="form-control" min="1">
                      </div>
                    </div>
                  </div>

                  <!-- Processing Method -->
                  <div class="mb-3">
                    <label class="form-label">Verarbeitungsmethode:</label>
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="radio" 
                        v-model="maskConfig.processingMethod" 
                        value="streaming"
                        id="maskStreaming"
                      >
                      <label class="form-check-label" for="maskStreaming">
                        <strong>Streaming (Empfohlen)</strong> - Schnelle Verarbeitung mit Named Pipes
                      </label>
                    </div>
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="radio" 
                        v-model="maskConfig.processingMethod" 
                        value="direct"
                        id="maskDirect"
                      >
                      <label class="form-check-label" for="maskDirect">
                        Direkte Verarbeitung - Für spezielle Anforderungen
                      </label>
                    </div>
                  </div>

                  <button 
                    class="btn btn-warning w-100"
                    @click="applyMasking"
                    :disabled="isProcessing || !canApplyMask"
                  >
                    <i class="fas fa-mask me-2"></i>
                    <span v-if="isProcessing && currentOperation === 'masking'">
                      <i class="fas fa-spinner fa-spin me-1"></i>
                      Maskierung wird angewendet...
                    </span>
                    <span v-else>
                      Maskierung anwenden
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <!-- Frame Removal Section -->
              <div class="card h-100">
                <div class="card-header">
                  <h5 class="mb-0">
                    <i class="fas fa-cut me-2"></i>
                    Frame-Entfernung
                  </h5>
                </div>
                <div class="card-body">
                  <p class="text-muted mb-3">
                    Empfohlen bei niedriger Sensitivität (≤10%). Entfernt einzelne sensible Frames.
                  </p>
                  
                  <!-- Frame Selection Method -->
                  <div class="mb-3">
                    <label class="form-label">Frame-Auswahl:</label>
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="radio" 
                        v-model="frameConfig.selectionMethod" 
                        value="automatic"
                        id="frameAutomatic"
                      >
                      <label class="form-check-label" for="frameAutomatic">
                        <strong>Automatisch</strong> - KI-basierte Erkennung sensibler Frames
                      </label>
                    </div>
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="radio" 
                        v-model="frameConfig.selectionMethod" 
                        value="manual"
                        id="frameManual"
                      >
                      <label class="form-check-label" for="frameManual">
                        Manuell - Eigene Frame-Liste eingeben
                      </label>
                    </div>
                  </div>

                  <div v-if="frameConfig.selectionMethod === 'manual'" class="mb-3">
                    <label class="form-label">Frame-Nummern (kommagetrennt):</label>
                    <textarea 
                      v-model="frameConfig.manualFrames" 
                      class="form-control" 
                      rows="3"
                      placeholder="z.B. 10,25,30-35,100"
                    ></textarea>
                    <small class="form-text text-muted">
                      Unterstützt einzelne Frames (10) und Bereiche (30-35)
                    </small>
                  </div>

                  <!-- Detection Settings for Automatic Mode -->
                  <div v-if="frameConfig.selectionMethod === 'automatic'" class="mb-3">
                    <label class="form-label">Erkennungs-Engine:</label>
                    <select v-model="frameConfig.detectionEngine" class="form-select">
                      <option value="minicpm">MiniCPM-o 2.6 (Empfohlen)</option>
                      <option value="traditional">Traditionell (OCR + LLM)</option>
                      <option value="hybrid">Hybrid (Beide kombiniert)</option>
                    </select>
                  </div>

                  <!-- Processing Method -->
                  <div class="mb-3">
                    <label class="form-label">Verarbeitungsmethode:</label>
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="radio" 
                        v-model="frameConfig.processingMethod" 
                        value="streaming"
                        id="frameStreaming"
                      >
                      <label class="form-check-label" for="frameStreaming">
                        <strong>Streaming (Empfohlen)</strong> - Bis zu 10x schneller
                      </label>
                    </div>
                    <div class="form-check">
                      <input 
                        class="form-check-input" 
                        type="radio" 
                        v-model="frameConfig.processingMethod" 
                        value="traditional"
                        id="frameTraditional"
                      >
                      <label class="form-check-label" for="frameTraditional">
                        Traditionell - Für Kompatibilität
                      </label>
                    </div>
                  </div>

                  <button 
                    class="btn btn-danger w-100"
                    @click="removeFrames"
                    :disabled="isProcessing || !canRemoveFrames"
                  >
                    <i class="fas fa-cut me-2"></i>
                    <span v-if="isProcessing && currentOperation === 'frame_removal'">
                      <i class="fas fa-spinner fa-spin me-1"></i>
                      Frames werden entfernt...
                    </span>
                    <span v-else>
                      Frames entfernen
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Processing Status -->
          <div v-if="isProcessing" class="row mb-4">
            <div class="col-12">
              <div class="card border-warning">
                <div class="card-body">
                  <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm text-warning me-3" role="status">
                      <span class="visually-hidden">Verarbeitung...</span>
                    </div>
                    <div class="flex-grow-1">
                      <h6 class="mb-1">{{ getOperationText(currentOperation) }}</h6>
                      <div class="progress" style="height: 8px;">
                        <div 
                          class="progress-bar progress-bar-striped progress-bar-animated" 
                          :style="{ width: processingProgress + '%' }"
                        ></div>
                      </div>
                      <small class="text-muted mt-1">{{ processingStatus }}</small>
                    </div>
                    <button 
                      class="btn btn-outline-danger btn-sm"
                      @click="cancelProcessing"
                    >
                      <i class="fas fa-times me-1"></i>
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Video Preview -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Video-Vorschau</h5>
                  <div class="d-flex gap-2 mt-2">
                    <button 
                      class="btn btn-sm"
                      :class="previewMode === 'original' ? 'btn-primary' : 'btn-outline-primary'"
                      @click="previewMode = 'original'"
                    >
                      Original
                    </button>
                    <button 
                      class="btn btn-sm"
                      :class="previewMode === 'processed' ? 'btn-primary' : 'btn-outline-primary'"
                      @click="previewMode = 'processed'"
                      :disabled="!hasProcessedVersion"
                    >
                      Verarbeitet
                    </button>
                  </div>
                </div>
                <div class="card-body">
                  <div class="video-container">
                    <video
                      ref="videoElement"
                      controls
                      width="100%"
                      height="600px"
                      :src="getVideoUrl()"
                      @error="onVideoError"
                      @loadstart="onVideoLoadStart"
                      @canplay="onVideoCanPlay"
                    >
                      Ihr Browser unterstützt dieses Video-Format nicht.
                    </video>
                  </div>
                  
                  <!-- Video Controls -->
                  <div class="mt-3 d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-2">
                      <button class="btn btn-outline-secondary btn-sm" @click="seekVideo(-10)">
                        <i class="fas fa-backward me-1"></i>
                        -10s
                      </button>
                      <button class="btn btn-outline-secondary btn-sm" @click="seekVideo(10)">
                        <i class="fas fa-forward me-1"></i>
                        +10s
                      </button>
                    </div>
                    <div class="text-muted">
                      <small>{{ previewMode === 'original' ? 'Original-Video' : 'Verarbeitetes Video' }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Processing History -->
          <div class="row mt-4" v-if="processingHistory.length">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0">Verarbeitungsverlauf</h5>
                </div>
                <div class="card-body">
                  <div class="table-responsive">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th>Zeitstempel</th>
                          <th>Operation</th>
                          <th>Status</th>
                          <th>Details</th>
                          <th>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="entry in processingHistory" :key="entry.id">
                          <td>{{ formatDate(entry.timestamp) }}</td>
                          <td>
                            <span class="badge" :class="getOperationBadgeClass(entry.operation)">
                              {{ getOperationText(entry.operation) }}
                            </span>
                          </td>
                          <td>
                            <span class="badge" :class="getStatusBadgeClass(entry.status)">
                              {{ getStatusText(entry.status) }}
                            </span>
                          </td>
                          <td>
                            <small class="text-muted">{{ entry.details }}</small>
                          </td>
                          <td>
                            <button 
                              v-if="entry.status === 'success' && entry.outputPath"
                              class="btn btn-outline-primary btn-sm"
                              @click="downloadResult(entry.outputPath)"
                            >
                              <i class="fas fa-download"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAnonymizationStore, type FileItem } from '@/stores/anonymizationStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import axiosInstance, { r } from '@/api/axiosInstance';

// Composables
const router = useRouter();
const route = useRoute();
const anonymizationStore = useAnonymizationStore();
const mediaStore = useMediaTypeStore();

// Reactive state
const loading = ref(false);
const error = ref('');
const isRefreshing = ref(false);
const isProcessing = ref(false);
const currentOperation = ref('');
const processingProgress = ref(0);
const processingStatus = ref('');
const previewMode = ref<'original' | 'processed'>('original');
const videoElement = ref<HTMLVideoElement | null>(null);

// Video data from anonymization store
const currentVideo = ref<any | null>(null);
const videoDetailData = ref<any | null>(null);
const videoMetadata = ref({
  sensitiveFrameCount: null as number | null,
  totalFrames: null as number | null,
  sensitiveRatio: null as number | null,
  duration: null as number | null,
  resolution: null as string | null
});

// Patient data for correction
const editedPatient = ref({
  patientFirstName: '',
  patientLastName: '',
  patientGender: '',
  patientDob: '',
  casenumber: '',
  examiner: '',
  centerName: '',
  endoscopeType: '',
  endoscopeSn: ''
});

const examinationDate = ref('');
const usesPseudonyms = ref(false);
const pseudonymMapping = ref({
  firstNamePseudonym: '',
  lastNamePseudonym: '',
  originalFirstName: '',
  originalLastName: ''
});

// Configuration for masking
const maskConfig = ref({
  type: 'device_default' as 'device_default' | 'roi_based' | 'custom',
  deviceName: 'olympus_cv_1500',
  processingMethod: 'streaming' as 'streaming' | 'direct',
  endoscopeX: 550,
  endoscopeY: 0,
  endoscopeWidth: 1350,
  endoscopeHeight: 1080
});

// Configuration for frame removal
const frameConfig = ref({
  selectionMethod: 'automatic' as 'automatic' | 'manual',
  detectionEngine: 'minicpm' as 'minicpm' | 'traditional' | 'hybrid',
  processingMethod: 'streaming' as 'streaming' | 'traditional',
  manualFrames: ''
});

// Processing history
const processingHistory = ref<Array<{
  id: number;
  timestamp: string;
  operation: string;
  status: string;
  details: string;
  outputPath?: string;
}>>([]);

type CorrectionMediaType = 'video' | 'pdf';
type PdfRedactionBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const pdfPageCanvas = ref<HTMLCanvasElement | null>(null);
const pdfOverlayCanvas = ref<HTMLCanvasElement | null>(null);
const pdfRenderError = ref('');
const isRenderingPdf = ref(false);
const pdfPageCount = ref(0);
const activePdfPage = ref(1);
const pdfScale = ref(1.25);
const pdfPageBoxes = ref<Record<number, PdfRedactionBox[]>>({});
const pdfSourceBytes = ref<Uint8Array | null>(null);
const redactedPdfBytes = ref<Uint8Array | null>(null);
const redactedPdfUrl = ref('');
const isDrawingPdfBox = ref(false);
const drawStart = ref<{ x: number; y: number } | null>(null);
const drawCurrent = ref<{ x: number; y: number } | null>(null);

let pdfJsLib: any = null;
let pdfDocument: any = null;

// Computed properties
const canApplyMask = computed(() => {
  return currentVideo.value && !isProcessing.value && 
    (maskConfig.value.type !== 'custom' || 
     (maskConfig.value.endoscopeX >= 0 && maskConfig.value.endoscopeY >= 0 &&
      maskConfig.value.endoscopeWidth > 0 && maskConfig.value.endoscopeHeight > 0));
});

const canRemoveFrames = computed(() => {
  return currentVideo.value && !isProcessing.value &&
    (frameConfig.value.selectionMethod !== 'manual' || 
     frameConfig.value.manualFrames.trim().length > 0);
});

const hasProcessedVersion = computed(() => {
  return processingHistory.value.some(entry => 
    entry.status === 'success' && entry.outputPath
  );
});

// Props interface for route params
interface Props {
  fileId: number;
  mediaType?: string;
}

const props = defineProps<Props>();

const resolvedMediaType = computed<CorrectionMediaType>(() => {
  const routeMediaType = String(route.query.mediaType || '').toLowerCase();
  const propsMediaType = String(props.mediaType || '').toLowerCase();
  const explicit = propsMediaType || routeMediaType;
  if (explicit === 'pdf') return 'pdf';
  if (explicit === 'video') return 'video';

  const fromOverview = anonymizationStore.overview.find((item) => item.id === props.fileId);
  if (fromOverview?.mediaType === 'pdf') return 'pdf';
  if (fromOverview?.mediaType === 'video') return 'video';

  const currentFilename = String(currentVideo.value?.filename || '').toLowerCase();
  if (currentFilename.endsWith('.pdf')) return 'pdf';
  return 'video';
});

const isPdfCorrection = computed(() => resolvedMediaType.value === 'pdf');

const totalPdfBoxCount = computed(() => {
  return Object.values(pdfPageBoxes.value).reduce((acc, boxes) => acc + boxes.length, 0);
});

// Methods
const goBack = () => {
  router.push('/anonymisierung/uebersicht');
};

const refreshCurrentVideo = async () => {
  if (!currentVideo.value) {
    currentVideo.value = { id: props.fileId } as FileItem;
  } else {
    currentVideo.value.id = props.fileId;
  }
  
  isRefreshing.value = true;
  try {
    await loadCurrentItemDetails(currentVideo.value.id);
  } 
  finally {
    isRefreshing.value = false;
  }
};

const loadCurrentItemDetails = async (fileId: number) => {
  if (isPdfCorrection.value) {
    await loadPdfDetails(fileId);
    return;
  }
  await loadVideoDetails(fileId);
};

const loadPdfDetails = async (pdfId: number) => {
  loading.value = true;
  error.value = '';
  pdfRenderError.value = '';
  pdfDocument = null;
  pdfPageBoxes.value = {};
  pdfPageCount.value = 0;
  activePdfPage.value = 1;
  redactedPdfBytes.value = null;
  if (redactedPdfUrl.value) {
    URL.revokeObjectURL(redactedPdfUrl.value);
    redactedPdfUrl.value = '';
  }

  try {
    const response = await axiosInstance.get(r(`media/pdfs/${pdfId}/`));
    const details = response.data || {};

    currentVideo.value = {
      id: pdfId,
      mediaType: 'pdf',
      filename: details.filename || `document_${pdfId}.pdf`,
      anonymizationStatus: details.is_validated ? 'validated' : 'done_processing_anonymization',
      fileSize: details.file_size ?? null,
      createdAt: details.uploaded_at || null,
    };

    mediaStore.setCurrentByKey('pdf', pdfId);
    await loadPdfDocument(pdfId);
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Laden der PDF-Details';
    console.error('Error loading pdf details:', err);
  } finally {
    loading.value = false;
  }
};

const loadVideoDetails = async (videoId: number) => {
  loading.value = true;
  error.value = '';
  
  try {
    // Load video metadata and processing history
    const [videoResponse, metadataResponse, historyResponse] = await Promise.all([
      axiosInstance.get(r(`media/videos/video-correction/${videoId}`)),
      axiosInstance.get(r(`media/videos/${videoId}/metadata/`)),
      axiosInstance.get(r(`media/videos/${videoId}/processing-history/`))
    ]);
    
    currentVideo.value = videoResponse.data;
    videoMetadata.value = metadataResponse.data;
    processingHistory.value = historyResponse.data;
    
    // Update MediaStore with current video for consistent type detection
    if (currentVideo.value) {
      mediaStore.setCurrentItem(currentVideo.value as any);
    }
    
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Laden der Video-Details';
    console.error('Error loading video details:', err);
  } finally {
    loading.value = false;
  }
};

const ensurePdfJs = async () => {
  if (pdfJsLib) return;
  const [pdfModule, workerModule] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfModule.GlobalWorkerOptions.workerSrc = workerModule.default;
  pdfJsLib = pdfModule;
};

const loadPdfDocument = async (pdfId: number) => {
  isRenderingPdf.value = true;
  pdfRenderError.value = '';
  try {
    await ensurePdfJs();
    const response = await axiosInstance.get(r(`media/pdfs/${pdfId}/stream/`), {
      params: { type: 'raw' },
      responseType: 'arraybuffer',
    });

    const source = new Uint8Array(response.data);
    pdfSourceBytes.value = source;
    const loadingTask = pdfJsLib.getDocument({ data: source });
    pdfDocument = await loadingTask.promise;
    pdfPageCount.value = pdfDocument.numPages;
    activePdfPage.value = 1;
    await renderCurrentPdfPage();
  } catch (err: any) {
    pdfRenderError.value = 'PDF konnte nicht geladen werden.';
    console.error('Error loading PDF document:', err);
  } finally {
    isRenderingPdf.value = false;
  }
};

const reloadPdfDocument = async () => {
  if (!currentVideo.value) return;
  await loadPdfDocument(currentVideo.value.id);
};

const getCurrentPageBoxCount = () => {
  return (pdfPageBoxes.value[activePdfPage.value] || []).length;
};

const normalizeRect = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return { x, y, width, height };
};

const drawPdfOverlay = () => {
  const overlay = pdfOverlayCanvas.value;
  if (!overlay) return;
  const ctx = overlay.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.fillStyle = '#000000';

  const boxes = pdfPageBoxes.value[activePdfPage.value] || [];
  for (const box of boxes) {
    ctx.fillRect(
      box.x * overlay.width,
      box.y * overlay.height,
      box.width * overlay.width,
      box.height * overlay.height
    );
  }

  if (isDrawingPdfBox.value && drawStart.value && drawCurrent.value) {
    const preview = normalizeRect(drawStart.value, drawCurrent.value);
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(preview.x, preview.y, preview.width, preview.height);
    ctx.strokeRect(preview.x, preview.y, preview.width, preview.height);
    ctx.restore();
  }
};

const renderCurrentPdfPage = async () => {
  if (!pdfDocument || !pdfPageCanvas.value || !pdfOverlayCanvas.value) return;

  isRenderingPdf.value = true;
  pdfRenderError.value = '';
  try {
    const page = await pdfDocument.getPage(activePdfPage.value);
    const viewport = page.getViewport({ scale: pdfScale.value });

    const canvas = pdfPageCanvas.value;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('PDF canvas context not available');
    }

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const renderContext = {
      canvasContext: context,
      viewport,
    };
    await page.render(renderContext).promise;

    const overlay = pdfOverlayCanvas.value;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.style.width = canvas.style.width;
    overlay.style.height = canvas.style.height;
    drawPdfOverlay();
  } catch (err: any) {
    pdfRenderError.value = 'PDF-Seite konnte nicht gerendert werden.';
    console.error('Error rendering PDF page:', err);
  } finally {
    isRenderingPdf.value = false;
  }
};

const getOverlayPoint = (event: MouseEvent) => {
  const overlay = pdfOverlayCanvas.value;
  if (!overlay) {
    return null;
  }
  const bounds = overlay.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return null;
  }
  const x = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
  const y = Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height);
  return { x, y, width: bounds.width, height: bounds.height };
};

const onPdfOverlayMouseDown = (event: MouseEvent) => {
  if (isRenderingPdf.value) return;
  const point = getOverlayPoint(event);
  if (!point) return;
  isDrawingPdfBox.value = true;
  drawStart.value = { x: point.x, y: point.y };
  drawCurrent.value = { x: point.x, y: point.y };
  drawPdfOverlay();
};

const onPdfOverlayMouseMove = (event: MouseEvent) => {
  if (!isDrawingPdfBox.value) return;
  const point = getOverlayPoint(event);
  if (!point) return;
  drawCurrent.value = { x: point.x, y: point.y };
  drawPdfOverlay();
};

const finishPdfBoxDrawing = () => {
  const overlay = pdfOverlayCanvas.value;
  if (!overlay || !drawStart.value || !drawCurrent.value) {
    isDrawingPdfBox.value = false;
    drawStart.value = null;
    drawCurrent.value = null;
    return;
  }

  const rect = normalizeRect(drawStart.value, drawCurrent.value);
  if (rect.width >= 4 && rect.height >= 4) {
    const normalized: PdfRedactionBox = {
      x: rect.x / overlay.width,
      y: rect.y / overlay.height,
      width: rect.width / overlay.width,
      height: rect.height / overlay.height,
    };
    const existing = pdfPageBoxes.value[activePdfPage.value] || [];
    pdfPageBoxes.value[activePdfPage.value] = [...existing, normalized];
  }

  isDrawingPdfBox.value = false;
  drawStart.value = null;
  drawCurrent.value = null;
  drawPdfOverlay();
};

const onPdfOverlayMouseUp = () => {
  finishPdfBoxDrawing();
};

const onPdfOverlayMouseLeave = () => {
  if (!isDrawingPdfBox.value) return;
  finishPdfBoxDrawing();
};

const previousPdfPage = async () => {
  if (activePdfPage.value <= 1) return;
  activePdfPage.value -= 1;
  await renderCurrentPdfPage();
};

const nextPdfPage = async () => {
  if (activePdfPage.value >= pdfPageCount.value) return;
  activePdfPage.value += 1;
  await renderCurrentPdfPage();
};

const undoLastPdfBox = () => {
  const boxes = pdfPageBoxes.value[activePdfPage.value] || [];
  if (!boxes.length) return;
  pdfPageBoxes.value[activePdfPage.value] = boxes.slice(0, -1);
  drawPdfOverlay();
};

const clearCurrentPdfPageBoxes = () => {
  pdfPageBoxes.value[activePdfPage.value] = [];
  drawPdfOverlay();
};

const clearAllPdfBoxes = () => {
  pdfPageBoxes.value = {};
  drawPdfOverlay();
};

const generateRedactedPdf = async () => {
  if (!pdfSourceBytes.value) return;

  isProcessing.value = true;
  currentOperation.value = 'pdf_redaction';
  processingProgress.value = 0;
  processingStatus.value = 'Anonymisierte PDF wird erzeugt...';

  try {
    const { PDFDocument, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.load(pdfSourceBytes.value);
    const pages = doc.getPages();

    Object.entries(pdfPageBoxes.value).forEach(([pageNumber, boxes]) => {
      const index = Number(pageNumber) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= pages.length) {
        return;
      }
      const page = pages[index];
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      for (const box of boxes) {
        page.drawRectangle({
          x: box.x * pageWidth,
          y: (1 - box.y - box.height) * pageHeight,
          width: box.width * pageWidth,
          height: box.height * pageHeight,
          color: rgb(0, 0, 0),
          borderWidth: 0,
        });
      }
    });

    const output = await doc.save();
    redactedPdfBytes.value = output;
    if (redactedPdfUrl.value) {
      URL.revokeObjectURL(redactedPdfUrl.value);
    }
    redactedPdfUrl.value = URL.createObjectURL(
      new Blob([output], { type: 'application/pdf' })
    );

    processingProgress.value = 100;
    processingStatus.value = 'Anonymisierte PDF erfolgreich erzeugt';
    processingHistory.value.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      operation: 'pdf_redaction',
      status: 'success',
      details: `${totalPdfBoxCount.value} Box(en) angewendet`,
    });
  } catch (err: any) {
    error.value = 'Fehler beim Erzeugen der anonymisierten PDF';
    console.error('Error generating redacted PDF:', err);
  } finally {
    isProcessing.value = false;
    currentOperation.value = '';
  }
};

const downloadRedactedPdf = () => {
  if (!redactedPdfBytes.value || !currentVideo.value) return;
  const fileName = String(currentVideo.value.filename || `document_${currentVideo.value.id}.pdf`);
  const baseName = fileName.toLowerCase().endsWith('.pdf')
    ? fileName.slice(0, -4)
    : fileName;

  const blob = new Blob([redactedPdfBytes.value], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}_anonymized.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const uploadRedactedPdf = async () => {
  if (!redactedPdfBytes.value || !currentVideo.value) return;

  isProcessing.value = true;
  currentOperation.value = 'pdf_upload';
  processingProgress.value = 0;
  processingStatus.value = 'Anonymisierte PDF wird hochgeladen...';

  try {
    const originalName = String(currentVideo.value.filename || `document_${currentVideo.value.id}.pdf`);
    const uploadName = originalName.toLowerCase().endsWith('.pdf')
      ? `${originalName.slice(0, -4)}_anonymized.pdf`
      : `${originalName}_anonymized.pdf`;
    const file = new File([redactedPdfBytes.value], uploadName, { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post(r('upload/'), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    processingProgress.value = 100;
    processingStatus.value = 'Upload erfolgreich gestartet';
    processingHistory.value.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      operation: 'pdf_upload',
      status: 'success',
      details: `Upload-ID: ${response.data.upload_id || 'n/a'}`,
    });
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Upload der anonymisierten PDF';
    console.error('Error uploading redacted PDF:', err);
  } finally {
    isProcessing.value = false;
    currentOperation.value = '';
  }
};

const analyzeVideo = async () => {
  if (!currentVideo.value) return;
  
  isProcessing.value = true;
  currentOperation.value = 'analysis';
  processingProgress.value = 0;
  processingStatus.value = 'Video wird analysiert...';
  
  try {
    const response = await axiosInstance.post(r(`media/videos/${currentVideo.value.id}/analyze/`), {
      use_minicpm: frameConfig.value.detectionEngine !== 'traditional',
      detailed_analysis: true
    });
    
    // Update metadata with analysis results
    videoMetadata.value = { ...videoMetadata.value, ...response.data };
    processingProgress.value = 100;
    processingStatus.value = 'Analyse abgeschlossen';
    
    // Add to history
    processingHistory.value.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      operation: 'analysis',
      status: 'success',
      details: `${response.data.sensitiveFrameCount || 0} sensible Frames gefunden`
    });
    
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler bei der Video-Analyse';
    console.error('Error analyzing video:', err);
  } finally {
    isProcessing.value = false;
    currentOperation.value = '';
  }
};

const applyMasking = async () => {
  if (!currentVideo.value) return;
  
  isProcessing.value = true;
  currentOperation.value = 'masking';
  processingProgress.value = 0;
  processingStatus.value = 'Maskierung wird vorbereitet...';
  
  try {
    const payload = {
      mask_type: maskConfig.value.type,
      device_name: maskConfig.value.deviceName,
      use_streaming: maskConfig.value.processingMethod === 'streaming',
      custom_mask: maskConfig.value.type === 'custom' ? {
        endoscope_x: maskConfig.value.endoscopeX,
        endoscope_y: maskConfig.value.endoscopeY,
        endoscope_width: maskConfig.value.endoscopeWidth,
        endoscope_height: maskConfig.value.endoscopeHeight
      } : undefined
    };
    
    // Start masking operation
    const response = await axiosInstance.post(
      r(`media/videos/${currentVideo.value.id}/apply-mask/`), 
      payload
    );
    
    // Start polling for progress
    const taskId = response.data.task_id;
    await pollTaskProgress(taskId, 'masking');
    
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler bei der Maskierung';
    console.error('Error applying mask:', err);
    isProcessing.value = false;
    currentOperation.value = '';
  }
};

const removeFrames = async () => {
  if (!currentVideo.value) return;
  
  isProcessing.value = true;
  currentOperation.value = 'frame_removal';
  processingProgress.value = 0;
  processingStatus.value = 'Frame-Entfernung wird vorbereitet...';
  
  try {
    const payload = {
      selection_method: frameConfig.value.selectionMethod,
      detection_engine: frameConfig.value.detectionEngine,
      use_streaming: frameConfig.value.processingMethod === 'streaming',
      manual_frames: frameConfig.value.selectionMethod === 'manual' 
        ? parseManualFrames(frameConfig.value.manualFrames)
        : undefined
    };
    
    // Start frame removal operation
    const response = await axiosInstance.post(
      r(`media/videos/${currentVideo.value.id}/remove-frames/`), 
      payload
    );
    
    // Start polling for progress
    const taskId = response.data.task_id;
    await pollTaskProgress(taskId, 'frame_removal');
    
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler bei der Frame-Entfernung';
    console.error('Error removing frames:', err);
    isProcessing.value = false;
    currentOperation.value = '';
  }
};

const parseManualFrames = (frameString: string): number[] => {
  const frames: number[] = [];
  const parts = frameString.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      // Range: "30-35"
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          frames.push(i);
        }
      }
    } else {
      // Single frame: "10"
      const frame = parseInt(trimmed);
      if (!isNaN(frame)) {
        frames.push(frame);
      }
    }
  }
  
  return [...new Set(frames)].sort((a, b) => a - b);
};

const pollTaskProgress = async (taskId: string, operation: string) => {
  const pollInterval = 5000; // Increased from 2000ms to 5000ms (5 seconds)
  const maxPolls = 300; // 10 minutes max
  let polls = 0;
  
  const poll = async () => {
    if (polls >= maxPolls) {
      throw new Error('Zeitüberschreitung bei der Verarbeitung');
    }
    
    try {
      const response = await axiosInstance.get(r(`media/videos/task-status/${taskId}/`));
      const { status, progress, message, result } = response.data;
      
      processingProgress.value = progress || 0;
      processingStatus.value = message || 'Verarbeitung läuft...';
      
      if (status === 'SUCCESS') {
        processingProgress.value = 100;
        processingStatus.value = 'Verarbeitung abgeschlossen';
        
        // Add to history
        processingHistory.value.unshift({
          id: Date.now(),
          timestamp: new Date().toISOString(),
          operation,
          status: 'success',
          details: result?.summary || 'Verarbeitung erfolgreich',
          outputPath: result?.output_path
        });
        
        // Refresh video details
        await refreshCurrentVideo();
        
        isProcessing.value = false;
        currentOperation.value = '';
        return;
      }
      
      if (status === 'FAILURE') {
        throw new Error(message || 'Verarbeitung fehlgeschlagen');
      }
      
      // Continue polling
      polls++;
      setTimeout(poll, pollInterval);
      
    } catch (err: any) {
      console.error('Polling error:', err);
      throw err;
    }
  };
  
  await poll();
};

const cancelProcessing = async () => {
  // Implementation depends on backend support for task cancellation
  isProcessing.value = false;
  currentOperation.value = '';
  processingProgress.value = 0;
  processingStatus.value = '';
};

const reprocessVideo = async () => {
  if (!currentVideo.value) return;
  
  try {
    await axiosInstance.post(r(`media/videos/${currentVideo.value.id}/reprocess/`));
    await refreshCurrentVideo();
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler bei der Neuverarbeitung';
    console.error('Error reprocessing video:', err);
  }
};

const getVideoUrl = () => {
  if (!currentVideo.value) return '';
  
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  
  if (previewMode.value === 'processed' && hasProcessedVersion.value) {
    // Get the latest processed version
    const latestProcessed = processingHistory.value
      .filter(entry => entry.status === 'success' && entry.outputPath)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
    if (latestProcessed) {
      return `${base}/api/media/videos/processed-videos/${currentVideo.value.id}/${latestProcessed.id}/`;
    }
  }
  
  // Default to original
  return `${base}/api/media/videos/${currentVideo.value.id}/`;
};

const seekVideo = (seconds: number) => {
  if (videoElement.value) {
    videoElement.value.currentTime += seconds;
  }
};

const downloadResult = async (outputPath: string) => {
  if (!currentVideo.value) return;
  
  try {
    const response = await axiosInstance.get(
      r(`video-download-processed/${currentVideo.value.id}/`),
      { 
        params: { path: outputPath },
        responseType: 'blob'
      }
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentVideo.value.filename}_processed.mp4`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Fehler beim Download';
    console.error('Error downloading result:', err);
  }
};

// Event handlers
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
  console.log('Video loading started for:', getVideoUrl());
};

const onVideoCanPlay = () => {
  console.log('Video can play, loaded successfully');
};

// Utility functions
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'Unbekannt';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatPercentage = (ratio: number | null) => {
  if (ratio === null || ratio === undefined) return 'Unbekannt';
  return `${(ratio * 100).toFixed(1)}%`;
};

const getStatusBadgeClass = (status: string) => {
  const classes: { [key: string]: string } = {
    'not_started': 'bg-secondary',
    'processing': 'bg-warning',
    'processing_anonymization': 'bg-warning',
    'done_processing_anonymization': 'bg-success',
    'validated': 'bg-success',
    'failed': 'bg-danger',
    'success': 'bg-success'
  };
  return classes[status] || 'bg-secondary';
};

const getStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    'not_started': 'Nicht gestartet',
    'processing': 'In Bearbeitung',
    'processing_anonymization': 'In Bearbeitung',
    'done_processing_anonymization': 'Fertig',
    'validated': 'Validiert',
    'failed': 'Fehlgeschlagen',
    'success': 'Erfolgreich'
  };
  return texts[status] || status;
};

const getSensitivityBadgeClass = (ratio: number | null) => {
  if (ratio === null || ratio === undefined) return 'badge bg-secondary';
  
  if (ratio > 0.1) return 'badge bg-danger';
  if (ratio > 0.05) return 'badge bg-warning';
  return 'badge bg-success';
};

const getOperationText = (operation: string) => {
  const texts: { [key: string]: string } = {
    'analysis': 'Video-Analyse',
    'masking': 'Maskierung',
    'frame_removal': 'Frame-Entfernung',
    'reprocessing': 'Neuverarbeitung',
    'pdf_redaction': 'PDF-Redaktion',
    'pdf_upload': 'PDF-Upload'
  };
  return texts[operation] || operation;
};

const getOperationBadgeClass = (operation: string) => {
  const classes: { [key: string]: string } = {
    'analysis': 'bg-info',
    'masking': 'bg-warning',
    'frame_removal': 'bg-danger',
    'reprocessing': 'bg-primary',
    'pdf_redaction': 'bg-dark',
    'pdf_upload': 'bg-info'
  };
  return classes[operation] || 'bg-secondary';
};

// Lifecycle hooks
onMounted(async () => {
  if (!isNaN(props.fileId)) {
    mediaStore.setCurrentByKey(resolvedMediaType.value, props.fileId);
  }
  if (!isNaN(props.fileId)) {
    await loadCurrentItemDetails(props.fileId);
  } else {
    error.value = 'Ungültige Datei-ID';
  }
});

// Watchers
watch(() => props.fileId, async (newId) => {
  if (newId && !isNaN(newId)) {
    mediaStore.setCurrentByKey(resolvedMediaType.value, newId);
    await loadCurrentItemDetails(newId);
  }
});

watch(pdfScale, async () => {
  if (!isPdfCorrection.value || !pdfDocument) return;
  await renderCurrentPdfPage();
});

watch(activePdfPage, () => {
  if (!isPdfCorrection.value) return;
  drawPdfOverlay();
});

onUnmounted(() => {
  if (redactedPdfUrl.value) {
    URL.revokeObjectURL(redactedPdfUrl.value);
  }
});
</script>

<style scoped>
.video-container {
  background-color: #000;
  border-radius: 0.25rem;
  overflow: hidden;
}

.pdf-editor-stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  overflow: auto;
  background: #f5f5f5;
}

.pdf-page-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.pdf-overlay-canvas {
  position: absolute;
  left: 0;
  top: 0;
  cursor: crosshair;
}

.pdf-zoom-range {
  width: 220px;
  margin: 0 0.5rem;
}

.pdf-preview-frame {
  width: 100%;
  min-height: 720px;
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
}

.form-check-label {
  cursor: pointer;
}

.progress {
  background-color: #e9ecef;
}

.table th {
  border-top: none;
  font-weight: 600;
  color: #6c757d;
  font-size: 0.875rem;
}

.table td {
  vertical-align: middle;
}

.badge {
  font-size: 0.75rem;
}

.card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.btn-group .btn {
  border-radius: 0.375rem;
}

@media (max-width: 768px) {
  .video-container video {
    height: 300px;
  }

  .pdf-preview-frame {
    min-height: 420px;
  }
  
  .card-body {
    padding: 1rem 0.75rem;
  }
}
</style>
