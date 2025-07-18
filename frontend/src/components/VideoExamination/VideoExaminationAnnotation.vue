<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <h1>Video-Untersuchung Annotation</h1>
        <p>Annotieren Sie Untersuchungen während der Videobetrachtung</p>
      </div>
    </div>

    <div class="row">
      <!-- Video Player Section -->
      <div class="col-lg-8">
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
                <option v-for="annotatableVideos in videos" :key="annotatableVideos.id" :value="annotatableVideos.id">
                  {{annotatableVideos.original_file_name || 'Video Nr. '+ annotatableVideos.id }} {{ 'Center:' + annotatableVideos.centerName || 'Unbekanntes Zentrum' }} {{ 'Processor:' + annotatableVideos.processorName || 'Unbekannter Prozessor' }}
                </option>
              </select>
              <small v-if="!hasVideos" class="text-muted">
                {{ noVideosMessage }}
              </small>
            </div>

            <!-- No Video Selected State -->
            <div v-if="!videoStreamUrl && hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">movie</i>
              <p class="mt-2">Video auswählen, um mit der Betrachtung zu beginnen</p>
            </div>

            <!-- No Videos Available State -->
            <div v-if="!hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">video_library</i>
              <p class="mt-2">{{ noVideosMessage }}</p>
              <small>Videos können über den Ordner Raw Videos hochgeladen werden. Sie müssen erst anonymisiert werden, bevor sie hier angezeigt werden.</small>
            </div>

            <!-- Video Player -->
            <div v-if="videoStreamUrl" class="video-container">
              <video 
                ref="videoRef"
                data-cy="video-player"
                :src="videoStreamUrl"
                @timeupdate="handleTimeUpdate"
                @loadedmetadata="onVideoLoaded"
                controls
                class="w-100"
                style="max-height: 400px;"
              >
                Ihr Browser unterstützt das Video-Element nicht.
              </video>
            </div>

            <!-- Enhanced Timeline Component -->
            <div v-if="duration > 0" class="timeline-wrapper mt-3">
              <Timeline 
                :video="{ duration }"
                :segments="timelineSegments"
                :labels="timelineLabels"
                :current-time="currentTime"
                :is-playing="false"
                :active-segment-id="selectedSegmentId"
                :show-waveform="false"
                :selection-mode="true"
                :fps="fps"
                @seek="handleTimelineSeek"
                @segment-resize="handleSegmentResize"
                @segment-move="handleSegmentMove"
                @segment-create="handleCreateSegment"
                @time-selection="handleTimeSelection"
                @delete-segment="handleSegmentDelete"
              />
              
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
                Timeline Debug: {{ rawSegments.length }} Segmente geladen | 
                Duration: {{ formatTime(duration) }} | 
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
                    <option value="appendix">Appendix</option>
                    <option value="blood">Blut</option>
                    <option value="diverticule">Divertikel</option>
                    <option value="grasper">Greifer</option>
                    <option value="ileocaecalvalve">Ileozäkalklappe</option>
                    <option value="ileum">Ileum</option>
                    <option value="low_quality">Niedrige Bildqualität</option>
                    <option value="nbi">Narrow Band Imaging</option>
                    <option value="needle">Nadel</option>
                    <option value="outside">Außerhalb</option>
                    <option value="polyp">Polyp</option>
                    <option value="snare">Snare</option>
                    <option value="water_jet">Wasserstrahl</option>
                    <option value="wound">Wunde</option>
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
                  <span v-if="videoStore.draftSegment.end">
                    von {{ formatTime(videoStore.draftSegment.start) }} bis {{ formatTime(videoStore.draftSegment.end) }}
                  </span>
                  <span v-else>
                    startet bei {{ formatTime(videoStore.draftSegment.start) }} - Ende beim nächsten Klick
                  </span>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Examination Form Section -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">Untersuchungsdetails</h5>
            <small class="text-muted" v-if="currentMarker">
              Zeitpunkt: {{ formatTime(currentMarker.timestamp) }}
            </small>
          </div>
          <div class="card-body">
            <SimpleExaminationForm 
              v-if="showExaminationForm"
              :video-timestamp="currentTime"
              :video-id="selectedVideoId"
              @examination-saved="onExaminationSaved"
              data-cy="examination-form"
            />
            <div v-else class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">videocam</i>
              <p class="mt-2">Wählen Sie ein Video aus, um mit der Annotation zu beginnen</p>
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
import { useVideoStore, type Video } from '@/stores/videoStore'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useAnnotationStore } from '@/stores/annotationStore'
import { useAuthStore } from '@/stores/authStore'
import SimpleExaminationForm from '@/components/Examination/SimpleExaminationForm.vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import Timeline from '@/components/EndoAI/Timeline.vue'
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
  segmentId: string
  newStart: number
  newEnd: number
}

