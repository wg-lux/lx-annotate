<template>
  <div class="timeline-track" ref="timelineRef" @click="handleTimelineClick">
    <div
      v-for="segment in allSegments"
      :key="segment.id"
      class="timeline-segment"
      :style="getSegmentStyle(segment, duration)"
    >
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
  emits: ['resize'],
  setup(props, { emit }) {
    const videoStore = useVideoStore();
    const timelineRef = ref<HTMLElement | null>(null);
    const activeSegment = ref<Segment | null>(null);
    const isResizing = ref(false);
    const startX = ref(0);
    const initialWidthPercent = ref(0);
    const lastTimestamp = ref(0);

    const allSegments = computed<Segment[]>(() => videoStore.allSegments); 

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
      // Implementation as needed...
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
      getSegmentStyle: videoStore.getSegmentStyle,
      duration: props.duration,
    };
  },
});
</script>

<style scoped>
.timeline-track {
  position: relative;
  width: 100%;
  height: 50px; /* Adjust as needed */
  background-color: #f0f0f0;
}

.timeline-segment {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 123, 255, 0.3);
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background-color: rgba(0, 123, 255, 0.7);
}
</style>
