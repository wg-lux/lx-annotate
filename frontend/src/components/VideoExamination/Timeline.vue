<template>
  <div class="timeline-container">
    <div class="timeline-header">
      <div class="timeline-controls">
        <button 
          @click="playPause" 
          class="play-btn"
          :disabled="!video"
        >
          <i :class="isPlaying ? 'ni ni-button-play' : 'ni ni-button-play'"></i>
        </button>
        <button
          @click="stepFrame(-1)"
          class="control-btn"
          :disabled="!video || duration <= 0"
          title="Ein Frame zurück"
        >
          <i class="ni ni-bold-right icon-reverse"></i>
        </button>
        <button
          @click="stepFrame(1)"
          class="control-btn"
          :disabled="!video || duration <= 0"
          title="Ein Frame vor"
        >
          <i class="ni ni-bold-right"></i>
        </button>
        <button
          @click="deleteSelectedSegment"
          class="control-btn danger"
          :disabled="activeSegmentId == null"
          title="Ausgewähltes Segment löschen (Entf)"
        >
          <i class="ni ni-basket"></i>
        </button>
        <span class="time-display">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </span>
      </div>
      <div class="zoom-controls">
        <button @click="zoomOut" :disabled="zoomLevel <= 1">
          <i class="ni ni-tv-2"></i>
        </button>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <button @click="zoomIn" :disabled="zoomLevel >= 5">
          <i class="ni ni-tv-2"></i>
        </button>
      </div>
    </div>

    <div class="timeline-wrapper" :style="{ height: timelineHeight + 'px' }">
      <div
        class="timeline"
        ref="timeline"
        @mousedown="onTimelineMouseDown"
        @scroll.passive="handleTimelineScroll"
        :style="{ height: timelineHeight + 'px' }"
      >
        <!-- Time markers -->
        <div
          class="time-markers"
          :style="{ height: timelineContentHeight + 'px' }"
        >
          <div 
            v-for="marker in timeMarkers" 
            :key="marker.time"
            class="time-marker"
            :class="{
              'time-marker-start': marker.position <= 0,
              'time-marker-end': marker.position >= 100
            }"
            :style="{ left: marker.position + '%' }"
          >
            <div class="marker-text">{{ formatTime(marker.time) }}</div>
            <div
              class="marker-line"
              :style="{
                top: markerAreaHeight + 'px',
                height: markerLineHeight + 'px'
              }"
            ></div>
          </div>
        </div>

        <!-- ✅ UPDATED: Multi-row segment layout with Pointer Events -->
        <div
          class="segments-container"
          :style="{
            marginTop: markerAreaHeight + 'px',
            height: totalRowsHeight + 'px'
          }"
        >
          <div 
            v-for="row in segmentRows"
            :key="row.key"
            class="segment-row"
            :class="{ 'active': row.label === selectedLabel }"
            :style="{ 
              top: (row.rowNumber * rowHeight) + 'px',
              height: rowContentHeight + 'px'
            }"
          >
            <div 
              v-for="segment in row.segments"
              :key="segment.id"
              class="segment"
              :class="{ 
                'active': segment.id === activeSegmentId,
                'draft': segment.isDraft,
                'sync-error': segment.syncState === 'error',
                'too-small': getSegmentWidth(segment.start, segment.end) < 5
              }"
              :style="{
                left: getSegmentPosition(segment.start) + '%',
                width: getSegmentWidth(segment.start, segment.end) + '%',
                backgroundColor: segment.color || getColorForLabel(segment.label),
                borderColor: segment.isDraft ? '#ff9800' : 'transparent'
              }"
              :data-id="segment.id"
              @click.stop="handleSegmentClick(segment, $event)"
              @contextmenu.prevent="openSegmentTimeEditor(segment, $event)"
              @mouseenter="showSegmentTooltip(segment, $event)"
              @mousemove="moveSegmentTooltip($event)"
              @mouseleave="hideSegmentTooltip"
            >
              <!-- Start resize handle -->
              <div 
                class="resize-handle start-handle"
                :title="'Segment-Start ändern'"
              >
                <i class="ni ni-collection"></i>
              </div>

              <div class="segment-content">
                <span class="segment-label">{{ getTranslationForLabel(segment.label) }}</span>
                <span
                  v-if="getSegmentWidth(segment.start, segment.end) >= 5"
                  class="segment-duration"
                >
                  {{ formatDuration(segment.start, segment.end) }}
                </span>
              </div>

              <div
                v-if="getSegmentWidth(segment.start, segment.end) >= 8"
                class="segment-delete-btn"
                @click.stop="deleteSegment(segment)"
                :title="'Segment löschen'"
              >
                X
              </div>

              <!-- End resize handle -->
              <div 
                class="resize-handle end-handle"
                :title="'Segment-Ende ändern'"
              >
                <i class="ni ni-collection"></i>
              </div>

              <div v-if="segment.isDraft" class="draft-indicator">
                <i class="ni ni-single-copy-04"></i>
              </div>
              <div
                v-else-if="segment.syncState === 'error'"
                class="segment-status-indicator error"
                :title="segment.lastSyncError || 'Segment konnte nicht gespeichert werden'"
              >
                !
              </div>
              <div
                v-else-if="segment.isDirty || segment.syncState === 'dirty'"
                class="segment-status-indicator dirty"
                title="Ungespeicherte Änderung"
              >
                *
              </div>
            </div>
          </div>
        </div>

        <!-- Playhead -->
        <div 
          class="playhead"
          :style="{ left: playheadPosition + '%', height: timelineContentHeight + 'px' }"
        >
          <div class="playhead-line" :style="{ height: timelineContentHeight + 'px' }"></div>
          <div class="playhead-handle"></div>
        </div>

        <!-- Selection overlay for new segments -->
        <div 
          v-if="isSelecting"
          class="selection-overlay"
          :style="{
            left: Math.min(selectionStart, selectionEnd) + '%',
            width: Math.abs(selectionEnd - selectionStart) + '%',
            height: timelineContentHeight + 'px'
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
      @mousedown.stop
    >
      <div class="context-menu-header">
        <div class="context-menu-title">
          {{ contextMenu.segment ? getTranslationForLabel(contextMenu.segment.label) : 'Segment' }}
        </div>
        <div v-if="contextMenu.segment" class="context-menu-meta">
          {{ formatTime(contextMenu.segment.startTime) }} - {{ formatTime(contextMenu.segment.endTime) }}
        </div>
        <div v-if="contextMenu.segment?.lastSyncError" class="context-menu-error">
          {{ contextMenu.segment.lastSyncError }}
        </div>
        <div
          v-if="contextMenu.segment && getSegmentWidth(contextMenu.segment.start, contextMenu.segment.end) < 5"
          class="context-menu-hint"
        >
          Kurzes Segment: für präzise Kanten die Timeline heranzoomen.
        </div>
      </div>

      <label class="context-menu-label" for="segment-label-select">Label</label>
      <select
        id="segment-label-select"
        v-model="contextMenu.labelName"
        class="context-menu-select"
      >
        <option
          v-for="label in labelsForEditor"
          :key="label.name"
          :value="label.name"
        >
          {{ getTranslationForLabel(label.name) }}
        </option>
      </select>

      <div class="context-menu-time-grid">
        <label class="context-menu-label" for="segment-menu-start-input">Start</label>
        <label class="context-menu-label" for="segment-menu-end-input">Ende</label>
        <input
          id="segment-menu-start-input"
          v-model="contextMenu.startInput"
          class="context-menu-input"
          placeholder="mm:ss"
          @keydown.enter.prevent="applyContextMenuChanges"
          @keydown.esc.prevent="hideContextMenu"
        />
        <input
          id="segment-menu-end-input"
          v-model="contextMenu.endInput"
          class="context-menu-input"
          placeholder="mm:ss"
          @keydown.enter.prevent="applyContextMenuChanges"
          @keydown.esc.prevent="hideContextMenu"
        />
      </div>

      <div v-if="contextMenu.error" class="context-menu-error">
        {{ contextMenu.error }}
      </div>

      <div class="context-menu-actions">
        <button type="button" class="context-menu-btn" @click="hideContextMenu">
          Abbrechen
        </button>
        <button type="button" class="context-menu-btn primary" @click="applyContextMenuChanges">
          Speichern
        </button>
      </div>

      <div class="context-menu-separator"></div>
      <div class="context-menu-item" @click="playSegment(contextMenu.segment)">
        <i class="ni ni-button-play"></i>
        Segment abspielen
      </div>
      <div class="context-menu-item danger" @click="deleteSegment(contextMenu.segment)">
        <i class="ni ni-basket"></i>
        Segment löschen
      </div>
    </div>

    <div
      v-if="timeEditor.visible"
      class="time-editor"
      :style="{ left: timeEditor.x + 'px', top: timeEditor.y + 'px' }"
      @click.stop
      @mousedown.stop
    >
      <div class="time-editor-title">Segmentzeiten bearbeiten</div>
      <label class="time-editor-label" for="segment-start-input">Start</label>
      <input
        id="segment-start-input"
        ref="timeEditorStartInput"
        v-model="timeEditor.startInput"
        class="time-editor-input"
        placeholder="mm:ss oder hh:mm:ss"
        @keydown.enter.prevent="applyTimeEditorChanges"
        @keydown.esc.prevent="hideTimeEditor"
      />
      <label class="time-editor-label" for="segment-end-input">Ende</label>
      <input
        id="segment-end-input"
        v-model="timeEditor.endInput"
        class="time-editor-input"
        placeholder="mm:ss oder hh:mm:ss"
        @keydown.enter.prevent="applyTimeEditorChanges"
        @keydown.esc.prevent="hideTimeEditor"
      />
      <div v-if="timeEditor.error" class="time-editor-error">{{ timeEditor.error }}</div>
      <div class="time-editor-actions">
        <button type="button" class="time-editor-btn" @click="hideTimeEditor">Abbrechen</button>
        <button type="button" class="time-editor-btn primary" @click="applyTimeEditorChanges">Speichern</button>
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

