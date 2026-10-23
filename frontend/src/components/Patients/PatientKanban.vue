<template>
  <section aria-label="Patienten und Fälle">
    <div class="d-flex flex-wrap justify-content-between gap-3 mb-3">
      <p class="text-muted mb-0">Fallstatus aus EndoReg · Aktualisierung alle 30 Sekunden</p>
      <RouterLink to="/anonymisierung/uebersicht">Importe / Anonymisierung prüfen</RouterLink>
      <button
        class="btn btn-outline-primary btn-sm"
        :disabled="refreshing"
        @click="refresh"
      >
        {{ refreshing ? 'Aktualisierung…' : 'Aktualisieren' }}
      </button>
    </div>
    <p
      v-if="error"
      class="alert alert-danger"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="!loaded"
      role="status"
    >
      Patienten und Fälle werden geladen…
    </p>
    <div
      v-if="loaded"
      class="kanban-columns"
    >
      <section
        v-for="column in columns"
        :key="column.key"
        :data-stage="column.key"
        class="kanban-column"
      >
        <h2 class="h5">
          {{ column.title }} <span class="badge bg-light text-dark">{{ column.rows.length }}</span>
        </h2>
        <article
          v-for="row in column.rows"
          :key="row.case?.caseId ?? `patient-${row.patient.id}`"
          class="card card-body mb-3"
          :data-patient-id="row.patient.id"
          :data-case-id="row.case?.caseId"
        >
          <button
            class="patient-heading"
            @click="$emit('select', row.patient)"
          >
            {{ row.patient.firstName }} {{ row.patient.lastName }} · #{{ row.patient.id }}
          </button>
          <template v-if="row.case">
            <p class="small my-2">Fall {{ row.case.caseId }}</p>
            <p class="small">
              {{ row.case.patientExaminations.length }} Untersuchungen ·
              {{ row.case.documents.length }} Dokumente
            </p>
            <p
              v-if="row.case.isDeleted"
              class="text-muted"
            >
              Als gelöscht markiert
            </p>
            <RouterLink
              v-for="examination in row.case.patientExaminations"
              :key="examination.id"
              :to="{
                path: `/reporting/${examination.id}/findings`,
                query: { patient_id: row.patient.id, case_id: row.case.caseId }
              }"
            >
              Untersuchung #{{ examination.id }} öffnen
            </RouterLink>
          </template>
          <p
            v-else
            class="small my-2"
          >
            Keinem Fall zugeordnet
          </p>
          <RouterLink :to="{ name: 'Patientendokumente', params: { patientId: row.patient.id } }"
            >Alle Patientendokumente</RouterLink
          >
          <RouterLink
            :to="{
              path: '/reporting',
              query: { patient_id: row.patient.id, case_id: row.case?.caseId }
            }"
            >Fall / Untersuchung wählen</RouterLink
          >
        </article>
        <p
          v-if="!column.rows.length"
          class="text-muted small"
        >
          Keine Einträge
        </p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchPatientCases, type PatientCase } from '@/api/casesApi'
import { patientService } from '@/api/patientService'
import { usePatientStore, type Patient } from '@/stores/patientStore'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const props = defineProps<{ searchTerm: string }>()
defineEmits<{ select: [patient: Patient] }>()
type PatientRow = { patient: Patient; case: PatientCase | null }
const store = usePatientStore()
const logger = createRuntimeLogger('patient-kanban')
const rows = ref<PatientRow[]>([])
const refreshing = ref(false)
const loaded = ref(false)
const error = ref('')
let disposed = false
function isDisposed() {
  return disposed
}
let timer: ReturnType<typeof setTimeout> | undefined
const filteredRows = computed(() => {
  const search = props.searchTerm.trim().toLocaleLowerCase('de')
  return rows.value.filter((row) =>
    `${row.patient.firstName} ${row.patient.lastName} ${row.patient.email ?? ''} ${String(row.patient.id)} ${row.case?.caseId ?? ''}`
      .toLocaleLowerCase('de')
      .includes(search)
  )
})
const columns = computed(() => [
  { key: 'unassigned', title: 'Ohne Fall', rows: filteredRows.value.filter((row) => !row.case) },
  {
    key: 'active',
    title: 'Aktive Fälle',
    rows: filteredRows.value.filter((row) => row.case?.isActive)
  },
  {
    key: 'closed',
    title: 'Abgeschlossene Fälle',
    rows: filteredRows.value.filter((row) => row.case?.isClosed && !row.case.isDeleted)
  },
  {
    key: 'inactive',
    title: 'Inaktive / gelöschte Fälle',
    rows: filteredRows.value.filter(
      (row) => row.case && (row.case.isDeleted || (!row.case.isActive && !row.case.isClosed))
    )
  }
])

async function refresh() {
  if (isDisposed() || refreshing.value) return
  refreshing.value = true
  clearTimeout(timer)
  try {
    const [patients, cases] = await Promise.all([
      patientService.getPatients(),
      fetchPatientCases({})
    ])
    if (isDisposed()) return
    const byId = new Map(
      patients.map((patient) => {
        if (!patient.id) throw new Error('Patient ID missing')
        return [patient.id, patient] as const
      })
    )
    const next = cases.map((patientCase): PatientRow => {
      const patient = byId.get(patientCase.patient)
      if (!patient) throw new Error('Case patient is absent from the authorized patient list')
      return { patient, case: patientCase }
    })
    const assigned = new Set(cases.map((patientCase) => patientCase.patient))
    for (const [id, patient] of byId) {
      if (!assigned.has(id)) next.push({ patient, case: null })
    }
    store.patients = patients
    rows.value = next
    loaded.value = true
    error.value = ''
  } catch (caught: unknown) {
    if (isDisposed()) return
    rows.value = []
    loaded.value = false
    error.value = 'Patienten und Fälle konnten nicht geladen werden. Bitte erneut aktualisieren.'
    logger.error('board-load-failed', caught, { operation: 'load', outcome: 'rejected' })
  } finally {
    refreshing.value = false
    if (!isDisposed())
      timer = setTimeout(() => {
        void refresh()
      }, 30000)
  }
}
defineExpose({ refresh })
onMounted(() => {
  void refresh()
})
onBeforeUnmount(() => {
  disposed = true
  clearTimeout(timer)
})
</script>

<style scoped>
.kanban-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  align-items: start;
}
.kanban-column {
  background: #f4f6f8;
  border-radius: 12px;
  padding: 1rem;
  min-width: 0;
}
.patient-heading {
  border: 0;
  background: transparent;
  color: #244c6b;
  font-weight: 700;
  text-align: left;
  padding: 0;
}
.card {
  overflow-wrap: anywhere;
}
.card a {
  font-size: 0.85rem;
  margin-top: 0.5rem;
}
</style>
