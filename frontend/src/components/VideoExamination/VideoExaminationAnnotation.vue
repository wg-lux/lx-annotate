<template>
  <div class="container-fluid py-4">
    <!-- Error Message Alert -->
    <div v-if="errorMessage" class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="material-icons me-2">error</i>
      <strong>Fehler:</strong> {{ errorMessage }}
      <button type="button" class="btn-close" @click="clearErrorMessage" aria-label="Close"></button>
    </div>
    
    <!-- Success Message Alert -->
    <div v-if="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
      <i class="material-icons me-2">check_circle</i>
      <strong>Erfolg:</strong> {{ successMessage }}
      <button type="button" class="btn-close" @click="clearSuccessMessage" aria-label="Close"></button>
    </div>

    <div class="row">
      <div class="col-12">
        <h1>Video-Untersuchung Annotation</h1>
        <p>Annotieren Sie Untersuchungen während der Videobetrachtung</p>
      </div>
    </div>

    <div class="row">
      <!-- Video Player Section -->
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">Video Player</h5>
          </div>
          <div class="card-body">
            <!-- Video Selection -->
            <div class="mb-3">
              <label class="form-label">Video auswählen:</label>
              <div ref="videoDropdownRef" class="video-dropdown">
                <button
                  type="button"
                  class="video-dropdown-trigger"
                  :disabled="!hasVideos"
                  :aria-expanded="isVideoDropdownOpen ? 'true' : 'false'"
                  aria-haspopup="listbox"
                  @click="toggleVideoDropdown"
                >
                  <span class="video-dropdown-trigger-text">{{ selectedVideoLabel }}</span>
                  <i class="fas" :class="isVideoDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>
                <div v-if="isVideoDropdownOpen && hasVideos" class="video-dropdown-menu" role="listbox">
                  <button
                    v-for="video in selectableVideos"
                    :key="video.id"
                    type="button"
                    class="video-dropdown-item"
                    :class="{
                      'video-dropdown-item-selected': selectedVideoId === video.id,
                      'video-dropdown-item-validated': video.segmentAnnotationsValidated,
                      'video-dropdown-item-pending': !video.segmentAnnotationsValidated
                    }"
                    :disabled="video.segmentAnnotationsValidated"
                    @click="selectVideoFromDropdown(video.id)"
                  >
                    <div class="video-dropdown-main">
                      <span class="video-dropdown-title">📹 {{ video.original_file_name || 'Video Nr. ' + video.id }}</span>
                      <span
                        class="video-dropdown-status-badge"
                        :class="video.segmentAnnotationsValidated ? 'badge-validated' : 'badge-pending'"
                      >
                        <i class="fas me-1" :class="video.segmentAnnotationsValidated ? 'fa-check-double' : 'fa-hourglass-half'"></i>
                        {{ video.segmentAnnotationsValidated ? 'Validiert (Outside entfernt)' : 'Validierung offen' }}
                      </span>
                    </div>
                    <div class="video-dropdown-meta">
                      <span>{{ getVideoStatusIndicator(video.id) }}</span>
                      <span>| Center: {{ video.centerName || 'Unbekannt' }}</span>
                      <span>| Processor: {{ video.processorName || 'Unbekannt' }}</span>
                      <span>| Geschlecht: {{ getVideoPatientGender(video.id) }}</span>
                      <span>| Alter: {{ getVideoPatientAgeLabel(video.id) }}</span>
                    </div>
                  </button>
                </div>
              </div>
              <small v-if="!hasVideos" class="text-muted">
                {{ noVideosMessage }}
              </small>
              
              <!-- ✅ NEW: Video Status Summary -->
              <div v-if="videos.length > 0" class="mt-2">
                <div class="d-flex flex-wrap gap-2 align-items-center">
                  <small class="text-muted">Status-Übersicht:</small>
                  <span class="badge bg-success">
                    <i class="fas fa-check me-1"></i>
                    {{ getVideoCountByStatus('done_processing_anonymization') }} Anonymisiert
                  </span>
                  <span class="badge bg-primary">
                    <i class="fas fa-check-double me-1"></i>
                    {{ getVideoCountByStatus('validated') }} Validiert
                  </span>
                  <span class="badge bg-secondary">
                    <i class="fas fa-clock me-1"></i>
                    {{ videos.length - annotatableVideos.length }} Ausstehend
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="lastValidationClickedVideoId !== null"
              class="mt-2 p-2 rounded validation-click-indicator"
              :class="selectedVideoId === lastValidationClickedVideoId ? 'validation-click-indicator-active' : 'validation-click-indicator-muted'"
            >
              <small class="fw-semibold">
                <i class="fas fa-highlighter me-1"></i>
                Das Video mit dieser ID wurde als validiert markiert {{ lastValidationClickedVideoId }}
              </small>
            </div>

            <!-- No Video Selected State -->
            <div v-if="!anonymizedVideoSrc && hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">movie</i>
              <p class="mt-2">Video auswählen, um mit der Betrachtung zu beginnen</p>
              
              <!-- ✅ NEW: Enhanced video status info when selected but not loaded -->
              <div v-if="selectedVideoId" class="alert alert-info mt-2">
                <div class="d-flex align-items-center justify-content-center">
                  <i class="fas fa-info-circle me-2"></i>
                  <div class="text-start">
                    <strong>Video {{ selectedVideoId }}:</strong> {{ getVideoStatusIndicator(selectedVideoId) }}<br>
                    <small class="text-muted">
                      Stream-URL: {{ anonymizedVideoSrc || 'Wird geladen...' }}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <!-- No Videos Available State -->
            <div v-if="!hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">video_library</i>
              <p class="mt-2">{{ noVideosMessage }}</p>
              <small>Videos können über den Ordner Raw Videos hochgeladen werden. Sie müssen erst anonymisiert werden, bevor sie hier angezeigt werden.</small>
            </div>

            <!-- Video Player -->
            <div v-if="anonymizedVideoSrc" ref="videoContainerRef" class="video-container">
              <button
                type="button"
                class="fullscreen-toggle"
                @click="toggleFullscreen"
                :title="isFullscreen ? 'Vollbild verlassen' : 'Vollbild'"
              >
                <i :class="isFullscreen ? 'fas fa-compress' : 'fas fa-expand'"></i>
              </button>
              <video 
                ref="videoRef"
                data-cy="video-player"
                :src="anonymizedVideoSrc"
                @timeupdate="handleTimeUpdate"
                @loadedmetadata="onVideoLoaded"
                @error="onVideoError"
                @loadstart="onVideoLoadStart"
                @canplay="onVideoCanPlay"
                controls
                class="w-100"
                style="max-height: 400px;"
              >
                Ihr Browser unterstützt das Video-Element nicht.
              </video>
              <div
                v-if="isLabelSelectActive"
                class="label-overlay"
                @click.self="closeLabelOverlay"
              >
                <div class="label-overlay-card">
                  <div class="label-overlay-header">
                    <span>Label auswählen</span>
                    <button type="button" class="label-overlay-close" @click="closeLabelOverlay">
                      ×
                    </button>
                  </div>
                  <div class="label-overlay-hint">
                    ↑/↓ wechseln · Enter übernehmen · Esc schließen
                  </div>
                  <div class="label-overlay-list">
                    <button
                      v-for="label in timelineLabels"
                      :key="label.id"
                      type="button"
                      class="label-overlay-item"
                      :class="{ active: label.name === selectedLabelType }"
                      @click="selectLabelFromOverlay(label.name)"
                    >
                      {{ getTranslationForLabel(label.name) }}
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- ✅ NEW: Video Status and Information Card -->
              <div v-if="selectedVideoId" class="mt-3 p-3 rounded border video-status-card">
                <div class="row align-items-center">
                  <div class="col-md-8">
                    <h6 class="mb-1">
                      <i class="fas fa-video me-2 text-primary"></i>
                      {{ annotatableVideos.find(v => v.id === selectedVideoId)?.original_file_name || `Video ${selectedVideoId}` }}
                    </h6>
                    <div class="status-badge-container mb-2">
                      <span 
                        :class="getStatusBadgeClass(overview.find(o => o.id === selectedVideoId && o.mediaType === 'video')?.anonymizationStatus || 'not_started')"
                        class="badge"
                      >
                        <i class="fas fa-shield-alt me-1"></i>
                        {{ getStatusText(overview.find(o => o.id === selectedVideoId && o.mediaType === 'video')?.anonymizationStatus || 'not_started') }}
                      </span>
                      <span v-if="timelineSegmentsForSelectedVideo.length > 0" class="badge bg-info">
                        <i class="fas fa-cut me-1"></i>
                        {{ timelineSegmentsForSelectedVideo.length }} Segmente
                      </span>
                      <span v-if="savedExaminations.length > 0" class="badge bg-warning">
                        <i class="fas fa-stethoscope me-1"></i>
                        {{ savedExaminations.length }} Untersuchungen
                      </span>
                    </div>
                  </div>
                  <div class="col-md-4 text-md-end">
                    <small class="text-muted d-block">Center: {{ annotatableVideos.find(v => v.id === selectedVideoId)?.centerName || 'Unbekannt' }}</small>
                    <small class="text-muted d-block">Processor: {{ annotatableVideos.find(v => v.id === selectedVideoId)?.processorName || 'Unbekannt' }}</small>
                    <small class="text-muted d-block">Dauer: {{ formatTime(duration) }}</small>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!anonymizedVideoSrc" class="">
              <button 
                class="btn btn-primary"
                @click="videoStore.deleteVideo(selectedVideoId)"
                :disabled="!hasVideos"
              >
                Video löschen?
              </button>
            </div>

            <!-- Enhanced Timeline Component -->
            <div v-if="duration > 0" class="timeline-wrapper mt-3">
              <Timeline 
                :video="{ duration }"
                :segments="timelineSegmentsForSelectedVideo"
                :labels="timelineLabels"
                :currentTime="currentTime"
                :isPlaying="isPlaying"
                :activeSegmentId="selectedSegmentId"
                :showWaveform="false"
                :selectionMode="true"
                :fps="fps"
                @seek="handleTimelineSeek"
                @play-pause="handlePlayPause"
                @segment-select="handleSegmentSelect"
                @segment-resize="handleSegmentResize"
                @segment-move="handleSegmentMove"
                @segment-create="handleCreateSegment"
                @segment-delete="handleSegmentDelete"
                @time-selection="handleTimeSelection"
              />
              <details class="mt-2 text-muted shortcuts-details" style="font-size: 0.85rem;">
                <summary class="shortcuts-toggle" aria-label="Shortcuts anzeigen">
                  <span class="shortcuts-icon">?</span>
                  <span>Shortcuts</span>
                </summary>
                <div class="mt-1 shortcuts-body">
                  O = Labelauswahl ·
                  ↑/↓ = Label wechseln ·
                  Enter = Label übernehmen ·
                  F = Vollbild ·
                  , / . = Frame zurück/vor ·
                  K / L = 5s zurück/vor ·
                  Ctrl/Cmd + C = Segment kopieren ·
                  Ctrl/Cmd + V = Segment einfügen ·
                  Ctrl/Cmd + Z = Löschen rückgängig ·
                  Delete/Backspace = Segment löschen ·
                  Rechtsklick auf Segment = Start/Ende tippen ·
                  + = Segment-Start ·
                  - = Segment-Ende ·
                  Esc = Abbrechen
                </div>
              </details>
              <div v-if="selectedVideoId" class="mt-3 d-flex gap-2">
                <button
                  class="btn btn-outline-secondary"
                  @click="discardSegmentChanges"
                >
                  Änderungen verwerfen
                </button>

                <button
                  class="btn"
                  :class="hasUnsavedChanges ? 'btn-primary' : 'btn-outline-secondary'"
                  @click="saveSegmentChanges; submitVideoSegments"
                >
                  Segmentänderungen speichern
                </button>

              
              <!-- Simple progress bar as fallback -->
              <div class="simple-timeline-track mt-2" @click="handleTimelineClick" ref="timelineRef">
                <div class="progress-bar" :style="{ width: `${(currentTime / duration) * 100}%` }"></div>
                <!-- Examination markers on timeline -->
                <div 
                  v-for="marker in examinationMarkers" 
                  :key="marker.id"
                  class="examination-marker"
                  :style="{ left: `${(marker.timestamp / duration) * 100}%` }"
                  :title="`Untersuchung bei ${formatTime(marker.timestamp)}`"
                >
                </div>
              </div>
            </div>

            <!-- Debug-Info für Timeline -->
            <div v-if="duration > 0" class="debug-info mt-2">
              <small class="text-muted">
                Timeline Debug: {{ timelineSegmentsForSelectedVideo.length }} video-spezifische Segmente | 
                {{ rawSegments.length }} total Segmente | 
                Duration: {{ formatTime(duration) }} | 
                Playing: {{ isPlaying }} |
                Store: {{ Object.keys(groupedSegments).length }} Labels
              </small>
            </div>

            <!-- Timeline Controls -->
            <div v-if="selectedVideoId" class="timeline-controls mt-4">
              <div class="d-flex align-items-center gap-3">
                <div class="d-flex align-items-center">
                  <label class="form-label mb-0 me-2">Neues Label setzen:</label>
                  <select 
                    ref="labelSelectRef"
                    v-model="selectedLabelType" 
                    @change="onLabelSelect"
                    @focus="isLabelSelectActive = true"
                    @blur="isLabelSelectActive = false"
                    class="form-select form-select-sm control-select"
                    data-cy="label-select"
                  >
                    <option value="">Label auswählen...</option>
                    <option 
                      v-for="label in timelineLabels" 
                      :key="label.id" 
                      :value="label.name"
                    >
                      {{ getTranslationForLabel(label.name) }}
                    </option>
                  </select>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                  <button 
                    v-if="!isMarkingLabel"
                    @click="startLabelMarking" 
                    class="btn btn-success btn-sm control-button"
                    :disabled="!canStartLabeling"
                    data-cy="start-label-button"
                  >
                    <i class="material-icons">label</i>
                    Label-Start setzen
                  </button>
                  
                  <button 
                    v-if="isMarkingLabel"
                    @click="finishLabelMarking" 
                    class="btn btn-warning btn-sm control-button"
                    data-cy="finish-label-button"
                  >
                    <i class="material-icons">stop</i>
                    Label-Ende setzen
                  </button>

                  <button 
                    v-if="isMarkingLabel"
                    @click="cancelLabelMarking" 
                    class="btn btn-outline-secondary btn-sm control-button"
                  >
                    Abbrechen
                  </button>
                </div>
                
                <span class="ms-3 text-muted">
                   <p v-if="videoStore.draftSegment && videoStore.draftSegment.startTime !== null" class="mb-0">Aktueller Label Start: {{ formatTime(videoStore.draftSegment.startTime) }}</p> Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </span>
              </div>
              
              <!-- Draft-Info während Label-Erstellung -->
              <div v-if="videoStore.draftSegment" class="alert alert-info mt-2 mb-0">
                <small>
                  <i class="material-icons align-middle me-1" style="font-size: 16px;">info</i>
                  Label "{{ getTranslationForLabel(videoStore.draftSegment.label) }}" 
                  <span v-if="videoStore.draftSegment.endTime">
                    von {{ formatTime(videoStore.draftSegment.startTime) }} bis {{ formatTime(videoStore.draftSegment.endTime) }}
                  </span>
                  <span v-else>
                    startet bei {{ formatTime(videoStore.draftSegment.startTime) }} - Ende beim nächsten Klick
                  </span>
                </small>
              </div>
            </div>
          </div>
        </div>
        
        <!-- ✅ Enhanced Validation Button with Status -->
        <div v-if="selectedVideoId" class="mt-3">
          <!-- Show different button based on annotation status -->
          <div v-if="isAnnotationFinished(selectedVideoId)" 
               class="alert alert-success d-flex align-items-center validation-status-alert">
            <i class="fas fa-check-circle fa-2x me-3 text-success"></i>
            <div>
              <h6 class="mb-1">
                <i class="fas fa-medal me-1"></i>
                Video bereits validiert
              </h6>
              <small class="text-muted">
                Alle {{ timelineSegmentsForSelectedVideo.length }} Segmente wurden überprüft und als validiert markiert.
              </small>
            </div>
          </div>
          
          <div v-else class="d-flex justify-content-center">
            <button 
              class="btn validation-action-button d-inline-flex align-items-center justify-content-center gap-2"
              :class="{ 'validation-action-button-clicked': selectedVideoId === lastValidationClickedVideoId }"
              @click="handleValidateAndMark(selectedVideoId)" 
            > <!-- Remove mark validated when keeping outside segments for training -->
              <i class="material-icons validation-action-icon">check_circle</i>
              <span>Alle Segmente validieren ({{ timelineSegmentsForSelectedVideo.length }})</span>
            </button>
          </div>
          
          <p v-if="!isAnnotationFinished(selectedVideoId)" 
             class="text-muted text-center mt-2 mb-0" style="font-size: 0.9rem;">
            <i class="material-icons" style="font-size: 16px; vertical-align: middle;">info</i>
            Markiert alle Segmente als überprüft und setzt Video-Status auf "Validiert"
          </p>
        </div>
      </div>



      <!-- Advanced Requirement Generator Section -->
      <div class="col-lg-12">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">
              <i class="fas fa-clipboard-list me-2"></i>
              Anforderungsbasierte Annotation
            </h5>
            <small class="text-muted" v-if="currentMarker">
              Zeitpunkt: {{ formatTime(currentMarker.timestamp) }}
            </small>
            <div class="mt-2" v-if="selectedVideoId">
              <div class="alert alert-info alert-sm mb-0">
                <i class="fas fa-info-circle me-1"></i>
                <strong>Video {{ selectedVideoId }}:</strong> 
                Erweiterte Untersuchungsannotation mit Anforderungssets und Befunden
              </div>
            </div>
          </div>
          <div class="card-body p-0" style="max-height: 80vh; overflow-y: auto;">
            <!-- ✅ ENHANCED: Integrated RequirementGenerator instead of simple form -->
            <RequirementGenerator 
              v-if="showExaminationForm"
              class="requirement-generator-embedded"
              data-cy="requirement-generator"
            />
            <div v-else class="text-center text-muted py-5 px-3">
              <i class="fas fa-video fa-3x mb-3 text-muted"></i>
              <h6>Video-Untersuchung</h6>
              <p class="mb-0">Wählen Sie ein Video aus, um mit der erweiterten Annotation zu beginnen</p>
              <small class="text-muted">
                Anforderungssets, Befunde und Klassifikationen werden automatisch geladen
              </small>
            </div>
          </div>
        </div>

        <!-- Saved Examinations List -->
        <div class="card mt-3" v-if="savedExaminations.length > 0">
          <div class="card-header pb-0">
            <h6 class="mb-0">Gespeicherte Untersuchungen</h6>
          </div>
          <div class="card-body" data-cy="saved-examinations">
            <div class="list-group list-group-flush">
              <div 
                v-for="exam in savedExaminations" 
                :key="exam.id"
                class="list-group-item d-flex justify-content-between align-items-center px-0"
              >
                <div>
                  <small class="text-muted">{{ formatTime(exam.timestamp) }}</small>
                  <div>{{ exam.examination_type || 'Untersuchung' }}</div>
                </div>
                <div>
                  <button 
                    @click="jumpToExamination(exam)" 
                    class="btn btn-sm btn-outline-primary me-2"
                  >
                    <i class="material-icons">play_arrow</i>
                  </button>
                  <button 
                    @click="deleteExamination(exam.id)" 
                    class="btn btn-sm btn-outline-danger"
                  >
                    <i class="material-icons">delete</i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useVideoStore, type Segment, type Video } from '@/stores/videoStore'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useMediaTypeStore } from '@/stores/mediaTypeStore'
