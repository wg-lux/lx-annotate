<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-0">Fall-Setup</h5>
        <small class="text-muted"
          >Patient auswählen, Untersuchung wählen und Reporting-Entwurf vorbereiten</small
        >
      </div>
      <span class="badge" :class="sessionBadgeClass">{{ sessionBadgeLabel }}</span>
    </div>
    <div class="card-body">
      <div v-if="successMessage" class="alert alert-success py-2">
        {{ successMessage }}
      </div>
      <div v-if="returnToPath" class="alert alert-info py-2">
        Für die Rückkehr zur Validierung koennen Sie nach dem Anlegen der Patientenuntersuchung
        direkt wieder zur Anonymisierungsvalidierung wechseln. Eine minimale Untersuchung, zum
        Beispiel
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
              {{
                examinationsLoading
                  ? 'Untersuchungen werden geladen...'
                  : 'Bitte Untersuchung wählen'
              }}
            </option>
            <option v-for="exam in examinations" :key="exam.id" :value="exam.id">
              {{ exam.displayName }}
            </option>
          </select>
        </div>
        <div class="col-md-6">
          <label class="form-label">Fall-ID</label>
          <input class="form-control" :value="flow.caseId ?? ''" readonly />
        </div>
        <div class="col-md-6">
          <label class="form-label">PatientExamination-ID</label>
          <input
            class="form-control"
            type="number"
            :value="flow.patientExaminationId ?? ''"
            readonly
          />
        </div>
        <div class="col-md-6">
          <label class="form-label">Reporting-Status</label>
          <input
            class="form-control"
            :value="flow.currentRuntimeDraft ? 'Entwurf geladen' : 'Noch kein Entwurf geladen'"
            readonly
          />
        </div>
      </div>

      <div class="mt-3 d-flex flex-wrap gap-2">
        <button
          class="btn btn-primary btn-sm"
          :disabled="loading || !flow.selectedPatientId || !flow.selectedExaminationId"
          @click="createPatientExaminationContext"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
          Fall und Patientenuntersuchung anlegen
        </button>
        <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="reloadLists">
          Neu laden
        </button>
        <button class="btn btn-outline-danger btn-sm" :disabled="loading" @click="clearFlow">
          Alles zurücksetzen
        </button>
        <RouterLink v-if="returnToPath" class="btn btn-outline-secondary btn-sm" :to="returnToPath">
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
import { createCaseWithExamination } from '@/api/casesApi'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { usePatientStore } from '@/stores/patientStore'
import { useExaminationStore } from '@/stores/examinationStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import type { PatientExamination } from '@/stores/patientExaminationStore'
import { reportingApiErrorMessage } from './reportingError'
import { requireResolvedReportingExamination } from './reportingExaminationResolution'

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
    ? `/reporting/${String(flow.patientExaminationId)}/findings`
    : '/reporting/case-setup'
)

const sessionBadgeLabel = computed(() => {
  return flow.patientExaminationId ? 'Patientenuntersuchung gewählt' : 'Kein Kontext'
})

const sessionBadgeClass = computed(() => {
  return flow.patientExaminationId ? 'bg-success' : 'bg-secondary'
})

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function applyPreferredExaminationSelection() {
  const preferredRaw = route.query.preferredExamination
  if (typeof preferredRaw !== 'string' || !preferredRaw.trim()) return
  if (flow.selectedExaminationId) return

  try {
    const match = requireResolvedReportingExamination({
      catalog: examinations.value,
      selectedExaminationId: null,
      examinationName: preferredRaw
    })
    flow.setCaseSelection({ selectedExaminationId: match.id })
  } catch (error: unknown) {
    errorMessage.value = reportingApiErrorMessage(
      error,
      'Die bevorzugte Untersuchung konnte nicht aufgelöst werden.'
    )
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

async function createPatientExaminationContext() {
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
    const result = await createCaseWithExamination({
      admissionDate: new Date().toISOString(),
      patientExamination: {
        patient: selectedPatient.patientHash || `patient_${String(flow.selectedPatientId)}`,
        examination: selectedExam.name,
        dateStart: formattedDate
      }
    })

    const pe = result.patientExamination as PatientExamination
    const patientCase = result.case
    patientExaminationStore.addPatientExamination(pe)
    patientExaminationStore.setCurrentPatientExaminationId(pe.id)
    flow.setCaseContext({
      caseId: patientCase.caseId,
      selectedPatientId: flow.selectedPatientId
    })
    flow.setPatientExaminationContext({
      patientExaminationId: pe.id,
      selectedPatientId: flow.selectedPatientId,
      selectedExaminationId: flow.selectedExaminationId,
      preserveTemplateSelection: true
    })

    successMessage.value = returnToPath.value
      ? 'Die Patientenuntersuchung wurde angelegt. Sie können jetzt zur Validierung zurückkehren oder mit der Befundung fortfahren.'
      : 'Die Patientenuntersuchung wurde erfolgreich angelegt.'
  } catch (e: unknown) {
    errorMessage.value = reportingApiErrorMessage(
      e,
      'Fall und Patientenuntersuchung konnten nicht vollständig erstellt werden.'
    )
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
