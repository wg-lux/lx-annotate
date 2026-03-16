<template>
  <div class="col-12 col-xl-6">
    <div class="card h-100">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h2 class="h5 mb-0">3. Befunde dokumentieren & Regeln prüfen</h2>
          <p class="text-muted mb-0">Fehlende Befunde und Pflichtklassifikationen werden hier sichtbar.</p>
        </div>
        <div v-if="availableFindings.length > 0" class="d-flex align-items-center gap-2">
          <small class="text-muted">{{ availableFindings.length }} verfügbar</small>
          <button
            class="btn btn-sm btn-outline-info"
            :disabled="loading"
            title="Befunde aktualisieren"
            @click="emit('refreshFindings')"
          >
            Aktualisieren
          </button>
        </div>
      </div>
      <div class="card-body pre-scrollable" style="max-height: 70vh; overflow: auto;">
        <div class="card mb-3">
          <div class="card-header">
            <h3 class="h6 mb-0">Befunde in der aktuellen Untersuchung</h3>
          </div>
          <div class="card-body">
            <slot name="adder" />
          </div>
        </div>

        <div v-if="findingsSectionLoading" class="text-center py-4">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2 text-muted">Lade Befunde...</p>
        </div>
        <div v-else-if="availableFindings.length" class="findings-container">
          <slot name="findings" />
        </div>
        <div v-else class="text-center py-4">
          <i class="fas fa-info-circle fa-2x text-muted mb-3"></i>
          <p class="text-muted">Keine Befunde verfügbar für die Auswahl.</p>
          <small class="text-muted">Wählen Sie eine Untersuchung aus, um verfügbare Befunde zu laden.</small>
        </div>

        <div class="mt-3">
          <slot name="issues" />
        </div>

        <div v-if="isDebug" class="mt-3">
          <slot name="debug" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean
  findingsSectionLoading: boolean
  availableFindings: number[]
  isDebug: boolean
}>()

const emit = defineEmits<{
  refreshFindings: []
}>()
</script>
