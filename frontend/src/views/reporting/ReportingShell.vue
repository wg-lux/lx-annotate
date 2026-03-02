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
.reporting-shell {
  position: relative;
  isolation: isolate;
}

.reporting-shell .row > [class*='col-'] {
  min-width: 0;
}

.reporting-shell .card {
  border: 1px solid #d6dce7;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.reporting-shell .card-header {
  background: linear-gradient(180deg, #f9fbff, #eef3fb);
  color: #172234;
  border-bottom: 1px solid #d6dce7;
}

.reporting-shell .card-body {
  background: #fff;
  color: #1f2a37;
}

.reporting-shell .text-muted {
  color: #4b5565 !important;
}

.reporting-shell .workflow-step-btn {
  display: block;
  width: 100%;
  white-space: normal;
  text-decoration: none;
  font-weight: 600;
  line-height: 1.3;
  border-width: 1px;
  border-style: solid;
}

.reporting-shell .workflow-step-btn.is-inactive {
  color: #1f2a37 !important;
  background-color: #f7f9fc;
  border-color: #cbd5e1;
}

.reporting-shell .workflow-step-btn.is-inactive:hover,
.reporting-shell .workflow-step-btn.is-inactive:focus-visible {
  color: #111827 !important;
  background-color: #e8eef7;
  border-color: #b6c4d8;
}

.reporting-shell .workflow-step-btn.is-active {
  color: #fff !important;
  background-color: #243247 !important;
  border-color: #243247 !important;
  box-shadow: 0 6px 14px rgba(16, 24, 40, 0.24);
}

.reporting-shell .workflow-step-btn:focus-visible {
  outline: 2px solid #9dc2ff;
  outline-offset: 1px;
}

@media (max-width: 991.98px) {
  .reporting-shell {
    padding-inline: 0.5rem;
  }
}
</style>
