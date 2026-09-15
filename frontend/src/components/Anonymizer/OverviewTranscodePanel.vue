<template>
  <section class="transcode-panel mb-3" aria-label="Videogröße reduzieren">
    <div class="d-flex justify-content-between align-items-center gap-2">
      <h5 class="mb-0">Videogröße reduzieren</h5>
      <button
type="button" class="btn btn-sm btn-outline-secondary mb-0"
        :disabled="loading || submitting" data-test="refresh-transcodes" @click="refresh">
        Aufträge aktualisieren
      </button>
    </div>
    <p class="small text-muted mt-2">
      Verfügbare Videos werden vom Server geprüft.
    </p>
    <p v-if="error" class="text-warning" role="alert">{{ error }}</p>
    <p v-if="actionError" class="text-warning" role="alert">{{ actionError }}</p>
    <p v-if="loading" class="small" role="status">Transkodierungsaufträge werden geladen…</p>
    <template v-if="overview">
      <div class="d-flex flex-wrap align-items-end gap-3">
        <label class="form-label">
          Video
          <select
v-model="selectedVideoId" class="form-select" data-test="transcode-video"
            :disabled="submitting || !eligibleCandidates.length">
            <option :value="null">Video auswählen</option>
            <option v-for="candidate in eligibleCandidates" :key="candidate.videoId" :value="candidate.videoId">
              {{ candidate.filename }} (Video-ID: {{ candidate.videoId }})
            </option>
          </select>
        </label>
        <button
type="button" class="btn btn-primary" data-test="start-transcode"
          :disabled="!canStart || loading || submitting || repairing" @click="start">
          {{ submitting ? 'Auftrag wird angefordert…' : 'Verarbeitetes Video verkleinern' }}
        </button>
      </div>
      <p class="small text-warning" data-test="replacement-notice">
        Die verarbeitete Videodatei wird durch eine kleinere Version ersetzt. Das Rohvideo bleibt erhalten.
        Die HLS-Wiedergabe wird erneuert; ersetzte Dateien werden nach erfolgreicher Prüfung entfernt.
      </p>
      <p v-if="!eligibleCandidates.length" class="small" data-test="no-transcode-candidates">
        Der Server meldet keine geeigneten verarbeiteten Videos.
      </p>
      <button
type="button" class="btn btn-outline-warning btn-sm" data-test="repair-and-transcode"
        :disabled="loading || submitting || repairing || !eligibleCandidates.length || !selectedOption"
        @click="requestBulkRepair">
        {{ repairing ? 'Reparatur läuft…' : 'Videozustände reparieren und verarbeitetes Video gesammelt verkleinern' }}
      </button>
      <p class="small text-muted">
        Gesammelt: alle serverseitig berechtigten Videos, unabhängig von Videoauswahl und Tabellenfiltern.
      </p>
      <p v-if="submissionMessage" role="status">{{ submissionMessage }}</p>
      <ul v-if="overview.jobs.length" class="list-unstyled mb-0" data-test="transcode-jobs">
        <li v-for="job in overview.jobs" :key="job.id" class="transcode-job py-2" :data-job-id="job.id">
          <div class="d-flex flex-wrap justify-content-between gap-2">
            <strong>Video {{ job.videoId }} · Verarbeitetes Video verkleinern</strong>
            <span>{{ statusLabel(job.status) }}</span>
          </div>
          <template v-if="isActive(job)">
            <p class="small mb-1">{{ stageLabel(job.stage) }}</p>
            <progress
class="transcode-progress" :value="job.progressPercent ?? undefined" :max="100"
              :aria-label="`Transkodierung Video ${job.videoId}: ${stageLabel(job.stage)}`" />
            <span v-if="job.progressPercent !== null" class="small">{{ job.progressPercent }} %</span>
          </template>
          <p v-else class="small mb-0">
            Vorher: {{ formatBytes(job.beforeBytes) }} · Nachher: {{ formatBytes(job.afterBytes) }} ·
            Eingespart: {{ formatBytes(job.savedBytes) }}
          </p>
          <p v-if="job.errorCode === 'transcode_cleanup_pending'" class="small text-warning mb-0" data-test="cleanup-pending">
            Bereinigung ausstehend: Zurückbehaltene Dateien belegen weiterhin Speicher.
            Bitte die Ursache der Bereinigungsstörung auf dem Server beheben und den Auftrag danach erneut anfordern.
          </p>
          <p v-else-if="job.status === 'failed' || job.status === 'lost'" class="small text-danger mb-0">
            Transkodierung fehlgeschlagen{{ job.errorCode ? ` (${job.errorCode})` : '' }}. Bitte Serverdiagnose prüfen.
          </p>
        </li>
      </ul>
      <p v-else class="small mb-0">Keine Transkodierungsaufträge vorhanden.</p>
      <p class="small text-muted mt-2 mb-0">Anzeige: höchstens 200 Aufträge und serverseitig bereitgestellte Videos.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import {
  fetchVideoTranscodeJobs, startVideoTranscode,
  type TranscodeJobStatus, type TranscodeOption, type VideoTranscodeJob,
  type VideoTranscodeOverview
} from '@/api/anonymizationOperations'

const props = withDefaults(defineProps<{ repairing?: boolean; refreshToken?: number }>(), {
  repairing: false,
  refreshToken: 0
})
const emit = defineEmits<{ repair: [option: TranscodeOption] }>()
const overview = ref<VideoTranscodeOverview | null>(null)
const selectedVideoId = ref<number | null>(null)
const selectedOption = computed<TranscodeOption | null>(() =>
  overview.value?.options.includes('replace_processed') ? 'replace_processed' : null
)
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const actionError = ref('')
const submissionMessage = ref('')
const eligibleCandidates = computed(() => overview.value?.candidates.filter(
  (candidate) => selectedOption.value && candidate.options.includes(selectedOption.value)
) ?? [])
const canStart = computed(() => selectedOption.value !== null &&
  eligibleCandidates.value.some((candidate) => candidate.videoId === selectedVideoId.value) &&
  !overview.value?.jobs.some((job) => job.videoId === selectedVideoId.value && isActive(job)))
