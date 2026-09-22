<template>
  <main class="container-fluid py-4 study-cohort-page">
    <header class="mb-4">
      <div class="small text-uppercase text-muted fw-semibold">Registerstudien</div>
      <h3 class="mb-1">Studie und Kohorte vorbereiten</h3>
      <p class="text-muted mb-0">
        Hypothese formulieren und pseudonymisierte Untersuchungsfälle serverseitig filtern.
      </p>
    </header>

    <section
      class="card p-3 mb-3"
      data-test="cohort-eligibility"
    >
      <h2 class="h5">Wann wird ein Patient aufgenommen?</h2>
      <ul class="mb-2">
        <li>
          Es gibt eine zugeordnete Patientenuntersuchung mit pseudonymisiertem Patienten und
          Patientenhash.
        </li>
        <li>
          Mindestens ein zugeordneter Bericht oder ein Video hat eine bestätigte Anonymisierung,
          eine verarbeitete Datei und eine gespeicherte Integritätsprüfsumme.
        </li>
        <li>
          Die verarbeitete Datei muss lokal vorhanden und nicht leer sein, damit der Patient
          angezeigt wird.
        </li>
        <li>
          Alle gesetzten Filter müssen auf dieselbe Untersuchung passen. Ein Annotationslabel
          verlangt eine positive Frame-Annotation; ein KI-Segment allein genügt nicht.
        </li>
        <li>
          Verknüpfte Datensätze liefern gemeinsam die Kandidaten. Leere Datensätze oder Videos ohne
          Untersuchungszuordnung fügen keine Patienten hinzu.
        </li>
      </ul>
      <p class="mb-0 small">
        Ohne Datensatzverknüpfung werden alle berechtigten Untersuchungen geprüft. Studienname und
        Hypothese dokumentieren die Auswahl; sie sind keine Suchbegriffe. Es werden keine Patienten
        neu angelegt und keine Annotationen kopiert. Gespeicherte Kohorten gehören Ihrem
        Benutzerkonto.
      </p>
    </section>
    <section class="card p-3 mb-3">
      <label
        for="saved-cohort"
        class="form-label"
        >Gespeicherte Kohorte</label
      >
      <select
        id="saved-cohort"
        v-model="selectedCohortId"
        class="form-select"
        data-test="saved-cohort"
        :disabled="saving"
        @change="selectCohort"
      >
        <option value="">Neue Kohorte</option>
        <option
          v-for="cohort in savedCohorts"
          :key="cohort.id"
          :value="String(cohort.id)"
        >
          {{ cohort.name }}
        </option>
      </select>
      <button
        type="button"
        class="btn btn-link mb-0"
        :disabled="saving || loading"
        @click="loadSavedOptions"
      >
        Gespeicherte Kohorten und Datensätze neu laden
      </button>
      <p
        v-if="savedMessage"
        role="status"
        class="mb-0"
      >
        {{ savedMessage }}
      </p>
    </section>
    <form
      class="d-grid gap-4"
      @submit.prevent="previewCohort"
    >
      <section class="card shadow-sm">
        <div class="card-header">
          <h5 class="mb-0">Studienfrage</h5>
        </div>
        <div class="card-body row g-3">
          <div class="col-lg-4">
            <label
              class="form-label"
              for="study-name"
              >Studienname</label
            >
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
            <label
              class="form-label"
              for="study-hypothesis"
              >Hypothese</label
            >
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
          <span
            v-if="preview"
            class="badge bg-secondary"
            >Schema {{ preview.schemaVersion }}</span
          >
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-sm-6 col-xl-3">
              <label
                class="form-label"
                for="date-from"
                >Datum von</label
              >
              <input
                id="date-from"
                v-model="filters.dateFrom"
                class="form-control"
                type="date"
                data-test="date-from"
              />
            </div>
            <div class="col-sm-6 col-xl-3">
              <label
                class="form-label"
                for="date-to"
                >Datum bis</label
              >
              <input
                id="date-to"
                v-model="filters.dateTo"
                class="form-control"
                type="date"
                data-test="date-to"
              />
            </div>
            <div class="col-sm-6 col-xl-3">
              <label
                class="form-label"
                for="center-key"
                >Zentrum</label
              >
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
              <label
                class="form-label"
                for="examination-name"
                >Untersuchung</label
              >
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
                <option
                  v-for="name in cohortOptions.examinations"
                  :key="name"
                  :value="name"
                />
              </datalist>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label
                class="form-label"
                for="document-type"
                >Dokumenttyp</label
              >
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
              <label
                class="form-label"
                for="finding"
                >Befund</label
              >
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
                <option
                  v-for="finding in cohortOptions.findings"
                  :key="finding"
                  :value="finding"
                />
              </datalist>
            </div>
            <div class="col-sm-6 col-xl-3">
              <label
                class="form-label"
                for="annotation-label"
                >Annotationslabel</label
              >
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
              <label
                class="form-label"
                for="has-report"
                >Bericht vorhanden</label
              >
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
              <label
                class="form-label"
                for="has-video"
                >Video vorhanden</label
              >
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
              <label
                class="form-label"
                for="case-limit"
                >Maximale Fälle</label
              >
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

          <div
            class="mt-3"
            data-test="cohort-datasets"
          >
            <label
              for="cohort-datasets"
              class="form-label"
              >Datensätze dieser Kohorte (Mehrfachauswahl)</label
            >
            <select
              id="cohort-datasets"
              v-model="selectedDatasetIds"
              multiple
              class="form-select"
              data-test="cohort-dataset-select"
            >
              <option
                v-for="dataset in datasetOptions"
                :key="dataset.id"
                :value="dataset.id"
              >
                {{ dataset.label }}
              </option>
            </select>
            <small
              >Die Vereinigung der zugeordneten Untersuchungen wird mit den Einschlussfiltern
              geprüft. Verknüpfungen werden erst mit „Kohorte speichern“ gespeichert.</small
            >
          </div>
          <div class="d-flex justify-content-end gap-2 mt-3">
            <button
              type="button"
              class="btn btn-outline-primary mb-0"
              :disabled="saving || loading"
              data-test="save-cohort"
              @click="saveCohort"
            >
              {{ saving ? 'Wird gespeichert …' : 'Kohorte speichern' }}
            </button>
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
      <div
        class="alert alert-info mt-3"
        data-test="cohort-selection-scope"
      >
        {{ preview.summary.patientCount }} Patienten erfüllen die Datenbankkriterien.
        {{ preview.cases.length }} Patienten werden mit lokal verfügbaren Medien angezeigt und für
        den Excel-Export übernommen. Die Vorschau ist auf {{ preview.filters.limit }} Patienten
        begrenzt. Größere Trefferzahlen erfordern engere Filter oder ein höheres Limit (maximal
        500).
        <template v-if="preview.eligibility">
          <div>
            {{ preview.eligibility.candidateExaminationCount }} Kandidaten-Untersuchungen, davon
            {{ preview.eligibility.pseudonymousExaminationCount }} mit pseudonymisiertem Patienten
            und Hash.
          </div>
          <div v-if="preview.eligibility.datasetCount">
            {{ preview.eligibility.datasetCount }} Datensätze mit
            {{ preview.eligibility.datasetVideoCount }} Videos;
            {{ preview.eligibility.missingExaminationVideoCount }} ohne Untersuchungszuordnung,
            {{ preview.eligibility.conflictingPatientVideoCount }} mit widersprüchlicher
            Patientenzuordnung.
          </div>
        </template>
      </div>
      <section
        class="row g-3 mt-1"
        aria-label="Kohortenzusammenfassung"
      >
        <div
          v-for="metric in summaryMetrics"
          :key="metric.key"
          class="col-6 col-xl-3"
        >
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="small text-uppercase text-muted">{{ metric.label }}</div>
              <strong
                class="fs-4"
                :data-test="`summary-${metric.key}`"
                >{{ metric.value }}</strong
              >
            </div>
          </div>
        </div>
      </section>

      <div class="d-flex justify-content-end mt-3">
        <button
          type="button"
          class="btn btn-success mb-0"
          :disabled="preview.cases.length === 0"
          data-test="open-cohort-export"
          @click="openCohortExport"
        >
          Kohorte exportieren
        </button>
      </div>

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
          <div
            v-if="!preview.cases.length"
            class="text-muted"
            data-test="cohort-empty"
          >
            Keine exportierbaren Patienten in dieser Vorschau. Prüfen Sie zuerst die
            Datensatz-Annotationen und Untersuchungszuordnung, dann Patientenhash,
            Anonymisierungsfreigabe, Integritätsprüfsumme und lokale verarbeitete Datei. Entfernen
            Sie anschließend unnötige Filter und berechnen Sie die Vorschau erneut. „Kein Bericht“
            und „Kein Video“ zusammen schließen alle Fälle aus.
          </div>
          <div
            v-else
            class="d-grid gap-3"
            data-test="cohort-cases"
          >
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
                  <div
                    v-if="!cohortCase.reports.length"
                    class="small text-muted"
                  >
                    Keine
                  </div>
                  <ul
                    v-else
                    class="list-unstyled small mb-0 d-grid gap-1"
                  >
                    <li
                      v-for="report in cohortCase.reports"
                      :key="report.id"
                      class="d-flex flex-wrap align-items-center gap-2"
                    >
                      <span>#{{ report.id }} · {{ report.documentType || 'Bericht' }}</span>
                      <span
                        class="badge"
                        :class="availabilityClass(report.availability)"
                      >
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
                  <div
                    v-if="!cohortCase.videos.length"
                    class="small text-muted"
                  >
                    Keine
                  </div>
                  <ul
                    v-else
                    class="list-unstyled small mb-0 d-grid gap-1"
                  >
                    <li
                      v-for="video in cohortCase.videos"
                      :key="video.id"
                      class="d-flex flex-wrap align-items-center gap-2"
                    >
                      <span>#{{ video.id }}</span>
                      <span
                        class="badge"
                        :class="availabilityClass(video.availability)"
                      >
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

    <div
      v-else
      class="card shadow-sm mt-4"
    >
      <div
        class="card-body text-muted"
        data-test="preview-empty"
      >
        Noch keine Kohortenvorschau geladen. Die Seite verwendet keine lokalen Beispieldaten.
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { type StudyCohortPreviewFilters, type StudyCohortPreviewResponse } from '@/api/studyApi'
import { fetchAiDatasetOptions, type AiDatasetOption } from '@/api/aiDatasetApi'
import {
  fetchStudyCohorts,
  previewStudyCohort,
  saveStudyCohort,
  type SavedStudyCohort
} from '@/api/studyCohortApi'
import { useStudyCohortExportStore } from '@/stores/studyCohortExportStore'

