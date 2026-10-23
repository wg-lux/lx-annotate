<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h6 class="mb-0">Berichte und Videos des Patienten</h6>
      </div>
    </div>
    <div class="card-body">
      <div
        v-if="flow.mediaPreloadStatus === 'loading'"
        class="small text-muted"
      >
        Medien werden geladen…
      </div>
      <div
        v-else-if="flow.mediaPreloadStatus === 'error'"
        class="alert alert-warning py-2 mb-0"
      >
        {{ flow.mediaPreloadError || 'Medien konnten nicht geladen werden.' }}
      </div>
      <div
        v-else-if="!flow.mediaPreload"
        class="small text-muted"
      >
        Bitte zuerst einen eindeutigen Fall auswählen.
      </div>
      <div
        v-else
        class="row g-3"
      >
        <ReportingMediaSelection />
        <div class="col-md-6">
          <div class="border rounded p-3 h-100">
            <div class="fw-semibold mb-2">Bericht</div>
            <div
              v-if="flow.mediaPreload.latestReport"
              class="small"
            >
              <div>ID: {{ flow.mediaPreload.latestReport.id }}</div>
              <div>{{ flow.mediaPreload.latestReport.documentType }}</div>
              <div
                v-if="reportTextPreview"
                class="mt-3"
              >
                <div class="text-muted fw-semibold mb-1">Berichtstext</div>
                <pre class="report-text-preview mb-0">{{ reportTextPreview }}</pre>
              </div>
              <p
                v-else
                class="small text-muted mt-3"
              >
                Kein Berichtstext vorhanden.
              </p>
              <div class="d-flex flex-wrap gap-2 mt-2">
                <button
                  v-for="option in flow.mediaPreload.latestReport.streamOptions"
                  :key="`report-${option.type}`"
                  class="btn btn-outline-secondary btn-sm"
                  @click="open_url(option.url)"
                >
                  {{ option.type }}
                </button>
              </div>
            </div>
            <div
              v-else
              class="small text-muted"
            >
              Kein Bericht für diesen Patienten vorhanden.
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="border rounded p-3 h-100">
            <div class="fw-semibold mb-2">Video</div>
            <div
              v-if="flow.mediaPreload.latestVideo"
              class="small"
            >
              <div>ID: {{ flow.mediaPreload.latestVideo.id }}</div>
              <div class="d-flex flex-wrap gap-2 mt-2">
                <button
                  v-for="option in flow.mediaPreload.latestVideo.streamOptions"
                  :key="`video-${option.type}`"
                  class="btn btn-outline-secondary btn-sm"
                  @click="open_url(option.url)"
                >
                  {{ option.type }}
                </button>
              </div>
            </div>
            <div
              v-else
              class="small text-muted"
            >
              Kein Video für diesen Patienten vorhanden.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import ReportingMediaSelection from './ReportingMediaSelection.vue'

const flow = useReportingFlowStore()
const reportTextPreview = computed(
  () => flow.mediaPreload?.latestReport?.anonymizedText?.trim() ?? ''
)

function open_url(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.report-text-preview {
  max-height: 14rem;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f7f5ef;
  border: 1px solid #ded7c7;
  border-radius: 0.5rem;
  padding: 0.75rem;
  color: #2f2a22;
}
</style>