import { useToastStore } from '@/stores/toastStore'
import { getRandomColor } from '@/utils/colorHelpers'

const toast = useToastStore()
const videoStore = useVideoStore()

// Type definitions
interface TimeMarker {
  time: number
  position: number
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  segment: CanonicalSegment | null
  labelName: string
  startInput: string
  endInput: string
  error: string
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  text: string
}

interface TimeEditorState {
  visible: boolean
  x: number
  y: number
  segment: CanonicalSegment | null
  startInput: string
  endInput: string
  error: string
}

interface CanonicalSegment extends Segment {
  start: number
  end: number
  color?: string
  avgConfidence: number
}

interface SegmentRow {
  key: string
  label: string
  rowNumber: number
  segments: CanonicalSegment[]
  maxEndTime: number
}

const props = defineProps<{
  video?: { duration?: number } | null
  segments?: Segment[]
  labels?: LabelMeta[]
  currentTime?: number
  isPlaying?: boolean
  activeSegmentId?: number | null
  showWaveform?: boolean
  selectionMode?: boolean
  fps?: number
}>()

const emit = defineEmits<{
  (e: 'seek', time: number): void
  (e: 'play-pause'): void
  (e: 'segment-select', segmentId: number): void
  (e: 'segment-edit', segment: Segment): void
  (e: 'segment-delete', segment: Segment): void
  (e: 'segment-label-change', segmentId: number, label: string, labelId: number | null): void
  (e: 'segment-create', data: { label: string; start: number; end: number }): void
  (e: 'segment-resize', segmentId: number, newStart: number, newEnd: number, mode: string, final?: boolean): void
  (e: 'segment-move', segmentId: number, newStart: number, newEnd: number, final?: boolean): void
  (e: 'time-selection', data: { start: number; end: number }): void
}>()

// Refs with proper types
const timeline = ref<HTMLElement | null>(null)
const waveformCanvas = ref<HTMLCanvasElement | null>(null)
const timeEditorStartInput = ref<HTMLInputElement | null>(null)
const cleanupFunctions = ref<Array<() => void>>([])
const timelineWidth = ref<number>(0)
const zoomLevel = ref<number>(1)
const isSelecting = ref<boolean>(false)
const isScrubbing = ref<boolean>(false)
const selectionStart = ref<number>(0)
const selectionEnd = ref<number>(0)
const markerAreaHeight = 36
const rowHeight = 56
const rowContentHeight = 48
const timelinePadding = 12
const visibleRowCount = 3
const minTimeMarkerGapPx = 88
const clipboardSegment = ref<{ label: string; duration: number } | null>(null)
const deletedSegments = ref<Array<{ label: string; start: number; end: number }>>([])
const suppressNextSegmentClick = ref<boolean>(false)
let timelineResizeObserver: ResizeObserver | null = null
let scrollSnapTimer: number | null = null



// Context menu
const contextMenu = ref<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  segment: null,
  labelName: '',
  startInput: '',
  endInput: '',
  error: ''
})

