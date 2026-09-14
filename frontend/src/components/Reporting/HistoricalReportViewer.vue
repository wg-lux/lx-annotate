<script setup lang="ts">
defineProps<{
  identityLabel: string
  renderedText: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div
    class="alert alert-secondary historical-report-read-only"
    data-testid="historical-report-read-only"
  >
    <div class="d-flex justify-content-between gap-3 align-items-start">
      <div>
        <strong>Historischer Bericht (nur lesbar)</strong>
        <div class="small mt-1">
          {{ identityLabel }}
        </div>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        data-testid="close-historical-report"
        @click="emit('close')"
      >
        Schließen
      </button>
    </div>
    <textarea
      class="form-control mt-2"
      rows="8"
      readonly
      :value="renderedText"
      aria-label="Historischer Berichtstext"
    ></textarea>
  </div>
</template>
