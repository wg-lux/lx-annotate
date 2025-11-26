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
              <select v-model.number="selectedVideoId" @change="onVideoChange" class="form-select" :disabled="!hasVideos">
                <option :value="null">{{ hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar' }}</option>
                <option v-for="video in annotatableVideos" :key="video.id" :value="video.id">
                  📹 {{video.original_file_name || 'Video Nr. '+ video.id }} 
                  {{ getVideoStatusIndicator(video.id) }}
                  | Center: {{ video.centerName || 'Unbekannt' }} 
                  | Processor: {{ video.processorName || 'Unbekannt' }}
                </option>
              </select>
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
            <div v-if="anonymizedVideoSrc" class="video-container">
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
              <div v-if="selectedVideoId && timelineSegmentsForSelectedVideo.length > 0" class="mt-3 d-flex gap-2">
                <button
                  class="btn btn-outline-secondary"
                  @click="discardSegmentChanges"
                >
                  Änderungen verwerfen
                </button>

                <button
                  class="btn btn-primary"
                  @click="saveSegmentChanges"
                >
                  Segment-Änderungen speichern
                </button>
              </div>

              
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
                    v-model="selectedLabelType" 
                    @change="onLabelSelect"
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
                  Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
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
        <div v-if="selectedVideoId && timelineSegmentsForSelectedVideo.length > 0" class="mt-3">
          <!-- Show different button based on validation status -->
          <div v-if="overview.find(o => o.id === selectedVideoId && o.mediaType === 'video')?.anonymizationStatus === 'validated'" 
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
          
          <button 
            v-else
            class="btn btn-success btn-lg w-100 d-flex align-items-center justify-content-center gap-2"
            @click="submitVideoSegments"
            style="font-size: 1.1rem; padding: 15px;"
          >
            <i class="material-icons">check_circle</i>
            <span>Alle Segmente validieren ({{ timelineSegmentsForSelectedVideo.length }})</span>
          </button>
          
          <p v-if="overview.find(o => o.id === selectedVideoId && o.mediaType === 'video')?.anonymizationStatus !== 'validated'" 
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useVideoStore, type Segment, type Video } from '@/stores/videoStore'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useAuthStore } from '@/stores/authStore'
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

// Store setup
const videoStore = useVideoStore()
const mediaStore = useMediaTypeStore()

const { videoList, videoStreamUrl, timelineSegments } = storeToRefs(videoStore)

const videos = computed(() => videoList.value.videos)

const toastStore = useToastStore()
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
  return item?.anonymizationStatus === 'done_processing_anonymization'
}

// Reactive data
const selectedVideoId = ref<number | null>(initialVideoId)
const currentTime = ref<number>(0)
const duration = ref<number>(0)
const fps = ref<number>(50)
const isPlaying = ref<boolean>(false) // ✅ NEW: Track video playing state
const examinationMarkers = ref<ExaminationMarker[]>([])
const savedExaminations = ref<SavedExamination[]>([])
const currentMarker = ref<ExaminationMarker | null>(null)
const selectedLabelType = ref<string>('')
const isMarkingLabel = ref<boolean>(false)
const labelMarkingStart = ref<number>(0)
const selectedSegmentId = ref<number | null>(null)

// Video detail and metadata like VideoClassificationComponent
const videoDetail = ref<{ video_url: string } | null>(null)
const videoMeta = ref<{ duration: number; fps: number } | null>(null)

// Error and success messages for Bootstrap alerts
const errorMessage = ref<string>('')
const successMessage = ref<string>('')

// Template refs
const videoRef = ref<HTMLVideoElement | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
// Video Dropdown Watcher

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

  // Clear previous error messages when changing videos
  clearErrorMessage()
  clearSuccessMessage()

  try {
    await videoStore.loadVideo(selectedVideoId.value)
    await loadVideoDetail(selectedVideoId.value)
    await guarded(loadSavedExaminations())
    await guarded(loadVideoMetadata())
    
    // Load segments with error handling
    await guarded(videoStore.fetchAllSegments(selectedVideoId.value))
    
    console.log('Video fully loaded:', selectedVideoId.value)
  } catch (err: any) {
    console.error('loadSelectedVideo failed', err)
    await guarded(Promise.reject(err))
  }
}


function onVideoChange() {                // handler for the <select>
  loadSelectedVideo()
  /** update the url so users can bookmark / refresh */
  router.replace({ query: { video: selectedVideoId.value } })
}

//  fire loader whenever selectedVideoId changes programmatically  */
watch(selectedVideoId, loadSelectedVideo)
watch(
  () => route.query.video,
  v => {
    const id = Number(v ?? '') || null
    if (id !== selectedVideoId.value) selectedVideoId.value = id
  },
  { immediate: true }
)
// List of only videos that are both present in the list **and** in state `done` inside anonymizationStore
const annotatableVideos = computed(() =>
  videoList.value.videos.filter(v => isAnonymized(v.id))
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
  return annotatableVideos.value && annotatableVideos.value.length > 0
})

const noVideosMessage = computed(() => {
  if (videos.value.length === 0) {
    return 'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.'
  } else if (annotatableVideos.value.length === 0) {
    return 'Keine anonymisierten Videos verfügbar. Videos müssen erst anonymisiert werden.'
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
  } catch (error) {
    console.error('❌ [VideoExamination] Error during initial load:', error)
    showErrorMessage('Fehler beim Laden der Daten. Bitte Seite neu laden.')
  }
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

watch(selectedVideoId, (newId) => {
  console.log('Selected video ID changed, setting store to:', newId)
  if (typeof newId === 'number') {
    videoStore.setCurrentVideo(newId)
  }
  else {
    errorMessage.value = 'Invalid video ID'
  }
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
      duration: Number(response.data.duration ?? 0),
      fps: Number(response.data.fps ?? 25)
    }
    
    // Update MediaStore with the current video for consistent URL handling
    const currentVideo = annotatableVideos.value.find(v => v.id === videoId)
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

const loadVideoSegments = async (): Promise<void> => {
  if (selectedVideoId.value === null) return
  
  try {
    await videoStore.fetchAllSegments(selectedVideoId.value)
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

const startLabelMarking = (): void => {
  if (!canStartLabeling.value) return
  
  isMarkingLabel.value = true
  labelMarkingStart.value = currentTime.value
  
  // FIX: Use startDraft statt startDraftSegment
  videoStore.startDraft(selectedLabelType.value, currentTime.value)
  
  console.log(`Draft gestartet: ${selectedLabelType.value} bei ${formatTime(currentTime.value)}`)
}

const finishLabelMarking = async (): Promise<void> => {
  if (!isMarkingLabel.value || !selectedVideoId.value) return
  
  try {
    // FIX: Use updateDraftEnd und commitDraft statt finishDraftSegment
    videoStore.updateDraftEnd(currentTime.value)
    await videoStore.commitDraft()
    
    // Reset state
    isMarkingLabel.value = false
    selectedLabelType.value = ''
    
    // Reload segments to show the new one
    await loadVideoSegments()
    
    console.log('Label-Markierung abgeschlossen')
  } catch (error) {
    console.error('Error finishing label marking:', error)
  }
}

const cancelLabelMarking = (): void => {
  // FIX: Use cancelDraft statt cancelDraftSegment
  videoStore.cancelDraft()
  isMarkingLabel.value = false
  selectedLabelType.value = ''
  
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


const saveSegmentChanges = async (): Promise<void> => {
  try {
    await videoStore.persistDirtySegments()
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

.validation-status-alert {
  border-left: 4px solid #28a745;
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
}

.validation-status-alert .fas {
  opacity: 0.8;
}
</style>