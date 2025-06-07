<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <h1>Video Klassifikation</h1>
        <p>Klassifizieren Sie Videos nach NICE und PARIS Kriterien</p>
      </div>
    </div>

    <!-- Classification Type Selection -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header pb-0">
            <h5 class="mb-0">Klassifikationstyp auswählen</h5>
          </div>
          <div class="card-body">
            <div class="btn-group" role="group">
              <button 
                type="button" 
                class="btn"
                :class="activeTab === 'nice' ? 'btn-primary' : 'btn-outline-primary'"
                @click="setActiveTab('nice')"
              >
                NICE Klassifikation
              </button>
              <button 
                type="button" 
                class="btn"
                :class="activeTab === 'paris' ? 'btn-primary' : 'btn-outline-primary'"
                @click="setActiveTab('paris')"
              >
                PARIS Klassifikation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- NICE Classification -->
    <div v-if="activeTab === 'nice'" class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header pb-0 d-flex justify-content-between align-items-center">
            <h5 class="mb-0">NICE Klassifikation</h5>
            <button @click="loadNiceData" class="btn btn-sm btn-outline-primary" :disabled="loadingNice">
              <i class="material-icons">refresh</i>
              {{ loadingNice ? 'Laden...' : 'Aktualisieren' }}
            </button>
          </div>
          <div class="card-body">
            <div v-if="loadingNice" class="text-center py-5">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Laden...</span>
              </div>
              <p class="mt-2">Lade NICE Klassifikationsdaten...</p>
            </div>

            <div v-else-if="niceError" class="alert alert-danger">
              <h6>Fehler beim Laden der NICE Daten:</h6>
              <p class="mb-0">{{ niceError }}</p>
            </div>

            <div v-else-if="niceData.length === 0" class="text-center py-5 text-muted">
              <i class="material-icons" style="font-size: 48px;">video_library</i>
              <p class="mt-2">Keine NICE Klassifikationsdaten verfügbar</p>
            </div>

            <div v-else>
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Video ID</th>
                      <th>Center</th>
                      <th>Processor</th>
                      <th>Polyp Segmente</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="video in niceData" :key="video.video_id">
                      <td>{{ video.video_id }}</td>
                      <td>{{ video.center_name || 'Unbekannt' }}</td>
                      <td>{{ video.processor_name || 'Unbekannt' }}</td>
                      <td>
                        <span class="badge bg-info">{{ video.polyp_segments.length }} Segmente</span>
                      </td>
                      <td>
                        <button 
                          @click="showNiceDetails(video)" 
                          class="btn btn-sm btn-primary me-2"
                        >
                          <i class="material-icons">visibility</i>
                          Details
                        </button>
                        <button 
                          @click="classifyNice(video)" 
                          class="btn btn-sm btn-success"
                        >
                          <i class="material-icons">check_circle</i>
                          Klassifizieren
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
    </div>

    <!-- PARIS Classification -->
    <div v-if="activeTab === 'paris'" class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header pb-0 d-flex justify-content-between align-items-center">
            <h5 class="mb-0">PARIS Klassifikation</h5>
            <button @click="loadParisData" class="btn btn-sm btn-outline-primary" :disabled="loadingParis">
              <i class="material-icons">refresh</i>
              {{ loadingParis ? 'Laden...' : 'Aktualisieren' }}
            </button>
          </div>
          <div class="card-body">
            <div v-if="loadingParis" class="text-center py-5">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Laden...</span>
              </div>
              <p class="mt-2">Lade PARIS Klassifikationsdaten...</p>
            </div>

            <div v-else-if="parisError" class="alert alert-danger">
              <h6>Fehler beim Laden der PARIS Daten:</h6>
              <p class="mb-0">{{ parisError }}</p>
            </div>

            <div v-else-if="parisData.length === 0" class="text-center py-5 text-muted">
              <i class="material-icons" style="font-size: 48px;">video_library</i>
              <p class="mt-2">Keine PARIS Klassifikationsdaten verfügbar</p>
            </div>

            <div v-else>
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>Video ID</th>
                      <th>Center</th>
                      <th>Processor</th>
                      <th>Polyp Segmente</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="video in parisData" :key="video.video_id">
                      <td>{{ video.video_id }}</td>
                      <td>{{ video.center_name || 'Unbekannt' }}</td>
                      <td>{{ video.processor_name || 'Unbekannt' }}</td>
                      <td>
                        <span class="badge bg-info">{{ video.polyp_segments.length }} Segmente</span>
                      </td>
                      <td>
                        <button 
                          @click="showParisDetails(video)" 
                          class="btn btn-sm btn-primary me-2"
                        >
                          <i class="material-icons">visibility</i>
                          Details
                        </button>
                        <button 
                          @click="classifyParis(video)" 
                          class="btn btn-sm btn-success"
                        >
                          <i class="material-icons">check_circle</i>
                          Klassifizieren
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
    </div>

    <!-- Details Modal -->
    <div 
      v-if="showDetailsModal" 
      class="modal fade show d-block" 
      tabindex="-1" 
      style="background: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ activeTab.toUpperCase() }} Klassifikation Details - Video {{ selectedVideo?.video_id }}
            </h5>
            <button 
              type="button" 
              class="btn-close" 
              @click="closeDetailsModal"
            ></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedVideo">
              <!-- Video Info -->
              <div class="row mb-4">
                <div class="col-md-6">
                  <h6>Video Informationen</h6>
                  <ul class="list-unstyled">
                    <li><strong>ID:</strong> {{ selectedVideo.video_id }}</li>
                    <li><strong>Center:</strong> {{ selectedVideo.center_name || 'Unbekannt' }}</li>
                    <li><strong>Processor:</strong> {{ selectedVideo.processor_name || 'Unbekannt' }}</li>
                    <li><strong>Frame Directory:</strong> {{ selectedVideo.frame_dir || 'Nicht verfügbar' }}</li>
                  </ul>
                </div>
                <div class="col-md-6">
                  <h6>Segmente Übersicht</h6>
                  <p><strong>Polyp Segmente:</strong> {{ selectedVideo.polyp_segments.length }}</p>
                </div>
              </div>

              <!-- Segments Details -->
              <div class="row">
                <div class="col-12">
                  <h6>Polyp Segmente</h6>
                  <div v-if="selectedVideo.polyp_segments.length === 0" class="text-muted">
                    Keine Polyp-Segmente verfügbar
                  </div>
                  <div v-else class="table-responsive">
                    <table class="table table-sm">
                      <thead>
                        <tr>
                          <th>Segment ID</th>
                          <th>Start Frame</th>
                          <th>End Frame</th>
                          <th>Start Zeit</th>
                          <th>End Zeit</th>
                          <th>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="segment in selectedVideo.polyp_segments" :key="segment.segment_id">
                          <td>{{ segment.segment_id }}</td>
                          <td>{{ segment.start_frame }}</td>
                          <td>{{ segment.end_frame }}</td>
                          <td>{{ formatTime(segment.start_time) }}</td>
                          <td>{{ formatTime(segment.end_time) }}</td>
                          <td>
                            <button 
                              @click="viewSegmentInPlayer(segment)" 
                              class="btn btn-sm btn-outline-primary"
                            >
                              <i class="material-icons">play_arrow</i>
                              Ansehen
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
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeDetailsModal">
              Schließen
            </button>
            <button 
              type="button" 
              class="btn btn-primary" 
              @click="startClassification"
            >
              {{ activeTab.toUpperCase() }} Klassifikation starten
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Classification Modal -->
    <div 
      v-if="showClassificationModal" 
      class="modal fade show d-block" 
      tabindex="-1" 
      style="background: rgba(0,0,0,0.5);"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ activeTab.toUpperCase() }} Klassifikation - Video {{ selectedVideo?.video_id }}
            </h5>
            <button 
              type="button" 
              class="btn-close" 
              @click="closeClassificationModal"
            ></button>
          </div>
          <div class="modal-body">
            <!-- NICE Classification Form -->
            <div v-if="activeTab === 'nice'">
              <h6>NICE Klassifikation</h6>
              <p class="text-muted">Bewerten Sie die Polypen nach den NICE Kriterien.</p>
              
              <div v-for="(segment, index) in selectedVideo?.polyp_segments" :key="segment.segment_id" class="mb-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="mb-0">
                      Segment {{ segment.segment_id }} 
                      ({{ formatTime(segment.start_time) }} - {{ formatTime(segment.end_time) }})
                    </h6>
                  </div>
                  <div class="card-body">
                    <div class="row">
                      <div class="col-md-6">
                        <label class="form-label">NICE Typ:</label>
                        <select 
                          v-model="classificationData.nice[segment.segment_id].type" 
                          class="form-select"
                        >
                          <option value="">Bitte wählen...</option>
                          <option value="1">NICE 1 (Hyperplastisch)</option>
                          <option value="2">NICE 2 (Adenomatös)</option>
                          <option value="3">NICE 3 (Tiefe Submuköse Invasion)</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Konfidenz:</label>
                        <select 
                          v-model="classificationData.nice[segment.segment_id].confidence" 
                          class="form-select"
                        >
                          <option value="">Bitte wählen...</option>
                          <option value="low">Niedrig</option>
                          <option value="high">Hoch</option>
                        </select>
                      </div>
                    </div>
                    <div class="row mt-3">
                      <div class="col-12">
                        <label class="form-label">Anmerkungen:</label>
                        <textarea 
                          v-model="classificationData.nice[segment.segment_id].notes" 
                          class="form-control"
                          rows="2"
                          placeholder="Zusätzliche Anmerkungen zur Klassifikation..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- PARIS Classification Form -->
            <div v-if="activeTab === 'paris'">
              <h6>PARIS Klassifikation</h6>
              <p class="text-muted">Bewerten Sie die Polypen nach den PARIS Kriterien.</p>
              
              <div v-for="(segment, index) in selectedVideo?.polyp_segments" :key="segment.segment_id" class="mb-4">
                <div class="card">
                  <div class="card-header">
                    <h6 class="mb-0">
                      Segment {{ segment.segment_id }} 
                      ({{ formatTime(segment.start_time) }} - {{ formatTime(segment.end_time) }})
                    </h6>
                  </div>
                  <div class="card-body">
                    <div class="row">
                      <div class="col-md-6">
                        <label class="form-label">PARIS Typ:</label>
                        <select 
                          v-model="classificationData.paris[segment.segment_id].type" 
                          class="form-select"
                        >
                          <option value="">Bitte wählen...</option>
                          <option value="Ip">Ip (Gestielt)</option>
                          <option value="Isp">Isp (Subgestielt)</option>
                          <option value="Is">Is (Sessil)</option>
                          <option value="IIa">IIa (Leicht erhaben)</option>
                          <option value="IIb">IIb (Flach)</option>
                          <option value="IIc">IIc (Leicht eingedrückt)</option>
                          <option value="III">III (Eingesunken)</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Größe (mm):</label>
                        <input 
                          type="number" 
                          v-model="classificationData.paris[segment.segment_id].size" 
                          class="form-control"
                          min="1"
                          max="100"
                          placeholder="Größe in mm"
                        >
                      </div>
                    </div>
                    <div class="row mt-3">
                      <div class="col-12">
                        <label class="form-label">Anmerkungen:</label>
                        <textarea 
                          v-model="classificationData.paris[segment.segment_id].notes" 
                          class="form-control"
                          rows="2"
                          placeholder="Zusätzliche Anmerkungen zur Klassifikation..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeClassificationModal">
              Abbrechen
            </button>
            <button 
              type="button" 
              class="btn btn-success" 
              @click="saveClassification"
              :disabled="!isClassificationValid"
            >
              <i class="material-icons">save</i>
              Klassifikation speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axiosInstance, { r } from '@/api/axiosInstance';

