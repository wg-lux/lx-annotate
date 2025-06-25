<template>
  <div class="timeline-container">
    <div class="timeline-header">
      <div class="timeline-controls">
        <button 
          @click="playPause" 
          class="play-btn"
          :disabled="!video"
        >
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
        <span class="time-display">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </span>
      </div>
      <div class="zoom-controls">
        <button @click="zoomOut" :disabled="zoomLevel <= 1">
          <i class="fas fa-search-minus"></i>
        </button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button @click="zoomIn" :disabled="zoomLevel >= 5">
          <i class="fas fa-search-plus"></i>
        </button>
      </div>
    </div>

    <div class="timeline-wrapper" :style="{ height: timelineHeight + 'px' }">
      <div class="timeline" ref="timeline" @mousedown="onTimelineMouseDown" :style="{ height: timelineHeight + 'px' }">
        <!-- Time markers -->
        <div class="time-markers">
          <div 
            v-for="marker in timeMarkers" 
            :key="marker.time"
            class="time-marker"
            :style="{ left: marker.position + '%' }"
          >
            <div class="marker-line" :style="{ height: timelineHeight + 'px' }"></div>
            <div class="marker-text">{{ formatTime(marker.time) }}</div>
          </div>
        </div>

        <!-- ✅ NEW: Multi-row segment layout -->
        <div class="segments-container">
          <div 
            v-for="(row, rowIndex) in segmentRows"
            :key="row.id"
            class="segment-row"
            :class="{ 'active': row.label === selectedLabel }"
            :style="{ 
              top: (60 + rowIndex * 45) + 'px',
              height: '40px'
            }"
          >
            <div 
              v-for="segment in row.segments"
              :key="segment.id"
              class="segment"
              :class="{ 
                'active': segment.id === activeSegmentId,
                'draft': segment.isDraft,
                'dragging': segment.id === draggingSegmentId
              }"
              :style="{
                left: getSegmentPosition(segment.start) + '%',
                width: getSegmentWidth(segment.start, segment.end) + '%',
                backgroundColor: segment.color || getColorForLabel(segment.label),
                borderColor: segment.isDraft ? '#ff9800' : 'transparent'
              }"
              @click="selectSegment(segment)"
              @contextmenu.prevent="showSegmentMenu(segment, $event)"
              @mousedown="startSegmentDrag(segment, $event)"
            >
              <!-- Start resize handle -->
              <div 
                class="resize-handle start-handle"
                @mousedown.stop="startResize(segment, 'start', $event)"
                :title="'Segment-Start ändern'"
              >
                <i class="fas fa-grip-lines-vertical"></i>
              </div>

              <div class="segment-content">
                <!-- ✅ FIX 8: Use getTranslationForLabel instead of segment.label_name -->
                <span class="segment-label">{{ getTranslationForLabel(segment.label) }}</span>
                <span class="segment-duration">{{ formatDuration(segment.start, segment.end) }}</span>
              </div>

              <!-- End resize handle -->
              <div 
                class="resize-handle end-handle"
                @mousedown.stop="startResize(segment, 'end', $event)"
                :title="'Segment-Ende ändern'"
              >
                <i class="fas fa-grip-lines-vertical"></i>
              </div>

              <div v-if="segment.isDraft" class="draft-indicator">
                <i class="fas fa-edit"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Playhead -->
        <div 
          class="playhead"
          :style="{ left: playheadPosition + '%', height: timelineHeight + 'px' }"
        >
          <div class="playhead-line" :style="{ height: timelineHeight + 'px' }"></div>
          <div class="playhead-handle"></div>
        </div>

        <!-- Selection overlay for new segments -->
        <div 
          v-if="isSelecting"
          class="selection-overlay"
          :style="{
            left: Math.min(selectionStart, selectionEnd) + '%',
            width: Math.abs(selectionEnd - selectionStart) + '%',
            height: timelineHeight + 'px'
          }"
        ></div>
      </div>

      <!-- Waveform visualization (optional) -->
      <div v-if="showWaveform" class="waveform-container">
        <canvas ref="waveformCanvas" class="waveform-canvas"></canvas>
      </div>
    </div>

    <!-- Context menu for segments -->
    <div 
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div class="context-menu-item" @click="editSegment(contextMenu.segment)">
        <i class="fas fa-edit"></i>
        Segment bearbeiten
      </div>
      <div class="context-menu-item danger" @click="deleteSegment(contextMenu.segment)">
        <i class="fas fa-trash"></i>
        Segment löschen
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="playSegment(contextMenu.segment)">
        <i class="fas fa-play"></i>
        Segment abspielen
      </div>
    </div>

    <!-- Timeline tooltip -->
    <div 
      v-if="tooltip.visible"
      class="timeline-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { 
  formatTime as formatTimeHelper,
  calculateSegmentWidth,
  calculateSegmentPosition
} from '@/utils/timeHelpers'
import { useVideoStore } from '@/stores/videoStore'
import {
  type Segment,
  type LabelMeta 
} from '@/stores/videoStore'
import {
  convertBackendSegmentToFrontend,
  convertFrontendSegmentToBackend,
  convertBackendSegmentsToFrontend,
  createSegmentUpdatePayload,
  normalizeSegmentToCamelCase,
  debugSegmentConversion,
} from '@/utils/caseConversion'
import { useToastStore } from '@/stores/toastStore'
import { getRandomColor } from '@/utils/colorHelpers'

