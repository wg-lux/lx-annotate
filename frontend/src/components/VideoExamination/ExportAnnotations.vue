<template>
  <div class="card export-annotations">
    <div class="card-header pb-0">
      <h5 class="mb-0">Export-Auswahl</h5>
      <p class="text-muted mb-0">Wähle Segmente für einen PTS-sicheren Trainingsdatenexport aus.</p>
    </div>
    <div class="card-body">
      <div v-if="!selectedVideoId" class="text-muted">Bitte zuerst ein Video auswählen.</div>

      <label class="form-label">Video auswählen:</label>
      <select
        v-model.number="selectedVideoId"
        class="form-select"
        :disabled="!hasVideos || isExternalSelection"
        @change="onVideoChange"
      >
        <option :value="null">
          {{ hasVideos ? 'Bitte Video auswählen...' : 'Keine Videos verfügbar' }}
        </option>
        <option v-for="video in annotatableVideos" :key="video.id" :value="video.id">
          📹 {{ video.original_file_name || 'Video Nr. ' + video.id }}
          {{ getVideoStatusIndicator(video.id) }}
          | Center: {{ video.centerName || 'Unbekannt' }} | Processor:
          {{ video.processorName || 'Unbekannt' }}
        </option>
      </select>
      <small v-if="!hasVideos" class="text-muted">
        {{ noVideosMessage }}
      </small>

      <template v-else>
        <div class="export-toggle">
          <label class="form-check-label" for="export-all-video">
            Alle Segmente dieses Videos für den Export markieren
          </label>
          <div class="form-check form-switch">
            <input
              id="export-all-video"
              class="form-check-input"
              type="checkbox"
              :checked="allSegmentsSelected"
              :disabled="isBulkUpdating || sortedSegments.length === 0"
              @change="onToggleAllSegments"
            />
          </div>
        </div>

        <div class="export-list mt-3">
          <div class="export-list-header">
            <span>Segmente</span>
          </div>

          <div v-if="sortedSegments.length === 0" class="text-muted mt-2">
            Keine Segmente vorhanden.
          </div>

          <div v-for="segment in sortedSegments" :key="segment.id" class="export-segment">
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
        <div
          class="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3 mb-3"
        >
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
                v-model="useExportFlags"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="use-export-flags">
                Export-Flags verwenden
              </label>
            </div>
          </div>
        </div>
        <div class="export-extra d-flex flex-wrap gap-3">
          <div class="form-check form-switch">
            <input
              id="export-videos"
              v-model="exportVideos"
              class="form-check-input"
              type="checkbox"
            />
            <label class="form-check-label" for="export-videos"> Video-Dateien exportieren </label>
          </div>
          <div class="form-check form-switch">
            <input
              id="export-frames"
              v-model="exportFrames"
              class="form-check-input"
              type="checkbox"
            />
            <label class="form-check-label" for="export-frames"> Frames exportieren </label>
          </div>
          <div class="form-check form-switch">
            <input
              id="use-frame-pk-paths"
              v-model="useFramePkPaths"
              class="form-check-input"
              type="checkbox"
            />
            <label class="form-check-label" for="use-frame-pk-paths">
              use_frame_pk_paths verwenden
            </label>
          </div>
        </div>
        <div class="export-extra mt-3">
          <div class="form-check form-switch">
            <input
              id="transcode-frames"
              class="form-check-input"
              type="checkbox"
              :checked="true"
              disabled
            />
            <label class="form-check-label" for="transcode-frames">
              PTS-genau aus verarbeitetem Video extrahieren
            </label>
          </div>
          <div class="transcode-options row gx-2 mt-2">
            <div class="col-6 col-md-3">
              <label class="form-label mb-0" for="transcode-quality">Quality</label>
              <input
                id="transcode-quality"
                v-model.number="transcodeQuality"
                type="number"
                min="1"
                max="51"
                class="form-control form-control-sm"
              />
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label mb-0" for="transcode-ext">Extension</label>
              <input
                id="transcode-ext"
                v-model="transcodeExt"
                type="text"
                class="form-control form-control-sm"
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-success w-100"
          :disabled="isExporting"
          @click="startExport"
        >
          {{ exportButtonLabel }}
        </button>
        <button
          type="button"
          class="btn btn-outline-primary w-100 mt-2"
          :disabled="isBackfilling || !selectedVideoId"
          @click="backfillAnnotations"
        >
          {{ backfillButtonLabel }}
        </button>
        <div
          v-if="exportMessage"
          :class="[
            'alert',
            exportMessage.type === 'success' ? 'alert-success' : 'alert-danger',
            'mt-3'
          ]"
          role="alert"
        >
          {{ exportMessage.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { useVideoStore, type Segment } from '@/stores/videoStore'
import { formatTime as formatTimeHelper } from '@/utils/timeHelpers'
import { useToastStore } from '@/stores/toastStore'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { createRuntimeLogger } from '@/utils/runtimeLogger'
import { storeToRefs } from 'pinia'
import {
  buildAnnotationExportRequest,
  parseAnnotationBackfillResponse,
  type AnnotationExportResponse
} from './annotationExport'

const log = createRuntimeLogger('export-annotations')

const props = withDefaults(
  defineProps<{
    videoId?: number | null
    segments?: Segment[]
  }>(),
  {
    videoId: null,
    segments: () => []
  }
)

const videoStore = useVideoStore()
const toast = useToastStore()
const anonymizationStore = useAnonymizationStore()
const { overview } = storeToRefs(anonymizationStore)
const getTranslationForLabel = videoStore.getTranslationForLabel

const updatingSegments = ref<Set<number>>(new Set())
const isBulkUpdating = ref(false)

const selectedVideoId = ref<number | null>(props.videoId)
const isExternalSelection = computed(() => props.videoId !== null)

watch(
  () => props.videoId,
  (nextId) => {
    selectedVideoId.value = nextId
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
  if (props.videoId !== null) {
    return props.segments
  }
  if (!selectedVideoId.value) return []
  return videoStore.allSegments
})

const sortedSegments = computed(() => {
  return [...effectiveSegments.value].sort((a, b) => a.startTime - b.startTime)
})

const allSegmentsSelected = computed(() => {
  if (!selectedVideoId.value) return false
  if (sortedSegments.value.length === 0) return false
  return sortedSegments.value.every((s) => s.exportSegment === true)
})

const formatTime = (value: number | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '00:00'
  return formatTimeHelper(value)
}

const isSegmentUpdating = (segmentId: number) => updatingSegments.value.has(segmentId)

const onToggleAllSegments = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const nextValue = target.checked
  const ok = await selectAllSegments(nextValue)
  if (!ok) target.checked = !nextValue
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

const selectAllSegments = async (flag: boolean): Promise<boolean> => {
  if (sortedSegments.value.length === 0) return false
  isBulkUpdating.value = true
  let okAll = true
  try {
    for (const segment of sortedSegments.value) {
      if (segment.exportSegment === flag) continue
      updatingSegments.value.add(segment.id)
      const ok = await videoStore.setSegmentExportFlag(segment.id, flag)
      if (!ok) {
        toast.error({ text: `Segment ${String(segment.id)} konnte nicht aktualisiert werden.` })
        okAll = false
        break
      }
      updatingSegments.value.delete(segment.id)
    }
  } finally {
    updatingSegments.value.clear()
    isBulkUpdating.value = false
  }
  return okAll
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
    // Occam's razor: export should "just work". Default to selecting all segments after load
    // so the user doesn't have to manually toggle dozens of segment switches.
    await selectAllSegments(true)
  } catch (error) {
    log.error('segments.load-failed', error)
    toast.error({ text: 'Segmente konnten nicht geladen werden.' })
  }
}

const onVideoChange = async () => {
  await loadSelectedVideo()
}

const autoSelectInitialVideo = async () => {
  if (isExternalSelection.value) return
  if (selectedVideoId.value) return
  const firstVideo = annotatableVideos.value.at(0)
  if (firstVideo) {
    selectedVideoId.value = firstVideo.id
    await loadSelectedVideo()
  }
}

onMounted(async () => {
  if (videoStore.videoList.videos.length === 0) {
    try {
      await videoStore.fetchAllVideos()
    } catch (error) {
      log.error('videos.load-failed', error)
      toast.error({ text: 'Videos konnten nicht geladen werden.' })
    }
  }

  if (overview.value.length === 0) {
    try {
      await anonymizationStore.fetchOverview()
    } catch (error) {
      log.error('anonymization-overview.load-failed', error)
    }
  }

  await autoSelectInitialVideo()
})
const selectedFormat = ref<'csv' | 'json'>('csv')
const useExportFlags = ref(true)
const exportVideos = ref(false)
const exportFrames = ref(true)
const transcodeQuality = ref(23)
const transcodeExt = ref('jpg')
const useFramePkPaths = ref(false)
const isExporting = ref(false)
const exportMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const isBackfilling = ref(false)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

const exportBaseDir = computed(() => {
  // output_dir is interpreted on the backend filesystem. Prefer explicit config, otherwise
  // fall back to an app-local path that is typically writable in dev (`data/...`).
  const configuredExportDir: unknown = import.meta.env.VITE_EXPORT_OUTPUT_DIR
  const configuredStorageDir: unknown = import.meta.env.VITE_STORAGE_DIR
  const base =
    typeof configuredExportDir === 'string' && configuredExportDir
      ? configuredExportDir
      : typeof configuredStorageDir === 'string' && configuredStorageDir
        ? `${configuredStorageDir}/export`
        : 'data/export'
  return base.replace(/\/+$/, '')
})

const exportOutputDir = computed(() => {
  if (!selectedVideoId.value) return exportBaseDir.value
  return `${exportBaseDir.value}/video_${String(selectedVideoId.value)}_annotated`
})

const exportSegmentIds = computed(() =>
  sortedSegments.value
    .filter((segment) => segment.exportSegment === true)
    .map((segment) => segment.id)
)

const getExportGuardError = (): string | null => {
  if (!selectedVideoId.value) return 'Bitte zuerst ein Video auswählen.'
  if (!exportOutputDir.value) return 'Kein Ausgabe-Verzeichnis konfiguriert.'
  if (!useExportFlags.value && exportSegmentIds.value.length === 0) {
    return 'Bitte mindestens ein Segment markieren oder "Export-Flags verwenden" aktivieren.'
  }
  return null
}

const exportButtonLabel = computed(() => (isExporting.value ? 'Export läuft …' : 'Export starten'))

const backfillButtonLabel = computed(() =>
  isBackfilling.value ? 'Annotationen werden erzeugt …' : 'Fehlende Annotationen erzeugen'
)

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') return fallback
  const errorRecord = isRecord(error) ? error : {}
  const response =
    isRecord(errorRecord.response) ? errorRecord.response : {}
  const data = isRecord(response.data) ? response.data : {}
  const message = data.detail ?? data.error ?? errorRecord.message
  return typeof message === 'string' ? message : fallback
}

