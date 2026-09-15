<template>
  <div class="annotation-stats-overview">
    <!-- Loading State -->
    <div
      v-if="annotationStatsStore.isLoading && !hasAnyData"
      class="dashboard-loading-state py-4"
    >
      <div class="skeleton-title mb-3"></div>
      <div class="row g-3 mb-3">
        <div
          v-for="n in 3"
          :key="`overview-skeleton-${n}`"
          class="col-md-4"
        >
          <div class="skeleton-card"></div>
        </div>
      </div>
      <div class="skeleton-row"></div>
      <p class="mt-3 text-muted">Statistiken werden geladen...</p>
    </div>

    <div
      v-else-if="hasBlockingError"
      class="alert alert-danger annotation-stats-unavailable"
      data-test="annotation-stats-unavailable"
      role="alert"
    >
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <strong>Statistiken sind derzeit nicht verfügbar.</strong>
          <div class="mt-1">
            Es werden keine Zähler angezeigt, bis eine vollständige Aktualisierung erfolgreich war.
          </div>
          <small class="d-block mt-2">{{ annotationStatsStore.error }}</small>
        </div>
        <button
          type="button"
          class="btn btn-outline-light btn-sm"
          :disabled="annotationStatsStore.isLoading"
          @click="refreshStats"
        >
          Erneut versuchen
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else>
      <div
        v-if="navigationError"
        class="alert alert-danger"
        data-test="annotation-stats-navigation-error"
        role="alert"
      >
        {{ navigationError }}
      </div>
      <div
        v-if="hasStaleError"
        class="alert alert-warning annotation-stats-stale"
        data-test="annotation-stats-stale"
        role="status"
      >
        <strong>Die Statistik konnte nicht aktualisiert werden.</strong>
        Angezeigt wird der letzte erfolgreiche Stand ({{ lastUpdateText }}).
        <button
          type="button"
          class="btn btn-outline-dark btn-sm ms-2"
          :disabled="annotationStatsStore.isLoading"
          @click="refreshStats"
        >
          Erneut versuchen
        </button>
      </div>
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
                    :disabled="annotationStatsStore.isLoading"
                    @click="refreshStats"
                  >
                    <i
                      class="ni ni-bold-right"
                      :class="{ 'ni-spin': annotationStatsStore.isLoading }"
                    ></i>
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
                  <p class="text-muted mb-2">
                    {{ points }} XP gesammelt · {{ pointsToNextLevel }} XP bis zum nächsten Level
                  </p>
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
                <div class="progress level-progress-meter">
                  <div
                    class="progress-bar bg-success"
                    :style="{ width: levelProgress + '%' }"
                  ></div>
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
              <div class="progress mb-2 mission-progress-meter">
                <div
                  class="progress-bar bg-info"
                  :style="{ width: focusMission.progress + '%' }"
                ></div>
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
              <div
                class="overall-progress-header d-flex flex-wrap justify-content-between align-items-start gap-3"
              >
                <div>
                  <div class="player-kicker">Gesamtstatus</div>
                  <h6 class="overall-progress-title mb-1">
                    <i class="ni ni-single-copy-04 me-2"></i>
                    Alle Annotationstypen
                  </h6>
                  <p class="text-muted mb-0">Video-Segmente, Untersuchungen und Patientendaten</p>
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
                  <span
                    class="overall-status-dot"
                    aria-hidden="true"
                  ></span>
                  <span class="overall-status-label">{{ item.label }}</span>
                  <strong class="overall-status-value">{{ item.count }}</strong>
                  <small class="overall-status-detail">{{ item.percentage }}%</small>
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
                <div
                  v-else
                  class="overall-empty-progress mb-2"
                >
                  Noch keine Statistikdaten verfügbar
                </div>

                <div
                  class="overall-progress-context d-flex flex-wrap justify-content-between gap-2"
                >
                  <small class="text-muted">
                    {{ completedOfTotalText }}
                  </small>
                  <small class="text-muted"> Letzte Aktualisierung: {{ lastUpdateText }} </small>
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
        <div
          v-for="category in categories"
          :key="category.key"
          class="col-md-4 mb-3"
        >
          <div
            class="card h-100 annotation-type-card"
            @click="navigateTo(category.path)"
          >
            <div
              class="card-header"
              :class="category.headerClass"
            >
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0">
                  <i
                    class="ni me-2"
                    :class="category.icon"
                  ></i>
                  {{ category.label }}
                </h6>
                <span
                  class="badge"
                  :class="category.badgeClass"
                  >{{ category.stats.total }}</span
                >
              </div>
            </div>
            <div class="card-body">
              <div class="stats-grid">
                <div
                  v-for="status in categoryStatuses"
                  :key="status.key"
                  class="stat-item"
                  :class="status.className"
                >
                  <div class="stat-icon">
                    <i
                      class="ni"
                      :class="status.icon"
                    ></i>
                  </div>
                  <div class="stat-info">
                    <div class="stat-number">{{ category.stats[status.key] }}</div>
                    <div class="stat-label">{{ status.label }}</div>
                  </div>
                </div>
              </div>
              <div class="mini-progress mt-3">
                <div class="progress annotation-progress-meter">
                  <div
                    class="progress-bar bg-success"
                    :style="{ width: category.progress + '%' }"
                  ></div>
                </div>
                <small class="text-muted mt-1 d-block"
                  >{{ category.progress }}% abgeschlossen</small
                >
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
                  <div
                    class="quick-action-item"
                    @click="navigateToFrameAnnotation"
                  >
                    <div class="action-icon bg-primary">
                      <i class="ni ni-fat-add"></i>
                    </div>
                    <div class="action-content">
                      <h6 class="quick-action-heading">Neue Video-Annotation</h6>
                      <small class="text-muted">Frame-Annotation starten</small>
                    </div>
                  </div>
                </div>

                <div class="col-md-4">
                  <div
                    class="quick-action-item"
                    @click="navigateToExamination"
                  >
                    <div class="action-icon bg-success">
                      <i class="ni ni-fat-add"></i>
                    </div>
                    <div class="action-content">
                      <h6 class="quick-action-heading">Neue Dokumentation</h6>
                      <small class="text-muted">Reporting-Fall-Setup oeffnen</small>
                    </div>
                  </div>
                </div>

                <div class="col-md-4">
                  <div
                    class="quick-action-item"
                    @click="navigateToValidation"
                  >
                    <div class="action-icon bg-warning">
                      <i class="ni ni-button-play"></i>
                    </div>
                    <div class="action-content">
                      <h6 class="quick-action-heading">Validierung starten</h6>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAnnotationStatsStore } from '@/stores/annotationStats'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const router = useRouter()