const toast = useToastStore()
const videoStore = useVideoStore()
const segmentsByLabel = videoStore.segmentsByLabel

// Type definitions
interface TimeMarker {
  time: number
  position: number
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  segment: Segment | null
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  text: string
}

interface OriginalSegmentData {
  start_time: number
  end_time: number
}

interface CanonicalSegment extends Segment {
  start: number
  end: number
  isDraft?: boolean
  color?: string
  avgConfidence: number; // Required to match Segment interface
}

// ✅ NEW: Multi-row segment layout algorithm
interface SegmentRow {
  id: number
  label: string
  segments: CanonicalSegment[]
  maxEndTime: number
}

const props = defineProps<{
  video?: { duration?: number } | null  // ✅ FIX: Use inline type instead of private VideoData interface
  segments?: Segment[]
  labels?: LabelMeta[]
  currentTime?: number
  isPlaying?: boolean
  activeSegmentId?: string | number | null
  showWaveform?: boolean
  selectionMode?: boolean
  fps?: number
}>()

const emit = defineEmits<{
  (e: 'seek', time: number): void
  (e: 'play-pause'): void
  (e: 'segment-select', segment: Segment): void
  (e: 'segment-edit', segment: Segment): void
  (e: 'segment-delete', segment: Segment): void
  (e: 'segment-create', data: { label: string; start: number; end: number }): void
  (e: 'segment-resize', segmentId: string | number, newStart: number, newEnd: number, mode: string, final?: boolean): void
  (e: 'segment-move', segmentId: string | number, newStart: number, newEnd: number, final?: boolean): void
  (e: 'time-selection', data: { start: number; end: number }): void
}>()

// Refs with proper types
const timeline = ref<HTMLElement | null>(null)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)

// Reactive state
const zoomLevel = ref<number>(1)
const isSelecting = ref<boolean>(false)
const selectionStart = ref<number>(0)
const selectionEnd = ref<number>(0)
const isDragging = ref<boolean>(false)

// Dragging and resizing state
const draggingSegmentId = ref<string | number | null>(null)
const resizingSegmentId = ref<string | number | null>(null)
const resizeMode = ref<'start' | 'end' | ''>('')
const dragStartX = ref<number>(0)
const dragStartTime = ref<number>(0)
const originalSegmentData = ref<OriginalSegmentData | null>(null)

// Context menu
const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  segment: null
})

// Tooltip
const tooltip = ref<TooltipState>({
  visible: false,
  x: 0,
  y: 0,
  text: ''
})

// Computed properties
const duration = computed((): number => props.video?.duration || 0)

