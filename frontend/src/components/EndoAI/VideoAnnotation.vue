<template>
  <div class="video-annotation-container">
    <!-- Video Selection Dropdown -->
    <div class="mb-3">
      <label class="form-label">Video auswählen:</label>
      <select v-model.number="selectedVideoId" @change="onVideoChange" class="form-select" :disabled="!hasVideos">
        <option :value="null">{{ hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar' }}</option>
        <option v-for="video in videoStore.videoList.videos" :key="video.id" :value="video.id">
          {{ video.originalFileName || 'Unbekannt' }} - {{ video.status || 'Unbekannt' }}
        </option>
      </select>
      <small v-if="!hasVideos" class="text-muted">
        Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.
      </small>
    </div>

    <!-- No Video Selected State -->
    <div v-if="!currentVideoStreamUrl && hasVideos" class="text-center text-muted py-5">
      <i class="material-icons" style="font-size: 48px;">movie</i>
      <p class="mt-2">Video auswählen, um mit der Annotation zu beginnen</p>
    </div>

    <!-- No Videos Available State -->
    <div v-if="!hasVideos" class="text-center text-muted py-5">
      <i class="material-icons" style="font-size: 48px;">video_library</i>
      <p class="mt-2">Keine Videos verfügbar</p>
      <small>Videos können über das Dashboard hochgeladen werden.</small>
    </div>

    <!-- Video Player -->
    <video 
      v-if="currentVideoStreamUrl" 
      ref="videoRef" 
      :src="currentVideoStreamUrl" 
      controls 
      class="video-player"
      @loadedmetadata="onVideoLoaded"
      @timeupdate="handleTimeUpdate"
    >
      Ihr Browser unterstützt das Video-Element nicht.
    </video>

    <!-- Timeline Component Integration -->
    <Timeline
      v-if="duration > 0"
      :segments="allSegments"
      :duration="duration"
      :currentTime="currentTime"
      @resize="handleSegmentResize"
      @seek="handleTimelineSeek"
    />

    <!-- Video Controls -->
    <div v-if="currentVideoStreamUrl" class="video-controls mt-3">
      <span class="text-muted">
        Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </span>
    </div>
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
    const selectedVideoId = ref<number | null>(null);
    const currentTime = ref(0);
    const duration = ref(0);
    const videoRef = ref<HTMLVideoElement | null>(null);

    // Computed properties
    const hasVideos = computed(() => 
      videoStore.videoList.videos && videoStore.videoList.videos.length > 0
    );

    const currentVideoStreamUrl = computed(() => {
      if (selectedVideoId.value === null) return '';
      return videoStore.urlFor(selectedVideoId.value);
    });

    const allSegments = computed(() => videoStore.allSegments);

    // Methods
    function onVideoChange() {
      if (selectedVideoId.value !== null) {
        // Load video metadata and segments
        videoStore.fetchVideoMeta(selectedVideoId.value);
        videoStore.fetchAllSegments(selectedVideoId.value.toString());
      }
    }

    function onVideoLoaded() {
      if (videoRef.value) {
        duration.value = videoRef.value.duration;
      }
    }

    function handleTimeUpdate() {
      if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
      }
    }

    function handleSegmentResize(id: string, newEnd: number) {
      console.log(`Segment ${id} resized to end at ${newEnd}`);
      videoStore.updateSegment(id, { endTime: newEnd });
    }

    function handleTimelineSeek(time: number) {
      if (videoRef.value) {
        videoRef.value.currentTime = time;
      }
    }

    function formatTime(seconds: number): string {
      if (Number.isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
      
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    onMounted(() => {
      videoStore.fetchAllVideos();
    });
    
    return {
      videoStore,
      selectedVideoId,
      currentTime,
      duration,
      videoRef,
      hasVideos,
      currentVideoStreamUrl,
      allSegments,
      onVideoChange,
      onVideoLoaded,
      handleTimeUpdate,
      handleSegmentResize,
      handleTimelineSeek,
      formatTime,
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
  border-radius: 8px;
}

.video-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.form-select {
  max-width: 100%;
}

.text-center {
  text-align: center;
}

.text-muted {
  color: #6c757d;
}

.material-icons {
  font-family: 'Material Icons';
}
</style>