// Tooltip
const tooltip = ref<TooltipState>({
  visible: false,
  x: 0,
  y: 0,
  text: ''
})

const timeEditor = ref<TimeEditorState>({
  visible: false,
  x: 0,
  y: 0,
  segment: null,
  startInput: '',
  endInput: '',
  error: ''
})

// Computed properties
const duration = computed((): number => props.video?.duration || 0)

// Protected playhead calculation
const playheadPosition = computed((): number => {
  const videoDuration = duration.value
  const currentVideoTime = props.currentTime ?? 0

  if (!videoDuration || !Number.isFinite(videoDuration)) return 0
  if (!Number.isFinite(currentVideoTime) || currentVideoTime < 0) return 0

  const percentage = (currentVideoTime / videoDuration) * 100
  if (!Number.isFinite(percentage)) return 0

  return Math.max(0, Math.min(100, percentage))
})

const niceMarkerIntervals = [
  0.5,
  1,
  2,
  5,
  10,
  15,
  30,
  60,
  120,
  300,
  600,
  900,
  1200,
  1800,
  3600,
  7200,
  14400
]

const getNiceMarkerInterval = (minimumInterval: number): number => {
  return niceMarkerIntervals.find(interval => interval >= minimumInterval) ?? niceMarkerIntervals[niceMarkerIntervals.length - 1]
}

const timeMarkers = computed((): TimeMarker[] => {
  const markers: TimeMarker[] = []
  const totalTime = duration.value
  if (!totalTime) return markers

  const availableWidth = Math.max(timelineWidth.value || 0, 320)
  const maxMarkerCount = Math.max(2, Math.floor(availableWidth / minTimeMarkerGapPx) + 1)
  const minimumInterval = totalTime / Math.max(1, maxMarkerCount - 1)
  const interval = getNiceMarkerInterval(minimumInterval)
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

  const lastMarker = markers[markers.length - 1]
  const lastMarkerGapPx = lastMarker
    ? ((totalTime - lastMarker.time) / totalTime) * availableWidth
    : availableWidth
  if (!lastMarker || (totalTime > lastMarker.time && lastMarkerGapPx >= minTimeMarkerGapPx * 0.75)) {
    markers.push({
      time: totalTime,
      position: 100
    })
  }

  return markers
})

// Canonicalization: assume Segment is already camelCase
const getColorForLabel = (label: string): string => {
  return videoStore.getColorForLabel(label)
}

const getTranslationForLabel = (label: string): string => {
  return videoStore.getTranslationForLabel(label)
}

const toCanonical = (s: Segment): CanonicalSegment => {
  const color = s.color ?? getColorForLabel(s.label) ?? getRandomColor()

  return {
    ...s,
    start: s.startTime,
    end: s.endTime,
    color,
    avgConfidence: s.avgConfidence ?? 0,
  }
}


// 1. Define displayedSegments FIRST (Computed)
// This sanitizes raw props into the format the timeline needs
const displayedSegments = computed((): CanonicalSegment[] => {
  const segs = props.segments || []
  if (segs.length === 0) return []
  return segs.map(toCanonical)
})

// 2. Define labelOrder SECOND (Computed)
// This AUTOMATICALLY extracts labels from the segments above.
// No watchers needed!
const labelOrder = computed((): string[] => {
  const labels = new Set<string>()
  displayedSegments.value.forEach(s => labels.add(s.label))
  return Array.from(labels).sort() // Sorts A-Z. Remove .sort() if you want random order.
})

const labelsForEditor = computed<LabelMeta[]>(() => {
  if (props.labels?.length) return props.labels

  return labelOrder.value.map((name) => ({
    id: 0,
    name
  }))
})

// 3. Define selectedLabel (State)
const selectedLabel = ref<string | null>(null)

// 4. Define selectSegment (Action)
const selectSegment = (segment: CanonicalSegment): void => {
  selectedLabel.value = segment.label
  emit('segment-select', Number(segment.id))
  snapSegmentRowToTop(Number(segment.id))
}

const handleSegmentClick = (segment: CanonicalSegment, event: MouseEvent): void => {
  const target = event.target as HTMLElement | null
  if (suppressNextSegmentClick.value) {
    suppressNextSegmentClick.value = false
    return
  }
  if (target?.closest('.resize-handle, .segment-delete-btn, .segment-status-indicator')) {
    selectSegment(segment)
    return
  }
  showSegmentMenu(segment, event)
}

const getSegmentStatusText = (segment: Segment | CanonicalSegment): string | null => {
  if (segment.lastSyncError) return `Fehler: ${segment.lastSyncError}`
  if (segment.syncState === 'error') return 'Fehler beim Speichern'
  if (segment.syncState === 'pending_create') return 'Wird erstellt'
  if (segment.syncState === 'pending_update') return 'Wird gespeichert'
  if (segment.syncState === 'pending_delete') return 'Wird gelöscht'
  if (segment.isDirty || segment.syncState === 'dirty') return 'Ungespeicherte Änderung'
  return null
}

const getSegmentTooltipText = (segment: CanonicalSegment): string => {
  const status = getSegmentStatusText(segment)
  const isTiny = getSegmentWidth(segment.start, segment.end) < 5
  const lines = [
    getTranslationForLabel(segment.label),
    `${formatTime(segment.startTime)} - ${formatTime(segment.endTime)} (${formatDuration(segment.startTime, segment.endTime)})`
  ]
  if (status) lines.push(status)
  if (isTiny) lines.push('Kurzes Segment: zum präzisen Bearbeiten heranzoomen.')
  lines.push('Klicken zum Bearbeiten')
  return lines.join('\n')
}

const getTooltipPosition = (event: MouseEvent): { x: number; y: number } => {
  const panelWidth = 280
  const panelHeight = 120
  const viewportPadding = 12
  return {
    x: Math.max(
      viewportPadding,
      Math.min(event.clientX + 12, window.innerWidth - panelWidth - viewportPadding)
    ),
    y: Math.max(
      viewportPadding,
      Math.min(event.clientY + 12, window.innerHeight - panelHeight - viewportPadding)
    )
  }
}

const showSegmentTooltip = (segment: CanonicalSegment, event: MouseEvent): void => {
  const position = getTooltipPosition(event)
  tooltip.value = {
    visible: true,
    x: position.x,
    y: position.y,
    text: getSegmentTooltipText(segment)
  }
}