interface CreateSegmentEvent {
  label: string
  start: number
  end: number
}

// Add interface for Timeline-compatible Segment
interface Segment {
  id: string | number;
  label: string;
  label_display: string;
  name: string; // <‑‑ NEW ➜ shown inside pill
  startTime: number;     // ✅ Timeline expects this field name
  endTime: number;       // ✅ Timeline expects this field name
  avgConfidence: number;
  video_id?: number;
  label_id?: number;
}

// Store setup
const videoStore = useVideoStore()

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
 * helper: returns true when a video's anonymization status is 'done'
 */
 function isAnonymized(videoId: number): boolean {
  const item = overview.value.find(o => o.id === videoId && o.mediaType === 'video')
  return item?.anonymizationStatus === 'done'
}

// Reactive data
const selectedVideoId = ref<number | null>(initialVideoId)
const currentTime = ref<number>(0)
const duration = ref<number>(0)
const fps = ref<number>(50)
const examinationMarkers = ref<ExaminationMarker[]>([])
const savedExaminations = ref<SavedExamination[]>([])
const currentMarker = ref<ExaminationMarker | null>(null)
const selectedLabelType = ref<string>('')
const isMarkingLabel = ref<boolean>(false)
const labelMarkingStart = ref<number>(0)
const selectedSegmentId = ref<string | number | null>(null)

// Template refs
const videoRef = ref<HTMLVideoElement | null>(null)
const timelineRef = ref<HTMLElement | null>(null)

// Video Dropdown Watcher

async function loadSelectedVideo() {  
  if (selectedVideoId.value == null) {
    videoStore.clearVideo()
    return
  }

  try {
    await videoStore.loadVideo(String(selectedVideoId.value))
    await loadSavedExaminations()                 // was only in the old onVideoChange
    await loadVideoMetadata()                    // keep segment behaviour
  } catch (err) {
    console.error('loadVideo failed', err)
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
  return selectedVideoId.value !== null && videoStreamUrl.value !== ''
})

const hasVideos = computed(() => {
  return videos.value && videos.value.length > 0
})

const noVideosMessage = computed(() => {
  return videos.value.length === 0 ? 
    'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.' : 
    ''
})

const groupedSegments = computed(() => {
  return videoStore.segmentsByLabel
})

const canStartLabeling = computed(() => {
  return selectedVideoId.value && 
         videoStreamUrl.value && 
         selectedLabelType.value && 
         !isMarkingLabel.value &&
         duration.value > 0
})


onMounted(videoStore.fetchAllVideos)

const loadSavedExaminations = async (): Promise<void> => {
  if (selectedVideoId.value === null) return
  
  try {
    const response = await axiosInstance.get(r(`video/${selectedVideoId.value}/examinations/`))
    savedExaminations.value = response.data
    
    // Create markers for saved examinations
    examinationMarkers.value = response.data.map((exam: SavedExamination): ExaminationMarker => ({
      id: `exam-${exam.id}`,
      timestamp: exam.timestamp,
      examination_data: exam.data
    }))
  } catch (error) {
    console.error('Error loading saved examinations:', error)
    savedExaminations.value = []
    examinationMarkers.value = []
  }
}

