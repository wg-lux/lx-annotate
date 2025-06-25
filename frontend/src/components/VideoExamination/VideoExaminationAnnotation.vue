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
                <option v-for="video in videos" :key="video.id" :value="video.id">
                  {{ video.center_name || 'Unbekannt' }} - {{ video.processor_name || 'Unbekannt' }}
                </option>
              </select>
              <small v-if="!hasVideos" class="text-muted">
                {{ noVideosMessage }}
              </small>
            </div>

            <!-- No Video Selected State -->
            <div v-if="!currentVideoUrl && hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">movie</i>
              <p class="mt-2">Video auswählen, um mit der Betrachtung zu beginnen</p>
            </div>

            <!-- No Videos Available State -->
            <div v-if="!hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">video_library</i>
              <p class="mt-2">{{ noVideosMessage }}</p>
              <small>Videos können über das Dashboard hochgeladen werden.</small>
            </div>

            <!-- Video Player -->
            <div v-if="currentVideoUrl" class="video-container">
              <video 
                ref="videoRef"
                :src="currentVideoUrl"
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
                :segments="mappedTimelineSegments"
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
                  >
                    <i class="material-icons">label</i>
                    Label-Start setzen
                  </button>
                  
                  <button 
                    v-if="isMarkingLabel"
                    @click="finishLabelMarking" 
                    class="btn btn-warning btn-sm control-button"
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
          <div class="card-body">
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { useVideoStore } from '@/stores/videoStore'
import SimpleExaminationForm from './SimpleExaminationForm.vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import Timeline from '@/components/EndoAI/Timeline.vue'
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toastStore'

// Type definitions
interface Video {
  id: number
  center_name?: string
  processor_name?: string
  original_file_name?: string
  status?: string
  video_url?: string
  [key: string]: any
}

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
const toastStore = useToastStore()
const { allSegments: rawSegments } = storeToRefs(videoStore)

const mappedTimelineSegments = computed<Segment[]>(() =>
  rawSegments.value.map((s): Segment => ({
    id: s.id,
    label: s.label,
    label_display: getTranslationForLabel(s.label),
    name: getTranslationForLabel(s.label),   // <‑‑ NEW ➜ shown inside pill
    startTime: s.startTime ?? 0,
    endTime: s.endTime ?? 0,
    avgConfidence: s.avgConfidence ?? 1,
    video_id: selectedVideoId.value ?? undefined,
    label_id: s.labelID ?? undefined
  }))
)

// ✅ FIX: Use spread operator to convert readonly array to mutable array
const timelineLabels = computed(() => {
  const storeLabels = videoStore.labels || []
  return [...storeLabels] // Convert readonly array to mutable array
})



// Reactive data
const videos = ref<Video[]>([])
const selectedVideoId = ref<number | null>(null)
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

// Computed properties
const currentVideoUrl = computed(() => {
  const video = videos.value.find(v => v.id === selectedVideoId.value)
  if (!video) return ''
  
  // Use the dedicated streaming endpoint from urls.py
  return video.video_url || `/api/videostream/${video.id}/`
})

const showExaminationForm = computed(() => {
  return selectedVideoId.value !== null && currentVideoUrl.value !== ''
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
         currentVideoUrl.value && 
         selectedLabelType.value && 
         !isMarkingLabel.value &&
         duration.value > 0
})


// Methods
const loadVideos = async (): Promise<void> => {
  try {
    console.log('Loading videos from API...')
    const response = await axiosInstance.get(r('videos/'))
    console.log('Videos API response:', response.data)
    
    // API returns {videos: [...], labels: [...]} structure
    const videosData = response.data.videos || response.data || []
    
    // Ensure IDs are numbers and add missing fields
    videos.value = videosData.map((v: any): Video => ({ 
      ...v, 
      id: Number(v.id),
      center_name: v.center_name || v.original_file_name || 'Unbekannt',
      processor_name: v.processor_name || v.status || 'Unbekannt',
      video_url: `/api/videostream/${v.id}/`
    }))
    
    if (videos.value.length > 0) {
      console.log('First video structure after processing:', videos.value[0])
    }
  } catch (error) {
    console.error('Error loading videos:', error)
    videos.value = []
  }
}

onMounted(loadVideos)

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

const onVideoChange = async (): Promise<void> => {
  if (selectedVideoId.value !== null) {
    loadSavedExaminations()
    
    // ✅ NEW: Load all segments for all labels as requested
    try {
      // 1. Set current video in store FIRST
      await videoStore.loadVideo(selectedVideoId.value.toString())
      
      // 2. Wait for video metadata to load
      await loadVideoMetadata()
      
      // 3. ✅ NEW: Fetch segments for ALL labels as specified in requirements
      console.log('Loading segments for all labels...')
      await Promise.all(
        videoStore.labels.map(l => videoStore.segmentsByLabel)
      )
      
      // 4. ✅ NEW: Show toast message when all segments are loaded
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
    
    console.log('🎥 Video loaded - Frontend duration info:')
    console.log(`- Duration from HTML5 video element: ${duration.value}s`)
    console.log(`- Video source URL: ${currentVideoUrl.value}`)
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
  // ✅ NEW: Verbesserte Guard für Draft/Temp-Segmente (camelCase in finalen PATCH-Aufrufen)
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
    // ✅ NEW: Sofortige Previews + Speichern bei Mouse-Up
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

const onExaminationSaved = (examination: SavedExamination): void => {
  // Add new examination to list
  savedExaminations.value.push(examination)
  
  // Create new marker
  const marker: ExaminationMarker = {
    id: `exam-${examination.id}`,
    timestamp: examination.timestamp,
    examination_data: examination.data
  }
  examinationMarkers.value.push(marker)
  
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

const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '00:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getTranslationForLabel = (label: string): string => {
  const translations: Record<string, string> = {
    'appendix': 'Appendix',
    'blood': 'Blut',
    'diverticule': 'Divertikel',
    'grasper': 'Greifer',
    'ileocaecalvalve': 'Ileozäkalklappe',
    'ileum': 'Ileum',
    'low_quality': 'Niedrige Bildqualität',
    'nbi': 'Narrow Band Imaging',
    'needle': 'Nadel',
    'outside': 'Außerhalb',
    'polyp': 'Polyp',
    'snare': 'Snare',
    'water_jet': 'Wasserstrahl',
    'wound': 'Wunde'
  }
  
  return translations[label] || label
}

// Lifecycle
onMounted(async () => {
  await loadVideos()
  if (videos.value.length) {
    selectedVideoId.value = videos.value[0].id
    await onVideoChange()
  } else {
    console.warn('No videos available to select.')
  }
  if (selectedVideoId.value) {
    await loadVideoSegments()
  }

})
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