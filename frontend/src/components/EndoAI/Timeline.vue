<template>
  <div class="timeline-container">
    <!-- Timeline Header mit Zeitmarkierungen -->
    <div class="timeline-header">
      <div class="time-markers" ref="timeMarkersRef">
        <div
          v-for="marker in timeMarkers"
          :key="marker.time"
          class="time-marker"
          :style="{ left: marker.position + '%' }"
        >
          <span class="time-label">{{ formatTime(marker.time) }}</span>
          <div class="marker-line"></div>
        </div>
      </div>
    </div>

    <!-- Video-Zeitcursor -->
    <div class="timeline-cursor" :style="{ left: cursorPosition + '%' }" v-if="currentTime >= 0">
      <div class="cursor-line"></div>
      <div class="cursor-handle">{{ formatTime(currentTime) }}</div>
    </div>
    
    <!-- 🔸 Segment Selection Dropdown -->
    <div class="segment-selector" v-if="false">
      <select class="form-select">
        <option value="">Alle Segmente anzeigen</option>
      </select>
    </div>


    <!-- Timeline Tracks - eine Reihe pro Label -->
    <div class="timeline-tracks" ref="timelineRef">
      <div
        v-for="labelGroup in organizedSegments"
        :key="labelGroup.labelName"
        class="timeline-track"
        @click="handleTimelineClick"
      >
        <!-- Label-Header -->
        <div class="track-header">
          <div 
            class="label-indicator" 
            :style="{ backgroundColor: labelGroup.color }"
          ></div>
          <span class="track-label">{{ labelGroup.labelName || 'Ohne Label' }}</span>
          <span class="segment-count">({{ labelGroup.segments.length }})</span>
        </div>

        <!-- Segmente für dieses Label -->
        <div class="track-content">
          <div
            v-for="segment in labelGroup.segments"
            :key="segment.id"
            class="timeline-segment"
            :style="getSegmentStyle(segment, labelGroup.color)"
            @click.stop="jumpToSegment(segment)"
            :title="`${segment.label_display}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`"
          >
            <!-- Start-Resize-Handle -->
            <div
              class="start-resize-handle"
              @mousedown="startStartResize(segment, $event)"
              @touchstart.prevent="startStartResize(segment, $event)"
              title="Segment-Start ziehen"
            ></div>
            
            <!-- Segment-Inhalt -->
            <div class="segment-content">
              <span class="segment-time">{{ formatTime(segment.startTime) }}</span>
              <span class="segment-duration">{{ formatDuration(segment.endTime - segment.startTime) }}</span>
            </div>
            
            <!-- End-Resize-Handle -->
            <div
              class="end-resize-handle"
              @mousedown="startEndResize(segment, $event)"
              @touchstart.prevent="startEndResize(segment, $event)"
              title="Segment-Ende ziehen"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Leere Nachricht -->
    <div v-if="organizedSegments.length === 0" class="empty-timeline">
      <i class="material-icons">timeline</i>
      <p>Keine Segmente vorhanden</p>
      <small>Klicken Sie auf die Timeline, um ein neues Segment zu erstellen</small>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted, computed, watch } from 'vue';
import type { PropType } from 'vue';
import type { Segment } from '@/stores/videoStore';
import type { LabelGroup, TimeMarker, ApiSegment } from '@/types/timeline';
import { useVideoStore } from '@/stores/videoStore';

