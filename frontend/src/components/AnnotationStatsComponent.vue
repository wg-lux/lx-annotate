<template>
  <div class="annotation-stats-overview">
    <!-- Header with overall stats -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card bg-gradient-primary text-white">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-8">
                <h4 class="text-white mb-1">
                  <i class="fas fa-chart-pie me-2"></i>
                  Annotation Übersicht
                </h4>
                <p class="text-white opacity-8 mb-0">
                  Einheitliche Verfolgung aller Annotation-Typen
                </p>
              </div>
              <div class="col-4 text-end">
                <button 
                  class="btn btn-outline-light btn-sm"
                  @click="refreshStats"
                  :disabled="annotationStatsStore.isLoading"
                >
                  <i class="fas fa-sync-alt" :class="{ 'fa-spin': annotationStatsStore.isLoading }"></i>
                  Aktualisieren
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Overall Progress Bar -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <h6 class="card-title mb-3">
              <i class="fas fa-tasks me-2"></i>
              Gesamtfortschritt
            </h6>
            <div class="progress-container">
              <div class="progress mb-2" style="height: 30px;">
                <div 
                  class="progress-bar bg-success" 
                  role="progressbar" 
                  :style="{ width: annotationStatsStore.completionPercentage + '%' }"
                  :aria-valuenow="annotationStatsStore.completionPercentage"
                  aria-valuemin="0" 
                  aria-valuemax="100"
                >
                  <span class="progress-text">
                    {{ annotationStatsStore.completionPercentage }}% Abgeschlossen
                  </span>
                </div>
                <div 
                  class="progress-bar bg-info" 
                  role="progressbar" 
                  :style="{ width: annotationStatsStore.inProgressPercentage + '%' }"
                  :aria-valuenow="annotationStatsStore.inProgressPercentage"
                  aria-valuemin="0" 
                  aria-valuemax="100"
                >
                  <span class="progress-text">
                    {{ annotationStatsStore.inProgressPercentage }}% In Bearbeitung
                  </span>
                </div>
                <div 
                  class="progress-bar bg-warning" 
                  role="progressbar" 
                  :style="{ width: annotationStatsStore.pendingPercentage + '%' }"
                  :aria-valuenow="annotationStatsStore.pendingPercentage"
                  aria-valuemin="0" 
                  aria-valuemax="100"
                >
                  <span class="progress-text">
                    {{ annotationStatsStore.pendingPercentage }}% Ausstehend
                  </span>
                </div>
              </div>
              <div class="progress-legend d-flex justify-content-between">
                <small class="text-muted">
                  Total: {{ annotationStatsStore.stats.totalAnnotations }} Annotationen
                </small>
                <small class="text-muted">
                  Letzte Aktualisierung: {{ lastUpdateText }}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Cards -->
    <div class="row mb-4">
      <!-- Segment Annotations -->
      <div class="col-md-4 mb-3">
        <div class="card h-100 annotation-type-card" @click="navigateToSegments">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-0">
                <i class="fas fa-video me-2"></i>
                Video-Segmente
              </h6>
              <span class="badge bg-light text-primary">
                {{ segmentStats.total }}
              </span>
            </div>
          </div>
          <div class="card-body">
            <div class="stats-grid">
              <div class="stat-item pending">
                <div class="stat-icon">
                  <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ segmentStats.pending }}</div>
                  <div class="stat-label">Ausstehend</div>
                </div>
              </div>
              
              <div class="stat-item in-progress">
                <div class="stat-icon">
                  <i class="fas fa-cogs"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ segmentStats.inProgress }}</div>
                  <div class="stat-label">In Bearbeitung</div>
                </div>
              </div>
              
              <div class="stat-item completed">
                <div class="stat-icon">
                  <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ segmentStats.completed }}</div>
                  <div class="stat-label">Abgeschlossen</div>
                </div>
              </div>
            </div>
            
            <!-- Mini progress bar -->
            <div class="mini-progress mt-3">
              <div class="progress" style="height: 6px;">
                <div 
                  class="progress-bar bg-success" 
                  :style="{ width: getCompletionPercentage(segmentStats) + '%' }"
                ></div>
              </div>
              <small class="text-muted mt-1 d-block">
                {{ getCompletionPercentage(segmentStats) }}% abgeschlossen
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Examination Annotations -->
      <div class="col-md-4 mb-3">
        <div class="card h-100 annotation-type-card" @click="navigateToExaminations">
          <div class="card-header bg-success text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-0">
                <i class="fas fa-stethoscope me-2"></i>
                Untersuchungen
              </h6>
              <span class="badge bg-light text-success">
                {{ examinationStats.total }}
              </span>
            </div>
          </div>
          <div class="card-body">
            <div class="stats-grid">
              <div class="stat-item pending">
                <div class="stat-icon">
                  <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ examinationStats.pending }}</div>
                  <div class="stat-label">Ausstehend</div>
                </div>
              </div>
              
              <div class="stat-item in-progress">
                <div class="stat-icon">
                  <i class="fas fa-cogs"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ examinationStats.inProgress }}</div>
                  <div class="stat-label">In Bearbeitung</div>
                </div>
              </div>
              
              <div class="stat-item completed">
                <div class="stat-icon">
                  <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ examinationStats.completed }}</div>
                  <div class="stat-label">Abgeschlossen</div>
                </div>
              </div>
            </div>
            
            <!-- Mini progress bar -->
            <div class="mini-progress mt-3">
              <div class="progress" style="height: 6px;">
                <div 
                  class="progress-bar bg-success" 
                  :style="{ width: getCompletionPercentage(examinationStats) + '%' }"
                ></div>
              </div>
              <small class="text-muted mt-1 d-block">
                {{ getCompletionPercentage(examinationStats) }}% abgeschlossen
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Sensitive Meta Annotations -->
      <div class="col-md-4 mb-3">
        <div class="card h-100 annotation-type-card" @click="navigateToSensitiveMeta">
          <div class="card-header bg-warning text-dark">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-0">
                <i class="fas fa-user-shield me-2"></i>
                Patientendaten
              </h6>
              <span class="badge bg-dark text-warning">
                {{ sensitiveMetaStats.total }}
              </span>
            </div>
          </div>
          <div class="card-body">
            <div class="stats-grid">
              <div class="stat-item pending">
                <div class="stat-icon">
                  <i class="fas fa-clock"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ sensitiveMetaStats.pending }}</div>
                  <div class="stat-label">Ausstehend</div>
                </div>
              </div>
              
              <div class="stat-item in-progress">
                <div class="stat-icon">
                  <i class="fas fa-cogs"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ sensitiveMetaStats.inProgress }}</div>
                  <div class="stat-label">In Bearbeitung</div>
                </div>
              </div>
              
              <div class="stat-item completed">
                <div class="stat-icon">
                  <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ sensitiveMetaStats.completed }}</div>
                  <div class="stat-label">Abgeschlossen</div>
                </div>
              </div>
            </div>
            
            <!-- Mini progress bar -->
            <div class="mini-progress mt-3">
              <div class="progress" style="height: 6px;">
                <div 
                  class="progress-bar bg-success" 
                  :style="{ width: getCompletionPercentage(sensitiveMetaStats) + '%' }"
                ></div>
              </div>
              <small class="text-muted mt-1 d-block">
                {{ getCompletionPercentage(sensitiveMetaStats) }}% abgeschlossen
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Action Summary -->
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h6 class="mb-0">
              <i class="fas fa-bolt me-2"></i>
              Schnellaktionen
            </h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-4">
                <div class="quick-action-item" @click="navigateToFrameAnnotation">
                  <div class="action-icon bg-primary">
                    <i class="fas fa-plus"></i>
                  </div>
                  <div class="action-content">
                    <h6>Neue Video-Annotation</h6>
                    <small class="text-muted">Frame-Annotation starten</small>
                  </div>
                </div>
              </div>
              
              <div class="col-md-4">
                <div class="quick-action-item" @click="navigateToExamination">
                  <div class="action-icon bg-success">
                    <i class="fas fa-plus"></i>
                  </div>
                  <div class="action-content">
                    <h6>Neue Untersuchung</h6>
                    <small class="text-muted">Untersuchung erstellen</small>
                  </div>
                </div>
              </div>
              
              <div class="col-md-4">
                <div class="quick-action-item" @click="navigateToValidation">
                  <div class="action-icon bg-warning">
                    <i class="fas fa-play"></i>
                  </div>
                  <div class="action-content">
                    <h6>Validierung starten</h6>
                    <small class="text-muted">Patientendaten validieren</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="annotationStatsStore.hasError" class="alert alert-danger mt-3">
      <i class="fas fa-exclamation-triangle me-2"></i>
      <strong>Fehler beim Laden der Statistiken:</strong>
      {{ annotationStatsStore.error }}
      <button 
        type="button" 
        class="btn-close" 
        @click="annotationStatsStore.clearError()"
      ></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnotationStatsStore } from '@/stores/annotationStats';

