<template>
  <div class="card shadow-sm" v-if="artifacts">
    <div class="card-header">
      <h6 class="mb-0">Artefakte</h6>
    </div>
    <div class="card-body">
      <div class="d-flex flex-wrap gap-2">
        <a
          v-if="artifacts.pdfViewUrl"
          class="btn btn-outline-secondary btn-sm"
          :href="artifacts.pdfViewUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          PDF-Vorschau öffnen
        </a>
        <a
          v-if="artifacts.pdfDownloadUrl"
          class="btn btn-outline-secondary btn-sm"
          :href="artifacts.pdfDownloadUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          PDF herunterladen
        </a>
        <a
          v-if="artifacts.patientTimelineUrl"
          class="btn btn-outline-secondary btn-sm"
          :href="artifacts.patientTimelineUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Patienten-Timeline öffnen
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type PersistedArtifacts = {
  fullReportId?: number | null
  pdfId?: number | null
  pdfViewUrl?: string | null
  pdfDownloadUrl?: string | null
  patientTimelineUrl?: string | null
} | null

defineProps<{
  artifacts: PersistedArtifacts
}>()
</script>

