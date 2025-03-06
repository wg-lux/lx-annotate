<template>
    <div class="container-fluid h-100 w-100 py-1 px-4">
      <!-- Header: Title -->
      <div class="card-header pb-0">
        <h4 class="mb-0">Video Annotation</h4>
      </div>
  
      <!-- Body: Video and Timeline/Table -->
      <div class="card-body">
        <!-- Video Player -->
        <div class="video-container mb-4">
          <video 
            ref="videoRef"
            @timeupdate="handleTimeUpdate"
            @loadedmetadata="handleLoadedMetadata"
            controls
            class="w-100"
            :src="staticUrl + 'video.mp4'">
          </video>
        </div>
  
        <!-- (Optional) Timeline for scrubbing -->
        <div class="timeline-container mb-4">
          <div class="timeline-track" ref="timelineRef" @click="handleTimelineClick">
            <!-- Progress Bar for current playback -->
            <div class="progress-bar" :style="{ width: `${(currentTime / duration) * 100}%` }"></div>
          </div>
        </div>
        
        <div class="table-responsive" v-for="segment in segments" :key="segment.id" @click="jumpTo(segment)" style="cursor: pointer;">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th class="custom-segments">{{segment.label_display}}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td :style="{ width: calculateLeftPercent(segment) + '%' }"></td>
                <td :style="{ width: calculateWidthPercent(segment) + '%', backgroundColor: getColorForLabel(segment.label), color: '#fff' }">
                {{ segment.avgConfidence }}
                </td>
                <td :style="{ width: calculateRightPercent(segment) + '%' }"></td>

              </tr>
            </tbody>
          </table>
        </div>

        <h2>Segmente des Videos</h2>
        <!-- Table view of Segmentation Segments -->
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>Label</th>
                <th>Startzeit</th>
                <th>Endzeit</th>
                <th>Sicherheit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="segment in segments" :key="segment.id" @click="jumpTo(segment)" style="cursor: pointer;">
                <td :style="{ backgroundColor: getColorForLabel(segment.label), color: '#fff' }">{{ segment.label_display }}</td>
                <td>{{ formatTime(segment.startTime) }}</td>
                <td>{{ formatTime(segment.endTime) }}</td>
                <td>{{ (segment.avgConfidence * 100).toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <!-- Save Button -->
        <div class="controls mt-4">
          <button @click="saveAnnotations" class="btn btn-success" :disabled="!canSave">
            Save Annotations
          </button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import type { Segment } from '@/components/EndoAI/segments';
  import { getColorForLabel, jumpToSegment as utilJumpToSegment } from '@/components/EndoAI/segments';
  import axios from 'axios';
  
  const staticUrl = (window as any).STATIC_URL || '/static/';
  const videoRef = ref<HTMLVideoElement | null>(null);
  const timelineRef = ref<HTMLElement | null>(null);
  const segments = ref<Segment[]>([]);
  const currentTime = ref(0);
  const duration = ref(100); // Will be updated when video loads
  const labelsList = ref([
    "appendix",
    "blood",
    "diverticule",
    "grasper",
    "ileocaecalvalve",
    "ileum",
    "low_quality",
    "nbi",
    "needle",
    "outside",
    "polyp",
    "snare",
    "water_jet",
    "wound",
  ]);
  const canSave = ref(false);

  function calculateLeftPercent(segment: Segment): number {
  return (segment.startTime / duration.value) * 100;
}
function calculateWidthPercent(segment: Segment): number {
return ((segment.endTime - segment.startTime) / duration.value) * 100;
}
function calculateRightPercent(segment: Segment): number {
return 100 - calculateLeftPercent(segment) - calculateWidthPercent(segment);
}


  
  function handleTimeUpdate() {
    if (videoRef.value) {
      currentTime.value = videoRef.value.currentTime;
      duration.value = videoRef.value.duration;
    }
  }
  
  function handleLoadedMetadata() {
    if (videoRef.value) {
      duration.value = videoRef.value.duration;
    }
  }
  
  function jumpTo(segment: Segment) {
    utilJumpToSegment(segment, videoRef.value);
  }
  
  function handleTimelineClick(event: MouseEvent) {
    if (timelineRef.value && videoRef.value) {
      const rect = timelineRef.value.getBoundingClientRect();
      const clickPosition = event.clientX - rect.left;
      const percentage = clickPosition / rect.width;
      videoRef.value.currentTime = percentage * duration.value;
    }
  }
  
  function saveAnnotations() {
    axios.post('http://127.0.0.1:8000/api/annotations/', {
      segments: segments.value,
    })
    .then(response => {
      console.log('Annotations saved:', response.data);
    })
    .catch(error => {
      console.error('Error saving annotations:', error);
    });
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  onMounted(() => {
    // For demo purposes, set some sample segments:
    segments.value = [
      {
        id: 'segment1',
        label: 'outside',
        label_display: 'Außerhalb',
        startTime: 0,
        endTime: 20,
        avgConfidence: 0.85,
      },
      {
        id: 'segment2',
        label: 'blood',
        label_display: 'Blut',
        startTime: 25,
        endTime: 35,
        avgConfidence: 0.9,
      },
      {
        id: 'segment3',
        label: 'needle',
        label_display: 'Nadel',
        startTime: 40,
        endTime: 45,
        avgConfidence: 0.7,
      },
      {
        id: 'segment4',
        label: 'polyp',
        label_display: 'Kolonpolyp',
        startTime: 90,
        endTime: 100,
        avgConfidence: 0.7,
      },
    ];
  });
  </script>
  
  <style scoped>
  .timeline-container {
    position: relative;
    height: 40px;
    margin: 20px 0;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 5px;
  }
  
  /* The timeline-track is still used for scrubbing */
  .timeline-track {
    position: relative;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  
  /* We no longer use absolute positioning for segments in the table view */
  .table-responsive {
    margin-top: 1rem;
  }
  
  .custom-segments {
  width: auto !important;
  background-color: black;
    color: white;
}

table td {
  border: black;
}
  .legend {
    font-size: 0.875rem;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
  }
  
  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 5px;
    border: 1px solid #ccc;
  }
  </style>
  