export default defineComponent({
  name: 'Timeline',
  props: {
    duration: {
      type: Number,
      required: true,
    },
    currentTime: {
      type: Number,
      default: 0,
    },
    segments: {
      type: Array as PropType<Segment[]>,
      default: () => [],
    },
    apiSegments: {
      type: Array as PropType<ApiSegment[]>,
      default: () => [],
    },
    fps: {
      type: Number,
      default: 25, // Standard FPS für Frame-zu-Zeit-Konvertierung
    },
  },
  emits: ['resize', 'seek', 'createSegment'],
  setup(props, { emit }) {
    const videoStore = useVideoStore();
    const timelineRef = ref<HTMLElement | null>(null);
    const timeMarkersRef = ref<HTMLElement | null>(null);
    const activeSegment = ref<Segment | null>(null);
    const isResizing = ref(false);
    const startX = ref(0);
    const initialEndTime = ref(0);
    const lastTimestamp = ref(0);

    // Hilfsfunktion: Frame-Nummer zu Zeit konvertieren
    function frameToTime(frameNumber: number): number {
      return frameNumber / props.fps;
    }


    const selectedSegmentId = ref<number | null>(null);

    const allSegments = computed(() => {
      return convertedSegments.value.length > 0
        ? convertedSegments.value
        : props.segments || [];
    });

    // Computed; Aktualisiere aktive Segmente bei Änderungen
    const selectedSegment = computed(() => {
      return allSegments.value.find((s) => s.id === selectedSegmentId.value) || null;
    });


    // Hilfsfunktion: Zeit zu Frame-Nummer konvertieren
    function timeToFrame(time: number): number {
      return Math.round(time * props.fps);
    }

    // Computed: API-Segmente zu Timeline-Segmente konvertieren
    const convertedSegments = computed<Segment[]>(() => {
      return props.apiSegments.map((apiSegment): Segment => ({
        id: apiSegment.id,
        video_id: apiSegment.video_id,
        label_id: apiSegment.label_id,
        startTime: frameToTime(apiSegment.start_frame_number),
        endTime: frameToTime(apiSegment.end_frame_number),
        start_frame_number: apiSegment.start_frame_number,
        end_frame_number: apiSegment.end_frame_number,
        label: `label_${apiSegment.label_id}`, // Fallback label
        label_display: `Label ${apiSegment.label_id}`, // Temporär, sollte durch echte Label-Namen ersetzt werden
        avgConfidence: 1, // Default value
      }));
    });

    // Computed: Cursor-Position basierend auf aktueller Zeit
    const cursorPosition = computed(() => {
      if (props.duration <= 0) return 0;
      return (props.currentTime / props.duration) * 100;
    });

    // Computed: Zeitmarkierungen für bessere Orientierung
    const timeMarkers = computed((): TimeMarker[] => {
      const markers: TimeMarker[] = [];
      const duration = props.duration;
      
      if (duration <= 0) return markers;
      
      // Bestimme Intervall basierend auf Videolänge
      let interval = 10; // Standard: 10 Sekunden
      if (duration <= 60) interval = 10;
      else if (duration <= 300) interval = 30;
      else if (duration <= 600) interval = 60;
      else interval = 120;
      
      for (let time = 0; time <= duration; time += interval) {
        markers.push({
          time,
          position: (time / duration) * 100,
        });
      }
      
      return markers;
    });

    // Computed: Organisiere Segmente nach Labels (updated für Store-Integration)
    const organizedSegments = computed<LabelGroup[]>(() => {
      // If a specific segment is selected, show only that segment
      if (videoStore.activeSegment) {
        const seg = videoStore.activeSegment;
        return [{
          labelName: seg.label_display,
          color: videoStore.getColorForLabel(seg.label),
          segments: [seg],
        }];
      }

      // Use segments from store (props.segments comes from store via parent component)
      const allSegments = props.segments || [];
      
      const labelGroups = new Map<string, LabelGroup>();
      
      allSegments.forEach((segment) => {
        // FIX: Use label_display first, then fallback to translated label, then raw label
        const labelName = segment.label_display || 
                         videoStore.getTranslationForLabel(segment.label) || 
                         segment.label || 
                         'Unbekanntes Label';
        
        if (!labelGroups.has(labelName)) {
          // FIX: Use segment.label (not segment.label_display) for color mapping
          const color = videoStore.getColorForLabel(segment.label || 'outside');
          labelGroups.set(labelName, {
            labelName,
            color,
            segments: [], // Initialize segments array
          });
        }
        
        labelGroups.get(labelName)!.segments.push(segment);
      });
      
      // Sortiere Segmente innerhalb jeder Gruppe nach Startzeit
      labelGroups.forEach(group => {
        group.segments.sort((a, b) => a.startTime - b.startTime);
      });
      
      return Array.from(labelGroups.values());
    });

    // Methoden
    function getSegmentStyle(segment: Segment, color: string) {
      const left = (segment.startTime / props.duration) * 100;
      const width = ((segment.endTime - segment.startTime) / props.duration) * 100;
      
      return {
        left: `${left}%`,
        width: `${Math.max(width, 0.5)}%`, // Mindestbreite für sichtbarkeit
        backgroundColor: color,
        borderColor: color,
      };
    }

    function formatTime(seconds: number): string {
      // Verwende Store-Funktion für konsistente Formatierung
      return videoStore.formatTime(seconds);
    }

    function formatDuration(seconds: number): string {
      if (seconds < 1) return '<1s';
      if (seconds < 60) return `${Math.round(seconds)}s`;
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }

    function onMouseMove(event: MouseEvent | TouchEvent) {
      const now = Date.now();
      if (now - lastTimestamp.value < 16) return; // Throttling
      lastTimestamp.value = now;
      
      if (!isResizing.value || !activeSegment.value || !timelineRef.value) return;
      
      const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const rect = timelineRef.value.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      const newEndTime = (percentage / 100) * props.duration;
      
      // Stelle sicher, dass End-Zeit nach Start-Zeit liegt
      const minEndTime = activeSegment.value.startTime + (1 / props.fps); // Minimum 1 Frame
      const clampedEndTime = Math.max(minEndTime, Math.min(newEndTime, props.duration));
      
      // Konvertiere zurück zu Frame-Nummer für API-Kompatibilität
      const newEndFrame = timeToFrame(clampedEndTime);
      
      // Update segment im Store - das ist bereits reaktiv!
      videoStore.updateSegment(activeSegment.value.id, {
        endTime: clampedEndTime,
        end_frame_number: newEndFrame,
      });
      
      // Emit mit sowohl Zeit als auch Frame-Nummer
      emit('resize', activeSegment.value.id, clampedEndTime, newEndFrame);
    }

    function onMouseUp() {
      isResizing.value = false;
      activeSegment.value = null;
      // Remove all possible event listeners
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousemove', onMouseMoveStart);
      document.removeEventListener('mousemove', onMouseMoveEnd);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchmove', onMouseMoveStart);
      document.removeEventListener('touchmove', onMouseMoveEnd);
      document.removeEventListener('touchend', onMouseUp);
    }

    function startResize(segment: Segment, event: MouseEvent | TouchEvent) {
      event.stopPropagation();
      isResizing.value = true;
      activeSegment.value = segment;
      initialEndTime.value = segment.endTime;
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onMouseMove);
      document.addEventListener('touchend', onMouseUp);
    }

    function startStartResize(segment: Segment, event: MouseEvent | TouchEvent) {
      event.stopPropagation();
      isResizing.value = true;
      activeSegment.value = segment;
      initialEndTime.value = segment.startTime;
      
      document.addEventListener('mousemove', onMouseMoveStart);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onMouseMoveStart);
      document.addEventListener('touchend', onMouseUp);
    }

    function startEndResize(segment: Segment, event: MouseEvent | TouchEvent) {
      event.stopPropagation();
      isResizing.value = true;
      activeSegment.value = segment;
      initialEndTime.value = segment.endTime;
      
      document.addEventListener('mousemove', onMouseMoveEnd);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onMouseMoveEnd);
      document.addEventListener('touchend', onMouseUp);
    }

    function onMouseMoveStart(event: MouseEvent | TouchEvent) {
      const now = Date.now();
      if (now - lastTimestamp.value < 16) return; // Throttling
      lastTimestamp.value = now;
      
      if (!isResizing.value || !activeSegment.value || !timelineRef.value) return;
      
      const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const rect = timelineRef.value.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      const newStartTime = (percentage / 100) * props.duration;
      
      // Stelle sicher, dass Start-Zeit vor End-Zeit liegt
      const maxStartTime = activeSegment.value.endTime - (1 / props.fps); // Maximum 1 Frame vor Endzeit
      const clampedStartTime = Math.max(0, Math.min(newStartTime, maxStartTime));
      
      // Konvertiere zurück zu Frame-Nummer für API-Kompatibilität
      const newStartFrame = timeToFrame(clampedStartTime);
      
      // Update segment im Store - das ist bereits reaktiv!
      videoStore.updateSegment(activeSegment.value.id, {
        startTime: clampedStartTime,
        start_frame_number: newStartFrame,
      });
      
      // Emit mit sowohl Zeit als auch Frame-Nummer und Start-Flag
      emit('resize', activeSegment.value.id, clampedStartTime, newStartFrame, true);
    }

    function onMouseMoveEnd(event: MouseEvent | TouchEvent) {
      const now = Date.now();
      if (now - lastTimestamp.value < 16) return; // Throttling
      lastTimestamp.value = now;
      
      if (!isResizing.value || !activeSegment.value || !timelineRef.value) return;
      
      const clientX = 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const rect = timelineRef.value.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      const newEndTime = (percentage / 100) * props.duration;
      
      // Stelle sicher, dass End-Zeit nach Start-Zeit liegt
      const minEndTime = activeSegment.value.startTime + (1 / props.fps); // Minimum 1 Frame
      const clampedEndTime = Math.max(minEndTime, Math.min(newEndTime, props.duration));
      
      // Konvertiere zurück zu Frame-Nummer für API-Kompatibilität
      const newEndFrame = timeToFrame(clampedEndTime);
      
      // Update segment im Store - das ist bereits reaktiv!
      videoStore.updateSegment(activeSegment.value.id, {
        endTime: clampedEndTime,
        end_frame_number: newEndFrame,
      });
      
      // Emit mit sowohl Zeit als auch Frame-Nummer und End-Flag
      emit('resize', activeSegment.value.id, clampedEndTime, newEndFrame, false);
    }

    function onMouseUp() {
      isResizing.value = false;
      activeSegment.value = null;
      // Remove all possible event listeners
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousemove', onMouseMoveStart);
      document.removeEventListener('mousemove', onMouseMoveEnd);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchmove', onMouseMoveStart);
      document.removeEventListener('touchmove', onMouseMoveEnd);
      document.removeEventListener('touchend', onMouseUp);
    }

    function handleTimelineClick(event: MouseEvent) {
      if (isResizing.value || !timelineRef.value) return;
      
      const rect = timelineRef.value.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const percentage = (offsetX / rect.width) * 100;
      const targetTime = (percentage / 100) * props.duration;
      const targetFrame = timeToFrame(targetTime);
      
      // Prüfe, ob Shift gedrückt ist für neues Segment
      if (event.shiftKey) {
        emit('createSegment', targetTime, targetFrame);
      } else {
        emit('seek', targetTime);
      }
    }

    function jumpToSegment(segment: Segment) {
      // Verwende Store-Funktion für konsistente Navigation
      const jumpTime = segment.startTime + (segment.endTime - segment.startTime) * 0.1; // 10% ins Segment
      emit('seek', jumpTime);
      
      // Optional: Markiere aktives Segment im Store
      videoStore.setActiveSegment(segment.id);
    }

    onUnmounted(() => {
      // Remove all possible event listeners
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousemove', onMouseMoveStart);
      document.removeEventListener('mousemove', onMouseMoveEnd);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchmove', onMouseMoveStart);
      document.removeEventListener('touchmove', onMouseMoveEnd);
      document.removeEventListener('touchend', onMouseUp);
    });

    return {
      timelineRef,
      timeMarkersRef,
      organizedSegments,
      timeMarkers,
      cursorPosition,
      currentTime: computed(() => props.currentTime),
      selectedSegmentId,
      allSegments,
      selectedSegment,
      startStartResize,
      startEndResize,
      handleTimelineClick,
      jumpToSegment,
      getSegmentStyle,
      formatTime,
      formatDuration,
    };
  },
});
</script>

