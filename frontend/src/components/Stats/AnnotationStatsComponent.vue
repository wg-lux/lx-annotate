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
                    <i class="ni ni-chart-bar-32 me-2"></i>
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
                    <i class="ni ni-bold-right" :class="{ 'ni-spin': annotationStatsStore.isLoading }"></i>
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
                  <i class="ni ni-chart-bar-32 me-2"></i>
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
                  <i class="ni ni-chart-bar-32 me-1"></i>{{ badge }}
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
              <div class="overall-progress-header d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                  <div class="player-kicker">Gesamtstatus</div>
                  <h6 class="overall-progress-title mb-1">
                    <i class="ni ni-single-copy-04 me-2"></i>
                    Alle Annotationstypen
                  </h6>
                  <p class="text-muted mb-0">
                    Video-Segmente, Untersuchungen und Patientendaten
                  </p>
                </div>
                <div class="overall-completion text-end">
                  <div class="overall-completion-value">{{ completionPercentage }}%</div>
                  <div class="overall-completion-label">abgeschlossen</div>
                </div>
              </div>

              <div class="overall-status-strip mt-3">
                <div
                  v-for="item in overallStatusItems"
                  :key="item.key"
                  class="overall-status-item"
                  :class="item.key"
                >
                  <span class="overall-status-dot" aria-hidden="true"></span>
                  <span class="overall-status-label">{{ item.label }}</span>
                  <strong>{{ item.count }}</strong>
                  <small>{{ item.percentage }}%</small>
                </div>
              </div>

              <div class="progress-container mt-3">
                <div
                  v-if="totalAnnotations > 0"
                  class="progress overall-progress-meter mb-2"
                  aria-label="Gesamtstatus aller Annotationstypen"
                >
                  <div
                    v-for="item in overallStatusItems"
                    :key="`bar-${item.key}`"
                    class="progress-bar"
                    :class="item.barClass"
                    role="progressbar"
                    :style="{ width: item.percentage + '%' }"
                    :aria-valuenow="item.percentage"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    :aria-label="`${item.label}: ${item.count} von ${totalAnnotations}`"
                  ></div>
                </div>
                <div v-else class="overall-empty-progress mb-2">
                  Noch keine Statistikdaten verfügbar
                </div>

                <div class="overall-progress-context d-flex flex-wrap justify-content-between gap-2">
                  <small class="text-muted">
                    {{ completedOfTotalText }}
                  </small>
                  <small class="text-muted">
                    Letzte Aktualisierung: {{ lastUpdateText }}
                  </small>
                </div>
                <div class="overall-progress-note mt-2">
                  {{ overallStatusDescription }}
                  <span v-if="topOpenAreaText">Nächster Fokus: {{ topOpenAreaText }}</span>
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
                  <i class="ni ni-button-play me-2"></i>
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
                    <i class="ni ni-user-run"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number">{{ segmentStats.pending }}</div>
                    <div class="stat-label">Ausstehend</div>
                  </div>
                </div>
                
                <div class="stat-item in-progress">
                  <div class="stat-icon">
                    <i class="ni ni-settings-gear-65"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number">{{ segmentStats.inProgress }}</div>
                    <div class="stat-label">In Bearbeitung</div>
                  </div>
                </div>
                
                <div class="stat-item completed">
                  <div class="stat-icon">
                    <i class="ni ni-check-bold"></i>
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
                  <i class="ni ni-user-run me-2"></i>
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
                    <i class="ni ni-user-run"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number">{{ examinationStats.pending }}</div>
                    <div class="stat-label">Ausstehend</div>
                  </div>
                </div>
                
                <div class="stat-item in-progress">
                  <div class="stat-icon">
                    <i class="ni ni-settings-gear-65"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number">{{ examinationStats.inProgress }}</div>
                    <div class="stat-label">In Bearbeitung</div>
                  </div>
                </div>
                
                <div class="stat-item completed">
                  <div class="stat-icon">
                    <i class="ni ni-check-bold"></i>
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
                  <i class="ni ni-check-bold me-2"></i>
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
                    <i class="ni ni-user-run"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number">{{ sensitiveMetaStats.pending }}</div>
                    <div class="stat-label">Ausstehend</div>
                  </div>
                </div>
                
                <div class="stat-item in-progress">
                  <div class="stat-icon">
                    <i class="ni ni-settings-gear-65"></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number">{{ sensitiveMetaStats.inProgress }}</div>
                    <div class="stat-label">In Bearbeitung</div>
                  </div>
                </div>
                
                <div class="stat-item completed">
                  <div class="stat-icon">
                    <i class="ni ni-check-bold"></i>
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
                <i class="ni ni-chart-bar-32 me-2"></i>
                Schnellaktionen
              </h6>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-4">
                  <div class="quick-action-item" @click="navigateToFrameAnnotation">
                    <div class="action-icon bg-primary">
                      <i class="ni ni-fat-add"></i>
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
                      <i class="ni ni-fat-add"></i>
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
                      <i class="ni ni-button-play"></i>
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
      <i class="ni ni-user-run me-2"></i>
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

