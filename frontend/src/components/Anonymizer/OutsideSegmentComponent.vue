<!-- src/components/Anonymizer/OutsideSegmentComponent.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import axiosInstance from '@/api/axiosInstance'
import { useVideoStore, type Segment } from '@/stores/videoStore'
import Timeline from '@/components/VideoExamination/Timeline.vue'

/**
 * Props: which video to display
 */
const props = defineProps<{
  videoId: number
}>()

/**
 * Emits for parent component
 */
const emit = defineEmits<{
  'segment-validated': [segmentId: string | number]
  'validation-complete': []
}>()

/**
 * Local state for the player + meta
 */
const videoEl = ref<HTMLVideoElement | null>(null)
const videoUrl = ref<string>('')                  // backend-provided stream URL
const duration = ref<number>(0)                   // seconds
const currentTime = ref<number>(0)
const isPlaying = ref<boolean>(false)

/**
 * Store with segments
 */
const videoStore = useVideoStore()

/**
 * Validation state
 */
const validatedSegments = ref<Set<string | number>>(new Set())
const isValidating = ref<boolean>(false)

/**
 * Fetch backend detail to get canonical video_url + duration (don't reconstruct in client)
 */
async function loadVideoDetail(videoId: number) {
  const { data } = await axiosInstance.get(`/api/media/videos/${videoId}/`)
  videoUrl.value = data.video_url
  duration.value = Number(data.duration ?? 0)
}

/**
 * Keep store segments updated
 */
async function loadSegments(videoId: number) {
  await videoStore.fetchAllSegments(videoId)
}

/**
 * Filter to ONLY 'outside' segments (case-insensitive), clone to avoid readonly issues
 */
const outsideSegments = computed<Segment[]>(() => {
  const raw = videoStore.allSegments ?? []
  return raw
    .filter((s: Segment) => (s.label ?? '').toLowerCase() === 'outside')
    .map((s: Segment) => ({ ...s })) // shallow mutable copy (prevents readonly->mutable errors in child)
})

/**
 * Get segments that still need validation
 */
const unvalidatedSegments = computed<Segment[]>(() => {
  return outsideSegments.value.filter(s => !validatedSegments.value.has(s.id))
})

/**
 * Check if all segments are validated
 */
const allSegmentsValidated = computed<boolean>(() => {
  return outsideSegments.value.length > 0 && unvalidatedSegments.value.length === 0
})

/**
 * Validate a specific segment
 */
async function validateSegment(segment: Segment) {
  if (validatedSegments.value.has(segment.id) || isValidating.value) return
  
  isValidating.value = true
  
  try {
    // Emit validation event to parent
    validatedSegments.value.add(segment.id)
    emit('segment-validated', segment.id)
    
    console.log(`✅ Segment ${segment.id} validated`)
    
    // Check if all segments are now validated
    if (allSegmentsValidated.value) {
      emit('validation-complete')
      console.log('🎉 All outside segments validated!')
    }
    
  } catch (error) {
    console.error('Error validating segment:', error)
    validatedSegments.value.delete(segment.id)
  } finally {
    isValidating.value = false
  }
}

/**
 * Validate all segments at once
 */
async function validateAllSegments() {
  for (const segment of unvalidatedSegments.value) {
    await validateSegment(segment)
  }
}

/**
 * Reset validation state
 */
function resetValidation() {
  validatedSegments.value.clear()
}

/**
 * Format time in MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Keep video element and timeline in sync
 */
onMounted(() => {
  if (!videoEl.value) return
  // If backend didn't return duration, fall back to media metadata
  videoEl.value.addEventListener('loadedmetadata', () => {
    if (!duration.value && videoEl.value) duration.value = videoEl.value.duration || 0
  })
  videoEl.value.addEventListener('timeupdate', () => {
    if (!videoEl.value) return
    currentTime.value = videoEl.value.currentTime
  })
  videoEl.value.addEventListener('play', () => { isPlaying.value = true })
  videoEl.value.addEventListener('pause', () => { isPlaying.value = false })
})

watch(() => props.videoId, async (id) => {
  resetValidation() // Reset validation when video changes
  await Promise.all([loadVideoDetail(id), loadSegments(id)])
}, { immediate: true })

/**
 * Wrapper handlers (avoid TS2322 from the child’s template listeners)
 */
