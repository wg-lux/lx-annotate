<template>
  <div>
    <h6 class="mb-2">{{ title }}</h6>
    <p v-if="description" class="text-muted small" v-html="description"></p>

    <div v-for="(row, idx) in rows" :key="idx" class="row g-2 align-items-end mb-2">
      <div class="col-md-5">
        <label class="form-label">Untersuchungsindikation-ID</label>
        <input
          class="form-control"
          type="number"
          :disabled="disabled"
          :value="row.examinationIndicationId ?? ''"
          @input="emitUpdateRow(idx, { examinationIndicationId: parseOptionalInt(($event.target as HTMLInputElement).value) })"
        />
      </div>
      <div class="col-md-5">
        <label class="form-label">Indikationsauswahl-ID (optional)</label>
        <input
          class="form-control"
          type="number"
          :disabled="disabled"
          :value="row.indicationChoiceId ?? ''"
          @input="emitUpdateRow(idx, { indicationChoiceId: parseOptionalInt(($event.target as HTMLInputElement).value) })"
        />
      </div>
      <div class="col-md-2">
        <button class="btn btn-outline-danger w-100" :disabled="disabled" @click="$emit('remove-row', idx)">
          Entfernen
        </button>
      </div>
    </div>

    <div class="d-flex flex-wrap gap-2">
      <button class="btn btn-outline-primary btn-sm" :disabled="disabled" @click="$emit('add-row')">
        Zeile hinzufügen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReportingIndicationRow } from '@/stores/reportingFlowStore'

withDefaults(
  defineProps<{
    rows: ReportingIndicationRow[]
    title?: string
    description?: string
    disabled?: boolean
  }>(),
  {
    title: 'Indikationen',
    description: '',
    disabled: false
  }
)

const emit = defineEmits<{
  'update-row': [index: number, patch: Partial<ReportingIndicationRow>]
  'add-row': []
  'remove-row': [index: number]
}>()

function parseOptionalInt(value: string): number | null {
  const n = Number(value)
  return Number.isFinite(n) && value !== '' ? n : null
}

function emitUpdateRow(index: number, patch: Partial<ReportingIndicationRow>) {
  emit('update-row', index, patch)
}
</script>
