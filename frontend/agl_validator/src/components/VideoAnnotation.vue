<template>
    <div class="card">
      <div class="card-header pb-0">
        <h4 class="mb-0">Video Annotation</h4>
      </div>
      
      <div class="card-body">
        <!-- Video Upload Section -->
        <div class="form-group mb-4">
            <label class="form-control-label">Select Video</label>
            <input 
            type="file" 
            @change="handleFileSelect" 
            accept="video/*" 
            class="form-control"
            >
            
            <select v-if="availableVideos.length" v-model="currentVideo" class="form-select mt-3">
            <option value="">Select a video...</option>
            <option v-for="video in availableVideos" :key="video.id" :value="video">
                {{ video.center_name }} - {{ video.processor_name }}
            </option>
            </select>
        </div>

        <!-- Video Player -->
        <div class="video-container">
            <video 
            ref="videoRef"
            @timeupdate="handleTimeUpdate"
            controls
            class="w-100"
            :src="currentVideoUrl"
            ></video>
        </div>

  
        <!-- Timeline -->
        <div class="timeline mt-4">
          <div class="timeline-track" 
               @click="handleTimelineClick" 
               ref="timelineRef">
            <!-- Progress Bar -->
            <div class="progress-bar" 
                 :style="{ width: `${(currentTime / duration) * 100}%` }">
            </div>
            
            <!-- Label Spans -->
            <div v-for="label in labels" 
                 :key="label.id"
                 class="timeline-label"
                 :style="getTimelineSpanStyle(label)"
                 @click.stop="selectLabel(label)">
              <div class="label-span"
                   :class="{ 'recording': !label.isComplete }">
              </div>
            </div>
          </div>
        </div>
  
        <!-- Controls -->
        <div class="controls mt-4">
          <button 
            @click="toggleLabel" 
            class="btn"
            :class="activeLabel ? 'btn-danger' : 'btn-primary'"
          >
            {{ activeLabel ? 'End Recording' : '+ Start Recording' }}
          </button>
        </div>
  
        <!-- Labels Overview -->
        <div class="labels-overview mt-4">
          <h5 class="font-weight-bolder mb-3">Annotations</h5>
          <div v-for="label in sortedLabels" 
               :key="label.id" 
               class="label-item">
            <span>
              {{ formatTime(label.startTime) }} 
              {{ label.endTime ? '- ' + formatTime(label.endTime) : '(Recording...)' }}
            </span>
            <span>Außerhalb d. Körpers</span>
            <button 
              @click="deleteLabel(label.id)" 
              :disabled="!label.isComplete"
              class="btn btn-link text-danger p-0"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
  
        <!-- Save Button -->
        <button 
          @click="saveAnnotations" 
          class="btn btn-success mt-4"
          :disabled="!canSave"
        >
          Save Annotations
        </button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue';
  import { v4 as uuidv4 } from 'uuid';
  import axios from 'axios';
  
  interface Label {
    id: string;
    startTime: number;
    endTime: number | null;
    isComplete: boolean;
  }
  
  interface VideoMetadata {
    id: number;
    url: string;
    center_name: string;
    processor_name: string;
  }
  
  const API_BASE = 'http://127.0.0.1:8000/api';
  
  // Refs
  const videoRef = ref<HTMLVideoElement | null>(null);
  const labels = ref<Label[]>([]);
  const currentTime = ref(0);
  const duration = ref(0);
  const availableVideos = ref<VideoMetadata[]>([]);
  const currentVideo = ref<VideoMetadata | null>(null);
  const activeLabel = ref<Label | null>(null);
  
  // Computed
  const sortedLabels = computed(() => {
    return [...labels.value].sort((a, b) => a.startTime - b.startTime);
  });
  
  const currentVideoUrl = computed(() => {
    return currentVideo.value?.url || '';
  });
  
  const canSave = computed(() => {
    return labels.value.length > 0 && labels.value.every(l => l.isComplete);
  });
  
  // Methods
  async function fetchVideos() {
    try {
      const response = await axios.get(`${API_BASE}/videos/`);
      availableVideos.value = response.data;
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    }
  }
  
  async function handleFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('video', file);
    formData.append('center_name', 'your_center');
    formData.append('processor_name', 'your_processor');
  
    try {
      const response = await axios.post(`${API_BASE}/videos/upload/`, formData);
      console.log('Upload response:', response.data);
  
      if (response.data.url) {
        currentVideo.value = response.data;
        // Video source will update automatically due to binding
      } else {
        console.error('No URL in response:', response.data);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
  
  function handleTimeUpdate() {
    if (videoRef.value) {
      currentTime.value = videoRef.value.currentTime;
      duration.value = videoRef.value.duration;
    }
  }
  
  function handleTimelineClick(event: MouseEvent) {
    const timeline = event.currentTarget as HTMLElement;
    if (timeline && videoRef.value) {
      const rect = timeline.getBoundingClientRect();
      const clickPosition = event.clientX - rect.left;
      const percentage = clickPosition / rect.width;
      videoRef.value.currentTime = percentage * duration.value;
    }
  }
  
  function toggleLabel() {
    if (!videoRef.value) return;
  
    if (activeLabel.value) {
      // Complete existing label
      activeLabel.value.endTime = videoRef.value.currentTime;
      activeLabel.value.isComplete = true;
      activeLabel.value = null;
    } else {
      // Start new label
      const newLabel: Label = {
        id: uuidv4(),
        startTime: videoRef.value.currentTime,
        endTime: null,
        isComplete: false
      };
      labels.value.push(newLabel);
      activeLabel.value = newLabel;
    }
  }
  
  function deleteLabel(id: string) {
    const label = labels.value.find(l => l.id === id);
    if (label === activeLabel.value) {
      activeLabel.value = null;
    }
    labels.value = labels.value.filter(l => l.id !== id);
  }
  
  function getTimelineSpanStyle(label: Label) {
    const startPercentage = (label.startTime / duration.value) * 100;
    const endPercentage = label.endTime 
      ? (label.endTime / duration.value) * 100 
      : (currentTime.value / duration.value) * 100;
    
    return {
      left: `${startPercentage}%`,
      width: `${endPercentage - startPercentage}%`
    };
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  function selectLabel(label: Label) {
  // For example, set the current time to the label's start time
    if (videoRef.value) {
        videoRef.value.currentTime = label.startTime;
    }
    }
  
  async function saveAnnotations() {
    if (!currentVideo.value) return;
    
    try {
      await axios.post(`${API_BASE}/annotations/`, {
        video_id: currentVideo.value.id,
        labels: labels.value.map(label => ({
          start_time: label.startTime,
          end_time: label.endTime,
          label_type: 'outside_body'
        }))
      });
      
      // Clear labels after successful save
      labels.value = [];
      activeLabel.value = null;
    } catch (error) {
      console.error('Failed to save annotations:', error);
    }
  }
  
  // Lifecycle
  onMounted(async () => {
    await fetchVideos();
  });
  </script>
  
  
  <style scoped>
  .timeline {
    position: relative;
    height: 40px;
    margin: 20px 0;
  }
  
  .timeline-track {
    position: relative;
    height: 10px;
    background: #e9ecef;
    cursor: pointer;
    border-radius: 5px;
  }
  
  .progress-bar {
    position: absolute;
    height: 100%;
    background: #5e72e4;
    border-radius: 5px;
    transition: width 0.1s ease;
  }
  
  .timeline-label {
    position: absolute;
    height: 100%;
  }
  
  .label-span {
    width: 100%;
    height: 100%;
    background: #2196F3;
    opacity: 0.5;
  }
  
  .label-span.recording {
    animation: pulse 1s infinite;
  }
  
  .label-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e9ecef;
  }
  
  @keyframes pulse {
    0% { opacity: 0.3; }
    50% { opacity: 0.7; }
    100% { opacity: 0.3; }
  }
  </style>