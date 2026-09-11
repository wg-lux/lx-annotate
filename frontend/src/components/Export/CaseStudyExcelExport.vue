<template>
  <section
    class="card case-study-export"
    aria-labelledby="case-study-export-title"
  >
    <div class="card-header pb-0">
      <h5
        id="case-study-export-title"
        class="mb-0"
      >Pseudonymisierte Fallliste</h5>
      <p class="text-muted mb-0">
        Untersuchungen, Befunde oder Indikationen auswählen und passende Patientenverläufe als
        Excel-Liste exportieren.
      </p>
    </div>

    <div class="card-body">
      <fieldset class="mb-3">
        <legend class="form-label mb-2">Gruppierung</legend>
        <div
          class="btn-group"
          role="radiogroup"
          aria-label="Gruppierung der Excel-Zeilen"
        >
          <input
            id="group-by-patient"
            v-model="groupBy"
            class="btn-check"
            type="radio"
            value="patient"
            autocomplete="off"
          />
          <label
            class="btn btn-outline-primary mb-0"
            for="group-by-patient"
          >
            Patientenverlauf
          </label>
          <input
            id="group-by-examination"
            v-model="groupBy"
            class="btn-check"
            type="radio"
            value="examination"
            autocomplete="off"
          />
          <label
            class="btn btn-outline-primary mb-0"
            for="group-by-examination"
          >
            Einzelne Untersuchung
          </label>
        </div>
      </fieldset>

      <div
        v-if="loadingOptions"
        class="d-flex align-items-center gap-2 text-muted py-3"
      >
        <span
          class="spinner-border spinner-border-sm"
          aria-hidden="true"
        ></span>
        Auswahl wird geladen…
      </div>

      <div
        v-else-if="options"
        class="row g-3"
      >
        <div
          v-for="group in optionGroups"
          :key="group.key"
          class="col-12 col-lg-4"
          :data-test="`option-group-${group.key}`"
        >
          <fieldset class="concept-group h-100">
            <legend class="form-label d-flex justify-content-between align-items-center concept-group-heading">
              <span>{{ group.label }}</span>
              <span class="badge bg-secondary">{{ selections[group.key].length }}</span>
            </legend>
            <input
              v-model="searches[group.key]"
              class="form-control form-control-sm mb-2"
              type="search"
              :aria-label="`${group.label} durchsuchen`"
              placeholder="Suchen"
              :data-test="`search-${group.key}`"
            />
            <div class="concept-options">
              <label
                v-for="value in filteredGroupValues(group)"
                :key="value"
                class="form-check concept-option"
              >
                <input
                  v-model="selections[group.key]"
                  class="form-check-input"
                  type="checkbox"
                  :value="value"
                  :data-test="`option-${group.key}`"
                />
                <span class="form-check-label text-break">{{ value }}</span>
              </label>
              <div
                v-if="filteredGroupValues(group).length === 0"
                class="small text-muted py-2"
              >
                Keine Einträge
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      <div
        v-if="message"
        class="alert mt-3 mb-0"
        :class="message.type === 'success' ? 'alert-success' : 'alert-danger'"
        role="alert"
        data-test="export-message"
      >
        {{ message.text }}
      </div>

      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4">
        <small class="text-muted">
          {{ selectedCount }} Kriterien ausgewählt · maximal
          {{ options?.maximumRows.toLocaleString('de-DE') ?? '–' }} Zeilen
        </small>
        <button
          type="button"
          class="btn btn-success mb-0"
          :disabled="loadingOptions || exporting || selectedCount === 0"
          data-test="download-workbook"
          @click="downloadWorkbook"
        >
          <span
            v-if="exporting"
            class="spinner-border spinner-border-sm me-1"
            aria-hidden="true"
          ></span>
          {{ exporting ? 'Excel wird erstellt…' : 'Excel exportieren' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  fetchStudyExportOptions,
  fetchStudyExportWorkbook,
  type StudyExportOptions
} from '@/api/studyExportApi'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

type GroupKey = 'examinations' | 'findings' | 'indications'
type ExportMessage = { type: 'success' | 'error'; text: string }

interface OptionGroup {
  key: GroupKey
  label: string
  values: string[]
}

const log = createRuntimeLogger('case-study-excel-export')
const options = ref<StudyExportOptions | null>(null)
const groupBy = ref<'patient' | 'examination'>('patient')
const selections = reactive<Record<GroupKey, string[]>>({
  examinations: [],
  findings: [],
  indications: []
})
const searches = reactive<Record<GroupKey, string>>({
  examinations: '',
  findings: '',
  indications: ''
})
const loadingOptions = ref(true)
const exporting = ref(false)
const message = ref<ExportMessage | null>(null)

const optionGroups = computed<OptionGroup[]>(() => [
  {
    key: 'examinations',
    label: 'Untersuchungen',
    values: options.value?.examinations ?? []
  },
  {
    key: 'findings',
    label: 'Befunde',
    values: options.value?.findings ?? []
  },
  {
    key: 'indications',
    label: 'Indikationen',
    values: options.value?.indications ?? []
  }
])

const selectedCount = computed(
  () => selections.examinations.length + selections.findings.length + selections.indications.length
)

function filteredGroupValues(group: OptionGroup): string[] {
  const needle = searches[group.key].trim().toLocaleLowerCase('de-DE')
  if (!needle) {
    return group.values
  }
  return group.values.filter((value) => value.toLocaleLowerCase('de-DE').includes(needle))
}

function readableError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Excel-Export fehlgeschlagen.'
  }
  const candidate = error as {
    message?: string
    response?: { data?: Blob | { detail?: string; error?: string } }
  }
  const data = candidate.response?.data
  if (data && !(data instanceof Blob)) {
    return data.detail || data.error || candidate.message || ''
  }
  return candidate.message || 'Excel-Export fehlgeschlagen.'
}

