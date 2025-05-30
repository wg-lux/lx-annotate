<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <h1>Frame Auswahl</h1>
        <p>Wählen Sie Frames aus dem Video für die Annotation aus</p>
      </div>
    </div>

    <!-- Video Selection -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">Video auswählen</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Video:</label>
              <select v-model="selectedVideoId" @change="onVideoChange" class="form-select">
                <option :value="null">Bitte Video auswählen...</option>
                <option v-for="video in videos" :key="video.id" :value="video.id">
                  {{ video.center_name || 'Unbekannt' }} - {{ video.processor_name || 'Unbekannt' }}
                </option>
              </select>
            </div>

            <!-- Video Player for Frame Selection -->
            <div v-if="currentVideoUrl" class="video-container mb-3">
              <video 
                ref="videoRef"
                :src="currentVideoUrl"
                @timeupdate="handleTimeUpdate"
                @loadedmetadata="onVideoLoaded"
                controls
                class="w-100"
                style="max-height: 400px;"
              >
                Ihr Browser unterstützt das Video-Element nicht.
              </video>
              
              <div class="mt-2">
                <button 
                  @click="captureCurrentFrame" 
                  class="btn btn-primary me-2"
                  :disabled="!canCaptureFrame"
                >
                  Aktuellen Frame erfassen
                </button>
                <button 
                  @click="generateFrames" 
                  class="btn btn-outline-primary me-2"
                  :disabled="duration === 0"
                >
                  Frames automatisch generieren
                </button>
                <span class="text-muted">
                  Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Frame Selection Table -->
    <div class="row" v-if="extractedFrames.length > 0">
      <div class="col-12">
        <div class="card">
          <div class="card-header pb-0 d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Verfügbare Frames ({{ extractedFrames.length }})</h5>
            <div>
              <button 
                @click="selectAllFrames" 
                class="btn btn-sm btn-outline-primary me-2"
                :disabled="allFramesSelected"
              >
                Alle auswählen
              </button>
              <button 
                @click="deselectAllFrames" 
                class="btn btn-sm btn-outline-secondary me-2"
                :disabled="!anyFrameSelected"
              >
                Alle abwählen
              </button>
              <button 
                @click="proceedToAnnotation" 
                class="btn btn-sm btn-success"
                :disabled="selectedFrames.length === 0"
              >
                Zur Annotation ({{ selectedFrames.length }})
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead>
                  <tr>
                    <th width="50">
                      <input 
                        type="checkbox" 
                        @change="toggleAllFrames"
                        :checked="allFramesSelected"
                        :indeterminate="someFramesSelected"
                        class="form-check-input"
                      >
                    </th>
                    <th width="200">Frame</th>
                    <th>Details</th>
                    <th width="120">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="frame in extractedFrames" 
                    :key="frame.id"
                    :class="{ 'table-primary': frame.selected }"
                  >
                    <td>
                      <input 
                        type="checkbox" 
                        v-model="frame.selected"
                        @change="updateSelectedFrames"
                        class="form-check-input"
                      >
                    </td>
                    <td>
                      <img 
                        :src="frame.thumbnailUrl" 
                        class="img-fluid frame-thumbnail" 
                        :alt="`Frame ${frame.id}`"
                        @click="toggleFrameSelection(frame)"
                        style="cursor: pointer; max-width: 150px; max-height: 100px;"
                      >
                    </td>
                    <td>
                      <h6 class="mb-1">Frame {{ frame.frameNumber }}</h6>
                      <div class="text-muted mb-2">
                        <small>Zeitpunkt: {{ formatTime(frame.timestamp) }}</small>
                      </div>
                      <div v-if="frame.predictions && frame.predictions.length > 0">
                        <div v-for="prediction in frame.predictions" :key="prediction.label" class="mb-1">
                          <span class="badge me-2" :class="getConfidenceClass(prediction.confidence)">
                            {{ prediction.label }}
                          </span>
                          <small class="text-muted">{{ (prediction.confidence * 100).toFixed(1) }}%</small>
                        </div>
                      </div>
                      <div v-else class="text-muted">
                        <small>Keine Vorhersagen verfügbar</small>
                      </div>
                      <div v-if="frame.notes" class="mt-2">
                        <small class="text-secondary">{{ frame.notes }}</small>
                      </div>
                    </td>
                    <td>
                      <button 
                        @click="toggleFrameSelection(frame)"
                        class="btn btn-sm me-1"
                        :class="frame.selected ? 'btn-success' : 'btn-outline-primary'"
                      >
                        {{ frame.selected ? 'Ausgewählt' : 'Auswählen' }}
                      </button>
                      <button 
                        @click="removeFrame(frame.id)"
                        class="btn btn-sm btn-outline-danger"
                      >
                        Entfernen
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="row">
      <div class="col-12">
        <div class="text-center text-muted py-5">
          <i class="material-icons" style="font-size: 48px;">photo_library</i>
          <p class="mt-2">Keine Frames extrahiert</p>
          <small>Wählen Sie ein Video aus und erfassen Sie Frames zur Annotation</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axiosInstance, { r } from '@/api/axiosInstance';