const moveSegmentTooltip = (event: MouseEvent): void => {
  if (!tooltip.value.visible) return
  const position = getTooltipPosition(event)
  tooltip.value.x = position.x
  tooltip.value.y = position.y
}

const hideSegmentTooltip = (): void => {
  tooltip.value.visible = false
}

// 5. Define segmentRows THIRD (Computed)
// This depends on the two computed properties above.
const segmentRows = computed((): SegmentRow[] => {
  const buckets: Record<string, CanonicalSegment[]> = {}

  // Group segments by label
  for (const s of displayedSegments.value) {
    if (!s.label) continue
    (buckets[s.label] ||= []).push(s)
  }

  // Determine the order of rows based on selection + labelOrder
  const orderedLabels = selectedLabel.value
      ? [selectedLabel.value, ...labelOrder.value.filter(l => l !== selectedLabel.value)]
      : [...labelOrder.value]

  const rows: SegmentRow[] = []
  
  // Create rows based on overlapping logic
  orderedLabels.forEach(label => {
    if (!buckets[label]) return

    const segs = buckets[label].sort((a, b) => a.start - b.start)
    let physicalIdx = 0
    let currentRow: SegmentRow = {
      key: `${label}-0`,
      label,
      rowNumber: rows.length,
      segments: [],
      maxEndTime: 0,
    }

    for (const seg of segs) {
      if (seg.start < currentRow.maxEndTime - 1e-4) {
        rows.push(currentRow)
        physicalIdx += 1
        currentRow = {
          key: `${label}-${physicalIdx}`,
          label,
          rowNumber: rows.length,
          segments: [],
          maxEndTime: 0,
        }
      }
      currentRow.segments.push(seg)
      currentRow.maxEndTime = Math.max(currentRow.maxEndTime, seg.end)
    }
    rows.push(currentRow)
  })

  return rows
})

const getSegmentRowNumber = (segmentId: number): number | null => {
  const row = segmentRows.value.find(item =>
    item.segments.some(segment => Number(segment.id) === Number(segmentId))
  )
  return row?.rowNumber ?? null
}

const getTimelineMaxScrollTop = (): number => {
  return Math.max(0, timelineContentHeight.value - timelineHeight.value)
}

const scrollTimelineTo = (top: number, behavior: ScrollBehavior = 'smooth'): void => {
  const element = timeline.value
  if (!element) return

  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top, behavior })
    return
  }

  element.scrollTop = top
}

const scrollRowToTop = (rowNumber: number, behavior: ScrollBehavior = 'smooth'): void => {
  const targetTop = Math.max(
    0,
    Math.min(rowNumber * rowHeight, getTimelineMaxScrollTop())
  )
  scrollTimelineTo(targetTop, behavior)
}

const snapSegmentRowToTop = (segmentId: number): void => {
  nextTick(() => {
    const rowNumber = getSegmentRowNumber(segmentId)
    if (rowNumber === null) return
    scrollRowToTop(rowNumber)
  })
}

const snapTimelineToNearestRow = (): void => {
  if (!timeline.value) return
  const targetTop = Math.max(
    0,
    Math.min(
      Math.round(timeline.value.scrollTop / rowHeight) * rowHeight,
      getTimelineMaxScrollTop()
    )
  )
  if (Math.abs(timeline.value.scrollTop - targetTop) < 2) return
  scrollTimelineTo(targetTop)
}

const handleTimelineScroll = (): void => {
  if (scrollSnapTimer !== null) {
    window.clearTimeout(scrollSnapTimer)
  }
  scrollSnapTimer = window.setTimeout(() => {
    scrollSnapTimer = null
    snapTimelineToNearestRow()
  }, 120)
}


// Timeline height
const totalRowsHeight = computed((): number => segmentRows.value.length * rowHeight)
const visibleRows = computed((): number =>
  Math.max(1, Math.min(segmentRows.value.length, visibleRowCount))
)
const timelineHeight = computed((): number => {
  return markerAreaHeight + (visibleRows.value * rowHeight) + timelinePadding
})
const timelineContentHeight = computed((): number => {
  return Math.max(
    timelineHeight.value,
    markerAreaHeight + totalRowsHeight.value + timelinePadding
  )
})
const markerLineHeight = computed((): number => {
  return Math.max(0, timelineContentHeight.value - markerAreaHeight)
})

// Helpers
const formatTime = (seconds: number | undefined): string => {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00'
  return formatTimeHelper(seconds)
}

const formatDuration = (startTime: number, endTime: number): string => {
  const d = endTime - startTime
  return formatTimeHelper(d)
}

const getSegmentPosition = (startTime: number): number => {
  const position = calculateSegmentPosition(startTime, duration.value)
  if (!Number.isFinite(position) || position < 0) {
    console.error('[Timeline] Invalid segment position calculated:', {
      startTime,
      duration: duration.value,
      position
    })
    return 0
  }
  return position
}

const getSegmentWidth = (startTime: number, endTime: number): number => {
  const width = calculateSegmentWidth(startTime, endTime, duration.value)
  if (!Number.isFinite(width) || width <= 0) {
    console.error('[Timeline] Invalid segment width calculated:', {
      startTime,
      endTime,
      duration: duration.value,
      width
    })
    return 0
  }
  return width
}

// Pointer-based drag/resize
interface DragResizeOptions {
  trackPx: () => number
  duration: () => number
  onMove: (startS: number, endS: number) => void
  onResize: (startS: number, endS: number, edge: 'start' | 'end') => void
  onDone: () => void
}

