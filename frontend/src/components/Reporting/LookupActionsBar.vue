<template>
  <div class="d-flex gap-2 flex-wrap">
    <button class="btn btn-outline-secondary btn-sm" :disabled="loading || !hasLookupToken" @click="$emit('refresh')">
      {{ refreshLabel }}
    </button>
    <button
      v-if="showParts"
      class="btn btn-outline-secondary btn-sm"
      :disabled="loading || !hasLookupToken"
      @click="$emit('load-parts')"
    >
      {{ partsLabel }}
    </button>
    <button class="btn btn-primary btn-sm" :disabled="loading || !hasLookupToken" @click="$emit('recompute')">
      {{ recomputeLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    loading?: boolean
    hasLookupToken: boolean
    showParts?: boolean
    refreshLabel?: string
    partsLabel?: string
    recomputeLabel?: string
  }>(),
  {
    loading: false,
    showParts: false,
    refreshLabel: 'Aktualisieren',
    partsLabel: 'Teilstatus laden',
    recomputeLabel: 'Neuberechnen'
  }
)

defineEmits<{
  refresh: []
  'load-parts': []
  recompute: []
}>()
</script>

