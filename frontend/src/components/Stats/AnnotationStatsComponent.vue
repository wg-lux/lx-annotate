<template>
  <div class="annotation-stats-overview">
    <!-- Loading State -->
    <div v-if="annotationStatsStore.isLoading && !hasAnyData" class="dashboard-loading-state py-4">
      <div class="skeleton-title mb-3"></div>
      <div class="row g-3 mb-3">
        <div class="col-md-4" v-for="n in 3" :key="`overview-skeleton-${n}`">
          <div class="skeleton-card"></div>
        </div>
      </div>
      <div class="skeleton-row"></div>
      <p class="mt-3 text-muted">Statistiken werden geladen...</p>
    </div>

    <!-- Main Content -->
    <div v-else>
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
                    Aktuell verfügbare Annotationen und deren Fortschritt
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

      <div class="row mb-4 g-3">
        <div class="col-lg-8">
          <div class="card player-card h-100">
            <div class="card-body">
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                  <div class="player-kicker">Dein Fortschritt</div>
                  <h5 class="player-title mb-1">Level {{ currentLevel }}</h5>
                  <p class="text-muted mb-2">{{ points }} XP gesammelt · {{ pointsToNextLevel }} XP bis zum nächsten Level</p>
                </div>
                <div class="achievement-pill">
                  <i class="fas fa-award me-2"></i>
                  {{ unlockedAchievementsCount }} Erfolge
                </div>
              </div>

              <div class="level-progress mt-3">
                <div class="d-flex justify-content-between small text-muted mb-1">
                  <span>Level-Fortschritt</span>
                  <span>{{ levelProgress }}%</span>
                </div>
                <div class="progress" style="height: 12px;">
                  <div class="progress-bar bg-success" :style="{ width: levelProgress + '%' }"></div>
                </div>
              </div>

              <div class="mt-3 d-flex flex-wrap gap-2">
                <span
                  v-for="badge in unlockedAchievements"
                  :key="badge"
                  class="badge text-bg-light achievement-badge"
                >
                  <i class="fas fa-star me-1"></i>{{ badge }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card mission-card h-100">
            <div class="card-body">
              <div class="player-kicker">Mission des Tages</div>
              <h6 class="mission-title mt-1 mb-2">{{ focusMission.title }}</h6>
              <p class="text-muted small mb-3">{{ focusMission.description }}</p>
              <div class="progress mb-2" style="height: 10px;">
                <div class="progress-bar bg-info" :style="{ width: focusMission.progress + '%' }"></div>
              </div>
              <div class="d-flex justify-content-between align-items-center small">
                <span class="text-muted">Fortschritt</span>
                <span class="fw-semibold">{{ focusMission.progress }}%</span>
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
                    :style="{ width: completionPercentage + '%' }"
                    :aria-valuenow="completionPercentage"
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    <span class="progress-text">
                      {{ completionPercentage }}% Abgeschlossen
                    </span>
                  </div>
                  <div 
                    class="progress-bar bg-info" 
                    role="progressbar" 
                    :style="{ width: inProgressPercentage + '%' }"
                    :aria-valuenow="inProgressPercentage"
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    <span class="progress-text">
                      {{ inProgressPercentage }}% In Bearbeitung
                    </span>
                  </div>
                  <div 
                    class="progress-bar bg-warning" 
                    role="progressbar" 
                    :style="{ width: pendingPercentage + '%' }"
                    :aria-valuenow="pendingPercentage"
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    <span class="progress-text">
                      {{ pendingPercentage }}% Ausstehend
                    </span>
                  </div>
                </div>
                <div class="progress-legend d-flex justify-content-between">
                  <small class="text-muted">
                    Insgesamt: {{ totalAnnotations }} Annotationen
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
                      <h6>Neue Befundung</h6>
                      <small class="text-muted">Reporting-Fall-Setup oeffnen</small>
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
import { computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnotationStatsStore } from '@/stores/annotationStats';

const router = useRouter();
const annotationStatsStore = useAnnotationStatsStore();

// Enhanced computed properties with fallback values
const segmentStats = computed(() => ({
  pending: annotationStatsStore.stats.segmentPending || 0,
  inProgress: annotationStatsStore.stats.segmentInProgress || 0,
  completed: annotationStatsStore.stats.segmentCompleted || 0,
  total: (annotationStatsStore.stats.segmentPending || 0) + 
         (annotationStatsStore.stats.segmentInProgress || 0) + 
         (annotationStatsStore.stats.segmentCompleted || 0)
}));

const examinationStats = computed(() => ({
  pending: annotationStatsStore.stats.examinationPending || 0,
  inProgress: annotationStatsStore.stats.examinationInProgress || 0,
  completed: annotationStatsStore.stats.examinationCompleted || 0,
  total: (annotationStatsStore.stats.examinationPending || 0) + 
         (annotationStatsStore.stats.examinationInProgress || 0) + 
         (annotationStatsStore.stats.examinationCompleted || 0)
}));

const sensitiveMetaStats = computed(() => ({
  pending: annotationStatsStore.stats.sensitiveMetaPending || 0,
  inProgress: annotationStatsStore.stats.sensitiveMetaInProgress || 0,
  completed: annotationStatsStore.stats.sensitiveMetaCompleted || 0,
  total: (annotationStatsStore.stats.sensitiveMetaPending || 0) + 
         (annotationStatsStore.stats.sensitiveMetaInProgress || 0) + 
         (annotationStatsStore.stats.sensitiveMetaCompleted || 0)
}));

// Global computed properties for the main progress bar
const completionPercentage = computed(() => {
  return annotationStatsStore.completionPercentage || 0;
});

const inProgressPercentage = computed(() => {
  return annotationStatsStore.inProgressPercentage || 0;
});

const pendingPercentage = computed(() => {
  return annotationStatsStore.pendingPercentage || 0;
});

const totalAnnotations = computed(() => {
  return annotationStatsStore.stats.totalAnnotations || 0;
});

const points = computed(() => {
  const completed =
    segmentStats.value.completed * 5 +
    examinationStats.value.completed * 8 +
    sensitiveMetaStats.value.completed * 6

  const inProgress =
    segmentStats.value.inProgress * 2 +
    examinationStats.value.inProgress * 3 +
    sensitiveMetaStats.value.inProgress * 2

  return completed + inProgress
})

const POINTS_PER_LEVEL = 120

const currentLevel = computed(() => Math.max(1, Math.floor(points.value / POINTS_PER_LEVEL) + 1))
const pointsToNextLevel = computed(() => POINTS_PER_LEVEL - (points.value % POINTS_PER_LEVEL || 0))
const levelProgress = computed(() => Math.min(100, Math.round(((points.value % POINTS_PER_LEVEL) / POINTS_PER_LEVEL) * 100)))

const unlockedAchievements = computed(() => {
  const unlocked: string[] = []

  if (totalCompleted.value >= 1) unlocked.push('Erster Abschluss')
  if (totalCompleted.value >= 10) unlocked.push('Konstant geliefert')
  if (completionPercentage.value >= 50) unlocked.push('Halbzeit-Champion')
  if (segmentStats.value.completed >= 20) unlocked.push('Segment-Profi')
  if (examinationStats.value.completed >= 10) unlocked.push('Befundungs-Profi')
  if (sensitiveMetaStats.value.completed >= 10) unlocked.push('Datenschutz-Held')

  return unlocked
})

const unlockedAchievementsCount = computed(() => unlockedAchievements.value.length)

const totalCompleted = computed(() => annotationStatsStore.stats.totalCompleted || 0)

const focusMission = computed(() => {
  const candidates = [
    {
      key: 'segments',
      pending: segmentStats.value.pending,
      title: 'Video-Segmente klären',
      description: 'Reduziere offene Segmente, um die Pipeline zu entlasten.',
      progress: getCompletionPercentage(segmentStats.value),
    },
    {
      key: 'examinations',
      pending: examinationStats.value.pending,
      title: 'Befundungen abschließen',
      description: 'Führe offene Untersuchungen zu einem dokumentierten Abschluss.',
      progress: getCompletionPercentage(examinationStats.value),
    },
    {
      key: 'sensitive',
      pending: sensitiveMetaStats.value.pending,
      title: 'Patientendaten validieren',
      description: 'Verringere offene Validierungen für einen sicheren Datenfluss.',
      progress: getCompletionPercentage(sensitiveMetaStats.value),
    },
  ]

  const top = candidates.sort((a, b) => b.pending - a.pending)[0]
  if (!top || top.pending <= 0) {
    return {
      title: 'Stabil halten',
      description: 'Alles sieht gut aus. Heute Fokus auf Qualitätskontrolle und Feinschliff.',
      progress: 100,
    }
  }
  return top
})

// Check if we have any data to show
const hasAnyData = computed(() => {
  return annotationStatsStore.stats.totalAnnotations > 0 || 
         annotationStatsStore.lastUpdated !== null;
});

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
const getCompletionPercentage = (stats: { pending: number; inProgress: number; completed: number; total: number }): number => {
  return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
};

const refreshStats = async (): Promise<void> => {
  try {
    await annotationStatsStore.forceRefresh();
  } catch (error) {
    console.error('Failed to refresh stats:', error);
  }
};

// Navigation methods
const navigateToSegments = (): void => {
  router.push('/video-untersuchung')
};

const navigateToExaminations = (): void => {
  router.push('/reporting/case-setup')
};

const navigateToSensitiveMeta = (): void => {
  router.push('/anonymisierung/validierung')
};

const navigateToFrameAnnotation = (): void => {
  router.push('/frame-annotation');
};

const navigateToExamination = (): void => {
  router.push('/reporting/case-setup')
};

const navigateToValidation = (): void => {
  router.push('/anonymisierung/validierung')
};

// Load stats on component mount and watch for changes
onMounted(async () => {
  await annotationStatsStore.fetchAnnotationStats();
});

// Auto-refresh when needed
watch(() => annotationStatsStore.needsRefresh, async (needsRefresh) => {
  if (needsRefresh) {
    await annotationStatsStore.refreshIfNeeded();
  }
});
</script>

<style scoped>
.annotation-stats-overview {
  padding: 0;
}

.player-card,
.mission-card {
  border: 1px solid rgba(45, 48, 71, 0.1);
  box-shadow: 0 12px 26px rgba(19, 30, 53, 0.08);
  border-radius: 12px;
}

.player-kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #596780;
  font-weight: 700;
}

