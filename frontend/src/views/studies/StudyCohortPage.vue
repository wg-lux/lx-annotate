<template>
  <main class="container-fluid py-4 study-cohort-page">
    <header class="mb-4">
      <div class="small text-uppercase text-muted fw-semibold">Registerstudien</div>
      <h3 class="mb-1">Studie und Kohorte vorbereiten</h3>
      <p class="text-muted mb-0">
        Hypothese formulieren und pseudonymisierte Untersuchungsfälle serverseitig filtern.
      </p>
    </header>

    <form class="d-grid gap-4" @submit.prevent="previewCohort">
      <section class="card shadow-sm">
        <div class="card-header">
          <h5 class="mb-0">Studienfrage</h5>
        </div>
        <div class="card-body row g-3">
          <div class="col-lg-4">
            <label class="form-label" for="study-name">Studienname</label>
            <input
              id="study-name"
              v-model="studyName"
              class="form-control"
              type="text"
              autocomplete="off"
              data-test="study-name"
              placeholder="z. B. Polypendetektion 2026"
            />
          </div>
          <div class="col-lg-8">
            <label class="form-label" for="study-hypothesis">Hypothese</label>
            <textarea
              id="study-hypothesis"
              v-model="hypothesis"
              class="form-control"
              rows="3"
              data-test="study-hypothesis"
              placeholder="Formulieren Sie die zu prüfende Annahme."
            ></textarea>
          </div>
        </div>
      </section>

      <section class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-start gap-3">
          <div>
            <h5 class="mb-0">Einschlussfilter</h5>
            <small class="text-muted"
              >Die Vorschau wird erst nach expliziter Anfrage geladen.</small
            >
          </div>
          <span v-if="preview" class="badge bg-secondary">Schema {{ preview.schemaVersion }}</span>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="date-from">Datum von</label>
              <input
                id="date-from"
                v-model="filters.dateFrom"
                class="form-control"
                type="date"
                data-test="date-from"
              />
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="date-to">Datum bis</label>
              <input
                id="date-to"
                v-model="filters.dateTo"
                class="form-control"
                type="date"
                data-test="date-to"
              />
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="center-key">Zentrum</label>
              <input
                id="center-key"
                v-model="filters.centerKey"
                class="form-control"
                type="text"
                list="study-centers"
                autocomplete="off"
                data-test="center-key"
              />
              <datalist id="study-centers">
                <option
                  v-for="center in cohortOptions.centers"
                  :key="center.key"
                  :value="center.key"
                >
                  {{ center.label }}
                </option>
              </datalist>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="examination-name">Untersuchung</label>
              <input
                id="examination-name"
                v-model="filters.examinationName"
                class="form-control"
                type="text"
                list="study-examinations"
                autocomplete="off"
                data-test="examination-name"
              />
              <datalist id="study-examinations">
                <option v-for="name in cohortOptions.examinations" :key="name" :value="name" />
              </datalist>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="document-type">Dokumenttyp</label>
              <input
                id="document-type"
                v-model="filters.documentType"
                class="form-control"
                type="text"
                list="study-document-types"
                autocomplete="off"
                data-test="document-type"
              />
              <datalist id="study-document-types">
                <option
                  v-for="documentType in cohortOptions.documentTypes"
                  :key="documentType"
                  :value="documentType"
                />
              </datalist>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="finding">Befund</label>
              <input
                id="finding"
                v-model="filters.finding"
                class="form-control"
                type="text"
                list="study-findings"
                autocomplete="off"
                data-test="finding"
              />
              <datalist id="study-findings">
                <option v-for="finding in cohortOptions.findings" :key="finding" :value="finding" />
              </datalist>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="annotation-label">Annotationslabel</label>
              <input
                id="annotation-label"
                v-model="filters.annotationLabel"
                class="form-control"
                type="text"
                list="study-annotation-labels"
                autocomplete="off"
                data-test="annotation-label"
              />
              <datalist id="study-annotation-labels">
                <option
                  v-for="label in cohortOptions.annotationLabels"
                  :key="label"
                  :value="label"
                />
              </datalist>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="has-report">Bericht vorhanden</label>
              <select
                id="has-report"
                v-model="hasReportFilter"
                class="form-select"
                data-test="has-report"
              >
                <option value="">Beliebig</option>
                <option value="true">Ja</option>
                <option value="false">Nein</option>
              </select>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="has-video">Video vorhanden</label>
              <select
                id="has-video"
                v-model="hasVideoFilter"
                class="form-select"
                data-test="has-video"
              >
                <option value="">Beliebig</option>
                <option value="true">Ja</option>
                <option value="false">Nein</option>
              </select>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label class="form-label" for="case-limit">Maximale Fälle</label>
              <input
                id="case-limit"
                v-model.number="filters.limit"
                class="form-control"
                type="number"
                min="1"
                max="500"
                step="1"
                data-test="case-limit"
              />
            </div>
          </div>

          <div
            v-if="errorMessage"
            class="alert alert-danger py-2 mt-3 mb-0"
            data-test="study-error"
          >
            {{ errorMessage }}
          </div>

          <div class="d-flex justify-content-end mt-3">
            <button
              class="btn btn-primary mb-0"
              type="submit"
              :disabled="loading"
              data-test="preview-button"
            >
              <span
                v-if="loading"
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              {{ loading ? 'Kohorte wird berechnet…' : 'Kohorte anzeigen' }}
            </button>
          </div>
        </div>
      </section>
    </form>

    <template v-if="preview">
      <section class="row g-3 mt-1" aria-label="Kohortenzusammenfassung">
        <div v-for="metric in summaryMetrics" :key="metric.key" class="col-6 col-xl-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="small text-uppercase text-muted">{{ metric.label }}</div>
              <strong class="fs-4" :data-test="`summary-${metric.key}`">{{ metric.value }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="card shadow-sm mt-4">
        <div class="card-header d-flex justify-content-between align-items-center gap-3">
          <div>
            <h5 class="mb-0">Gruppierte Untersuchungsfälle</h5>
            <small class="text-muted"
              >Berichte und Videos bleiben je Patientenuntersuchung gebündelt.</small
            >
          </div>
          <span class="badge bg-secondary">{{ preview.cases.length }} angezeigt</span>
        </div>
        <div class="card-body">
          <div v-if="!preview.cases.length" class="text-muted" data-test="cohort-empty">
            Für diese Filter wurden keine Fälle gefunden.
          </div>
          <div v-else class="d-grid gap-3" data-test="cohort-cases">
            <article
              v-for="cohortCase in preview.cases"
              :key="cohortCase.patientExaminationId"
              class="border rounded p-3 cohort-case"
              data-test="cohort-case"
            >
              <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                <div>
                  <div class="fw-semibold">
                    {{ cohortCase.examinationName || 'Unbekannte Untersuchung' }}
                  </div>
                  <div class="small text-muted">
                    Fall {{ cohortCase.caseHash }} · Patient {{ cohortCase.patientHash }} · PE
                    {{ cohortCase.patientExaminationId }}
                  </div>
                </div>
                <div class="small text-muted text-end">
                  <div>{{ formatDate(cohortCase.examinationDate) }}</div>
                  <div>{{ cohortCase.centerKeys.join(', ') || 'Kein Zentrum' }}</div>
                </div>
              </div>

              <div class="row g-3">
                <div class="col-lg-4">
                  <div class="small text-uppercase text-muted fw-semibold mb-1">
                    Strukturierte Daten
                  </div>
                  <div class="small">
                    <div><strong>Befunde:</strong> {{ joinValues(cohortCase.findings) }}</div>
                    <div>
                      <strong>Annotationslabels:</strong>
                      {{ joinValues(cohortCase.annotationLabels) }}
                    </div>
                  </div>
                </div>
                <div class="col-lg-4">
                  <div class="small text-uppercase text-muted fw-semibold mb-1">Berichte</div>
                  <div v-if="!cohortCase.reports.length" class="small text-muted">Keine</div>
                  <ul v-else class="list-unstyled small mb-0 d-grid gap-1">
                    <li
                      v-for="report in cohortCase.reports"
                      :key="report.id"
                      class="d-flex flex-wrap align-items-center gap-2"
                    >
                      <span>#{{ report.id }} · {{ report.documentType || 'Bericht' }}</span>
                      <span class="badge" :class="availabilityClass(report.availability)">
                        {{ report.availability }}
                      </span>
                      <a
                        v-if="report.streamUrl"
                        :href="report.streamUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Öffnen
                      </a>
                    </li>
                  </ul>
                </div>
                <div class="col-lg-4">
                  <div class="small text-uppercase text-muted fw-semibold mb-1">Videos</div>
                  <div v-if="!cohortCase.videos.length" class="small text-muted">Keine</div>
                  <ul v-else class="list-unstyled small mb-0 d-grid gap-1">
                    <li
                      v-for="video in cohortCase.videos"
                      :key="video.id"
                      class="d-flex flex-wrap align-items-center gap-2"
                    >
                      <span>#{{ video.id }}</span>
                      <span class="badge" :class="availabilityClass(video.availability)">
                        {{ video.availability }}
                      </span>
                      <a
                        v-if="video.streamUrl"
                        :href="video.streamUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Öffnen
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="card shadow-sm mt-4">
      <div class="card-body text-muted" data-test="preview-empty">
        Noch keine Kohortenvorschau geladen. Die Seite verwendet keine lokalen Beispieldaten.
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import {
  fetchStudyCohortPreview,
  type StudyCohortPreviewFilters,
  type StudyCohortPreviewResponse
} from '@/api/studyApi'

const studyName = ref('')
const hypothesis = ref('')
const hasReportFilter = ref<'' | 'true' | 'false'>('')
const hasVideoFilter = ref<'' | 'true' | 'false'>('')
const filters = reactive({
  dateFrom: '',
  dateTo: '',
  centerKey: '',
  examinationName: '',
  documentType: '',
  finding: '',
  annotationLabel: '',
  limit: 100
})
const preview = ref<StudyCohortPreviewResponse | null>(null)
const loading = ref(false)
const errorMessage = ref('')
let activeController: AbortController | null = null

const cohortOptions = computed(
  () =>
    preview.value?.options ?? {
      centers: [],
      examinations: [],
      documentTypes: [],
      findings: [],
      annotationLabels: []
    }
)

const summaryMetrics = computed(() => {
  const summary = preview.value?.summary
  return [
    { key: 'case-count', label: 'Fälle', value: summary?.caseCount ?? 0 },
    { key: 'patient-count', label: 'Patienten', value: summary?.patientCount ?? 0 },
    { key: 'report-count', label: 'Berichte', value: summary?.reportCount ?? 0 },
    { key: 'video-count', label: 'Videos', value: summary?.videoCount ?? 0 }
  ]
})

function triState(value: '' | 'true' | 'false'): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

function requestFilters(): StudyCohortPreviewFilters {
  return {
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    centerKey: filters.centerKey || null,
    examinationName: filters.examinationName || null,
    documentType: filters.documentType || null,
    finding: filters.finding || null,
    annotationLabel: filters.annotationLabel || null,
    hasReport: triState(hasReportFilter.value),
    hasVideo: triState(hasVideoFilter.value),
    limit: filters.limit
  }
}

function readableError(error: unknown): string {
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: string
      response?: { data?: { detail?: string; error?: string } }
    }
    return (
      candidate.response?.data?.detail ||
      candidate.response?.data?.error ||
      candidate.message ||
      'Kohortenvorschau konnte nicht geladen werden.'
    )
  }
  return 'Kohortenvorschau konnte nicht geladen werden.'
}