import RequirementGenerator from '@/components/RequirementReport/RequirementGenerator.vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import Timeline from '@/components/VideoExamination/Timeline.vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toastStore'
import { formatTime, getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()           // ①
const router = useRouter()
// ------------------------------------------------------------------
// pick the number once when the view is created
// ------------------------------------------------------------------
const initialVideoId = Number(route.query.video ?? '') || null

interface ExaminationMarker {
  id: string
  timestamp: number
  examination_data?: any
}

interface SavedExamination {
  id: number
  timestamp: number
  examination_type?: string
  data?: any
}

interface SegmentResizeEvent {
  segmentId: number
  newStart: number
  newEnd: number
}

interface CreateSegmentEvent {
  label: string
  start: number
  end: number
}

interface VideoSensitiveMeta {
  patient_dob?: string | null
  patient_gender_name?: string | null
}

// Store setup
const videoStore = useVideoStore()
const mediaStore = useMediaTypeStore()

const { videoList, videoStreamUrl, timelineSegments } = storeToRefs(videoStore)

const videos = computed(() => videoList.value.videos)

const { allSegments: rawSegments } = storeToRefs(videoStore)

const anonymizationStore = useAnonymizationStore()

const { overview } = storeToRefs(anonymizationStore)


// Use spread operator to convert readonly array to mutable array
const timelineLabels = computed(() => {
  const storeLabels = videoStore.labels || []
  return [...storeLabels] // Convert readonly array to mutable array
})

/**
 * helper: returns true when a video's anonymization status is 'done_processing_anonymization'
 */
function isAnonymized(videoId: number): boolean {
  const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video')
  return item?.anonymizationStatus === 'done_processing_anonymization' || item?.anonymizationStatus === 'validated'
}

function isAnnotationFinished(videoId: number): boolean {
  const video = videoList.value.videos.find(v => v.id === videoId)
  return Boolean(video?.segmentAnnotationsValidated)
}

// Reactive data
const selectedVideoId = ref<number | null>(initialVideoId)
const currentTime = ref<number>(0)
const duration = ref<number>(0)
const fps = computed<number>(() => videoStore.effectiveFps)
const isPlaying = ref<boolean>(false) // ✅ NEW: Track video playing state
const examinationMarkers = ref<ExaminationMarker[]>([])
const savedExaminations = ref<SavedExamination[]>([])
const currentMarker = ref<ExaminationMarker | null>(null)
const selectedLabelType = ref<string>('')
const isLabelSelectActive = ref<boolean>(false)
const isMarkingLabel = ref<boolean>(false)
const labelMarkingStart = ref<number>(0)
const selectedSegmentId = ref<number | null>(null)
const isInitialLoading = ref<boolean>(true)
const lastValidationClickedVideoId = ref<number | null>(null)

// Video detail and metadata like VideoClassificationComponent
const videoDetail = ref<{ video_url: string } | null>(null)
const videoMeta = ref<{ duration: number } | null>(null)

// Error and success messages for Bootstrap alerts
const errorMessage = ref<string>('')
const successMessage = ref<string>('')
const isFullscreen = ref<boolean>(false)

// Template refs
const videoRef = ref<HTMLVideoElement | null>(null)
const videoContainerRef = ref<HTMLElement | null>(null)
const labelSelectRef = ref<HTMLSelectElement | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const videoDropdownRef = ref<HTMLElement | null>(null)
const isVideoDropdownOpen = ref<boolean>(false)
const videoSensitiveMetaMap = ref<Record<number, VideoSensitiveMeta>>({})
// Video Dropdown Watcher

const hasUnsavedChanges = computed(() => 
  rawSegments.value.some(s => s.isDirty)
)

async function loadSelectedVideo() {  
  if (selectedVideoId.value == null) {
    videoStore.clearVideo()
    videoDetail.value = null
    videoMeta.value = null
    return
  }

  // ✅ NEW: Validate that selected video is anonymized
  if (!isAnonymized(selectedVideoId.value)) {
    showErrorMessage(`Video ${selectedVideoId.value} kann nicht annotiert werden, da es noch nicht anonymisiert wurde.`)
    selectedVideoId.value = null
    return
  }
  if (isAnnotationFinished(selectedVideoId.value)) {
    showErrorMessage(`Video ${selectedVideoId.value} ist bereits vollständig annotiert.`)
    selectedVideoId.value = null
    return
  }

  // Clear previous error messages when changing videos
  clearErrorMessage()
  clearSuccessMessage()

  try {
    await videoStore.loadVideo(selectedVideoId.value)
    await loadVideoDetail(selectedVideoId.value)
    await guarded(loadSavedExaminations())
    await guarded(loadVideoMetadata())

    console.log('Video fully loaded:', selectedVideoId.value)
  } catch (err: any) {
    console.error('loadSelectedVideo failed', err)
    await guarded(Promise.reject(err))
  }
}


function onVideoChange() {                // handler for the <select>
  /** update the url so users can bookmark / refresh */
  router.replace({ query: { video: selectedVideoId.value } })
}

function toggleVideoDropdown(): void {
  if (!hasVideos.value) return
  isVideoDropdownOpen.value = !isVideoDropdownOpen.value
  if (isVideoDropdownOpen.value) {
    loadSensitiveMetaForVideos(selectableVideos.value.map(v => v.id))
  }
}

function closeVideoDropdown(): void {
  isVideoDropdownOpen.value = false
}

function selectVideoFromDropdown(videoId: number): void {
  const selected = selectableVideos.value.find(video => video.id === videoId)
  if (!selected || selected.segmentAnnotationsValidated) return
  selectedVideoId.value = videoId
  onVideoChange()
  closeVideoDropdown()
}

const handleDocumentClick = (event: MouseEvent): void => {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!videoDropdownRef.value) return
  if (!videoDropdownRef.value.contains(target)) {
    closeVideoDropdown()
  }
}

