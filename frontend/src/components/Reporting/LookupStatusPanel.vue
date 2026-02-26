<template>
  <div class="row g-3">
    <div class="col-md-4">
      <label class="form-label">PatientExamination-ID</label>
      <input class="form-control" :value="patientExaminationId ?? ''" readonly />
    </div>
    <div v-if="selectedExaminationId !== undefined" class="col-md-4">
      <label class="form-label">Untersuchungs-ID</label>
      <input class="form-control" :value="selectedExaminationId ?? ''" readonly />
    </div>
    <div v-if="lookupToken !== undefined" :class="selectedExaminationId !== undefined ? 'col-md-4' : 'col-md-8'">
      <label class="form-label">Lookup-Token</label>
      <input class="form-control" :value="lookupToken ?? ''" readonly />
    </div>
    <div v-if="sessionStatus !== undefined" class="col-md-4">
      <label class="form-label">Lookup-Status</label>
      <input class="form-control" :value="sessionStatus" readonly />
    </div>
    <div v-if="findingsRevision !== undefined" class="col-md-4">
      <label class="form-label">Befund-Revision</label>
      <input class="form-control" :value="findingsRevision" readonly />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  patientExaminationId?: number | null
  selectedExaminationId?: number | null
  lookupToken?: string | null
  sessionStatus?: string
  findingsRevision?: number
}>()
</script>

