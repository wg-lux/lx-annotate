<template>
  <div 
    class="segment-pill"
    :class="{ 
      'active': isActive,
      'draft': isDraft,
      'dragging': isDragging,
      'resizing': isResizing
    }"
    :style="segmentStyle"
    @click="$emit('select', segment)"
    @contextmenu.prevent="$emit('contextmenu', segment, $event)"
    @mousedown="startDrag"
  >
    <!-- Start resize handle -->
    <div 
      class="resize-handle start-handle"
      @mousedown.stop="startResize('start', $event)"
      :title="`${segment.label_name} - Start ändern`"
    >
      <i class="fas fa-grip-lines-vertical"></i>
    </div>

    <!-- Segment content with API label binding -->
    <div class="segment-content">
      <span class="segment-label">{{ displayLabel }}</span>
      <span class="segment-duration">{{ formatDuration }}</span>
      <span v-if="showConfidence" class="segment-confidence">{{ Math.round(segment.avgConfidence * 100) }}%</span>
    </div>

    <!-- End resize handle -->
    <div 
      class="resize-handle end-handle"
      @mousedown.stop="startResize('end', $event)"
      :title="`${segment.label_name} - Ende ändern`"
    >
      <i class="fas fa-grip-lines-vertical"></i>
    </div>

    <!-- Draft indicator -->
    <div v-if="isDraft" class="draft-indicator">
      <i class="fas fa-edit"></i>
    </div>

    <!-- Active segment indicator -->
    <div v-if="isActive" class="active-indicator">
      <i class="fas fa-check"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { Segment } from '@/stores/videoStore'

interface Props {
  segment: Segment
  videoDuration: number
  isActive?: boolean
  showConfidence?: boolean
  labelTranslations?: Record<string, string>
}

interface Emits {
  (e: 'select', segment: Segment): void
  (e: 'contextmenu', segment: Segment, event: MouseEvent): void
  (e: 'dragStart', segment: Segment, event: MouseEvent): void
  (e: 'dragMove', deltaX: number, deltaY: number): void
  (e: 'dragEnd'): void
  (e: 'resizeStart', segment: Segment, mode: 'start' | 'end', event: MouseEvent): void
  (e: 'resizeMove', deltaX: number): void
  (e: 'resizeEnd'): void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  showConfidence: true,
  labelTranslations: () => ({})
})

const emit = defineEmits<Emits>()

// Inject timeline context
const timelineContext = inject('timelineContext', {
  isDragging: false,
  isResizing: false,
  activeSegmentId: null
})

// Computed properties
const isDraft = computed(() => 
  props.segment.id === 'draft' || 
  (typeof props.segment.id === 'string' && props.segment.id.startsWith('temp-'))
)

const isDragging = computed(() => 
  timelineContext.isDragging && timelineContext.activeSegmentId === props.segment.id
)

const isResizing = computed(() => 
  timelineContext.isResizing && timelineContext.activeSegmentId === props.segment.id
)

// Enhanced label display - prioritize API's label_name
const displayLabel = computed(() => {
  // 1. Try label_name from API first (this is what the API returns)
  if (props.segment.label_name) {
    return getTranslatedLabel(props.segment.label_name)
  }
  
  // 2. Fall back to label field
  if (props.segment.label) {
    return getTranslatedLabel(props.segment.label)
  }
  
  // 3. Fall back to label_display if available
  if (props.segment.label_display) {
    return props.segment.label_display
  }
  
  // 4. Final fallback
  return 'Unbekannt'
})

const getTranslatedLabel = (labelKey: string): string => {
  // Use provided translations or default German translations
  const translations = props.labelTranslations.hasOwnProperty(labelKey) 
    ? props.labelTranslations 
    : defaultTranslations

  return translations[labelKey] || labelKey
}

