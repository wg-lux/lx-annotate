<template>
  <ol
    class="workflow-strip"
    aria-label="Workflow-Fortschritt"
  >
    <li
      v-for="step in steps"
      :key="step.key"
      class="workflow-step"
      :class="`workflow-step-${step.status}`"
      :aria-current="step.status === 'current' ? 'step' : undefined"
    >
      {{ step.label }}
    </li>
  </ol>
  <p
    v-if="terminalLabel"
    class="workflow-strip-note"
    role="status"
  >
    {{ terminalLabel }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WorkflowItem } from '@/api/mediaWorkflowApi'
const props = defineProps<{ item: WorkflowItem }>()

const TERMINAL_LABELS: Partial<Record<WorkflowItem['privacy'], string>> = {
  failed: 'Verarbeitung fehlgeschlagen',
  lost: 'Integritätsfehler – Eintrag gestoppt',
  withdrawn: 'Einwilligung widerrufen',
  quarantined: 'In Quarantäne'
}

const terminalLabel = computed(() => TERMINAL_LABELS[props.item.privacy] ?? null)

// Position of the privacy stage on the visible strip; terminal stages show none.
const PRIVACY_POSITION: Partial<Record<WorkflowItem['privacy'], number>> = {
  import_pending: 0,
  importing: 0,
  awaiting_validation: 2,
  validated: 3,
  raw_purged: 4
}

const steps = computed(() => {
  const { privacy: privacyStage, annotation: annotationStage, release: releaseStage } = props.item
  const privacyPos = PRIVACY_POSITION[privacyStage] ?? -1
  const exported = releaseStage === 'exported' || releaseStage === 'dataset_ingested'
  const rawPurged = privacyStage === 'raw_purged'
  const definitions: { key: string; label: string; done: boolean; active: boolean }[] = [
    { key: 'import', label: 'Import', done: privacyPos > 0, active: privacyPos === 0 },
    {
      key: 'validation',
      label: 'Validierung',
      done: privacyPos > 2,
      active: privacyPos === 2
    },
    {
      key: 'purge',
      label: 'Rohdaten gelöscht',
      done: rawPurged,
      active: privacyPos === 3
    },
    {
      key: 'annotation',
      label: 'Annotation',
      done: annotationStage === 'validated',
      active: annotationStage === 'in_progress'
    },
    {
      key: 'export',
      label: 'Export',
      done: exported,
      active: releaseStage === 'export_ready'
    }
  ]
  return definitions.map((step) => ({
    key: step.key,
    label: step.label,
    status: step.done ? 'done' : step.active ? 'current' : 'pending'
  }))
})
</script>

<style scoped>
.workflow-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.workflow-step {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  border: 1px solid currentColor;
  font-size: 0.8rem;
  opacity: 0.55;
}
.workflow-step-done {
  opacity: 1;
}
.workflow-step-current {
  opacity: 1;
  font-weight: 600;
}
.workflow-strip-note {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
}
</style>