const emptyStats = {
  segmentPending: 0,
  segmentInProgress: 0,
  segmentCompleted: 0,
  examinationPending: 0,
  examinationInProgress: 0,
  examinationCompleted: 0,
  sensitiveMetaPending: 0,
  sensitiveMetaInProgress: 0,
  sensitiveMetaCompleted: 0,
  totalPending: 0,
  totalInProgress: 0,
  totalCompleted: 0,
  totalAnnotations: 0
}

const stats = computed(() => annotationStatsStore.stats || emptyStats)

// Enhanced computed properties with fallback values
const segmentStats = computed(() => ({
  pending: stats.value.segmentPending || 0,
  inProgress: stats.value.segmentInProgress || 0,
  completed: stats.value.segmentCompleted || 0,
  total: (stats.value.segmentPending || 0) + 
         (stats.value.segmentInProgress || 0) + 
         (stats.value.segmentCompleted || 0)
}));

const examinationStats = computed(() => ({
  pending: stats.value.examinationPending || 0,
  inProgress: stats.value.examinationInProgress || 0,
  completed: stats.value.examinationCompleted || 0,
  total: (stats.value.examinationPending || 0) + 
         (stats.value.examinationInProgress || 0) + 
         (stats.value.examinationCompleted || 0)
}));

const sensitiveMetaStats = computed(() => ({
  pending: stats.value.sensitiveMetaPending || 0,
  inProgress: stats.value.sensitiveMetaInProgress || 0,
  completed: stats.value.sensitiveMetaCompleted || 0,
  total: (stats.value.sensitiveMetaPending || 0) + 
         (stats.value.sensitiveMetaInProgress || 0) + 
         (stats.value.sensitiveMetaCompleted || 0)
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
  return stats.value.totalAnnotations || 0;
});

const totalInProgress = computed(() => stats.value.totalInProgress || 0)

const totalPending = computed(() => stats.value.totalPending || 0)

const totalCompleted = computed(() => stats.value.totalCompleted || 0)

const openAnnotationCount = computed(() => totalInProgress.value + totalPending.value)

const overallStatusItems = computed(() => [
  {
    key: 'completed',
    label: 'Abgeschlossen',
    count: totalCompleted.value,
    percentage: completionPercentage.value,
    barClass: 'bg-success',
  },
  {
    key: 'in-progress',
    label: 'In Bearbeitung',
    count: totalInProgress.value,
    percentage: inProgressPercentage.value,
    barClass: 'bg-info',
  },
  {
    key: 'pending',
    label: 'Ausstehend',
    count: totalPending.value,
    percentage: pendingPercentage.value,
    barClass: 'bg-warning',
  },
])

const completedOfTotalText = computed(() => {
  if (totalAnnotations.value === 0) return 'Keine Annotationen gezählt'
  return `${totalCompleted.value} von ${totalAnnotations.value} Annotationen abgeschlossen`
})

const overallStatusDescription = computed(() => {
  if (totalAnnotations.value === 0) {
    return 'Wartet auf Statistikdaten für die zusammengefasste Arbeitsliste.'
  }

  if (openAnnotationCount.value === 0) {
    return 'Alle gezählten Annotationen sind abgeschlossen.'
  }

  if (totalInProgress.value > 0 && totalPending.value > 0) {
    return `${openAnnotationCount.value} Annotationen sind noch offen: ${totalInProgress.value} in Bearbeitung, ${totalPending.value} ausstehend.`
  }

  if (totalInProgress.value > 0) {
    return `${totalInProgress.value} Annotationen sind aktuell in Bearbeitung.`
  }

  return `${totalPending.value} Annotationen warten noch auf Bearbeitung.`
})

const topOpenAreaText = computed(() => {
  if (totalAnnotations.value === 0 || openAnnotationCount.value === 0) return ''

  const areas = [
    {
      label: 'Video-Segmente',
      open: segmentStats.value.pending + segmentStats.value.inProgress,
    },
    {
      label: 'Untersuchungen',
      open: examinationStats.value.pending + examinationStats.value.inProgress,
    },
    {
      label: 'Patientendaten',
      open: sensitiveMetaStats.value.pending + sensitiveMetaStats.value.inProgress,
    },
  ]

  const top = areas.sort((a, b) => b.open - a.open)[0]
  if (!top || top.open === 0) return ''
  return `${top.label} (${top.open} offen)`
})

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
  return stats.value.totalAnnotations > 0 || 
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
    if (typeof annotationStatsStore.forceRefresh === 'function') {
      await annotationStatsStore.forceRefresh();
    }
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
  if (typeof annotationStatsStore.fetchAnnotationStats === 'function') {
    await annotationStatsStore.fetchAnnotationStats();
  }
});

