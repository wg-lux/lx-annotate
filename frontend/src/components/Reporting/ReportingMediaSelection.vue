<template>
  <div
    v-if="flow.mediaPreloadStatus === 'ready' && flow.mediaPreload?.availableMedia"
    class="row g-2 mb-3"
  >
    <p class="small text-muted mb-0">
      Alle Berichte und Videos dieses Patienten, auch aus früheren Fällen und Untersuchungen. Die
      Ansicht ändert keine Zuordnung.
    </p>
    <label class="col-md-6">
      Bericht ({{ reports.length }})
      <select
        class="form-select form-select-sm"
        data-testid="patient-report-select"
        :value="mediaKey(flow.mediaPreload.latestReport)"
        :disabled="!reports.length"
        @change="selectMedia"
      >
        <option
          value=""
          disabled
        >
          Bericht auswählen
        </option>
        <option
          v-for="item in reports"
          :key="mediaKey(item)"
          :value="mediaKey(item)"
        >
          {{ label(item) }}
        </option>
      </select>
    </label>
    <label class="col-md-6">
      Video ({{ videos.length }})
      <select
        class="form-select form-select-sm"
        data-testid="patient-video-select"
        :value="mediaKey(flow.mediaPreload.latestVideo)"
        :disabled="!videos.length"
        @change="selectMedia"
      >
        <option
          value=""
          disabled
        >
          Video auswählen
        </option>
        <option
          v-for="item in videos"
          :key="mediaKey(item)"
          :value="mediaKey(item)"
        >
          {{ label(item) }}
        </option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PatientTimelineItem } from '@/api/reportingTimelineApi'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

const flow = useReportingFlowStore()
const reports = computed(() =>
  (flow.mediaPreload?.availableMedia ?? []).filter(
    (item) => item.mediaType === 'pdf' || item.mediaType === 'full_report'
  )
)
const videos = computed(() =>
  (flow.mediaPreload?.availableMedia ?? []).filter((item) => item.mediaType === 'video')
)
function mediaKey(item: { mediaType: string; id: number } | null) {
  return item ? `${item.mediaType}:${String(item.id)}` : ''
}
function label(item: PatientTimelineItem) {
  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('de-DE')
    : 'Datum unbekannt'
  return `${item.documentType || (item.mediaType === 'video' ? 'Video' : 'Bericht')} #${String(item.id)} · ${date} · Untersuchung ${String(item.patientExaminationId ?? 'nicht zugeordnet')}`
}
function selectMedia(event: Event) {
  if (event.target instanceof HTMLSelectElement) flow.selectPatientMedia(event.target.value)
}
</script>
