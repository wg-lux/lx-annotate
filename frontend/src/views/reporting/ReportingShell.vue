<template>
  <div class="reporting-shell container-fluid py-4">
    <div class="row g-3">
      <div class="col-lg-3">
        <div class="card shadow-sm">
          <div class="card-header">
            <h6 class="mb-0">Berichts-Workflow</h6>
          </div>
          <div class="card-body p-2">
            <div class="small text-muted px-2 mb-2">
              Status: <strong>{{ flow.sessionStatus }}</strong>
            </div>
            <div class="small text-muted px-2 mb-3">
              PE: {{ flow.patientExaminationId || 'n/a' }} · Token: {{ flow.lookupToken ? 'ja' : 'nein' }}
            </div>
            <nav class="nav flex-column gap-1">
              <RouterLink
                v-for="item in navItems"
                :key="item.to"
                :to="item.to"
                class="workflow-step-btn btn btn-sm text-start"
                :class="isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive'"
              >
                {{ item.label }}
              </RouterLink>
            </nav>
          </div>
        </div>
      </div>

      <div class="col-lg-9">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

const route = useRoute()
const flow = useReportingFlowStore()

const pe = computed(() => flow.patientExaminationId || ':patient_examination_id')

const navItems = computed(() => [
  { label: 'Arbeitsliste', to: '/reporting' },
  { label: 'Fall-Setup', to: '/reporting/case-setup' },
  { label: 'Template & Anforderungen', to: `/reporting/${pe.value}/template-requirements` },
  { label: 'Befunde', to: `/reporting/${pe.value}/findings` },
  { label: 'Anforderungsprüfung', to: `/reporting/${pe.value}/requirements-review` },
  { label: 'Berichtseditor', to: `/reporting/${pe.value}/report-editor` },
  { label: 'Frame-Auswahl', to: `/reporting/${pe.value}/frame-selector` },
  { label: 'Finalisierung', to: `/reporting/${pe.value}/finalized` }
])

function isActive(path: string): boolean {
  return route.path === path
}
</script>

<style scoped>
.reporting-shell .workflow-step-btn {
  white-space: normal;
  text-decoration: none;
}

.reporting-shell .workflow-step-btn.is-inactive {
  color: #344767 !important;
  background-color: #f8f9fa;
  border-color: #d6dbe3;
}

.reporting-shell .workflow-step-btn.is-inactive:hover,
.reporting-shell .workflow-step-btn.is-inactive:focus-visible {
  color: #1f2a37 !important;
  background-color: #eef2f7;
  border-color: #c7d0dd;
}

.reporting-shell .workflow-step-btn.is-active {
  color: #fff !important;
}
</style>
