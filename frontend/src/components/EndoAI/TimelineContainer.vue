<template>
  <div class="timeline-container" ref="containerRef">
    <div class="timeline-header">
      <div class="timeline-controls">
        <button @click="$emit('play-pause')" class="play-btn" :disabled="!hasVideo">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
        <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>
      
      <div class="timeline-info">
        <span class="segment-count">{{ totalSegments }} Segmente in {{ segmentRows.length }} Reihen</span>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
      </div>
    </div>

    <div class="timeline-viewport" :style="{ height: viewportHeight + 'px' }">
      <!-- Time markers -->
      <div class="time-markers" :style="{ height: viewportHeight + 'px' }">
        <div 
          v-for="marker in timeMarkers" 
          :key="marker.time"
          class="time-marker"
          :style="{ left: marker.position + '%', height: viewportHeight + 'px' }"
        >
          <div class="marker-line"></div>
          <div class="marker-text">{{ formatTime(marker.time) }}</div>
        </div>
      </div>

      <!-- Multi-row segment layout -->
      <div class="segments-container">
        <div 
          v-for="(row, rowIndex) in segmentRows"
          :key="`row-${rowIndex}`"
          class="segment-row"
          :style="{ 
            top: (headerHeight + rowIndex * rowHeight) + 'px',
            height: rowHeight + 'px'
          }"
        >
          <div class="row-label" v-if="showRowLabels">
            Reihe {{ rowIndex + 1 }}
          </div>
          
          <Segment
            v-for="segment in row.segments"
            :key="segment.id"
            :segment="segment"
            :video-duration="duration"
            :is-active="segment.id === activeSegmentId"
            :show-confidence="showConfidence"
            :label-translations="labelTranslations"
            @select="handleSegmentSelect"
            @contextmenu="handleSegmentContextMenu"
            @drag-start="handleDragStart"
            @resize-start="handleResizeStart"
          />
        </div>
      </div>

      <!-- Playhead -->
      <div 
        class="playhead"
        :style="{ left: playheadPosition + '%', height: viewportHeight + 'px' }"
      >
        <div class="playhead-line"></div>
        <div class="playhead-handle" @mousedown="startPlayheadDrag"></div>
      </div>

      <!-- Selection overlay for new segments -->
      <div 
        v-if="isSelecting"
        class="selection-overlay"
        :style="{
          left: Math.min(selectionStart, selectionEnd) + '%',
          width: Math.abs(selectionEnd - selectionStart) + '%',
          height: viewportHeight + 'px'
        }"
      ></div>
    </div>

    <!-- Timeline interaction area -->
    <div 
      class="timeline-interaction"
      :style="{ height: viewportHeight + 'px' }"
      @mousedown="handleTimelineMouseDown"
      @wheel="handleWheel"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch, onMounted, onUnmounted } from 'vue'
import Segment from './Segment.vue'
import type { Segment as SegmentType } from '@/stores/videoStore'

interface Props {
  segments: SegmentType[]
  duration: number
  currentTime: number
  isPlaying: boolean
  activeSegmentId?: string | number | null
  showConfidence?: boolean
  showRowLabels?: boolean
  labelTranslations?: Record<string, string>
  hasVideo?: boolean
  selectionMode?: boolean
  minRowHeight?: number
  maxRows?: number
}

interface Emits {
  (e: 'play-pause'): void
  (e: 'seek', time: number): void
  (e: 'segment-select', segment: SegmentType): void
  (e: 'segment-contextmenu', segment: SegmentType, event: MouseEvent): void
  (e: 'segment-resize', segmentId: string | number, newStart: number, newEnd: number, mode: string, final?: boolean): void
  (e: 'segment-move', segmentId: string | number, newStart: number, newEnd: number, final?: boolean): void
  (e: 'time-selection', data: { start: number; end: number }): void
}

interface SegmentRow {
  id: number
  segments: SegmentType[]
  maxEndTime: number
  minStartTime: number
}

const props = withDefaults(defineProps<Props>(), {
  showConfidence: true,
  showRowLabels: true,
  labelTranslations: () => ({}),
  hasVideo: false,
  selectionMode: false,
  minRowHeight: 45,
  maxRows: 20
})

const emit = defineEmits<Emits>()

// Template refs
const containerRef = ref<HTMLElement | null>(null)

