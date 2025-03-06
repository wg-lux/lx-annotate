<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <!-- Header: Title -->
    <div class="card-header pb-0">
      <h4 class="mb-0">Video :: Annotation</h4>
    </div>

    <!-- Body: Video and Timeline/Table -->
    <div class="card-body">
      <!-- Video Player -->
      <div class="video-container mb-4 position-relative">
        <video 
          ref="videoRef"
          @timeupdate="handleTimeUpdate"
          @loadedmetadata="handleLoadedMetadata"
          @error="handleVideoError"
          controls
          class="w-100"
          v-if="videoUrl"
          :src="videoUrl">
        </video>
        <p v-else>Loading video...</p>
      </div>
        <!-- Classification Label (Dynamically appears for the correct duration) -->
      <div 
        v-if="currentClassification"
        class="classification-label"
        :style="getClassificationStyle()"
      >
        {{ currentClassification.label }} ({{ (currentClassification.avgConfidence * 100).toFixed(1) }}%)
      </div>

      <!-- Loop through segments dynamically -->
      <div v-for="segment in segments" :key="segment.id" @click="jumpTo(segment)" class="table-responsive" style="cursor: pointer;">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th class="custom-segments">{{ segment.label_display }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td :style="{ width: calculateLeftPercent(segment) + '%' }"></td>
              <td :style="{ width: calculateWidthPercent(segment) + '%', backgroundColor: getColorForLabel(segment.label), color: '#fff' }">
                {{ (segment.avgConfidence * 100).toFixed(1) }}%
              </td>
              <td :style="{ width: calculateRightPercent(segment) + '%' }"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Segmente des Videos</h2>
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
            <!-- Loop through segments from backend -->
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
import { ref, onMounted, computed } from 'vue';
import type { Segment } from '@/components/EndoAI/segments';
import { getColorForLabel, jumpToSegment as utilJumpToSegment } from '@/components/EndoAI/segments';
import axios, { AxiosError } from 'axios';

//  Declare missing variables properly
const videoUrl = ref<string>('');
const videoRef = ref<HTMLVideoElement | null>(null);
const timelineRef = ref<HTMLElement | null>(null); //  
const currentTime = ref<number>(0);
const duration = ref<number>(100);
const canSave = ref<boolean>(true); //  Add missing canSave ref
const segments = ref<Segment[]>([]); //  Declare segments properly
const classificationData = ref<{ label: string; start_time: number; end_time: number; confidence: number } | null>(null);

//  Handle Video Errors
function handleVideoError(event: Event) {
  console.error("Error loading the video:", event);
  alert("Failed to load video. Please check the source URL.");
}

//  Fetch Video from Django API


// Updated function to fetch video and segment data from backend
async function fetchVideoUrl() {
  try {
    const response = await axios.get('http://127.0.0.1:8000/api/video/1/', {
      headers: { 'Accept': 'application/json' }
    });

    if (response.data.video_url) {
      videoUrl.value = response.data.video_url;
      console.log("Fetched video URL:", videoUrl.value);
    } else {
      console.error("Invalid video response:", response.data);
    }

    if (response.data.classification_data) {
      // Loop through classification_data from backend and update segments array
      segments.value = response.data.classification_data.map((classification: { 
        label: string; 
        start_time: number; 
        end_time: number; 
        confidence: number 
      }, index: number) => ({
        id: `segment${index + 1}`, // Unique ID
        label: classification.label,
        label_display: classification.label, // Modify if needed for translations
        startTime: classification.start_time,
        endTime: classification.end_time,
        avgConfidence: classification.confidence
      }));

    }

  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("Error loading video:", axiosError.response?.data || axiosError.message);
  }
}

// Call the function on component mount
onMounted(fetchVideoUrl);


//  Track Current Classification Based on Video Time
const currentClassification = computed(() => {
  return segments.value.find(segment => 
    currentTime.value >= segment.startTime && 
    currentTime.value <= segment.endTime
  ) || null; // Returns null if no matching segment is found
});



function handleTimeUpdate() {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
  }
}

// Helper Functions
function calculateLeftPercent(segment: Segment): number {
  return (segment.startTime / duration.value) * 100;
}
function calculateWidthPercent(segment: Segment): number {
  return ((segment.endTime - segment.startTime) / duration.value) * 100;
}
function calculateRightPercent(segment: Segment): number {
  return 100 - calculateLeftPercent(segment) - calculateWidthPercent(segment);
}

function handleLoadedMetadata() {
  if (videoRef.value) {
    duration.value = videoRef.value.duration;
  }
}
function jumpTo(segment: Segment) {
  if (videoRef.value) {
    videoRef.value.currentTime = segment.startTime;
  }
}

function handleTimelineClick(event: MouseEvent) {
  if (timelineRef.value && videoRef.value) {
    const rect = timelineRef.value.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const percentage = clickPosition / rect.width;
    videoRef.value.currentTime = percentage * duration.value;
  }
}
async function saveAnnotations() {
  try {
    const response = await axios.post('http://127.0.0.1:8000/api/annotations/', {
      segments: segments.value,
    });
    console.log('Annotations saved:', response.data);
  } catch (error) {
    console.error('Error saving annotations:', error);
  }
}
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

import type { CSSProperties } from 'vue';

function getClassificationStyle(): CSSProperties {
  return {
    backgroundColor: "Green", /* Standard background color */
    color: "white",
    fontSize: "20px",
    fontWeight: "bold",
    padding: "12px",
    borderRadius: "6px",
    textTransform: "uppercase",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
    width: "100%", /* Ensure it spans the full width below the video */
  };
}






//  Load video & segments on component mount

</script>

<style scoped>
::v-deep(.classification-overlay) {
  position: absolute;
  top: 10px;
  left: 10px;
  background: darkgreen;
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-size: 18px;
  font-weight: bold;
  text-transform: uppercase;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.3);
}

</style>

