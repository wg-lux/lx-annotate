<template>
  <div class="card export-annotations">
    <div class="card-header pb-0">
      <h5 class="mb-0">Export-Auswahl</h5>
      <p class="text-muted mb-0">
        Wähle, welche Segmente für den Export markiert werden sollen.
      </p>
    </div>
    <div class="card-body">
      <div v-if="!selectedVideoId" class="text-muted">
        Bitte zuerst ein Video auswählen.
      </div>

      <label class="form-label">Video auswählen:</label>
        <select v-model.number="selectedVideoId" @change="onVideoChange" class="form-select" :disabled="!hasVideos || isExternalSelection">
          <option :value="null">{{ hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar' }}</option>
          <option v-for="video in annotatableVideos" :key="video.id" :value="video.id">
            📹 {{video.original_file_name || 'Video Nr. '+ video.id }} 
            {{ getVideoStatusIndicator(video.id) }}
            | Center: {{ video.centerName || 'Unbekannt' }} 
            | Processor: {{ video.processorName || 'Unbekannt' }}
          </option>
        </select>
        <small v-if="!hasVideos" class="text-muted">
          {{ noVideosMessage }}
        </small>

      <template v-else>
        <div class="export-toggle">
          <label class="form-check-label" for="export-all-video">
            Alle Segmente dieses Videos für den Export vorbereiten
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

      <div v-if="selectedVideoId" class="export-controls mt-4">
        <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-3">
          <div>
            <small class="text-muted">Ausgabe-Verzeichnis</small>
            <div class="export-dir text-break">{{ exportOutputDir }}</div>
          </div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <label class="form-label mb-0">Format</label>
            <select v-model="selectedFormat" class="form-select form-select-sm">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <div class="form-check form-switch mb-0">
              <input
                id="use-export-flags"
                class="form-check-input"
                type="checkbox"
                v-model="useExportFlags"
              />
              <label class="form-check-label" for="use-export-flags">
                Export-Flags verwenden
              </label>
            </div>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-success w-100"
          :disabled="!canExport || isExporting"
          @click="startExport"
        >
          {{ exportButtonLabel }}
        </button>
        <div
          v-if="exportMessage"
          :class="['alert', exportMessage.type === 'success' ? 'alert-success' : 'alert-danger', 'mt-3']"
          role="alert"
        >
          {{ exportMessage.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, withDefaults } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { useVideoStore, type Segment } from '@/stores/videoStore'
import { formatTime as formatTimeHelper } from '@/utils/timeHelpers'
import { useToastStore } from '@/stores/toastStore'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { storeToRefs } from 'pinia'

const props = withDefaults(defineProps<{
  videoId?: number | null
  segments?: Segment[]
}>(), {
  videoId: null,
  segments: () => []
})

const videoStore = useVideoStore()
const toast = useToastStore()
const anonymizationStore = useAnonymizationStore()
const { overview } = storeToRefs(anonymizationStore)
const getTranslationForLabel = videoStore.getTranslationForLabel

const isUpdatingVideo = ref(false)
const updatingSegments = ref<Set<number>>(new Set())
const isBulkUpdating = ref(false)

const selectedVideoId = ref<number | null>(props.videoId ?? null)
const isExternalSelection = computed(() => props.videoId !== null && props.videoId !== undefined)

watch(
  () => props.videoId,
  (nextId) => {
    if (nextId !== undefined) {
      selectedVideoId.value = nextId ?? null
    }
  }
)

const videos = computed(() => videoStore.videoList.videos)
const annotatableVideos = computed(() => videos.value)

const hasVideos = computed(() => annotatableVideos.value.length > 0)

const noVideosMessage = computed(() => {
  if (videos.value.length === 0) {
    return 'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.'
  }
  return 'Keine exportierbaren Videos verfügbar.'
})

const effectiveSegments = computed<Segment[]>(() => {
  if (props.videoId !== null && props.videoId !== undefined) {
    return props.segments
  }
  if (!selectedVideoId.value) return []
  return videoStore.allSegments
})

const sortedSegments = computed(() => {
  return [...effectiveSegments.value].sort((a, b) => a.startTime - b.startTime)
})

const videoExportFlag = computed(() => {
  if (!selectedVideoId.value) return false
  const video = videoStore.videoList.videos.find((v) => v.id === selectedVideoId.value)
  return Boolean(video?.exportSegmentsByVideo)
})

const formatTime = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '00:00'
  return formatTimeHelper(value)
}

const isSegmentUpdating = (segmentId: number) => updatingSegments.value.has(segmentId)

const onToggleVideoExport = async (event: Event) => {
  if (!selectedVideoId.value) return
  const target = event.target as HTMLInputElement
  const nextValue = target.checked
  isUpdatingVideo.value = true
  try {
    const ok = await videoStore.setVideoExportFlag(selectedVideoId.value, nextValue)
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

const getVideoStatusIndicator = (videoId: number): string => {
  const item = overview.value.find((o) => o.id === videoId && o.mediaType === 'video')
  if (!item) return ''

  const statusIndicators: Record<string, string> = {
    not_started: '⏳ Wartend',
    processing_anonymization: '🔄 In Verarbeitung',
    extracting_frames: '🎬 Frames',
    done_processing_anonymization: '✅ Anonymisiert - Validierung steht aus',
    validated: '🛡️ Validiert & Anonymisiert',
    failed: '❌ Fehler'
  }

  return statusIndicators[item.anonymizationStatus] || item.anonymizationStatus
}

const loadSelectedVideo = async () => {
  if (isExternalSelection.value) return
  if (!selectedVideoId.value) {
    videoStore.clearVideo()
    return
  }
  try {
    await videoStore.fetchAllSegments(selectedVideoId.value)
  } catch (error) {
    console.error('Fehler beim Laden der Segmente:', error)
    toast.error({ text: 'Segmente konnten nicht geladen werden.' })
  }
}

const onVideoChange = () => {
  loadSelectedVideo()
}

onMounted(async () => {
  if (videoStore.videoList.videos.length === 0) {
    try {
      await videoStore.fetchAllVideos()
    } catch (error) {
      console.error('Fehler beim Laden der Videos:', error)
      toast.error({ text: 'Videos konnten nicht geladen werden.' })
    }
  }

  if (overview.value.length === 0) {
    try {
      await anonymizationStore.fetchOverview()
    } catch (error) {
      console.error('Fehler beim Laden der Anonymisierungsübersicht:', error)
    }
  }

  if (!isExternalSelection.value && selectedVideoId.value) {
    await loadSelectedVideo()
  }
})
const selectedFormat = ref<'csv' | 'json'>('csv')
const useExportFlags = ref(true)
const isExporting = ref(false)
const exportMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const exportOutputDir =
  import.meta.env.VITE_EXPORT_OUTPUT_DIR ||
  import.meta.env.VITE_STORAGE_DIR ||
  '/data/export'

const exportSegmentIds = computed(() =>
  sortedSegments.value.filter((segment) => segment.exportSegment === true).map((segment) => segment.id)
)

const canExport =
  Boolean(selectedVideoId.value) &&
  exportOutputDir &&
  (useExportFlags.value || exportSegmentIds.value.length > 0)

const exportButtonLabel = computed(() => (isExporting.value ? 'Export läuft …' : 'Export starten'))

const startExport = async () => {
  exportMessage.value = null
  if (!canExport) {
    exportMessage.value = { type: 'error', text: 'Bitte Video und Segmente auswählen.' }
    return
  }

  const payload: Record<string, any> = {
    output_dir: exportOutputDir,
    output_format: selectedFormat.value,
    use_export_flags: useExportFlags.value
  }

  if (selectedVideoId.value) payload.video_id = selectedVideoId.value
  if (!useExportFlags.value && exportSegmentIds.value.length > 0) {
    payload.segment_ids = exportSegmentIds.value
  }

  isExporting.value = true
  try {
    await axiosInstance.post(r('media/videos/export-annotated/'), payload)
    exportMessage.value = {
      type: 'success',
      text: 'Exportauftrag erfolgreich gestartet. Überprüfen Sie die Logs für den Fortschritt.'
    }
  } catch (error: any) {
    console.error('Export request failed', error)
    exportMessage.value = {
      type: 'error',
      text: error?.response?.data?.detail || error?.message || 'Export fehlgeschlagen'
    }
  } finally {
    isExporting.value = false
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

.export-controls {
  border-top: 1px solid #e9ecef;
  padding-top: 16px;
}

.export-dir {
  font-weight: 600;
  font-size: 0.9rem;
  color: #0d6efd;
}
</style>
