<template>
  <div class="mt-3 p-3 rounded border video-status-card">
    <div class="row align-items-center">
      <div class="col-md-8">
        <h6 class="mb-1">
          <i class="ni ni-button-play me-2 text-primary"></i>
          {{ presentation.title }}
        </h6>

        <div class="status-badge-container mb-2">
          <span
            class="badge"
            :class="presentation.anonymizationBadgeClass"
          >
            <i class="ni ni-check-bold me-1"></i>
            {{ presentation.anonymizationLabel }}
          </span>

          <span
            v-if="segmentCount > 0"
            class="badge bg-info"
          >
            <i class="ni ni-single-copy-04 me-1"></i>
            {{ segmentCount }} Segmente
          </span>

          <span
            v-if="examinationCount > 0"
            class="badge bg-warning"
          >
            <i class="ni ni-user-run me-1"></i>
            {{ examinationCount }} Untersuchungen
          </span>

          <span
            v-if="presentation.segmentLabel"
            class="badge"
            :class="presentation.segmentBadgeClass"
          >
            <i class="ni ni-settings-gear-65 me-1"></i>
            {{ presentation.segmentLabel }}
          </span>
        </div>
      </div>

      <div class="col-md-4 text-md-end">
        <small class="text-muted d-block"> Center: {{ centerName || 'Unbekannt' }} </small>
        <small class="text-muted d-block"> Dauer: {{ formatTime(duration) }} </small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatTime } from '@/utils/videoUtils'

interface VideoStatusPresentation {
  title: string
  anonymizationLabel: string
  anonymizationBadgeClass: string
  segmentLabel: string
  segmentBadgeClass: string
}

defineProps<{
  presentation: VideoStatusPresentation
  segmentCount: number
  examinationCount: number
  centerName?: string | null
  duration: number
}>()
</script>

<style scoped>
.video-status-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-left: 4px solid #007bff;
}

.status-badge-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-badge-container .badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
}
</style>