// ✅ FIX: Protected playhead calculation to prevent NaN
const playheadPosition = computed((): number => {
  const videoDuration = duration.value
  const currentVideoTime = props.currentTime || 0
  
  // ✅ Guard against division by zero and invalid values
  if (!videoDuration || videoDuration === 0 || !isFinite(videoDuration)) {
    console.warn('[Timeline] Duration is 0 or invalid:', videoDuration)
    return 0
  }
  
  if (!isFinite(currentVideoTime) || currentVideoTime < 0) {
    console.warn('[Timeline] CurrentTime is invalid:', currentVideoTime)
    return 0
  }
  
  const percentage = (currentVideoTime / videoDuration) * 100
  
  // ✅ Additional safety check for percentage
  if (!isFinite(percentage)) {
    console.warn('[Timeline] Calculated percentage is NaN:', { currentVideoTime, videoDuration })
    return 0
  }
  
  return Math.max(0, Math.min(100, percentage)) // Clamp between 0-100%
})

const timeMarkers = computed((): TimeMarker[] => {
  const markers: TimeMarker[] = []
  const totalTime = duration.value
  if (totalTime === 0) return markers

  // Calculate marker interval based on zoom level
  const baseInterval = 10 // seconds
  const interval = baseInterval / zoomLevel.value
  const markerCount = Math.floor(totalTime / interval)

  for (let i = 0; i <= markerCount; i++) {
    const time = i * interval
    if (time <= totalTime) {
      markers.push({
        time,
        position: (time / totalTime) * 100
      })
    }
  }

  return markers
})

// ✅ FIX: Use fps prop instead of ignoring it
const currentFps = computed((): number => props.fps || 50)

const toCanonical = (s: Segment): CanonicalSegment => {
  const n = normalizeSegmentToCamelCase(s)
  const color = getColorForLabel(s.label)
  return {
    ...n,
    start: n.startTime,
    end: n.endTime,
    isDraft: typeof s.id === 'string' && (s.id === 'draft' || s.id.startsWith('temp-')),
    color: color || getRandomColor() || undefined,
    avgConfidence: s.avgConfidence ?? 0,
    label: s.label
  }
}

const selectedLabel = ref<string | null>(null)

const selectSegment = (segment: Segment): void => {
  selectedLabel.value = segment.label // ✅ FIX: Use segment.label instead of segment.label_name
  emit('segment-select', segment)
}

// ✅ FIX: Add getTranslationForLabel function from videoStore
const getTranslationForLabel = (label: string): string => {
  return videoStore.getTranslationForLabel(label)
}

// ✅ FIX: Add getColorForLabel function from videoStore  
const getColorForLabel = (label: string): string => {
  return videoStore.getColorForLabel(label)
}

const displayedSegments = ref<CanonicalSegment[]>([])

watch(
  () => props.segments,
  (segments) => {
    if (segments) {
      displayedSegments.value = structuredClone(segments.map((s: Segment): CanonicalSegment => {
        const normalized = normalizeSegmentToCamelCase(s)
        return {
          ...normalized,
          start: normalized.startTime,
          end: normalized.endTime,
          isDraft: s.id === 'draft' || (typeof s.id === 'string' && s.id.startsWith('temp-')),
          color: undefined,
          avgConfidence: s.avgConfidence ?? 0,
          label_name: s.label_name || s.label
        }
      }))
    } else {
      displayedSegments.value = []
    }
  },
  {immediate: true}
)