const annotationStatsStore = useAnnotationStatsStore()
const logger = createRuntimeLogger('annotation-stats-component')
const navigationError = ref<string | null>(null)

const stats = computed(() => annotationStatsStore.stats)

// Enhanced computed properties with fallback values
const segmentStats = computed(() => ({
  pending: stats.value.segmentPending || 0,
  inProgress: stats.value.segmentInProgress || 0,
  completed: stats.value.segmentCompleted || 0,
  total:
    (stats.value.segmentPending || 0) +
    (stats.value.segmentInProgress || 0) +
    (stats.value.segmentCompleted || 0)
}))

const examinationStats = computed(() => ({
  pending: stats.value.examinationPending || 0,
  inProgress: stats.value.examinationInProgress || 0,
  completed: stats.value.examinationCompleted || 0,
  total:
    (stats.value.examinationPending || 0) +
    (stats.value.examinationInProgress || 0) +
    (stats.value.examinationCompleted || 0)
}))

const sensitiveMetaStats = computed(() => ({
  pending: stats.value.sensitiveMetaPending || 0,
  inProgress: stats.value.sensitiveMetaInProgress || 0,
  completed: stats.value.sensitiveMetaCompleted || 0,
  total:
    (stats.value.sensitiveMetaPending || 0) +
    (stats.value.sensitiveMetaInProgress || 0) +
    (stats.value.sensitiveMetaCompleted || 0)
}))

// Global computed properties for the main progress bar
const completionPercentage = computed(() => {
  return annotationStatsStore.completionPercentage || 0
})

