<template>
  <div class="video-annotation-container">
    <!-- existing video annotation UI -->
    <video ref="videoRef" :src="videoUrl" controls class="video-player"></video>
    <!-- Timeline Component Integration -->
    <Timeline
      :segments="allSegments"
      :duration="duration"
      @resize="handleSegmentResize"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import Timeline from './Timeline.vue';

export default defineComponent({
  name: 'VideoAnnotation',
  components: { Timeline },
  setup() {
    const videoStore = useVideoStore();

    const videoUrl = computed(() => videoStore.videoUrl);
    const duration = computed(() => videoStore.duration);
    const allSegments = computed(() => videoStore.allSegments); // Fix: Use `value` instead of `values`
    const videoRef = ref<HTMLVideoElement | null>(null);

    function handleSegmentResize(id: string, newEnd: number) {
      console.log(`Segment ${id} resized to end at ${newEnd}`);
      // Optionally persist/update via store or API call here
    }
    onMounted(() => {
      videoStore.fetchAllVideos();
      videoStore.fetchVideoUrl();
    });
    return {
      videoUrl,
      duration,
      allSegments,
      videoRef,
      handleSegmentResize,
    };

  },
});
</script>

<style scoped>
.video-annotation-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.video-player {
  width: 100%;
  max-height: 400px;
  background-color: black;
}
</style>