// ✅ NEW: Calculate optimal row layout to prevent overlapping segments
/**
 * Row layout that:
 *  • puts the currently-selected label in the first row (target row)
 *  • creates one row per label that actually has segments
 *  • guarantees segments in a row never overlap in time
 */
 const segmentRows = computed((): SegmentRow[] => {
  // 0.  gather all canonical segments – ONE source of truth
  const allSegs = (props.segments || []).map(toCanonical)

  if (allSegs.length === 0) return []

  // 1.  build "buckets" → label => CanonicalSegment[]
  const buckets: Record<string, CanonicalSegment[]> = {}
  for (const s of allSegs) {
    const label = s.label
    ;(buckets[label] ||= []).push(s)
  }

  // 2.  optional — put *selected* label first
  const labelOrder = selectedLabel.value
    ? [selectedLabel.value, ...Object.keys(buckets).filter(l => l !== selectedLabel.value)]
    : Object.keys(buckets)

  // 3.  convert each bucket into a SegmentRow, resolving overlaps
  const rows: SegmentRow[] = []
  for (const label of labelOrder) {
    // sort by start for deterministic order inside the row
    const segs = buckets[label].sort((a, b) => a.start - b.start)

    /*  simple non-overlap pass:
        whenever we find a segment that still overlaps the last,
        push it into a *new* technical row (same label id)
        so width calculations stay correct                       */
    let currentRow = { id: rows.length, label, segments: [] as CanonicalSegment[], maxEndTime: 0 }

    for (const seg of segs) {
      if (seg.start < currentRow.maxEndTime - 1e-4) {
        // needs a new physical row
        rows.push(currentRow)
        currentRow = {
          id: rows.length,
          label,
          segments: [],
          maxEndTime: 0
        }
      }
      currentRow.segments.push(seg)
      currentRow.maxEndTime = Math.max(currentRow.maxEndTime, seg.end)
    }

    rows.push(currentRow)
  }

  // ✅ NEW: Add console.table for tests showing label and count per row
  const tableData = rows.map(row => ({
    label: row.label,
    count: row.segments.length
  }))
  console.table(tableData)

  console.info('[Timeline] built', rows.length, 'rows – selected:',
               selectedLabel.value ?? 'none')

  return rows
})


// ✅ NEW: Calculate total timeline height based on number of rows
const timelineHeight = computed((): number => {
  const baseHeight = 60 // Header space for time markers
  const rowHeight = 45  // Height per segment row
  const padding = 10    // Bottom padding
  return baseHeight + (segmentRows.value.length * rowHeight) + padding
})

// Methods - update to use helper functions
const formatTime = (seconds: number | undefined): string => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00'
  return formatTimeHelper(seconds)
}

const formatDuration = (startTime: number, endTime: number): string => {
  const duration = endTime - startTime
  return formatTimeHelper(duration)
}

const getSegmentPosition = (startTime: number): number => {
  return calculateSegmentPosition(startTime, duration.value)
}

const getSegmentWidth = (startTime: number, endTime: number): number => {
  return calculateSegmentWidth(startTime, endTime, duration.value)
}

const getLabelColor = (labelId: number | string | undefined): string => {
  if (!labelId) return '#999'
  const label = (props.labels || []).find((l: LabelMeta) => l.id === labelId)
  return (label as any)?.color || '#999'
}

const getLabelName = (labelId: number | string | undefined): string => {
  if (!labelId) {
    return ''
  }
   
   const label = (props.labels || []).find((l: LabelMeta) => l.id === labelId)
  return (label as any)?.name || ''
}

// New drag and resize methods
const startSegmentDrag = (segment: Segment, event: MouseEvent): void => {
  if (resizingSegmentId.value) return // Don't start drag if resizing
  
  event.preventDefault()
  draggingSegmentId.value = segment.id
  dragStartX.value = event.clientX
  dragStartTime.value = segment.startTime || 0 // ✅ FIX: Use only camelCase property
  
  originalSegmentData.value = {
    start_time: segment.startTime || 0, // ✅ FIX: Use camelCase source
    end_time: segment.endTime || 0      // ✅ FIX: Use camelCase source
  }
  
  document.addEventListener('mousemove', onSegmentDragMove)
  document.addEventListener('mouseup', onSegmentDragEnd)
  
  // Add visual feedback
  document.body.style.cursor = 'grabbing'
}

