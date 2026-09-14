<template>
  <div class="container-fluid py-4 annotation-dashboard">
    <section class="dashboard-hero mb-4">
      <div>
        <h2 class="dashboard-title mb-1">Dashboard</h2>
        <p class="dashboard-subtitle mb-0">
          Status und Schnellzugriffe an einem Ort.
        </p>
      </div>

      <button
        class="btn btn-outline-primary btn-sm mb-0"
        type="button"
        :disabled="loadingOperationalState"
        data-test="refresh-operational-state"
        @click="refreshOperationalState"
      >
        {{ loadingOperationalState ? 'Aktualisiere …' : 'Status aktualisieren' }}
      </button>
    </section>

    <section
      class="operational-state-grid mb-4"
      aria-label="Aktueller Betriebszustand"
    >
      <!-- Dataset Collections -->
      <article
        class="state-card"
        data-test="dataset-state"
      >
        <div class="state-card-heading">
          <div>
            <p class="state-kicker">Datensätze</p>
            <h3 class="state-card-heading-text">Dataset Collections</h3>
          </div>

          <RouterLink
            to="/ai-dataset-settings"
            class="state-link"
          >
            Verwalten
          </RouterLink>
        </div>

        <p
          v-if="datasetState.loading"
          class="state-message"
        >
          Datensätze werden geladen …
        </p>

        <p
          v-else-if="datasetState.error"
          class="state-message text-danger"
          role="status"
        >
          Datensatzstatus ist derzeit nicht verfügbar.
        </p>

        <template v-else>
          <div class="state-metric">
            <strong class="state-metric-value">
              {{ datasetState.items.length }}
            </strong>
            <span class="state-metric-description">
              {{ activeDatasetCount }} aktiv
            </span>
          </div>

          <div
            v-if="datasetState.items.length"
            class="state-tags"
            aria-label="Datensatznamen"
          >
            <span
              v-for="dataset in datasetState.items"
              :key="dataset.id"
              class="state-tag"
              :class="{ 'state-tag-inactive': !dataset.isActive }"
            >
              {{ dataset.label }} ·
              {{ dataset.datasetType === 'video' ? 'Video' : 'Bild' }}
            </span>
          </div>

          <p
            v-else
            class="state-message mb-0"
          >
            Keine Dataset Collections angelegt.
          </p>
        </template>
      </article>

      <!-- Study cohort -->
      <article
        class="state-card"
        data-test="cohort-state"
      >
        <div class="state-card-heading">
          <div>
            <p class="state-kicker">Registerstudie</p>
            <h3 class="state-card-heading-text">Aktuelle Studienkohorte</h3>
          </div>

          <RouterLink
            to="/studies"
            class="state-link"
          >
            Öffnen
          </RouterLink>
        </div>

        <p
          v-if="cohortState.loading"
          class="state-message"
        >
          Kohorte wird geladen …
        </p>

        <p
          v-else-if="cohortState.error"
          class="state-message text-danger"
          role="status"
        >
          Kohortenstatus ist derzeit nicht verfügbar.
        </p>

        <div
          v-else-if="cohortState.summary"
          class="cohort-metrics"
        >
          <div class="cohort-metric-item">
            <strong class="cohort-metric-value">
              {{ cohortState.summary.caseCount }}
            </strong>
            <span class="cohort-metric-description">Fälle</span>
          </div>

          <div class="cohort-metric-item">
            <strong class="cohort-metric-value">
              {{ cohortState.summary.patientCount }}
            </strong>
            <span class="cohort-metric-description">Patienten</span>
          </div>

          <div class="cohort-metric-item">
            <strong class="cohort-metric-value">
              {{ cohortState.summary.reportCount }}
            </strong>
            <span class="cohort-metric-description">Befunde</span>
          </div>

          <div class="cohort-metric-item">
            <strong class="cohort-metric-value">
              {{ cohortState.summary.videoCount }}
            </strong>
            <span class="cohort-metric-description">Videos</span>
          </div>
        </div>
      </article>

      <!-- Hub -->
      <article
        class="state-card"
        data-test="hub-state"
      >
        <div class="state-card-heading">
          <div>
            <p class="state-kicker">Hub</p>
            <h3 class="state-card-heading-text">Hub-Zustand</h3>
          </div>

          <RouterLink
            to="/administration"
            class="state-link"
          >
            Details
          </RouterLink>
        </div>

        <p
          v-if="hubState.loading"
          class="state-message"
        >
          Hub-Zustand wird geladen …
        </p>

        <p
          v-else-if="hubState.error"
          class="state-message text-danger"
          role="status"
        >
          Hub-Zustand ist derzeit nicht verfügbar.
        </p>

        <template v-else-if="hubState.health">
          <div class="hub-readiness">
            <span
              class="badge"
              :class="hubState.health.ready ? 'bg-success' : 'bg-danger'"
            >
              {{ hubState.health.ready ? 'Betriebsbereit' : 'Nicht bereit' }}
            </span>

            <span class="hub-transport-description">
              {{ hubState.health.transport.requireMtls ? 'mTLS' : 'TLS' }}
            </span>
          </div>

          <dl class="state-details mb-0">
            <div class="state-detail-row">
              <dt class="state-detail-term">Quellknoten</dt>
              <dd class="state-detail-value">
                {{ hubState.health.sourceNodeKey || 'nicht konfiguriert' }}
              </dd>
            </div>

            <div class="state-detail-row">
              <dt class="state-detail-term">Aktive Hubs</dt>
              <dd class="state-detail-value">
                {{ hubState.health.hubNodes.length }}
              </dd>
            </div>
          </dl>

          <div
            v-if="hubState.health.hubNodes.length"
            class="state-tags mt-3"
          >
            <span
              v-for="node in hubState.health.hubNodes"
              :key="node.nodeKey"
              class="state-tag"
            >
              {{ node.displayName }} ·
              {{ node.httpsConfigured ? 'HTTPS' : 'kein HTTPS' }}
            </span>
          </div>
        </template>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  fetchAiDatasetOptions,
  type AiDatasetOption
} from '@/api/aiDatasetApi'
import { fetchStudyCohortPreview } from '@/api/studyApi'
import { fetchAdministrationOverview } from '@/api/administrationApi'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

