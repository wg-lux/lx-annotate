<template>
  <div class="container-fluid h-100 w-100 py-1 px-4">
    <!-- Header: Title -->
    <div class="card-header pb-0">
      <h1 class="mb-0">Video Annotation</h1>
    </div>
    <div class="container-fluid py-4">
      <!-- Dropdown to select and edit a segment -->
      <div v-if=videoUrl class="dropdown-container mb-3">
        <label for="segmentSelect">Segment auswählen: </label>
        <select id="segmentSelect" v-model="selectedSegment">
          <option v-for="segment in allSegments" :key="segment.id" :value="segment">
            {{ segment.label_display }} ({{ formatTime(segment.startTime) }} - {{ formatTime(segment.endTime) }})
          </option>
        </select>
        <div v-if="selectedSegment" class="segment-editor">
          <label>
            Start Time:
            <input type="number" v-model.number="selectedSegment.startTime" step="0.1" />
          </label>
          <label>
            End Time:
            <input type="number" v-model.number="selectedSegment.endTime" step="0.1" />
          </label>
          <!-- Save the edited segment locally -->
          <button @click="updateSegmentState">Zeiten lokal speichern</button>
        </div>
      </div>
      <div class="container-fluid py-4">
      <!-- Dropdown to select and edit a video -->
      <div class="dropdown-container mb-3">
        <label for="videoSelect">Video auswählen: </label>
        <select id="videoSelect" v-model="selectedVideo">
          <option
            v-for="video in videoList.videos"
            :key="video.id"
            :value="video">
            {{ video.original_file_name }}
          </option>
        </select>
      </div>
    </div>
    <div class="container-fluid py-4">
      <!-- Video Player or Uploader -->
      <div class="video-container mb-4 position-relative">
        <video 
          ref="videoRef"
          v-if="videoUrl"
          @timeupdate="handleTimeUpdate"
          @loadedmetadata="handleLoadedMetadata"
          controls
          style="max-width: 600px; width: 100%;"
          :src="videoUrl">
        </video>
        <div v-else>
          <FilePond
            ref="pond"
            :allowMultiple="false"
            acceptedFileTypes="['video/*']"
            labelIdle="Drag & Drop your video or <span class='filepond--label-action'>Browse</span>"
            :server="{
              process: uploadProcess,
              revert: uploadRevert
            }"
            @processfile="handleProcessFile"
          />
        </div>
        <div class="container-fluid py-4">
          <p v-if="errorMessage">{{ errorMessage }}</p>
        </div> 
      </div>
    </div>
  </div>

    <!-- Classification Label -->
    <div class="container-fluid py-4">
      <div 
        v-if="currentClassification"
        class="classification-label"
        :style="getClassificationStyle()"
      >
        {{ currentClassification.label }} ({{ (currentClassification.avgConfidence * 100).toFixed(1) }}%)
      </div>
    </div>
    <div class="container-fluid py-4" v-if=videoUrl>

      <h2>Segmente des Videos</h2>
      <!-- Table view of segments -->
      <div class="container-fluid py-4">
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th>Label</th>
                <th>Startzeit</th>
                <th>Endzeit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="segment in allSegments" :key="segment.id" @click="jumpTo(segment)" style="cursor: pointer;">
                <td :style="{ backgroundColor: getColorForLabel(segment.label), color: '#fff' }">{{ segment.label_display }}</td>
                <td>{{ formatTime(segment.startTime) }}</td>
                <td>{{ formatTime(segment.endTime) }}</td>
                <!--<td>{{ (segment.avgConfidence * 100).toFixed(1) }}%</td>-->
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Final Submit Button -->
      <div class="container-fluid py-4">
        <div class="controls mt-4">
          <button @click="submitAnnotations" class="btn btn-success" :disabled="!canSave">
            Alle Annotationen speichern
          </button>
        </div>
      </div>
    </div>
    <div class="status-container" v-if="currentVideo">
      <label for="statusSelect">Status ändern:</label>
      <select id="statusSelect" v-model="videoStatus" @change="updateStatus">
        <option value="in_progress">In Bearbeitung</option>
        <option value="available">Verfügbar</option>
        <option value="completed">Abgeschlossen</option>
      </select>
    </div>
    <div class="user-container" v-if="currentVideo">
      <label for="userInput">Benutzer zuweisen:</label>
      <input id="userInput" v-model="assignedUser" placeholder="Benutzername eingeben" />
      <button @click="assignUser">Zuweisen</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import vueFilePond from 'vue-filepond';
import 'filepond/dist/filepond.min.css';
import type { CSSProperties } from 'vue';
import type { Segment } from '@/stores/videoStore';
import type { VideoMeta } from '@/stores/videoStore';
import { useVideoStore } from '@/stores/videoStore';

// Use the video store
const videoStore = useVideoStore();
const { videoUrl, errorMessage, segmentsByLabel, allSegments, currentVideo } = storeToRefs(videoStore);
const { fetchAllVideos, fetchVideoUrl, fetchAllSegments, saveAnnotations, uploadRevert, uploadProcess, getColorForLabel, assignUserToVideo, updateVideoStatus } = videoStore;
const videoList = videoStore.videoList;
// Register FilePond component
const FilePond = vueFilePond();

