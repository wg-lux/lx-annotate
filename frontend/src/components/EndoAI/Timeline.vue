<template>
  <div class="timeline-track" ref="timelineRef" @click="handleTimelineClick">
    <div
      v-for="segment in allSegments"
      :key="segment.id"
      class="timeline-segment"
      :style="getEnhancedSegmentStyle(segment)"
      @click.stop="jumpToSegment(segment)"
      :title="`${segment.label_display}: ${segment.startTime.toFixed(1)}s - ${segment.endTime.toFixed(1)}s`"
    >
      <!-- Label text inside segment -->
      <span class="segment-label">{{ segment.label_display }}</span>
      
      <!-- Resize-handle on right edge -->
      <div
        class="resize-handle"
        @mousedown="startResize(segment, $event)"
        @touchstart.prevent="startResize(segment, $event)"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted, computed } from 'vue';
import type { Segment } from '@/stores/videoStore';
import { useVideoStore } from '@/stores/videoStore';

export default defineComponent({
  name: 'Timeline',
  props: {
    duration: {
      type: Number,
      required: true,
    },
  },
  emits: ['resize', 'seek'],
  setup(props, { emit }) {
    const videoStore = useVideoStore();
    const timelineRef = ref<HTMLElement | null>(null);
    const activeSegment = ref<Segment | null>(null);
    const isResizing = ref(false);
    const startX = ref(0);
    const initialWidthPercent = ref(0);
    const lastTimestamp = ref(0);

    const allSegments = computed<Segment[]>(() => {
      const segments = videoStore.allSegments;
      // Sort segments by start time for proper layering
      return segments.sort((a, b) => a.startTime - b.startTime);
    });

    // Calculate vertical positioning to avoid overlaps
    const getSegmentVerticalPosition = (segment: Segment, allSegs: Segment[]) => {
      const currentIndex = allSegs.findIndex(s => s.id === segment.id);
      const segmentsBefore = allSegs.slice(0, currentIndex);
      
      // Find segments that overlap with current segment
      const overlappingSegments = segmentsBefore.filter(s => 
        (s.startTime < segment.endTime && s.endTime > segment.startTime)
      );
      
      // Calculate row based on overlaps (max 3 rows)
      const row = overlappingSegments.length % 3;
      return row * 28; // 28px per row (24px height + 4px gap)
    };

    function calculateWidthPercent(segment: Segment): number {
      const w = (segment.endTime - segment.startTime) / props.duration * 100;
      return w;
    }

    function onMouseMove(event: MouseEvent | TouchEvent) {
      const now = Date.now();
      if (now - lastTimestamp.value < 16) return;
      lastTimestamp.value = now;
      if (!isResizing.value || !activeSegment.value) return;
      const clientX =
        'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      const delta = clientX - startX.value;
      // Calculate new width in percent using the delta and timeline width:
      const timelineWidth = timelineRef.value?.clientWidth || 1;
      const deltaPercent = (delta / timelineWidth) * 100;
      const newWidthPercent = initialWidthPercent.value + deltaPercent;
      // Update using store action (or directly updating the segment)
      videoStore.updateSegment(activeSegment.value.id, {
        endTime: activeSegment.value.startTime + (newWidthPercent * props.duration) / 100,
      });
      emit('resize', activeSegment.value.id, activeSegment.value.endTime);
    }

    function onMouseUp() {
      isResizing.value = false;
      activeSegment.value = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    }

    function startResize(segment: Segment, event: MouseEvent | TouchEvent) {
      isResizing.value = true;
      activeSegment.value = segment;
      const clientX =
        'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX;
      startX.value = clientX;
      initialWidthPercent.value = calculateWidthPercent(segment);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    }

    // Optional: handle timeline click
    function handleTimelineClick(event: MouseEvent) {
      if (!timelineRef.value) return;
      
      const rect = timelineRef.value.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const percentX = (offsetX / rect.width) * 100;
      const targetTime = (percentX / 100) * props.duration;
      
      // Emit event to parent component to seek video
      emit('seek', targetTime);
    }

    function jumpToSegment(segment: Segment) {
      // Calculate the middle point of the segment for seeking
      const middlePoint = (segment.startTime + segment.endTime) / 2;
      emit('seek', middlePoint);
    }

    onUnmounted(() => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    });

    return {
      timelineRef,
      allSegments,
      startResize,
      handleTimelineClick,
      jumpToSegment,
      getEnhancedSegmentStyle: videoStore.getEnhancedSegmentStyle,
      duration: props.duration,
      getSegmentVerticalPosition,
    };
  },
});
</script>

<style scoped>
.timeline-track {
  position: relative;
  width: 100%;
  height: 120px; /* Increased height for 3 rows: 3 * 28px + 36px padding */
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin: 12px 0;
  overflow: hidden; /* Changed from visible to hidden to prevent overflow */
  isolation: isolate; /* Create a new stacking context */
}

.timeline-segment {
  position: absolute;
  height: 24px; /* Reduced height for better spacing */
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.8);
  min-width: 20px; /* Increased minimum width for better visibility */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  z-index: 1; /* Reduced from higher values */
}

.timeline-segment:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 2; /* Reduced from 20 to prevent overlap with other elements */
  border-color: white;
}

/* Label text inside segment */
.segment-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 14px;
  cursor: ew-resize;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 1) 100%);
  border-radius: 0 6px 6px 0;
  transition: all 0.2s ease;
  z-index: 2;
}

.resize-handle:hover {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 1) 30%, rgba(255, 255, 255, 1) 100%);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
}

.resize-handle::after {
  content: '⋮⋮';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 8px;
  color: #666;
  line-height: 0.8;
  letter-spacing: -1px;
}

/* Grid lines for better visual orientation */
.timeline-track::before {
  content: '';
  position: absolute;
  top: 56px;
  left: 8px;
  right: 8px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #ddd 20%, #ddd 80%, transparent 100%);
}
</style>