<style scoped>
.timeline-container {
  position: relative;
  width: 100%;
  background: #ffffff;
  border: 1px solid #e0e6ed;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Timeline Header */
.timeline-header {
  position: relative;
  height: 40px;
  background: linear-gradient(135deg, #f8f9fc 0%, #f1f3f8 100%);
  border-bottom: 1px solid #e0e6ed;
}

.time-markers {
  position: relative;
  height: 100%;
  width: 100%;
}

.time-marker {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: 1;
}

.time-label {
  position: absolute;
  top: 8px;
  left: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.marker-line {
  width: 1px;
  height: 100%;
  background: linear-gradient(to bottom, #cbd5e1 0%, transparent 100%);
}

/* Video-Zeitcursor */
.timeline-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 10;
  pointer-events: none;
  transform: translateX(-50%);
}

.cursor-line {
  width: 2px;
  height: 100%;
  background: linear-gradient(to bottom, #ef4444 0%, #dc2626 100%);
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
}

.cursor-handle {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: #ef4444;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Segment Selection Dropdown */
.segment-selector {
  position: absolute;
  top: 8px;
  right: 16px;
  z-index: 20;
}

.form-select {
  appearance: none;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: border-color 0.2s ease;
  min-width: 200px;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-select:hover {
  border-color: #9ca3af;
}

/* Timeline Tracks */
.timeline-tracks {
  position: relative;
  min-height: 200px;
}

.timeline-track {
  position: relative;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;
}

.timeline-track:hover {
  background-color: #f8fafc;
}

.timeline-track:last-child {
  border-bottom: none;
}

/* Track Header */
.track-header {
  display: flex;
  align-items: center;
  padding: 12px 16px 8px 16px;
  background: #fafbfc;
  border-bottom: 1px solid #f1f5f9;
  gap: 8px;
}

.label-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.track-label {
  font-weight: 600;
  color: #334155;
  font-size: 13px;
}

.segment-count {
  font-size: 11px;
  color: #64748b;
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 8px;
}

/* Track Content */
.track-content {
  position: relative;
  height: 48px;
  padding: 8px 16px;
}

/* Timeline Segmente */
.timeline-segment {
  position: absolute;
  top: 8px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid rgba(255, 255, 255, 0.9);
  min-width: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  font-size: 11px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.timeline-segment:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 1);
  z-index: 5;
}

.segment-content {
  display: flex;
  flex-direction: column;
  padding: 2px 8px;
  flex: 1;
  min-width: 0;
}

.segment-time {
  font-size: 10px;
  opacity: 0.9;
  line-height: 1;
}

.segment-duration {
  font-size: 9px;
  opacity: 0.7;
  line-height: 1;
}

/* Resize Handle */
.start-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  cursor: ew-resize;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 100%);
  border-radius: 4px 0 0 4px;
  transition: all 0.2s ease;
}

.start-resize-handle:hover {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 100%);
  width: 16px;
}

.start-resize-handle::after {
  content: '⋮';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1;
}

.end-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  cursor: ew-resize;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 100%);
  border-radius: 0 4px 4px 0;
  transition: all 0.2s ease;
}

.end-resize-handle:hover {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.6) 100%);
  width: 16px;
}

.end-resize-handle::after {
  content: '⋮';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1;
}

/* Empty State */
.empty-timeline {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.empty-timeline .material-icons {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-timeline p {
  margin: 0 0 8px 0;
  font-weight: 500;
}

.empty-timeline small {
  font-size: 12px;
  opacity: 0.7;
}

/* Responsive Design */
@media (max-width: 768px) {
  .track-header {
    padding: 8px 12px 6px 12px;
  }
  
  .track-content {
    padding: 6px 12px;
  }
  
  .time-label {
    font-size: 10px;
    padding: 1px 4px;
  }
  
  .cursor-handle {
    font-size: 9px;
    padding: 1px 6px;
  }
}
</style>