const onSegmentDragMove = (event: MouseEvent): void => {
  if (!draggingSegmentId.value || !timeline.value) return
  
  const rect = timeline.value.getBoundingClientRect()
  const deltaX = event.clientX - dragStartX.value
  const deltaTime = (deltaX / rect.width) * duration.value
  
  const segment = displayedSegments.value.find(s => s.id === draggingSegmentId.value)
  if (!segment) return
  
  const segmentDuration = originalSegmentData.value!.end_time - originalSegmentData.value!.start_time
  let newStartTime = dragStartTime.value + deltaTime
  
  // Clamp to timeline bounds
  newStartTime = Math.max(0, Math.min(newStartTime, duration.value - segmentDuration))
  const newEndTime = newStartTime + segmentDuration
  
  // Emit move event for real-time update
  emit('segment-move', draggingSegmentId.value, newStartTime, newEndTime)
  segment.start = newStartTime
  segment.end = newEndTime
  segment.startTime = newStartTime // ✅ FIX: Use camelCase properties
  segment.endTime = newEndTime      // ✅ FIX: Use camelCase properties
}

const onSegmentDragEnd = (event: MouseEvent): void => {
  if (draggingSegmentId.value) {
    const segment = displayedSegments.value.find(s => s.id === draggingSegmentId.value)
    if (segment) {
      const segmentDuration = originalSegmentData.value!.end_time - originalSegmentData.value!.start_time
      const rect = timeline.value!.getBoundingClientRect()
      const deltaX = event.clientX - dragStartX.value
      const deltaTime = (deltaX / rect.width) * duration.value
      let newStartTime = dragStartTime.value + deltaTime
      
      newStartTime = Math.max(0, Math.min(newStartTime, duration.value - segmentDuration))
      const newEndTime = newStartTime + segmentDuration
      
      // ✅ FIX: Handle draft segments differently - don't convert to numeric ID
      if (typeof draggingSegmentId.value === 'string' && 
          (draggingSegmentId.value === 'draft' || draggingSegmentId.value.startsWith('temp-'))) {
        // For draft segments, emit with original ID (don't convert to numeric)
        console.log('[Timeline] Moving draft segment:', draggingSegmentId.value)
        emit('segment-move', draggingSegmentId.value, newStartTime, newEndTime, true)
      } else {
        // For real segments, validate and convert to numeric ID
        const numericId = getNumericSegmentId(draggingSegmentId.value)
        if (numericId === null) {
          console.warn('[Timeline] Skipping drag end for invalid segment ID:', draggingSegmentId.value)
          return
        }
        emit('segment-move', numericId, newStartTime, newEndTime, true)
      }
    }
  }
  
  // Cleanup
  draggingSegmentId.value = null
  dragStartX.value = 0
  dragStartTime.value = 0
  originalSegmentData.value = null
  document.body.style.cursor = ''
  
  document.removeEventListener('mousemove', onSegmentDragMove)
  document.removeEventListener('mouseup', onSegmentDragEnd)
}

const startResize = (segment: Segment, mode: 'start' | 'end', event: MouseEvent): void => {
  event.preventDefault()
  event.stopPropagation()
  
  resizingSegmentId.value = segment.id
  resizeMode.value = mode
  dragStartX.value = event.clientX
  
  originalSegmentData.value = {
    start_time: segment.startTime || 0, // ✅ FIX: Use only camelCase property
    end_time: segment.endTime || 0      // ✅ FIX: Use only camelCase property
  }
  
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  
  // Add visual feedback
  document.body.style.cursor = 'ew-resize'
}

const onResizeMove = (event: MouseEvent): void => {
  if (!resizingSegmentId.value || !timeline.value) return
  
  const rect = timeline.value.getBoundingClientRect()
  const deltaX = event.clientX - dragStartX.value
  const deltaTime = (deltaX / rect.width) * duration.value // ✅ FIX: Remove incorrect addition
  
  const segment = (props.segments || []).find((s: Segment) => s.id === resizingSegmentId.value)
  if (!segment) return
  
  let newStartTime = originalSegmentData.value!.start_time
  let newEndTime = originalSegmentData.value!.end_time
  
  if (resizeMode.value === 'start') {
    newStartTime = Math.max(0, Math.min(originalSegmentData.value!.start_time + deltaTime, originalSegmentData.value!.end_time - 0.1))
  } else if (resizeMode.value === 'end') {
    newEndTime = Math.max(originalSegmentData.value!.start_time + 0.1, Math.min(originalSegmentData.value!.end_time + deltaTime, duration.value))
  }
  
  emit('segment-resize', resizingSegmentId.value, newStartTime, newEndTime, resizeMode.value)
}