const router = useRouter()
const cohortExportStore = useStudyCohortExportStore()
const studyName = ref('')
const hypothesis = ref('')
const savedCohorts = ref<SavedStudyCohort[]>([])
const datasetOptions = ref<AiDatasetOption[]>([])
const selectedCohortId = ref('')
const selectedDatasetIds = ref<number[]>([])
const saving = ref(false)
const savedMessage = ref('')
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

watch(
  [studyName, hypothesis, hasReportFilter, hasVideoFilter, filters, selectedDatasetIds],
  () => {
    activeController?.abort()
    activeController = null
    loading.value = false
    preview.value = null
    cohortExportStore.clear()
    savedMessage.value = ''
  },
  { deep: true }
)

function triState(value: '' | 'true' | 'false'): boolean | null {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
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

function previewValidationError(): string {
  if (!studyName.value.trim() || !hypothesis.value.trim()) {
    return 'Bitte Studienname und Hypothese formulieren.'
  }
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    return 'Das Startdatum darf nicht nach dem Enddatum liegen.'
  }
  return ''
}

async function previewCohort(): Promise<void> {
  errorMessage.value = previewValidationError()
  if (errorMessage.value) return

  cohortExportStore.clear()
  preview.value = null
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  loading.value = true
  const name = studyName.value
  const description = hypothesis.value
  try {
    const result = await previewStudyCohort(
      {
        name,
        hypothesis: description,
        filters: requestFilters(),
        datasetIds: [...selectedDatasetIds.value]
      },
      controller.signal
    )
    if (controller.signal.aborted || activeController !== controller) return
    cohortExportStore.capture(name, description, result)
    preview.value = result
  } catch (error) {
    if (!controller.signal.aborted) {
      errorMessage.value = readableError(error)
    }
  } finally {
    if (activeController === controller) {
      activeController = null
      loading.value = false
    }
  }
}