// Reactive state
const zoomLevel = ref(1)
const isSelecting = ref(false)
const selectionStart = ref(0)
const selectionEnd = ref(0)
const isDragging = ref(false)
const isResizing = ref(false)
const activeResizeSegmentId = ref<string | number | null>(null)
const activeDragSegmentId = ref<string | number | null>(null)

// Layout constants
const headerHeight = 30
const rowHeight = computed(() => Math.max(props.minRowHeight, 45))

// Provide timeline context for child components
provide('timelineContext', {
  isDragging: computed(() => isDragging.value),
  isResizing: computed(() => isResizing.value),
  activeSegmentId: computed(() => activeDragSegmentId.value || activeResizeSegmentId.value)
})

// Enhanced multi-row layout algorithm
const segmentRows = computed((): SegmentRow[] => {
  const segments = [...props.segments]
  if (segments.length === 0) return []
  
  // Sort segments by start time for optimal placement
  segments.sort((a, b) => {
    const aStart = a.start_time || a.startTime || 0
    const bStart = b.start_time || b.startTime || 0
    return aStart - bStart
  })
  
  const rows: SegmentRow[] = []
  
  for (const segment of segments) {
    const segmentStart = segment.start_time || segment.startTime || 0
    const segmentEnd = segment.end_time || segment.endTime || 0
    
    // Find the first row where this segment can fit without overlapping
    let targetRow = rows.find(row => {
      // Check if there's enough gap after the last segment in this row
      const gap = segmentStart - row.maxEndTime
      return gap >= 0.1 // Minimum 0.1 second gap
    })
    
    if (!targetRow && rows.length < props.maxRows) {
      // Create a new row if no suitable row exists and we haven't reached max rows
      targetRow = {
        id: rows.length,
        segments: [],
        maxEndTime: 0,
        minStartTime: Infinity
      }
      rows.push(targetRow)
    }
    
    if (targetRow) {
      // Add segment to the row and update bounds
      targetRow.segments.push(segment)
      targetRow.maxEndTime = Math.max(targetRow.maxEndTime, segmentEnd)
      targetRow.minStartTime = Math.min(targetRow.minStartTime, segmentStart)
    } else {
      // If we've reached max rows, add to the row with earliest end time
      const earliestRow = rows.reduce((prev, current) => 
        prev.maxEndTime < current.maxEndTime ? prev : current
      )
      if (earliestRow) {
        earliestRow.segments.push(segment)
        earliestRow.maxEndTime = Math.max(earliestRow.maxEndTime, segmentEnd)
        earliestRow.minStartTime = Math.min(earliestRow.minStartTime, segmentStart)
      }
    }
  }
  
  console.log(`[TimelineContainer] Arranged ${segments.length} segments into ${rows.length} rows`)
  console.log('Row distribution:', rows.map(r => ({ 
    id: r.id, 
    segments: r.segments.length,
    timeSpan: `${formatTime(r.minStartTime)} - ${formatTime(r.maxEndTime)}`
  })))
  
  return rows
})

const totalSegments = computed(() => props.segments.length)

const viewportHeight = computed(() => {
  const baseHeight = headerHeight
  const rowsHeight = segmentRows.value.length * rowHeight.value
  const padding = 20
  return baseHeight + rowsHeight + padding
})

const playheadPosition = computed(() => {
  if (props.duration <= 0) return 0
  return Math.max(0, Math.min(100, (props.currentTime / props.duration) * 100))
})

// Computed properties for time markers
const timeMarkers = computed(() => {
  const markers: Array<{ position: number; time: number; label: string }> = []
  const totalDuration = props.duration
  
  if (totalDuration <= 0) return markers
  
  // Calculate appropriate interval based on zoom and duration
  const interval = Math.max(1, Math.floor(totalDuration / 10))
  
  for (let i = 0; i <= totalDuration; i += interval) {
    markers.push({
      position: (i / totalDuration) * 100,
      time: i,
      label: formatTime(i)
    })
  }
  
  return markers
})

// Helper methods
const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '00:00'
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Event handlers
const handleSegmentSelect = (segment: SegmentType): void => {
  emit('segment-select', segment)
}

const handleSegmentContextMenu = (segment: SegmentType, event: MouseEvent): void => {
  emit('segment-contextmenu', segment, event)
}