const defaultTranslations: Record<string, string> = {
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

const formatDuration = computed(() => {
  const duration = (props.segment.end_time || props.segment.endTime || 0) - 
                   (props.segment.start_time || props.segment.startTime || 0)
  
  if (duration < 60) {
    return `${duration.toFixed(1)}s`
  } else {
    const mins = Math.floor(duration / 60)
    const secs = Math.floor(duration % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
})

const segmentStyle = computed(() => {
  const startTime = props.segment.start_time || props.segment.startTime || 0
  const endTime = props.segment.end_time || props.segment.endTime || 0
  
  if (props.videoDuration <= 0) {
    return { left: '0%', width: '0%', backgroundColor: '#999' }
  }
  
  const startPercent = (startTime / props.videoDuration) * 100
  const widthPercent = ((endTime - startTime) / props.videoDuration) * 100
  
  return {
    left: `${Math.max(0, Math.min(100, startPercent))}%`,
    width: `${Math.max(0.1, Math.min(100 - startPercent, widthPercent))}%`,
    backgroundColor: getSegmentColor(),
    opacity: isDraft.value ? '0.8' : '1'
  }
})

const getSegmentColor = (): string => {
  const labelKey = props.segment.label_name || props.segment.label || ''
  
  const colorMap: Record<string, string> = {
    'outside': '#e74c3c',
    'polyp': '#f39c12',
    'needle': '#3498db', 
    'blood': '#e74c3c',
    'snare': '#9b59b6',
    'grasper': '#2ecc71',
    'water_jet': '#1abc9c',
    'appendix': '#f1c40f',
    'ileum': '#e67e22',
    'diverticule': '#34495e',
    'ileocaecalvalve': '#95a5a6',
    'nbi': '#8e44ad',
    'low_quality': '#7f8c8d',
    'wound': '#c0392b'
  }
  
  return colorMap[labelKey] || '#95a5a6'
}

// Drag and resize event handlers
const startDrag = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    emit('dragStart', props.segment, event)
  }
}

const startResize = (mode: 'start' | 'end', event: MouseEvent) => {
  emit('resizeStart', props.segment, mode, event)
}
</script>

<style scoped>
.segment-pill {
  position: absolute;
  height: 100%;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 20px; /* Ensure very short segments are still visible */
  pointer-events: auto;
}

.segment-pill:hover {
  transform: scaleY(1.05);
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.segment-pill.active {
  border-color: #2196F3 !important;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
  z-index: 15;
}

.segment-pill.draft {
  border-style: dashed;
  border-width: 2px;
  border-color: #ff9800;
  animation: draft-pulse 2s infinite;
}

.segment-pill.dragging {
  z-index: 25;
  transform: scaleY(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  cursor: grabbing;
}

.segment-pill.resizing {
  z-index: 25;
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.5);
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
  pointer-events: none;
}

.segment-label {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.segment-duration {
  font-size: 9px;
  opacity: 0.9;
  line-height: 1;
  margin-top: 1px;
}

.segment-confidence {
  font-size: 8px;
  opacity: 0.8;
  line-height: 1;
  margin-top: 1px;
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
  z-index: 20;
}

.resize-handle:hover,
.segment-pill:hover .resize-handle {
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
  pointer-events: none;
}

.resize-handle:hover i {
  color: white;
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
  z-index: 10;
}

.active-indicator {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: #2196F3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: white;
  z-index: 10;
}

/* Handle very small segments */
.segment-pill[style*="width: 0.1%"],
.segment-pill[style*="width: 0.2%"],
.segment-pill[style*="width: 0.3%"] {
  min-width: 20px;
  border-left: 3px solid rgba(255, 255, 255, 0.8);
}

.segment-pill[style*="width: 0.1%"] .segment-content,
.segment-pill[style*="width: 0.2%"] .segment-content,
.segment-pill[style*="width: 0.3%"] .segment-content {
  display: none; /* Hide text for very small segments */
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .segment-label {
    font-size: 10px;
  }
  
  .segment-duration {
    font-size: 8px;
  }
  
  .resize-handle {
    width: 12px;
  }
}
</style>