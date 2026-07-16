<template>
  <div>
    <h6 class="mb-2">{{ title }}</h6>
    <p v-if="description" class="text-muted small" v-html="description"></p>
    <div v-if="optionsError" class="alert alert-warning py-2 d-flex justify-content-between align-items-center">
      <span>{{ optionsError }}</span>
      <button class="btn btn-outline-secondary btn-sm" :disabled="disabled || optionsLoading" @click="$emit('refresh-options')">
        Optionen neu laden
      </button>
    </div>
    <div v-else-if="optionsLoading" class="small text-muted mb-2">
      Lade Indikationsoptionen...
    </div>
    <div v-else-if="!hasBaseIndicationOptions" class="alert alert-info py-2 d-flex justify-content-between align-items-center">
      <span>Keine Indikationsoptionen aus dem Backend geladen.</span>
      <button class="btn btn-outline-secondary btn-sm" :disabled="disabled" @click="$emit('refresh-options')">
        Optionen laden
      </button>
    </div>

    <div v-for="(row, idx) in rows" :key="idx" class="row g-2 align-items-end mb-2">
      <div class="col-md-5">
        <label class="form-label">Untersuchungsindikation</label>
        <select
          class="form-select"
          :disabled="disabled"
          :value="row.examinationIndicationId ?? ''"
          @change="onIndicationChanged(idx, ($event.target as HTMLSelectElement).value)"
        >
          <option value="">Indikation wählen</option>
          <option
            v-for="option in resolveIndicationOptionsForRow(row)"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="col-md-5">
        <label class="form-label">Indikationsauswahl (optional)</label>
        <select
          class="form-select"
          :disabled="disabled || !row.examinationIndicationId || !resolveChoiceOptionsForRow(row).length"
          :value="row.indicationChoiceId ?? ''"
          @change="emitUpdateRow(idx, { indicationChoiceId: parseOptionalInt(($event.target as HTMLSelectElement).value) })"
        >
          <option value="">
            {{ row.examinationIndicationId ? 'Keine Auswahl' : 'Zuerst Indikation wählen' }}
          </option>
          <option
            v-for="choice in resolveChoiceOptionsForRow(row)"
            :key="choice.id"
            :value="choice.id"
          >
            {{ choice.label }}
          </option>
        </select>
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
import { computed } from 'vue'
import type { ReportingIndicationRow } from '@/stores/reportingFlowStore'

type IndicationChoiceOption = {
  id: number
  label: string
}

type IndicationOption = {
  id: number
  label: string
  choices?: IndicationChoiceOption[]
}

const props = withDefaults(
  defineProps<{
    rows: ReportingIndicationRow[]
    indicationOptions?: IndicationOption[]
    title?: string
    description?: string
    disabled?: boolean
    optionsLoading?: boolean
    optionsError?: string | null
  }>(),
  {
    indicationOptions: () => [],
    title: 'Indikationen',
    description: '',
    disabled: false,
    optionsLoading: false,
    optionsError: null
  }
)

const emit = defineEmits<{
  'update-row': [index: number, patch: Partial<ReportingIndicationRow>]
  'add-row': []
  'remove-row': [index: number]
  'refresh-options': []
}>()

function parseOptionalInt(value: string): number | null {
  const n = Number(value)
  return Number.isFinite(n) && value !== '' ? n : null
}

function dedupeChoiceOptions(options: IndicationChoiceOption[]): IndicationChoiceOption[] {
  const byId = new Map<number, IndicationChoiceOption>()
  for (const option of options) {
    const id = Number(option?.id)
    if (!Number.isFinite(id)) continue
    byId.set(id, {
      id,
      label: String(option?.label || `Auswahl #${id}`)
    })
  }
  return Array.from(byId.values())
}

const baseIndicationOptions = computed<IndicationOption[]>(() => {
  const byId = new Map<number, IndicationOption>()
  for (const entry of props.indicationOptions || []) {
    const id = Number(entry?.id)
    if (!Number.isFinite(id)) continue
    const current = byId.get(id)
    const mergedChoices = dedupeChoiceOptions([
      ...(current?.choices || []),
      ...((entry?.choices || []).map((choice) => ({
        id: Number(choice?.id),
        label: String(choice?.label || '')
      })) as IndicationChoiceOption[])
    ])
    byId.set(id, {
      id,
      label: String(entry?.label || `Indikation #${id}`),
      choices: mergedChoices
    })
  }
  return Array.from(byId.values())
})

const hasBaseIndicationOptions = computed(() => baseIndicationOptions.value.length > 0)

function getChoiceOptionsForIndication(indicationId: number | null): IndicationChoiceOption[] {
  if (indicationId == null) return []
  return baseIndicationOptions.value.find((option) => option.id === indicationId)?.choices || []
}

function resolveIndicationOptionsForRow(row: ReportingIndicationRow): IndicationOption[] {
  const options = baseIndicationOptions.value.slice()
  const existingId = row.examinationIndicationId
  if (existingId == null || options.some((option) => option.id === existingId)) {
    return options
  }
  return [{ id: existingId, label: `Unbekannte Indikation (#${existingId})`, choices: [] }, ...options]
}

function resolveChoiceOptionsForRow(row: ReportingIndicationRow): IndicationChoiceOption[] {
  const options = getChoiceOptionsForIndication(row.examinationIndicationId)
  const existingId = row.indicationChoiceId
  if (existingId == null || options.some((option) => option.id === existingId)) {
    return options
  }
  return [{ id: existingId, label: `Unbekannte Auswahl (#${existingId})` }, ...options]
}

function onIndicationChanged(index: number, rawValue: string) {
  const nextIndicationId = parseOptionalInt(rawValue)
  const nextChoiceOptions = getChoiceOptionsForIndication(nextIndicationId)
  const currentChoiceId = props.rows[index]?.indicationChoiceId ?? null
  const shouldClearChoice =
    currentChoiceId != null &&
    !nextChoiceOptions.some((choice) => choice.id === currentChoiceId)

  emitUpdateRow(index, {
    examinationIndicationId: nextIndicationId,
    ...(shouldClearChoice ? { indicationChoiceId: null } : {})
  })
}

function emitUpdateRow(index: number, patch: Partial<ReportingIndicationRow>) {
  emit('update-row', index, patch)
}
</script>