const router = useRouter();
const annotationStatsStore = useAnnotationStatsStore();

// Computed properties for individual stats
const segmentStats = computed(() => ({
  pending: annotationStatsStore.stats.segmentPending,
  inProgress: annotationStatsStore.stats.segmentInProgress,
  completed: annotationStatsStore.stats.segmentCompleted,
  total: annotationStatsStore.stats.segmentPending + 
         annotationStatsStore.stats.segmentInProgress + 
         annotationStatsStore.stats.segmentCompleted
}));

const examinationStats = computed(() => ({
  pending: annotationStatsStore.stats.examinationPending,
  inProgress: annotationStatsStore.stats.examinationInProgress,
  completed: annotationStatsStore.stats.examinationCompleted,
  total: annotationStatsStore.stats.examinationPending + 
         annotationStatsStore.stats.examinationInProgress + 
         annotationStatsStore.stats.examinationCompleted
}));

const sensitiveMetaStats = computed(() => ({
  pending: annotationStatsStore.stats.sensitiveMetaPending,
  inProgress: annotationStatsStore.stats.sensitiveMetaInProgress,
  completed: annotationStatsStore.stats.sensitiveMetaCompleted,
  total: annotationStatsStore.stats.sensitiveMetaPending + 
         annotationStatsStore.stats.sensitiveMetaInProgress + 
         annotationStatsStore.stats.sensitiveMetaCompleted
}));

