<template>
  <div class="card export-annotations">
    <div class="card-header pb-0">
      <h5 class="mb-0">Export-Auswahl</h5>
      <p class="text-muted mb-0">
        Wähle, welche Segmente für den Export markiert werden sollen.
      </p>
    </div>
    <div class="card-body">
      <div v-if="!videoId" class="text-muted">
        Bitte zuerst ein Video auswählen.
      </div>

      <template v-else>
        <div class="export-toggle">
          <label class="form-check-label" for="export-all-video">
            Alle Segmente dieses Videos exportieren
          </label>
          <div class="form-check form-switch">
            <input
              id="export-all-video"
              class="form-check-input"
              type="checkbox"
              :checked="videoExportFlag"
              :disabled="isUpdatingVideo"
              @change="onToggleVideoExport"
            />
          </div>
        </div>

        <div class="export-list mt-3">
          <div class="export-list-header">
            <span>Segmente</span>
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              :disabled="isBulkUpdating"
              @click="selectAllSegments(true)"
            >
              Alle markieren
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="isBulkUpdating"
              @click="selectAllSegments(false)"
            >
              Alle abwählen
            </button>
          </div>

          <div v-if="sortedSegments.length === 0" class="text-muted mt-2">
            Keine Segmente vorhanden.
          </div>

          <div
            v-for="segment in sortedSegments"
            :key="segment.id"
            class="export-segment"
          >
            <div class="export-segment-info">
              <span class="segment-label">
                {{ getTranslationForLabel(segment.label) }}
              </span>
              <span class="segment-time">
                {{ formatTime(segment.startTime) }} – {{ formatTime(segment.endTime) }}
              </span>
            </div>
            <div class="form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                :checked="segment.exportSegment === true"
                :disabled="isSegmentUpdating(segment.id)"
                @change="(event) => onToggleSegmentExport(segment.id, event)"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, withDefaults } from 'vue'
import { useVideoStore, type Segment } from '@/stores/videoStore'
import { formatTime as formatTimeHelper } from '@/utils/timeHelpers'
import { useToastStore } from '@/stores/toastStore'

const props = withDefaults(defineProps<{
  videoId?: number | null
  segments?: Segment[]
}>(), {
  videoId: null,
  segments: () => []
})

const videoStore = useVideoStore()
const toast = useToastStore()
const getTranslationForLabel = videoStore.getTranslationForLabel

const isUpdatingVideo = ref(false)
const updatingSegments = ref<Set<number>>(new Set())
const isBulkUpdating = ref(false)

const sortedSegments = computed(() => {
  return [...props.segments].sort((a, b) => a.startTime - b.startTime)
})

const videoExportFlag = computed(() => {
  if (!props.videoId) return false
  const video = videoStore.videoList.videos.find((v) => v.id === props.videoId)
  return Boolean(video?.exportSegmentsByVideo)
})

const formatTime = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '00:00'
  return formatTimeHelper(value)
}

const isSegmentUpdating = (segmentId: number) => updatingSegments.value.has(segmentId)

const onToggleVideoExport = async (event: Event) => {
  if (!props.videoId) return
  const target = event.target as HTMLInputElement
  const nextValue = target.checked
  isUpdatingVideo.value = true
  try {
    const ok = await videoStore.setVideoExportFlag(props.videoId, nextValue)
    if (!ok) {
      target.checked = !nextValue
      toast.error({ text: 'Video-Export-Flag konnte nicht gespeichert werden.' })
    }
  } finally {
    isUpdatingVideo.value = false
  }
}

const onToggleSegmentExport = async (segmentId: number, event: Event) => {
  const target = event.target as HTMLInputElement
  const nextValue = target.checked
  updatingSegments.value.add(segmentId)
  try {
    const ok = await videoStore.setSegmentExportFlag(segmentId, nextValue)
    if (!ok) {
      target.checked = !nextValue
      toast.error({ text: 'Segment-Export-Flag konnte nicht gespeichert werden.' })
    }
  } finally {
    updatingSegments.value.delete(segmentId)
  }
}

const selectAllSegments = async (flag: boolean) => {
  if (sortedSegments.value.length === 0) return
  isBulkUpdating.value = true
  try {
    for (const segment of sortedSegments.value) {
      if (segment.exportSegment === flag) continue
      updatingSegments.value.add(segment.id)
      const ok = await videoStore.setSegmentExportFlag(segment.id, flag)
      if (!ok) {
        toast.error({ text: `Segment ${segment.id} konnte nicht aktualisiert werden.` })
        break
      }
      updatingSegments.value.delete(segment.id)
    }
  } finally {
    updatingSegments.value.clear()
    isBulkUpdating.value = false
  }
}
</script>

<style scoped>
.export-annotations {
  border: 1px solid #e9ecef;
}

.export-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f9fa;
}

.export-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.export-list-header button {
  white-space: nowrap;
}

.export-segment {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  margin-top: 8px;
  border-radius: 8px;
  border: 1px solid #f1f3f5;
  background: #fff;
}

.export-segment-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.segment-label {
  font-weight: 600;
}

.segment-time {
  font-size: 12px;
  color: #6c757d;
}
</style>