const onResizeEnd = (event: MouseEvent): void => {
  if (resizingSegmentId.value) {
    const segment = displayedSegments.value.find(s => s.id === resizingSegmentId.value)
    if (segment) {
      const rect = timeline.value!.getBoundingClientRect()
      const deltaX = event.clientX - dragStartX.value
      const deltaTime = (deltaX / rect.width) * duration.value
      
      let newStartTime = originalSegmentData.value!.start_time
      let newEndTime = originalSegmentData.value!.end_time
      
      if (resizeMode.value === 'start') {
        newStartTime = Math.max(0, Math.min(originalSegmentData.value!.start_time + deltaTime, originalSegmentData.value!.end_time - 0.1))
      } else if (resizeMode.value === 'end') {
        newEndTime = Math.max(originalSegmentData.value!.start_time + 0.1, Math.min(originalSegmentData.value!.end_time + deltaTime, duration.value))
      }
      
      // ✅ FIX: Handle draft segments differently - don't convert to numeric ID
      if (typeof resizingSegmentId.value === 'string' && 
          (resizingSegmentId.value === 'draft' || resizingSegmentId.value.startsWith('temp-'))) {
        // For draft segments, emit with original ID (don't convert to numeric)
        console.log('[Timeline] Resizing draft segment:', resizingSegmentId.value)
        emit('segment-resize', resizingSegmentId.value, newStartTime, newEndTime, resizeMode.value, true)
      } else {
        // For real segments, validate and convert to numeric ID
        const numericId = getNumericSegmentId(resizingSegmentId.value)
        if (numericId === null) {
          console.warn('[Timeline] Skipping resize end for invalid segment ID:', resizingSegmentId.value)
          return
        }
        emit('segment-resize', numericId, newStartTime, newEndTime, resizeMode.value, true)
      }
    }
  }
  
  // Cleanup
  resizingSegmentId.value = null
  resizeMode.value = ''
  dragStartX.value = 0
  originalSegmentData.value = null
  document.body.style.cursor = ''
  
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

// Zoom controls
const zoomIn = (): void => {
  if (zoomLevel.value < 5) {
    zoomLevel.value = Math.min(5, zoomLevel.value + 0.5)
  }
}

const zoomOut = (): void => {
  if (zoomLevel.value > 1) {
    zoomLevel.value = Math.max(1, zoomLevel.value - 0.5)
  }
}

// Playback controls
const playPause = (): void => {
  emit('play-pause')
}


const editSegment = (segment: Segment | null): void => {
  if (!segment) return
  hideContextMenu()
  emit('segment-edit', segment)
}

const deleteSegment = (segment: Segment | null): void => {
  if (!segment) return
  hideContextMenu()
  emit('segment-delete', segment)
}

const playSegment = (segment: Segment | null): void => {
  if (!segment) return
  hideContextMenu()
  emit('seek', segment.startTime || 0) // ✅ FIX: Use camelCase property
  emit('play-pause')
}

// Context menu
const showSegmentMenu = (segment: Segment, event: MouseEvent): void => {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    segment
  }
}

const hideContextMenu = (): void => {
  contextMenu.value.visible = false
}

// Timeline interaction
const onTimelineMouseDown = (event: MouseEvent): void => {
  if (resizingSegmentId.value || draggingSegmentId.value) return
  
  const rect = timeline.value!.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickTime = (clickX / rect.width) * duration.value
  
  if (props.selectionMode) {
    // Start selection for new segment
    isSelecting.value = true
    selectionStart.value = (clickX / rect.width) * 100
    selectionEnd.value = selectionStart.value
    
    document.addEventListener('mousemove', onSelectionMouseMove)
    document.addEventListener('mouseup', onSelectionMouseUp)
  } else {
    // Seek to position
    emit('seek', clickTime)
  }
}