const backfillAnnotations = async () => {
  exportMessage.value = null
  if (!selectedVideoId.value) {
    exportMessage.value = { type: 'error', text: 'Bitte zuerst ein Video auswählen.' }
    return
  }

  isBackfilling.value = true
  try {
    const resp = await axiosInstance.post<unknown>(
      r(`media/videos/${String(selectedVideoId.value)}/ensure-segment-annotations/`),
      { only_validated: true }
    )

    const { annotationsCreated } = parseAnnotationBackfillResponse(resp.data)
    exportMessage.value = {
      type: 'success',
      text: `Backfill abgeschlossen. Neu erzeugte Annotationen: ${String(annotationsCreated)}.`
    }
  } catch (error: unknown) {
    log.error('annotation-backfill.failed', error)
    exportMessage.value = {
      type: 'error',
      text: getRequestErrorMessage(error, 'Backfill fehlgeschlagen')
    }
  } finally {
    isBackfilling.value = false
  }
}

const startExport = async () => {
  exportMessage.value = null
  const guardError = getExportGuardError()
  if (guardError) {
    exportMessage.value = { type: 'error', text: guardError }
    return
  }

  const videoId = selectedVideoId.value
  if (videoId === null) return
  const payload = buildAnnotationExportRequest({
    outputDir: exportOutputDir.value,
    outputFormat: selectedFormat.value,
    videoId,
    segmentIds: exportSegmentIds.value,
    useExportFlags: useExportFlags.value,
    exportVideos: exportVideos.value,
    exportFrames: exportFrames.value,
    useFramePkPaths: useFramePkPaths.value,
    transcodeFrames: true,
    transcodeQuality: transcodeQuality.value,
    transcodeExt: transcodeExt.value
  })

  isExporting.value = true
  try {
    const response = await axiosInstance.post<AnnotationExportResponse>(
      r('media/videos/export-annotated/'),
      payload
    )
    const result = response.data
    exportMessage.value = {
      type: 'success',
      text: `Export abgeschlossen: ${String(result.rowCount)} Annotationen, ${String(result.exportedFrameCount)} Frames. Datei: ${result.outputPath}`
    }
  } catch (error: unknown) {
    log.error('annotation-export.failed', error)
    exportMessage.value = {
      type: 'error',
      text: getRequestErrorMessage(error, 'Export fehlgeschlagen')
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

.export-extra {
  border-top: 1px solid #e9ecef;
  padding-top: 12px;
}

.transcode-options .form-control-sm {
  max-width: 100%;
}
</style>
