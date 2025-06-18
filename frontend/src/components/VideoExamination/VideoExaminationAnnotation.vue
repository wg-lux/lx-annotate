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

            <!-- Enhanced Timeline Component -->
            <div v-if="duration > 0" class="timeline-wrapper mt-3">
              <Timeline 
                :duration="duration"
                :current-time="currentTime"
                :segments="timelineSegments"
                :fps="fps"
                @seek="handleTimelineSeek"
                @resize="handleSegmentResize"
                @createSegment="handleCreateSegment"
              />
              
              <!-- Simple progress bar as fallback -->
              <div class="simple-timeline-track mt-2" @click="handleTimelineClick" ref="timelineRef">
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

            <!-- Debug-Info für Timeline -->
            <div v-if="duration > 0" class="debug-info mt-2">
              <small class="text-muted">
                Timeline Debug: {{ timelineSegments.length }} Segmente geladen | 
                Duration: {{ formatTime(duration) }} | 
                Store: {{ Object.keys(groupedSegments).length }} Labels
              </small>
            </div>

            <!-- Timeline Controls - Fix: Bedingungen überprüfen -->
            <div v-if="selectedVideoId" class="timeline-controls mt-4">
              <div class="d-flex align-items-center gap-3">
                <div class="d-flex align-items-center">
                  <label class="form-label mb-0 me-2">Neues Label setzen:</label>
                  <select v-model="selectedLabelType" class="form-select form-select-sm control-select">
                    <option value="">Label auswählen...</option>
                    <option value="appendix">Appendix</option>
                    <option value="blood">Blut</option>
                    <option value="diverticule">Divertikel</option>
                    <option value="grasper">Greifer</option>
                    <option value="ileocaecalvalve">Ileozäkalklappe</option>
                    <option value="ileum">Ileum</option>
                    <option value="low_quality">Niedrige Bildqualität</option>
                    <option value="nbi">Narrow Band Imaging</option>
                    <option value="needle">Nadel</option>
                    <option value="outside">Außerhalb</option>
                    <option value="polyp">Polyp</option>
                    <option value="snare">Snare</option>
                    <option value="water_jet">Wasserstrahl</option>
                    <option value="wound">Wunde</option>
                  </select>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                  <button 
                    v-if="!isMarkingLabel"
                    @click="startLabelMarking" 
                    class="btn btn-success btn-sm control-button"
                    :disabled="!canStartLabeling"
                  >
                    <i class="material-icons">label</i>
                    Label-Start setzen
                  </button>
                  
                  <button 
                    v-if="isMarkingLabel"
                    @click="finishLabelMarking" 
                    class="btn btn-warning btn-sm control-button"
                  >
                    <i class="material-icons">stop</i>
                    Label-Ende setzen
                  </button>

                  <button 
                    v-if="isMarkingLabel"
                    @click="cancelLabelMarking" 
                    class="btn btn-outline-secondary btn-sm control-button"
                  >
                    Abbrechen
                  </button>
                </div>
                
                <span class="ms-3 text-muted">
                  Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                </span>
              </div>
              
              <!-- Label-Info während Marking -->
              <div v-if="isMarkingLabel" class="alert alert-info mt-2 mb-0">
                <small>
                  <i class="material-icons align-middle me-1" style="font-size: 16px;">info</i>
                  Label "{{ getTranslationForLabel(selectedLabelType) }}" wird erstellt von 
                  {{ formatTime(labelMarkingStart) }} bis zur aktuellen Position.
                </small>
              </div>
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
import Timeline from '@/components/EndoAI/Timeline.vue';
import { storeToRefs } from 'pinia';