async function previewCohort(): Promise<void> {
  errorMessage.value = ''
  if (!studyName.value.trim() || !hypothesis.value.trim()) {
    errorMessage.value = 'Bitte Studienname und Hypothese formulieren.'
    return
  }
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    errorMessage.value = 'Das Startdatum darf nicht nach dem Enddatum liegen.'
    return
  }

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  loading.value = true
  try {
    preview.value = await fetchStudyCohortPreview(requestFilters())
  } catch (error) {
    if (!controller.signal.aborted) errorMessage.value = readableError(error)
  } finally {
    if (activeController === controller) {
      activeController = null
      loading.value = false
    }
  }
}

function formatDate(value: string | null): string {
  if (!value) return 'Kein Untersuchungsdatum'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('de-DE')
}

function joinValues(values: string[]): string {
  return values.length ? values.join(', ') : 'Keine'
}

function availabilityClass(availability: string): string {
  switch (availability.toLowerCase()) {
    case 'local':
    case 'available':
      return 'bg-success'
    case 'fetching':
      return 'bg-info text-dark'
    case 'hub_only':
    case 'hub-only':
      return 'bg-warning text-dark'
    case 'lost':
      return 'bg-danger'
    default:
      return 'bg-secondary'
  }
}

onBeforeUnmount(() => {
  activeController?.abort()
  activeController = null
})
</script>

<style scoped>
.study-cohort-page {
  max-width: 1600px;
}

.cohort-case {
  background: #fff;
}
</style>