const inProgressPercentage = computed(() => {
  return annotationStatsStore.inProgressPercentage || 0
})

const pendingPercentage = computed(() => {
  return annotationStatsStore.pendingPercentage || 0
})

const totalAnnotations = computed(() => {
  return stats.value.totalAnnotations || 0
})

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
    barClass: 'bg-success'
  },
  {
    key: 'in-progress',
    label: 'In Bearbeitung',
    count: totalInProgress.value,
    percentage: inProgressPercentage.value,
    barClass: 'bg-info'
  },
  {
    key: 'pending',
    label: 'Ausstehend',
    count: totalPending.value,
    percentage: pendingPercentage.value,
    barClass: 'bg-warning'
  }
])

const completedOfTotalText = computed(() => {
  if (totalAnnotations.value === 0) {
    return 'Keine Annotationen gezählt'
  }
  return `${String(totalCompleted.value)} von ${String(totalAnnotations.value)} Annotationen abgeschlossen`
})

const overallStatusDescription = computed(() => {
  if (totalAnnotations.value === 0) {
    return 'Wartet auf Statistikdaten für die zusammengefasste Arbeitsliste.'
  }

  if (openAnnotationCount.value === 0) {
    return 'Alle gezählten Annotationen sind abgeschlossen.'
  }

  if (totalInProgress.value > 0 && totalPending.value > 0) {
    return `${String(openAnnotationCount.value)} Annotationen sind noch offen: ${String(totalInProgress.value)} in Bearbeitung, ${String(totalPending.value)} ausstehend.`
  }

  if (totalInProgress.value > 0) {
    return `${String(totalInProgress.value)} Annotationen sind aktuell in Bearbeitung.`
  }

  return `${String(totalPending.value)} Annotationen warten noch auf Bearbeitung.`
})

const categoryStatuses = [
  { key: 'pending', className: 'pending', icon: 'ni-user-run', label: 'Ausstehend' },
  {
    key: 'inProgress',
    className: 'in-progress',
    icon: 'ni-settings-gear-65',
    label: 'In Bearbeitung'
  },
  { key: 'completed', className: 'completed', icon: 'ni-check-bold', label: 'Abgeschlossen' }
] as const

const categories = computed(() =>
  [
    {
      key: 'segments',
      label: 'Video-Segmente',
      stats: segmentStats.value,
      path: '/video-untersuchung',
      icon: 'ni-button-play',
      headerClass: 'bg-primary text-white',
      badgeClass: 'bg-light text-primary',
      title: 'Video-Segmente klären',
      description: 'Reduziere offene Segmente, um die Pipeline zu entlasten.'
    },
    {
      key: 'examinations',
      label: 'Untersuchungen',
      stats: examinationStats.value,
      path: '/reporting/case-setup',
      icon: 'ni-user-run',
      headerClass: 'bg-success text-white',
      badgeClass: 'bg-light text-success',
      title: 'Befundungen abschließen',
      description: 'Führe offene Untersuchungen zu einem dokumentierten Abschluss.'
    },
    {
      key: 'sensitive',
      label: 'Patientendaten',
      stats: sensitiveMetaStats.value,
      path: '/anonymisierung/validierung',
      icon: 'ni-check-bold',
      headerClass: 'bg-warning text-dark',
      badgeClass: 'bg-dark text-warning',
      title: 'Patientendaten validieren',
      description: 'Verringere offene Validierungen für einen sicheren Datenfluss.'
    }
  ].map((category) => ({
    ...category,
    open: category.stats.pending + category.stats.inProgress,
    progress: getCompletionPercentage(category.stats)
  }))
)