.player-title {
  font-weight: 700;
  color: #2d3047;
}

.achievement-pill {
  background: linear-gradient(135deg, #fff6d6 0%, #ffe9a9 100%);
  border: 1px solid rgba(166, 124, 0, 0.25);
  color: #7a5a00;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-weight: 700;
  font-size: 0.82rem;
}

.achievement-badge {
  border: 1px solid rgba(45, 48, 71, 0.12);
  color: #344767;
  background: linear-gradient(180deg, #ffffff 0%, #f4f7fc 100%) !important;
}

.mission-card {
  background: linear-gradient(180deg, #fcfdff 0%, #f6faff 100%);
}

.mission-title {
  font-size: 1.03rem;
  font-weight: 700;
  color: #344767;
}

.bg-gradient-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.annotation-type-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  border: 1px solid rgba(45, 48, 71, 0.08);
  box-shadow: 0 10px 24px rgba(19, 30, 53, 0.06);
}

.annotation-type-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(19, 30, 53, 0.12);
  border-color: rgba(45, 48, 71, 0.18);
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
  background: linear-gradient(180deg, #f8fafc 0%, #edf2f8 100%);
  border: 1px solid rgba(45, 48, 71, 0.08);
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  margin-bottom: 10px;
}

.quick-action-item:hover {
  background: linear-gradient(180deg, #ffffff 0%, #edf2f8 100%);
  box-shadow: 0 10px 20px rgba(19, 30, 53, 0.1);
  border-color: rgba(45, 48, 71, 0.2);
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

.dashboard-loading-state {
  border: 1px solid rgba(45, 48, 71, 0.08);
  border-radius: 12px;
  background: #fff;
  padding: 1rem;
}

.skeleton-title,
.skeleton-card,
.skeleton-row {
  background: linear-gradient(90deg, #eef2f7 0%, #e4ebf5 50%, #eef2f7 100%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.35s linear infinite;
  border-radius: 10px;
}

.skeleton-title {
  height: 28px;
  width: 42%;
}

.skeleton-card {
  height: 132px;
}

.skeleton-row {
  height: 84px;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
