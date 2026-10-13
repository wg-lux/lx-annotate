<template>
  <main class="card shadow-sm">
    <div class="card-header"><h5 class="mb-0">Medikation und Laborwerte</h5></div>
    <div class="card-body">
      <RouterLink to="/reporting/case-setup">Zurück zur Fallanlage</RouterLink>
      <p class="text-muted mt-2">
        Medikationszeiträume und Messungen werden dem ausgewählten Fall zugeordnet. Zeitangaben
        gelten in Ihrer lokalen Zeitzone.
      </p>
      <p
        v-if="loading"
        role="status"
      >
        Daten werden geladen…
      </p>
      <p
        v-if="error"
        role="alert"
        class="alert alert-danger"
      >
        {{ error }}
      </p>
      <p
        v-if="success"
        role="status"
        class="alert alert-success"
      >
        {{ success }}
      </p>
      <template v-if="currentCase && ledger">
        <p>Fall: {{ currentCase.caseId }}</p>
        <p v-if="currentCase.isClosed" class="alert alert-info">
          Der Fall ist geschlossen. Öffnen Sie ihn unter Untersuchungsfassungen für neue Einträge wieder.
        </p>
        <form @submit.prevent="save">
          <fieldset :disabled="saving || loading || currentCase.isClosed">
            <legend class="h6">Eintrag hinzufügen</legend>
            <div class="row g-3">
              <div class="col-md-4">
                <label
                  for="clinical-kind"
                  class="form-label"
                  >Eintrag</label
                >
                <select
                  id="clinical-kind"
                  v-model="kind"
                  class="form-select"
                  @change="resetForm"
                >
                  <option value="medication">Medikationszeitraum</option>
                  <option value="lab_value">Laborwertmessung</option>
                </select>
              </div>
              <div class="col-md-4">
                <label
                  for="clinical-reference"
                  class="form-label"
                  >{{ kind === 'medication' ? 'Medikament' : 'Laborwert' }}</label
                >
                <select
                  id="clinical-reference"
                  v-model="name"
                  class="form-select"
                  required
                  @change="selectDefaultUnit"
                >
                  <option
                    value=""
                    disabled
                  >
                    Bitte auswählen
                  </option>
                  <option
                    v-for="item in choices"
                    :key="item.name"
                    :value="item.name"
                  >
                    {{ item.name }}
                  </option>
                </select>
              </div>
              <div class="col-md-4">
                <label
                  for="clinical-unit"
                  class="form-label"
                  >Einheit</label
                >
                <select
                  id="clinical-unit"
                  v-model="unit"
                  class="form-select"
                  :required="kind === 'medication' || valueKind === 'numeric'"
                >
                  <option value="">Keine Einheit</option>
                  <option
                    v-for="item in units"
                    :key="item.name"
                    :value="item.name"
                  >
                    {{ item.abbreviation || item.name }}
                  </option>
                </select>
              </div>
              <div class="col-md-4">
                <label
                  for="clinical-start"
                  class="form-label"
                  >{{ kind === 'medication' ? 'Beginn' : 'Messzeitpunkt' }}</label
                >
                <input
                  id="clinical-start"
                  v-model="start"
                  type="datetime-local"
                  class="form-control"
                  required
                />
              </div>
              <div
                v-if="kind === 'medication'"
                class="col-md-4"
              >
                <label
                  for="clinical-end"
                  class="form-label"
                  >Ende (optional)</label
                >
                <input
                  id="clinical-end"
                  v-model="end"
                  type="datetime-local"
                  class="form-control"
                  :min="start"
                />
              </div>
              <div
                v-if="kind === 'lab_value'"
                class="col-md-4"
              >
                <label
                  for="clinical-value-kind"
                  class="form-label"
                  >Werttyp</label
                >
                <select
                  id="clinical-value-kind"
                  v-model="valueKind"
                  class="form-select"
                >
                  <option value="numeric">Zahl</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div class="col-md-4">
                <label
                  for="clinical-value"
                  class="form-label"
                  >{{ kind === 'medication' ? 'Dosis' : 'Messwert' }}</label
                >
                <input
                  id="clinical-value"
                  v-model="value"
                  :type="kind === 'medication' || valueKind === 'numeric' ? 'number' : 'text'"
                  step="any"
                  :min="kind === 'medication' ? 0 : undefined"
                  class="form-control"
                  required
                />
              </div>
              <div
                v-if="kind === 'medication'"
                class="col-12"
              >
                <label
                  ><input
                    v-model="active"
                    type="checkbox"
                  />
                  Aktiv</label
                >
              </div>
            </div>
            <button
              class="btn btn-primary mt-3"
              type="submit"
            >
              {{ saving ? 'Wird gespeichert…' : 'Dem Fall zuordnen' }}
            </button>
          </fieldset>
        </form>
        <h6 class="mt-4">Medikationszeiträume im Fall</h6>
        <p
          v-if="!medications.length"
          class="text-muted"
        >
          Keine Medikation zugeordnet.
        </p>
        <ul>
          <li
            v-for="item in medications"
            :key="item.uuid"
          >
            {{ item.medication }} · {{ formatDosage(item.dosage) }} {{ item.unit }} ·
            {{ formatTime(item.startAt) }} – {{ formatTime(item.endAt) }} ·
            {{ item.active ? 'Aktiv' : 'Inaktiv' }}
          </li>
        </ul>
        <h6 class="mt-4">Laborwertmessungen im Fall</h6>
        <p
          v-if="!measurements.length"
          class="text-muted"
        >
          Keine Messungen zugeordnet.
        </p>
        <ul>
          <li
            v-for="item in measurements"
            :key="item.uuid"
          >
            {{ item.labValue }}: {{ item.value ?? item.valueStr }} {{ item.unit }} ·
            {{ formatTime(item.timestamp) }}
          </li>
        </ul>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchPatientCases, type PatientCase } from '@/api/casesApi'
