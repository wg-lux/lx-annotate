<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h6 class="mb-0">Media preload</h6>
        <small class="text-muted">latest_only timeline payload</small>
      </div>
      <span class="badge bg-secondary">{{ flow.mediaPreloadStatus }}</span>
    </div>
    <div class="card-body">
      <div v-if="flow.mediaPreloadStatus === 'loading'" class="small text-muted">
        Loading latest media...
      </div>
      <div v-else-if="flow.mediaPreloadStatus === 'error'" class="alert alert-warning py-2 mb-0">
        {{ flow.mediaPreloadError || 'Media preload failed.' }}
      </div>
      <div v-else-if="!flow.mediaPreload" class="small text-muted">
        No preload data available.
      </div>
      <div v-else class="row g-3">
        <div class="col-md-6">
          <div class="border rounded p-3 h-100">
            <div class="fw-semibold mb-2">Letzter Befund</div>
            <div v-if="flow.mediaPreload.latestReport" class="small">
              <div>ID: {{ flow.mediaPreload.latestReport.id }}</div>
              <div>document_type: {{ flow.mediaPreload.latestReport.documentType || 'n/a' }}</div>
              <div class="d-flex flex-wrap gap-2 mt-2">
                <button
                  v-for="option in latestReportStreamOptions"
                  :key="`report-${option.type}`"
                  class="btn btn-outline-secondary btn-sm"
                  @click="open_url(option.url)"
                >
                  {{ option.type }}
                </button>
              </div>
            </div>
            <div v-else class="small text-muted">No report available.</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="border rounded p-3 h-100">
            <div class="fw-semibold mb-2">Letztes Video</div>
            <div v-if="flow.mediaPreload.latestVideo" class="small">
              <div>ID: {{ flow.mediaPreload.latestVideo.id }}</div>
              <div class="d-flex flex-wrap gap-2 mt-2">
                <button
                  v-for="option in latestVideoStreamOptions"
                  :key="`video-${option.type}`"
                  class="btn btn-outline-secondary btn-sm"
                  @click="open_url(option.url)"
                >
                  {{ option.type }}
                </button>
              </div>
            </div>
            <div v-else class="small text-muted">No video available.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TimelineStreamOption } from '@/api/reportingTimelineApi'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { buildPdfStreamUrl, buildVideoStreamUrl } from '@/utils/mediaUrls'

const flow = useReportingFlowStore()

function buildCentralizedStreamOptions(
  options: TimelineStreamOption[] | undefined,
  mediaType: 'pdf' | 'video',
  mediaId: number | null | undefined
): TimelineStreamOption[] {
  if (!mediaId) {
    return options ?? []
  }

  return (options ?? []).map((option) => {
    if (option.type !== 'raw' && option.type !== 'processed') {
      return option
    }

    return {
      ...option,
      url:
        mediaType === 'pdf'
          ? buildPdfStreamUrl(mediaId, option.type)
          : buildVideoStreamUrl(mediaId, option.type),
    }
  })
}

const latestReportStreamOptions = computed(() =>
  buildCentralizedStreamOptions(
    flow.mediaPreload?.latestReport?.streamOptions,
    'pdf',
    flow.mediaPreload?.latestReport?.id
  )
)

const latestVideoStreamOptions = computed(() =>
  buildCentralizedStreamOptions(
    flow.mediaPreload?.latestVideo?.streamOptions,
    'video',
    flow.mediaPreload?.latestVideo?.id
  )
)

function open_url(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>