async function blobError(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return readableError(error)
  }
  const data = (error as { response?: { data?: unknown } }).response?.data
  if (!(data instanceof Blob) || !data.type.startsWith('application/json')) {
    return readableError(error)
  }
  try {
    const text =
      typeof data.text === 'function'
        ? await data.text()
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.addEventListener('load', () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result)
                return
              }
              if (reader.result instanceof ArrayBuffer) {
                resolve(new TextDecoder().decode(reader.result))
                return
              }
              reject(new Error('The export error response could not be read.'))
            })
            reader.addEventListener('error', () => {
              reject(reader.error ?? new Error('The export error response could not be read.'))
            })
            reader.readAsText(data)
          })
    const parsed = JSON.parse(text) as { detail?: unknown; error?: unknown }
    if (typeof parsed.detail === 'string') {
      return parsed.detail
    }
    if (typeof parsed.error === 'string') {
      return parsed.error
    }
  } catch (parseError) {
    log.error('error-response.parse-failed', parseError)
  }
  return readableError(error)
}

function saveDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.click()
  URL.revokeObjectURL(objectUrl)
}

async function loadOptions(): Promise<void> {
  loadingOptions.value = true
  message.value = null
  try {
    options.value = await fetchStudyExportOptions()
  } catch (error) {
    log.error('options.load-failed', error)
    message.value = { type: 'error', text: readableError(error) }
  } finally {
    loadingOptions.value = false
  }
}

async function downloadWorkbook(): Promise<void> {
  if (selectedCount.value === 0) {
    return
  }
  exporting.value = true
  message.value = null
  try {
    const result = await fetchStudyExportWorkbook({
      examinations: selections.examinations,
      findings: selections.findings,
      indications: selections.indications,
      groupBy: groupBy.value
    })
    saveDownload(result.blob, result.filename)
    message.value = {
      type: 'success',
      text: `${result.rowCount.toLocaleString('de-DE')} Patientenverläufe wurden exportiert.`
    }
  } catch (error) {
    log.error('workbook.download-failed', error)
    message.value = { type: 'error', text: await blobError(error) }
  } finally {
    exporting.value = false
  }
}

onMounted(loadOptions)
</script>

<style scoped>
.case-study-export {
  border: 1px solid #dfe3e8;
}

.concept-group {
  min-width: 0;
  padding: 12px;
  border: 1px solid #dfe3e8;
  border-radius: 6px;
}

.concept-group .concept-group-heading {
  float: none;
  width: 100%;
  margin-bottom: 8px;
}

.concept-options {
  min-height: 148px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 4px;
}

.concept-option {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0;
  padding: 7px 4px 7px 1.75rem;
}

.concept-option + .concept-option {
  border-top: 1px solid #eef0f2;
}
</style>
