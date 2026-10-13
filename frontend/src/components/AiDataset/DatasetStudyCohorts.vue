<template>
  <section
    class="card p-3 my-3"
    data-test="dataset-study-cohorts"
  >
    <h2 class="h5">Studienkohorten</h2>
    <p>
      Ein Datensatz kann mehreren Ihrer gespeicherten Kohorten angehören. Eine Kohorte kann mehrere
      Datensätze verwenden. Deren Annotationen liefern die Untersuchungen für die Kohortenvorschau;
      die Einschlusskriterien werden dort zusätzlich geprüft.
    </p>
    <p class="small text-muted">
      Verknüpfen kopiert keine Annotationen. Das Training-Manifest enthält weiterhin den
      ausgewählten Datensatz mit seinen Manifest-Filtern. Den geprüften Patientenumfang exportieren
      Sie auf der Studienseite als Excel.
    </p>
    <div
      v-if="error"
      class="alert alert-danger"
      role="alert"
    >
      {{ error }}
    </div>
    <p
      v-if="loading"
      role="status"
    >
      Kohorten werden geladen …
    </p>
    <p v-else-if="!cohorts.length">Noch keine eigene Kohorte gespeichert.</p>
    <label
      v-for="cohort in cohorts"
      :key="cohort.id"
      class="d-block mb-2"
    >
      <input
        type="checkbox"
        :checked="cohort.datasetIds.includes(Number(datasetId))"
        :disabled="busy || !datasetId"
        :data-test="`cohort-link-${String(cohort.id)}`"
        @change="toggle(cohort, $event)"
      />
      {{ cohort.name }} · {{ cohort.datasetIds.length }} Datensätze
    </label>
    <router-link to="/studies">Kohorten und Einschlusskriterien öffnen</router-link>
    <button
      type="button"
      class="btn btn-link mb-0"
      :disabled="busy"
      @click="load"
    >
      Verknüpfungen neu laden
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  fetchStudyCohorts,
  linkDatasetStudyCohort,
  type SavedStudyCohort
} from '@/api/studyCohortApi'

const emit = defineEmits<{ changed: [] }>()
const props = defineProps<{ datasetId: string }>()
const cohorts = ref<SavedStudyCohort[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const busy = computed(() => loading.value || saving.value)
let generation = 0

async function load(): Promise<void> {
  const current = ++generation
  loading.value = true
  error.value = ''
  try {
    const result = await fetchStudyCohorts()
    if (current === generation) cohorts.value = result
  } catch {
    if (current === generation) error.value = 'Kohorten konnten nicht geladen werden.'
  } finally {
    if (current === generation) loading.value = false
  }
}

async function toggle(cohort: SavedStudyCohort, event: Event): Promise<void> {
  if (event.target instanceof HTMLInputElement) {
    event.target.checked = cohort.datasetIds.includes(Number(props.datasetId))
  }
  if (busy.value || !props.datasetId) return
  const datasetId = props.datasetId
  saving.value = true
  error.value = ''
  try {
    const updated = await linkDatasetStudyCohort(
      datasetId,
      cohort.id,
      !cohort.datasetIds.includes(Number(datasetId))
    )
    cohorts.value = cohorts.value.map((row) => (row.id === updated.id ? updated : row))
    emit('changed')
  } catch {
    error.value = 'Die Verknüpfung wurde nicht gespeichert. Bitte neu laden und erneut versuchen.'
  } finally {
    saving.value = false
  }
}

watch(() => props.datasetId, load, { immediate: true })
</script>