async function loadSavedOptions(): Promise<void> {
  try {
    const [cohorts, datasets] = await Promise.all([fetchStudyCohorts(), fetchAiDatasetOptions()])
    savedCohorts.value = cohorts
    datasetOptions.value = datasets
    if (selectedCohortId.value) selectCohort()
  } catch (error) {
    errorMessage.value = readableError(error)
  }
}

function selectCohort(): void {
  const cohort = savedCohorts.value.find((row) => String(row.id) === selectedCohortId.value)
  studyName.value = cohort?.name ?? ''
  hypothesis.value = cohort?.hypothesis ?? ''
  selectedDatasetIds.value = [...(cohort?.datasetIds ?? [])]
  applySavedFilters(cohort?.filters ?? {})
}

function booleanFilter(value: boolean | null | undefined): '' | 'true' | 'false' {
  if (value == null) return ''
  return value ? 'true' : 'false'
}

function applySavedFilters(saved: StudyCohortPreviewFilters): void {
  filters.dateFrom = saved.dateFrom ?? ''
  filters.dateTo = saved.dateTo ?? ''
  filters.centerKey = saved.centerKey ?? ''
  filters.examinationName = saved.examinationName ?? ''
  filters.documentType = saved.documentType ?? ''
  filters.finding = saved.finding ?? ''
  filters.annotationLabel = saved.annotationLabel ?? ''
  filters.limit = saved.limit ?? 100
  hasReportFilter.value = booleanFilter(saved.hasReport)
  hasVideoFilter.value = booleanFilter(saved.hasVideo)
}

async function saveCohort(): Promise<void> {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const cohort = await saveStudyCohort(
      {
        name: studyName.value,
        hypothesis: hypothesis.value,
        filters: requestFilters(),
        datasetIds: [...selectedDatasetIds.value]
      },
      selectedCohortId.value ? Number(selectedCohortId.value) : undefined
    )
    savedCohorts.value = [...savedCohorts.value.filter((row) => row.id !== cohort.id), cohort]
    selectedCohortId.value = String(cohort.id)
    savedMessage.value =
      'Kohorte und Datensatzverknüpfungen gespeichert. Patienten werden bei jeder Vorschau erneut geprüft.'
  } catch (error) {
    errorMessage.value = readableError(error)
  } finally {
    saving.value = false
  }
}

onMounted(loadSavedOptions)

async function openCohortExport(): Promise<void> {
  if (!preview.value?.cases.length || !cohortExportStore.definition) {
    return
  }
  await router.push({ path: '/export', query: { mode: 'cohort' } })
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Kein Untersuchungsdatum'
  }
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