export default {
  name: 'FrameSelection',
  data() {
    return {
      videos: [],
      selectedVideoId: null,
      currentTime: 0,
      duration: 0,
      extractedFrames: [],
      frameCounter: 0
    };
  },
  computed: {
    currentVideoUrl() {
      const video = this.videos.find(v => v.id === this.selectedVideoId);
      if (!video) return '';
      
      return video.url || video.video_file || video.file_url || 
             (video.original_file_name ? `/media/videos/${video.original_file_name}` : '');
    },
    canCaptureFrame() {
      return this.selectedVideoId !== null && this.currentVideoUrl !== '' && this.duration > 0;
    },
    selectedFrames() {
      return this.extractedFrames.filter(frame => frame.selected);
    },
    allFramesSelected() {
      return this.extractedFrames.length > 0 && this.extractedFrames.every(frame => frame.selected);
    },
    anyFrameSelected() {
      return this.extractedFrames.some(frame => frame.selected);
    },
    someFramesSelected() {
      return this.anyFrameSelected && !this.allFramesSelected;
    }
  },
  methods: {
    async loadVideos() {
      try {
        const response = await axiosInstance.get(r('videos/'));
        this.videos = response.data.map(v => ({ 
          ...v, 
          id: Number(v.id) 
        }));
      } catch (error) {
        console.error('Error loading videos:', error);
        this.videos = [];
      }
    },
    onVideoChange() {
      this.extractedFrames = [];
      this.frameCounter = 0;
    },
    onVideoLoaded() {
      if (this.$refs.videoRef) {
        this.duration = this.$refs.videoRef.duration;
      }
    },
    handleTimeUpdate() {
      if (this.$refs.videoRef) {
        this.currentTime = this.$refs.videoRef.currentTime;
      }
    },
    captureCurrentFrame() {
      if (!this.canCaptureFrame) return;
      
      const canvas = document.createElement('canvas');
      const video = this.$refs.videoRef;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      const frame = {
        id: `frame-${Date.now()}-${this.frameCounter++}`,
        frameNumber: this.frameCounter,
        timestamp: this.currentTime,
        thumbnailUrl: thumbnailUrl,
        videoId: this.selectedVideoId,
        selected: false,
        predictions: this.generateMockPredictions(), // In real app, this would come from ML model
        notes: `Frame erfasst bei ${this.formatTime(this.currentTime)}`
      };
      
      this.extractedFrames.push(frame);
    },
    generateFrames() {
      if (!this.canCaptureFrame) return;
      
      const video = this.$refs.videoRef;
      const interval = Math.max(1, Math.floor(this.duration / 10)); // Generate 10 frames max
      
      for (let i = 0; i < this.duration; i += interval) {
        video.currentTime = i;
        
        // Use setTimeout to allow video to seek
        setTimeout(() => {
          this.captureFrameAtTime(i);
        }, i * 100);
      }
    },
    captureFrameAtTime(timestamp) {
      const canvas = document.createElement('canvas');
      const video = this.$refs.videoRef;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      const frame = {
        id: `frame-${Date.now()}-${this.frameCounter++}`,
        frameNumber: this.frameCounter,
        timestamp: timestamp,
        thumbnailUrl: thumbnailUrl,
        videoId: this.selectedVideoId,
        selected: false,
        predictions: this.generateMockPredictions(),
        notes: `Automatisch generiert bei ${this.formatTime(timestamp)}`
      };
      
      this.extractedFrames.push(frame);
    },
    generateMockPredictions() {
      const labels = ['Schlechte Bildqualität', 'Greifer', 'NBI', 'Ileum', 'Polyp', 'Normal'];
      const count = Math.floor(Math.random() * 3) + 1;
      const predictions = [];
      
      for (let i = 0; i < count; i++) {
        predictions.push({
          label: labels[Math.floor(Math.random() * labels.length)],
          confidence: Math.random()
        });
      }
      
      return predictions;
    },
    toggleFrameSelection(frame) {
      frame.selected = !frame.selected;
      this.updateSelectedFrames();
    },
    updateSelectedFrames() {
      // This method can be used to sync with parent components or APIs
    },
    selectAllFrames() {
      this.extractedFrames.forEach(frame => frame.selected = true);
    },
    deselectAllFrames() {
      this.extractedFrames.forEach(frame => frame.selected = false);
    },
    toggleAllFrames() {
      const shouldSelect = !this.allFramesSelected;
      this.extractedFrames.forEach(frame => frame.selected = shouldSelect);
    },
    removeFrame(frameId) {
      this.extractedFrames = this.extractedFrames.filter(frame => frame.id !== frameId);
    },
    getConfidenceClass(confidence) {
      if (confidence > 0.7) return 'bg-success';
      if (confidence > 0.4) return 'bg-warning text-dark';
      return 'bg-danger';
    },
    proceedToAnnotation() {
      if (this.selectedFrames.length === 0) return;
      
      // Navigate to frame annotation with selected frames
      this.$router.push({
        name: 'FrameAnnotation',
        params: {
          videoId: this.selectedVideoId
        },
        query: {
          frames: this.selectedFrames.map(f => f.id).join(',')
        }
      });
    },
    formatTime(seconds) {
      if (Number.isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
      
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  },
  mounted() {
    this.loadVideos();
  }
};
</script>

<style scoped>
.frame-thumbnail {
  border-radius: 4px;
  transition: transform 0.2s ease;
}

.frame-thumbnail:hover {
  transform: scale(1.05);
}

.table-primary {
  background-color: rgba(13, 110, 253, 0.1);
}

.video-container {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.badge {
  font-size: 0.75em;
}

.form-check-input:indeterminate {
  background-color: #6c757d;
  border-color: #6c757d;
}
</style>