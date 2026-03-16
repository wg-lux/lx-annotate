<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-0">Fall-Setup</h5>
        <small class="text-muted">Patient auswählen, Untersuchung wählen und Fallkontext starten</small>
      </div>
      <span class="badge" :class="sessionBadgeClass">{{ sessionBadgeLabel }}</span>
    </div>
    <div class="card-body">
      <div v-if="successMessage" class="alert alert-success py-2">
        {{ successMessage }}
      </div>
      <div v-if="returnToPath" class="alert alert-info py-2">
        Für die Rückkehr zur Validierung koennen Sie nach dem Anlegen der Patientenuntersuchung direkt wieder
        zur Anonymisierungsvalidierung wechseln. Eine minimale Untersuchung, zum Beispiel
        <code>Koloskopie</code>, ist dafür ausreichend. Befunde koennen später ergänzt werden.
      </div>
      <div v-if="errorMessage" class="alert alert-danger py-2">
        {{ errorMessage }}
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Patient auswählen</label>
          <select
            class="form-select"
            :value="flow.selectedPatientId ?? ''"
            :disabled="patientsLoading || loading"
            @change="onPatientChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>
              {{ patientsLoading ? 'Patienten werden geladen...' : 'Bitte Patient wählen' }}
            </option>
            <option v-for="patient in patients" :key="patient.id" :value="patient.id">
              {{ patient.displayName }}
            </option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Untersuchung auswählen</label>
          <select
            class="form-select"
            :value="flow.selectedExaminationId ?? ''"
            :disabled="examinationsLoading || loading"
            @change="onExaminationChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>
              {{ examinationsLoading ? 'Untersuchungen werden geladen...' : 'Bitte Untersuchung wählen' }}
            </option>
            <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
              {{ exam.displayName }}
            </option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">PatientExamination-ID</label>
          <input class="form-control" type="number" :value="flow.patientExaminationId ?? ''" readonly />
        </div>
        <div class="col-md-6">
          <label class="form-label">Fallkontext</label>
          <input class="form-control" :value="flow.lookupToken ? 'aktiv' : 'inaktiv'" readonly />
        </div>
      </div>

      <div class="mt-3 d-flex flex-wrap gap-2">
        <button
          class="btn btn-primary btn-sm"
          :disabled="loading || !flow.selectedPatientId || !flow.selectedExaminationId"
          @click="createPatientExaminationAndInitLookup"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
          Patientenuntersuchung anlegen und Fallkontext starten
        </button>
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="loading || !flow.patientExaminationId"
          @click="reinitLookup"
        >
          Fallkontext neu initialisieren
        </button>
        <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="reloadLists">
          Neu laden
        </button>
        <button class="btn btn-outline-danger btn-sm" :disabled="loading" @click="clearFlow">
          Alles zurücksetzen
        </button>
        <RouterLink
          v-if="returnToPath"
          class="btn btn-outline-secondary btn-sm"
          :to="returnToPath"
        >
          Zurück zur Validierung
        </RouterLink>
      </div>

      <div class="mt-4">
        <h6 class="mb-2">Nächster Schritt</h6>
        <RouterLink
          class="btn btn-dark btn-sm"
          :class="{ disabled: !flow.patientExaminationId }"
          :to="nextRoute"
        >
          Zur klinischen Dokumentation
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { usePatientStore } from '@/stores/patientStore'
import { useExaminationStore } from '@/stores/examinationStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import { endpoints } from '@/types/api/endpoints'
import type { PatientExamination } from '@/stores/patientExaminationStore'

const flow = useReportingFlowStore()
const patientStore = usePatientStore()
const examinationStore = useExaminationStore()
const patientExaminationStore = usePatientExaminationStore()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const patients = computed(() => patientStore.patientsWithDisplayName)
const examinations = computed(() => examinationStore.examinationsDropdown)
const patientsLoading = computed(() => patientStore.loading)
const examinationsLoading = computed(() => examinationStore.loading)
const returnToPath = computed(() => {
  const raw = route.query.returnTo
  return typeof raw === 'string' && raw.trim() ? raw : null
})

const nextRoute = computed(() =>
  flow.patientExaminationId
    ? `/reporting/${flow.patientExaminationId}/findings`
    : '/reporting/case-setup'
)

const sessionBadgeLabel = computed(() => {
  switch (flow.sessionStatus) {
    case 'active':
      return 'Fallkontext aktiv'
    case 'expired':
      return 'Fallkontext abgelaufen'
    case 'restarting':
      return 'Fallkontext wird neu gestartet'
    default:
      return 'Kein Fallkontext'
  }
})

