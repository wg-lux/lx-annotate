<template>
  <section
    class="card my-4"
    aria-label="Datensätze verwalten"
  >
    <div class="card-body">
      <h2 class="h5">Datensätze verwalten</h2>
      <p>
        Tabellenimporte erzeugen einen Datensatz. Zusammenführen und Aufteilen erstellen neue
        Datensätze; die Quellen bleiben erhalten.
      </p>
      <p
        v-if="error"
        role="alert"
        class="alert alert-danger"
      >
        {{ error }}
      </p>
      <p
        v-if="message"
        role="status"
        class="alert alert-success"
      >
        {{ message }}
      </p>
      <fieldset :disabled="busy">
        <label
          class="form-label"
          for="managed-dataset"
          >Datensatz</label
        >
        <select
          id="managed-dataset"
          v-model="selected"
          class="form-select"
          @change="select_dataset"
        >
          <option value="">Datensatz auswählen</option>
          <option
            v-for="dataset in datasets"
            :key="dataset.id"
            :value="String(dataset.id)"
          >
            {{ dataset.name }} · {{ dataset.modality }} · {{ dataset.examinations }} Untersuchungen
          </option>
        </select>
        <label
          class="form-label mt-2"
          for="dataset-name"
          >Name</label
        >
        <input
          id="dataset-name"
          v-model="name"
          class="form-control"
          maxlength="255"
        />
        <label
          class="form-label mt-2"
          for="dataset-description"
          >Beschreibung</label
        >
        <textarea
          id="dataset-description"
          v-model="description"
          class="form-control"
        />
        <div class="d-flex gap-2 my-2">
          <button
            class="btn btn-outline-primary"
            :disabled="!name.trim()"
            @click="create"
          >
            Neuen klinischen Datensatz anlegen
          </button>
          <button
            class="btn btn-primary"
            :disabled="!current || current.system || !name.trim()"
            @click="save"
          >
            Änderungen speichern
          </button>
          <button
            class="btn btn-outline-danger"
            :disabled="!current || current.system"
            @click="review_deletion"
          >
            Datensatz löschen …
          </button>
        </div>
        <p v-if="current">
          {{ current.examinations }} Untersuchungen, {{ current.videos }} Videos,
          {{ current.images }} Bild- und {{ current.segments }} Segmentannotationen.
        </p>
        <details class="my-3">
          <summary>Datensätze zusammenführen</summary>
          <label
            v-for="dataset in datasets"
            :key="dataset.id"
            class="d-block"
          >
            <input
              v-model="sources"
              type="checkbox"
              :value="dataset.id"
            />
            {{ dataset.name }}
          </label>
          <label
            class="form-label"
            for="combined-name"
            >Name des neuen Datensatzes</label
          >
          <input
            id="combined-name"
            v-model="combined_name"
            class="form-control"
          />
          <button
            class="btn btn-outline-primary mt-2"
            :disabled="sources.length < 2 || !combined_name.trim()"
            @click="combine"
          >
            Zusammenführen
          </button>
        </details>
        <details
          v-if="current"
          class="my-3"
        >
          <summary>Datensatz nach Patienten aufteilen</summary>
          <button
            class="btn btn-link"
            @click="load_members"
          >
            Patienten laden
          </button>
          <p>
            Ausgewählte Patienten bilden Teil 1, alle übrigen Teil 2. Sämtliche Untersuchungen und
            Annotationen eines Patienten bleiben zusammen.
          </p>
          <label
            v-for="patient in members"
            :key="patient.id"
            class="d-block"
          >
            <input
              v-model="partition"
              type="checkbox"
              :value="patient.id"
            />
            Patient #{{ patient.id }} · {{ patient.examinations.length }} Untersuchungen ·
            {{ patient.videos.length }} Videos
          </label>
          <label
            class="form-label"
            for="split-first"
            >Name für Teil 1</label
          >
          <input
            id="split-first"
            v-model="first_name"
            class="form-control"
          />
          <label
            class="form-label"
            for="split-second"
            >Name für Teil 2</label
          >
          <input
            id="split-second"
            v-model="second_name"
            class="form-control"
          />
          <button
            class="btn btn-outline-primary mt-2"
            :disabled="
              !partition.length ||
              partition.length === members.length ||
              !first_name.trim() ||
              !second_name.trim()
            "
            @click="split"
          >
            Zwei Datensätze erstellen
          </button>
        </details>
        <div
          v-if="deletion"
          class="border border-danger p-3 my-3"
          role="dialog"
          aria-label="Datensatzlöschung bestätigen"
        >
          <h3 class="h6">Was soll gelöscht werden?</h3>
          <p>
            „{{ current?.name }}“: {{ deletion.studies.length }} Studienverknüpfungen und alle
            Datensatzmitgliedschaften werden entfernt.
          </p>
          <label class="d-block"
            ><input
              v-model="deletion_mode"
              type="radio"
              value="memberships_only"
            />
            Nur Datensatz und Verknüpfungen löschen; klinische Daten behalten</label
          >
          <label class="d-block"
            ><input
              v-model="deletion_mode"
              type="radio"
              value="exclusive_imported_records"
            />
            Zusätzlich {{ deletion.removable.length }} ausschließlich importierte Untersuchungen
            einschließlich Befunden löschen</label
          >
          <p>
            {{ deletion.retained.length }} Untersuchungen werden wegen gemeinsamer Nutzung,
            verknüpfter Medien, Änderungen oder fehlendem Eigentumsnachweis behalten.
            Patientenidentitäten, Medien, Annotationen und Importbelege bleiben erhalten.
          </p>
          <ul v-if="deletion.retained.length">
            <li
              v-for="row in deletion.retained"
              :key="row.id"
            >
              Untersuchung #{{ row.id }}: {{ retention_label(row.reason) }}
            </li>
          </ul>
          <button
            class="btn btn-danger me-2"
            :disabled="!deletion_mode"
            @click="remove"
          >
            Gewählte Löschung bestätigen
          </button>
          <button
            class="btn btn-secondary"
            @click="deletion = null"
          >
            Abbrechen
          </button>
        </div>
      </fieldset>
      <DatasetStudyCohorts
        v-if="selected"
        :dataset-id="selected"
        @changed="emit('changed')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import DatasetStudyCohorts from './DatasetStudyCohorts.vue'