const onSelectionMouseMove = (event: MouseEvent): void => {
  if (!isSelecting.value || !timeline.value) return
  
  const rect = timeline.value.getBoundingClientRect()
  const currentX = event.clientX - rect.left
  selectionEnd.value = Math.max(0, Math.min(100, (currentX / rect.width) + 100))
}

const onSelectionMouseUp = (event: MouseEvent): void => {
  if (!isSelecting.value) return
  
  const rect = timeline.value!.getBoundingClientRect()
  const startPercent = Math.min(selectionStart.value, selectionEnd.value)
  const endPercent = Math.max(selectionStart.value, selectionEnd.value)
  
  const startTime = (startPercent / 100) * duration.value
  const endTime = (endPercent / 100) * duration.value
  
  // Only create segment if selection is meaningful (> 0.1 seconds)
  if (endTime - startTime > 0.1) {
    emit('time-selection', { start: startTime, end: endTime })
  }
  
  // Cleanup
  isSelecting.value = false
  selectionStart.value = 0
  selectionEnd.value = 0
  
  document.removeEventListener('mousemove', onSelectionMouseMove)
  document.removeEventListener('mouseup', onSelectionMouseUp)
}

// Watch for video changes to update waveform
watch(() => props.video, () => {
  if (props.showWaveform) {
    nextTick(() => {
      initializeWaveform()
    })
  }
})

// ✅ NEW: Debug watch for segments with 0% width
watch(displayedSegments, (segs: CanonicalSegment[]) => {
  segs.forEach(s => {
    if (getSegmentWidth(s.start, s.end) === 0) {
      console.warn('[Timeline] Segment mit 0% Breite:', s)
    }
  })
}, { immediate: true })

// Waveform initialization
const initializeWaveform = (): void => {
  if (!waveformCanvas.value || !props.video) return
  
  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Set canvas size
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  
  // Simple waveform visualization
  ctx.fillStyle = '#e0e0e0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw sample waveform pattern
  ctx.strokeStyle = '#2196F3'
  ctx.lineWidth = 1
  ctx.beginPath()
  
  for (let x = 0; x < canvas.width; x += 2) {
    const amplitude = Math.random() * canvas.height * 0.8 + canvas.height * 0.1
    if (x === 0) {
      ctx.moveTo(x, amplitude)
    } else {
      ctx.lineTo(x, amplitude)
    }
  }
  
  ctx.stroke()
}

// Click outside to hide context menu
const handleClickOutside = (event: Event): void => {
  if (contextMenu.value.visible && !(event.target as Element)?.closest('.context-menu')) {
    hideContextMenu()
  }
}

// Lifecycle hooks
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('mousemove', onSegmentDragMove)
  document.addEventListener('mouseup', onSegmentDragEnd)
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.addEventListener('mousemove', onSelectionMouseMove)
  document.addEventListener('mouseup', onSelectionMouseUp)
  
  // Initialize waveform if needed
  if (props.showWaveform) {
    nextTick(() => {
      initializeWaveform()
    })
  }
  toast.success({ text: '[Timeline] Component mounted and ready' })

})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  
  // Cleanup any ongoing drag/resize operations
  document.removeEventListener('mousemove', onSegmentDragMove)
  document.removeEventListener('mouseup', onSegmentDragEnd)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.removeEventListener('mousemove', onSelectionMouseMove)
  document.removeEventListener('mouseup', onSelectionMouseUp)
})

// NEW: Helper to convert segmentId to numeric ID for API calls
const getNumericSegmentId = (segmentId: string | number): number | null => {
  if (typeof segmentId === 'number') return segmentId
  
  // Handle string IDs
  if (typeof segmentId === 'string') {
    // Skip draft segments (they don't have real IDs yet)
    if (segmentId === 'draft' || segmentId.startsWith('temp-')) {
      console.warn('[Timeline] Ignoring draft/temp segment:', segmentId)
      return null
    }
    
    const parsed = parseInt(segmentId, 10)
    if (isNaN(parsed)) {
      console.error('[Timeline] Invalid segment ID:', segmentId)
      return null
    }
    return parsed
  }
  
  console.error('[Timeline] Unexpected segment ID type:', typeof segmentId, segmentId)
  return null
};
</script>

