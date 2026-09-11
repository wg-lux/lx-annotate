<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-0">Patient und Untersuchung hinzufügen</h5>
        <small class="text-muted">Diese beiden Angaben werden für einen Bericht benötigt.</small>
      </div>
      <span
        class="badge"
        :class="sessionBadgeClass"
      >{{ sessionBadgeLabel }}</span>
    </div>
    <div class="card-body">
      <div
        v-if="successMessage"
        class="alert alert-success py-2"
      >
        {{ successMessage }}
      </div>
      <div
        v-if="returnToPath"
        class="alert alert-info py-2"
      >
        Für die Rückkehr zur Validierung koennen Sie nach dem Anlegen der Patientenuntersuchung
        direkt wieder zur Anonymisierungsvalidierung wechseln. Eine minimale Untersuchung, zum
        Beispiel
        <code>Koloskopie</code>, ist dafür ausreichend. Befunde koennen später ergänzt werden.
      </div>
      <div
        v-if="errorMessage"
        class="alert alert-danger py-2"
      >
        {{ errorMessage }}
      </div>

      <div
        class="setup-requirement mb-3"
        role="status"
        data-testid="setup-requirement"
      >
        <i
          class="ni ni-notification-70"
          aria-hidden="true"
        ></i>
        <div>
          <strong class="setup-requirement-title">Zuerst Patient und Untersuchung auswählen</strong>
          <small class="setup-requirement-description"
            >Danach kann die Patientenuntersuchung angelegt und der Bericht begonnen werden.</small
          >
        </div>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <label
            class="form-label"
            for="reporting-patient-select"
          >
            <span class="setup-step">1</span>
            Patient auswählen <span
                                class="text-danger"
                                aria-hidden="true"
                              >*</span>
          </label>
          <select
            id="reporting-patient-select"
            class="form-select"
            data-testid="patient-select"
            :value="flow.selectedPatientId ?? ''"
            :disabled="patientsLoading || loading"
            required
            @change="onPatientChange(($event.target as HTMLSelectElement).value)"
          >
            <option
              value=""
              disabled
            >
              {{ patientsLoading ? 'Patienten werden geladen...' : 'Bitte Patient wählen' }}
            </option>
            <option
              v-for="patient in patients"
              :key="patient.id"
              :value="patient.id"
            >
              {{ patient.displayName }}
            </option>
          </select>
        </div>
        <div class="col-md-6">
          <label
            class="form-label"
            for="reporting-examination-type-select"
          >
            <span class="setup-step">2</span>
            Untersuchung auswählen <span
                                     class="text-danger"
                                     aria-hidden="true"
                                   >*</span>
          </label>
          <select
            id="reporting-examination-type-select"
            class="form-select"
            data-testid="examination-select"
            :value="flow.selectedExaminationId ?? ''"
            :disabled="examinationsLoading || loading"
            required
            @change="onExaminationChange(($event.target as HTMLSelectElement).value)"
          >
            <option
              value=""
              disabled
            >
              {{
                examinationsLoading
                  ? 'Untersuchungen werden geladen...'
                  : 'Bitte Untersuchung wählen'
              }}
            </option>
            <option
              v-for="exam in examinations"
              :key="exam.id"
              :value="exam.id"
            >
              {{ exam.displayName }}
            </option>
          </select>
        </div>
      </div>

      <div class="mt-3 d-flex flex-wrap gap-2">
        <button
          class="btn btn-primary btn-sm"
          :disabled="loading || !flow.selectedPatientId || !flow.selectedExaminationId"
          @click="createPatientExaminationContext"
        >
          <span
            v-if="loading"
            class="spinner-border spinner-border-sm me-1"
          />
          Fall und Patientenuntersuchung anlegen
        </button>
        <RouterLink
          v-if="returnToPath"
          class="btn btn-outline-secondary btn-sm"
          :to="returnToPath"
        >
          Zurück zur Validierung
        </RouterLink>
      </div>

      <details
        class="setup-secondary mt-3"
        data-testid="setup-secondary-actions"
      >
        <summary class="setup-secondary-toggle">Weitere Aktionen und technische Details</summary>
        <div class="mt-2 d-flex flex-wrap gap-2">
          <button
            class="btn btn-outline-secondary btn-sm"
            :disabled="loading"
            @click="reloadLists"
          >
            Listen neu laden
          </button>
          <button
            class="btn btn-outline-danger btn-sm"
            :disabled="loading"
            @click="clearFlow"
          >
            Auswahl zurücksetzen
          </button>
        </div>
        <dl class="setup-technical-grid mb-0 mt-3">
          <div class="setup-technical-fact">
            <dt class="setup-technical-label">Fallreferenz</dt>
            <dd class="setup-technical-value">{{ flow.caseId || 'Noch nicht angelegt' }}</dd>
          </div>
          <div class="setup-technical-fact">
            <dt class="setup-technical-label">Patientenuntersuchung</dt>
            <dd class="setup-technical-value">{{ flow.patientExaminationId || 'Noch nicht angelegt' }}</dd>
          </div>
          <div class="setup-technical-fact">
            <dt class="setup-technical-label">Entwurf</dt>
            <dd class="setup-technical-value">{{ flow.currentRuntimeDraft ? 'Geladen' : 'Noch nicht geladen' }}</dd>
          </div>
        </dl>
      </details>

      <div
        v-if="flow.patientExaminationId"
        class="mt-4"
      >
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
  if (typeof preferredRaw !== 'string' || !preferredRaw.trim()) {
    return
  }
  if (flow.selectedExaminationId) {
    return
  }

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
      ? 'Die Patientenuntersuchung wurde angelegt. Sie können jetzt zur Validierung zurückkehren oder mit der Dokumentation fortfahren.'
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

<style scoped>
.setup-requirement {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid #e4b55d;
  border-radius: 8px;
  color: #5c3b00;
  background: #fff8e7;
}

.setup-requirement .setup-requirement-title,
.setup-requirement .setup-requirement-description {
  display: block;
}

.setup-requirement .setup-requirement-description {
  margin-top: 0.15rem;
}

.setup-step {
  display: inline-flex;
  width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  margin-right: 0.25rem;
  border-radius: 999px;
  color: #fff;
  background: #315a94;
  font-size: 0.75rem;
  font-weight: 700;
}

.setup-secondary {
  border-top: 1px solid #d9e0ea;
  padding-top: 0.65rem;
}

.setup-secondary .setup-secondary-toggle {
  width: fit-content;
  color: #526174;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.setup-technical-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.setup-technical-grid .setup-technical-fact {
  padding: 0.6rem;
  border-radius: 6px;
  background: #f5f7fa;
}

.setup-technical-grid .setup-technical-label {
  color: #66768c;
  font-size: 0.75rem;
}

.setup-technical-grid .setup-technical-value {
  margin: 0.15rem 0 0;
  font-weight: 600;
}
</style>
