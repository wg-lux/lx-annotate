<template>
    <div class="container-fluid py-4">
    <main class="main-content border-radius-lg">
    <div id="app" class="container-fluid py-4">
      <div v-if="videoUrl" class="video-player">
        <video controls :src="videoUrl" style="max-width: 600px;"></video>
      </div>
      <div class = "row">
        <div v-if="segments.length" class="segment-table table-responsive">
            <h3>Unannotierte Videos</h3>
            <table class="table table-bordered table-striped">
            <thead>
                <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Zugewiesener Benutzer</th>
                <th>Anonymisierung</th>
                <th>Annotationen</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="video in videos" :key="video.id" style="cursor: pointer;">
                <td>{{ video.id }}</td>
                <td>{{ video.original_file_name }}</td>
                <td>{{ video.status }}</td>
                <td>{{ video.assignedUser || 'Nicht zugewiesen' }}</td>
                <td>{{ video.anonymized ? 'Ja' : 'Nein' }}</td>
                <td>{{ segments.length }}</td>
                </tr>
            </tbody>
            </table>
        </div>
     </div>
    </div>
    </main>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useVideoStore } from '@/stores/videoStore';
  import type { Segment } from '@/stores/videoStore';
  import type { VideoMeta } from '@/stores/videoStore';
  
  const videoStore = useVideoStore();
  const { videoUrl, fetchVideoUrl, fetchAllSegments, allSegments } = videoStore;
  const segments = ref<Segment[]>([]);
  const videos = ref<VideoMeta[]>([]);


  
  onMounted(async () => {
    // Fetch the video URL and segments when the dashboard loads
    await fetchVideoUrl();
    // Assuming a current video is set; otherwise default to id '1'
    await fetchAllSegments(videoStore.currentVideo?.id || '1');
    segments.value = allSegments;
  });
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function jumpTo(segment: any) {
    // Optionally, you could emit an event or interact with the video component directly.
    // For example, if your dashboard includes the video player, you could update its currentTime.
    console.log(`Jumping to segment starting at ${segment.startTime}`);
  }
  </script>
  
  <style scoped>
  .dashboard {
    padding: 1rem;
  }
  
  .video-player {
    margin-bottom: 1rem;
  }
  
  .segment-table table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .segment-table th,
  .segment-table td {
    padding: 0.5rem;
    border: 1px solid #ddd;
  }
  </style>
