<template>
  <section
    class="alert alert-warning"
    data-testid="examination-recovery"
    aria-label="Untersuchung ergänzen"
  >
    <strong>Untersuchungstyp fehlt</strong>
    <p>
      Wählen Sie den Untersuchungstyp für die bestehende Patientenuntersuchung
      {{ patientExaminationId }}. Fall und zugeordnete Medien bleiben erhalten.
    </p>
    <label
      for="reporting-recovery-examination"
      class="form-label"
      >Untersuchungstyp</label
    >
    <select
      id="reporting-recovery-examination"
      v-model="selectedId"
      class="form-select mb-2"
      :disabled="loading || saving"
    >
      <option value="">Bitte Untersuchung wählen</option>
      <option
        v-for="examination in examinations"
        :key="examination.id"
        :value="String(examination.id)"
      >
        {{ examination.displayName || examination.name }}
      </option>
    </select>
    <button
      class="btn btn-primary"
      type="button"
      :disabled="!selectedId || loading || saving"
      @click="emit('assign', Number(selectedId))"
    >
      {{ saving ? 'Wird gespeichert…' : 'Untersuchung zuordnen' }}
    </button>
    <p
      v-if="error"
      class="mt-2 mb-0"
      role="alert"
    >
      {{ error }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ReportingExaminationCatalogEntry } from '@/views/reporting/reportingExaminationResolution'

defineProps<{
  patientExaminationId: number
  examinations: readonly ReportingExaminationCatalogEntry[]
  loading: boolean
  saving: boolean
  error: string | null
}>()
const emit = defineEmits<{ assign: [examinationId: number] }>()
const selectedId = ref('')
</script>
