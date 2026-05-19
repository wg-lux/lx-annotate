<template>
  <div class="container-fluid py-4 anonymization-metrics-page">
    <div class="metrics-page-header mb-4">
      <div>
        <h4 class="mb-1">Anonymisierungsmetriken</h4>
        <p class="text-muted mb-0">
          Aggregierte Workflow- und Qualitätskennzahlen aus der Anonymisierungsvalidierung
        </p>
      </div>
      <button
        class="btn btn-outline-primary btn-sm"
        type="button"
        :disabled="metricsStore.loading"
        @click="refreshMetrics"
      >
        <i class="ni ni-bold-right me-1" :class="{ 'ni-spin': metricsStore.loading }"></i>
        Aktualisieren
      </button>
    </div>

    <section class="metrics-filter-band mb-4" aria-label="Filter">
      <form class="row g-3 align-items-end" @submit.prevent="applyFilters">
        <div class="col-md-2">
          <label class="form-label" for="metrics-date-from">Von</label>
          <input
            id="metrics-date-from"
            v-model="filterForm.dateFrom"
            type="date"
            class="form-control"
          >
        </div>
        <div class="col-md-2">
          <label class="form-label" for="metrics-date-to">Bis</label>
          <input
            id="metrics-date-to"
            v-model="filterForm.dateTo"
            type="date"
            class="form-control"
          >
        </div>
        <div class="col-md-2">
          <label class="form-label" for="metrics-media-type">Medientyp</label>
          <select id="metrics-media-type" v-model="filterForm.mediaType" class="form-select">
            <option value="all">Alle</option>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label" for="metrics-center-id">Center-ID</label>
          <input
            id="metrics-center-id"
            v-model="filterForm.centerId"
            type="text"
            inputmode="numeric"
            class="form-control"
            placeholder="Alle"
          >
        </div>
        <div class="col-md-2">
          <label class="form-label" for="metrics-document-type">Dokumenttyp</label>
          <input
            id="metrics-document-type"
            v-model="filterForm.documentType"
            type="text"
            class="form-control"
            placeholder="Alle"
          >
        </div>
        <div class="col-md-2">
          <label class="form-label" for="metrics-source-system">Quelle</label>
          <input
            id="metrics-source-system"
            v-model="filterForm.sourceSystem"
            type="text"
            class="form-control"
            placeholder="Alle"
          >
        </div>
        <div class="col-12 d-flex gap-2">
          <button class="btn btn-primary btn-sm mb-0" type="submit" :disabled="metricsStore.loading">
            Filter anwenden
          </button>
          <button
            class="btn btn-outline-secondary btn-sm mb-0"
            type="button"
            :disabled="metricsStore.loading"
            @click="resetFilters"
          >
            Zurücksetzen
          </button>
        </div>
      </form>
    </section>

    <div v-if="metricsStore.error" class="alert alert-danger" role="alert">
      <strong>Fehler:</strong> {{ metricsStore.error }}
    </div>

    <div v-if="metricsStore.loading && !metricsStore.data" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Wird geladen...</span>
      </div>
      <p class="mt-2 text-muted">Metriken werden geladen...</p>
    </div>

    <template v-else-if="metricsStore.data">
      <div class="row g-3 mb-4">
        <div
          v-for="card in workflowCards"
          :key="card.key"
          class="col-sm-6 col-xl-3"
        >
          <div class="card metric-summary-card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div class="metric-label">{{ card.label }}</div>
                  <div class="metric-value">{{ card.value }}</div>
                </div>
                <div class="metric-icon" :class="card.iconClass">
                  <i :class="card.icon"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <section class="card h-100">
            <div class="card-header pb-0">
              <h6 class="mb-0">Anonymisierungsstatus</h6>
            </div>
            <div class="card-body">
              <MetricsStatusTable
                :rows="anonymizationStatusRows"
                empty-label="Keine Anonymisierungsstatus vorhanden"
              />
            </div>
          </section>
        </div>
        <div class="col-lg-6">
          <section class="card h-100">
            <div class="card-header pb-0">
              <h6 class="mb-0">Validierungsstatus</h6>
            </div>
            <div class="card-body">
              <MetricsStatusTable
                :rows="validationStatusRows"
                empty-label="Keine Validierungsstatus vorhanden"
              />
            </div>
          </section>
        </div>
      </div>

      <section class="card mb-4">
        <div class="card-header pb-0">
          <h6 class="mb-0">Feldqualität</h6>
        </div>
        <div class="card-body">
          <div v-if="fieldQualityRows.length" class="table-responsive">
            <table class="table align-items-center mb-0">
              <thead>
                <tr>
                  <th>Feld</th>
                  <th class="text-end">Support</th>
                  <th class="text-end">Geändert</th>
                  <th class="text-end">Exact Match</th>
                  <th class="text-end">Ähnlichkeit</th>
                  <th class="text-end">Nach Validierung leer</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in fieldQualityRows" :key="row.fieldName">
                  <td>{{ fieldLabel(row.fieldName) }}</td>
                  <td class="text-end">{{ formatInteger(row.support) }}</td>
                  <td class="text-end">{{ formatPercent(row.changedRate) }}</td>
                  <td class="text-end">{{ formatPercent(row.exactMatchRate) }}</td>
                  <td class="text-end">{{ formatPercent(row.meanSimilarity) }}</td>
                  <td class="text-end">{{ formatInteger(row.missingAfterValidationCount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-muted mb-0">Keine Feldqualitätsdaten im ausgewählten Zeitraum.</p>
        </div>
      </section>

      <section class="card">
        <div class="card-header pb-0">
          <h6 class="mb-0">PHI-Regionen</h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div
              v-for="metric in phiRegionCards"
              :key="metric.key"
              class="col-sm-6 col-xl"
            >
              <div class="phi-metric-box">
                <div class="metric-label">{{ metric.label }}</div>
                <div class="metric-value">{{ metric.value }}</div>
                <div v-if="metric.help" class="small text-muted">{{ metric.help }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="small text-muted mt-3">
        Schema {{ metricsStore.data.schemaVersion }}
        <span v-if="metricsStore.lastUpdated">
          · Aktualisiert {{ formatDateTime(metricsStore.lastUpdated) }}
        </span>
      </div>
    </template>

    <div v-else class="alert alert-info" role="alert">
      Keine Metriken geladen.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, watch } from 'vue'
import type { PropType } from 'vue'
import { useAnonymizationMetricsStore } from '@/stores/anonymizationMetricsStore'
import type {
  AnonymizationFieldQualityMetric,
  AnonymizationMetricsFilters
} from '@/api/anonymizationMetricsApi'

type StatusRow = {
  status: string
  label: string
  count: number
}

const MetricsStatusTable = defineComponent({
  name: 'MetricsStatusTable',
  props: {
    rows: {
      type: Array as PropType<StatusRow[]>,
      required: true
    },
    emptyLabel: {
      type: String,
      required: true
    }
  },
  setup(props) {
    return () =>
      props.rows.length
        ? h('div', { class: 'table-responsive' }, [
            h('table', { class: 'table align-items-center mb-0' }, [
              h('thead', [
                h('tr', [
                  h('th', 'Status'),
                  h('th', { class: 'text-end' }, 'Anzahl')
                ])
              ]),
              h(
                'tbody',
                props.rows.map((row) =>
                  h('tr', { key: row.status }, [
                    h('td', row.label),
                    h('td', { class: 'text-end' }, formatInteger(row.count))
                  ])
                )
              )
            ])
          ])
        : h('p', { class: 'text-muted mb-0' }, props.emptyLabel)
  }
})

const FIELD_LABELS: Record<string, string> = {
  patient_first_name: 'Vorname',
  patientFirstName: 'Vorname',
  patient_last_name: 'Nachname',
  patientLastName: 'Nachname',
  patient_dob: 'Geburtsdatum',
  patientDob: 'Geburtsdatum',
  patient_gender: 'Geschlecht',
  patientGender: 'Geschlecht',
  examination_date: 'Untersuchungsdatum',
  examinationDate: 'Untersuchungsdatum',
  casenumber: 'Fallnummer',
  center_name: 'Zentrum',
  centerName: 'Zentrum',
  external_id: 'Externe ID',
  externalId: 'Externe ID',
  document_type: 'Dokumenttyp',
  documentType: 'Dokumenttyp'
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Nicht gestartet',
  notStarted: 'Nicht gestartet',
  processing_anonymization: 'Anonymisierung läuft',
  processingAnonymization: 'Anonymisierung läuft',
  done_processing_anonymization: 'Bereit zur Validierung',
  doneProcessingAnonymization: 'Bereit zur Validierung',
  failed: 'Fehlgeschlagen',
  lost: 'LOST',
  validated: 'Validiert',
  pending: 'Ausstehend',
  in_progress: 'In Bearbeitung',
  inProgress: 'In Bearbeitung'
}

const metricsStore = useAnonymizationMetricsStore()
const filterForm = reactive<AnonymizationMetricsFilters>({
  ...metricsStore.filters
})

function syncFilterForm(filters: AnonymizationMetricsFilters) {
  filterForm.dateFrom = filters.dateFrom || ''
  filterForm.dateTo = filters.dateTo || ''
  filterForm.mediaType = filters.mediaType || 'all'
  filterForm.centerId = filters.centerId ?? ''
  filterForm.documentType = filters.documentType || ''
  filterForm.sourceSystem = filters.sourceSystem || ''
}

watch(
  () => metricsStore.filters,
  (filters) => syncFilterForm(filters),
  { deep: true }
)

onMounted(() => {
  syncFilterForm(metricsStore.filters)
  metricsStore.fetchMetrics()
})

const workflow = computed(() => metricsStore.data?.workflow)
const fieldQualityRows = computed<AnonymizationFieldQualityMetric[]>(
  () => metricsStore.data?.fieldQuality ?? []
)

const workflowCards = computed(() => [
  {
    key: 'pending-validation',
    label: 'Wartet auf Validierung',
    value: formatInteger(workflow.value?.pendingValidation ?? 0),
    icon: 'ni ni-time-alarm',
    iconClass: 'metric-icon-warning'
  },
  {
    key: 'validated',
    label: 'Validiert',
    value: formatInteger(workflow.value?.validated ?? 0),
    icon: 'ni ni-check-bold',
    iconClass: 'metric-icon-success'
  },
  {
    key: 'failed-lost',
    label: 'Fehler / LOST',
    value: formatInteger(workflow.value?.failedLost ?? 0),
    icon: 'ni ni-fat-remove',
    iconClass: 'metric-icon-danger'
  },
  {
    key: 'median-time',
    label: 'Median bis Validierung',
    value: formatDuration(workflow.value?.medianTimeToValidationSeconds ?? null),
    icon: 'ni ni-watch-time',
    iconClass: 'metric-icon-info'
  }
])

const anonymizationStatusRows = computed(() =>
  statusRows(workflow.value?.totalsByAnonymizationStatus ?? {})
)
const validationStatusRows = computed(() =>
  statusRows(workflow.value?.totalsByValidationStatus ?? {})
)

const phiRegionCards = computed(() => {
  const phi = metricsStore.data?.phiRegions
  return [
    {
      key: 'proposal-count',
      label: 'Vorschläge',
      value: formatInteger(phi?.proposalCount ?? 0)
    },
    {
      key: 'human-count',
      label: 'Human-Annotationen',
      value: formatInteger(phi?.humanAnnotationCount ?? 0)
    },
    {
      key: 'matched-count',
      label: 'Treffer',
      value: formatInteger(phi?.matchedCount ?? 0)
    },
    {
      key: 'precision',
      label: 'Precision',
      value: formatPercent(phi?.precision ?? null),
      help: phi?.precision == null ? 'Nicht genug Human-Annotationen' : ''
    },
    {
      key: 'recall',
      label: 'Recall',
      value: formatPercent(phi?.recall ?? null),
      help: phi?.recall == null ? 'Nicht genug Human-Annotationen' : ''
    }
  ]
})

function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] || humanizeKey(fieldName)
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || humanizeKey(status)
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_:-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function statusRows(record: Record<string, number>): StatusRow[] {
  return Object.entries(record)
    .map(([status, count]) => ({
      status,
      label: statusLabel(status),
      count
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const normalized = value > 1 ? value / 100 : value
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(normalized)
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return 'Keine Daten'
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = seconds / 60
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = minutes / 60
  if (hours < 48) {
    const formattedHours = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',')
    return `${formattedHours} h`
  }
  const days = hours / 24
  return `${days.toFixed(1).replace('.', ',')} d`
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

async function applyFilters() {
  await metricsStore.updateFilters({ ...filterForm })
}

async function resetFilters() {
  metricsStore.resetFilters()
  syncFilterForm(metricsStore.filters)
  await metricsStore.fetchMetrics()
}

async function refreshMetrics() {
  await metricsStore.fetchMetrics()
}
</script>

<style scoped>
.metrics-page-header {
  align-items: flex-start;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

.metrics-filter-band {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
}

.metric-summary-card,
.phi-metric-box {
  border-radius: 8px;
}

.metric-label {
  color: #67748e;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
}

.metric-value {
  color: #344767;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 0.25rem;
}

.metric-icon {
  align-items: center;
  border-radius: 8px;
  display: inline-flex;
  height: 2.5rem;
  justify-content: center;
  width: 2.5rem;
}

.metric-icon-warning {
  background: #fff7e6;
  color: #b7791f;
}

.metric-icon-success {
  background: #e8f7ef;
  color: #1f8f52;
}

.metric-icon-danger {
  background: #fdeceb;
  color: #d14343;
}

.metric-icon-info {
  background: #e8f3ff;
  color: #1976d2;
}

.phi-metric-box {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  min-height: 7rem;
  padding: 1rem;
}

@media (max-width: 767.98px) {
  .metrics-page-header {
    display: block;
  }

  .metrics-page-header .btn {
    margin-top: 1rem;
  }
}
</style>