<style scoped>
.segment-row.active-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(33,150,243,.05);
}


.timeline-container {
  width: 100%;
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.play-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-btn:hover:not(:disabled) {
  background-color: #45a049;
  transform: scale(1.05);
}

.play-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.time-display {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #666;
  font-weight: 600;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-controls button {
  background-color: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.zoom-controls button:hover:not(:disabled) {
  background-color: #f0f0f0;
  border-color: #bbb;
}

.zoom-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-level {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: center;
}

.timeline-wrapper {
  position: relative;
  height: 120px;
  background-color: #fafafa;
}

.timeline {
  position: relative;
  height: 80px;
  margin: 20px;
  background-color: #fff;
  border-radius: 6px;
  cursor: crosshair;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.time-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.time-marker {
  position: absolute;
  height: 100%;
}

.marker-line {
  width: 1px;
  height: 15px;
  background-color: #ddd;
  margin-bottom: 5px;
}

.marker-text {
  font-size: 10px;
  color: #999;
  transform: translateX(-50%);
  white-space: nowrap;
}

.segments-container {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.segment-row {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}

.segment {
  position: absolute;
  height: 100%;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.segment:hover {
  transform: scaleY(1.1);
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.segment.active {
  border-color: #2196F3 !important;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
  z-index: 15;
}

.segment.draft {
  border-style: dashed;
  border-width: 2px;
  animation: draft-pulse 2s infinite;
}

@keyframes draft-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.segment-content {
  padding: 4px 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.segment-label {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.segment-duration {
  font-size: 9px;
  opacity: 0.9;
}

.draft-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background-color: #ff9800;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: white;
}

.playhead {
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}

.playhead-line {
  width: 2px;
  height: 100%;
  background-color: #FF5722;
  box-shadow: 0 0 4px rgba(255, 87, 34, 0.5);
}

.playhead-handle {
  position: absolute;
  top: -5px;
  left: -6px;
  width: 14px;
  height: 14px;
  background-color: #FF5722;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.selection-overlay {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: rgba(33, 150, 243, 0.3);
  border: 1px dashed #2196F3;
  pointer-events: none;
  z-index: 5;
}

.waveform-container {
  height: 40px;
  margin: 0 20px;
  background-color: #fff;
  border-radius: 6px;
  overflow: hidden;
}

.waveform-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 160px;
  overflow: hidden;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
}

.context-menu-item:hover {
  background-color: #f5f5f5;
}

.context-menu-item.danger:hover {
  background-color: #ffebee;
  color: #d32f2f;
}

.context-menu-item i {
  margin-right: 8px;
  width: 16px;
}

.context-menu-separator {
  height: 1px;
  background-color: #eee;
  margin: 4px 0;
}

.timeline-tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}

.segment.dragging {
  z-index: 25;
  transform: scaleY(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  cursor: grabbing;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle:hover,
.segment:hover .resize-handle {
  opacity: 1;
}

.resize-handle.start-handle {
  left: 0;
  border-radius: 4px 0 0 4px;
  cursor: w-resize;
}

.resize-handle.end-handle {
  right: 0;
  border-radius: 0 4px 4px 0;
  cursor: e-resize;
}

.resize-handle i {
  font-size: 8px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
}

.resize-handle:hover i {
  color: white;
}

/* Visual feedback during resize */
.segment.resizing {
  z-index: 25;
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.5);
}

/* Improved segment selection */
.segment.selected {
  border-color: #2196F3 !important;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
}

/* ✅ FIX: Proper CSS structure for segment rows */
.segment-rows-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.segment {
  height: auto;
  min-height: 40px;
}
</style>