export default {
  name: 'VideoExaminationAnnotation',
  components: {
    SimpleExaminationForm,
    Timeline
  },
  setup() {
    const videoStore = useVideoStore();
    // Reaktive Referenzen vom Store
    const { allSegments: timelineSegments } = storeToRefs(videoStore);
    
    return {
      videoStore,
      timelineSegments
    };
  },
  data() {
    return {
      videos: [],
      selectedVideoId: null,
      currentTime: 0,
      duration: 0,
      fps: 30, // Default FPS, should be loaded from video metadata
      examinationMarkers: [],
      savedExaminations: [],
      currentMarker: null,
      selectedLabelType: '',
      isMarkingLabel: false,
      labelMarkingStart: 0,
      // Entfernt: labelSegments - jetzt aus Store
      currentLabel: null, // Current selected label object
      isMarking: false, // Tracking if currently marking
      markingStartTime: null, // Start time for marking
      videoId: null // Current video ID for API calls
    };
  },
  computed: {
    currentVideoUrl() {
      const video = this.videos.find(v => v.id === this.selectedVideoId);
      if (!video) return '';
      
      // Fix: Use 'video_url' field from the API response instead of incorrect field names
      return video.video_url || '';
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
    },
    groupedSegments() {
      return this.videoStore.segmentsByLabel;
    },
    labelButtonText() {
      return this.isMarkingLabel ? 'Label-Ende setzen' : 'Label-Start setzen';
    },
    canStartLabeling() {
      return this.selectedVideoId && 
             this.currentVideoUrl && 
             this.selectedLabelType && 
             !this.isMarkingLabel &&
             this.duration > 0;
    },
    canFinishLabeling() {
      return this.isMarkingLabel;
    },
    currentTimePosition() {
      return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    },
    timelineMarkers() {
      // Verwende Store-Segmente statt lokale Kopie
      return this.timelineSegments.map(segment => ({
        time: segment.startTime,
        position: this.duration > 0 ? (segment.startTime / this.duration) * 100 : 0
      }));
    }
    // Entfernt: convertedTimelineSegments - direkt timelineSegments verwenden
  },
  methods: {
    async loadVideos() {
      try {
        console.log('Loading videos from API...');
        const response = await axiosInstance.get(r('videos/'));
        console.log('Videos API response:', response.data);
        
        // Fix: API returns {videos: [...], labels: [...]} structure
        const videosData = response.data.videos || response.data || [];
        
        // Ensure IDs are numbers and add missing fields
        this.videos = videosData.map(v => ({ 
          ...v, 
          id: Number(v.id),
          // Add fallback fields for display
          center_name: v.center_name || v.original_file_name || 'Unbekannt',
          processor_name: v.processor_name || v.status || 'Unbekannt',
          // Use the dedicated streaming endpoint from urls.py
          video_url: `/api/videostream/${v.id}/`
        }));
        
        // Log the structure of the first video to help debug
        if (this.videos.length > 0) {
          console.log('First video structure after processing:', this.videos[0]);
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
    async onVideoChange() {
      if (this.selectedVideoId !== null) {
        this.loadSavedExaminations();
        
        // Warte erst auf Video-Metadaten, dann lade Segmente
        await this.loadVideoMetadata();
        await this.loadVideoSegments();
        
        this.currentMarker = null;
      } else {
        // Clear everything when no video selected
        this.examinationMarkers = [];
        this.savedExaminations = [];
        this.currentMarker = null;
        this.videoStore.clearSegments();
      }
    },
    async loadVideoMetadata() {
      // Warte bis Video geladen ist, um duration zu haben
      if (this.$refs.videoRef) {
        await new Promise((resolve) => {
          const video = this.$refs.videoRef;
          if (video.readyState >= 1) {
            this.duration = video.duration;
            resolve();
          } else {
            video.addEventListener('loadedmetadata', () => {
              this.duration = video.duration;
              resolve();
            }, { once: true });
          }
        });
      }
    },
    async loadVideoSegments() {
      if (this.selectedVideoId === null) return;
      
      try {
        // ✅ FIX: Use fetchVideoSegments instead of fetchSegmentsByLabel to get real segment entities with correct label_name
        await this.videoStore.fetchVideoSegments(this.selectedVideoId.toString());
        console.log('Video segments loaded for video:', this.selectedVideoId);
      } catch (error) {
        console.error('Error loading video segments:', error);
      }
    },
    onVideoLoaded() {
      if (this.$refs.videoRef) {
        this.duration = this.$refs.videoRef.duration;
        
        // Debug information for duration analysis
        console.log('🎥 Video loaded - Frontend duration info:');
        console.log(`- Duration from HTML5 video element: ${this.duration}s`);
        console.log(`- Video source URL: ${this.currentVideoUrl}`);
        console.log(`- Video readyState: ${this.$refs.videoRef.readyState}`);
        console.log(`- Video networkState: ${this.$refs.videoRef.networkState}`);
        
        // Additional video metadata
        if (this.$refs.videoRef.videoWidth && this.$refs.videoRef.videoHeight) {
          console.log(`- Video dimensions: ${this.$refs.videoRef.videoWidth}x${this.$refs.videoRef.videoHeight}`);
        }
        
        // Check if duration seems unusually short
        if (this.duration < 10) {
          console.warn(`⚠️ WARNING: Video duration seems very short (${this.duration}s). This might indicate an issue with:`);
          console.warn('  - Video file corruption');
          console.warn('  - Incorrect FPS calculation in backend');
          console.warn('  - Browser video decoding issues');
        }
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
    },
    handleTimelineSeek(targetTime) {
      if (this.$refs.videoRef) {
        this.$refs.videoRef.currentTime = targetTime;
      }
    },
    async handleSegmentResize(segmentId, newTime, newFrame, isStartResize = false) {
      console.log(`Segment ${segmentId} ${isStartResize ? 'start' : 'end'} resized to ${newTime}s (frame ${newFrame})`);
      
      try {
        const updateData = isStartResize 
          ? { startTime: newTime, start_frame_number: newFrame }
          : { endTime: newTime, end_frame_number: newFrame };
        
        // Verwende Store für Update - das ist bereits reaktiv!
        await this.videoStore.updateSegmentAPI(segmentId, updateData);
        console.log(`✅ Segment ${isStartResize ? 'start' : 'end'} resize saved to backend and store updated`);
      } catch (error) {
        console.error('❌ Error saving segment resize:', error);
        this.showErrorMessage('Fehler beim Speichern der Segment-Änderung');
      }
    },
    async handleCreateSegment(targetTime, targetFrame) {
      if (!this.selectedLabelType) {
        this.showErrorMessage('Bitte wählen Sie ein Label aus.');
        return;
      }
      
      // Erstelle automatisch ein 5-Sekunden-Segment
      const startTime = targetTime;
      const endTime = Math.min(targetTime + 5, this.duration);
      
      await this.saveNewLabelSegment(startTime, endTime, this.selectedLabelType);
    },
    async startLabelMarking() {
      if (!this.selectedLabelType) {
        alert('Bitte wählen Sie einen Label-Typ aus.');
        return;
      }
      
      if (this.isMarkingLabel) {
        // If already marking, this call should finish the marking
        this.finishLabelMarking();
      } else {
        // Start new marking
        this.isMarkingLabel = true;
        this.labelMarkingStart = this.currentTime;
        console.log(`Label-Start gesetzt bei: ${this.currentTime}s`);
      }
    },
    cancelLabelMarking() {
      this.isMarkingLabel = false;
      this.labelMarkingStart = 0;
      this.selectedLabelType = '';
    },
    async finishLabelMarking() {
      if (!this.isMarkingLabel) {
        alert('Es wurde kein Label-Start gesetzt.');
        return;
      }
      
      const endTime = this.currentTime;
      const startTime = this.labelMarkingStart;
      
      if (endTime <= startTime) {
        alert('Das Label-Ende muss nach dem Label-Start liegen.');
        return;
      }
      
      console.log(`Label-Ende gesetzt bei: ${endTime}s`);
      
      // Create new label segment
      this.saveNewLabelSegment(startTime, endTime, this.selectedLabelType);
      
      // Reset marking state
      this.isMarkingLabel = false;
      this.labelMarkingStart = 0;
    },
    async saveNewLabelSegment(startTime, endTime, labelType) {
      if (!this.selectedVideoId) {
        console.error('Keine Video-ID verfügbar');
        this.showErrorMessage('Fehler: Keine Video-ID verfügbar');
        return;
      }
      
      try {
        const segmentData = {
          video_id: this.selectedVideoId,
          start_time: startTime,
          end_time: endTime,
          label_name: labelType,
        };
        
        console.log('Speichere Label-Segment:', segmentData);
        
        // Use axiosInstance instead of fetch for proper authentication
        const response = await axiosInstance.post(r('video-segments/'), segmentData);
        
        console.log('Label-Segment erfolgreich erstellt:', response.data);
        
        // Update Store statt lokales Array - reaktiv!
        await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
        
        this.showSuccessMessage(`Label-Segment erfolgreich erstellt: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
        
      } catch (error) {
        console.error('Fehler beim Speichern des Label-Segments:', error);
        this.showErrorMessage(`Fehler beim Speichern: ${error.response?.data?.detail || error.message}`);
      }
    },
    async loadLabelSegments() {
      // Diese Methode ist nicht mehr nötig - Store übernimmt das Laden
      console.log('loadLabelSegments called but using Store instead');
    },
    getCsrfToken() {
      // Get CSRF token from meta tag or cookie
      const tokenMeta = document.querySelector('meta[name="csrf-token"]');
      if (tokenMeta) {
        return tokenMeta.getAttribute('content');
      }
      
      // Fallback: get from cookie
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
          return value;
        }
      }
      return '';
    },
    showSuccessMessage(message) {
      // Implement toast/notification system
      alert(`✅ ${message}`); // Replace with proper notification component
    },
    showErrorMessage(message) {
      // Implement toast/notification system  
      alert(`❌ ${message}`); // Replace with proper notification component
    },
    getTranslationForLabel(labelKey) {
      const translations = {
        appendix: 'Appendix',
        blood: 'Blut',
        diverticule: 'Divertikel',
        grasper: 'Greifer',
        ileocaecalvalve: 'Ileozäkalklappe',
        ileum: 'Ileum',
        low_quality: 'Niedrige Bildqualität',
        nbi: 'Narrow Band Imaging',
        needle: 'Nadel',
        outside: 'Außerhalb',
        polyp: 'Polyp',
        snare: 'Snare',
        water_jet: 'Wasserstrahl',
        wound: 'Wunde'
      };
      return translations[labelKey] || labelKey;
    },
    getLabelColor(labelKey) {
      const colors = {
        appendix: '#FFDDC1',
        blood: '#FFABAB',
        diverticule: '#FFC3A0',
        grasper: '#FF677D',
        ileocaecalvalve: '#D4A5A5',
        ileum: '#392F5A',
        low_quality: '#F8E16C',
        nbi: '#6EEB83',
        needle: '#A0D7E6',
        outside: '#FFE156',
        polyp: '#6A0572',
        snare: '#AB83A1',
        water_jet: '#FFD3B6',
        wound: '#FF677D'
      };
      return colors[labelKey] || '#FFFFFF';
    },
    getSegmentStartTime(segment) {
      // Get start time of the segment, fallback to 0
      return segment.start_time || 0;
    },
    getSegmentEndTime(segment) {
      // Get end time of the segment, fallback to duration
      return segment.end_time || this.duration;
    },
    getSegmentStyle(segment) {
      const start = this.getSegmentStartTime(segment);
      const end = this.getSegmentEndTime(segment);
      const width = ((end - start) / this.duration) * 100;
      const left = (start / this.duration) * 100;
      
      return {
        position: 'absolute',
        left: `${left}%`,
        width: `${width}%`,
        backgroundColor: this.getLabelColor(segment.label_name), // Fix: Use label_name instead of label_id
        borderRadius: '4px',
        height: '100%',
        cursor: 'pointer',
        zIndex: 1
      };
    },
    seekToSegment(segment) {
      const startTime = this.getSegmentStartTime(segment);
      if (this.$refs.videoRef) {
        this.$refs.videoRef.currentTime = startTime;
      }
    },
    async deleteSegment(segmentId) {
      if (!confirm('Sind Sie sicher, dass Sie dieses Segment löschen möchten?')) {
        return;
      }
      
      try {
        console.log(`🗑️ Deleting segment ${segmentId}...`);
        
        await axiosInstance.delete(r(`video-segments/${segmentId}/`));
        
        // Update Store statt lokales Array - reaktiv!
        await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
        
        console.log(`✅ Segment ${segmentId} successfully deleted`);
        this.showSuccessMessage('Segment erfolgreich gelöscht');
        
      } catch (error) {
        console.error('❌ Error deleting segment:', error);
        
        // More specific error handling
        if (error.response?.status === 404) {
          this.showErrorMessage('Segment nicht gefunden. Es wurde möglicherweise bereits gelöscht.');
          // Refresh Store auch bei 404
          await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
        } else if (error.response?.status === 403) {
          this.showErrorMessage('Keine Berechtigung zum Löschen dieses Segments.');
        } else {
          this.showErrorMessage('Fehler beim Löschen des Segments. Bitte versuchen Sie es erneut.');
        }
      }
    },
    async deleteAllFullVideoSegments() {
      // Verwende Store-Segmente statt lokale
      const allSegments = this.timelineSegments;
      const fullVideoSegments = allSegments.filter(segment => {
        const duration = segment.endTime - segment.startTime;
        return duration >= this.duration * 0.9; // Segments that cover 90%+ of video
      });
      
      if (fullVideoSegments.length === 0) {
        this.showSuccessMessage('Keine problematischen Vollvideo-Segmente gefunden.');
        return;
      }
      
      const confirmMessage = `${fullVideoSegments.length} Segment(e) decken fast das ganze Video ab (0:00-${this.formatTime(this.duration)}). Diese löschen?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
      
      try {
        console.log(`🧹 Deleting ${fullVideoSegments.length} full-video segments...`);
        
        // Delete each segment
        for (const segment of fullVideoSegments) {
          await axiosInstance.delete(r(`video-segments/${segment.id}/`));
          console.log(`✅ Deleted segment ${segment.id} (${segment.label_display})`);
        }
        
        // Refresh Store statt lokale Liste
        await this.videoStore.fetchAllSegments(this.selectedVideoId.toString());
        
        this.showSuccessMessage(`${fullVideoSegments.length} problematische Segmente erfolgreich gelöscht!`);
        
      } catch (error) {
        console.error('❌ Error deleting full-video segments:', error);
        this.showErrorMessage('Fehler beim Löschen der Vollvideo-Segmente. Bitte versuchen Sie es einzeln.');
      }
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

.timeline-container {
  position: relative;
  z-index: 1;
  overflow: hidden; /* Prevent any overflow from timeline elements */
  background: white;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 20px; /* Add space before controls */
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
  top: 0;                /* NEW: explicit top positioning */
  left: 0;               /* NEW: explicit left positioning */
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

.label-overview {
  border-top: 1px solid #e9ecef;
  padding-top: 15px;
  margin-top: 10px;
}

.label-summary-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.label-group {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  transition: box-shadow 0.2s ease;
}

.label-group:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.label-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.label-color-indicator {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.label-name {
  font-weight: 600;
  color: #495057;
  flex-grow: 1;
}

.label-count {
  font-size: 0.875rem;
  color: #6c757d;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 10px;
}

.label-segments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.label-segment-item {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  color: #495057;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.label-segment-item:hover {
  background: #e3f2fd;
  border-color: #2196f3;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  color: #1976d2;
}

.timeline-section {
  position: relative;
  z-index: 1;
  overflow: hidden; /* Contain timeline elements */
}

.timeline-controls {
  position: relative;
  z-index: 10; /* Higher z-index to ensure controls are above timeline */
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin-top: 20px; /* Additional space from timeline */
}

.control-select {
  position: relative;
  z-index: 15; /* Ensure dropdown is above everything */
  width: auto;
}

.control-button {
  position: relative;
  z-index: 15; /* Ensure buttons are above everything */
}

/* Ensure dropdowns open above timeline elements */
.control-select:focus,
.control-select:active {
  z-index: 20;
}

/* Timeline Segments Styles */
.timeline-segment {
  position: absolute;
  height: 100%;
  cursor: pointer;
  transition: background 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
}

.timeline-segment:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.segment-label {
  font-size: 10px;
  color: #333;
  font-weight: bold;
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.current-time-indicator {
  position: absolute;
  width: 2px;
  height: 100%;
  background: #ff0000;
  top: 0;
  z-index: 10;
  pointer-events: none;
}

.time-marker {
  position: absolute;
  font-size: 8px;
  color: #6c757d;
  top: -20px;
  transform: translateX(-50%);
  white-space: nowrap;
}

.timeline-markers {
  position: relative;
  height: 20px;
  margin-top: 5px;
}

/* Segment Management Styles */
.segments-management {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.segments-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.segment-item {
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 10px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  transition: box-shadow 0.2s ease;
}

.segment-item:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.segment-info {
  flex-grow: 1;
}

.segment-time {
  display: block;
  font-size: 0.875rem;
  color: #6c757d;
  margin-top: 2px;
}

.segment-actions {
  display: flex;
  gap: 8px;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-danger:hover {
  background: #c82333;
}

/* Fix #3: Progress bar CSS - add explicit height and positioning to container */
.simple-timeline-track {
  position: relative;
  height: 8px;           /* NEW: explicit height */
  background: #e9ecef;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;      /* NEW: prevent overflow */
}
</style>