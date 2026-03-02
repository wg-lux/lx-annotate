<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Anforderungssets</h6>
      <small class="text-muted">{{ items.length }} Set(s)</small>
    </div>

    <div v-if="loading" class="text-muted small mb-2">Lookup-Daten werden geladen...</div>

    <ul class="list-group">
      <li
        v-for="rs in items"
        :key="rs.id"
        class="list-group-item d-flex justify-content-between align-items-center gap-2"
      >
        <div class="flex-grow-1">
          <div class="fw-semibold">{{ rs.name }}</div>
          <small class="text-muted">Typ: {{ rs.type || 'n/a' }}</small>
          <div class="mt-1">
            <span class="badge" :class="statusBadgeClass(rs.id)">
              {{ statusLabel(rs.id) }}
            </span>
          </div>
        </div>
        <div class="form-check form-switch m-0">
          <input
            class="form-check-input"
            type="checkbox"
            :checked="selectedIdSet.has(rs.id)"
            :disabled="loading"
            @change="$emit('toggle', rs.id, ($event.target as HTMLInputElement).checked)"
          />
        </div>
      </li>

      <li v-if="!items.length && !loading" class="list-group-item text-muted">
        Keine Anforderungssets im Lookup gefunden.
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
type RequirementSetLite = { id: number; name: string; type: string }

const props = withDefaults(
  defineProps<{
    items: RequirementSetLite[]
    selectedIdSet: Set<number>
    loading?: boolean
    requirementSetStatus?: Record<string, boolean>
  }>(),
  {
    loading: false,
    requirementSetStatus: () => ({})
  }
)

defineEmits<{
  toggle: [id: number, checked: boolean]
}>()

function statusLabel(id: number): string {
  const value = props.requirementSetStatus?.[String(id)]
  if (value === true) return 'erfüllt'
  if (value === false) return 'nicht erfüllt'
  return 'unbekannt'
}

function statusBadgeClass(id: number): string {
  const value = props.requirementSetStatus?.[String(id)]
  if (value === true) return 'bg-success'
  if (value === false) return 'bg-warning text-dark'
  return 'bg-secondary'
}
</script>