// Auto-refresh when needed
watch(() => annotationStatsStore.needsRefresh, async (needsRefresh) => {
  if (needsRefresh && typeof annotationStatsStore.refreshIfNeeded === 'function') {
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

.overall-progress-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #344767;
}

.overall-completion-value {
  color: #1f7a3f;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.overall-completion-label {
  color: #596780;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
}

.overall-status-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid rgba(45, 48, 71, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.overall-status-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  padding: 0.75rem 0.85rem;
  background: #fff;
  border-right: 1px solid rgba(45, 48, 71, 0.08);
}

.overall-status-item:last-child {
  border-right: 0;
}

.overall-status-label {
  min-width: 0;
  color: #344767;
  font-size: 0.9rem;
  font-weight: 700;
}

.overall-status-item strong {
  color: #2d3047;
  font-size: 1.15rem;
  line-height: 1;
}

.overall-status-item small {
  grid-column: 2 / 4;
  color: #667085;
  font-weight: 600;
}

.overall-status-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
}

.overall-status-item.completed .overall-status-dot {
  background: #28a745;
}

.overall-status-item.in-progress .overall-status-dot {
  background: #17a2b8;
}

.overall-status-item.pending .overall-status-dot {
  background: #ffc107;
}

.overall-progress-meter {
  height: 14px;
  border-radius: 999px;
  background: #e9eef5;
}

.overall-empty-progress {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 0.75rem;
  border-radius: 8px;
  background: #f4f7fb;
  color: #667085;
  font-size: 0.88rem;
  font-weight: 600;
}

.overall-progress-note {
  padding: 0.75rem 0.85rem;
  border-radius: 8px;
  background: #f8fafc;
  color: #344767;
  font-size: 0.9rem;
  font-weight: 600;
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

@media (max-width: 767.98px) {
  .overall-status-strip {
    grid-template-columns: 1fr;
  }

  .overall-status-item {
    border-right: 0;
    border-bottom: 1px solid rgba(45, 48, 71, 0.08);
  }

  .overall-status-item:last-child {
    border-bottom: 0;
  }

  .overall-completion {
    text-align: left !important;
  }
}
</style>