function useDragResize(el: HTMLElement, opt: DragResizeOptions) {
  let mode: 'drag' | 'start' | 'end' | null = null
  let pxStart = 0
  let startLeft = 0
  let startWidth = 0

  let draftStart = 0
  let draftEnd = 0

  const pxToTime = (px: number) => (px / opt.trackPx()) * opt.duration()

  function down(ev: PointerEvent) {
    const target = ev.target as HTMLElement

    if (target.closest('.segment-delete-btn')) {
      return
    }

    ev.stopPropagation()

    const handle = target.closest('.resize-handle')

    if (handle?.classList.contains('start-handle')) mode = 'start'
    else if (handle?.classList.contains('end-handle')) mode = 'end'
    else mode = 'drag'

    pxStart = ev.clientX
    startLeft = el.offsetLeft
    startWidth = el.offsetWidth

    el.setPointerCapture(ev.pointerId)
    ev.preventDefault()
  }

  function move(ev: PointerEvent) {
    if (!mode) return
    const dx = ev.clientX - pxStart
    if (Math.abs(dx) > 3) {
      suppressNextSegmentClick.value = true
    }

    if (mode === 'drag') {
      let left = Math.min(
        Math.max(0, startLeft + dx),
        opt.trackPx() - startWidth
      )
      el.style.left = left + 'px'
      draftStart = left
      draftEnd = left + startWidth
    }

    if (mode === 'start') {
      let left = Math.min(startLeft + dx, startLeft + startWidth - 10)
      let width = startWidth + (startLeft - left)
      el.style.left = left + 'px'
      el.style.width = width + 'px'
      draftStart = left
      draftEnd = left + width
    }

    if (mode === 'end') {
      let width = Math.max(10, startWidth + dx)
      el.style.width = width + 'px'
      el.style.left = startLeft + 'px'
      draftStart = startLeft
      draftEnd = startLeft + width
    }
  }

  function up(ev: PointerEvent) {
    if (!mode) return
    move(ev)
    const s = draftStart
    const e = draftEnd

    if (mode === 'drag') {
      opt.onMove(pxToTime(s), pxToTime(e))
    } else {
      opt.onResize(pxToTime(s), pxToTime(e), mode as 'start' | 'end')
    }
    mode = null
    el.releasePointerCapture(ev.pointerId)
    opt.onDone()
    window.setTimeout(() => {
      suppressNextSegmentClick.value = false
    }, 0)
  }

  el.addEventListener('pointerdown', down)
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)

  return () => {
    el.removeEventListener('pointerdown', down)
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
  }
}

const initializeDragResize = () => {
  cleanupFunctions.value.forEach(cleanup => cleanup())
  cleanupFunctions.value = []

  if (!timeline.value) return

  nextTick(() => {
    segmentRows.value.forEach(row => {
      row.segments.forEach(segment => {
        const el = document.querySelector(`[data-id="${segment.id}"]`) as HTMLElement | null
        if (!el) return

        const cleanup = useDragResize(el, {
          trackPx: () => timeline.value!.offsetWidth,
          duration: () => duration.value,
          onMove: (startS: number, endS: number) => {
            const localSegment = displayedSegments.value.find(s => s.id === segment.id)
            if (localSegment) {
              localSegment.start = startS
              localSegment.end = endS
              localSegment.startTime = startS
              localSegment.endTime = endS
            }
            emit('segment-move', Number(segment.id), startS, endS)
          },
          onResize: (startS: number, endS: number, edge: 'start' | 'end') => {
            const localSegment = displayedSegments.value.find(s => s.id === segment.id)
            if (localSegment) {
              localSegment.start = startS
              localSegment.end = endS
              localSegment.startTime = startS
              localSegment.endTime = endS
            }
            emit('segment-resize', Number(segment.id), startS, endS, edge)
          },
          onDone: () => {
            const localSegment = displayedSegments.value.find(s => s.id === segment.id)
            if (!localSegment) return

            const numericId = getNumericSegmentId(segment.id)
            if (numericId === null) return

            emit(
              'segment-resize',
              numericId,
              localSegment.start,
              localSegment.end,
              'end',
              true
            )
          }
        })
        cleanupFunctions.value.push(cleanup)
      })
    })
  })
}

// Zoom
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

// Playback
const playPause = (): void => {
  emit('play-pause')
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const deleteSelectedSegment = (): void => {
  if (props.activeSegmentId == null) return
  const segmentToDelete = displayedSegments.value.find(
    segment => Number(segment.id) === Number(props.activeSegmentId)
  )
  if (!segmentToDelete) return
  rememberDeletedSegment(segmentToDelete)
  emit('segment-delete', segmentToDelete)
}

const stepFrame = (direction: -1 | 1): void => {
  if (!duration.value) return
  const fps = props.fps && props.fps > 0 ? props.fps : 50
  const step = 1 / fps
  const current = props.currentTime ?? 0
  const next = Math.max(0, Math.min(duration.value, current + direction * step))
  emit('seek', next)
}

const seekBySeconds = (deltaSeconds: number): void => {
  if (!duration.value) return
  const current = props.currentTime ?? 0
  const next = Math.max(0, Math.min(duration.value, current + deltaSeconds))
  emit('seek', next)
}


const getSegmentRange = (segment: Segment | CanonicalSegment): { label: string; start: number; end: number } => {
  const canonical = segment as CanonicalSegment
  const start = Number.isFinite(canonical.start) ? canonical.start : segment.startTime ?? 0
  const end = Number.isFinite(canonical.end) ? canonical.end : segment.endTime ?? start
  return { label: segment.label, start, end }
}

const rememberDeletedSegment = (segment: Segment | CanonicalSegment): void => {
  if (segment.isDraft) return
  const range = getSegmentRange(segment)
  const start = Math.max(0, range.start)
  const end = Math.max(start, range.end)
  deletedSegments.value.push({ label: range.label, start, end })
  if (deletedSegments.value.length > 20) {
    deletedSegments.value.shift()
  }
}

const copySelectedSegment = (): boolean => {
  if (props.activeSegmentId == null) return false
  const segment = displayedSegments.value.find(
    s => Number(s.id) === Number(props.activeSegmentId)
  )
  if (!segment) return false
  const range = getSegmentRange(segment)
  const fps = props.fps && props.fps > 0 ? props.fps : 50
  const minDuration = 1 / fps
  const duration = Math.max(minDuration, range.end - range.start)
  clipboardSegment.value = { label: range.label, duration }
  toast.success({ text: 'Segment kopiert' })
  return true
}

const pasteSegment = (): boolean => {
  if (!clipboardSegment.value) {
    toast.info({ text: 'Kein Segment in der Zwischenablage' })
    return false
  }
  const start = Math.max(0, props.currentTime ?? 0)
  const fps = props.fps && props.fps > 0 ? props.fps : 50
  const minDuration = 1 / fps
  const targetDuration = Math.max(minDuration, clipboardSegment.value.duration)
  let end = start + targetDuration
  if (duration.value > 0) {
    end = Math.min(duration.value, end)
  }
  if (end <= start) return false
  emit('segment-create', { label: clipboardSegment.value.label, start, end })
  toast.success({ text: 'Segment eingefügt' })
  return true
}

const undoDelete = (): boolean => {
  const last = deletedSegments.value.pop()
  if (!last) {
    toast.info({ text: 'Nichts zum Rückgängig machen' })
    return false
  }
  emit('segment-create', { label: last.label, start: last.start, end: last.end })
  toast.success({ text: 'Löschung rückgängig gemacht' })
  return true
}

const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && timeEditor.value.visible) {
    hideTimeEditor()
    event.preventDefault()
    return
  }
  if (isEditableTarget(event.target)) return
  const isMeta = event.ctrlKey || event.metaKey

  if (isMeta && event.key.toLowerCase() === 'z') {
    if (undoDelete()) {
      event.preventDefault()
    }
    return
  }

  if (isMeta && event.key.toLowerCase() === 'c') {
    if (copySelectedSegment()) {
      event.preventDefault()
    }
    return
  }

  if (isMeta && event.key.toLowerCase() === 'v') {
    if (pasteSegment()) {
      event.preventDefault()
    }
    return
  }

  if (!isMeta && !event.altKey) {
    const isComma = event.key === ',' || event.code === 'Comma'
    const isPeriod = event.key === '.' || event.code === 'Period'
    const isK = event.key.toLowerCase() === 'k'
    const isL = event.key.toLowerCase() === 'l'
    const isArrowLeft = event.key === 'ArrowLeft'
    const isArrowRight = event.key === 'ArrowRight'

    if (isArrowLeft) {
      event.preventDefault()
      seekBySeconds(-2)
      return
    }

    if (isArrowRight) {
      event.preventDefault()
      seekBySeconds(2)
      return
    }
    if (isComma) {
      event.preventDefault()
      stepFrame(-1)
      return
    }
    if (isPeriod) {
      event.preventDefault()
      stepFrame(1)
      return
    }
    if (isK) {
      event.preventDefault()
      seekBySeconds(-2)
      return
    }
    if (isL) {
      event.preventDefault()
      seekBySeconds(2)
      return
    }
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (props.activeSegmentId == null) return
    event.preventDefault()
    deleteSelectedSegment()
  }
}

