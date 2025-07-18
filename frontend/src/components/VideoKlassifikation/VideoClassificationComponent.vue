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
              <div v-if="duration > 0" class="timeline-container mt-3">
                <!-- Existing progress timeline -->
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
                
                <!-- Label Segments Timeline -->
                <div class="timeline-container" v-if="labelSegments.length > 0">
                  <h4>Label-Segmente Timeline</h4>
                  <div class="timeline" ref="timeline">
                    <div class="timeline-track">
                      <div 
                        v-for="segment in labelSegments" 
                        :key="segment.id"
                        class="timeline-segment"
                        :style="getSegmentStyle(segment)"
                        :title="`${segment.label_name}: ${formatTime(getSegmentStartTime(segment))} - ${formatTime(getSegmentEndTime(segment))}`"
                        @click="seekToSegment(segment)"
                      >
                        <span class="segment-label">{{ segment.label_name }}</span>
                      </div>
                    </div>
                    
                    <!-- Zeitmarker -->
                    <div class="timeline-markers">
                      <div 
                        v-for="marker in timelineMarkers" 
                        :key="marker.time"
                        class="time-marker"
                        :style="{ left: marker.position + '%' }"
                      >
                        {{ formatTime(marker.time) }}
                      </div>
                    </div>
                    
                    <!-- Aktueller Zeitzeiger -->
                    <div 
                      class="current-time-indicator"
                      :style="{ left: currentTimePosition + '%' }"
                    ></div>
                  </div>
                </div>
  
                <!-- Label-Segmente Verwaltung -->
                <div class="segments-management" v-if="labelSegments.length > 0">
                  <h4>Erstellte Label-Segmente</h4>
                  <div class="segments-list">
                    <div 
                      v-for="segment in labelSegments" 
                      :key="segment.id"
                      class="segment-item"
                    >
                      <div class="segment-info">
                        <strong>{{ segment.label_name }}</strong>
                        <span class="segment-time">
                          {{ formatTime(getSegmentStartTime(segment)) }} - {{ formatTime(getSegmentEndTime(segment)) }}
                        </span>
                      </div>
                      <div class="segment-actions">
                        <button @click="seekToSegment(segment)" class="btn-secondary">
                          Springen zu
                        </button>
                        <button @click="deleteSegment(segment.id)" class="btn-danger">
                          Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
              <!-- Timeline Controls -->
              <div class="timeline-controls mt-4">
                <div class="d-flex align-items-center gap-3">
                  <!-- Label Selection for Marking -->
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
                  
                  <!-- Label Marking Controls -->
                  <div class="d-flex align-items-center gap-2">
                    <button 
                      v-if="!isMarkingLabel"
                      @click="startLabelMarking" 
                      class="btn btn-success btn-sm control-button"
                      :disabled="!currentVideoUrl || !selectedLabelType"
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
                      <i class="material-icons">cancel</i>
                      Abbrechen
                    </button>
                  </div>
                  
                  <span class="ms-3 text-muted">
                    Zeit: {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
                  </span>
                </div>
                
                <!-- Active Label Marking Indicator -->
                <div v-if="isMarkingLabel" class="mt-2 p-2 bg-info bg-opacity-10 border border-info rounded">
                  <small class="text-info">
                    <i class="material-icons" style="font-size: 16px;">schedule</i>
                    Label "{{ getTranslationForLabel(selectedLabelType) }}" wird markiert. 
                    Start: {{ formatTime(labelMarkingStart) }} - Drücken Sie "Label-Ende setzen" um zu beenden.
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
  
  export default {
    name: 'VideoExaminationAnnotation',
    components: {
      SimpleExaminationForm,
      Timeline
    },
    data() {
      return {
        videos: [],
        selectedVideoId: null,
        currentTime: 0,
        duration: 0,
        fps: 50, 
        examinationMarkers: [],
        savedExaminations: [],
        currentMarker: null,
        selectedLabelType: '',
        isMarkingLabel: false,
        labelMarkingStart: 0,
        labelSegments: [], // Array to store created label segments
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
        const videoStore = useVideoStore();
        return videoStore.segmentsByLabel;
      },
      labelButtonText() {
        return this.isMarkingLabel ? 'Label-Ende setzen' : 'Label-Start setzen';
      },
      canStartLabeling() {
        return !!this.selectedLabelType && !this.isMarkingLabel;
      },
      canFinishLabeling() {
        return this.isMarkingLabel;
      },
      currentTimePosition() {
        // Calculate current time position for the indicator
        return (this.currentTime / this.duration) * 100;
      },
      timelineMarkers() {
        // Generate markers for the timeline based on label segments
        return this.labelSegments.map(segment => ({
          time: this.getSegmentStartTime(segment),
          position: (this.getSegmentStartTime(segment) / this.duration) * 100
        }));
      }
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
            // Use the new streaming endpoint directly
            video_url: `http://127.0.0.1:8000/api/media/videos/${v.id}/`
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
      onVideoChange() {
        if (this.selectedVideoId !== null) {
          this.loadSavedExaminations();
          this.loadVideoSegments();
          this.currentMarker = null;
        } else {
          // Clear everything when no video selected
          this.examinationMarkers = [];
          this.savedExaminations = [];
          this.currentMarker = null;
        }
      },
      async loadVideoSegments() {
        if (this.selectedVideoId === null) return;
        
        const videoStore = useVideoStore();
        try {
          // Lade alle Segmente für das Video
          await videoStore.fetchAllSegments(this.selectedVideoId.toString());
          console.log('Video segments loaded for video:', this.selectedVideoId);
        } catch (error) {
          console.error('Error loading video segments:', error);
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
      },
      handleTimelineSeek(targetTime) {
        if (this.$refs.videoRef) {
          this.$refs.videoRef.currentTime = targetTime;
        }
      },
      handleSegmentResize(segmentId, newEndTime) {
        console.log(`Segment ${segmentId} resized to end at ${newEndTime}s`);
        // Hier könnten Sie die Änderung an den Server senden
      },
      startLabelMarking() {
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
      },
      finishLabelMarking() {
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
          alert('Fehler: Keine Video-ID verfügbar');
          return;
        }
        
        try {
          // First, get the label ID from the label name
          const labelId = await this.getLabelIdByName(labelType);
          if (!labelId) {
            throw new Error(`Label "${labelType}" nicht gefunden`);
          }
          
          // Send time-based data - the backend will calculate frame numbers
          const segmentData = {
            videoId: this.selectedVideoId,
            labelId: labelId,
            startTime: startTime,
            endTime: endTime,
          };
          
          console.log('Speichere Label-Segment:', segmentData);
          
          const response = await axiosInstance.post(r('video-segments/'), segmentData);
          
          const createdSegment = response.data;
          console.log('Label-Segment erfolgreich erstellt:', createdSegment);
          
          // Add to local segments array
          this.labelSegments.push(createdSegment);
          
          // Refresh timeline to show new segment
          this.loadLabelSegments();
          
          alert(`Label-Segment erfolgreich erstellt: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
          
        } catch (error) {
          console.error('Fehler beim Speichern des Label-Segments:', error);
          const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
          alert(`Fehler beim Speichern: ${errorMessage}`);
        }
      },
      async getLabelIdByName(labelName) {
        try {
          // Get labels from API to find the ID
          const response = await axiosInstance.get(r('videos/'));
          const data = response.data;
          
          // API returns {videos: [...], labels: [...]}
          const labels = data.labels || [];
          const label = labels.find(l => l.name === labelName);
          
          if (label) {
            return label.id;
          }
          
          // If not found in API response, try predefined mapping
          const labelMapping = {
            'appendix': 1,
            'blood': 2, 
            'diverticule': 3,
            'grasper': 4,
            'ileocaecalvalve': 5,
            'ileum': 6,
            'low_quality': 7,
            'nbi': 8,
            'needle': 9,
            'outside': 10,
            'polyp': 11,
            'snare': 12,
            'water_jet': 13,
            'wound': 14
          };
          
          return labelMapping[labelName] || null;
        } catch (error) {
          console.error('Error getting label ID:', error);
          return null;
        }
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
          backgroundColor: this.getLabelColor(segment.label_id),
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
        try {
          await axiosInstance.delete(r(`video-segments/${segmentId}/`));
          // Remove from local segments array
          this.labelSegments = this.labelSegments.filter(seg => seg.id !== segmentId);
          this.showSuccessMessage('Segment erfolgreich gelöscht');
        } catch (error) {
          console.error('Error deleting segment:', error);
          this.showErrorMessage('Fehler beim Löschen des Segments');
        }
      },
      getCsrfToken() {
        // Get CSRF token from Django cookie
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'csrftoken') {
            return value;
          }
        }
        
        // Fallback: get from meta tag if cookie not found
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
          return metaTag.getAttribute('content');
        }
        
        // Final fallback: empty string (Django will handle this)
        return '';
      }
    },
    mounted() {
      this.loadVideos();
    }
  };
  </script>
  
  <style scoped>

  </style>