const sessionBadgeClass = computed(() => {
  switch (flow.sessionStatus) {
    case 'active':
      return 'bg-success'
    case 'expired':
      return 'bg-danger'
    case 'restarting':
      return 'bg-warning text-dark'
    default:
      return 'bg-secondary'
  }
})

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function applyPreferredExaminationSelection() {
  const preferredRaw = route.query.preferredExamination
  if (typeof preferredRaw !== 'string' || !preferredRaw.trim()) return
  if (flow.selectedExaminationId) return

  const normalizedPreferred = preferredRaw.trim().toLowerCase()
  const match = examinations.value.find((exam) => exam.name.trim().toLowerCase() === normalizedPreferred)
  if (match) {
    flow.setCaseSelection({ selectedExaminationId: match.id })
  }
}

function onPatientChange(raw: string) {
  clearMessages()
  const id = parseOptionalInt(raw)
  const previousPatientId = flow.selectedPatientId
  if (previousPatientId && id !== previousPatientId) {
    flow.resetForPatientSwitch()
  }
  flow.setCaseSelection({ selectedPatientId: id })
}

function onExaminationChange(raw: string) {
  clearMessages()
  flow.setCaseSelection({ selectedExaminationId: parseOptionalInt(raw) })
}

async function reloadLists() {
  clearMessages()
  await Promise.all([patientStore.fetchPatients(), examinationStore.fetchExaminations()])
  applyPreferredExaminationSelection()
}

function clearFlow() {
  clearMessages()
  flow.clearAll()
}

function formatDateOnly(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0] || null
}

async function createPatientExaminationAndInitLookup() {
  if (!flow.selectedPatientId || !flow.selectedExaminationId) {
    errorMessage.value = 'Bitte wählen Sie zuerst Patient und Untersuchung aus.'
    return
  }

  const selectedPatient = patientStore.getPatientById(flow.selectedPatientId)
  const selectedExam = examinations.value.find((exam) => exam.id === flow.selectedExaminationId)
  if (!selectedPatient || !selectedExam) {
    errorMessage.value = 'Patient oder Untersuchung konnte nicht gefunden werden.'
    return
  }

  loading.value = true
  clearMessages()
  try {
    const formattedDate = new Date().toISOString().split('T')[0]
    const peRes = await axiosInstance.post(r(endpoints.examination.patientExaminationCreate), {
      patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
      examination: selectedExam.name,
      dateStart: formattedDate,
      patientBirthDate: formatDateOnly(selectedPatient.dob),
      patientGender: selectedPatient.gender || null
    })

    const pe = peRes.data as PatientExamination
    patientExaminationStore.addPatientExamination(pe)
    patientExaminationStore.setCurrentPatientExaminationId(pe.id)

    const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
      patientExaminationId: pe.id
    })

    flow.setLookupSession({
      patientExaminationId: pe.id,
      lookupToken: initRes.data.token,
      status: 'active'
    })

    successMessage.value = returnToPath.value
      ? 'Der Fallkontext wurde erfolgreich gestartet. Sie können jetzt zur Validierung zurückkehren oder mit der Befundung fortfahren.'
      : 'Der Fallkontext wurde erfolgreich gestartet.'
  } catch (e: any) {
    flow.setSessionStatus('idle')
    errorMessage.value =
      e?.response?.data?.detail ||
      e?.response?.data?.error ||
      e?.message ||
      'Fehler beim Erstellen der Patientenuntersuchung oder Starten des Fallkontexts.'
  } finally {
    loading.value = false
  }
}

async function reinitLookup() {
  if (!flow.patientExaminationId) {
    errorMessage.value = 'Keine Patientenuntersuchung vorhanden.'
    return
  }

  loading.value = true
  clearMessages()
  flow.setSessionStatus('restarting')
  try {
    const initRes = await axiosInstance.post(r(endpoints.requirements.lookupInit), {
      patientExaminationId: flow.patientExaminationId
    })
    flow.setLookupSession({
      patientExaminationId: flow.patientExaminationId,
      lookupToken: initRes.data.token,
      status: 'active'
    })
    successMessage.value = 'Der Fallkontext wurde neu initialisiert.'
  } catch (e: any) {
    flow.setSessionStatus('expired')
    errorMessage.value =
      e?.response?.data?.detail || e?.message || 'Fehler beim Neuinitialisieren des Fallkontexts.'
  } finally {
    loading.value = false
  }
}

function parseOptionalInt(value: string): number | null {
  const n = Number(value)
  return Number.isFinite(n) && value !== '' ? n : null
}

onMounted(async () => {
  await reloadLists()
})
</script>