type StudyCohortSummary =
  Awaited<ReturnType<typeof fetchStudyCohortPreview>>['summary']

type HubHealth =
  Awaited<ReturnType<typeof fetchAdministrationOverview>>['hubHealth']

interface DatasetState {
  loading: boolean
  error: boolean
  items: AiDatasetOption[]
}

interface CohortState {
  loading: boolean
  error: boolean
  summary: StudyCohortSummary | null
}

interface HubState {
  loading: boolean
  error: boolean
  health: HubHealth | null
}

const logger = createRuntimeLogger('annotation-dashboard')

const datasetState = ref<DatasetState>({
  loading: true,
  error: false,
  items: []
})

const cohortState = ref<CohortState>({
  loading: true,
  error: false,
  summary: null
})

const hubState = ref<HubState>({
  loading: true,
  error: false,
  health: null
})

const loadingOperationalState = ref(false)

const activeDatasetCount = computed(
  () => datasetState.value.items.filter((dataset) => dataset.isActive).length
)

async function loadDatasetState(): Promise<void> {
  datasetState.value = {
    ...datasetState.value,
    loading: true,
    error: false
  }

  try {
    const items = await fetchAiDatasetOptions()

    datasetState.value = {
      loading: false,
      error: false,
      items
    }
  } catch (error: unknown) {
    logger.error('dashboard-dataset-state-load-failed', error, {
      operation: 'read',
      outcome: 'rejected'
    })

    datasetState.value = {
      loading: false,
      error: true,
      items: []
    }
  }
}

async function loadCohortState(): Promise<void> {
  cohortState.value = {
    ...cohortState.value,
    loading: true,
    error: false
  }

  try {
    const cohort = await fetchStudyCohortPreview({ limit: 1 })

    cohortState.value = {
      loading: false,
      error: false,
      summary: cohort.summary
    }
  } catch (error: unknown) {
    logger.error('dashboard-cohort-state-load-failed', error, {
      operation: 'read',
      outcome: 'rejected'
    })

    cohortState.value = {
      loading: false,
      error: true,
      summary: null
    }
  }
}

async function loadHubState(): Promise<void> {
  hubState.value = {
    ...hubState.value,
    loading: true,
    error: false
  }

  try {
    const overview = await fetchAdministrationOverview()

    hubState.value = {
      loading: false,
      error: false,
      health: overview.hubHealth
    }
  } catch (error: unknown) {
    logger.error('dashboard-hub-state-load-failed', error, {
      operation: 'read',
      outcome: 'rejected'
    })

    hubState.value = {
      loading: false,
      error: true,
      health: null
    }
  }
}

async function refreshOperationalState(): Promise<void> {
  loadingOperationalState.value = true

  try {
    await Promise.all([
      loadDatasetState(),
      loadCohortState(),
      loadHubState()
    ])
  } finally {
    loadingOperationalState.value = false
  }
}

onMounted(() => {
  void refreshOperationalState()
})
</script>

<style scoped>
.annotation-dashboard {
  --dashboard-border: rgba(45, 48, 71, 0.1);
}

.dashboard-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--dashboard-border);
  border-radius: 14px;
  background: radial-gradient(
    circle at top left,
    rgba(67, 86, 255, 0.16),
    rgba(67, 86, 255, 0.03) 45%,
    rgba(255, 255, 255, 0.95) 70%
  );
}

.dashboard-title {
  color: #2d3047;
  font-size: 1.35rem;
  font-weight: 700;
}

.dashboard-subtitle {
  color: #63748a;
}

.operational-state-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.state-card {
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--dashboard-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 24px rgba(26, 36, 59, 0.06);
}

.state-card-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.state-card-heading-text {
  margin: 0;
  color: #2d3047;
  font-size: 1rem;
}

.state-kicker {
  margin: 0 0 0.2rem;
  color: #63748a;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.state-link {
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.state-message {
  color: #63748a;
}

.state-metric {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.state-metric-value {
  color: #2d3047;
  font-size: 1.8rem;
}

.state-metric-description,
.hub-transport-description {
  color: #63748a;
  font-size: 0.8rem;
}

.state-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  max-height: 6.5rem;
  overflow-y: auto;
}

.state-tag {
  padding: 0.3rem 0.5rem;
  border-radius: 999px;
  background: #eef2ff;
  color: #344767;
  font-size: 0.72rem;
}

.state-tag-inactive {
  background: #f2f3f5;
  color: #7b809a;
}

.cohort-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.cohort-metric-item {
  display: flex;
  flex-direction: column;
}

.cohort-metric-value {
  color: #2d3047;
  font-size: 1.25rem;
}

.cohort-metric-description,
.state-detail-term {
  color: #63748a;
  font-size: 0.72rem;
}

.hub-readiness {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.state-detail-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0;
}

.state-detail-value {
  margin: 0;
  color: #344767;
  font-size: 0.78rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

@media (max-width: 768px) {
  .dashboard-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 0.9rem 1rem;
  }

  .operational-state-grid {
    grid-template-columns: 1fr;
  }
}
</style>