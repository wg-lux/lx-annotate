<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <h1>Video-Untersuchung Annotation</h1>
        <p>Annotieren Sie Untersuchungen während der Videobetrachtung</p>
      </div>
    </div>

    <div class="row">
      <!-- Video Player Section -->
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">Video Player</h5>
          </div>
          <div class="card-body">
            <!-- Video Selection -->
            <div class="mb-3">
              <label class="form-label">Video auswählen:</label>
              <select v-model.number="selectedVideoId" @change="onVideoChange" class="form-select" :disabled="!hasVideos">
                <option :value="null">{{ hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar' }}</option>
                <option v-for="video in videos" :key="video.id" :value="video.id">
                  {{ video.center_name || 'Unbekannt' }} - {{ video.processor_name || 'Unbekannt' }}
                </option>
              </select>
              <small v-if="!hasVideos" class="text-muted">
                {{ noVideosMessage }}
              </small>
            </div>

            <!-- No Video Selected State -->
            <div v-if="!currentVideoUrl && hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">movie</i>
              <p class="mt-2">Video auswählen, um mit der Betrachtung zu beginnen</p>
            </div>

            <!-- No Videos Available State -->
            <div v-if="!hasVideos" class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">video_library</i>
              <p class="mt-2">{{ noVideosMessage }}</p>
              <small>Videos können über das Dashboard hochgeladen werden.</small>
            </div>

            <!-- Video Player -->
            <div v-if="currentVideoUrl" class="video-container">
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
            </div>

            <!-- Video Timeline with Annotations -->
            <div v-if="duration > 0" class="timeline mt-3">
              <div class="timeline-track" @click="handleTimelineClick" ref="timelineRef">
                <div class="progress-bar" :style="{ width: `${(currentTime / duration) * 100}%` }"></div>
                <!-- Examination markers on timeline -->
                <div 
                  v-for="marker in examinationMarkers" 
                  :key="marker.id"
                  class="examination-marker"
                  :style="{ left: `${(marker.timestamp / duration) * 100}%` }"
                  :title="`Untersuchung bei ${formatTime(marker.timestamp)}`"
                >
                </div>
              </div>
            </div>

            <!-- Timeline Controls -->
            <div class="mt-3">
              <button 
                @click="addExaminationMarker" 
                class="btn btn-primary btn-sm"
                :disabled="!currentVideoUrl"
              >
                Untersuchung hier markieren
              </button>
              <span class="ms-3 text-muted">
                Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Examination Form Section -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">Untersuchungsdetails</h5>
            <small class="text-muted" v-if="currentMarker">
              Zeitpunkt: {{ formatTime(currentMarker.timestamp) }}
            </small>
          </div>
          <div class="card-body">
            <SimpleExaminationForm 
              v-if="showExaminationForm"
              :video-timestamp="currentTime"
              :video-id="selectedVideoId"
              @examination-saved="onExaminationSaved"
            />
            <div v-else class="text-center text-muted py-5">
              <i class="material-icons" style="font-size: 48px;">videocam</i>
              <p class="mt-2">Wählen Sie ein Video aus, um mit der Annotation zu beginnen</p>
            </div>
          </div>
        </div>

        <!-- Saved Examinations List -->
        <div class="card mt-3" v-if="savedExaminations.length > 0">
          <div class="card-header pb-0">
            <h6 class="mb-0">Gespeicherte Untersuchungen</h6>
          </div>
          <div class="card-body">
            <div class="list-group list-group-flush">
              <div 
                v-for="exam in savedExaminations" 
                :key="exam.id"
                class="list-group-item d-flex justify-content-between align-items-center px-0"
              >
                <div>
                  <small class="text-muted">{{ formatTime(exam.timestamp) }}</small>
                  <div>{{ exam.examination_type || 'Untersuchung' }}</div>
                </div>
                <div>
                  <button 
                    @click="jumpToExamination(exam)" 
                    class="btn btn-sm btn-outline-primary me-2"
                  >
                    <i class="material-icons">play_arrow</i>
                  </button>
                  <button 
                    @click="deleteExamination(exam.id)" 
                    class="btn btn-sm btn-outline-danger"
                  >
                    <i class="material-icons">delete</i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useVideoStore } from '@/stores/videoStore';
import SimpleExaminationForm from './SimpleExaminationForm.vue';
import axiosInstance, { r } from '@/api/axiosInstance';

export default {
  name: 'VideoExaminationAnnotation',
  components: {
    SimpleExaminationForm
  },
  data() {
    return {
      videos: [],
      selectedVideoId: null,  // Keep it truly null when nothing is chosen
      currentTime: 0,
      duration: 0,
      examinationMarkers: [],
      savedExaminations: [],
      currentMarker: null
    };
  },
  computed: {
    currentVideoUrl() {
      const video = this.videos.find(v => v.id === this.selectedVideoId);
      if (!video) return '';
      
      // Defensive fallback - only return URLs if they actually exist
      return video.url || video.video_file || video.file_url || 
             (video.original_file_name ? `/media/videos/${video.original_file_name}` : '');
    },
    showExaminationForm() {
      // Only show form if video is selected AND has a valid URL
      return this.selectedVideoId !== null && this.currentVideoUrl !== '';
    },
    hasVideos() {
      return this.videos && this.videos.length > 0;
    },
    noVideosMessage() {
      return this.videos.length === 0 ? 
        'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.' : 
        '';
    }
  },
  methods: {
    async loadVideos() {
      try {
        console.log('Loading videos from API...');
        const response = await axiosInstance.get(r('videos/'));
        console.log('Videos API response:', response.data);
        
        // Ensure IDs are numbers so v-model stays consistent
        this.videos = response.data.map(v => ({ 
          ...v, 
          id: Number(v.id) 
        }));
        
        // Log the structure of the first video to help debug
        if (this.videos.length > 0) {
          console.log('First video structure:', this.videos[0]);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        // Set empty array as fallback
        this.videos = [];
      }
    },
    async loadSavedExaminations() {
      if (this.selectedVideoId === null) return;
      
      try {
        const response = await axiosInstance.get(r(`video/${this.selectedVideoId}/examinations/`));
        this.savedExaminations = response.data;
        
        // Create markers for saved examinations
        this.examinationMarkers = response.data.map((exam) => ({
          id: `exam-${exam.id}`,
          timestamp: exam.timestamp,
          examination_data: exam.data
        }));
      } catch (error) {
        console.error('Error loading saved examinations:', error);
        // Don't crash on 404 - just set empty arrays
        this.savedExaminations = [];
        this.examinationMarkers = [];
      }
    },
    onVideoChange() {
      if (this.selectedVideoId !== null) {
        this.loadSavedExaminations();
        this.currentMarker = null;
      } else {
        // Clear everything when no video selected
        this.examinationMarkers = [];
        this.savedExaminations = [];
        this.currentMarker = null;
      }
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
    handleTimelineClick(event) {
      const timeline = event.currentTarget;
      if (timeline && this.$refs.videoRef && this.duration > 0) {
        const rect = timeline.getBoundingClientRect();
        const clickPosition = event.clientX - rect.left;
        const percentage = clickPosition / rect.width;
        this.$refs.videoRef.currentTime = percentage * this.duration;
      }
    },
    addExaminationMarker() {
      if (!this.$refs.videoRef) return;
      
      const timestamp = this.$refs.videoRef.currentTime;
      const markerId = `marker-${Date.now()}`;
      
      const newMarker = {
        id: markerId,
        timestamp: timestamp,
      };
      
      this.examinationMarkers.push(newMarker);
      this.currentMarker = newMarker;
    },
    jumpToExamination(exam) {
      if (this.$refs.videoRef) {
        this.$refs.videoRef.currentTime = exam.timestamp;
        this.currentMarker = this.examinationMarkers.find(m => m.timestamp === exam.timestamp) || null;
      }
    },
    async deleteExamination(examId) {
      try {
        await axiosInstance.delete(r(`examination/${examId}/`));
        await this.loadSavedExaminations();
      } catch (error) {
        console.error('Error deleting examination:', error);
      }
    },
    onExaminationSaved(examinationData) {
      console.log('Examination saved:', examinationData);
      this.loadSavedExaminations();
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
.timeline {
  position: relative;
  height: 20px;
  margin: 15px 0;
}

.timeline-track {
  position: relative;
  height: 8px;
  background: #e9ecef;
  cursor: pointer;
  border-radius: 4px;
}

.progress-bar {
  position: absolute;
  height: 100%;
  background: #5e72e4;
  border-radius: 4px;
  transition: width 0.1s ease;
}

.examination-marker {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #ff6b6b;
  border: 2px solid white;
  border-radius: 50%;
  transform: translateX(-50%) translateY(-2px);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.examination-marker:hover {
  background: #ff5252;
  transform: translateX(-50%) translateY(-2px) scale(1.2);
}

.video-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.list-group-item {
  border: none;
  border-bottom: 1px solid #e9ecef;
}

.list-group-item:last-child {
  border-bottom: none;
}
</style>