let disposed = false
const isDisposed = () => disposed
let timer: ReturnType<typeof setTimeout> | null = null
let controller: AbortController | null = null
let refreshPending = false
const hasPendingRefresh = () => refreshPending
let requestIdentity: { videoId: number; option: TranscodeOption; key: string } | null = null
const POLL_INTERVAL_MS = 5000

function isActive(job: VideoTranscodeJob): boolean {
  return job.status === 'queued' || job.status === 'running'
}

function statusLabel(status: TranscodeJobStatus): string {
  const labels: Record<TranscodeJobStatus, string> = {
    queued: 'Wartet', running: 'Läuft', completed: 'Abgeschlossen',
    skipped: 'Übersprungen', failed: 'Fehlgeschlagen', lost: 'Verloren (LOST)'
  }
  return labels[status]
}

function stageLabel(stage: string): string {
  const labels: Record<string, string> = {
    queued: 'Wartet auf Verarbeitung', validating: 'Quelle wird geprüft',
    transcoding: 'Video wird transkodiert', publishing: 'Ergebnis wird gespeichert',
    materializing: 'Quelle wird zur Verarbeitung bereitgestellt',
    encoding: 'Video wird transkodiert', rebuilding_playback: 'HLS-Wiedergabe wird erneuert',
    cleanup: 'Ersetzte Dateien werden bereinigt', completed: 'Abgeschlossen'
  }
  return labels[stage] ?? 'Verarbeitung läuft'
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Nicht gemessen'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const exponent = bytes > 0 ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1) : 0
  return `${(bytes / 1024 ** exponent).toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${units[exponent]}`
}

function failureMessage(failure: unknown): string {
  if (isAxiosError(failure)) {
    if (failure.response?.status === 403) return 'Für die Transkodierung ist eine Berechtigung erforderlich.'
    if (failure.response?.status === 404 || failure.response?.status === 503) {
      return 'Transkodierung ist auf diesem Server derzeit nicht verfügbar.'
    }
    if (failure.response?.status === 409) return 'Der Auftrag steht im Konflikt mit dem aktuellen Videozustand. Bitte aktualisieren.'
  }
  return 'Transkodierungsaufträge konnten nicht abgefragt oder angefordert werden. Bitte erneut versuchen.'
}

function scheduleRefresh(): void {
  if (isDisposed() || timer || loading.value || submitting.value) return
  if (!error.value && !overview.value?.jobs.some(isActive)) return
  timer = setTimeout(() => {
    timer = null
    void refresh()
  }, POLL_INTERVAL_MS)
}

function applyObservation(response: VideoTranscodeOverview): void {
  overview.value = response
  error.value = ''
  if (!eligibleCandidates.value.some((candidate) => candidate.videoId === selectedVideoId.value)) selectedVideoId.value = null
}

async function refresh(): Promise<void> {
  if (isDisposed()) return
  if (loading.value || submitting.value) {
    refreshPending = true
    return
  }
  refreshPending = false
  if (timer) clearTimeout(timer)
  timer = null
  controller = new AbortController()
  loading.value = true
  try {
    const response = await fetchVideoTranscodeJobs(controller.signal)
    if (isDisposed()) return
    applyObservation(response)
  } catch (failure: unknown) {
    if (isDisposed()) return
    overview.value = null
    error.value = failureMessage(failure)
  } finally {
    controller = null
    loading.value = false
    if (hasPendingRefresh() && !isDisposed()) {
      refreshPending = false
      void refresh()
    } else scheduleRefresh()
  }
}

function selectedRequest(): { videoId: number; option: TranscodeOption; key: string } | null {
  if (!canStart.value || !selectedOption.value || selectedVideoId.value === null) return null
  const videoId = selectedVideoId.value
  const option = selectedOption.value
  if (!requestIdentity || requestIdentity.videoId !== videoId) {
    requestIdentity = { videoId, option, key: uuidv4() }
  }
  return requestIdentity
}

async function start(): Promise<void> {
  if (loading.value || submitting.value || props.repairing || isDisposed()) return
  const request = selectedRequest()
  if (!request) return
  submitting.value = true
  actionError.value = ''
  submissionMessage.value = ''
  try {
    const response = await startVideoTranscode(request.videoId, request.option, request.key)
    if (isDisposed()) return
    requestIdentity = null
    submissionMessage.value = submissionStatus(response.created)
  } catch (failure: unknown) {
    if (!isDisposed()) actionError.value = failureMessage(failure)
  } finally {
    submitting.value = false
    if (!isDisposed()) await refresh()
  }
}

function submissionStatus(created: boolean): string {
  return created ? 'Transkodierungsauftrag angelegt.' : 'Vorhandener Transkodierungsauftrag wird angezeigt.'
}

function requestBulkRepair(): void {
  if (selectedOption.value && eligibleCandidates.value.length && !loading.value &&
    !submitting.value && !props.repairing) emit('repair', selectedOption.value)
}

watch(() => props.refreshToken, () => { void refresh() })
onMounted(refresh)
onUnmounted(() => {
  disposed = true
  controller?.abort()
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.transcode-panel {
  border: 1px solid var(--lx-border, #dee2e6);
  border-radius: var(--lx-corner-radius);
  padding: 1rem;
}
.transcode-progress { width: 100%; height: 1rem; }
.transcode-job + .transcode-job { border-top: 1px solid var(--lx-border, #dee2e6); }
</style>