import * as api from '@/api/datasetLifecycleApi'

const emit = defineEmits<{ changed: [] }>()
const datasets = ref<api.Dataset[]>([])
const selected = ref('')
const current = computed(() => datasets.value.find((item) => String(item.id) === selected.value))
const name = ref('')
const description = ref('')
const sources = ref<number[]>([])
const combined_name = ref('')
const members = ref<NonNullable<api.Dataset['patients']>>([])
const partition = ref<number[]>([])
const first_name = ref('')
const second_name = ref('')
const busy = ref(false)
const error = ref('')
const message = ref('')
const deletion = ref<api.DeletionPreview | null>(null)
const deletion_mode = ref<'' | 'memberships_only' | 'exclusive_imported_records'>('')

function retention_label(reason: string): string {
  const reasons: Record<string, string> = {
    clinical_validation_failed: 'Klinische Validierung fehlgeschlagen; Daten bleiben erhalten',
    unproven_import_ownership: 'Importeigentum nicht nachgewiesen',
    shared_import: 'Gemeinsam genutzter Import',
    shared_dataset: 'In einem anderen Datensatz enthalten',
    direct_study_membership: 'Direkte Studienzuordnung',
    unproven_or_edited_record: 'Fehlender Nachweis oder geänderte Daten',
    edited_record: 'Klinische Daten wurden geändert',
    protected_relations: 'Geschützte Verknüpfungen',
    related_clinical_records_or_media: 'Weitere klinische Daten oder Medien verknüpft',
    linked_media_or_other_references: 'Medien oder weitere Referenzen verknüpft'
  }
  return reasons[reason] ?? reason
}
async function run(action: () => Promise<void>): Promise<void> {
  if (busy.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = isAxiosError<{ detail?: string }>(cause)
      ? (cause.response?.data.detail ?? 'Aktion fehlgeschlagen.')
      : 'Aktion fehlgeschlagen.'
  } finally {
    busy.value = false
  }
}
async function refresh(): Promise<void> {
  datasets.value = await api.list_datasets()
}
function select_dataset(): void {
  name.value = current.value?.name ?? ''
  description.value = current.value?.description ?? ''
  members.value = []
  partition.value = []
  deletion.value = null
  deletion_mode.value = ''
}
async function changed(id?: number): Promise<void> {
  await refresh()
  selected.value = id === undefined ? '' : String(id)
  sources.value = sources.value.filter((id) => datasets.value.some((dataset) => dataset.id === id))
  select_dataset()
  emit('changed')
}
async function create(): Promise<void> {
  await run(async () => {
    const item = await api.create_dataset(name.value, description.value)
    await changed(item.id)
  })
}
async function save(): Promise<void> {
  await run(async () => {
    if (!current.value) return
    const item = await api.update_dataset(
      current.value.id,
      name.value,
      description.value,
      current.value.active
    )
    await changed(item.id)
  })
}
async function combine(): Promise<void> {
  await run(async () => {
    const item = await api.combine_datasets(sources.value, combined_name.value)
    await changed(item.id)
  })
}
async function load_members(): Promise<void> {
  await run(async () => {
    members.value = (await api.read_dataset(Number(selected.value))).patients ?? []
    partition.value = []
  })
}
async function split(): Promise<void> {
  await run(async () => {
    const result = await api.split_dataset(Number(selected.value), [
      { name: first_name.value, patients: partition.value },
      {
        name: second_name.value,
        patients: members.value
          .filter((item) => !partition.value.includes(item.id))
          .map((item) => item.id)
      }
    ])
    await changed(result[0]?.id)
  })
}
async function review_deletion(): Promise<void> {
  await run(async () => {
    deletion.value = await api.preview_deletion(Number(selected.value))
    deletion_mode.value = ''
  })
}
async function remove(): Promise<void> {
  await run(async () => {
    if (!deletion.value || !deletion_mode.value) return
    const result = await api.delete_dataset(
      Number(selected.value),
      deletion.value.preview,
      deletion_mode.value
    )
    await changed()
    message.value = `Datensatz gelöscht; ${String(result.deleted.length)} importierte Untersuchungen entfernt.`
  })
}
defineExpose({ reload: () => run(refresh) })
onMounted(() => run(refresh))
</script>
