<template>
  <section
    class="card"
    aria-labelledby="study-cohort-export-title"
  >
    <div class="card-header pb-0">
      <h5
        id="study-cohort-export-title"
        class="mb-0"
      >Vorbereitete Studienkohorte</h5>
      <p class="text-muted mb-0">
        Exportiert genau die zuletzt auf der Studienseite geprüften Untersuchungsfälle.
      </p>
    </div>

    <div
      v-if="!definition"
      class="card-body"
      data-test="cohort-export-empty"
    >
      <p class="text-muted">Es wurde noch keine Studienkohorte vorbereitet.</p>
      <router-link
        class="btn btn-primary mb-0"
        to="/studies"
      >Studie vorbereiten</router-link>
    </div>

    <div
      v-else
      class="card-body"
      data-test="cohort-export-definition"
    >
      <dl class="row mb-3">
        <dt class="col-sm-3">Studie</dt>
        <dd
          class="col-sm-9"
          data-test="cohort-study-name"
        >{{ definition.studyName }}</dd>
        <dt class="col-sm-3">Hypothese</dt>
        <dd
          class="col-sm-9"
          data-test="cohort-hypothesis"
        >{{ definition.hypothesis }}</dd>
        <dt class="col-sm-3">Patienten</dt>
        <dd class="col-sm-9">{{ definition.summary.patientCount }}</dd>
        <dt class="col-sm-3">Untersuchungen</dt>
        <dd class="col-sm-9">{{ definition.patientExaminationIds.length }}</dd>
      </dl>

      <div
        class="mb-3"
        data-test="cohort-export-filters"
      >
        <div class="fw-semibold mb-1">Geprüfte Einschlussfilter</div>
        <ul class="small mb-0">
          <li
            v-for="filter in activeFilters"
            :key="filter.label"
          >
            {{ filter.label }}: {{ filter.value }}
          </li>
        </ul>
      </div>

      <div
        v-if="message"
        class="alert mb-3"
        :class="message.type === 'success' ? 'alert-success' : 'alert-danger'"
        role="alert"
        data-test="cohort-export-message"
      >
        {{ message.text }}
      </div>

      <div class="d-flex justify-content-end">
        <button
          type="button"
          class="btn btn-success mb-0"
          :disabled="exporting || definition.patientExaminationIds.length === 0"
          data-test="download-cohort-workbook"
          @click="downloadCohort"
        >
          {{ exporting ? 'Excel wird erstellt…' : 'Studienkohorte exportieren' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { fetchStudyCohortExportWorkbook } from '@/api/studyExportApi'
import { useStudyCohortExportStore } from '@/stores/studyCohortExportStore'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

type ExportMessage = { type: 'success' | 'error'; text: string }

const log = createRuntimeLogger('study-cohort-excel-export')
const cohortExportStore = useStudyCohortExportStore()
const { definition } = storeToRefs(cohortExportStore)
const exporting = ref(false)
const message = ref<ExportMessage | null>(null)

const activeFilters = computed(() => {
  const filters = definition.value?.filters
  if (!filters) {
    return []
  }
  const values: Array<[string, string | null | undefined]> = [
    ['Datum von', filters.dateFrom],
    ['Datum bis', filters.dateTo],
    ['Zentrum', filters.centerKey],
    ['Untersuchung', filters.examinationName],
    ['Dokumenttyp', filters.documentType],
    ['Befund', filters.finding],
    ['Annotationslabel', filters.annotationLabel],
    [
      'Bericht vorhanden',
      typeof filters.hasReport === 'boolean' ? String(filters.hasReport) : ''
    ],
    [
      'Video vorhanden',
      typeof filters.hasVideo === 'boolean' ? String(filters.hasVideo) : ''
    ],
    ['Maximale Fälle', typeof filters.limit === 'number' ? String(filters.limit) : '']
  ]
  return values
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, value]) => ({ label, value }))
})

function readableError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Studienkohorte konnte nicht exportiert werden.'
  }
  const candidate = error as {
    message?: string
    response?: { data?: Blob | { detail?: string; error?: string } }
  }
  const data = candidate.response?.data
  if (data && !(data instanceof Blob)) {
    return data.detail || data.error || candidate.message || ''
  }
  return candidate.message || 'Studienkohorte konnte nicht exportiert werden.'
}

function saveDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

async function downloadCohort(): Promise<void> {
  const currentDefinition = definition.value
  if (!currentDefinition?.patientExaminationIds.length) {
    return
  }
  exporting.value = true
  message.value = null
  try {
    const result = await fetchStudyCohortExportWorkbook(currentDefinition)
    saveDownload(result.blob, result.filename)
    message.value = {
      type: 'success',
      text: `${result.rowCount.toLocaleString('de-DE')} Patientenverläufe wurden exportiert.`
    }
  } catch (error) {
    log.error('workbook.download-failed', error)
    message.value = { type: 'error', text: readableError(error) }
  } finally {
    exporting.value = false
  }
}
</script>