const handleDragStart = (segment: SegmentType, event: MouseEvent): void => {
  isDragging.value = true
  activeDragSegmentId.value = segment.id
  
  // Add global mouse event listeners
  document.addEventListener('mousemove', handleDragMove)
  document.addEventListener('mouseup', handleDragEnd)
  
  event.preventDefault()
}

const handleDragMove = (event: MouseEvent): void => {
  if (!isDragging.value || !containerRef.value) return
  
  // Calculate new position and emit move event
  const rect = containerRef.value.getBoundingClientRect()
  const deltaX = event.movementX
  const deltaTime = (deltaX / rect.width) * props.duration
  
  // Emit real-time update
  if (activeDragSegmentId.value !== null) {
    const segment = props.segments.find(s => s.id === activeDragSegmentId.value)
    if (segment) {
      const currentStart = segment.start_time || segment.startTime || 0
      const currentEnd = segment.end_time || segment.endTime || 0
      const duration = currentEnd - currentStart
      
      let newStart = currentStart + deltaTime
      newStart = Math.max(0, Math.min(newStart, props.duration - duration))
      
      emit('segment-move', activeDragSegmentId.value, newStart, newStart + duration, false)
    }
  }
}

const handleDragEnd = (event: MouseEvent): void => {
  if (activeDragSegmentId.value !== null) {
    // Emit final position
    const segment = props.segments.find(s => s.id === activeDragSegmentId.value)
    if (segment) {
      const currentStart = segment.start_time || segment.startTime || 0
      const currentEnd = segment.end_time || segment.endTime || 0
      emit('segment-move', activeDragSegmentId.value, currentStart, currentEnd, true)
    }
  }
  
  // Cleanup
  isDragging.value = false
  activeDragSegmentId.value = null
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
}

const handleResizeStart = (segment: SegmentType, mode: 'start' | 'end', event: MouseEvent): void => {
  isResizing.value = true
  activeResizeSegmentId.value = segment.id
  
  // Add global mouse event listeners  
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
  
  event.preventDefault()
}

const handleResizeMove = (event: MouseEvent): void => {
  if (!isResizing.value || !containerRef.value) return
  
  // Calculate resize delta and emit resize event
  const rect = containerRef.value.getBoundingClientRect()
  const deltaX = event.movementX
  const deltaTime = (deltaX / rect.width) * props.duration
  
  if (activeResizeSegmentId.value !== null) {
    const segment = props.segments.find(s => s.id === activeResizeSegmentId.value)
    if (segment) {
      const currentStart = segment.start_time || segment.startTime || 0
      const currentEnd = segment.end_time || segment.endTime || 0
      
      // Determine resize mode and calculate new bounds
      // This is simplified - real implementation would track resize mode
      emit('segment-resize', activeResizeSegmentId.value, currentStart, currentEnd + deltaTime, 'end', false)
    }
  }
}

