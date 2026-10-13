<template>
  <section
    class="card mb-4"
    aria-labelledby="table-import-title"
  >
    <div class="card-body">
      <h2
        id="table-import-title"
        class="h5"
      >
        Studientabelle importieren
      </h2>
      <p v-if="!cohort">Bitte zuerst eine gespeicherte Kohorte auswählen oder anlegen.</p>
      <template v-else>
        <p>
          Import in die ausgewählte Kohorte. Vollständiger Name, Geburtsdatum und Untersuchungsdatum
          sind erforderlich.
        </p>
        <label
          for="table-mapping"
          class="form-label"
          >Spaltenzuordnung</label
        >
        <select
          id="table-mapping"
          v-model="mapping_id"
          class="form-select mb-2"
          :disabled="busy"
          @change="load_mapping"
        >
          <option value="">Zuordnung auswählen</option>
          <option
            v-for="mapping in options.mappings"
            :key="mapping.id"
            :value="mapping.id"
          >
            {{ mapping.name }}
          </option>
        </select>
        <details class="mb-3">
          <summary>YAML-Zuordnung erstellen oder ansehen</summary>
          <button
            class="btn btn-outline-secondary mt-2 d-block"
            :disabled="busy || !options.template"
            @click="new_mapping"
          >
            Neue Zuordnung aus Vorlage
          </button>
          <label
            for="mapping-upload"
            class="form-label mt-2"
            >Vorhandene YAML-Datei laden</label
          >
          <input
            id="mapping-upload"
            class="form-control"
            type="file"
            accept=".yml,.yaml"
            :disabled="busy"
            @change="read_yaml"
          />
          <label
            for="mapping-yaml"
            class="form-label mt-2"
            >YAML-Zuordnung</label
          >
          <textarea
            id="mapping-yaml"
            v-model="mapping_yaml"
            rows="12"
            class="form-control font-monospace"
            :disabled="busy"
          />
          <p class="form-text">
            Änderungen benötigen eine neue mapping_id. Die YAML-Datei enthält Spaltennamen und
            Regeln, keine Patientenwerte.
          </p>
          <button
            class="btn btn-outline-primary"
            :disabled="busy || !mapping_yaml.trim()"
            @click="save_mapping"
          >
            Zuordnung speichern
          </button>
        </details>
        <label
          for="table-center"
          class="form-label"
          >Zentrum</label
        >
        <select
          id="table-center"
          v-model="center_id"
          class="form-select mb-2"
          :disabled="busy"
        >
          <option value="">Zentrum auswählen</option>
          <option
            v-for="center in options.centers"
            :key="center.id"
            :value="String(center.id)"
          >
            {{ center.name }}
          </option>
        </select>
        <label
          for="table-upload"
          class="form-label"
          >CSV- oder Excel-Tabelle</label
        >
        <input
          id="table-upload"
          type="file"
          accept=".csv,.xlsx,.xls"
          class="form-control mb-3"
          :disabled="busy"
          @change="select_table"
        />
        <div class="d-flex gap-2">
          <button
            class="btn btn-outline-primary"
            :disabled="busy || !ready"
            @click="run_import('validate')"
          >
            Tabelle prüfen
          </button>
          <button
            class="btn btn-primary"
            :disabled="busy || !validated"
            @click="run_import('import')"
          >
            In Kohorte importieren
          </button>
        </div>
        <p
          v-if="busy"
          role="status"
          class="mt-2"
        >
          Tabelle wird verarbeitet …
        </p>
        <p
          v-if="result"
          role="status"
          class="alert alert-success mt-3"
        >
          {{ completed ? 'Import abgeschlossen.' : 'Prüfung erfolgreich; noch nicht gespeichert.' }}
          {{ result.rows }} Zeilen, {{ result.created }} neue und {{ result.replayed }} bereits
          importierte Einträge. {{ result.videos }} Videos und {{ result.reports }} Berichte
          zugeordnet.
        </p>
      </template>
      <p
        v-if="error"
        role="alert"
        class="alert alert-danger mt-3"
      >
        {{ error }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import {
  import_study_table,
  list_table_mappings,
  read_table_mapping,
  save_table_mapping,
  type TableImportOptions,
  type TableImportResult
} from '@/api/tableImportApi'

const props = defineProps<{ cohort: number | null }>()
const emit = defineEmits<{ imported: [] }>()
const options = ref<TableImportOptions>({ template: '', mappings: [], centers: [] })
const mapping_id = ref('')
const center_id = ref('')
const mapping_yaml = ref('')
const source_file = ref<File | null>(null)
const busy = ref(false)
const validated = ref(false)
const completed = ref(false)
const result = ref<TableImportResult | null>(null)
const error = ref('')
const ready = computed(
  () => props.cohort && mapping_id.value && center_id.value && source_file.value
)

watch([() => props.cohort, mapping_id, center_id, source_file], () => {
  validated.value = false
  result.value = null
  error.value = ''
})

function show_error(cause: unknown): void {
  error.value = isAxiosError<{ detail?: string }>(cause)
    ? (cause.response?.data.detail ?? 'Import fehlgeschlagen.')
    : 'Datei konnte nicht verarbeitet werden.'
}

async function refresh_options(): Promise<void> {
  try {
    options.value = await list_table_mappings()
  } catch (cause) {
    show_error(cause)
  }
}

async function load_mapping(): Promise<void> {
  if (!mapping_id.value) return
  try {
    mapping_yaml.value = await read_table_mapping(mapping_id.value)
  } catch (cause) {
    show_error(cause)
  }
}

async function new_mapping(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    options.value = await list_table_mappings()
    mapping_id.value = ''
    mapping_yaml.value = options.value.template
  } catch (cause) {
    show_error(cause)
  } finally {
    busy.value = false
  }
}

async function read_yaml(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 1_048_576) {
    error.value = 'Die YAML-Datei darf höchstens 1 MiB groß sein.'
    return
  }
  try {
    mapping_yaml.value = await file.text()
  } catch (cause) {
    show_error(cause)
  }
}

function select_table(event: Event): void {
  source_file.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

async function save_mapping(): Promise<void> {
  busy.value = true
  error.value = ''
  try {
    const saved = await save_table_mapping(mapping_yaml.value)
    await refresh_options()
    mapping_id.value = saved.id
  } catch (cause) {
    show_error(cause)
  } finally {
    busy.value = false
  }
}

async function run_import(mode: 'validate' | 'import'): Promise<void> {
  if (!props.cohort || !source_file.value || busy.value || !ready.value) return
  if (mode === 'import' && !validated.value) return
  const selected_cohort = props.cohort
  busy.value = true
  error.value = ''
  result.value = null
  try {
    const response = await import_study_table(
      selected_cohort,
      mapping_id.value,
      Number(center_id.value),
      source_file.value,
      mode
    )
    if (props.cohort !== selected_cohort) return
    result.value = response
    completed.value = mode === 'import'
    validated.value = mode === 'validate'
    if (completed.value) emit('imported')
  } catch (cause) {
    validated.value = false
    show_error(cause)
  } finally {
    busy.value = false
  }
}

onMounted(refresh_options)
</script>
