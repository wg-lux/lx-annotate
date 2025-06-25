<template>
    <div class="container-fluid py-4">
      <main class="main-content border-radius-lg">
        <div id="app" class="container-fluid py-4">
          <!-- Header Section -->
          <div class="row mb-4">
            <div class="col-12">
              <div class="card">
                <div class="card-header pb-0">
                  <div class="d-flex justify-content-between align-items-center">
                    <h3 class="card-title mb-0">
                      <i class="fas fa-video me-2"></i>
                      Video-Annotationen für Anonymisierung
                    </h3>
                    <div class="d-flex gap-2">
                      <!-- Filter Buttons -->
                      <div class="btn-group" role="group">
                        <button 
                          class="btn btn-sm"
                          :class="anonymizationFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
                          @click="setAnonymizationFilter('all')"
                        >
                          Alle
                        </button>
                        <button 
                          class="btn btn-sm"
                          :class="anonymizationFilter === 'anonymized' ? 'btn-success' : 'btn-outline-success'"
                          @click="setAnonymizationFilter('anonymized')"
                        >
                          Anonymisiert
                        </button>
                        <button 
                          class="btn btn-sm"
                          :class="anonymizationFilter === 'not_anonymized' ? 'btn-warning' : 'btn-outline-warning'"
                          @click="setAnonymizationFilter('not_anonymized')"
                        >
                          Nicht anonymisiert
                        </button>
                      </div>
                      <button 
                        class="btn btn-primary btn-sm"
                        @click="refreshData"
                        :disabled="loading"
                      >
                        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                        <i v-else class="fas fa-refresh me-2"></i>
                        {{ loading ? 'Lade...' : 'Aktualisieren' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Statistics Cards -->
          <div class="row mb-4">
            <div class="col-md-3">
              <div class="card bg-primary text-white">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5>Gesamt Videos</h5>
                      <h3>{{ videoList.videos.length }}</h3>
                    </div>
                    <i class="fas fa-video fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-success text-white">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5>Anonymisiert</h5>
                      <h3>{{ anonymizedCount }}</h3>
                    </div>
                    <i class="fas fa-check-circle fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-warning text-white">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5>Ausstehend</h5>
                      <h3>{{ pendingCount }}</h3>
                    </div>
                    <i class="fas fa-clock fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="card bg-info text-white">
                <div class="card-body">
                  <div class="d-flex justify-content-between">
                    <div>
                      <h5>In Bearbeitung</h5>
                      <h3>{{ inProgressCount }}</h3>
                    </div>
                    <i class="fas fa-cog fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Video Player Section -->
          <div v-if="videoUrl" class="row mb-4">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title">
                    <i class="fas fa-play-circle me-2"></i>
                    Aktuelles Video
                  </h5>
                </div>
                <div class="card-body">
                  <div class="video-player text-center">
                    <video 
                      ref="videoElement"
                      controls 
                      :src="videoUrl" 
                      class="rounded shadow"
                      style="max-width: 100%; max-height: 500px;"
                      @loadedmetadata="onVideoLoaded"
                    ></video>
                  </div>
                  <div v-if="currentVideoMeta" class="mt-3">
                    <div class="row">
                      <div class="col-md-6">
                        <p><strong>Dateiname:</strong> {{ currentVideoMeta.original_file_name }}</p>
                        <p><strong>Dauer:</strong> {{ formatDuration(currentVideoMeta.duration ?? null) }}</p>
                      </div>
                      <div class="col-md-6">
                        <p><strong>Status:</strong> 
                          <span :class="getStatusBadgeClass(currentVideo?.status)">
                            {{ getStatusText(currentVideo?.status) }}
                          </span>
                        </p>
                        <p><strong>Zugewiesen an:</strong> {{ currentVideo?.assignedUser || 'Nicht zugewiesen' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Anonymization Details Section -->
          <div v-if="currentVideo && currentVideoAnonymizationDetails" class="row mb-4">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title">
                    <i class="fas fa-shield-alt me-2"></i>
                    Anonymisierungsdetails
                  </h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6">
                      <div class="anonymization-info">
                        <h6><i class="fas fa-info-circle me-2"></i>Allgemeine Informationen</h6>
                        <ul class="list-unstyled">
                          <li><strong>Anonymisierungsstatus:</strong> 
                            <span :class="currentVideoAnonymizationDetails.anonymized ? 'badge bg-success' : 'badge bg-warning'">
                              {{ currentVideoAnonymizationDetails.anonymized ? 'Anonymisiert' : 'Nicht anonymisiert' }}
                            </span>
                          </li>
                          <li><strong>ROI definiert:</strong> 
                            <span :class="currentVideoAnonymizationDetails.hasROI ? 'badge bg-success' : 'badge bg-danger'">
                              {{ currentVideoAnonymizationDetails.hasROI ? 'Ja' : 'Nein' }}
                            </span>
                          </li>
                          <li><strong>Outside-Frames:</strong> 
                            <span class="badge bg-info">{{ currentVideoAnonymizationDetails.outsideFrameCount }}</span>
                          </li>
                          <li><strong>Gesamte Frames:</strong> 
                            <span class="badge bg-secondary">{{ currentVideoAnonymizationDetails.totalFrameCount }}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="roi-info" v-if="currentVideoAnonymizationDetails.hasROI">
                        <h6><i class="fas fa-crop me-2"></i>ROI (Region of Interest)</h6>
                        <div class="roi-visualization">
                          <div class="roi-box" :style="getROIStyle(currentVideoAnonymizationDetails.roi)">
                            <span class="roi-label">ROI</span>
                          </div>
                          <small class="text-muted">
                            X: {{ currentVideoAnonymizationDetails.roi.x }}, 
                            Y: {{ currentVideoAnonymizationDetails.roi.y }}, 
                            Breite: {{ currentVideoAnonymizationDetails.roi.width }}, 
                            Höhe: {{ currentVideoAnonymizationDetails.roi.height }}
                          </small>
                        </div>
                      </div>
                      <div v-else class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Keine ROI definiert - Video kann nicht anonymisiert werden
                      </div>
                    </div>
                  </div>
                  
                  <!-- Anonymization Actions -->
                  <div class="mt-3 pt-3 border-top">
                    <div class="d-flex gap-2">
                      <button 
                        v-if="!currentVideoAnonymizationDetails.anonymized"
                        class="btn btn-success"
                        @click="startAnonymization"
                        :disabled="!currentVideoAnonymizationDetails.hasROI || loading"
                      >
                        <i class="fas fa-play me-2"></i>
                        Anonymisierung starten
                      </button>
                      <button 
                        v-if="currentVideoAnonymizationDetails.anonymized"
                        class="btn btn-info"
                        @click="downloadAnonymizedVideo"
                      >
                        <i class="fas fa-download me-2"></i>
                        Anonymisiertes Video herunterladen
                      </button>
                      <button 
                        class="btn btn-outline-primary"
                        @click="editROI"
                        :disabled="loading"
                      >
                        <i class="fas fa-edit me-2"></i>
                        ROI bearbeiten
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Videos Table -->
          <div class="row mb-4">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title">
                    <i class="fas fa-list me-2"></i>
                    Verfügbare Videos
                    <span class="badge bg-secondary ms-2">{{ filteredVideos.length }}</span>
                  </h5>
                </div>
                <div class="card-body">
                  <div v-if="filteredVideos.length" class="table-responsive">
                    <table class="table table-hover table-striped">
                      <thead class="table-dark">
                        <tr>
                          <th>ID</th>
                          <th>Dateiname</th>
                          <th>Status</th>
                          <th>Zugewiesener Benutzer</th>
                          <th>Anonymisiert</th>
                          <th>ROI</th>
                          <th>Outside-Frames</th>
                          <th>Segmente</th>
                          <th>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr 
                          v-for="video in filteredVideos" 
                          :key="video.id"
                          @click="selectVideo(video)"
                          style="cursor: pointer;"
                          :class="{ 'table-active': currentVideo?.id === video.id.toString() }"
                        >
                          <td>{{ video.id }}</td>
                          <td>
                            <div class="d-flex align-items-center">
                              <i class="fas fa-video me-2 text-primary"></i>
                              {{ video.original_file_name }}
                            </div>
                          </td>
                          <td>
                            <span :class="getStatusBadgeClass(video.status)">
                              {{ getStatusText(video.status) }}
                            </span>
                          </td>
                          <td>{{ video.assignedUser || 'Nicht zugewiesen' }}</td>
                          <td>
                            <span :class="video.anonymized ? 'badge bg-success' : 'badge bg-warning'">
                              <i :class="video.anonymized ? 'fas fa-check' : 'fas fa-clock'"></i>
                              {{ video.anonymized ? 'Ja' : 'Nein' }}
                            </span>
                          </td>
                          <td>
                            <span :class="video.hasROI ? 'badge bg-success' : 'badge bg-danger'">
                              <i :class="video.hasROI ? 'fas fa-check' : 'fas fa-times'"></i>
                              {{ video.hasROI ? 'Ja' : 'Nein' }}
                            </span>
                          </td>
                          <td>
                            <span class="badge bg-warning">{{ video.outsideFrameCount || 0 }}</span>
                          </td>
                          <td>
                            <span class="badge bg-info">
                              {{ getSegmentCountForVideo(video.id) }}
                            </span>
                          </td>
                          <td>
                            <div class="btn-group btn-group-sm">
                              <button 
                                class="btn btn-outline-primary"
                                @click.stop="loadVideoData(video)"
                                :disabled="loading"
                                title="Video laden"
                              >
                                <i class="fas fa-play"></i>
                              </button>
                              <button 
                                class="btn btn-outline-info"
                                @click.stop="showSegments(video)"
                                title="Segmente anzeigen"
                              >
                                <i class="fas fa-list"></i>
                              </button>
                              <button 
                                v-if="!video.anonymized && video.hasROI"
                                class="btn btn-outline-success"
                                @click.stop="startAnonymizationForVideo(video)"
                                title="Anonymisierung starten"
                              >
                                <i class="fas fa-shield-alt"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="text-center py-4">
                    <i class="fas fa-video fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Keine Videos mit den aktuellen Filtern verfügbar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Segments Section -->
          <div v-if="allSegments.length" class="row mb-4">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title">
                    <i class="fas fa-cut me-2"></i>
                    Video-Segmente
                    <span class="badge bg-info ms-2">{{ allSegments.length }}</span>
                  </h5>
                </div>
                <div class="card-body">
                  <!-- Segment Timeline Visualization -->
                  <div v-if="duration > 0" class="timeline-container mb-4">
                    <div class="timeline-header">
                      <span>Timeline ({{ formatDuration(duration) }})</span>
                    </div>
                    <div class="timeline-track" ref="timelineRef">
                      <div
                        v-for="segment in allSegments"
                        :key="segment.id"
                        :style="createTimelineSegmentStyle(segment, duration)"
                        :class="`segment-bar segment-${segment.label}`"
                        :title="`${getTranslationForLabel(segment.label)}: ${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`"
                        @click="jumpToSegment(segment)"
                      >
                        <span class="segment-label">{{ getTranslationForLabel(segment.label) }}</span>
                      </div>
                    </div>
                    <div class="timeline-labels">
                      <span>0:00</span>
                      <span>{{ formatDuration(duration) }}</span>
                    </div>
                  </div>

                  <!-- Segments Table -->
                  <div class="table-responsive">
                    <table class="table table-sm table-hover">
                      <thead class="table-light">
                        <tr>
                          <th>Label</th>
                          <th>Anzeigename</th>
                          <th>Startzeit</th>
                          <th>Endzeit</th>
                          <th>Dauer</th>
                          <th>Konfidenz</th>
                          <th>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="segment in sortedSegments" :key="segment.id">
                          <td>
                            <span 
                              class="badge"
                              :style="{ backgroundColor: getColorForLabel(segment.label), color: 'white' }"
                            >
                              {{ segment.label }}
                            </span>
                          </td>
                          <td>{{ getTranslationForLabel(segment.label) }}</td>
                          <td>{{ formatTime(segment.startTime) }}</td>
                          <td>{{ formatTime(segment.endTime) }}</td>
                          <td>{{ formatTime(segment.endTime - segment.startTime) }}</td>
                          <td>
                            <div class="progress" style="height: 20px;">
                              <div 
                                class="progress-bar"
                                :class="getConfidenceClass(segment.avgConfidence)"
                                :style="{ width: (segment.avgConfidence * 100) + '%' }"
                              >
                                {{ Math.round(segment.avgConfidence * 100) }}%
                              </div>
                            </div>
                          </td>
                          <td>
                            <button 
                              class="btn btn-sm btn-outline-primary"
                              @click="jumpToSegment(segment)"
                              title="Zu Segment springen"
                            >
                              <i class="fas fa-play"></i>
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

          <!-- Labels Legend -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h5 class="card-title">
                    <i class="fas fa-palette me-2"></i>
                    Label-Legende
                  </h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div v-for="label in videoList.labels" :key="label.id" class="col-md-3 col-sm-6 mb-2">
                      <div class="d-flex align-items-center">
                        <span 
                          class="badge me-2"
                          :style="{ backgroundColor: getColorForLabel(label.name), color: 'white' }"
                        >
                          {{ label.name }}
                        </span>
                        <span class="text-muted">{{ getTranslationForLabel(label.name) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useVideoStore, type VideoMeta, type Segment } from '@/stores/videoStore';

// Types für Anonymisierungsdetails
interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AnonymizationDetails {
  anonymized: boolean;
  hasROI: boolean;
  roi: ROI;
  outsideFrameCount: number;
  totalFrameCount: number;
  anonymizationProgress?: number;
  lastAnonymizationDate?: string;
}

export default defineComponent({
  name: 'VideoDashboard',
  data() {
    return {
      loading: false,
      currentVideoMeta: null as VideoMeta | null,
      anonymizationFilter: 'all' as 'all' | 'anonymized' | 'not_anonymized',
      currentVideoAnonymizationDetails: null as AnonymizationDetails | null,
    };
  },
  computed: {
    videoStore() {
      return useVideoStore();
    },
    videoUrl() {
      return this.videoStore.videoUrl;
    },
    currentVideo() {
      return this.videoStore.currentVideo;
    },
    videoMeta() {
      return this.videoStore.videoMeta;
    },
    allSegments() {
      return this.videoStore.allSegments;
    },
    videoList() {
      return this.videoStore.videoList;
    },
    duration() {
      return this.videoStore.duration;
    },
    sortedSegments() {
      return [...this.allSegments].sort((a, b) => a.startTime - b.startTime);
    },
    filteredVideos() {
      return this.videoList.videos.filter((video: VideoMeta) => {
        if (this.anonymizationFilter === 'all') return true;
        if (this.anonymizationFilter === 'anonymized') return video.anonymized;
        if (this.anonymizationFilter === 'not_anonymized') return !video.anonymized;
        return true;
      });
    },
    anonymizedCount() {
      return this.videoList.videos.filter((video: VideoMeta) => video.anonymized).length;
    },
    pendingCount() {
      return this.videoList.videos.filter((video: VideoMeta) => !video.anonymized && video.hasROI).length;
    },
    inProgressCount() {
      return this.videoList.videos.filter((video: VideoMeta) => video.status === 'in_progress').length;
    },
  },
  async mounted() {
    await this.refreshData();
    
    // Load first video if available
    if (this.videoList.videos.length > 0) {
      await this.selectVideo(this.videoList.videos[0]);
    }
  },
  watch: {
    videoMeta(newMeta) {
      this.currentVideoMeta = newMeta;
    },
  },
  methods: {
    // Store method access
    getColorForLabel(label: string): string {
      return this.videoStore.getColorForLabel(label);
    },
    getTranslationForLabel(label: string): string {
      return this.videoStore.getTranslationForLabel(label);
    },

    // Main methods
    async refreshData() {
      this.loading = true;
      try {
        await this.videoStore.fetchAllVideos();
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      } finally {
        this.loading = false;
      }
    },

    async selectVideo(video: VideoMeta) {
      this.loading = true;
      try {
        // Set video in store
        this.videoStore.setVideo({
          id: video.id.toString(),
          isAnnotated: true,
          errorMessage: '',
          segments: [],
          videoUrl: '',
          status: video.status as 'in_progress' | 'available' | 'completed',
          assignedUser: video.assignedUser || null
        });
        
        // Fetch video data
        await this.loadVideoData(video);
        await this.loadAnonymizationDetails(video.id);
      } catch (error) {
        console.error('Fehler beim Auswählen des Videos:', error);
      } finally {
        this.loading = false;
      }
    },

    async loadVideoData(video: VideoMeta) {
      this.loading = true;
      try {
        await this.videoStore.fetchVideoMeta(String(video.id));
        await this.videoStore.fetchVideoUrl(video.id);
        await this.videoStore.fetchAllSegments(video.id.toString());
        this.currentVideoMeta = this.videoMeta;
      } catch (error) {
        console.error('Fehler beim Laden der Video-Daten:', error);
      } finally {
        this.loading = false;
      }
    },

    async loadAnonymizationDetails(videoId: number) {
      const createFallbackData = (video: VideoMeta | undefined) => ({
        anonymized: video?.anonymized || false,
        hasROI: video?.hasROI || false,
        roi: { x: 100, y: 100, width: 300, height: 200 },
        outsideFrameCount: video?.outsideFrameCount || 0,
        totalFrameCount: 1000,
      });

      try {
        const response = await fetch(`/api/videos/${videoId}/anonymization-details`);

        if (!response.ok) {
          const video = this.videoList.videos.find((v: VideoMeta) => v.id === videoId);
          this.currentVideoAnonymizationDetails = createFallbackData(video);
        } else {
          const data = await response.json();
          this.currentVideoAnonymizationDetails = data;
        }
      } catch (error) {
        console.error('Fehler beim Laden der Anonymisierungsdetails:', error);
        const video = this.videoList.videos.find((v: VideoMeta) => v.id === videoId);
        this.currentVideoAnonymizationDetails = createFallbackData(video);
      }
    },

    onVideoLoaded() {
      const videoElement = this.$refs.videoElement as HTMLVideoElement;
      console.log('Video geladen, Dauer:', videoElement?.duration);
    },

    async startAnonymization() {
      if (!this.currentVideo || !this.currentVideoAnonymizationDetails?.hasROI) {
        alert('ROI muss definiert sein, bevor die Anonymisierung gestartet werden kann.');
        return;
      }

      this.loading = true;
      try {
        const response = await fetch(`/api/videos/${this.currentVideo.id}/anonymize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roi: this.currentVideoAnonymizationDetails.roi,
          }),
        });

        if (!response.ok) {
          throw new Error('Anonymisierung fehlgeschlagen');
        }

        // Fix: Convert currentVideo.id to number properly for line 658 error
        const videoId = typeof this.currentVideo.id === 'string' 
          ? parseInt(this.currentVideo.id, 10) 
          : this.currentVideo.id;
        
        await this.loadAnonymizationDetails(videoId);
        await this.refreshData();
        
        alert('Anonymisierung erfolgreich gestartet!');
      } catch (error) {
        console.error('Fehler bei der Anonymisierung:', error);
        alert('Fehler bei der Anonymisierung. Bitte versuchen Sie es erneut.');
      } finally {
        this.loading = false;
      }
    },

    async startAnonymizationForVideo(video: VideoMeta) {
      await this.selectVideo(video);
      await this.startAnonymization();
    },

    downloadAnonymizedVideo() {
      if (!this.currentVideo) return;
      
      const downloadUrl = `/api/videos/${this.currentVideo.id}/download-anonymized`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `anonymized_${this.currentVideoMeta?.original_file_name || 'video.mp4'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    editROI() {
      if (!this.currentVideo) return;
      
      alert('ROI-Editor wird implementiert. Aktuell können Sie die ROI-Koordinaten manuell anpassen.');
      
      const newX = prompt('X-Koordinate:', this.currentVideoAnonymizationDetails?.roi.x?.toString() || '0');
      const newY = prompt('Y-Koordinate:', this.currentVideoAnonymizationDetails?.roi.y?.toString() || '0');
      const newWidth = prompt('Breite:', this.currentVideoAnonymizationDetails?.roi.width?.toString() || '100');
      const newHeight = prompt('Höhe:', this.currentVideoAnonymizationDetails?.roi.height?.toString() || '100');
      
      if (newX && newY && newWidth && newHeight && this.currentVideoAnonymizationDetails) {
        this.currentVideoAnonymizationDetails.roi = {
          x: parseInt(newX),
          y: parseInt(newY),
          width: parseInt(newWidth),
          height: parseInt(newHeight),
        };
        this.currentVideoAnonymizationDetails.hasROI = true;
      }
    },

    setAnonymizationFilter(filter: 'all' | 'anonymized' | 'not_anonymized') {
      this.anonymizationFilter = filter;
    },

    getROIStyle(roi: ROI) {
      return {
        position: 'relative' as const,
        width: '300px',
        height: '200px',
        border: '2px solid #007bff',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '10px 0',
      };
    },

    showSegments(video: VideoMeta) {
      console.log(`Showing segments for video: ${video.id}`);
      // Implement logic to display segments
    },

    // Fix: jumpToSegment method with proper store integration for line 815 error
    jumpToSegment(segment: Segment) {
      if (segment.id !== undefined && segment.id !== null) {
        console.log(`Jumping to segment with ID: ${segment.id}`);
        
        // Fix: Properly call store jumpToSegment method with both required parameters
        const videoElement = this.$refs.videoElement as HTMLVideoElement | null;
        if (this.videoStore.jumpToSegment) {
          this.videoStore.jumpToSegment(segment, videoElement);
        }
      } else {
        console.error('Invalid segment ID');
      }
    },

    getSegmentCountForVideo(videoId: string | number): number {
      // Fix: Use only video_id field as per the backend API structure
      const targetId = String(videoId);
      return this.allSegments.filter(segment => {
        const segmentVideoId = String(segment.videoID || '');
        return segmentVideoId === targetId;
      }).length;
    },

    createTimelineSegmentStyle(segment: Segment, videoDuration: number): Record<string, string> {
      const startPercent = (segment.startTime / videoDuration) * 100;
      const widthPercent = ((segment.endTime - segment.startTime) / videoDuration) * 100;
      
      return {
        position: 'absolute',
        left: `${startPercent}%`,
        width: `${widthPercent}%`,
        backgroundColor: this.getColorForLabel(segment.label) || '#999',
        height: '24px',
        top: '0px'
      };
    },

    formatTime(seconds: number): string {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    formatDuration(seconds: number | null): string {
      if (!seconds) return 'Unbekannt';
      return this.formatTime(seconds);
    },

    getStatusText(status?: string): string {
      const statusMap: Record<string, string> = {
        'available': 'Verfügbar',
        'in_progress': 'In Bearbeitung',
        'completed': 'Abgeschlossen'
      };
      return statusMap[status || 'available'] || status || 'Unbekannt';
    },

    getStatusBadgeClass(status?: string): string {
      const classMap: Record<string, string> = {
        'available': 'badge bg-success',
        'in_progress': 'badge bg-warning',
        'completed': 'badge bg-primary'
      };
      return classMap[status || 'available'] || 'badge bg-secondary';
    },

    getConfidenceClass(confidence: number): string {
      if (confidence >= 0.8) return 'bg-success';
      if (confidence >= 0.6) return 'bg-warning';
      return 'bg-danger';
    },
  },
});
</script>

<style scoped>
.video-player {
  margin-bottom: 1rem;
}

.table-hover tbody tr:hover {
  background-color: rgba(0, 123, 255, 0.1);
}

.table-active {
  background-color: rgba(0, 123, 255, 0.15) !important;
}

/* Timeline Styles */
.timeline-container {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.timeline-header {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #495057;
}

.timeline-track {
  position: relative;
  height: 60px;
  background: #e9ecef;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  border: 1px solid #dee2e6;
}

.segment-bar {
  height: 24px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.segment-bar:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.segment-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.timeline-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #6c757d;
}

/* Segment color classes for specific styling if needed */
.segment-outside {
  border-left: 3px solid #fff;
}

.segment-polyp {
  border-left: 3px solid #fff;
}

.segment-blood {
  border-left: 3px solid #fff;
}

/* Progress bar enhancements */
.progress {
  border-radius: 10px;
  background-color: #e9ecef;
}

.progress-bar {
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Card enhancements */
.card {
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.card-title {
  margin: 0;
  font-weight: 600;
}

/* Button group styling */
.btn-group-sm .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

/* Badge styling */
.badge {
  font-size: 0.75rem;
  padding: 0.35em 0.65em;
}

/* Anonymization Details Styles */
.anonymization-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.anonymization-info h6 {
  color: #495057;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.anonymization-info li {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.anonymization-info li strong {
  margin-right: 0.5rem;
}

/* ROI Visualization Styles */
.roi-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem;
}

.roi-info h6 {
  color: #495057;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.roi-visualization {
  text-align: center;
}

.roi-box {
  position: relative;
  width: 300px;
  height: 200px;
  border: 2px solid #007bff;
  border-radius: 4px;
  background-color: rgba(0, 123, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px auto;
  transition: all 0.3s ease;
}

.roi-box:hover {
  border-color: #0056b3;
  background-color: rgba(0, 123, 255, 0.2);
}

.roi-label {
  font-weight: 600;
  color: #007bff;
  font-size: 1.1rem;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

/* Statistics Cards Enhancements */
.card.bg-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
}

.card.bg-success {
  background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%) !important;
}

.card.bg-warning {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
}

.card.bg-info {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
}

.card.bg-primary .card-body,
.card.bg-success .card-body,
.card.bg-warning .card-body,
.card.bg-info .card-body {
  padding: 1.5rem;
}

.card.bg-primary h5,
.card.bg-success h5,
.card.bg-warning h5,
.card.bg-info h5 {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
}

.card.bg-primary h3,
.card.bg-success h3,
.card.bg-warning h3,
.card.bg-info h3 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

/* Filter Buttons Enhancements */
.btn-group .btn {
  border-radius: 0;
}

.btn-group .btn:first-child {
  border-top-left-radius: 0.375rem;
  border-bottom-left-radius: 0.375rem;
}

.btn-group .btn:last-child {
  border-top-right-radius: 0.375rem;
  border-bottom-right-radius: 0.375rem;
}

.btn-group .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Enhanced Table Styling */
.table th {
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 2px solid #dee2e6;
}

.table td {
  vertical-align: middle;
  font-size: 0.875rem;
}

.table-hover tbody tr:hover {
  background-color: rgba(0, 123, 255, 0.05);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

/* Action Buttons Styling */
.btn-group-sm .btn {
  transition: all 0.2s ease;
}

.btn-group-sm .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Alert Enhancements */
.alert {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.alert-warning {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  border-left: 4px solid #ffc107;
}

/* Loading Spinner */
.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

/* Responsive Video Player */
@media (max-width: 768px) {
  .roi-box {
    width: 250px;
    height: 150px;
  }
  
  .card.bg-primary h3,
  .card.bg-success h3,
  .card.bg-warning h3,
  .card.bg-info h3 {
    font-size: 1.5rem;
  }
  
  .btn-group .btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
}

/* Animation for status updates */
@keyframes statusUpdate {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.badge {
  animation: statusUpdate 0.3s ease-in-out;
}

/* Hover effects for cards */
.card {
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Focus states for accessibility */
.btn:focus,
.form-control:focus {
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}
</style>