export default {
  name: 'VideoClassification',
  data() {
    return {
      activeTab: 'nice',
      niceData: [],
      parisData: [],
      loadingNice: false,
      loadingParis: false,
      niceError: null,
      parisError: null,
      showDetailsModal: false,
      showClassificationModal: false,
      selectedVideo: null,
      classificationData: {
        nice: {},
        paris: {}
      }
    };
  },
  computed: {
    isClassificationValid() {
      if (!this.selectedVideo) return false;
      
      const currentClassification = this.classificationData[this.activeTab];
      
      return this.selectedVideo.polyp_segments.every(segment => {
        const segmentData = currentClassification[segment.segment_id];
        if (!segmentData) return false;
        
        if (this.activeTab === 'nice') {
          return segmentData.type && segmentData.confidence;
        } else if (this.activeTab === 'paris') {
          return segmentData.type && segmentData.size;
        }
        
        return false;
      });
    }
  },
  methods: {
    setActiveTab(tab) {
      this.activeTab = tab;
      if (tab === 'nice' && this.niceData.length === 0) {
        this.loadNiceData();
      } else if (tab === 'paris' && this.parisData.length === 0) {
        this.loadParisData();
      }
    },
    async loadNiceData() {
      this.loadingNice = true;
      this.niceError = null;
      
      try {
        const response = await axiosInstance.get(r('videos/nice-classification/'));
        this.niceData = response.data || [];
        console.log('NICE data loaded:', this.niceData);
      } catch (error) {
        console.error('Error loading NICE data:', error);
        this.niceError = error.response?.data?.error || error.message || 'Unbekannter Fehler';
        this.niceData = [];
      } finally {
        this.loadingNice = false;
      }
    },
    async loadParisData() {
      this.loadingParis = true;
      this.parisError = null;
      
      try {
        const response = await axiosInstance.get(r('videos/paris-classification/'));
        this.parisData = response.data || [];
        console.log('PARIS data loaded:', this.parisData);
      } catch (error) {
        console.error('Error loading PARIS data:', error);
        this.parisError = error.response?.data?.error || error.message || 'Unbekannter Fehler';
        this.parisData = [];
      } finally {
        this.loadingParis = false;
      }
    },
    showNiceDetails(video) {
      this.selectedVideo = video;
      this.initializeClassificationData();
      this.showDetailsModal = true;
    },
    showParisDetails(video) {
      this.selectedVideo = video;
      this.initializeClassificationData();
      this.showDetailsModal = true;
    },
    classifyNice(video) {
      this.selectedVideo = video;
      this.initializeClassificationData();
      this.showClassificationModal = true;
    },
    classifyParis(video) {
      this.selectedVideo = video;
      this.initializeClassificationData();
      this.showClassificationModal = true;
    },
    initializeClassificationData() {
      if (!this.selectedVideo) return;
      
      // Initialize classification data for each segment
      this.selectedVideo.polyp_segments.forEach(segment => {
        if (!this.classificationData.nice[segment.segment_id]) {
          this.$set(this.classificationData.nice, segment.segment_id, {
            type: '',
            confidence: '',
            notes: ''
          });
        }
        if (!this.classificationData.paris[segment.segment_id]) {
          this.$set(this.classificationData.paris, segment.segment_id, {
            type: '',
            size: '',
            notes: ''
          });
        }
      });
    },
    closeDetailsModal() {
      this.showDetailsModal = false;
      this.selectedVideo = null;
    },
    closeClassificationModal() {
      this.showClassificationModal = false;
      this.selectedVideo = null;
    },
    startClassification() {
      this.showDetailsModal = false;
      this.showClassificationModal = true;
    },
    async saveClassification() {
      if (!this.isClassificationValid) {
        alert('Bitte füllen Sie alle erforderlichen Felder aus.');
        return;
      }
      
      try {
        const classificationType = this.activeTab;
        const videoId = this.selectedVideo.video_id;
        const segments = this.selectedVideo.polyp_segments;
        
        const classificationPayload = {
          video_id: videoId,
          classification_type: classificationType,
          segments: segments.map(segment => ({
            segment_id: segment.segment_id,
            ...this.classificationData[classificationType][segment.segment_id]
          }))
        };
        
        console.log('Saving classification:', classificationPayload);
        
        // This endpoint would need to be implemented in your backend
        await axiosInstance.post(r(`videos/${videoId}/classify/`), classificationPayload);
        
        alert(`${classificationType.toUpperCase()} Klassifikation erfolgreich gespeichert!`);
        this.closeClassificationModal();
        
        // Reload data to reflect changes
        if (classificationType === 'nice') {
          this.loadNiceData();
        } else {
          this.loadParisData();
        }
        
      } catch (error) {
        console.error('Error saving classification:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Unbekannter Fehler';
        alert(`Fehler beim Speichern: ${errorMessage}`);
      }
    },
    viewSegmentInPlayer(segment) {
      // Navigate to video player with specific segment
      this.$router.push({
        name: 'VideoExaminationAnnotation',
        query: {
          video_id: this.selectedVideo.video_id,
          start_time: segment.start_time,
          end_time: segment.end_time
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
    // Load NICE data by default
    this.loadNiceData();
  }
};
</script>

<style scoped>
.card {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.table th {
  background: #f8f9fa;
  font-weight: 600;
  border-top: none;
}

.badge {
  font-size: 0.75rem;
}

.modal {
  background: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  margin: 1.75rem auto;
}

.modal-content {
  border: none;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

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

.spinner-border {
  width: 3rem;
  height: 3rem;
}

.form-control:focus,
.form-select:focus {
  border-color: #5e72e4;
  box-shadow: 0 0 0 0.2rem rgba(94, 114, 228, 0.25);
}

.table-responsive {
  border-radius: 8px;
  overflow: hidden;
}

.list-unstyled li {
  margin-bottom: 0.5rem;
}

.text-muted {
  color: #6c757d !important;
}
</style>