const topOpenAreaText = computed(() => {
  if (totalAnnotations.value === 0 || openAnnotationCount.value === 0) {
    return ''
  }
  const top = categories.value.reduce((highest, category) =>
    category.open > highest.open ? category : highest
  )
  return top.open === 0 ? '' : `${top.label} (${String(top.open)} offen)`
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
const levelProgress = computed(() =>
  Math.min(100, Math.round(((points.value % POINTS_PER_LEVEL) / POINTS_PER_LEVEL) * 100))
)

const unlockedAchievements = computed(() =>
  [
    { unlocked: totalCompleted.value >= 1, label: 'Erster Abschluss' },
    { unlocked: totalCompleted.value >= 10, label: 'Konstant geliefert' },
    { unlocked: completionPercentage.value >= 50, label: 'Halbzeit-Champion' },
    { unlocked: segmentStats.value.completed >= 20, label: 'Segment-Profi' },
    { unlocked: examinationStats.value.completed >= 10, label: 'Befundungs-Profi' },
    { unlocked: sensitiveMetaStats.value.completed >= 10, label: 'Datenschutz-Held' }
  ]
    .filter((achievement) => achievement.unlocked)
    .map((achievement) => achievement.label)
)

const unlockedAchievementsCount = computed(() => unlockedAchievements.value.length)

const focusMission = computed(() => {
  const top = categories.value.reduce((highest, category) =>
    category.stats.pending > highest.stats.pending ? category : highest
  )
  if (top.stats.pending <= 0) {
    return {
      title: 'Stabil halten',
      description: 'Alles sieht gut aus. Heute Fokus auf Qualitätskontrolle und Feinschliff.',
      progress: 100
    }
  }
  return top
})

const hasSuccessfulSnapshot = computed(() => annotationStatsStore.lastUpdated !== null)

// Loading and error presentation must follow successful snapshot provenance, not count values.
const hasAnyData = computed(() => hasSuccessfulSnapshot.value)
const hasBlockingError = computed(
  () => annotationStatsStore.hasError && !hasSuccessfulSnapshot.value
)
const hasStaleError = computed(() => annotationStatsStore.hasError && hasSuccessfulSnapshot.value)

const lastUpdateText = computed(() => {
  if (!annotationStatsStore.lastUpdated) {
    return 'Nie'
  }

  const now = new Date()
  const diff = now.getTime() - annotationStatsStore.lastUpdated.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) {
    return 'Gerade eben'
  }
  if (minutes < 60) {
    return `vor ${String(minutes)} Min.`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `vor ${String(hours)} Std.`
  }

  const days = Math.floor(hours / 24)
  return `vor ${String(days)} Tag(en)`
})

// Helper methods
const getCompletionPercentage = (stats: {
  pending: number
  inProgress: number
  completed: number
  total: number
}): number => {
  return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
}

const refreshStats = async (): Promise<void> => {
  try {
    if (typeof annotationStatsStore.forceRefresh === 'function') {
      await annotationStatsStore.forceRefresh()
    }
  } catch (error) {
    logger.error('refresh-failed', error)
  }
}

// Navigation methods
const navigateTo = (path: string): void => {
  navigationError.value = null
  router.push(path).catch((error: unknown) => {
    logger.error('navigation-failed', error)
    navigationError.value =
      'Die gewünschte Seite konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.'
  })
}

const navigateToFrameAnnotation = (): void => {
  navigateTo('/frame-annotation')
}

const navigateToExamination = (): void => {
  navigateTo('/reporting/case-setup')
}

const navigateToValidation = (): void => {
  navigateTo('/anonymisierung/validierung')
}

// Load stats on component mount and watch for changes
onMounted(async () => {
  if (typeof annotationStatsStore.fetchAnnotationStats === 'function') {
    await annotationStatsStore.fetchAnnotationStats()
  }
})

// Auto-refresh when needed
watch(
  () => annotationStatsStore.needsRefresh,
  async (needsRefresh) => {
    if (needsRefresh && typeof annotationStatsStore.refreshIfNeeded === 'function') {
      await annotationStatsStore.refreshIfNeeded()
    }
  }
)
</script>

<style scoped>
.level-progress-meter {
  height: 12px;
}

.mission-progress-meter {
  height: 10px;
}

.annotation-progress-meter {
  height: 6px;
}

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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
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

.overall-status-item .overall-status-value {
  color: #2d3047;
  font-size: 1.15rem;
  line-height: 1;
}

.overall-status-item .overall-status-detail {
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
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
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

.action-content .quick-action-heading {
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