const parseDobToDate = (rawDob: string | null | undefined): Date | null => {
  if (!rawDob) return null
  const trimmed = rawDob.trim()
  if (!trimmed) return null

  const isoCandidate = new Date(trimmed)
  if (!Number.isNaN(isoCandidate.getTime())) return isoCandidate

  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (deMatch) {
    const [, day, month, year] = deMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  return null
}

const getAgeFromDob = (rawDob: string | null | undefined): number | null => {
  const dob = parseDobToDate(rawDob)
  if (!dob) return null
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }
  return age >= 0 ? age : null
}

const normalizeGenderLabel = (value: string | null | undefined): string => {
  if (!value) return 'Unbekannt'
  const normalized = value.toLowerCase()
  if (normalized === 'male' || normalized === 'männlich') return 'Männlich'
  if (normalized === 'female' || normalized === 'weiblich') return 'Weiblich'
  if (normalized === 'diverse') return 'Divers'
  return value
}

const getVideoPatientGender = (videoId: number): string => {
  return normalizeGenderLabel(videoSensitiveMetaMap.value[videoId]?.patient_gender_name)
}

const getVideoPatientAgeLabel = (videoId: number): string => {
  const age = getAgeFromDob(videoSensitiveMetaMap.value[videoId]?.patient_dob)
  return age == null ? 'Unbekannt' : `${age} J.`
}

