<template>
  <div class="card border-0 bg-light-subtle">
    <div class="card-body py-2">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold small">{{ title }}</div>
          <div class="small text-muted">
            PE #{{ patientExaminationId ?? 'n/a' }} · Lookup {{ lookupToken ? 'aktiv' : 'kein Token' }}
            <template v-if="sessionStatus"> · Status {{ sessionStatus }}</template>
          </div>
        </div>
        <button
          v-if="collapsible"
          data-testid="lookup-status-toggle"
          class="btn btn-link btn-sm text-decoration-none p-0"
          type="button"
          @click="collapsed = !collapsed"
        >
          {{ collapsed ? 'Details anzeigen' : 'Details ausblenden' }}
        </button>
      </div>

      <div v-if="!collapsed" data-testid="lookup-status-details" class="row g-3 mt-1">
        <div class="col-md-4">
          <label class="form-label">PatientExamination-ID</label>
          <input class="form-control" :value="patientExaminationId ?? ''" readonly />
        </div>
        <div v-if="selectedExaminationId !== undefined" class="col-md-4">
          <label class="form-label">Untersuchungs-ID</label>
          <input class="form-control" :value="selectedExaminationId ?? ''" readonly />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  patientExaminationId?: number | null
  selectedExaminationId?: number | null
  lookupToken?: string | null
  sessionStatus?: string
  findingsRevision?: number
  title?: string
  collapsible?: boolean
  initiallyCollapsed?: boolean
}>(), {
  title: 'Technische Diagnostik',
  collapsible: true,
  initiallyCollapsed: true
})

const collapsed = ref(props.collapsible ? props.initiallyCollapsed : false)
</script>