import {
  createCaseMedicalRecords,
  fetchMedicalTerminology,
  type CaseMedicalPayload,
  type MedicalReference
} from '@/api/caseMedicalApi'
import {
  patientService,
  type MedicalLedgerJsonValue,
  type PatientMedicalLedger
} from '@/api/patientService'
import { reportingApiErrorMessage } from './reportingError'

const route = useRoute()
const currentCase = shallowRef<PatientCase | null>(null)
const ledger = shallowRef<PatientMedicalLedger | null>(null)
const terminology = ref<MedicalReference[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const kind = ref<'medication' | 'lab_value'>('medication')
const name = ref('')
const unit = ref('')
const start = ref('')
const end = ref('')
const value = ref<string | number>('')
const valueKind = ref<'numeric' | 'text'>('numeric')
const active = ref(true)
let generation = 0
let pending: { body: string; key: string } | null = null
const choices = computed(() => terminology.value.filter((item) => item.recordType === kind.value))
const units = computed(() => terminology.value.filter((item) => item.recordType === 'unit'))
const medications = computed(
  () =>
    ledger.value?.medications.filter((item) =>
      currentCase.value?.patientMedications.some(
        (id) => item.externalIds.endoregDb === `PatientMedication:${String(id)}`
      )
    ) ?? []
)
const measurements = computed(
  () =>
    ledger.value?.labValues.filter((item) =>
      currentCase.value?.patientLabValues.some(
        (id) => item.externalIds.endoregDb === `PatientLabValue:${String(id)}`
      )
    ) ?? []
)

function resetForm() {
  name.value = ''
  unit.value = ''
  start.value = ''
  end.value = ''
  value.value = ''
  active.value = true
  pending = null
}
function selectDefaultUnit() {
  unit.value = choices.value.find((item) => item.name === name.value)?.defaultUnit?.name ?? ''
}
function formatTime(timestamp: string | null | undefined): string {
  return timestamp ? new Date(timestamp).toLocaleString() : 'Nicht angegeben'
}
function formatDosage(dosage: MedicalLedgerJsonValue): string {
  return dosage === null
    ? 'Dosis nicht angegeben'
    : typeof dosage === 'object'
      ? JSON.stringify(dosage)
      : String(dosage)
}
function timestamp(raw: string): string {
  const parsed = new Date(raw)
  if (!raw || !Number.isFinite(parsed.getTime()))
    throw new Error('Bitte einen gültigen Zeitpunkt angeben.')
  return parsed.toISOString()
}

async function load() {
  const run = ++generation
  currentCase.value = null
  ledger.value = null
  terminology.value = []
  error.value = ''
  success.value = ''
  resetForm()
  loading.value = true
  try {
    const patientId = Number(route.query.patient_id)
    const caseId = route.query.case_id
    if (
      !Number.isSafeInteger(patientId) ||
      patientId <= 0 ||
      typeof caseId !== 'string' ||
      !caseId
    ) {
      throw new Error('Bitte zuerst einen Patienten und Fall in der Fallanlage auswählen.')
    }
    const [cases, records, references] = await Promise.all([
      fetchPatientCases({ patientId }),
      patientService.getMedicalLedger(patientId),
      fetchMedicalTerminology(patientId)
    ])
    if (run !== generation) return
    const selected = cases.find(
      (item) => item.caseId === caseId && item.patient === patientId && !item.isDeleted
    )
    if (!selected)
      throw new Error(
        'Der ausgewählte Fall gehört nicht zu diesem Patienten oder ist nicht verfügbar.'
      )
    currentCase.value = selected
    ledger.value = records
    terminology.value = references
  } catch (caught: unknown) {
    if (run === generation)
      error.value = reportingApiErrorMessage(caught, 'Daten konnten nicht geladen werden.')
  } finally {
    if (run === generation) loading.value = false
  }
}

function validateEntry(): boolean {
  if (!choices.value.some((item) => item.name === name.value))
    throw new Error('Bitte einen gültigen Katalogeintrag wählen.')
  if (unit.value && !units.value.some((item) => item.name === unit.value))
    throw new Error('Bitte eine gültige Einheit wählen.')
  const numeric = kind.value === 'medication' || valueKind.value === 'numeric'
  if (String(value.value).trim() === '' || (numeric && !Number.isFinite(Number(value.value))))
    throw new Error('Bitte einen gültigen Wert eingeben.')
  if (numeric && !unit.value) throw new Error('Bitte eine Einheit wählen.')
  return numeric
}

function buildPayload(selected: PatientCase): CaseMedicalPayload {
  const numeric = validateEntry()
  const measuredAt = timestamp(start.value)
  const endedAt = end.value ? timestamp(end.value) : null
  if (kind.value === 'medication' && (Number(value.value) < 0 || (endedAt && endedAt < measuredAt)))
    throw new Error('Dosis oder Medikationszeitraum ist ungültig.')
  const payload: CaseMedicalPayload = { patient: String(selected.patient), caseId: selected.id }
  if (kind.value === 'medication') {
    payload.medications = [
      {
        medication: name.value,
        unit: unit.value,
        dosage: Number(value.value),
        startAt: measuredAt,
        endAt: endedAt,
        active: active.value
      }
    ]
  } else {
    payload.labValues = [
      {
        labValue: name.value,
        unit: unit.value || null,
        timestamp: measuredAt,
        ...(numeric ? { value: Number(value.value) } : { valueStr: String(value.value).trim() })
      }
    ]
  }
  return payload
}

const isBusy = computed(() => saving.value || loading.value)

function refreshedCase(cases: PatientCase[], selected: PatientCase): PatientCase | null {
  return (
    cases.find(
      (item) => item.id === selected.id && item.patient === selected.patient && !item.isDeleted
    ) ?? null
  )
}

async function save() {
  const selected = currentCase.value
  if (!selected || isBusy.value) return
  const run = generation
  error.value = ''
  success.value = ''
  try {
    const payload = buildPayload(selected)
    const body = JSON.stringify(payload)
    if (pending?.body !== body) pending = { body, key: crypto.randomUUID() }
    saving.value = true
    const result = await createCaseMedicalRecords(selected.patient, payload, pending.key)
    if (run !== generation) return
    ledger.value = result
    resetForm()
    success.value = 'Eintrag gespeichert und dem Fall zugeordnet.'
    const cases = await fetchPatientCases({ patientId: selected.patient })
    if (run !== generation) return
    currentCase.value = refreshedCase(cases, selected)
    if (!currentCase.value)
      throw new Error('Der Fall ist nicht mehr verfügbar. Bitte zur Fallanlage zurückkehren.')
  } catch (caught: unknown) {
    if (run === generation)
      error.value = reportingApiErrorMessage(caught, 'Eintrag konnte nicht gespeichert werden.')
  } finally {
    saving.value = false
  }
}

watch(() => [route.query.patient_id, route.query.case_id], load, { immediate: true })
</script>