const loadSensitiveMetaForVideos = async (videoIds: number[]): Promise<void> => {
  const missingIds = videoIds.filter(id => !(id in videoSensitiveMetaMap.value))
  if (missingIds.length === 0) return

  const results = await Promise.all(
    missingIds.map(async (id) => {
      try {
        const { data } = await axiosInstance.get<VideoSensitiveMeta>(r(`media/videos/${id}/sensitive-metadata/`))
        return { id, data }
      } catch {
        return { id, data: { patient_dob: null, patient_gender_name: null } as VideoSensitiveMeta }
      }
    })
  )

  const nextMap = { ...videoSensitiveMetaMap.value }
  results.forEach(({ id, data }) => {
    nextMap[id] = {
      patient_dob: data?.patient_dob ?? null,
      patient_gender_name: data?.patient_gender_name ?? null,
    }
  })
  videoSensitiveMetaMap.value = nextMap
}

//  fire loader whenever selectedVideoId changes programmatically  */
watch(
  selectedVideoId,
  async (newId) => {
    console.log('Selected video ID changed, syncing store and loading details:', newId)
    if (typeof newId === 'number') {
      videoStore.setCurrentVideo(newId)
    } else if (newId !== null) {
      errorMessage.value = 'Invalid video ID'
      return
    }

    await loadSelectedVideo()
    if (newId !== null) {
      await loadVideoSegments()
    }
  },
  { immediate: true }
)
watch(
  () => route.query.video,
  v => {
    const id = Number(v ?? '') || null
    if (id !== selectedVideoId.value) selectedVideoId.value = id
  },
  { immediate: true }
)
// List of only videos that are both present in the list **and** in state `done` inside anonymizationStore
const selectableVideos = computed(() =>
  videoList.value.videos.filter(v => isAnonymized(v.id))
)

const annotatableVideos = computed(() =>
  selectableVideos.value.filter(v => !isAnnotationFinished(v.id))
)

const selectedVideoLabel = computed(() => {
  if (!selectableVideos.value.length) return 'Keine Videos verfügbar'
  if (selectedVideoId.value == null) return 'Bitte Video auswählen...'
  const video = selectableVideos.value.find(v => v.id === selectedVideoId.value)
  if (!video) return `Video ${selectedVideoId.value}`
  return `📹 ${video.original_file_name || `Video Nr. ${video.id}`}`
})

watch(
  selectableVideos,
  (videos) => {
    if (!videos.length) return
    loadSensitiveMetaForVideos(videos.map(v => v.id))
  },
  { immediate: true }
)


const showExaminationForm = computed(() => {
  return selectedVideoId.value !== null && anonymizedVideoSrc.value !== undefined
})