const _onVideoChange = async (): Promise<void> => {
  if (selectedVideoId.value !== null) {
    loadSavedExaminations()
    
    // Load all segments for all labels
    try {
      // 1. Set current video in store FIRST
      await videoStore.loadVideo(selectedVideoId.value.toString())
      
      // 2. Wait for video metadata to load
      await loadVideoMetadata()
      
      // 3. Fetch segments for all labels as specified in requirements
      console.log('Loading segments for all labels...')
      await Promise.all(
        videoStore.labels.map(l => videoStore.segmentsByLabel)
      )
      
      // 4. Show toast message when all segments are loaded
      toastStore.success({
        text: `Alle Segmente für Video ${selectedVideoId.value} geladen`
      })
      
      // 5. Debug log the loaded segments
      console.log('📊 Segments loaded:')
      console.log('- Timeline segments:', rawSegments.value.length)
      console.log('- Store segments by label:', Object.keys(videoStore.segmentsByLabel).length)
      console.log('- First few segments:', rawSegments.value.slice(0, 3))
      
    } catch (error) {
      console.error('Error loading video data:', error)
      toastStore.error({
        text: 'Fehler beim Laden der Video-Segmente'
      })
    }
    
    currentMarker.value = null
  } else {
    // Clear everything when no video selected
    examinationMarkers.value = []
    savedExaminations.value = []
    currentMarker.value = null
    videoStore.clearVideo()
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
    await videoStore.fetchAllSegments(selectedVideoId.value.toString())
    console.log('Video segments loaded for video:', selectedVideoId.value)
    console.log('Timeline segments count:', rawSegments.value.length)
  } catch (error) {
    console.error('Error loading video segments:', error)
  }
}

const onVideoLoaded = (): void => {
  if (videoRef.value) {
    duration.value = videoRef.value.duration
    
    console.log('🎥 Video loaded - Frontend')
    console.log(`- Video source URL: ${videoStreamUrl.value}`)
    console.log(`- Video readyState: ${videoRef.value.readyState}`)
    console.log(`- Video networkState: ${videoRef.value.networkState}`)
    
    if (videoRef.value.videoWidth && videoRef.value.videoHeight) {
      console.log(`- Video dimensions: ${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`)
    }
    
    if (duration.value < 10) {
      console.warn(`⚠️ WARNING: Video duration seems very short (${duration.value}s)`)
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

const handleTimelineSeek = (time: number): void => {
  seekToTime(time)
}

const handleSegmentResize = (segmentId: string | number, newStart: number, newEnd: number, mode: string, final?: boolean): void => {
  // ✅ NEW: Verbesserte Guard für Draft/Temp-Segmente (camelCase in finalen PATCH-Aufrufen)
  if (typeof segmentId === 'string') {
    if (segmentId === 'draft' || /^temp-/.test(segmentId)) {
      console.warn('[VideoExamination] Ignoring resize for draft/temp segment:', segmentId)
      return
    }
  }
  
  const numericId = typeof segmentId === 'string' ? parseInt(segmentId, 10) : segmentId
  
  if (isNaN(numericId)) {
    console.warn('[VideoExamination] Invalid segment ID for resize:', segmentId)
    return
  }
  
  if (final) {
    // ✅ NEW: Sofortige Previews + Speichern bei Mouse-Up
    videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd })
    videoStore.updateSegment(numericId, { startTime: newStart, endTime: newEnd })
    console.log(`✅ Segment ${numericId} resized and saved: ${formatTime(newStart)} - ${formatTime(newEnd)}`)
  } else {
    // ✅ NEW: Real-time preview während Drag ohne Backend-Aufruf
    videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd })
    console.log(`Preview resize segment ${numericId} ${mode}: ${formatTime(newStart)} - ${formatTime(newEnd)}`)
  }
}