// Context actions
const editSegment = (segment: Segment | null): void => {
  if (!segment) return
  hideContextMenu()
  emit('segment-edit', segment)
}

const deleteSegment = (segment: Segment | null): void => {
  if (!segment) return
  hideContextMenu()
  rememberDeletedSegment(segment)
  emit('segment-delete', segment)
}

const playSegment = (segment: Segment | null): void => {
  if (!segment) return
  hideContextMenu()
  emit('seek', segment.startTime || 0)
  emit('play-pause')
}

const getFloatingPanelPosition = (
  event: MouseEvent,
  panelWidth = 280,
  panelHeight = 340
): { x: number; y: number } => {
  const viewportPadding = 12
  const maxX = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding)
  const maxY = Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding)
  return {
    x: Math.max(viewportPadding, Math.min(event.clientX, maxX)),
    y: Math.max(viewportPadding, Math.min(event.clientY, maxY))
  }
}

// Context menu
const showSegmentMenu = (segment: CanonicalSegment, event: MouseEvent): void => {
  hideTimeEditor()
  hideSegmentTooltip()
  const range = getSegmentRange(segment)
  const position = getFloatingPanelPosition(event)
  selectSegment(segment)
  contextMenu.value = {
    visible: true,
    x: position.x,
    y: position.y,
    segment,
    labelName: segment.label,
    startInput: formatEditorTime(range.start),
    endInput: formatEditorTime(range.end),
    error: ''
  }
}

const hideContextMenu = (): void => {
  contextMenu.value.visible = false
  contextMenu.value.segment = null
  contextMenu.value.error = ''
}