// Local reactive references
const videoRef = ref<HTMLVideoElement | null>(null);
const timelineRef = ref<HTMLElement | null>(null);
const currentTime = ref<number>(0);
const duration = ref<number>(100);
const canSave = ref<boolean>(true);
const isResizing = ref(false);
const activeSegment = ref<Segment | null>(null);
const startX = ref<number>(0);
const initialWidthPercent = ref<number>(0);

// For the dropdown
const selectedSegment = ref<Segment | null>(null);
const selectedVideo = ref<VideoMeta | null>(null);

function reloadData() {
  fetchAllVideos();
  fetchAllSegments(String(selectedVideo.value?.id || "1"));
}

// Global event listeners for resizing
function startResize(segment: Segment, event: MouseEvent) {
  isResizing.value = true;
  activeSegment.value = segment;
  startX.value = event.clientX;
  initialWidthPercent.value = calculateWidthPercent(segment);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}
function onMouseMove(event: MouseEvent) {
  if (!isResizing.value || !activeSegment.value || !timelineRef.value) return;
  const timelineRect = timelineRef.value.getBoundingClientRect();
  const deltaPx = event.clientX - startX.value;
  const deltaPercent = (deltaPx / timelineRect.width) * 100;
  const newWidthPercent = initialWidthPercent.value + deltaPercent;
  if (newWidthPercent > 0 && (calculateLeftPercent(activeSegment.value) + newWidthPercent) <= 100) {
    const segmentDuration = (newWidthPercent / 100) * duration.value;
    activeSegment.value.endTime = activeSegment.value.startTime + segmentDuration;
  }
}

function onMouseUp() {
  isResizing.value = false;
  activeSegment.value = null;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
}

// Video event handlers
function handleVideoError(event: Event) {
  console.error("Error loading the video:", event);
  alert("Failed to load video. Please check the source URL.");
}
function handleTimeUpdate() {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
  }
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

// Helper functions for timeline
function calculateLeftPercent(segment: Segment): number {
  return (segment.startTime / duration.value) * 100;
}
function calculateWidthPercent(segment: Segment): number {
  return ((segment.endTime - segment.startTime) / duration.value) * 100;
}
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Current classification computed from all segments
const currentClassification = computed(() =>
  allSegments.value.find((segment: Segment) =>
    currentTime.value >= segment.startTime && currentTime.value <= segment.endTime
  ) || null
);
function getClassificationStyle(): CSSProperties {
  return {
    backgroundColor: "Green",
    color: "white",
    fontSize: "20px",
    fontWeight: "bold",
    padding: "12px",
    borderRadius: "6px",
    textTransform: "uppercase",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
    width: "100%"
  };
}

// Save the edited state of the selected segment locally by updating the store's segmentsByLabel
function updateSegmentState() {
  if (selectedSegment.value) {
    for (const label in segmentsByLabel.value) {
      const index = segmentsByLabel.value[label].findIndex((seg: Segment) => seg.id === selectedSegment.value!.id);
      if (index !== -1) {
        segmentsByLabel.value[label][index] = { ...selectedSegment.value };
        console.log("Segment state saved locally:", segmentsByLabel.value[label][index]);
        break;
      }
    }
  }
}

// Submit all annotations (send the updated segments to backend)
async function submitAnnotations() {
  await saveAnnotations();
}

onMounted(async () => {
  await fetchVideoUrl();
  // Fetch segments for all labels once the video is loaded.
  // If currentVideo is not yet set, default to video id '1'
  await fetchAllVideos();
  const id = videoStore.currentVideo?.id || '1';
  await fetchAllSegments(id);
});
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
});

// FilePond callback
function handleProcessFile(error: any, file: any) {
  if (error) {
    console.error("File processing error:", error);
    return;
  }
  console.log("File processed:", file);
  if (file.serverId) {
    videoUrl.value = file.serverId;
  }
}

const assignedUser = ref<string | null>(null);
const videoStatus = ref<'in_progress' | 'available' | 'completed'>('available');

// Initialwerte setzen, wenn currentVideo sich ändert
watchEffect(() => {
  if (currentVideo.value) {
    assignedUser.value = currentVideo.value.assignedUser || null;
    videoStatus.value = currentVideo.value.status;
  }
});

function updateStatus() {
  if (currentVideo.value) {
    updateVideoStatus(videoStatus.value);
  }
}

function assignUser() {
  if (assignedUser.value && currentVideo.value) {
    assignUserToVideo(assignedUser.value);
  }
}
</script>

<style scoped>
.timeline-track {
  position: relative;
  height: 40px;
  background: #e9ecef;
  border-radius: 5px;
}
.timeline-segment {
  position: absolute;
  top: 0;
  height: 100%;
  background-color: #2196F3;
  opacity: 0.5;
}
.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
  cursor: ew-resize;
  background: rgba(0, 0, 0, 0.5);
}
.classification-label {
  position: absolute;
  bottom: 10px;
  left: 0;
  z-index: 10;
}
</style>
