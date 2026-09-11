<template>
  <main class="container-fluid py-4 patient-resource-page">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <div class="small text-uppercase text-muted fw-semibold">Patientenakte</div>
        <h1 class="h3 mb-1">Medikation von {{ patientName }}</h1>
        <p class="text-muted mb-0">Medikation und Medikationspläne aus den Fällen des Patienten.</p>
      </div>
      <nav
        class="d-flex flex-wrap align-items-start gap-2"
        aria-label="Patientennavigation"
      >
        <RouterLink
          class="btn btn-outline-secondary"
          to="/patienten"
        >Patienten</RouterLink>
        <RouterLink
          class="btn btn-outline-primary"
          :to="{ name: 'Patientendokumente', params: { patientId } }"
        >
          Dokumente
        </RouterLink>
        <RouterLink
          class="btn btn-primary"
          :to="{ path: '/reporting', query: { patient_id: patientId } }"
        >
          Reporting
        </RouterLink>
      </nav>
    </div>

    <div
      v-if="ledgerWarning"
      class="alert alert-warning"
      role="status"
    >
      {{ ledgerWarning }}
    </div>
    <div
      v-if="loading"
      class="card card-body text-center"
      role="status"
    >
      <div class="spinner-border text-primary mx-auto mb-2"></div>
      Medikation wird geladen…
    </div>
    <div
      v-else-if="error"
      class="alert alert-danger"
      role="alert"
    >{{ error }}</div>
    <div
      v-else-if="cases.length === 0"
      class="card card-body text-center text-muted"
    >
      Für diesen Patienten sind keine Fälle mit Medikationszuordnung vorhanden.
    </div>
    <div
      v-else
      class="d-grid gap-3"
    >
      <article
        v-for="patientCase in cases"
        :key="patientCase.caseId"
        class="card shadow-sm"
      >
        <div class="card-header d-flex flex-wrap justify-content-between gap-2">
          <h2 class="h5 mb-0">Fall {{ patientCase.caseId }}</h2>
          <span
            class="badge"
            :class="patientCase.isActive ? 'bg-success' : 'bg-secondary'"
          >
            {{ patientCase.isActive ? 'Aktiv' : 'Abgeschlossen' }}
          </span>
        </div>
        <div class="card-body row g-3">
          <div class="col-md-6">
            <h3 class="h6">Medikation</h3>
            <div
              v-if="patientCase.patientMedications.length"
              class="d-grid gap-2"
            >
              <div
                v-for="medicationId in patientCase.patientMedications"
                :key="medicationId"
                class="border rounded p-2 bg-light"
                data-testid="patient-medication-record"
              >
                <strong>
                  {{
                    medicationRecord(medicationId)?.medication ??
                    `Medikationsdatensatz #${medicationId}`
                  }}
                </strong>
                <template v-if="medicationRecord(medicationId)">
                  <span
                    class="badge ms-2"
                    :class="medicationRecord(medicationId)?.active ? 'bg-success' : 'bg-secondary'"
                  >
                    {{ medicationRecord(medicationId)?.active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                  <div class="small text-muted mt-1">
                    <span v-if="formatDosage(medicationRecord(medicationId)?.dosage)">
                      Dosierung: {{ formatDosage(medicationRecord(medicationId)?.dosage) }}
                    </span>
                    <span v-if="medicationRecord(medicationId)?.unit">
                      · Einheit: {{ medicationRecord(medicationId)?.unit }}
                    </span>
                    <span v-if="medicationRecord(medicationId)?.intakeTimes.length">
                      · Einnahme: {{ medicationRecord(medicationId)?.intakeTimes.join(', ') }}
                    </span>
                    <span v-if="medicationRecord(medicationId)?.medicationIndication">
                      · Indikation: {{ medicationRecord(medicationId)?.medicationIndication }}
                    </span>
                  </div>
                </template>
                <div
                  v-else
                  class="small text-muted"
                >
                  Details sind für diesen Datensatz nicht verfügbar.
                </div>
              </div>
            </div>
            <span
              v-else
              class="text-muted"
            >Keine Medikation zugeordnet</span>
          </div>
          <div class="col-md-6">
            <h3 class="h6">Medikationspläne</h3>
            <div
              v-if="patientCase.patientMedicationSchedules.length"
              class="d-grid gap-2"
            >
              <div
                v-for="scheduleId in patientCase.patientMedicationSchedules"
                :key="scheduleId"
                class="border rounded p-2 bg-light"
                data-testid="patient-medication-schedule"
              >
                <strong>Medikationsplan #{{ scheduleId }}</strong>
                <div
                  v-if="scheduleRecord(scheduleId)"
                  class="small text-muted mt-1"
                >
                  {{
                    scheduleRecord(scheduleId)
                      ?.medications.map((medication) => medication.medication)
                      .join(', ') || 'Keine Medikation im Plan'
                  }}
                </div>
                <div
                  v-else
                  class="small text-muted"
                >Plandetails sind nicht verfügbar.</div>
              </div>
            </div>
            <span
              v-else
              class="text-muted"
            >Kein Medikationsplan zugeordnet</span>
          </div>
        </div>
      </article>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { fetchPatientCases, type PatientCase } from '@/api/casesApi'
import {
  isMedicalLedgerContractUnavailable,
  patientService,
  type MedicalLedgerJsonValue,
  type Patient,
  type PatientMedicalLedger,
  type PatientMedicationLedgerRecord,
  type PatientMedicationScheduleLedgerRecord
} from '@/api/patientService'

const props = defineProps<{ patientId: number }>()
const patient = ref<Patient | null>(null)
const medicalLedger = shallowRef<PatientMedicalLedger | null>(null)
const cases = ref<PatientCase[]>([])
const loading = ref(true)
const error = ref('')
const ledgerWarning = ref('')

const patientName = computed(() => {
  const name = [patient.value?.firstName, patient.value?.lastName].filter(Boolean).join(' ')
  return name || `Patient #${String(props.patientId)}`
})

function endoregRecordKey(modelName: string, id: number): string {
  return `${modelName}:${String(id)}`
}

const medicationById = computed(() => {
  const records = new Map<string, PatientMedicationLedgerRecord>()
  for (const medication of medicalLedger.value?.medications ?? []) {
    records.set(medication.externalIds.endoregDb, medication)
  }
  return records
})

const scheduleById = computed(() => {
  const records = new Map<string, PatientMedicationScheduleLedgerRecord>()
  for (const schedule of medicalLedger.value?.medicationSchedules ?? []) {
    records.set(schedule.externalIds.endoregDb, schedule)
  }
  return records
})

function formatDosage(value: MedicalLedgerJsonValue | undefined): string | null {
  if (value == null) {
    return null
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

onMounted(async () => {
  try {
    const ledgerRequest = patientService
      .getMedicalLedger(props.patientId)
      .catch((caught: unknown) => {
        if (isMedicalLedgerContractUnavailable(caught)) {
          ledgerWarning.value =
            'Medikationsdetails sind bis zur Aktualisierung des medizinischen Datenvertrags nicht verfügbar.'
          return null
        }
        throw caught
      })
    const [patientData, caseData, ledgerData] = await Promise.all([
      patientService.getPatient(props.patientId),
      fetchPatientCases({ patientId: props.patientId }),
      ledgerRequest
    ])
    patient.value = patientData
    medicalLedger.value = ledgerData
    cases.value = caseData.filter(
      (patientCase) =>
        patientCase.patientMedications.length > 0 ||
        patientCase.patientMedicationSchedules.length > 0
    )
  } catch (caught: unknown) {
    error.value =
      caught instanceof Error && caught.message
        ? caught.message
        : 'Medikation konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
})

function medicationRecord(id: number) {
  return medicationById.value.get(endoregRecordKey('PatientMedication', id))
}

function scheduleRecord(id: number) {
  return scheduleById.value.get(endoregRecordKey('PatientMedicationSchedule', id))
}
</script>

<style scoped>
.patient-resource-page {
  max-width: 1200px;
}
</style>