const formatEditorTime = (timeInSeconds: number): string => {
  if (!Number.isFinite(timeInSeconds) || timeInSeconds < 0) return '0'
  const hours = Math.floor(timeInSeconds / 3600)
  const minutes = Math.floor((timeInSeconds % 3600) / 60)
  const seconds = timeInSeconds % 60
  const secStr = seconds.toFixed(3).replace(/\.?0+$/, '')
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${secStr.padStart(2, '0')}`
  }
  return `${minutes}:${secStr.padStart(2, '0')}`
}

const parseEditorTime = (value: string): number | null => {
  const input = value.trim()
  if (!input) return null
  if (/^\d+(\.\d+)?$/.test(input)) {
    const seconds = Number(input)
    return Number.isFinite(seconds) ? seconds : null
  }

  const parts = input.split(':').map(p => p.trim())
  if (parts.length < 2 || parts.length > 3) return null
  if (parts.some(p => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null

  const numericParts = parts.map(Number)
  if (numericParts.some(v => !Number.isFinite(v))) return null
  if (numericParts.slice(1).some(v => v >= 60)) return null

  if (numericParts.length === 2) {
    return numericParts[0] * 60 + numericParts[1]
  }
  return numericParts[0] * 3600 + numericParts[1] * 60 + numericParts[2]
}

const validateEditorRange = (
  startInput: string,
  endInput: string
): { start: number; end: number; error: string | null } => {
  const parsedStart = parseEditorTime(startInput)
  const parsedEnd = parseEditorTime(endInput)

  if (parsedStart === null || parsedEnd === null) {
    return { start: 0, end: 0, error: 'Ungültiges Zeitformat.' }
  }
  if (parsedStart < 0 || parsedEnd < 0) {
    return { start: parsedStart, end: parsedEnd, error: 'Zeiten dürfen nicht negativ sein.' }
  }
  if (parsedEnd <= parsedStart) {
    return { start: parsedStart, end: parsedEnd, error: 'Die Endzeit muss nach der Startzeit liegen.' }
  }
  if (duration.value > 0 && parsedEnd > duration.value) {
    return {
      start: parsedStart,
      end: parsedEnd,
      error: `Die Endzeit darf maximal ${formatTime(duration.value)} sein.`
    }
  }

  return { start: parsedStart, end: parsedEnd, error: null }
}

const applyContextMenuChanges = (): void => {
  const menuState = contextMenu.value
  if (!menuState.visible || !menuState.segment) return

  const labelName = menuState.labelName.trim()
  if (!labelName) {
    contextMenu.value.error = 'Bitte ein Label auswählen.'
    return
  }

  const validated = validateEditorRange(menuState.startInput, menuState.endInput)
  if (validated.error) {
    contextMenu.value.error = validated.error
    return
  }

  const numericId = getNumericSegmentId(menuState.segment.id)
  if (numericId === null) return

  const selectedLabel = labelsForEditor.value.find(label => label.name === labelName)
  const labelId = selectedLabel && selectedLabel.id > 0 ? selectedLabel.id : null
  const originalLabel = menuState.segment.label
  const originalRange = getSegmentRange(menuState.segment)

  const localSegment = displayedSegments.value.find(s => s.id === menuState.segment?.id)
  if (localSegment) {
    localSegment.label = labelName
    localSegment.color = getColorForLabel(labelName)
    localSegment.start = validated.start
    localSegment.end = validated.end
    localSegment.startTime = validated.start
    localSegment.endTime = validated.end
  }

  if (originalLabel !== labelName) {
    emit('segment-label-change', numericId, labelName, labelId)
  }

  if (
    Math.abs(originalRange.start - validated.start) > 0.0005 ||
    Math.abs(originalRange.end - validated.end) > 0.0005
  ) {
    emit('segment-resize', numericId, validated.start, validated.end, 'manual', true)
  }

  hideContextMenu()
}

const hideTimeEditor = (): void => {
  timeEditor.value.visible = false
  timeEditor.value.segment = null
  timeEditor.value.error = ''
}

const openSegmentTimeEditor = (segment: CanonicalSegment, event: MouseEvent): void => {
  if (event.shiftKey) {
    showSegmentMenu(segment, event)
    return
  }
  hideContextMenu()
  const range = getSegmentRange(segment)
  timeEditor.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    segment,
    startInput: formatEditorTime(range.start),
    endInput: formatEditorTime(range.end),
    error: ''
  }
  selectSegment(segment)
  nextTick(() => {
    timeEditorStartInput.value?.focus()
    timeEditorStartInput.value?.select()
  })
}

const applyTimeEditorChanges = (): void => {
  const editingState = timeEditor.value
  if (!editingState.visible || !editingState.segment) return

  const validated = validateEditorRange(editingState.startInput, editingState.endInput)
  if (validated.error) {
    timeEditor.value.error = validated.error
    return
  }

  const localSegment = displayedSegments.value.find(s => s.id === editingState.segment?.id)
  if (localSegment) {
    localSegment.start = validated.start
    localSegment.end = validated.end
    localSegment.startTime = validated.start
    localSegment.endTime = validated.end
  }

  const numericId = getNumericSegmentId(editingState.segment.id)
  if (numericId !== null) {
    emit('segment-resize', numericId, validated.start, validated.end, 'manual', true)
  }
  hideTimeEditor()
}

// Timeline interaction
const getTimelineTimeFromEvent = (event: MouseEvent): number | null => {
  if (!timeline.value || duration.value === 0) return null

  const rect = timeline.value.getBoundingClientRect()
  const clickX = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
  return (clickX / rect.width) * duration.value
}

const onTimelineMouseDown = (event: MouseEvent): void => {
  if (!timeline.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.segment, .context-menu, .time-editor')) return

  const clickTime = getTimelineTimeFromEvent(event)
  if (clickTime === null) return

  if (props.selectionMode) {
    const rect = timeline.value.getBoundingClientRect()
    const clickX = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
    isSelecting.value = true
    selectionStart.value = (clickX / rect.width) * 100
    selectionEnd.value = selectionStart.value

    document.addEventListener('mousemove', onSelectionMouseMove)
    document.addEventListener('mouseup', onSelectionMouseUp)
  } else {
    emit('seek', clickTime)
    isScrubbing.value = true
    document.addEventListener('mousemove', onTimelineScrubMove)
    document.addEventListener('mouseup', onTimelineScrubEnd)
  }
}

const onTimelineScrubMove = (event: MouseEvent): void => {
  if (!isScrubbing.value) return
  const scrubTime = getTimelineTimeFromEvent(event)
  if (scrubTime === null) return
  emit('seek', scrubTime)
}

const onTimelineScrubEnd = (event: MouseEvent): void => {
  if (isScrubbing.value) {
    const scrubTime = getTimelineTimeFromEvent(event)
    if (scrubTime !== null) {
      emit('seek', scrubTime)
    }
  }
  isScrubbing.value = false
  document.removeEventListener('mousemove', onTimelineScrubMove)
  document.removeEventListener('mouseup', onTimelineScrubEnd)
}

const onSelectionMouseMove = (event: MouseEvent): void => {
  if (!isSelecting.value || !timeline.value) return

  const rect = timeline.value.getBoundingClientRect()
  const currentX = event.clientX - rect.left
  selectionEnd.value = Math.max(0, Math.min(100, (currentX / rect.width) * 100))
}

const onSelectionMouseUp = (event: MouseEvent): void => {
  if (!isSelecting.value || !timeline.value) return

  const startPercent = Math.min(selectionStart.value, selectionEnd.value)
  const endPercent = Math.max(selectionStart.value, selectionEnd.value)

  const startTime = (startPercent / 100) * duration.value
  const endTime = (endPercent / 100) * duration.value

  if (endTime - startTime > 0.1) {
    emit('time-selection', { start: startTime, end: endTime })
  }

  isSelecting.value = false
  selectionStart.value = 0
  selectionEnd.value = 0

  document.removeEventListener('mousemove', onSelectionMouseMove)
  document.removeEventListener('mouseup', onSelectionMouseUp)
}

// Waveform
const initializeWaveform = (): void => {
  if (!waveformCanvas.value || !props.video) return

  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  ctx.fillStyle = '#e0e0e0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

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

const updateTimelineWidth = (): void => {
  timelineWidth.value = timeline.value?.clientWidth ?? 0
}

const initializeTimelineMetrics = (): void => {
  updateTimelineWidth()
  if (!timeline.value) return

  timelineResizeObserver?.disconnect()
  timelineResizeObserver = new ResizeObserver(() => {
    updateTimelineWidth()
  })
  timelineResizeObserver.observe(timeline.value)
}

// Click outside
const handleClickOutside = (event: Event): void => {
  if (contextMenu.value.visible && !(event.target as Element)?.closest('.context-menu')) {
    hideContextMenu()
  }
  if (timeEditor.value.visible && !(event.target as Element)?.closest('.time-editor')) {
    hideTimeEditor()
  }
}

// Lifecycle
watch(() => props.video, () => {
  if (props.showWaveform) {
    nextTick(() => {
      initializeWaveform()
    })
  }
})

watch(
  segmentRows,
  () => nextTick(initializeDragResize),
  { immediate: true }
)

watch(
  () => props.activeSegmentId,
  (segmentId) => {
    if (segmentId == null) return
    snapSegmentRowToTop(Number(segmentId))
  }
)

watch(
  segmentRows,
  () => {
    if (props.activeSegmentId == null) return
    snapSegmentRowToTop(Number(props.activeSegmentId))
  }
)

watch(segmentRows, (rows: SegmentRow[]) => {
  rows.forEach(row => {
    row.segments.forEach(s => {
      if (getSegmentWidth(s.start, s.end) === 0) {
        console.warn('[Timeline] Segment mit 0% Breite:', s)
      }
    })
  })
}, { immediate: true })

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)

  nextTick(() => {
    initializeTimelineMetrics()
    initializeDragResize()
  })

  if (props.showWaveform) {
    nextTick(() => {
      initializeWaveform()
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('mousemove', onTimelineScrubMove)
  document.removeEventListener('mouseup', onTimelineScrubEnd)
  timelineResizeObserver?.disconnect()
  timelineResizeObserver = null
  if (scrollSnapTimer !== null) {
    window.clearTimeout(scrollSnapTimer)
    scrollSnapTimer = null
  }
  cleanupFunctions.value.forEach(cleanup => cleanup())
  cleanupFunctions.value = []
  document.removeEventListener('mousemove', onSelectionMouseMove)
  document.removeEventListener('mouseup', onSelectionMouseUp)
})

// Helper for numeric IDs
const getNumericSegmentId = (segmentId: number): number | null => {
  if (typeof segmentId === 'number' && Number.isFinite(segmentId)) return segmentId
  console.error('[Timeline] Unexpected segment ID:', segmentId)
  return null
}
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

.control-btn {
  background-color: transparent;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #555;
}

.control-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
  color: #333;
}

.control-btn.danger:hover:not(:disabled) {
  background-color: #ffebee;
  color: #d32f2f;
  border-color: #ef9a9a;
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #eee;
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
  background-color: #f4f6f8;
}

.timeline {
  position: relative;
  height: 80px;
  margin: 20px;
  background-color: #fff;
  border-radius: 6px;
  cursor: crosshair;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y proximity;
  scroll-behavior: smooth;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.timeline::-webkit-scrollbar {
  width: 8px;
}

.timeline::-webkit-scrollbar-track {
  background: #eef1f5;
  border-radius: 999px;
}

.timeline::-webkit-scrollbar-thumb {
  background: #c3cbd5;
  border-radius: 999px;
}

.time-markers {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  min-height: 100%;
  pointer-events: none;
  z-index: 1;
}

.time-marker {
  position: absolute;
  top: 0;
  height: 100%;
}

.marker-line {
  position: absolute;
  width: 1px;
  background: linear-gradient(
    to bottom,
    rgba(119, 132, 150, 0.38),
    rgba(119, 132, 150, 0.18)
  );
}

.marker-text {
  position: sticky;
  top: 8px;
  left: 0;
  z-index: 2;
  padding: 1px 4px;
  background: rgba(255, 255, 255, 0.88);
  border-radius: 3px;
  font-size: 10px;
  color: #667085;
  transform: translateX(-50%);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.time-marker-start .marker-text {
  transform: translateX(0);
}

.time-marker-end .marker-text {
  transform: translateX(-100%);
}

.segments-container {
  position: relative;
  left: 0;
  right: 0;
  height: auto;
  pointer-events: none;
  z-index: 2;
}

.segment-row {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: auto;
  scroll-snap-align: start;
  scroll-margin-top: 36px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
  background:
    linear-gradient(to bottom, rgba(248, 250, 252, 0.72), rgba(255, 255, 255, 0.18));
}

.segment-row.active {
  background:
    linear-gradient(to bottom, rgba(232, 244, 255, 0.92), rgba(255, 255, 255, 0.42));
}

.segment {
  position: absolute;
  height: 100%;
  min-width: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  /* ✅ Required for Pointer Events */
  touch-action: none;
  user-select: none;
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

.segment.sync-error {
  border-color: #dc3545 !important;
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

.segment.too-small .segment-content {
  display: none;
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

.segment-status-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.85);
  color: white;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
}

.segment-status-indicator.error {
  background-color: #dc3545;
}

.segment-status-indicator.dirty {
  background-color: #ffc107;
  color: #212529;
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
  width: 280px;
  overflow: hidden;
  padding: 10px;
}

.context-menu-header {
  margin-bottom: 8px;
}

.context-menu-title {
  color: #222;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.context-menu-meta {
  color: #666;
  font-size: 12px;
  margin-top: 2px;
}

.context-menu-label {
  color: #555;
  display: block;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
}

.context-menu-select,
.context-menu-input {
  width: 100%;
  border: 1px solid #cfd4da;
  border-radius: 4px;
  color: #222;
  font-size: 12px;
  padding: 6px 8px;
}

.context-menu-select:focus,
.context-menu-input:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.15);
}

.context-menu-time-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 4px 8px;
  margin-top: 8px;
}

.context-menu-error {
  color: #055160;
  background-color: #cff4fc;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.35;
  margin-top: 8px;
  padding: 6px 8px;
  overflow-wrap: anywhere;
}

.context-menu-hint {
  color: #664d03;
  background-color: #fff3cd;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.35;
  margin-top: 8px;
  padding: 6px 8px;
}

.context-menu-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.context-menu-btn {
  border: 1px solid #cfd4da;
  background: #fff;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  padding: 6px 9px;
}

.context-menu-btn.primary {
  border-color: #0d6efd;
  background: #0d6efd;
  color: #fff;
}

.time-editor {
  position: fixed;
  z-index: 1100;
  min-width: 220px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.time-editor-title {
  font-size: 12px;
  font-weight: 700;
  color: #333;
}

.time-editor-label {
  font-size: 11px;
  color: #666;
}

.time-editor-input {
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
}

.time-editor-input:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.15);
}

.time-editor-error {
  color: #055160;
  background: #cff4fc;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.35;
  padding: 6px 8px;
}

.time-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.time-editor-btn {
  border: 1px solid #ccc;
  background: #fff;
  color: #444;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
}

.time-editor-btn.primary {
  border-color: #2196f3;
  background: #2196f3;
  color: #fff;
}

.context-menu-item {
  display: flex;
  align-items: center;
  border-radius: 4px;
  padding: 8px 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 13px;
  color: #333;
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
  white-space: pre-line;
  max-width: 260px;
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
  touch-action: none;
  user-select: none;
  pointer-events: auto;
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
  /* Prevent text selection on handles */
  pointer-events: none;
}


/* Improved segment selection */
.segment.selected {
  border-color: #2196F3 !important;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.2);
}

/* Proper CSS structure for segment rows */
.segment-rows-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.segment {
  height: 100%;
  min-height: 48px;
}

.segment-delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 1px;
  background-color: rgba(255, 0, 0, 0.8);
  border: white 1px solid;
  color: white;
  border: none;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
