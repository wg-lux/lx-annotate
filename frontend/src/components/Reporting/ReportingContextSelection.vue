<template>
  <div
    class="reporting-requirement-callout"
    :class="{ 'is-complete': Boolean(activePatientExaminationId) }"
    data-testid="reporting-context-requirement"
    role="status"
  >
    <i
      class="reporting-requirement-icon"
      :class="activePatientExaminationId ? 'ni ni-check-bold' : 'ni ni-notification-70'"
      aria-hidden="true"
    ></i>
    <div>
      <strong class="reporting-requirement-title">
        {{
          activePatientExaminationId
            ? 'Patient und Untersuchung ausgewählt'
            : 'Patient und Untersuchung erforderlich'
        }}
      </strong>
      <small
        v-if="!caseId"
        class="reporting-requirement-description"
      >
        Wählen Sie Patient und Untersuchung aus und klicken Sie anschließend auf
        „Patientenuntersuchung anlegen“.
      </small>
      <small
        v-else-if="!activePatientExaminationId"
        class="reporting-requirement-description"
      >
        Der Patient ist gewählt. Wählen Sie jetzt die Untersuchung aus und legen Sie die
        Patientenuntersuchung an.
      </small>
      <small
        v-else
        class="reporting-requirement-description"
        >Der klinische Kontext für den Bericht ist vollständig.</small
      >
    </div>
  </div>

  <div
    v-if="!activePatientExaminationId"
    class="reporting-required-fields"
  >
    <div>
      <label
        class="form-label form-label-sm mb-1"
        for="reporting-patient-select"
      >
        <span class="required-field-step">1</span>
        Patient auswählen
        <span
          class="text-danger"
          aria-hidden="true"
          >*</span
        >
      </label>
      <select
        id="reporting-patient-select"
        class="form-select"
        data-testid="patient-select"
        :value="selectedPatientId ?? ''"
        :disabled="patientsLoading || patientExaminationCreationLoading"
        aria-label="Patient für eine neue Patientenuntersuchung auswählen"
        required
        @change="emit('selectPatient', ($event.target as HTMLSelectElement).value)"
      >
        <option
          value=""
          disabled
        >
          {{
            patientsLoading
              ? 'Patienten werden geladen...'
              : patients.length
                ? 'Bitte Patient wählen'
                : 'Keine Patienten verfügbar'
          }}
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
    <div>
      <label
        class="form-label form-label-sm mb-1"
        for="reporting-examination-type-select"
      >
        <span class="required-field-step">2</span>
        Untersuchung auswählen
        <span
          class="text-danger"
          aria-hidden="true"
          >*</span
        >
      </label>
      <select
        id="reporting-examination-type-select"
        class="form-select"
        data-testid="examination-select"
        :value="selectedExaminationId ?? ''"
        :disabled="examinationsLoading || patientExaminationCreationLoading"
        aria-label="Untersuchungstyp für eine neue Patientenuntersuchung auswählen"
        required
        @change="emit('selectExamination', ($event.target as HTMLSelectElement).value)"
      >
        <option
          value=""
          disabled
        >
          {{
            examinationsLoading
              ? 'Untersuchungen werden geladen...'
              : examinations.length
                ? 'Bitte Untersuchung wählen'
                : 'Keine Untersuchungen verfügbar'
          }}
        </option>
        <option
          v-for="examination in examinations"
          :key="examination.id"
          :value="examination.id"
        >
          {{ examination.displayName }}
        </option>
      </select>
    </div>
    <div class="reporting-persistence-action">
      <button
        class="btn btn-primary"
        type="button"
        data-testid="persist-patient-examination"
        :disabled="
          patientExaminationCreationLoading || !selectedPatientId || !selectedExaminationId
        "
        @click="emit('create')"
      >
        <span
          v-if="patientExaminationCreationLoading"
          class="spinner-border spinner-border-sm me-1"
        ></span>
        Patientenuntersuchung anlegen
      </button>
      <small class="text-muted">
        Mit „Patientenuntersuchung anlegen“ speichern Sie die Auswahl und beginnen den Bericht.
      </small>
    </div>
  </div>

  <div
    v-else
    class="reporting-resolved-context"
    data-testid="resolved-patient-examination"
  >
    <div>
      <span class="reporting-resolved-label">Patient</span>
      <strong>{{ patientHeaderLabel }}</strong>
    </div>
    <div>
      <span class="reporting-resolved-label">Untersuchung</span>
      <strong>{{ examinationTypeLabel }}</strong>
    </div>
    <small class="reporting-resolved-description"
      >Persistierte Patientenuntersuchung {{ activePatientExaminationId }}</small
    >
    <button
      class="btn btn-outline-secondary btn-sm"
      type="button"
      @click="emit('restart')"
    >
      Neue Patientenuntersuchung
    </button>
  </div>
</template>

<script setup lang="ts">
interface ContextOption {
  id?: number
  displayName: string
}

defineProps<{
  activePatientExaminationId: number | null
  caseId: string | null
  selectedPatientId: number | null
  selectedExaminationId: number | null
  patients: readonly ContextOption[]
  examinations: readonly ContextOption[]
  patientsLoading: boolean
  examinationsLoading: boolean
  patientExaminationCreationLoading: boolean
  patientHeaderLabel: string
  examinationTypeLabel: string
}>()

const emit = defineEmits<{
  selectPatient: [value: string]
  selectExamination: [value: string]
  create: []
  restart: []
}>()
</script>

<style scoped>
.reporting-requirement-callout {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  margin-bottom: 0.9rem;
  padding: 0.75rem;
  border: 1px solid #e4b55d;
  border-radius: 8px;
  color: #5c3b00;
  background: #fff8e7;
}

.reporting-requirement-callout.is-complete {
  border-color: #9bc7ad;
  color: #155f36;
  background: #effaf3;
}

.reporting-requirement-callout .reporting-requirement-icon {
  margin-top: 0.15rem;
  font-size: 1rem;
}

.reporting-requirement-callout .reporting-requirement-title,
.reporting-requirement-callout .reporting-requirement-description {
  display: block;
}

.reporting-requirement-callout .reporting-requirement-description {
  margin-top: 0.15rem;
}

.reporting-required-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.reporting-persistence-action {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reporting-resolved-context {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #9bc7ad;
  border-radius: 8px;
  background: #effaf3;
}

.reporting-resolved-context .reporting-resolved-label,
.reporting-resolved-context .reporting-resolved-description {
  display: block;
  color: #526174;
}

.reporting-resolved-context .reporting-resolved-description {
  grid-column: 1 / -1;
}

.reporting-resolved-context .btn {
  grid-column: 1 / -1;
  width: fit-content;
}

.required-field-step {
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

@media (max-width: 767.98px) {
  .reporting-required-fields,
  .reporting-resolved-context {
    grid-template-columns: 1fr;
  }

  .reporting-persistence-action {
    flex-direction: column;
    align-items: stretch;
  }
}

.form-select {
  min-width: min(100%, 20rem);
}
.btn {
  flex: 0 0 auto;
  white-space: nowrap;
}
@media (max-width: 575.98px) {
  .reporting-resolved-context .btn,
  .reporting-persistence-action .btn {
    width: 100%;
  }
}
</style>