// Video streaming URL using MediaStore logic like AnonymizationValidationComponent
const anonymizedVideoSrc = computed(() => {
  if (!selectedVideoId.value) return undefined;
  
  // Build anonymized video URL with explicit processed parameter like AnonymizationValidationComponent
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base}/api/media/videos/${selectedVideoId.value}/?type=processed`;
})

const hasVideos = computed(() => {
  return selectableVideos.value && selectableVideos.value.length > 0
})

const noVideosMessage = computed(() => {
  if (videos.value.length === 0) {
    return 'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.'
  } else if (selectableVideos.value.length === 0) {
    return 'Keine anonymisierten Videos verfügbar. Videos müssen erst anonymisiert werden.'
  } else if (annotatableVideos.value.length === 0) {
    return 'Alle anonymisierten Videos sind bereits validiert.'
  }
  return ''
})

const timelineSegmentsForSelectedVideo = computed<Segment[]>(() => {
  if (!selectedVideoId.value) return []

  return rawSegments.value
    .filter(s => s.videoID === selectedVideoId.value)
})


const groupedSegments = computed(() => {
  return videoStore.segmentsByLabel
})

const canStartLabeling = computed(() => {
  return selectedVideoId.value && 
         (videoDetail.value?.video_url || anonymizedVideoSrc.value) && 
         selectedLabelType.value && 
         !isMarkingLabel.value &&
         duration.value > 0
})


// ✅ PRIORITY: Load labels first, then videos, then anonymization status
onMounted(async () => {
  console.log('🚀 [VideoExamination] Component mounted - loading data in priority order...')
  isInitialLoading.value = true
  try {
    // Step 1: Load labels with high priority
    await videoStore.fetchLabels()
    console.log(`✅ [VideoExamination] Labels loaded: ${videoStore.labels.length}`)
    
    // Step 2: Load anonymization overview BEFORE videos (needed for filtering)
    await anonymizationStore.fetchOverview()
    console.log(`✅ [VideoExamination] Anonymization status loaded: ${overview.value.length} items`)
    
    // Step 3: Load videos after labels and anonymization status are available
    await videoStore.fetchAllVideos()
    console.log(`✅ [VideoExamination] Videos loaded: ${videoStore.videoList.videos.length}`)
    console.log(`✅ [VideoExamination] Annotatable videos: ${annotatableVideos.value.length}`)
    await loadVideoSegments()
  } catch (error) {
    console.error('❌ [VideoExamination] Error during initial load:', error)
    showErrorMessage('Fehler beim Laden der Daten. Bitte Seite neu laden.')
  } finally {
    isInitialLoading.value = false
  }

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

// Guarded function for error handling like VideoClassificationComponent
async function guarded<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p
  } catch (e: any) {
    const errorMsg = e?.response?.data?.detail || e?.response?.data?.error || e?.message || String(e)
    errorMessage.value = errorMsg
    return undefined
  }
}

watch(videoStreamUrl, (newUrl) => {
  console.log('Video stream URL updated:', newUrl)
})

// Alert management methods
const clearErrorMessage = (): void => {
  errorMessage.value = ''
}

const clearSuccessMessage = (): void => {
  successMessage.value = ''
}

const showSuccessMessage = (message: string): void => {
  successMessage.value = message
  // Auto-clear after 5 seconds
  setTimeout(() => {
    clearSuccessMessage()
  }, 5000)
}

const showErrorMessage = (message: string): void => {
  errorMessage.value = message
  // Auto-clear after 10 seconds
  setTimeout(() => {
    clearErrorMessage()
  }, 10000)
}

// Load video detail from backend like VideoClassificationComponent
const loadVideoDetail = async (videoId: number): Promise<void> => {
  if (!videoId) return
  
  try {
    console.log('Loading video detail for ID:', videoId)
    const response = await axiosInstance.get(r(`media/videos/${videoId}/`))
    console.log('Video detail response:', response.data)
    
    videoDetail.value = { video_url: response.data.video_url }
    videoMeta.value = {
      duration: Number(response.data.duration ?? 0)
    }
    
    // Update MediaStore with the current video for consistent URL handling
    const currentVideo = selectableVideos.value.find(v => v.id === videoId)
    if (currentVideo) {
      mediaStore.setCurrentItem(currentVideo as any)
      console.log('MediaStore updated with video:', videoId)
    }
    
    // Update local duration if available
    if (videoMeta.value.duration > 0) {
      duration.value = videoMeta.value.duration
    }
    
    console.log('Video detail loaded:', videoDetail.value)
    console.log('Video meta loaded:', videoMeta.value)
    console.log('Stream source will be:', anonymizedVideoSrc.value)
  } catch (error) {
    console.error('Error loading video detail:', error)
    await guarded(Promise.reject(error))
  }
}

const loadSavedExaminations = async (): Promise<void> => {
  if (selectedVideoId.value === null) return
  
  try {
    // TODO: Migrate to new media framework URL when backend supports /api/media/videos/{id}/examinations/
    // Currently using old URL as part of partial migration strategy
    const response = await axiosInstance.get(r(`video/${selectedVideoId.value}/examinations/`))
    savedExaminations.value = response.data
    
    // Create markers for saved examinations
    examinationMarkers.value = response.data.map((exam: SavedExamination): ExaminationMarker => ({
      id: `exam-${exam.id}`,
      timestamp: exam.timestamp,
      examination_data: exam.data
    }))
  } catch (error: any) {
    console.error('Error loading saved examinations:', error)
    
    // Check if this is an anonymization error like VideoClassificationComponent
    const errorMessage = error?.response?.data?.error || error?.response?.data?.detail || error?.message || error.toString()
    if (errorMessage.includes('darf nicht annotiert werden') || 
        errorMessage.includes('anonymisierung') || 
        errorMessage.includes('anonymization')) {
      showErrorMessage(`Video ${selectedVideoId.value} darf nicht annotiert werden, solange die Anonymisierung nicht abgeschlossen ist.`)
    } else if (error?.response?.status !== 404) {
      await guarded(Promise.reject(error))
    }
    
    savedExaminations.value = []
    examinationMarkers.value = []
  }
}

const loadVideoMetadata = async (): Promise<void> => {
  if (videoRef.value) {
    await new Promise<void>((resolve) => {
      const video = videoRef.value!
      if (video.readyState >= 1) {
        duration.value = video.duration
        resolve()
      } else {
        video.addEventListener('loadedmetadata', () => {
          duration.value = video.duration
          resolve()
        }, { once: true })
      }
    })
  }
}

async function loadVideoSegments(): Promise<void> {
  if (selectedVideoId.value === null) return
  
  try {
    await videoStore.fetchAllSegments(selectedVideoId.value, true)
    console.log('Video segments loaded for video:', selectedVideoId.value)
    console.log('Timeline segments count:', rawSegments.value.length)
  } catch (error) {
    console.error('Error loading video segments:', error)
  }
}

const onVideoLoaded = (): void => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration
    
    // ✅ NEW: Add play/pause event listeners for state tracking
    videoRef.value.addEventListener('play', () => {
      isPlaying.value = true
    })
    
    videoRef.value.addEventListener('pause', () => {
      isPlaying.value = false
    })
    
    videoRef.value.addEventListener('ended', () => {
      isPlaying.value = false
    })
    
    console.log('🎥 Video loaded - Frontend')
    console.log(`- Video source URL: ${anonymizedVideoSrc.value}`)
    console.log(`- Legacy stream URL: ${videoStreamUrl.value}`)
    console.log(`- Video detail URL: ${videoDetail.value?.video_url}`)
    console.log(`- Video readyState: ${videoRef.value.readyState}`)
    console.log(`- Video networkState: ${videoRef.value.networkState}`)
    
    if (videoRef.value.videoWidth && videoRef.value.videoHeight) {
      console.log(`- Video dimensions: ${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`)
    }
    
    if (duration.value < 10) {
      console.warn(`⚠️ WARNING: Video duration seems very short (${duration.value}s)`)
    } else {
      showSuccessMessage(`Video geladen: ${Math.round(duration.value)}s Dauer`)
    }
  }
}

const handleTimeUpdate = (): void => {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime
  }
}

const handleTimelineClick = (event: MouseEvent): void => {
  if (!timelineRef.value || duration.value === 0) return
  
  const rect = timelineRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const newTime = percentage * duration.value
  
  seekToTime(newTime)
}

// TS2322-safe event handlers like VideoClassificationComponent
const handleTimelineSeek = (...args: unknown[]): void => {
  const [time] = args as [number];
  seekToTime(time)
}

// Play/pause handler for Timeline
const handlePlayPause = (...args: unknown[]): void => {
  if (!videoRef.value) return
  
  if (videoRef.value.paused) {
    videoRef.value.play().catch(error => {
      console.error('Error playing video:', error)
      showErrorMessage('Fehler beim Abspielen des Videos')
    })
  } else {
    videoRef.value.pause()
  }
}

// Segment selection handler - detects click on segment and sets it for the timeline
const handleSegmentSelect = (...args: unknown[]): void => {
  const [segmentId] = args as [number];
  selectedSegmentId.value = segmentId
  console.log('Segment selected:', segmentId)
}

const handleSegmentResize = (...args: unknown[]): void => {
  const [segmentId, newStart, newEnd, _mode, _final] =
    args as [number, number, number, string, boolean?]

  if (!Number.isFinite(segmentId)) {
    console.warn('[VideoExamination] Invalid segment ID for resize:', segmentId)
    return
  }

  if (segmentId < 0) {
    // Draft segment: keep it purely frontend
    videoStore.patchDraftSegment(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
    videoStore.commitDraft()
  } else {
    // Existing segment: patch locally and mark isDirty
    videoStore.patchSegmentLocally(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
  }

  // ❌ Absolutely no backend call here, this should use the drafts because of the load on the backend.
}

const handleSegmentMove = (...args: unknown[]): void => {
  const [segmentId, newStart, newEnd, _final] =
    args as [number, number, number, boolean?]

  if (!Number.isFinite(segmentId)) {
    console.warn('[VideoExamination] Invalid segment ID for move:', segmentId)
    return
  }

  if (segmentId < 0) {
    videoStore.patchDraftSegment(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
  } else {
    videoStore.patchSegmentLocally(segmentId, {
      startTime: newStart,
      endTime: newEnd
    })
  }
}

const handleTimeSelection = (...args: unknown[]): void => {
  const [data] = args as [{ start: number; end: number }];
  
  // ✅ FIXED: Only create segment if we have a selected label type
  if (selectedLabelType.value && selectedVideoId.value) {
    console.log(`Creating segment from time selection: ${formatTime(data.start)} - ${formatTime(data.end)} with label: ${selectedLabelType.value}`)
    
    handleCreateSegment({
      label: selectedLabelType.value,
      start: data.start,
      end: data.end
    })
  } else {
    console.warn('Cannot create segment: no label selected or no video selected')
    showErrorMessage('Bitte wählen Sie ein Label aus, bevor Sie ein Segment erstellen.')
  }
}

const handleCreateSegment = (...args: unknown[]): Promise<void> => {
  const [event] = args as [CreateSegmentEvent];
  return new Promise<void>(async (resolve, reject) => {
    try {
      if (selectedVideoId.value) {
        await videoStore.createSegment?.(
          selectedVideoId.value, 
          event.label, 
          event.start, 
          event.end
        )
        showSuccessMessage(`Segment erstellt: ${getTranslationForLabel(event.label)}`)
      }
      resolve();
    } catch (error: any) {
      await guarded(Promise.reject(error))
      reject(error);
    }
  });
}

const handleSegmentDelete = (...args: unknown[]): Promise<void> => {
  const [segment] = args as [Segment];
  return new Promise<void>(async (resolve, reject) => {
    if (!segment.id || typeof segment.id !== 'number') {
      console.warn('Cannot delete draft or temporary segment:', segment.id)
      resolve();
      return;
    }

    try {
      // 1. Remove from store
      videoStore.removeSegment(segment.id)

      // 2. Perform API call
      await videoStore.deleteSegment(segment.id)
      await loadVideoSegments()

      showSuccessMessage(`Segment gelöscht: ${getTranslationForLabel(segment.label)}`)
      resolve();
    } catch (err: any) {
      console.error('Segment konnte nicht gelöscht werden:', err)
      await guarded(Promise.reject(err))
      reject(err);
    }
  });
}


const seekToTime = (time: number): void => {
  if (videoRef.value && time >= 0 && time <= duration.value) {
    videoRef.value.currentTime = time
    currentTime.value = time
  }
}

const onLabelSelect = (): void => {
  console.log('Label selected:', selectedLabelType.value)
}

const handleFullscreenChange = (): void => {
  isFullscreen.value = document.fullscreenElement === videoContainerRef.value
}

const toggleFullscreen = async (): Promise<void> => {
  const container = videoContainerRef.value
  if (!container) return

  try {
    if (document.fullscreenElement === container) {
      await document.exitFullscreen()
    } else {
      await container.requestFullscreen()
    }
  } catch (error) {
    console.error('Fullscreen toggle failed:', error)
  }
}

const closeLabelOverlay = (): void => {
  isLabelSelectActive.value = false
  labelSelectRef.value?.blur()
}

const selectLabelFromOverlay = (labelName: string): void => {
  selectedLabelType.value = labelName
  closeLabelOverlay()
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLSelectElement && isLabelSelectActive.value) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const handleKeyDown = (event: KeyboardEvent): void => {
  if (isEditableTarget(event.target)) return

  const key = event.key.toLowerCase()

  if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'o') {
    event.preventDefault()
    event.stopPropagation()
    preselectLabelForOverlay()
    isLabelSelectActive.value = true
    return
  }

  if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'f') {
    event.preventDefault()
    event.stopPropagation()
    toggleFullscreen()
    return
  }

  if (isLabelSelectActive.value) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      const labels = timelineLabels.value
      if (labels.length === 0) return
      const currentIndex = labels.findIndex((l) => l.name === selectedLabelType.value)
      const delta = event.key === 'ArrowUp' ? -1 : 1
      const startIndex = currentIndex === -1 ? (delta > 0 ? -1 : 0) : currentIndex
      const nextIndex = (startIndex + delta + labels.length) % labels.length
      selectedLabelType.value = labels[nextIndex].name
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      closeLabelOverlay()
      return
    }
  }

  if (event.key === 'Escape') {
    if (isLabelSelectActive.value) {
      event.preventDefault()
      event.stopPropagation()
      closeLabelOverlay()
      return
    }
    if (isMarkingLabel.value) {
      event.preventDefault()
      cancelLabelMarking()
    }
    return
  }

  const isPlus =
    event.key === '+' ||
    event.code === 'NumpadAdd' ||
    (event.code === 'Equal' && event.shiftKey)
  const isMinus =
    event.key === '-' ||
    event.code === 'Minus' ||
    event.code === 'NumpadSubtract'

  if (isPlus) {
    event.preventDefault()
    startLabelMarking()
    return
  }

  if (isMinus) {
    event.preventDefault()
    finishLabelMarking()
  }
}

const preselectLabelForOverlay = (): void => {
  const segments = timelineSegmentsForSelectedVideo.value
  if (segments.length === 0) return

  if (selectedSegmentId.value !== null) {
    const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId.value)
    if (selectedSegment) {
      selectedLabelType.value = selectedSegment.label
      return
    }
  }

  const currentSegment = segments.find(
    (segment) =>
      currentTime.value >= segment.startTime && currentTime.value <= segment.endTime
  )
  if (currentSegment) {
    selectedLabelType.value = currentSegment.label
  }
}

const startLabelMarking = (): void => {
  if (!canStartLabeling.value) return

  if (selectedVideoId.value) {
    videoStore.setCurrentVideo(selectedVideoId.value)
  }
  
  isMarkingLabel.value = true
  labelMarkingStart.value = currentTime.value
  
  // FIX: Use startDraft statt startDraftSegment
  videoStore.startDraft(selectedLabelType.value, currentTime.value)
  
  console.log(`Draft gestartet: ${selectedLabelType.value} bei ${formatTime(currentTime.value)}`)
}

const finishLabelMarking = async (): Promise<void> => {
  if (!isMarkingLabel.value || !selectedVideoId.value) return
  
  try {
    videoStore.setCurrentVideo(selectedVideoId.value)

    // FIX: Use updateDraftEnd und commitDraft statt finishDraftSegment
    videoStore.updateDraftEnd(currentTime.value)
    await videoStore.commitDraft()
    
    // Reset state (keep last selected label)
    isMarkingLabel.value = false
    
    // Reload segments to show the new one
    await loadVideoSegments()
    
    console.log('Label-Markierung abgeschlossen')
  } catch (error) {
    console.error('Error finishing label marking:', error)
  }
}

const cancelLabelMarking = (): void => {
  videoStore.cancelDraft()
  isMarkingLabel.value = false
  
  console.log('Label-Markierung abgebrochen')
}


const jumpToExamination = (examination: SavedExamination): void => {
  seekToTime(examination.timestamp)
  currentMarker.value = examinationMarkers.value.find(m => m.id === `exam-${examination.id}`) || null
}

const deleteExamination = async (examinationId: number): Promise<void> => {
  try {
    await axiosInstance.delete(r(`examinations/${examinationId}/`))
    
    // Remove from local arrays
    savedExaminations.value = savedExaminations.value.filter(e => e.id !== examinationId)
    examinationMarkers.value = examinationMarkers.value.filter(m => m.id !== `exam-${examinationId}`)
    
    // Clear current marker if it was deleted
    if (currentMarker.value?.id === `exam-${examinationId}`) {
      currentMarker.value = null
    }
    
    showSuccessMessage(`Untersuchung ${examinationId} gelöscht`)
    console.log('Examination deleted:', examinationId)
  } catch (error: any) {
    console.error('Error deleting examination:', error)
    await guarded(Promise.reject(error))
  }
}

// Validate all video segments (complete video review)
const submitVideoSegments = async (): Promise<void> => {
  if (!selectedVideoId.value) {
    showErrorMessage('Kein Video ausgewählt')
    return
  }

  const segmentCount = timelineSegmentsForSelectedVideo.value.length

  if (segmentCount === 0) {
    showErrorMessage('Keine Segmente zum Validieren vorhanden')
    return
  }

  // Confirm with user before validation
  if (
    !confirm(
      `Möchten Sie alle ${segmentCount} Segmente von Video ${selectedVideoId.value} als validiert markieren? Außerhalb-Segmente werden danach gelöscht.`
    )
  ) {
    return
  }

  // Build payload including updated start/end times (in seconds)
  const segmentPayload = timelineSegmentsForSelectedVideo.value
    .filter(s => typeof s.id === 'number')
    .map(s => ({
      id: s.id as number,
      // assuming Segment has startTime/endTime in seconds
      start_time: s.startTime,
      end_time: s.endTime,
    }))

  console.log('🔄 Sending segments to backend:', segmentPayload)

  try {
    console.log(`🔍 Validating all segments for video ${selectedVideoId.value}...`)

    const response = await axiosInstance.post(
      r(`media/videos/${selectedVideoId.value}/segments/validate-bulk/`),
      {
        segmentIds: segmentPayload.map(s => s.id),
        segments: segmentPayload,
        isValidated: true,
        notes: `Vollständige Video-Review abgeschlossen am ${new Date().toLocaleString('de-DE')}`,
        informationSourceName: 'manual_annotation', // or 'manual_validation', see backend
      }
    )


    console.log('✅ Validation response:', response.data)

    showSuccessMessage(
      `Erfolgreich! ${response.data.updatedCount} von ${response.data.totalSegments ?? response.data.requestedCount} Segmenten validiert.`
    )

    // Reload segments to reflect validation status + updated times
    await loadVideoSegments()
  } catch (error: any) {
    console.error('❌ Error validating video segments:', error)
    const errorMsg = error?.response?.data?.error || error?.message || 'Unbekannter Fehler'
    showErrorMessage(`Validierung fehlgeschlagen: ${errorMsg}`)
  }
}

const handleValidateAndMark = async (videoId: number | null): Promise<void> => {
  if (!videoId) {
    showErrorMessage('Kein Video ausgewählt')
    return
  }

  lastValidationClickedVideoId.value = videoId
  await submitVideoSegments()
  await markValidationFinishedRemoveOutside(videoId)
}




const saveSegmentChanges = async (): Promise<void> => {
  try {
    await videoStore.persistDirtySegments()
    await loadVideoSegments()
    showSuccessMessage('Segment-Änderungen gespeichert')
  } catch (error:any) {
    console.error('Fehler beim Speichern der Segment-Änderungen:', error)
    await guarded(Promise.reject(error))
  }
}

const discardSegmentChanges = (): void => {
  // simplest version: reload from backend
  if (!selectedVideoId.value) return
  videoStore.fetchVideoSegments(selectedVideoId.value)
  showSuccessMessage('Lokale Änderungen verworfen')
}


// Video event handlers from AnonymizationValidationComponent
const onVideoError = (event: Event): void => {
  console.error('Video loading error:', event)
  const video = event.target as HTMLVideoElement
  console.error('Video error details:', {
    error: video.error,
    networkState: video.networkState,
    readyState: video.readyState,
    currentSrc: video.currentSrc
  })
  showErrorMessage('Fehler beim Laden des Videos. Bitte versuchen Sie es erneut.')
}

const onVideoLoadStart = (): void => {
  console.log('Video loading started for:', anonymizedVideoSrc.value)
}

const onVideoCanPlay = (): void => {
  console.log('Video can play, loaded successfully')
  showSuccessMessage('Video erfolgreich geladen')
}

// ✅ NEW: Helper functions for video status display
const getVideoStatusIndicator = (videoId: number): string => {
  const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video')
  if (!item) return ''
  
  const statusIndicators: { [key: string]: string } = {
    'not_started': '⏳ Wartend',
    'processing_anonymization': '🔄 In Verarbeitung',
    'extracting_frames': '🎬 Frames',
    'done_processing_anonymization': '✅ Anonymisiert - Validierung steht aus',
    'validated': '🛡️ Validiert & Anonymisiert',
    'failed': '❌ Fehler'
  }
  
  return statusIndicators[item.anonymizationStatus] || item.anonymizationStatus
}

const markValidationFinishedRemoveOutside = async (videoId: number): Promise<void> => {
  try {
    await axiosInstance.post(
      r(`media/videos/${videoId}/segments/validation-status/`),
      {
        isValidated: true,
        notes: `Validierung manuell als abgeschlossen markiert am ${new Date().toLocaleString('de-DE')}`,
        informationSourceName: 'manual_validation',
      }
    )
    showSuccessMessage(`Validierung für Video ${videoId} als abgeschlossen markiert`)
    // Refresh overview to reflect status change
    await anonymizationStore.fetchOverview()
  } catch (error: any) {
    console.error('Error marking validation as finished:', error)
    await guarded(Promise.reject(error))
  }
}

const getVideoCountByStatus = (status: string): number => {
  return overview.value.filter(o => 
    o.mediaType === 'video' && o.anonymizationStatus === status
  ).length
}

const getStatusBadgeClass = (status: string): string => {
  const classes: { [key: string]: string } = {
    'not_started': 'bg-secondary',
    'processing_anonymization': 'bg-warning',
    'extracting_frames': 'bg-info',
    'predicting_segments': 'bg-info',
    'done_processing_anonymization': 'bg-success',
    'validated': 'bg-primary',
    'failed': 'bg-danger'
  }
  return classes[status] || 'bg-secondary'
}

const getStatusText = (status: string): string => {
  const texts: { [key: string]: string } = {
    'not_started': 'Nicht gestartet',
    'processing_anonymization': 'Anonymisierung läuft',
    'extracting_frames': 'Frames extrahieren',
    'predicting_segments': 'Segmente vorhersagen',
    'done_processing_anonymization': 'Fertig',
    'validated': 'Validiert',
    'failed': 'Fehlgeschlagen'
  }
  return texts[status] || status
}

// Enhanced validation status tracking
const isVideoValidated = (videoId: number): boolean => {
  const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video')
  return item?.anonymizationStatus === 'validated'
}

</script>

<style scoped>
.video-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  z-index: 100;
}

:fullscreen .label-overlay{
  display: flex !important;
  z-index: 2147483647;
}

.fullscreen-toggle {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 6;
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
}

.fullscreen-toggle:hover {
  background: rgba(0, 0, 0, 0.75);
}

.simple-timeline-track {
  position: relative;
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 10px;
  transition: width 0.1s ease;
}

.examination-marker {
  position: absolute;
  top: 0;
  width: 3px;
  height: 100%;
  background: #dc3545;
  cursor: pointer;
  z-index: 2;
}

.examination-marker:hover {
  background: #c82333;
  width: 5px;
}

.timeline-wrapper {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  background: #f8f9fa;
}

.timeline-controls {
  border-top: 1px solid #dee2e6;
  padding-top: 15px;
}

.control-select {
  min-width: 180px;
}

.control-button {
  min-width: 140px;
}

.debug-info {
  font-family: 'Courier New', monospace;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.list-group-item {
  border: none;
  border-bottom: 1px solid #dee2e6;
}

.list-group-item:last-child {
  border-bottom: none;
}

/* ✅ NEW: Embedded RequirementGenerator Styles */
.requirement-generator-embedded {
  /* Remove container padding for embedded use */
  padding: 0 !important;
}

.requirement-generator-embedded .container-fluid {
  padding: 0 !important;
}

.requirement-generator-embedded .card {
  border: none !important;
  box-shadow: none !important;
  margin-bottom: 1rem !important;
}

.requirement-generator-embedded .card-header {
  background: transparent !important;
  border-bottom: 1px solid #e9ecef !important;
  padding: 0.75rem !important;
}

.requirement-generator-embedded .card-body {
  padding: 0.75rem !important;
}

/* Compact alert styles for embedded view */
.requirement-generator-embedded .alert {
  padding: 0.5rem 0.75rem !important;
  margin-bottom: 0.75rem !important;
  font-size: 0.875rem !important;
}

/* Compact form controls */
.requirement-generator-embedded .form-control,
.requirement-generator-embedded .form-select {
  padding: 0.375rem 0.75rem !important;
  font-size: 0.875rem !important;
}

/* Compact buttons */
.requirement-generator-embedded .btn {
  padding: 0.375rem 0.75rem !important;
  font-size: 0.875rem !important;
}

/* Reduce spacing for embedded layout */
.requirement-generator-embedded .row {
  margin: 0 -0.5rem !important;
}

.requirement-generator-embedded .col-12,
.requirement-generator-embedded .col-md-6,
.requirement-generator-embedded .col-xl-6 {
  padding: 0 0.5rem !important;
}

/* ✅ NEW: Status display enhancements */
.video-status-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-left: 4px solid #007bff;
}

.status-badge-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-badge-container .badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
}

.video-dropdown-option {
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.video-dropdown {
  position: relative;
}

.video-dropdown-trigger {
  width: 100%;
  min-height: 42px;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  background: #ffffff;
  color: #212529;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.video-dropdown-trigger:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.video-dropdown-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  z-index: 2000;
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid #ced4da;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}

.video-dropdown-item {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eef1f4;
}

.video-dropdown-item:last-child {
  border-bottom: none;
}

.video-dropdown-item:hover:not(:disabled) {
  background: #f8f9fa;
}

.video-dropdown-item:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.video-dropdown-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.video-dropdown-title {
  font-weight: 600;
}

.video-dropdown-status-badge {
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
}

.badge-validated {
  background: #d1e7dd;
  color: #0f5132;
}

.badge-pending {
  background: #fff3cd;
  color: #664d03;
}

.video-dropdown-meta {
  font-size: 0.78rem;
  color: #5f6b76;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.video-dropdown-item-selected {
  background: #e7f1ff;
}

.video-dropdown-item-validated {
  border-left: 4px solid #198754;
}

.video-dropdown-item-pending {
  border-left: 4px solid #ffc107;
}

.validation-status-alert {
  border-left: 4px solid #28a745;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
}

.validation-status-alert .fas {
  opacity: 0.8;
}

.validation-action-button {
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid #1f7a3a;
  background: linear-gradient(135deg, #32b55b 0%, #239245 100%);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(35, 146, 69, 0.25);
}

.validation-action-button:hover {
  background: linear-gradient(135deg, #2ca650 0%, #1f7a3a 100%);
  color: #ffffff;
}

.validation-action-button:focus {
  box-shadow: 0 0 0 0.2rem rgba(35, 146, 69, 0.3);
}

.validation-action-button-clicked {
  border-color: #0f5a2b;
  background: linear-gradient(135deg, #248649 0%, #176b37 100%);
  box-shadow: 0 0 0 0.2rem rgba(36, 134, 73, 0.28);
}

.validation-action-icon {
  font-size: 18px;
}

.validation-click-indicator {
  border: 1px solid #d5dbe3;
}

.validation-click-indicator-active {
  background: linear-gradient(135deg, #e4f7eb 0%, #d2f0dd 100%);
  border-color: #2e9e55;
  color: #165b33;
}

.validation-click-indicator-muted {
  background: #f8f9fa;
  color: #495057;
}

.label-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 2147483647;
}

.label-overlay-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 12px;
  min-width: 260px;
  max-width: 70%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
}

.label-overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 4px;
}

.label-overlay-close {
  border: none;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.label-overlay-hint {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 8px;
}

.label-overlay-list {
  display: grid;
  gap: 6px;
  max-height: 45vh;
  overflow: auto;
}

.label-overlay-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #f8f9fa;
  cursor: pointer;
}

.label-overlay-item.active {
  border-color: #0d6efd;
  background: #e7f1ff;
}

.shortcuts-details {
  display: inline-block;
}

.shortcuts-toggle {
  list-style: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px 2px 6px;
  border: 1px solid #dee2e6;
  border-radius: 999px;
  background: #f8f9fa;
  cursor: pointer;
  user-select: none;
}

.shortcuts-toggle::-webkit-details-marker {
  display: none;
}

.shortcuts-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #0d6efd;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
}

.shortcuts-body {
  margin-top: 6px;
  padding: 6px 10px;
  border: 1px dashed #dee2e6;
  border-radius: 6px;
  background: #fff;
}
</style>