const lastUpdateText = computed(() => {
  if (!annotationStatsStore.lastUpdated) return 'Nie';
  
  const now = new Date();
  const diff = now.getTime() - annotationStatsStore.lastUpdated.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag(en)`;
});

// Helper methods
const getCompletionPercentage = (stats: { pending: number; inProgress: number; completed: number; total: number }) => {
  return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
};

const refreshStats = async () => {
  await annotationStatsStore.forceRefresh();
};

// Navigation methods
const navigateToSegments = () => {
  // Scroll to segments section in the same dashboard
  const segmentSection = document.querySelector('[data-section="segments"]');
  if (segmentSection) {
    segmentSection.scrollIntoView({ behavior: 'smooth' });
  } else {
    router.push('/segments');
  }
};

const navigateToExaminations = () => {
  router.push('/examinations');
};

const navigateToSensitiveMeta = () => {
  router.push('/sensitive-meta');
};

const navigateToFrameAnnotation = () => {
  router.push('/frame-annotation');
};

const navigateToExamination = () => {
  router.push('/examination/new');
};

const navigateToValidation = () => {
  router.push('/validation');
};

// Load stats on component mount
onMounted(async () => {
    // Stats will be loaded automatically by the store
    // or call the correct method if it exists, e.g.:
    // await annotationStatsStore.loadStats();
});
</script>

<style scoped>
.annotation-stats-overview {
  padding: 20px;
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.annotation-type-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.annotation-type-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background: #f8f9fa;
}

.stat-item.pending {
  border-left: 4px solid #ffc107;
}

.stat-item.in-progress {
  border-left: 4px solid #17a2b8;
}

.stat-item.completed {
  border-left: 4px solid #28a745;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: white;
  font-size: 16px;
}

.stat-item.pending .stat-icon {
  background: #ffc107;
}

.stat-item.in-progress .stat-icon {
  background: #17a2b8;
}

.stat-item.completed .stat-icon {
  background: #28a745;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  margin-top: 2px;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
}

.quick-action-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-radius: 8px;
  background: #f8f9fa;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 10px;
}

.quick-action-item:hover {
  background: #e9ecef;
}

.action-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: white;
  font-size: 18px;
}

.action-content h6 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.mini-progress .progress {
  border-radius: 3px;
}
</style>