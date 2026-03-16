<template>
  <div class="card mb-3">
    <div class="card-header">
      <h2 class="h5 mb-0">1. Fall anlegen</h2>
    </div>
    <div class="card-body">
      <div class="row align-items-end">
        <div class="col-md-6">
          <div class="form-group">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label for="patient-select">Patient auswählen</label>
            </div>
            <select
              id="patient-select"
              :value="selectedPatientId ?? ''"
              class="form-control"
              :disabled="isLoadingPatients || loading"
              @change="emit('update:selectedPatientId', normalizeNullableNumber(($event.target as HTMLSelectElement).value))"
            >
              <option value="" disabled>
                {{ isLoadingPatients ? 'Lade Patienten...' : 'Bitte wählen Sie einen Patienten' }}
              </option>
              <option v-for="patient in patients" :key="patient.id" :value="patient.id">
                {{ patient.displayName }}
              </option>
            </select>
            <div v-if="selectedPatientId" class="mt-2">
              <small class="text-muted">
                Bei Patientenwechsel wird automatisch ein neuer Fallkontext vorbereitet.
              </small>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="form-group">
            <label for="examination-select">Untersuchung auswählen</label>
            <select
              id="examination-select"
              :value="selectedExaminationId ?? ''"
              class="form-control"
              :disabled="isLoadingExaminations || !selectedPatientId || loading"
              @change="emit('update:selectedExaminationId', normalizeNullableNumber(($event.target as HTMLSelectElement).value))"
            >
              <option value="" disabled>
                {{ isLoadingExaminations ? 'Lade Untersuchungen...' : 'Bitte wählen Sie eine Untersuchung' }}
              </option>
              <option v-for="exam in examinationsDropdown" :key="exam.id" :value="exam.id">
                {{ exam.displayName }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3">
        <div class="small text-muted">
          <strong>Aktuell:</strong> {{ selectedPatientDisplayName }} · {{ selectedExaminationDisplayName }}
        </div>
        <button
          class="btn btn-primary"
          :disabled="!selectedPatientId || !selectedExaminationId || loading || hasActiveSession"
          @click="emit('createCase')"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          <span v-if="!hasActiveSession">Anforderungsbericht erstellen</span>
          <span v-else>Fall bereits aktiv</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type PatientOption = { id: number; displayName: string }
type ExaminationOption = { id: number; displayName: string }

defineProps<{
  selectedPatientId: number | null
  selectedExaminationId: number | null
  selectedPatientDisplayName: string
  selectedExaminationDisplayName: string
  patients: PatientOption[]
  examinationsDropdown: ExaminationOption[]
  isLoadingPatients: boolean
  isLoadingExaminations: boolean
  loading: boolean
  hasActiveSession: boolean
}>()

const emit = defineEmits<{
  'update:selectedPatientId': [value: number | null]
  'update:selectedExaminationId': [value: number | null]
  createCase: []
}>()

function normalizeNullableNumber(value: string): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
</script>