const handleSegmentMove = (segmentId: string | number, newStart: number, newEnd: number, final?: boolean): void => {
  // Verbesserte Guard für Draft/Temp-Segmente (camelCase in finalen PATCH-Aufrufen)
  if (typeof segmentId === 'string') {
    if (segmentId === 'draft' || /^temp-/.test(segmentId)) {
      console.warn('[VideoExamination] Ignoring move for draft/temp segment:', segmentId)
      return
    }
  }
  
  const numericId = typeof segmentId === 'string' ? parseInt(segmentId, 10) : segmentId
  
  if (isNaN(numericId)) {
    console.warn('[VideoExamination] Invalid segment ID for move:', segmentId)
    return
  }
  
  if (final) {
    videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd })
    videoStore.updateSegment(numericId, { startTime: newStart, endTime: newEnd })
    console.log(`✅ Segment ${numericId} moved and saved: ${formatTime(newStart)} - ${formatTime(newEnd)}`)
  } else {
    // ✅ NEW: Real-time preview während Drag ohne Backend-Aufruf
    videoStore.patchSegmentLocally(numericId, { startTime: newStart, endTime: newEnd })
    console.log(`Preview move segment ${numericId}: ${formatTime(newStart)} - ${formatTime(newEnd)}`)
  }
}

const handleTimeSelection = (data: { start: number; end: number }): void => {
  // Handle time selection for creating new segments
  if (selectedLabelType.value && selectedVideoId.value) {
    handleCreateSegment({
      label: selectedLabelType.value,
      start: data.start,
      end: data.end
    })
  }
}

const handleCreateSegment = async (event: CreateSegmentEvent): Promise<void> => {
  if (selectedVideoId.value) {
    // FIX: Use the correct method signature from videoStore
    await videoStore.createSegment?.(
      selectedVideoId.value.toString(), 
      event.label, 
      event.start, 
      event.end
    )
  }
}

const handleSegmentDelete = async (segment: Segment): Promise<void> => {
  if (!segment.id || typeof segment.id !== 'number') {
    console.warn('Cannot delete draft or temporary segment:', segment.id)
    return
  }

  try {
    // 1. Remove from store
    videoStore.removeSegment(segment.id)

    // 2. Perform API call
    await videoStore.deleteSegment(segment.id)

    toastStore.success({
      text: `Segment gelöscht: ${getTranslationForLabel(segment.label)}`
    })
  } catch (err) {
    console.error('Segment konnte nicht gelöscht werden:', err)
    toastStore.error({
      text: 'Fehler beim Löschen des Segments'
    })
  }
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

const onExaminationSaved = async (examination: SavedExamination): Promise<void> => {
  // Add new examination to list
  savedExaminations.value.push(examination)
  
  // Create new marker
  const marker: ExaminationMarker = {
    id: `exam-${examination.id}`,
    timestamp: examination.timestamp,
    examination_data: examination.data
  }
  examinationMarkers.value.push(marker)
  
  // ✅ NEW: Create corresponding annotation for examination
  try {
    const annotationStore = useAnnotationStore()
    const authStore = useAuthStore()
    
    // Ensure mock user is initialized
    authStore.initMockUser()
    
    if (authStore.user?.id && selectedVideoId.value) {
      await annotationStore.createExaminationAnnotation(
        selectedVideoId.value.toString(),
        examination.timestamp,
        examination.examination_type || 'examination',
        examination.id,
        authStore.user.id
      )
      console.log(`✅ Created annotation for examination ${examination.id}`)
    } else {
      console.warn('No authenticated user or video ID found for examination annotation creation')
    }
  } catch (annotationError) {
    console.error('Failed to create examination annotation:', annotationError)
    // Don't fail the examination save if annotation fails
  }
  
  console.log('Examination saved:', examination)
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
    
    console.log('Examination deleted:', examinationId)
  } catch (error) {
    console.error('Error deleting examination:', error)
  }
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
</style>