function onSeek(...args: unknown[]) {
  const [time] = args as [number]
  if (videoEl.value && Number.isFinite(time)) {
    videoEl.value.currentTime = time
  }
  currentTime.value = time
}

function onPlayPause() {
  if (!videoEl.value) return
  if (videoEl.value.paused) videoEl.value.play().catch(() => {})
  else videoEl.value.pause()
  isPlaying.value = !videoEl.value.paused
}

// These are no-ops (read-only view). Keep them if you want to log.
function onSegmentCreate() {}
function onSegmentResize() {}
function onSegmentMove() {}
function onTimeSelection() {}
function onSegmentSelect() {}
function onSegmentEdit() {}
function onSegmentDelete() {}
</script>

<template>
  <div class="video-with-outside-timeline">
    <!-- Validation Status -->
    <div v-if="outsideSegments.length > 0" class="validation-status mb-3">
      <div class="row align-items-center">
        <div class="col-md-8">
          <div class="progress">
            <div 
              class="progress-bar" 
              :class="allSegmentsValidated ? 'bg-success' : 'bg-warning'"
              :style="`width: ${(validatedSegments.size / outsideSegments.length) * 100}%`"
            >
              {{ validatedSegments.size }} / {{ outsideSegments.length }} validiert
            </div>
          </div>
        </div>
        <div class="col-md-4 text-end">
          <button 
            class="btn btn-sm btn-success me-2"
            @click="validateAllSegments"
            :disabled="isValidating || allSegmentsValidated"
          >
            <span v-if="isValidating" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="fas fa-check-double me-1"></i>
            Alle validieren
          </button>
          <button 
            class="btn btn-sm btn-outline-secondary"
            @click="resetValidation"
            :disabled="isValidating || validatedSegments.size === 0"
          >
            <i class="fas fa-redo me-1"></i>
            Zurücksetzen
          </button>
        </div>
      </div>
    </div>

    <!-- Video Player -->
    <video
      ref="videoEl"
      :src="videoUrl"
      controls
      style="width: 100%; max-height: 480px;"
    />

    <!-- Segments Overview -->
    <div v-if="outsideSegments.length > 0" class="segments-overview mb-3">
      <h6>Outside-Segmente ({{ outsideSegments.length }})</h6>
      <div class="segments-list">
        <div 
          v-for="segment in outsideSegments" 
          :key="segment.id"
          class="segment-item d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
          :class="{
            'border-success bg-success bg-opacity-10': validatedSegments.has(segment.id),
            'border-warning bg-warning bg-opacity-10': !validatedSegments.has(segment.id)
          }"
        >
          <div>
            <strong>Segment {{ segment.id }}</strong>
            <span class="ms-2 text-muted">
              {{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }}
            </span>
            <span class="ms-2 badge bg-secondary">{{ segment.label }}</span>
          </div>
          <div>
            <button 
              v-if="!validatedSegments.has(segment.id)"
              class="btn btn-sm btn-outline-success"
              @click="validateSegment(segment)"
              :disabled="isValidating"
            >
              <i class="fas fa-check me-1"></i>
              Validieren
            </button>
            <span v-else class="text-success">
              <i class="fas fa-check-circle me-1"></i>
              Validiert
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- No segments message -->
    <div v-else class="alert alert-info">
      <i class="fas fa-info-circle me-2"></i>
      Keine "Outside"-Segmente für Video {{ props.videoId }} gefunden.
    </div>

    <!-- Timeline -->
    <Timeline
      v-if="outsideSegments.length > 0"
      :video="{ duration }"
      :segments="outsideSegments"
      :current-time="currentTime"
      :is-playing="isPlaying"
      :selection-mode="false"   
      @seek="onSeek"
      @play-pause="onPlayPause"
      @segment-create="onSegmentCreate"
      @segment-resize="onSegmentResize"
      @segment-move="onSegmentMove"
      @time-selection="onTimeSelection"
      @segment-select="onSegmentSelect"
      @segment-edit="onSegmentEdit"
      @segment-delete="onSegmentDelete"
    />
  </div>
</template>

<style scoped>
.video-with-outside-timeline {
  display: grid;
  gap: 12px;
}
/* Optional: fully disable interactions in this usage */
.video-with-outside-timeline :deep(.timeline .segment) {
  pointer-events: none;
}
</style>