const handleResizeEnd = (event: MouseEvent): void => {
  if (activeResizeSegmentId.value !== null) {
    // Emit final resize
    const segment = props.segments.find(s => s.id === activeResizeSegmentId.value)
    if (segment) {
      const currentStart = segment.start_time || segment.startTime || 0
      const currentEnd = segment.end_time || segment.endTime || 0
      emit('segment-resize', activeResizeSegmentId.value, currentStart, currentEnd, 'end', true)
    }
  }
  
  // Cleanup
  isResizing.value = false
  activeResizeSegmentId.value = null
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

const handleTimelineMouseDown = (event: MouseEvent): void => {
  if (!containerRef.value || isDragging.value || isResizing.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickTime = (clickX / rect.width) * props.duration
  
  if (props.selectionMode) {
    // Start time selection
    isSelecting.value = true
    selectionStart.value = (clickX / rect.width) * 100
    selectionEnd.value = selectionStart.value
    
    document.addEventListener('mousemove', handleSelectionMove)
    document.addEventListener('mouseup', handleSelectionEnd)
  } else {
    // Seek to time
    emit('seek', clickTime)
  }
}

const handleSelectionMove = (event: MouseEvent): void => {
  if (!isSelecting.value || !containerRef.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const currentX = event.clientX - rect.left
  selectionEnd.value = Math.max(0, Math.min(100, (currentX / rect.width) * 100))
}

const handleSelectionEnd = (event: MouseEvent): void => {
  if (!isSelecting.value) return
  
  const startPercent = Math.min(selectionStart.value, selectionEnd.value)
  const endPercent = Math.max(selectionStart.value, selectionEnd.value)
  
  const startTime = (startPercent / 100) * props.duration
  const endTime = (endPercent / 100) * props.duration
  
  if (endTime - startTime > 0.1) {
    emit('time-selection', { start: startTime, end: endTime })
  }
  
  // Cleanup
  isSelecting.value = false
  document.removeEventListener('mousemove', handleSelectionMove)
  document.removeEventListener('mouseup', handleSelectionEnd)
}

const startPlayheadDrag = (event: MouseEvent): void => {
  const handlePlayheadMove = (e: MouseEvent) => {
    if (!containerRef.value) return
    
    const rect = containerRef.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const time = (percentage / 100) * props.duration
    
    emit('seek', time)
  }
  
  const handlePlayheadEnd = () => {
    document.removeEventListener('mousemove', handlePlayheadMove)
    document.removeEventListener('mouseup', handlePlayheadEnd)
  }
  
  document.addEventListener('mousemove', handlePlayheadMove)
  document.addEventListener('mouseup', handlePlayheadEnd)
  
  event.preventDefault()
}

const handleWheel = (event: WheelEvent): void => {
  event.preventDefault()
  
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  zoomLevel.value = Math.max(0.5, Math.min(5, zoomLevel.value * zoomFactor))
}

// Watch for segment changes and log row arrangement
watch(() => props.segments, (newSegments) => {
  if (newSegments.length > 0) {
    console.log(`[TimelineContainer] ${newSegments.length} segments updated`)
  }
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragMove)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
  document.removeEventListener('mousemove', handleSelectionMove)
  document.removeEventListener('mouseup', handleSelectionEnd)
})

// Expose methods and reactive state for testing
defineExpose({
  // Reactive state
  zoomLevel,
  isSelecting,
  selectionStart,
  selectionEnd,
  isDragging,
  isResizing,
  activeResizeSegmentId,
  activeDragSegmentId,
  
  // Methods
  handleDragStart,
  handleDragEnd,
  handleResizeStart,
  formatTime,
  segmentRows
})
</script>

<style scoped>
.timeline-container {
  width: 100%;
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  min-height: 60px;
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

.timeline-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.segment-count {
  background-color: #e3f2fd;
  padding: 4px 8px;
  border-radius: 12px;
  color: #1976d2;
  font-weight: 500;
}

.zoom-level {
  font-weight: 500;
}

.timeline-viewport {
  position: relative;
  background-color: #fafafa;
  overflow: hidden;
}

.time-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 1;
}

.time-marker {
  position: absolute;
  top: 0;
}

.marker-line {
  width: 1px;
  height: 20px;
  background-color: #ddd;
  margin-bottom: 5px;
}

.marker-text {
  font-size: 10px;
  color: #999;
  transform: translateX(-50%);
  white-space: nowrap;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 1px 3px;
  border-radius: 2px;
}

.segments-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  z-index: 5;
}

.segment-row {
  position: absolute;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.segment-row:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}

.row-label {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #999;
  font-weight: 500;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 3px;
  z-index: 10;
}

.playhead {
  position: absolute;
  top: 0;
  width: 2px;
  background-color: #FF5722;
  z-index: 20;
  pointer-events: none;
}

.playhead-line {
  width: 100%;
  height: 100%;
  background-color: #FF5722;
  box-shadow: 0 0 4px rgba(255, 87, 34, 0.5);
}

.playhead-handle {
  position: absolute;
  top: 5px;
  left: -6px;
  width: 14px;
  height: 14px;
  background-color: #FF5722;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  pointer-events: auto;
}

.playhead-handle:hover {
  transform: scale(1.2);
}

.selection-overlay {
  position: absolute;
  top: 0;
  background-color: rgba(33, 150, 243, 0.2);
  border: 1px dashed #2196F3;
  border-radius: 4px;
  pointer-events: none;
  z-index: 15;
}

.timeline-interaction {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  cursor: crosshair;
  z-index: 2;
}

.timeline-interaction:hover {
  background-color: rgba(0, 0, 0, 0.01);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .timeline-header {
    padding: 8px 12px;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .timeline-controls {
    justify-content: center;
  }
  
  .timeline-info {
    justify-content: center;
    font-size: 11px;
  }
  
  .row-label {
    display: none;
  }
}
</style>